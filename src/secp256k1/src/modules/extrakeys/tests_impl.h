/***********************************************************************
 * Copyright (c) 2020 Jonas Nick                                       *
 * Distributed under the MIT software license, see the accompanying    *
 * file COPYING or https://www.opensource.org/licenses/mit-license.php.*
 ***********************************************************************/

#ifndef SECP256K1_MODULE_EXTRAKEYS_TESTS_H
#define SECP256K1_MODULE_EXTRAKEYS_TESTS_H

#include "secp256k1_extrakeys.h"

static secp256k1_context* api_test_context(int flags, int *ecount) {
    secp256k1_context *ctx0 = secp256k1_context_create(flags);
    secp256k1_context_set_error_callback(ctx0, counting_illegal_callback_fn, ecount);
    secp256k1_context_set_illegal_callback(ctx0, counting_illegal_callback_fn, ecount);
    return ctx0;
}

void test_xonly_pubkey(void) {
    secp256k1_pubkey pk;
    secp256k1_xonly_pubkey xonly_pk, xonly_pk_tmp;
    secp256k1_ge pk1;
    secp256k1_ge pk2;
    secp256k1_fe y;
    unsigned char sk[32];
    unsigned char xy_sk[32];
    unsigned char buf32[32];
    unsigned char ones32[32];
    unsigned char zeros64[64] = { 0 };
    int pk_parity;
    int i;

    int ecount;
    secp256k1_context *none = api_test_context(SECP256K1_CONTEXT_NONE, &ecount);
    secp256k1_context *sign = api_test_context(SECP256K1_CONTEXT_SIGN, &ecount);
    secp256k1_context *verify = api_test_context(SECP256K1_CONTEXT_VERIFY, &ecount);

    secp256k1_testrand256(sk);
    memset(ones32, 0xFF, 32);
    secp256k1_testrand256(xy_sk);
    CHECK(secp256k1_ec_pubkey_create(sign, &pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, &pk_parity, &pk) == 1);

    /* Test xonly_pubkey_from_pubkey */
    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(sign, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(verify, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, NULL, &pk_parity, &pk) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, NULL, &pk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, &pk_parity, NULL) == 0);
    CHECK(ecount == 2);
    memset(&pk, 0, sizeof(pk));
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, &pk_parity, &pk) == 0);
    CHECK(ecount == 3);

    /* Choose a secret key such that the resulting pubkey and xonly_pubkey match. */
    memset(sk, 0, sizeof(sk));
    sk[0] = 1;
    CHECK(secp256k1_ec_pubkey_create(ctx, &pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_memcmp_var(&pk, &xonly_pk, sizeof(pk)) == 0);
    CHECK(pk_parity == 0);

    /* Choose a secret key such that pubkey and xonly_pubkey are each others
     * negation. */
    sk[0] = 2;
    CHECK(secp256k1_ec_pubkey_create(ctx, &pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_memcmp_var(&xonly_pk, &pk, sizeof(xonly_pk)) != 0);
    CHECK(pk_parity == 1);
    secp256k1_pubkey_load(ctx, &pk1, &pk);
    secp256k1_pubkey_load(ctx, &pk2, (secp256k1_pubkey *) &xonly_pk);
    CHECK(secp256k1_fe_equal(&pk1.x, &pk2.x) == 1);
    secp256k1_fe_negate(&y, &pk2.y, 1);
    CHECK(secp256k1_fe_equal(&pk1.y, &y) == 1);

    /* Test xonly_pubkey_serialize and xonly_pubkey_parse */
    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_serialize(none, NULL, &xonly_pk) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_xonly_pubkey_serialize(none, buf32, NULL) == 0);
    CHECK(secp256k1_memcmp_var(buf32, zeros64, 32) == 0);
    CHECK(ecount == 2);
    {
        /* A pubkey filled with 0s will fail to serialize due to pubkey_load
         * special casing. */
        secp256k1_xonly_pubkey pk_tmp;
        memset(&pk_tmp, 0, sizeof(pk_tmp));
        CHECK(secp256k1_xonly_pubkey_serialize(none, buf32, &pk_tmp) == 0);
    }
    /* pubkey_load called illegal callback */
    CHECK(ecount == 3);

    CHECK(secp256k1_xonly_pubkey_serialize(none, buf32, &xonly_pk) == 1);
    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_parse(none, NULL, buf32) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_xonly_pubkey_parse(none, &xonly_pk, NULL) == 0);
    CHECK(ecount == 2);

    /* Serialization and parse roundtrip */
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, NULL, &pk) == 1);
    CHECK(secp256k1_xonly_pubkey_serialize(ctx, buf32, &xonly_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_parse(ctx, &xonly_pk_tmp, buf32) == 1);
    CHECK(secp256k1_memcmp_var(&xonly_pk, &xonly_pk_tmp, sizeof(xonly_pk)) == 0);

    /* Test parsing invalid field elements */
    memset(&xonly_pk, 1, sizeof(xonly_pk));
    /* Overflowing field element */
    CHECK(secp256k1_xonly_pubkey_parse(none, &xonly_pk, ones32) == 0);
    CHECK(secp256k1_memcmp_var(&xonly_pk, zeros64, sizeof(xonly_pk)) == 0);
    memset(&xonly_pk, 1, sizeof(xonly_pk));
    /* There's no point with x-coordinate 0 on secp256k1 */
    CHECK(secp256k1_xonly_pubkey_parse(none, &xonly_pk, zeros64) == 0);
    CHECK(secp256k1_memcmp_var(&xonly_pk, zeros64, sizeof(xonly_pk)) == 0);
    /* If a random 32-byte string can not be parsed with ec_pubkey_parse
     * (because interpreted as X coordinate it does not correspond to a point on
     * the curve) then xonly_pubkey_parse should fail as well. */
    for (i = 0; i < count; i++) {
        unsigned char rand33[33];
        secp256k1_testrand256(&rand33[1]);
        rand33[0] = SECP256K1_TAG_PUBKEY_EVEN;
        if (!secp256k1_ec_pubkey_parse(ctx, &pk, rand33, 33)) {
            memset(&xonly_pk, 1, sizeof(xonly_pk));
            CHECK(secp256k1_xonly_pubkey_parse(ctx, &xonly_pk, &rand33[1]) == 0);
            CHECK(secp256k1_memcmp_var(&xonly_pk, zeros64, sizeof(xonly_pk)) == 0);
        } else {
            CHECK(secp256k1_xonly_pubkey_parse(ctx, &xonly_pk, &rand33[1]) == 1);
        }
    }
    CHECK(ecount == 2);

    secp256k1_context_destroy(none);
    secp256k1_context_destroy(sign);
    secp256k1_context_destroy(verify);
}

