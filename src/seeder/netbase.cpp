// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "netbase.h"
#include "strlcpy.h"
#include "util.h"

#ifndef WIN32
#include <sys/fcntl.h>
#endif

#include <boost/algorithm/string/case_conv.hpp> // for to_lower()

#define printf my_printf

// Settings
typedef std::pair<CService, int> proxyType;
static proxyType proxyInfo[NET_MAX];
static proxyType nameproxyInfo;

static const uint8_t pchIPv4[12] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff};

static bool Socks4(const CService &addrDest, SOCKET &hSocket) {
    printf("SOCKS4 connecting %s\n", addrDest.ToString().c_str());
    if (!addrDest.IsIPv4()) {
        closesocket(hSocket);
        return error("Proxy destination is not IPv4");
    }
    char pszSocks4IP[] = "\4\1\0\0\0\0\0\0user";
    struct sockaddr_in addr;
    socklen_t len = sizeof(addr);
    if (!addrDest.GetSockAddr((struct sockaddr *)&addr, &len) ||
        addr.sin_family != AF_INET) {
        closesocket(hSocket);
        return error("Cannot get proxy destination address");
    }
    memcpy(pszSocks4IP + 2, &addr.sin_port, 2);
    memcpy(pszSocks4IP + 4, &addr.sin_addr, 4);
    char *pszSocks4 = pszSocks4IP;
    int nSize = sizeof(pszSocks4IP);

    int ret = send(hSocket, pszSocks4, nSize, MSG_NOSIGNAL);
    if (ret != nSize) {
        closesocket(hSocket);
        return error("Error sending to proxy");
    }
    char pchRet[8];
    if (recv(hSocket, pchRet, 8, 0) != 8) {
        closesocket(hSocket);
        return error("Error reading proxy response");
    }
    if (pchRet[1] != 0x5a) {
        closesocket(hSocket);
        if (pchRet[1] != 0x5b)
            printf("ERROR: Proxy returned error %d\n", pchRet[1]);
        return false;
    }
    printf("SOCKS4 connected %s\n", addrDest.ToString().c_str());
    return true;
}

static bool Socks5(std::string strDest, int port, SOCKET &hSocket) {
    printf("SOCKS5 connecting %s\n", strDest.c_str());
    if (strDest.size() > 255) {
        closesocket(hSocket);
        return error("Hostname too long");
    }
    char pszSocks5Init[] = "\5\1\0";
    char *pszSocks5 = pszSocks5Init;
    ssize_t nSize = sizeof(pszSocks5Init) - 1;

    ssize_t ret = send(hSocket, pszSocks5, nSize, MSG_NOSIGNAL);
    if (ret != nSize) {
        closesocket(hSocket);
        return error("Error sending to proxy");
    }
    char pchRet1[2];
    if (recv(hSocket, pchRet1, 2, 0) != 2) {
        closesocket(hSocket);
        return error("Error reading proxy response");
    }
    if (pchRet1[0] != 0x05 || pchRet1[1] != 0x00) {
        closesocket(hSocket);
        return error("Proxy failed to initialize");
    }
    std::string strSocks5("\5\1");
    strSocks5 += '\000';
    strSocks5 += '\003';
    strSocks5 += static_cast<char>(std::min((int)strDest.size(), 255));
    strSocks5 += strDest;
    strSocks5 += static_cast<char>((port >> 8) & 0xFF);
    strSocks5 += static_cast<char>((port >> 0) & 0xFF);
    ret = send(hSocket, strSocks5.c_str(), strSocks5.size(), MSG_NOSIGNAL);
    if (ret != (ssize_t)strSocks5.size()) {
        closesocket(hSocket);
        return error("Error sending to proxy");
    }
    char pchRet2[4];
    if (recv(hSocket, pchRet2, 4, 0) != 4) {
        closesocket(hSocket);
        return error("Error reading proxy response");
    }
    if (pchRet2[0] != 0x05) {
        closesocket(hSocket);
        return error("Proxy failed to accept request");
    }
    if (pchRet2[1] != 0x00) {
        closesocket(hSocket);
        switch (pchRet2[1]) {
            case 0x01:
                return error("Proxy error: general failure");
            case 0x02:
                return error("Proxy error: connection not allowed");
            case 0x03:
                return error("Proxy error: network unreachable");
            case 0x04:
                return error("Proxy error: host unreachable");
            case 0x05:
                return error("Proxy error: connection refused");
            case 0x06:
                return error("Proxy error: TTL expired");
            case 0x07:
                return error("Proxy error: protocol error");
            case 0x08:
                return error("Proxy error: address type not supported");
            default:
                return error("Proxy error: unknown");
        }
    }
    if (pchRet2[2] != 0x00) {
        closesocket(hSocket);
        return error("Error: malformed proxy response");
    }
    char pchRet3[256];
    switch (pchRet2[3]) {
        case 0x01:
            ret = recv(hSocket, pchRet3, 4, 0) != 4;
            break;
        case 0x04:
            ret = recv(hSocket, pchRet3, 16, 0) != 16;
            break;
        case 0x03: {
            ret = recv(hSocket, pchRet3, 1, 0) != 1;
            if (ret) return error("Error reading from proxy");
            int nRecv = pchRet3[0];
            ret = recv(hSocket, pchRet3, nRecv, 0) != nRecv;
            break;
        }
        default:
            closesocket(hSocket);
            return error("Error: malformed proxy response");
    }
    if (ret) {
        closesocket(hSocket);
        return error("Error reading from proxy");
    }
    if (recv(hSocket, pchRet3, 2, 0) != 2) {
        closesocket(hSocket);
        return error("Error reading from proxy");
    }
    printf("SOCKS5 connected %s\n", strDest.c_str());
    return true;
}

