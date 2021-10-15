/***********************************************************************
 * Copyright (c) 2014 Pieter Wuille                                    *
 * Distributed under the MIT software license, see the accompanying    *
 * file COPYING or https://www.opensource.org/licenses/mit-license.php.*
 ***********************************************************************/

#include "include/secp256k1.h"
#include "util.h"
#include "bench.h"

#ifdef ENABLE_MODULE_SCHNORR
#include "include/secp256k1_schnorr.h"
#endif


typedef struct {
    secp256k1_context* ctx;
    unsigned char msg[32];
    unsigned char key[32];
} bench_sign_data;

static void bench_sign_setup(void* arg) {
    int i;
    bench_sign_data *data = (bench_sign_data*)arg;

    for (i = 0; i < 32; i++) {
        data->msg[i] = i + 1;
    }
    for (i = 0; i < 32; i++) {
        data->key[i] = i + 65;
    }
}

static void bench_sign_run(void* arg, int iters) {
    int i;
    bench_sign_data *data = (bench_sign_data*)arg;

    unsigned char sig[74];
    for (i = 0; i < iters; i++) {
        size_t siglen = 74;
        int j;
        secp256k1_ecdsa_signature signature;
        CHECK(secp256k1_ecdsa_sign(data->ctx, &signature, data->msg, data->key, NULL, NULL));
        CHECK(secp256k1_ecdsa_signature_serialize_der(data->ctx, sig, &siglen, &signature));
        for (j = 0; j < 32; j++) {
            data->msg[j] = sig[j];
            data->key[j] = sig[j + 32];
        }
    }
}

#ifdef ENABLE_MODULE_SCHNORR
static void bench_schnorr_sign_run(void* arg, int iters) {
    int i,j;
    bench_sign_data *data = (bench_sign_data*)arg;

    unsigned char sig[64];
    for (i = 0; i < iters; i++) {
        CHECK(secp256k1_schnorr_sign(data->ctx, sig, data->msg, data->key, NULL, NULL));
        for (j = 0; j < 32; j++) {
            data->msg[j] = sig[j];
            data->key[j] = sig[j + 32];
        }
    }
}
#endif

int main(void) {
    bench_sign_data data;

    int iters = get_iters(20000);

    data.ctx = secp256k1_context_create(SECP256K1_CONTEXT_SIGN);

    print_output_table_header_row();
    
    run_benchmark("ecdsa_sign", bench_sign_run, bench_sign_setup, NULL, &data, 10, iters);
#ifdef ENABLE_MODULE_SCHNORR
    run_benchmark("schnorr_sign", bench_schnorr_sign_run, bench_sign_setup, NULL, &data, 10, iters);
#endif

    secp256k1_context_destroy(data.ctx);
    return 0;
}
