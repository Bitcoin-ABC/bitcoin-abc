/* Code for talking to xecd.  We use a plugin as the xec backend.
 * The default one shipped with C-lightning is a plugin which talks to xecd
 * by using xec-cli, but the interface we use to gather xec data is
 * standardized and you can use another plugin as the xec backend, or
 * even make your own! */
#include "config.h"
#include <xec/base58.h>
#include <xec/block.h>
#include <xec/feerate.h>
#include <xec/script.h>
#include <xec/shadouble.h>
#include <ccan/array_size/array_size.h>
#include <ccan/io/io.h>
#include <ccan/tal/str/str.h>
#include <common/configdir.h>
#include <common/json_parse.h>
#include <common/memleak.h>
#include <db/exec.h>
#include <lightningd/xecd.h>
#include <lightningd/chaintopology.h>
#include <lightningd/io_loop_with_timers.h>
#include <lightningd/lightningd.h>
#include <lightningd/log.h>
#include <lightningd/plugin.h>

/* The names of the requests we can make to our xec backend. */
static const char *methods[] = {"getchaininfo", "getrawblockbyheight",
                                "sendrawtransaction", "getutxout",
                                "estimatefees"};

static void xec_destructor(struct plugin *p)
{
	if (p->plugins->ld->state == LD_STATE_SHUTDOWN)
		return;
	fatal("The xec backend died.");
}

static void plugin_config_cb(const char *buffer,
			     const jsmntok_t *toks,
			     const jsmntok_t *idtok,
			     struct plugin *plugin)
{
	plugin->plugin_state = INIT_COMPLETE;
	log_debug(plugin->plugins->ld->log, "io_break: %s", __func__);
	io_break(plugin);
}

static void config_plugin(struct plugin *plugin)
{
	struct jsonrpc_request *req;
	void *ret;

	req = jsonrpc_request_start(plugin, "init", NULL,
				    plugin->non_numeric_ids, plugin->log,
	                            NULL, plugin_config_cb, plugin);
	plugin_populate_init_request(plugin, req);
	jsonrpc_request_end(req);
	plugin_request_send(plugin, req);

	tal_add_destructor(plugin, xec_destructor);

	ret = io_loop_with_timers(plugin->plugins->ld);
	log_debug(plugin->plugins->ld->log, "io_loop_with_timers: %s", __func__);
	assert(ret == plugin);
}

static void wait_plugin(struct xecd *xecd, const char *method,
			struct plugin *p)
{
	/* We need our xec backend to be initialized, but the plugins have
	 * not yet been started at this point.
	 * So send `init` to each plugin which registered for a xec method
	 * and wait for its response, which we take as an ACK that it is
	 * operational (i.e. bcli will wait for `xecd` to be warmed up
	 * before responding to `init`).
	 * Note that lightningd/plugin will not send `init` to an already
	 * configured plugin. */
	if (p->plugin_state == NEEDS_INIT)
		config_plugin(p);

	strmap_add(&xecd->pluginsmap, method, p);
}

void xecd_check_commands(struct xecd *xecd)
{
	size_t i;
	struct plugin *p;

	for (i = 0; i < ARRAY_SIZE(methods); i++) {
		p = find_plugin_for_command(xecd->ld, methods[i]);
		if (p == NULL) {
			/* For testing .. */
			log_debug(xecd->ld->log, "Missing a xec plugin"
						     " command");
			fatal("Could not access the plugin for %s, is a "
			      "xec plugin (by default plugins/bcli) "
			      "registered ?", methods[i]);
		}
		wait_plugin(xecd, methods[i], p);
	}
}

/* Our xec backend plugin gave us a bad response. We can't recover. */
static void xec_plugin_error(struct xecd *xecd, const char *buf,
				 const jsmntok_t *toks, const char *method,
				 const char *fmt, ...)
{
	va_list ap;
	char *reason;
	struct plugin *p;

	va_start(ap, fmt);
	reason = tal_vfmt(NULL, fmt, ap);
	va_end(ap);

	p = strmap_get(&xecd->pluginsmap, method);
	fatal("%s error: bad response to %s (%s), response was %.*s",
	      p->cmd, method, reason,
	      toks->end - toks->start, buf + toks->start);
}