static bool ConnectSocketDirectly(const CService &addrConnect,
                                  SOCKET &hSocketRet, int nTimeout) {
    hSocketRet = INVALID_SOCKET;

    struct sockaddr_storage sockaddr;
    socklen_t len = sizeof(sockaddr);
    if (!addrConnect.GetSockAddr((struct sockaddr *)&sockaddr, &len)) {
        printf("Cannot connect to %s: unsupported network\n",
               addrConnect.ToString().c_str());
        return false;
    }

    SOCKET hSocket = socket(((struct sockaddr *)&sockaddr)->sa_family,
                            SOCK_STREAM, IPPROTO_TCP);
    if (hSocket == INVALID_SOCKET) return false;
#ifdef SO_NOSIGPIPE
    int set = 1;
    setsockopt(hSocket, SOL_SOCKET, SO_NOSIGPIPE, (void *)&set, sizeof(int));
#endif

#ifdef WIN32
    u_long fNonblock = 1;
    if (ioctlsocket(hSocket, FIONBIO, &fNonblock) == SOCKET_ERROR)
#else
    int fFlags = fcntl(hSocket, F_GETFL, 0);
    if (fcntl(hSocket, F_SETFL, fFlags | O_NONBLOCK) == -1)
#endif
    {
        closesocket(hSocket);
        return false;
    }

    if (connect(hSocket, (struct sockaddr *)&sockaddr, len) == SOCKET_ERROR) {
        // WSAEINVAL is here because some legacy version of winsock uses it
        if (WSAGetLastError() == WSAEINPROGRESS ||
            WSAGetLastError() == WSAEWOULDBLOCK ||
            WSAGetLastError() == WSAEINVAL) {
            struct timeval timeout;
            timeout.tv_sec = nTimeout / 1000;
            timeout.tv_usec = (nTimeout % 1000) * 1000;

            fd_set fdset;
            FD_ZERO(&fdset);
            FD_SET(hSocket, &fdset);
            int nRet = select(hSocket + 1, nullptr, &fdset, nullptr, &timeout);
            if (nRet == 0) {
                printf("connection timeout\n");
                closesocket(hSocket);
                return false;
            }
            if (nRet == SOCKET_ERROR) {
                printf("select() for connection failed: %i\n",
                       WSAGetLastError());
                closesocket(hSocket);
                return false;
            }
            socklen_t nRetSize = sizeof(nRet);
#ifdef WIN32
            if (getsockopt(hSocket, SOL_SOCKET, SO_ERROR, (char *)(&nRet),
                           &nRetSize) == SOCKET_ERROR)
#else
            if (getsockopt(hSocket, SOL_SOCKET, SO_ERROR, &nRet, &nRetSize) ==
                SOCKET_ERROR)
#endif
            {
                printf("getsockopt() for connection failed: %i\n",
                       WSAGetLastError());
                closesocket(hSocket);
                return false;
            }
            if (nRet != 0) {
                printf("connect() failed after select(): %s\n", strerror(nRet));
                closesocket(hSocket);
                return false;
            }
        }
#ifdef WIN32
        else if (WSAGetLastError() != WSAEISCONN)
#else
        else
#endif
        {
            printf("connect() failed: %i\n", WSAGetLastError());
            closesocket(hSocket);
            return false;
        }
    }

// this isn't even strictly necessary
// CNode::ConnectNode immediately turns the socket back to non-blocking
// but we'll turn it back to blocking just in case
#ifdef WIN32
    fNonblock = 0;
    if (ioctlsocket(hSocket, FIONBIO, &fNonblock) == SOCKET_ERROR)
#else
    fFlags = fcntl(hSocket, F_GETFL, 0);
    if (fcntl(hSocket, F_SETFL, fFlags & !O_NONBLOCK) == SOCKET_ERROR)
#endif
    {
        closesocket(hSocket);
        return false;
    }

    hSocketRet = hSocket;
    return true;
}

bool SetProxy(enum Network net, CService addrProxy, int nSocksVersion) {
    assert(net >= 0 && net < NET_MAX);
    if (nSocksVersion != 0 && nSocksVersion != 4 && nSocksVersion != 5)
        return false;
    if (nSocksVersion != 0 && !addrProxy.IsValid()) return false;
    proxyInfo[net] = std::make_pair(addrProxy, nSocksVersion);
    return true;
}

bool ConnectSocket(const CService &addrDest, SOCKET &hSocketRet, int nTimeout) {
    const proxyType &proxy = proxyInfo[addrDest.GetNetwork()];

    // no proxy needed
    if (!proxy.second)
        return ConnectSocketDirectly(addrDest, hSocketRet, nTimeout);

    SOCKET hSocket = INVALID_SOCKET;

    // first connect to proxy server
    if (!ConnectSocketDirectly(proxy.first, hSocket, nTimeout)) return false;

    // do socks negotiation
    switch (proxy.second) {
        case 4:
            if (!Socks4(addrDest, hSocket)) return false;
            break;
        case 5:
            if (!Socks5(addrDest.ToStringIP(), addrDest.GetPort(), hSocket))
                return false;
            break;
        default:
            return false;
    }

    hSocketRet = hSocket;
    return true;
}