void test_xonly_pubkey_tweak(void) {
    unsigned char zeros64[64] = { 0 };
    unsigned char overflows[32];
    unsigned char sk[32];
    secp256k1_pubkey internal_pk;
    secp256k1_xonly_pubkey internal_xonly_pk;
    secp256k1_pubkey output_pk;
    int pk_parity;
    unsigned char tweak[32];
    int i;

    int ecount;
    secp256k1_context *none = api_test_context(SECP256K1_CONTEXT_NONE, &ecount);
    secp256k1_context *sign = api_test_context(SECP256K1_CONTEXT_SIGN, &ecount);
    secp256k1_context *verify = api_test_context(SECP256K1_CONTEXT_VERIFY, &ecount);

    memset(overflows, 0xff, sizeof(overflows));
    secp256k1_testrand256(tweak);
    secp256k1_testrand256(sk);
    CHECK(secp256k1_ec_pubkey_create(ctx, &internal_pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &internal_xonly_pk, &pk_parity, &internal_pk) == 1);

    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_tweak_add(none, &output_pk, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add(sign, &output_pk, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, tweak) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, NULL, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 3);
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, NULL, tweak) == 0);
    CHECK(ecount == 4);
    /* NULL internal_xonly_pk zeroes the output_pk */
    CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk)) == 0);
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, NULL) == 0);
    CHECK(ecount == 5);
    /* NULL tweak zeroes the output_pk */
    CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk)) == 0);

    /* Invalid tweak zeroes the output_pk */
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, overflows) == 0);
    CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk))  == 0);

    /* A zero tweak is fine */
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, zeros64) == 1);

    /* Fails if the resulting key was infinity */
    for (i = 0; i < count; i++) {
        secp256k1_scalar scalar_tweak;
        /* Because sk may be negated before adding, we need to try with tweak =
         * sk as well as tweak = -sk. */
        secp256k1_scalar_set_b32(&scalar_tweak, sk, NULL);
        secp256k1_scalar_negate(&scalar_tweak, &scalar_tweak);
        secp256k1_scalar_get_b32(tweak, &scalar_tweak);
        CHECK((secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, sk) == 0)
              || (secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, tweak) == 0));
        CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk)) == 0);
    }

    /* Invalid pk with a valid tweak */
    memset(&internal_xonly_pk, 0, sizeof(internal_xonly_pk));
    secp256k1_testrand256(tweak);
    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk))  == 0);

    secp256k1_context_destroy(none);
    secp256k1_context_destroy(sign);
    secp256k1_context_destroy(verify);
}

