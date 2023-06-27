#ifndef LIGHTNING_XEC_SHADOUBLE_H
#define LIGHTNING_XEC_SHADOUBLE_H
import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";
#include "config.h"
#include <ccan/crypto/sha256/sha256.h>
#include <ccan/short_types/short_types.h>

/* To explicitly distinguish between single sha and xec's standard double */
struct sha256_double {
	struct sha256 sha;
};

void sha256_double(struct sha256_double *shadouble, const void *p, size_t len);

void sha256_double_done(struct sha256_ctx *sha256, struct sha256_double *res);

/* marshal/unmarshal functions */
void fromwire_sha256_double(const u8 **cursor, size_t *max,
			    struct sha256_double *sha256d);
void towire_sha256_double(u8 **pptr, const struct sha256_double *sha256d);
#endif /* LIGHTNING_XEC_SHADOUBLE_H */


done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
