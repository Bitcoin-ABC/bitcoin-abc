// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_SEEDER_COMPAT_H
#define BITCOIN_SEEDER_COMPAT_H

#ifdef WIN32
#define _WIN32_WINNT 0x0501
#define WIN32_LEAN_AND_MEAN 1
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <mswsock.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <arpa/inet.h>
#include <ifaddrs.h>
#include <net/if.h>
#include <netdb.h>
#include <netinet/in.h>
#include <sys/fcntl.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
#endif

typedef u_int SOCKET;
#ifdef __APPLE__
#define MSG_NOSIGNAL 0
#endif
#ifdef WIN32
#define MSG_NOSIGNAL 0
#define MSG_DONTWAIT 0
typedef int socklen_t;
#else
#include "errno.h"
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
#endif

inline int myclosesocket(SOCKET &hSocket) {
    if (hSocket == INVALID_SOCKET) return WSAENOTSOCK;
#ifdef WIN32
    int ret = closesocket(hSocket);
#else
    int ret = close(hSocket);
#endif
    hSocket = INVALID_SOCKET;
    return ret;
}
#define closesocket(s) myclosesocket(s)

#endif