void test_xonly_pubkey_tweak_check(void) {
    unsigned char zeros64[64] = { 0 };
    unsigned char overflows[32];
    unsigned char sk[32];
    secp256k1_pubkey internal_pk;
    secp256k1_xonly_pubkey internal_xonly_pk;
    secp256k1_pubkey output_pk;
    secp256k1_xonly_pubkey output_xonly_pk;
    unsigned char output_pk32[32];
    unsigned char buf32[32];
    int pk_parity;
    unsigned char tweak[32];

    int ecount;
    secp256k1_context *none = api_test_context(SECP256K1_CONTEXT_NONE, &ecount);
    secp256k1_context *sign = api_test_context(SECP256K1_CONTEXT_SIGN, &ecount);
    secp256k1_context *verify = api_test_context(SECP256K1_CONTEXT_VERIFY, &ecount);

    memset(overflows, 0xff, sizeof(overflows));
    secp256k1_testrand256(tweak);
    secp256k1_testrand256(sk);
    CHECK(secp256k1_ec_pubkey_create(ctx, &internal_pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &internal_xonly_pk, &pk_parity, &internal_pk) == 1);

    ecount = 0;
    CHECK(secp256k1_xonly_pubkey_tweak_add(verify, &output_pk, &internal_xonly_pk, tweak) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(verify, &output_xonly_pk, &pk_parity, &output_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_serialize(ctx, buf32, &output_xonly_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(none, buf32, pk_parity, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(sign, buf32, pk_parity, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(verify, buf32, pk_parity, &internal_xonly_pk, tweak) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(verify, NULL, pk_parity, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 3);
    /* invalid pk_parity value */
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(verify, buf32, 2, &internal_xonly_pk, tweak) == 0);
    CHECK(ecount == 3);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(verify, buf32, pk_parity, NULL, tweak) == 0);
    CHECK(ecount == 4);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(verify, buf32, pk_parity, &internal_xonly_pk, NULL) == 0);
    CHECK(ecount == 5);

    memset(tweak, 1, sizeof(tweak));
    CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &internal_xonly_pk, NULL, &internal_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add(ctx, &output_pk, &internal_xonly_pk, tweak) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &output_xonly_pk, &pk_parity, &output_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_serialize(ctx, output_pk32, &output_xonly_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, output_pk32, pk_parity, &internal_xonly_pk, tweak) == 1);

    /* Wrong pk_parity */
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, output_pk32, !pk_parity, &internal_xonly_pk, tweak) == 0);
    /* Wrong public key */
    CHECK(secp256k1_xonly_pubkey_serialize(ctx, buf32, &internal_xonly_pk) == 1);
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, buf32, pk_parity, &internal_xonly_pk, tweak) == 0);

    /* Overflowing tweak not allowed */
    CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, output_pk32, pk_parity, &internal_xonly_pk, overflows) == 0);
    CHECK(secp256k1_xonly_pubkey_tweak_add(ctx, &output_pk, &internal_xonly_pk, overflows) == 0);
    CHECK(secp256k1_memcmp_var(&output_pk, zeros64, sizeof(output_pk)) == 0);
    CHECK(ecount == 5);

    secp256k1_context_destroy(none);
    secp256k1_context_destroy(sign);
    secp256k1_context_destroy(verify);
}

/* Starts with an initial pubkey and recursively creates N_PUBKEYS - 1
 * additional pubkeys by calling tweak_add. Then verifies every tweak starting
 * from the last pubkey. */