/* Send a request to the xec plugin which registered that method,
 * if it's still alive. */
static void xec_plugin_send(struct xecd *xecd,
				struct jsonrpc_request *req)
{
	struct plugin *plugin = strmap_get(&xecd->pluginsmap, req->method);
	if (!plugin)
		fatal("xec backend plugin for %s died.", req->method);

	plugin_request_send(plugin, req);
}

/* `estimatefees`
 *
 * Gather feerate from our xec backend. Will set the feerate to `null`
 * if estimation failed.
 *
 *   - `opening` is used for funding and also misc transactions
 *   - `mutual_close` is used for the mutual close transaction
 *   - `unilateral_close` is used for unilateral close (commitment transactions)
 *   - `delayed_to_us` is used for resolving our output from our unilateral close
 *   - `htlc_resolution` is used for resolving onchain HTLCs
 *   - `penalty` is used for resolving revoked transactions
 *   - `min` is the minimum acceptable feerate
 *   - `max` is the maximum acceptable feerate
 *
 * Plugin response (deprecated):
 * {
 *	"opening": <sat per kVB>,
 *	"mutual_close": <sat per kVB>,
 *	"unilateral_close": <sat per kVB>,
 *	"delayed_to_us": <sat per kVB>,
 *	"htlc_resolution": <sat per kVB>,
 *	"penalty": <sat per kVB>,
 *	"min_acceptable": <sat per kVB>,
 *	"max_acceptable": <sat per kVB>,
 * }
 *
 * Plugin response (modern):
 * {
 *	"feerate_floor": <sat per kVB>,
 *	"feerates": {
 *		{ "blocks": 2, "feerate": <sat per kVB> },
 *		{ "blocks": 6, "feerate": <sat per kVB> },
 *		{ "blocks": 12, "feerate": <sat per kVB> }
 *		{ "blocks": 100, "feerate": <sat per kVB> }
 *	}
 * }
 *
 * If rates are missing, we linearly interpolate (we don't extrapolate tho!).
 */
struct estimatefee_call {
	struct xecd *xecd;
	void (*cb)(struct lightningd *ld, u32 feerate_floor,
		   const struct feerate_est *rates);
};

/* Note: returns estimates in perkb, caller converts! */
static struct feerate_est *parse_feerate_ranges(const tal_t *ctx,
						struct xecd *xecd,
						const char *buf,
						const jsmntok_t *floortok,
						const jsmntok_t *feerates,
						u32 *floor)
{
	size_t i;
	const jsmntok_t *t;
	struct feerate_est *rates = tal_arr(ctx, struct feerate_est, 0);

	if (!json_to_u32(buf, floortok, floor))
		xec_plugin_error(xecd, buf, floortok,
				     "estimatefees.feerate_floor", "Not a u32?");

	json_for_each_arr(i, t, feerates) {
		struct feerate_est rate;
		const char *err;

		err = json_scan(tmpctx, buf, t, "{blocks:%,feerate:%}",
				JSON_SCAN(json_to_u32, &rate.blockcount),
				JSON_SCAN(json_to_u32, &rate.rate));
		if (err)
			xec_plugin_error(xecd, buf, t,
					     "estimatefees.feerates", err);

		/* Block count must be in order.  If rates go up somehow, we
		 * reduce to prev. */
		if (tal_count(rates) != 0) {
			const struct feerate_est *prev = &rates[tal_count(rates)-1];
			if (rate.blockcount <= prev->blockcount)
				xec_plugin_error(xecd, buf, feerates,
						     "estimatefees.feerates",
						     "Blocks must be ascending"
						     " order: %u <= %u!",
						     rate.blockcount,
						     prev->blockcount);
			if (rate.rate > prev->rate) {
				log_unusual(xecd->log,
					    "Feerate for %u blocks (%u) is > rate"
					    " for %u blocks (%u)!",
					    rate.blockcount, rate.rate,
					    prev->blockcount, prev->rate);
				rate.rate = prev->rate;
			}
		}

		tal_arr_expand(&rates, rate);
	}

	if (tal_count(rates) == 0) {
		if (chainparams->testnet)
			log_debug(xecd->log, "Unable to estimate any fees");
		else
			log_unusual(xecd->log, "Unable to estimate any fees");
	}

	return rates;
}

