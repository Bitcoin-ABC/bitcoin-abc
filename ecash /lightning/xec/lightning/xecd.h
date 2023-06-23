#ifndef LIGHTNING_LIGHTNINGD_XECD_H
#define LIGHTNING_LIGHTNINGD_XECD_H
#include "config.h"
#include <xec/chainparams.h>
#include <xec/tx.h>
#include <ccan/list/list.h>
#include <ccan/strmap/strmap.h>

struct xec_blkid;
struct xec_tx_output;
struct block;
struct feerate_est;
struct lightningd;
struct ripemd160;
struct xec_tx;
struct xec_block;

struct xecd {
	/* Where to do logging. */
	struct log *log;

	/* Main lightningd structure */
	struct lightningd *ld;

	/* Is our xec backend synced?  If not, we retry. */
	bool synced;

	/* Ignore results, we're shutting down. */
	bool shutdown;

	/* Timer if we're waiting for it to warm up. */
	struct oneshot *checkchain_timer;

	struct list_head pending_getfilteredblock;

	/* Map each method to a plugin, so we can have multiple plugins
	 * handling different functionalities. */
	STRMAP(struct plugin *) pluginsmap;
};

/* A single outpoint in a filtered block */
struct filteredblock_outpoint {
	struct xec_outpoint outpoint;
	u32 txindex;
	const u8 *scriptPubKey;
	struct amount_sat amount;
};

/* A struct representing a block with most of the parts filtered out. */
struct filteredblock {
	struct xec_blkid id;
	u32 height;
	struct xec_blkid prev_hash;
	struct filteredblock_outpoint **outpoints;
};

struct xecd *new_xecd(const tal_t *ctx,
			      struct lightningd *ld,
			      struct log *log);

void xecd_estimate_fees(struct xecd *xecd,
			    void (*cb)(struct lightningd *ld,
				       u32 feerate_floor,
				       const struct feerate_est *feerates));

void xecd_sendrawtx_(struct xecd *xecd,
			 const char *id_prefix TAKES,
			 const char *hextx,
			 bool allowhighfees,
			 void (*cb)(struct xecd *xecd,
				    bool success, const char *msg, void *),
			 void *arg);
#define xecd_sendrawtx(xecd_, id_prefix, hextx, allowhighfees, cb, arg)	\
	xecd_sendrawtx_((xecd_), (id_prefix), (hextx),		\
			    (allowhighfees),				\
			    typesafe_cb_preargs(void, void *,		\
						(cb), (arg),		\
						struct xecd *,	\
						bool, const char *),	\
			    (arg))

void xecd_getfilteredblock_(struct xecd *xecd, u32 height,
				void (*cb)(struct xecd *xecd,
					   const struct filteredblock *fb,
					   void *arg),
				void *arg);
#define xecd_getfilteredblock(xecd_, height, cb, arg)		\
	xecd_getfilteredblock_((xecd_),				\
				   (height),				\
				   typesafe_cb_preargs(void, void *,	\
						       (cb), (arg),	\
						       struct xecd *, \
						       const struct filteredblock *), \
				   (arg))

void xecd_getchaininfo_(struct xecd *xecd,
			    const bool first_call,
			    const u32 height,
			    void (*cb)(struct xecd *xecd,
				       const char *chain,
				       u32 headercount,
				       u32 blockcount,
				       const bool ibd,
				       const bool first_call, void *),
			    void *cb_arg);
#define xecd_getchaininfo(xecd_, first_call_, height_, cb, arg)		   \
	xecd_getchaininfo_((xecd_), (first_call_), (height_),      \
			      typesafe_cb_preargs(void, void *,		   \
						  (cb), (arg),		   \
						  struct xecd *,	   \
						  const char *, u32, u32,  \
						  const bool, const bool), \
			      (arg))

void xecd_getrawblockbyheight_(struct xecd *xecd,
				   u32 height,
				   void (*cb)(struct xecd *xecd,
					      struct xec_blkid *blkid,
					      struct xec_block *blk,
					      void *arg),
				   void *arg);
#define xecd_getrawblockbyheight(xecd_, height_, cb, arg)		\
	xecd_getrawblockbyheight_((xecd_), (height_),			\
				      typesafe_cb_preargs(void, void *,		\
							  (cb), (arg),		\
							  struct xecd *,	\
							  struct xec_blkid *, \
							  struct xec_block *),\
				      (arg))

void xecd_getutxout_(struct xecd *xecd,
			 const struct xec_outpoint *outpoint,
			 void (*cb)(struct xecd *,
				    const struct xec_tx_output *,
				    void *),
			 void *arg);
#define xecd_getutxout(xecd_, outpoint_, cb, arg)		\
	xecd_getutxout_((xecd_), (outpoint_),			\
			    typesafe_cb_preargs(void, void *,		\
					        (cb), (arg),		\
					        struct xecd *,	\
					        struct xec_tx_output *),\
			    (arg))

void xecd_getclientversion(struct xecd *xecd);

void xecd_check_commands(struct xecd *xecd);

#endif /* LIGHTNING_LIGHTNINGD_XECD_H */