#define N_PUBKEYS 32
void test_xonly_pubkey_tweak_recursive(void) {
    unsigned char sk[32];
    secp256k1_pubkey pk[N_PUBKEYS];
    unsigned char pk_serialized[32];
    unsigned char tweak[N_PUBKEYS - 1][32];
    int i;

    secp256k1_testrand256(sk);
    CHECK(secp256k1_ec_pubkey_create(ctx, &pk[0], sk) == 1);
    /* Add tweaks */
    for (i = 0; i < N_PUBKEYS - 1; i++) {
        secp256k1_xonly_pubkey xonly_pk;
        memset(tweak[i], i + 1, sizeof(tweak[i]));
        CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &xonly_pk, NULL, &pk[i]) == 1);
        CHECK(secp256k1_xonly_pubkey_tweak_add(ctx, &pk[i + 1], &xonly_pk, tweak[i]) == 1);
    }

    /* Verify tweaks */
    for (i = N_PUBKEYS - 1; i > 0; i--) {
        secp256k1_xonly_pubkey xonly_pk;
        int pk_parity;
        CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &xonly_pk, &pk_parity, &pk[i]) == 1);
        CHECK(secp256k1_xonly_pubkey_serialize(ctx, pk_serialized, &xonly_pk) == 1);
        CHECK(secp256k1_xonly_pubkey_from_pubkey(ctx, &xonly_pk, NULL, &pk[i - 1]) == 1);
        CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, pk_serialized, pk_parity, &xonly_pk, tweak[i - 1]) == 1);
    }
}
#undef N_PUBKEYS

void test_keypair(void) {
    unsigned char sk[32];
    unsigned char sk_tmp[32];
    unsigned char zeros96[96] = { 0 };
    unsigned char overflows[32];
    secp256k1_keypair keypair;
    secp256k1_pubkey pk, pk_tmp;
    secp256k1_xonly_pubkey xonly_pk, xonly_pk_tmp;
    int pk_parity, pk_parity_tmp;
    int ecount;
    secp256k1_context *none = api_test_context(SECP256K1_CONTEXT_NONE, &ecount);
    secp256k1_context *sign = api_test_context(SECP256K1_CONTEXT_SIGN, &ecount);
    secp256k1_context *verify = api_test_context(SECP256K1_CONTEXT_VERIFY, &ecount);

    CHECK(sizeof(zeros96) == sizeof(keypair));
    memset(overflows, 0xFF, sizeof(overflows));

    /* Test keypair_create */
    ecount = 0;
    secp256k1_testrand256(sk);
    CHECK(secp256k1_keypair_create(none, &keypair, sk) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &keypair, sizeof(keypair)) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_keypair_create(verify, &keypair, sk) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &keypair, sizeof(keypair)) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_keypair_create(sign, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_create(sign, NULL, sk) == 0);
    CHECK(ecount == 3);
    CHECK(secp256k1_keypair_create(sign, &keypair, NULL) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &keypair, sizeof(keypair)) == 0);
    CHECK(ecount == 4);

    /* Invalid secret key */
    CHECK(secp256k1_keypair_create(sign, &keypair, zeros96) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &keypair, sizeof(keypair)) == 0);
    CHECK(secp256k1_keypair_create(sign, &keypair, overflows) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &keypair, sizeof(keypair)) == 0);

    /* Test keypair_pub */
    ecount = 0;
    secp256k1_testrand256(sk);
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_pub(none, &pk, &keypair) == 1);
    CHECK(secp256k1_keypair_pub(none, NULL, &keypair) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_keypair_pub(none, &pk, NULL) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_memcmp_var(zeros96, &pk, sizeof(pk)) == 0);

    /* Using an invalid keypair is fine for keypair_pub */
    memset(&keypair, 0, sizeof(keypair));
    CHECK(secp256k1_keypair_pub(none, &pk, &keypair) == 1);
    CHECK(secp256k1_memcmp_var(zeros96, &pk, sizeof(pk)) == 0);

    /* keypair holds the same pubkey as pubkey_create */
    CHECK(secp256k1_ec_pubkey_create(sign, &pk, sk) == 1);
    CHECK(secp256k1_keypair_create(sign, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_pub(none, &pk_tmp, &keypair) == 1);
    CHECK(secp256k1_memcmp_var(&pk, &pk_tmp, sizeof(pk)) == 0);

    /** Test keypair_xonly_pub **/
    ecount = 0;
    secp256k1_testrand256(sk);
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk, &pk_parity, &keypair) == 1);
    CHECK(secp256k1_keypair_xonly_pub(none, NULL, &pk_parity, &keypair) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk, NULL, &keypair) == 1);
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk, &pk_parity, NULL) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_memcmp_var(zeros96, &xonly_pk, sizeof(xonly_pk)) == 0);
    /* Using an invalid keypair will set the xonly_pk to 0 (first reset
     * xonly_pk). */
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk, &pk_parity, &keypair) == 1);
    memset(&keypair, 0, sizeof(keypair));
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk, &pk_parity, &keypair) == 0);
    CHECK(secp256k1_memcmp_var(zeros96, &xonly_pk, sizeof(xonly_pk)) == 0);
    CHECK(ecount == 3);

    /** keypair holds the same xonly pubkey as pubkey_create **/
    CHECK(secp256k1_ec_pubkey_create(sign, &pk, sk) == 1);
    CHECK(secp256k1_xonly_pubkey_from_pubkey(none, &xonly_pk, &pk_parity, &pk) == 1);
    CHECK(secp256k1_keypair_create(sign, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_xonly_pub(none, &xonly_pk_tmp, &pk_parity_tmp, &keypair) == 1);
    CHECK(secp256k1_memcmp_var(&xonly_pk, &xonly_pk_tmp, sizeof(pk)) == 0);
    CHECK(pk_parity == pk_parity_tmp);

    /* Test keypair_seckey */
    ecount = 0;
    secp256k1_testrand256(sk);
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_sec(none, sk_tmp, &keypair) == 1);
    CHECK(secp256k1_keypair_sec(none, NULL, &keypair) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_keypair_sec(none, sk_tmp, NULL) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_memcmp_var(zeros96, sk_tmp, sizeof(sk_tmp)) == 0);

    /* keypair returns the same seckey it got */
    CHECK(secp256k1_keypair_create(sign, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_sec(none, sk_tmp, &keypair) == 1);
    CHECK(secp256k1_memcmp_var(sk, sk_tmp, sizeof(sk_tmp)) == 0);


    /* Using an invalid keypair is fine for keypair_seckey */
    memset(&keypair, 0, sizeof(keypair));
    CHECK(secp256k1_keypair_sec(none, sk_tmp, &keypair) == 1);
    CHECK(secp256k1_memcmp_var(zeros96, sk_tmp, sizeof(sk_tmp)) == 0);

    secp256k1_context_destroy(none);
    secp256k1_context_destroy(sign);
    secp256k1_context_destroy(verify);
}