static struct feerate_est *parse_deprecated_feerates(const tal_t *ctx,
						     struct xecd *xecd,
						     const char *buf,
						     const jsmntok_t *toks)
{
	struct feerate_est *rates = tal_arr(ctx, struct feerate_est, 0);
	struct oldstyle {
		const char *name;
		size_t blockcount;
		size_t multiplier;
	} oldstyles[] = { { "max_acceptable", 2, 10 },
			  { "unilateral_close", 6, 1 },
			  { "opening", 12, 1 },
			  { "mutual_close", 100, 1 } };

	for (size_t i = 0; i < ARRAY_SIZE(oldstyles); i++) {
		const jsmntok_t *feeratetok;
		struct feerate_est rate;

		feeratetok = json_get_member(buf, toks, oldstyles[i].name);
		if (!feeratetok) {
 			xec_plugin_error(xecd, buf, toks,
 					     "estimatefees",
					     "missing '%s' field",
					     oldstyles[i].name);
		}
		if (!json_to_u32(buf, feeratetok, &rate.rate)) {
			if (chainparams->testnet)
				log_debug(xecd->log,
					  "Unable to estimate %s fees",
					  oldstyles[i].name);
			else
				log_unusual(xecd->log,
					    "Unable to estimate %s fees",
					    oldstyles[i].name);
			continue;
		}

		if (rate.rate == 0)
			continue;

		/* Cancel out the 10x multiplier on max_acceptable */
		rate.rate /= oldstyles[i].multiplier;
		rate.blockcount = oldstyles[i].blockcount;
		tal_arr_expand(&rates, rate);
	}
	return rates;
}

static void estimatefees_callback(const char *buf, const jsmntok_t *toks,
				  const jsmntok_t *idtok,
				  struct estimatefee_call *call)
{
	const jsmntok_t *resulttok, *floortok;
	struct feerate_est *feerates;
	u32 floor;

	resulttok = json_get_member(buf, toks, "result");
	if (!resulttok)
		xec_plugin_error(call->xecd, buf, toks,
				     "estimatefees",
				     "bad 'result' field");

	/* Modern style has floor. */
	floortok = json_get_member(buf, resulttok, "feerate_floor");
	if (floortok) {
		feerates = parse_feerate_ranges(call, call->xecd,
						buf, floortok,
						json_get_member(buf, resulttok,
								"feerates"),
						&floor);
	} else {
		if (!deprecated_apis)
			xec_plugin_error(call->xecd, buf, resulttok,
					     "estimatefees",
					     "missing fee_floor field");

		feerates = parse_deprecated_feerates(call, call->xecd,
						     buf, resulttok);
		floor = feerate_from_style(FEERATE_FLOOR, FEERATE_PER_KSIPA);
	}

	/* Convert to perkw */
	floor = feerate_from_style(floor, FEERATE_PER_KBYTE);
	if (floor < FEERATE_FLOOR)
		floor = FEERATE_FLOOR;

	/* FIXME: We could let this go below the dynamic floor, but we'd
	 * need to know if the floor is because of their node's policy
	 * (minrelaytxfee) or mempool conditions (mempoolminfee). */
	for (size_t i = 0; i < tal_count(feerates); i++) {
		feerates[i].rate = feerate_from_style(feerates[i].rate,
						      FEERATE_PER_KBYTE);
		if (feerates[i].rate < floor)
			feerates[i].rate = floor;
	}

	call->cb(call->xecd->ld, floor, feerates);
	tal_free(call);
}

void xecd_estimate_fees(struct xecd *xecd,
			    void (*cb)(struct lightningd *ld,
				       u32 feerate_floor,
				       const struct feerate_est *feerates))
{
	struct jsonrpc_request *req;
	struct estimatefee_call *call = tal(xecd, struct estimatefee_call);

	call->xecd = xecd;
	call->cb = cb;

	req = jsonrpc_request_start(xecd, "estimatefees", NULL, true,
				    xecd->log,
				    NULL, estimatefees_callback, call);
	jsonrpc_request_end(req);
	plugin_request_send(strmap_get(&xecd->pluginsmap,
				       "estimatefees"), req);
}

