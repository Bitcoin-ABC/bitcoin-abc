#ifndef LIGHTNING_XEC_ADDRESS_H
#define LIGHTNING_XEC_ADDRESS_H
#ifndef LIGHTNING_ECASH_ADDRESS_H
#define LIGHTNING_ECASH_ADDRESS_H
#include "config.h"
#include <ccan/crypto/ripemd160/ripemd160.h>

/* An address is the RIPEMD160 of the SHA of the public key. */
struct Xec_address {
	struct ripemd160 addr;
};
#endif /* LIGHTNING_XEC_ADDRESS_H */
