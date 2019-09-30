// Copyright (c) 2009-2014 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <cstdarg>
#include <cstddef>
#include <cstdint>

#if defined(HAVE_SYS_SELECT_H)
#include <sys/select.h>
#endif

// Prior to GLIBC_2.14, memcpy was aliased to memmove.
extern "C" void *memmove(void *a, const void *b, size_t c);
extern "C" void *memcpy(void *a, const void *b, size_t c) {
    return memmove(a, b, c);
}

extern "C" void __chk_fail(void) __attribute__((__noreturn__));
extern "C" FDELT_TYPE __fdelt_warn(FDELT_TYPE a) {
    if (a >= FD_SETSIZE) __chk_fail();
    return a / __NFDBITS;
}
extern "C" FDELT_TYPE __fdelt_chk(FDELT_TYPE)
    __attribute__((weak, alias("__fdelt_warn")));

#if defined(__i386__) || defined(__arm__)

extern "C" int64_t __udivmoddi4(uint64_t u, uint64_t v, uint64_t *rp);

extern "C" int64_t __wrap___divmoddi4(int64_t u, int64_t v, int64_t *rp) {
    int32_t c1 = 0, c2 = 0;
    int64_t uu = u, vv = v;
    int64_t w;
    int64_t r;

    if (uu < 0) {
        c1 = ~c1, c2 = ~c2, uu = -uu;
    }
    if (vv < 0) {
        c1 = ~c1, vv = -vv;
    }

    w = __udivmoddi4(uu, vv, (uint64_t *)&r);
    if (c1) w = -w;
    if (c2) r = -r;

    *rp = r;
    return w;
}
#endif

extern "C" float log2f_old(float x);
#ifdef __i386__
__asm(".symver log2f_old,log2f@GLIBC_2.1");
#elif defined(__amd64__)
__asm(".symver log2f_old,log2f@GLIBC_2.2.5");
#elif defined(__arm__)
__asm(".symver log2f_old,log2f@GLIBC_2.4");
#elif defined(__aarch64__)
__asm(".symver log2f_old,log2f@GLIBC_2.17");
#endif
extern "C" float __wrap_log2f(float x) {
    return log2f_old(x);
}

/*
 * Starting with GLIBC_2.28, the `fcntl()` function has a new variant
 * `fcntl64()`:
 * https://gitlab.com/freedesktop-sdk/mirrors/glibc/commit/06ab719d30b01da401150068054d3b8ea93dd12f
 * (link to a mirror, glibc has no online source browser).
 *
 * See also the release notes for the 2.28 version:
 * https://www.sourceware.org/ml/libc-alpha/2018-08/msg00003.html
 *
 * This is intended to fix a bug related to large file support on architectures
 * where off_t and off64_t are not the same underlying type.
 * To remain compatible with the previous versions, the GLIBC offers a
 * compatibility symbol for these architectures. We can link the new `fcntl()`
 * and `fcntl64()` against this symbol with the help of a wrapper.
 */
#if defined(HAVE_CONFIG_H) && !defined(HAVE_LARGE_FILE_SUPPORT)
extern "C" int fcntl_old(int fd, int cmd, ...);
#ifdef __i386__
__asm(".symver fcntl_old,fcntl@GLIBC_2.0");
#elif defined(__amd64__)
__asm(".symver fcntl_old,fcntl@GLIBC_2.2.5");
#elif defined(__arm__)
__asm(".symver fcntl_old,fcntl@GLIBC_2.4");
#elif defined(__aarch64__)
__asm(".symver fcntl_old,fcntl@GLIBC_2.17");
#endif

extern "C" int __wrap_fcntl(int fd, int cmd, ...) {
    int ret;
    va_list vargs;
    va_start(vargs, cmd);
    ret = fcntl_old(fd, cmd, va_arg(vargs, void *));
    va_end(vargs);
    return ret;
}
extern "C" int __wrap_fcntl64(int fd, int cmd, ...) {
    int ret;
    va_list vargs;
    va_start(vargs, cmd);
    ret = fcntl_old(fd, cmd, va_arg(vargs, void *));
    va_end(vargs);
    return ret;
}
#endif