/* `sendrawtransaction`
 *
 * Send a transaction to the xec backend plugin. If the broadcast was
 * not successful on its end, the plugin will populate the `errmsg` with
 * the reason.
 *
 * Plugin response:
 * {
 *	"success": <true|false>,
 *	"errmsg": "<not empty if !success>"
 * }
 */

struct sendrawtx_call {
	struct xecd *xecd;
	void (*cb)(struct xecd *xecd,
		   bool success,
		   const char *err_msg,
		   void *);
	void *cb_arg;
};

static void sendrawtx_callback(const char *buf, const jsmntok_t *toks,
			       const jsmntok_t *idtok,
			       struct sendrawtx_call *call)
{
	const char *err;
	const char *errmsg = NULL;
	bool success = false;

	err = json_scan(tmpctx, buf, toks, "{result:{success:%}}",
			JSON_SCAN(json_to_bool, &success));
	if (err) {
		xec_plugin_error(call->xecd, buf, toks,
				     "sendrawtransaction",
				     "bad 'result' field: %s", err);
	} else if (!success) {
		err = json_scan(tmpctx, buf, toks, "{result:{errmsg:%}}",
				JSON_SCAN_TAL(tmpctx, json_strdup, &errmsg));
		if (err)
			xec_plugin_error(call->xecd, buf, toks,
					     "sendrawtransaction",
					     "bad 'errmsg' field: %s",
					     err);
	}

	db_begin_transaction(call->xecd->ld->wallet->db);
	call->cb(call->xecd, success, errmsg, call->cb_arg);
	db_commit_transaction(call->xecd->ld->wallet->db);

	tal_free(call);
}

void xecd_sendrawtx_(struct xecd *xecd,
			 const char *id_prefix,
			 const char *hextx,
			 bool allowhighfees,
			 void (*cb)(struct xecd *xecd,
				    bool success, const char *msg, void *),
			 void *cb_arg)
{
	struct jsonrpc_request *req;
	struct sendrawtx_call *call = tal(xecd, struct sendrawtx_call);

	call->xecd = xecd;
	call->cb = cb;
	call->cb_arg = cb_arg;
	log_debug(xecd->log, "sendrawtransaction: %s", hextx);

	req = jsonrpc_request_start(xecd, "sendrawtransaction",
				    id_prefix, true,
				    xecd->log,
				    NULL, sendrawtx_callback,
				    call);
	json_add_string(req->stream, "tx", hextx);
	json_add_bool(req->stream, "allowhighfees", allowhighfees);
	jsonrpc_request_end(req);
	xec_plugin_send(xecd, req);
}

/* `getrawblockbyheight`
 *
 * If no block were found at that height, will set each field to `null`.
 * Plugin response:
 * {
 *	"blockhash": "<blkid>",
 *	"block": "rawblock"
 * }
 */

struct getrawblockbyheight_call {
	struct xecd *xecd;
	void (*cb)(struct xecd *xecd,
		   struct xec_blkid *blkid,
		   struct xec_block *block,
		   void *);
	void *cb_arg;
};

static void
getrawblockbyheight_callback(const char *buf, const jsmntok_t *toks,
			     const jsmntok_t *idtok,
			     struct getrawblockbyheight_call *call)
{
	const char *block_str, *err;
	struct xec_blkid blkid;
	struct xec_block *blk;

	/* If block hash is `null`, this means not found! Call the callback
	 * with NULL values. */
	err = json_scan(tmpctx, buf, toks, "{result:{blockhash:null}}");
	if (!err) {
		db_begin_transaction(call->xecd->ld->wallet->db);
		call->cb(call->xecd, NULL, NULL, call->cb_arg);
		db_commit_transaction(call->xecd->ld->wallet->db);
		goto clean;
	}

	err = json_scan(tmpctx, buf, toks, "{result:{blockhash:%,block:%}}",
			JSON_SCAN(json_to_sha256, &blkid.shad.sha),
			JSON_SCAN_TAL(tmpctx, json_strdup, &block_str));
	if (err)
		xec_plugin_error(call->xecd, buf, toks,
				     "getrawblockbyheight",
				     "bad 'result' field: %s", err);

	blk = xec_block_from_hex(tmpctx, chainparams, block_str,
				     strlen(block_str));
	if (!blk)
		xec_plugin_error(call->xecd, buf, toks,
				     "getrawblockbyheight",
				     "bad block");

