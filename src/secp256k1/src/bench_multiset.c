/***********************************************************************
 * Copyright (c) 2017 Tomas van der Wansem                             *
 * Distributed under the MIT software license, see the accompanying    *
 * file COPYING or https://www.opensource.org/licenses/mit-license.php.*
 ***********************************************************************/

#include "include/secp256k1.h"
#include "include/secp256k1_multiset.h"
#include "util.h"
#include "bench.h"

secp256k1_context *ctx;

#define UNUSED(x) (void)(x)

#define BUFSIZE (3 * 32)

void bench_multiset(void* arg, int iters) {
    int it = 0;
    int n, m;
    unsigned char result[32];
    secp256k1_multiset multiset;

    UNUSED(arg);
    secp256k1_multiset_init(ctx, &multiset);

    for (m = 0; m < iters; m++) {
        unsigned char buf[BUFSIZE];
        for (n = 0; n < BUFSIZE; n++) {
            buf[n] = it++;
        }

        secp256k1_multiset_add(ctx, &multiset, buf, sizeof(buf));
    }

    secp256k1_multiset_finalize(ctx, result, &multiset);
}

void bench_multiset_setup(void* arg) {
    UNUSED(arg);
}

int main(void) {
    int iters = get_iters(300000);

    ctx = secp256k1_context_create(SECP256K1_CONTEXT_VERIFY);
    run_benchmark("multiset", bench_multiset, bench_multiset_setup, NULL, NULL, 5, iters);
    secp256k1_context_destroy(ctx);

    return 0;
}
