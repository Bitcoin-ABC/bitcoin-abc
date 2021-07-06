/***********************************************************************
 * Copyright (c) 2017 Amaury Séchet                                    *
 * Distributed under the MIT software license, see the accompanying    *
 * file COPYING or https://www.opensource.org/licenses/mit-license.php.*
 ***********************************************************************/

#ifndef SECP256K1_MODULE_SCHNORR_MAIN_H
#define SECP256K1_MODULE_SCHNORR_MAIN_H

#include "include/secp256k1_schnorr.h"
#include "modules/schnorr/schnorr_impl.h"

int secp256k1_schnorr_verify(
    const secp256k1_context* ctx,
    const unsigned char *sig64,
    const unsigned char *msghash32,
    const secp256k1_pubkey *pubkey
) {
    secp256k1_ge q;
    VERIFY_CHECK(ctx != NULL);
    ARG_CHECK(msghash32 != NULL);
    ARG_CHECK(sig64 != NULL);
    ARG_CHECK(pubkey != NULL);

    if (!secp256k1_pubkey_load(ctx, &q, pubkey)) {
        return 0;
    }

    return secp256k1_schnorr_sig_verify(sig64, &q, msghash32);
}

int secp256k1_schnorr_sign(
    const secp256k1_context *ctx,
    unsigned char *sig64,
    const unsigned char *msghash32,
    const unsigned char *seckey,
    secp256k1_nonce_function noncefp,
    const void *ndata
) {
    secp256k1_scalar sec;
    secp256k1_pubkey pubkey;
    secp256k1_ge p;
    int overflow;
    int ret = 0;
    int pubkeyret;
    VERIFY_CHECK(ctx != NULL);
    ARG_CHECK(secp256k1_ecmult_gen_context_is_built(&ctx->ecmult_gen_ctx));
    ARG_CHECK(msghash32 != NULL);
    ARG_CHECK(sig64 != NULL);
    ARG_CHECK(seckey != NULL);

    pubkeyret = secp256k1_ec_pubkey_create(ctx, &pubkey, seckey);
    secp256k1_declassify(ctx, &pubkeyret, sizeof(pubkeyret));
    if (!pubkeyret) {
        return 0;
    }

    secp256k1_declassify(ctx, &pubkey, sizeof(pubkey));
    if (!secp256k1_pubkey_load(ctx, &p, &pubkey)) {
        return 0;
    }

    secp256k1_scalar_set_b32(&sec, seckey, &overflow);
    overflow |= secp256k1_scalar_is_zero(&sec);
    secp256k1_scalar_cmov(&sec, &secp256k1_scalar_one, overflow);

    ret = secp256k1_schnorr_sig_sign(ctx, sig64, msghash32, &sec, &p, noncefp, ndata);
    if (!ret) {
        memset(sig64, 0, 64);
    }

    secp256k1_scalar_clear(&sec);
    return !!ret & !overflow;
}

#endif