	db_begin_transaction(call->xecd->ld->wallet->db);
	call->cb(call->xecd, &blkid, blk, call->cb_arg);
	db_commit_transaction(call->xecd->ld->wallet->db);

clean:
	tal_free(call);
}

void xecd_getrawblockbyheight_(struct xecd *xecd,
				   u32 height,
				   void (*cb)(struct xecd *xecd,
					      struct xec_blkid *blkid,
					      struct xec_block *blk,
					      void *arg),
				   void *cb_arg)
{
	struct jsonrpc_request *req;
	struct getrawblockbyheight_call *call = tal(NULL,
						    struct getrawblockbyheight_call);

	call->xecd = xecd;
	call->cb = cb;
	call->cb_arg = cb_arg;

	req = jsonrpc_request_start(xecd, "getrawblockbyheight", NULL, true,
				    xecd->log,
				    NULL,  getrawblockbyheight_callback,
				    call);
	json_add_num(req->stream, "height", height);
	jsonrpc_request_end(req);
	xec_plugin_send(xecd, req);
}

/* `getchaininfo`
 *
 * Called at startup to check the network we are operating on, and to check
 * if the xec backend is synced to the network tip. This also allows to
 * get the current block count.
 * {
 *	"chain": "<bip70_chainid>",
 *	"headercount": <number of fetched headers>,
 *	"blockcount": <number of fetched block>,
 *	"ibd": <synced?>
 * }
 */

struct getchaininfo_call {
	struct xecd *xecd;
	/* Should we log verbosely? */
	bool first_call;
	void (*cb)(struct xecd *xecd,
		   const char *chain,
		   u32 headercount,
		   u32 blockcount,
		   const bool ibd,
		   const bool first_call,
		   void *);
	void *cb_arg;
};

static void getchaininfo_callback(const char *buf, const jsmntok_t *toks,
				  const jsmntok_t *idtok,
				  struct getchaininfo_call *call)
{
	const char *err, *chain;
	u32 headers, blocks;
	bool ibd;

	err = json_scan(tmpctx, buf, toks,
			"{result:{chain:%,headercount:%,blockcount:%,ibd:%}}",
			JSON_SCAN_TAL(tmpctx, json_strdup, &chain),
			JSON_SCAN(json_to_number, &headers),
			JSON_SCAN(json_to_number, &blocks),
			JSON_SCAN(json_to_bool, &ibd));
	if (err)
		xec_plugin_error(call->xecd, buf, toks, "getchaininfo",
				     "bad 'result' field: %s", err);

	db_begin_transaction(call->xecd->ld->wallet->db);
	call->cb(call->xecd, chain, headers, blocks, ibd,
		 call->first_call, call->cb_arg);
	db_commit_transaction(call->xecd->ld->wallet->db);

	tal_free(call);
}

void xecd_getchaininfo_(struct xecd *xecd,
			    const bool first_call,
			    const u32 height,
			    void (*cb)(struct xecd *xecd,
				       const char *chain,
				       u32 headercount,
				       u32 blockcount,
				       const bool ibd,
				       const bool first_call,
				       void *),
			    void *cb_arg)
{
	struct jsonrpc_request *req;
	struct getchaininfo_call *call = tal(xecd, struct getchaininfo_call);

	call->xecd = xecd;
	call->cb = cb;
	call->cb_arg = cb_arg;
	call->first_call = first_call;

	req = jsonrpc_request_start(xecd, "getchaininfo", NULL, true,
				    xecd->log,
				    NULL, getchaininfo_callback, call);
	json_add_u32(req->stream, "last_height", height);
	jsonrpc_request_end(req);
	xec_plugin_send(xecd, req);
}

/* `getutxout`
 *
 * Get information about an UTXO. If the TXO is spent, the plugin will set
 * all fields to `null`.
 * {
 *	"amount": <The output's amount in *sats*>,
 *	"script": "The output's scriptPubKey",
 * }
 */

struct getutxout_call {
	struct xecd *xecd;
	unsigned int blocknum, txnum, outnum;

	/* The real callback */
	void (*cb)(struct xecd *xecd,
		   const struct xec_tx_output *txout, void *arg);
	/* The real callback arg */
	void *cb_arg;
};

