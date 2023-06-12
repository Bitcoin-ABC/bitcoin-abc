// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <jemalloc/jemalloc.h>

/**
 * Using the signature of jemalloc's malloc_message(), drop the string entirely.
 */
static void _drop_malloc_message(void *cbopaque, const char *s) {
    (void)cbopaque;
    (void)s;

    // FIXME: figure out how to redirect the write to stdout or the debug.log.
    // So far all my attempts caused an allocation to happen which crashes the
    // application immediately. See https://jemalloc.net/jemalloc.3.html.
    return;
}

// This is an extern variable from jemalloc, see
// http://jemalloc.net/jemalloc.3.html
void (*malloc_message)(void *cbopaque, const char *s) = &_drop_malloc_message;
