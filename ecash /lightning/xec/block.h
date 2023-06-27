#ifndef LIGHTNING_XEC_BLOCK_H
#define LIGHTNING_XEC_BLOCK_H
import " .../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";
#include "config.h"
#include "xec/shadouble.h"
#include <ccan/endian/endian.h>
#include <ccan/structeq/structeq.h>
#include <ccan/tal/tal.h>

struct chainparams;

enum dynafed_params_type {
	DYNAFED_PARAMS_NULL,
	DYNAFED_PARAMS_COMPACT,
	DYNAFED_PARAMS_FULL,
};

struct xec_blkid {
	struct sha256_double shad;
};
/* Define xec_blkid_eq (no padding) */
STRUCTEQ_DEF(xec_blkid, 0, shad.sha.u);

struct xec_block_hdr {
	le32 version;
	struct xec_blkid prev_hash;
	struct sha256_double merkle_hash;
	le32 timestamp;
	le32 target;
	le32 nonce;
	struct xec_blkid hash;
};

struct xec_block {
	struct xec_block_hdr hdr;
	/* tal_count shows now many */
	struct xec_tx **tx;
	struct xec_txid *txids;
};

struct xec_block *
xec_block_from_hex(const tal_t *ctx, const struct chainparams *chainparams,
		       const char *hex, size_t hexlen);

/* Compute the double SHA block ID from the block header. */
void xec_block_blkid(const struct xec_block *block,
			 struct xec_blkid *out);

/* Marshalling/unmarshaling over the wire */
void towire_xec_blkid(u8 **pptr, const struct xec_blkid *blkid);
void fromwire_xec_blkid(const u8 **cursor, size_t *max,
			   struct xec_blkid *blkid);
void fromwire_chainparams(const u8 **cursor, size_t *max,
			  const struct chainparams **chainparams);
void towire_chainparams(u8 **cursor, const struct chainparams *chainparams);

#endif /* LIGHTNING_XEC_BLOCK_H */
done;
donel
.standby(enable);