static void getutxout_callback(const char *buf, const jsmntok_t *toks,
			      const jsmntok_t *idtok,
			      struct getutxout_call *call)
{
	const char *err;
	struct xec_tx_output txout;

	err = json_scan(tmpctx, buf, toks, "{result:{script:null}}");
	if (!err) {
		db_begin_transaction(call->xecd->ld->wallet->db);
		call->cb(call->xecd, NULL, call->cb_arg);
		db_commit_transaction(call->xecd->ld->wallet->db);
		goto clean;
	}

	err = json_scan(tmpctx, buf, toks, "{result:{script:%,amount:%}}",
			JSON_SCAN_TAL(tmpctx, json_tok_bin_from_hex,
				      &txout.script),
			JSON_SCAN(json_to_sat, &txout.amount));
	if (err)
		xec_plugin_error(call->xecd, buf, toks, "getutxout",
				     "bad 'result' field: %s", err);

	db_begin_transaction(call->xecd->ld->wallet->db);
	call->cb(call->xecd, &txout, call->cb_arg);
	db_commit_transaction(call->xecd->ld->wallet->db);

clean:
	tal_free(call);
}

void xecd_getutxout_(struct xecd *xecd,
			 const struct xec_outpoint *outpoint,
			 void (*cb)(struct xecd *,
				    const struct xec_tx_output *,
				    void *),
			 void *cb_arg)
{
	struct jsonrpc_request *req;
	struct getutxout_call *call = tal(xecd, struct getutxout_call);

	call->xecd = xecd;
	call->cb = cb;
	call->cb_arg = cb_arg;

	req = jsonrpc_request_start(xecd, "getutxout", NULL, true,
				    xecd->log,
				    NULL, getutxout_callback, call);
	json_add_txid(req->stream, "txid", &outpoint->txid);
	json_add_num(req->stream, "vout", outpoint->n);
	jsonrpc_request_end(req);
	xec_plugin_send(xecd, req);
}

/* Context for the getfilteredblock call. Wraps the actual arguments while we
 * process the various steps. */
struct filteredblock_call {
	struct list_node list;
	void (*cb)(struct xecd *xecd, const struct filteredblock *fb,
		   void *arg);
	void *arg;

	struct filteredblock *result;
	struct filteredblock_outpoint **outpoints;
	size_t current_outpoint;
	struct timeabs start_time;
	u32 height;
};

/* Declaration for recursion in process_getfilteredblock_step1 */
static void
process_getfiltered_block_final(struct xecd *xecd,
				const struct filteredblock_call *call);

static void
process_getfilteredblock_step2(struct xecd *xecd,
			       const struct xec_tx_output *output,
			       void *arg)
{
	struct filteredblock_call *call = (struct filteredblock_call *)arg;
	struct filteredblock_outpoint *o = call->outpoints[call->current_outpoint];

	/* If this output is unspent, add it to the filteredblock result. */
	if (output)
		tal_arr_expand(&call->result->outpoints, tal_steal(call->result, o));

	call->current_outpoint++;
	if (call->current_outpoint < tal_count(call->outpoints)) {
		o = call->outpoints[call->current_outpoint];
		xecd_getutxout(xecd, &o->outpoint,
				  process_getfilteredblock_step2, call);
	} else {
		/* If there were no more outpoints to check, we call the callback. */
		process_getfiltered_block_final(xecd, call);
	}
}

static void process_getfilteredblock_step1(struct xecd *xecd,
					   struct xec_blkid *blkid,
					   struct xec_block *block,
					   struct filteredblock_call *call)
{
	struct filteredblock_outpoint *o;
	struct xec_tx *tx;

	/* If we were unable to fetch the block hash (xecd doesn't know
	 * about a block at that height), we can short-circuit and just call
	 * the callback. */
	if (!blkid)
		return process_getfiltered_block_final(xecd, call);

	/* So we have the first piece of the puzzle, the block hash */
	call->result = tal(call, struct filteredblock);
	call->result->height = call->height;
	call->result->outpoints = tal_arr(call->result, struct filteredblock_outpoint *, 0);
	call->result->id = *blkid;

	/* If the plugin gave us a block id, they MUST send us a block. */
	assert(block != NULL);