void test_keypair_add(void) {
    unsigned char sk[32];
    secp256k1_keypair keypair;
    unsigned char overflows[32];
    unsigned char zeros96[96] = { 0 };
    unsigned char tweak[32];
    int i;
    int ecount = 0;
    secp256k1_context *none = api_test_context(SECP256K1_CONTEXT_NONE, &ecount);
    secp256k1_context *sign = api_test_context(SECP256K1_CONTEXT_SIGN, &ecount);
    secp256k1_context *verify = api_test_context(SECP256K1_CONTEXT_VERIFY, &ecount);

    CHECK(sizeof(zeros96) == sizeof(keypair));
    secp256k1_testrand256(sk);
    secp256k1_testrand256(tweak);
    memset(overflows, 0xFF, 32);
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);

    CHECK(secp256k1_keypair_xonly_tweak_add(none, &keypair, tweak) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_keypair_xonly_tweak_add(sign, &keypair, tweak) == 0);
    CHECK(ecount == 2);
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, &keypair, tweak) == 1);
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, NULL, tweak) == 0);
    CHECK(ecount == 3);
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, &keypair, NULL) == 0);
    CHECK(ecount == 4);
    /* This does not set the keypair to zeroes */
    CHECK(secp256k1_memcmp_var(&keypair, zeros96, sizeof(keypair)) != 0);

    /* Invalid tweak zeroes the keypair */
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_xonly_tweak_add(ctx, &keypair, overflows) == 0);
    CHECK(secp256k1_memcmp_var(&keypair, zeros96, sizeof(keypair))  == 0);

    /* A zero tweak is fine */
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    CHECK(secp256k1_keypair_xonly_tweak_add(ctx, &keypair, zeros96) == 1);

    /* Fails if the resulting keypair was (sk=0, pk=infinity) */
    for (i = 0; i < count; i++) {
        secp256k1_scalar scalar_tweak;
        secp256k1_keypair keypair_tmp;
        secp256k1_testrand256(sk);
        CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
        memcpy(&keypair_tmp, &keypair, sizeof(keypair));
        /* Because sk may be negated before adding, we need to try with tweak =
         * sk as well as tweak = -sk. */
        secp256k1_scalar_set_b32(&scalar_tweak, sk, NULL);
        secp256k1_scalar_negate(&scalar_tweak, &scalar_tweak);
        secp256k1_scalar_get_b32(tweak, &scalar_tweak);
        CHECK((secp256k1_keypair_xonly_tweak_add(ctx, &keypair, sk) == 0)
              || (secp256k1_keypair_xonly_tweak_add(ctx, &keypair_tmp, tweak) == 0));
        CHECK(secp256k1_memcmp_var(&keypair, zeros96, sizeof(keypair)) == 0
              || secp256k1_memcmp_var(&keypair_tmp, zeros96, sizeof(keypair_tmp)) == 0);
    }

    /* Invalid keypair with a valid tweak */
    memset(&keypair, 0, sizeof(keypair));
    secp256k1_testrand256(tweak);
    ecount = 0;
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, &keypair, tweak) == 0);
    CHECK(ecount == 1);
    CHECK(secp256k1_memcmp_var(&keypair, zeros96, sizeof(keypair))  == 0);
    /* Only seckey part of keypair invalid */
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    memset(&keypair, 0, 32);
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, &keypair, tweak) == 0);
    CHECK(ecount == 2);
    /* Only pubkey part of keypair invalid */
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    memset(&keypair.data[32], 0, 64);
    CHECK(secp256k1_keypair_xonly_tweak_add(verify, &keypair, tweak) == 0);
    CHECK(ecount == 3);

    /* Check that the keypair_tweak_add implementation is correct */
    CHECK(secp256k1_keypair_create(ctx, &keypair, sk) == 1);
    for (i = 0; i < count; i++) {
        secp256k1_xonly_pubkey internal_pk;
        secp256k1_xonly_pubkey output_pk;
        secp256k1_pubkey output_pk_xy;
        secp256k1_pubkey output_pk_expected;
        unsigned char pk32[32];
        unsigned char sk32[32];
        int pk_parity;

        secp256k1_testrand256(tweak);
        CHECK(secp256k1_keypair_xonly_pub(ctx, &internal_pk, NULL, &keypair) == 1);
        CHECK(secp256k1_keypair_xonly_tweak_add(ctx, &keypair, tweak) == 1);
        CHECK(secp256k1_keypair_xonly_pub(ctx, &output_pk, &pk_parity, &keypair) == 1);

        /* Check that it passes xonly_pubkey_tweak_add_check */
        CHECK(secp256k1_xonly_pubkey_serialize(ctx, pk32, &output_pk) == 1);
        CHECK(secp256k1_xonly_pubkey_tweak_add_check(ctx, pk32, pk_parity, &internal_pk, tweak) == 1);

        /* Check that the resulting pubkey matches xonly_pubkey_tweak_add */
        CHECK(secp256k1_keypair_pub(ctx, &output_pk_xy, &keypair) == 1);
        CHECK(secp256k1_xonly_pubkey_tweak_add(ctx, &output_pk_expected, &internal_pk, tweak) == 1);
        CHECK(secp256k1_memcmp_var(&output_pk_xy, &output_pk_expected, sizeof(output_pk_xy)) == 0);

        /* Check that the secret key in the keypair is tweaked correctly */
        CHECK(secp256k1_keypair_sec(none, sk32, &keypair) == 1);
        CHECK(secp256k1_ec_pubkey_create(ctx, &output_pk_expected, sk32) == 1);
        CHECK(secp256k1_memcmp_var(&output_pk_xy, &output_pk_expected, sizeof(output_pk_xy)) == 0);
    }
    secp256k1_context_destroy(none);
    secp256k1_context_destroy(sign);
    secp256k1_context_destroy(verify);
}

void run_extrakeys_tests(void) {
    /* xonly key test cases */
    test_xonly_pubkey();
    test_xonly_pubkey_tweak();
    test_xonly_pubkey_tweak_check();
    test_xonly_pubkey_tweak_recursive();

    /* keypair tests */
    test_keypair();
    test_keypair_add();
}

#endif
