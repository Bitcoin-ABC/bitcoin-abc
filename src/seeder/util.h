#ifndef BITCOIN_SEEDER_UTIL_H
#define BITCOIN_SEEDER_UTIL_H

#include <cstdarg>
#include <errno.h>
#include <openssl/sha.h>
#include <pthread.h>

#include "uint256.h"

#define loop for (;;)
#define BEGIN(a) ((char *)&(a))
#define END(a) ((char *)&((&(a))[1]))
#define UBEGIN(a) ((uint8_t *)&(a))
#define UEND(a) ((uint8_t *)&((&(a))[1]))
#define ARRAYLEN(array) (sizeof(array) / sizeof((array)[0]))

#define WSAGetLastError() errno
#define WSAEINVAL EINVAL
#define WSAEALREADY EALREADY
#define WSAEWOULDBLOCK EWOULDBLOCK
#define WSAEMSGSIZE EMSGSIZE
#define WSAEINTR EINTR
#define WSAEINPROGRESS EINPROGRESS
#define WSAEADDRINUSE EADDRINUSE
#define WSAENOTSOCK EBADF
#define INVALID_SOCKET (SOCKET)(~0)
#define SOCKET_ERROR -1

template <typename T1> inline uint256 Hash(const T1 pbegin, const T1 pend) {
    static uint8_t pblank[1];
    uint256 hash1;
    SHA256((pbegin == pend ? pblank : (uint8_t *)&pbegin[0]),
           (pend - pbegin) * sizeof(pbegin[0]), (uint8_t *)&hash1);
    uint256 hash2;
    SHA256((uint8_t *)&hash1, sizeof(hash1), (uint8_t *)&hash2);
    return hash2;
}

static inline void Sleep(int nMilliSec) {
    struct timespec wa;
    wa.tv_sec = nMilliSec / 1000;
    wa.tv_nsec = (nMilliSec % 1000) * 1000000;
    nanosleep(&wa, nullptr);
}

std::string vstrprintf(const char *format, va_list ap);

static inline std::string strprintf(const char *format, ...) {
    va_list arg_ptr;
    va_start(arg_ptr, format);
    std::string ret = vstrprintf(format, arg_ptr);
    va_end(arg_ptr);
    return ret;
}

static inline bool error(std::string err, ...) {
    return false;
}

static inline bool my_printf(std::string err, ...) {
    return true;
}

std::vector<uint8_t> DecodeBase32(const char *p, bool *pfInvalid = nullptr);
std::string DecodeBase32(const std::string &str);
std::string EncodeBase32(const uint8_t *pch, size_t len);
std::string EncodeBase32(const std::string &str);

#endif