	call->result->prev_hash = block->hdr.prev_hash;

	/* Allocate an array containing all the potentially interesting
	 * outpoints. We will later copy the ones we're interested in into the
	 * call->result if they are unspent. */

	call->outpoints = tal_arr(call, struct filteredblock_outpoint *, 0);
	for (size_t i = 0; i < tal_count(block->tx); i++) {
		tx = block->tx[i];
		for (size_t j = 0; j < tx->wtx->num_outputs; j++) {
			const u8 *script = xec_tx_output_get_script(NULL, tx, j);
			struct amount_asset amount = xec_tx_output_get_amount(tx, j);
			if (amount_asset_is_main(&amount) && is_p2wsh(script, NULL)) {
				/* This is an interesting output, remember it. */
				o = tal(call->outpoints, struct filteredblock_outpoint);
				xec_txid(tx, &o->outpoint.txid);
				o->outpoint.n = j;
				o->amount = amount_asset_to_sat(&amount);
				o->txindex = i;
				o->scriptPubKey = tal_steal(o, script);
				tal_arr_expand(&call->outpoints, o);
			} else {
				tal_free(script);
			}
		}
	}

	if (tal_count(call->outpoints) == 0) {
		/* If there were no outpoints to check, we can short-circuit
		 * and just call the callback. */
		process_getfiltered_block_final(xecd, call);
	} else {

		/* Otherwise we start iterating through call->outpoints and
		 * store the one's that are unspent in
		 * call->result->outpoints. */
		o = call->outpoints[call->current_outpoint];
		xecd_getutxout(xecd, &o->outpoint,
				  process_getfilteredblock_step2, call);
	}
}

/* Takes a call, dispatches it to all queued requests that match the same
 * height, and then kicks off the next call. */
static void
process_getfiltered_block_final(struct xecd *xecd,
				const struct filteredblock_call *call)
{
	struct filteredblock_call *c, *next;
	u32 height = call->height;

	if (call->result == NULL)
		goto next;

	/* Need to steal so we don't accidentally free it while iterating through the list below. */
	struct filteredblock *fb = tal_steal(NULL, call->result);
	list_for_each_safe(&xecd->pending_getfilteredblock, c, next, list) {
		if (c->height == height) {
			c->cb(xecd, fb, c->arg);
			list_del(&c->list);
			tal_free(c);
		}
	}
	tal_free(fb);

next:
	/* Nothing to free here, since `*call` was already deleted during the
	 * iteration above. It was also removed from the list, so no need to
	 * pop here. */
	if (!list_empty(&xecd->pending_getfilteredblock)) {
		c = list_top(&xecd->pending_getfilteredblock, struct filteredblock_call, list);
		xecd_getrawblockbyheight(xecd, c->height,
					     process_getfilteredblock_step1, c);
	}
}

void xecd_getfilteredblock_(struct xecd *xecd, u32 height,
				void (*cb)(struct xecd *xecd,
					   const struct filteredblock *fb,
					   void *arg),
				void *arg)
{
	/* Stash the call context for when we need to call the callback after
	 * all the xecd calls we need to perform. */
	struct filteredblock_call *call = tal(xecd, struct filteredblock_call);
	/* If this is the first request, we should start processing it. */
	bool start = list_empty(&xecd->pending_getfilteredblock);
	call->cb = cb;
	call->arg = arg;
	call->height = height;
	assert(call->cb != NULL);
	call->start_time = time_now();
	call->result = NULL;
	call->current_outpoint = 0;

	list_add_tail(&xecd->pending_getfilteredblock, &call->list);
	if (start)
		xecd_getrawblockbyheight(xecd, height,
					     process_getfilteredblock_step1, call);
}

static void destroy_xecd(struct xecd *xecd)
{
	strmap_clear(&xecd->pluginsmap);
}

struct xecd *new_xecd(const tal_t *ctx,
			      struct lightningd *ld,
			      struct log *log)
{
	struct xecd *xecd = tal(ctx, struct xecd);

	strmap_init(&xecd->pluginsmap);
	xecd->ld = ld;
	xecd->log = log;
	list_head_init(&xecd->pending_getfilteredblock);
	tal_add_destructor(xecd, destroy_xecd);
	xecd->synced = false;

	return xecd;
}
