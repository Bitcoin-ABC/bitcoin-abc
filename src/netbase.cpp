// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifdef HAVE_CONFIG_H
#include "config/bitcoin-config.h"
#endif

#include "netbase.h"

#include "hash.h"
#include "random.h"
#include "sync.h"
#include "uint256.h"
#include "util.h"
#include "utilstrencodings.h"

#include <atomic>

#ifndef WIN32
#include <fcntl.h>
#endif

#include <boost/algorithm/string/case_conv.hpp> // for to_lower()
#include <boost/algorithm/string/predicate.hpp> // for startswith() and endswith()

#if !defined(HAVE_MSG_NOSIGNAL) && !defined(MSG_NOSIGNAL)
#define MSG_NOSIGNAL 0
#endif

// Settings
static proxyType proxyInfo[NET_MAX];
static proxyType nameProxy;
static CCriticalSection cs_proxyInfos;
int nConnectTimeout = DEFAULT_CONNECT_TIMEOUT;
bool fNameLookup = DEFAULT_NAME_LOOKUP;

// Need ample time for negotiation for very slow proxies such as Tor
// (milliseconds)
static const int SOCKS5_RECV_TIMEOUT = 20 * 1000;
static std::atomic<bool> interruptSocks5Recv(false);

enum Network ParseNetwork(std::string net) {
    boost::to_lower(net);
    if (net == "ipv4") return NET_IPV4;
    if (net == "ipv6") return NET_IPV6;
    if (net == "tor" || net == "onion") return NET_TOR;
    return NET_UNROUTABLE;
}

std::string GetNetworkName(enum Network net) {
    switch (net) {
        case NET_IPV4:
            return "ipv4";
        case NET_IPV6:
            return "ipv6";
        case NET_TOR:
            return "onion";
        default:
            return "";
    }
}

static bool LookupIntern(const char *pszName, std::vector<CNetAddr> &vIP,
                         unsigned int nMaxSolutions, bool fAllowLookup) {
    vIP.clear();

    {
        CNetAddr addr;
        if (addr.SetSpecial(std::string(pszName))) {
            vIP.push_back(addr);
            return true;
        }
    }

    struct addrinfo aiHint;
    memset(&aiHint, 0, sizeof(struct addrinfo));

    aiHint.ai_socktype = SOCK_STREAM;
    aiHint.ai_protocol = IPPROTO_TCP;
    aiHint.ai_family = AF_UNSPEC;
#ifdef WIN32
    aiHint.ai_flags = fAllowLookup ? 0 : AI_NUMERICHOST;
#else
    aiHint.ai_flags = fAllowLookup ? AI_ADDRCONFIG : AI_NUMERICHOST;
#endif
    struct addrinfo *aiRes = nullptr;
    int nErr = getaddrinfo(pszName, nullptr, &aiHint, &aiRes);
    if (nErr) return false;

    struct addrinfo *aiTrav = aiRes;
    while (aiTrav != nullptr &&
           (nMaxSolutions == 0 || vIP.size() < nMaxSolutions)) {
        CNetAddr resolved;
        if (aiTrav->ai_family == AF_INET) {
            assert(aiTrav->ai_addrlen >= sizeof(sockaddr_in));
            resolved =
                CNetAddr(((struct sockaddr_in *)(aiTrav->ai_addr))->sin_addr);
        }

        if (aiTrav->ai_family == AF_INET6) {
            assert(aiTrav->ai_addrlen >= sizeof(sockaddr_in6));
            struct sockaddr_in6 *s6 = (struct sockaddr_in6 *)aiTrav->ai_addr;
            resolved = CNetAddr(s6->sin6_addr, s6->sin6_scope_id);
        }

        // Never allow resolving to an internal address. Consider any such
        // result invalid.
        if (!resolved.IsInternal()) {
            vIP.push_back(resolved);
        }

        aiTrav = aiTrav->ai_next;
    }

    freeaddrinfo(aiRes);

    return (vIP.size() > 0);
}

bool LookupHost(const char *pszName, std::vector<CNetAddr> &vIP,
                unsigned int nMaxSolutions, bool fAllowLookup) {
    std::string strHost(pszName);
    if (strHost.empty()) return false;
    if (boost::algorithm::starts_with(strHost, "[") &&
        boost::algorithm::ends_with(strHost, "]")) {
        strHost = strHost.substr(1, strHost.size() - 2);
    }

    return LookupIntern(strHost.c_str(), vIP, nMaxSolutions, fAllowLookup);
}

bool LookupHost(const char *pszName, CNetAddr &addr, bool fAllowLookup) {
    std::vector<CNetAddr> vIP;
    LookupHost(pszName, vIP, 1, fAllowLookup);
    if (vIP.empty()) return false;
    addr = vIP.front();
    return true;
}

bool Lookup(const char *pszName, std::vector<CService> &vAddr, int portDefault,
            bool fAllowLookup, unsigned int nMaxSolutions) {
    if (pszName[0] == 0) return false;
    int port = portDefault;
    std::string hostname = "";
    SplitHostPort(std::string(pszName), port, hostname);

    std::vector<CNetAddr> vIP;
    bool fRet =
        LookupIntern(hostname.c_str(), vIP, nMaxSolutions, fAllowLookup);
    if (!fRet) return false;
    vAddr.resize(vIP.size());
    for (unsigned int i = 0; i < vIP.size(); i++)
        vAddr[i] = CService(vIP[i], port);
    return true;
}

bool Lookup(const char *pszName, CService &addr, int portDefault,
            bool fAllowLookup) {
    std::vector<CService> vService;
    bool fRet = Lookup(pszName, vService, portDefault, fAllowLookup, 1);
    if (!fRet) return false;
    addr = vService[0];
    return true;
}

CService LookupNumeric(const char *pszName, int portDefault) {
    CService addr;
    // "1.2:345" will fail to resolve the ip, but will still set the port.
    // If the ip fails to resolve, re-init the result.
    if (!Lookup(pszName, addr, portDefault, false)) addr = CService();
    return addr;
}

struct timeval MillisToTimeval(int64_t nTimeout) {
    struct timeval timeout;
    timeout.tv_sec = nTimeout / 1000;
    timeout.tv_usec = (nTimeout % 1000) * 1000;
    return timeout;
}

/**
 * Read bytes from socket. This will either read the full number of bytes
 * requested or return False on error or timeout.
 * This function can be interrupted by calling InterruptSocks5()
 *
 * @param data Buffer to receive into
 * @param len  Length of data to receive
 * @param timeout  Timeout in milliseconds for receive operation
 *
 * @note This function requires that hSocket is in non-blocking mode.
 */
static bool InterruptibleRecv(char *data, size_t len, int timeout,
                              SOCKET &hSocket) {
    int64_t curTime = GetTimeMillis();
    int64_t endTime = curTime + timeout;
    // Maximum time to wait in one select call. It will take up until this time
    // (in millis) to break off in case of an interruption.
    const int64_t maxWait = 1000;
    while (len > 0 && curTime < endTime) {
        // Optimistically try the recv first
        ssize_t ret = recv(hSocket, data, len, 0);
        if (ret > 0) {
            len -= ret;
            data += ret;
        } else if (ret == 0) {
            // Unexpected disconnection
            return false;
        } else {
            // Other error or blocking
            int nErr = WSAGetLastError();
            if (nErr == WSAEINPROGRESS || nErr == WSAEWOULDBLOCK ||
                nErr == WSAEINVAL) {
                if (!IsSelectableSocket(hSocket)) {
                    return false;
                }
                struct timeval tval =
                    MillisToTimeval(std::min(endTime - curTime, maxWait));
                fd_set fdset;
                FD_ZERO(&fdset);
                FD_SET(hSocket, &fdset);
                int nRet = select(hSocket + 1, &fdset, nullptr, nullptr, &tval);
                if (nRet == SOCKET_ERROR) {
                    return false;
                }
            } else {
                return false;
            }
        }
        if (interruptSocks5Recv) return false;
        curTime = GetTimeMillis();
    }
    return len == 0;
}

struct ProxyCredentials {
    std::string username;
    std::string password;
};

std::string Socks5ErrorString(int err) {
    switch (err) {
        case 0x01:
            return "general failure";
        case 0x02:
            return "connection not allowed";
        case 0x03:
            return "network unreachable";
        case 0x04:
            return "host unreachable";
        case 0x05:
            return "connection refused";
        case 0x06:
            return "TTL expired";
        case 0x07:
            return "protocol error";
        case 0x08:
            return "address type not supported";
        default:
            return "unknown";
    }
}

/** Connect using SOCKS5 (as described in RFC1928) */
static bool Socks5(const std::string &strDest, int port,
                   const ProxyCredentials *auth, SOCKET &hSocket) {
    LogPrint(BCLog::NET, "SOCKS5 connecting %s\n", strDest);
    if (strDest.size() > 255) {
        CloseSocket(hSocket);
        return error("Hostname too long");
    }
    // Accepted authentication methods
    std::vector<uint8_t> vSocks5Init;
    vSocks5Init.push_back(0x05);
    if (auth) {
        // # METHODS
        vSocks5Init.push_back(0x02);
        // X'00' NO AUTHENTICATION REQUIRED
        vSocks5Init.push_back(0x00);
        // X'02' USERNAME/PASSWORD (RFC1929)
        vSocks5Init.push_back(0x02);
    } else {
        // # METHODS
        vSocks5Init.push_back(0x01);
        // X'00' NO AUTHENTICATION REQUIRED
        vSocks5Init.push_back(0x00);
    }
    ssize_t ret = send(hSocket, (const char *)vSocks5Init.data(),
                       vSocks5Init.size(), MSG_NOSIGNAL);
    if (ret != (ssize_t)vSocks5Init.size()) {
        CloseSocket(hSocket);
        return error("Error sending to proxy");
    }
    char pchRet1[2];
    if (!InterruptibleRecv(pchRet1, 2, SOCKS5_RECV_TIMEOUT, hSocket)) {
        CloseSocket(hSocket);
        LogPrintf("Socks5() connect to %s:%d failed: InterruptibleRecv() "
                  "timeout or other failure\n",
                  strDest, port);
        return false;
    }
    if (pchRet1[0] != 0x05) {
        CloseSocket(hSocket);
        return error("Proxy failed to initialize");
    }
    if (pchRet1[1] == 0x02 && auth) {
        // Perform username/password authentication (as described in RFC1929)
        std::vector<uint8_t> vAuth;
        vAuth.push_back(0x01);
        if (auth->username.size() > 255 || auth->password.size() > 255)
            return error("Proxy username or password too long");
        vAuth.push_back(auth->username.size());
        vAuth.insert(vAuth.end(), auth->username.begin(), auth->username.end());
        vAuth.push_back(auth->password.size());
        vAuth.insert(vAuth.end(), auth->password.begin(), auth->password.end());
        ret = send(hSocket, (const char *)vAuth.data(), vAuth.size(),
                   MSG_NOSIGNAL);
        if (ret != (ssize_t)vAuth.size()) {
            CloseSocket(hSocket);
            return error("Error sending authentication to proxy");
        }
        LogPrint(BCLog::PROXY, "SOCKS5 sending proxy authentication %s:%s\n",
                 auth->username, auth->password);
        char pchRetA[2];
        if (!InterruptibleRecv(pchRetA, 2, SOCKS5_RECV_TIMEOUT, hSocket)) {
            CloseSocket(hSocket);
            return error("Error reading proxy authentication response");
        }
        if (pchRetA[0] != 0x01 || pchRetA[1] != 0x00) {
            CloseSocket(hSocket);
            return error("Proxy authentication unsuccessful");
        }
    } else if (pchRet1[1] == 0x00) {
        // Perform no authentication
    } else {
        CloseSocket(hSocket);
        return error("Proxy requested wrong authentication method %02x",
                     pchRet1[1]);
    }
    std::vector<uint8_t> vSocks5;
    // VER protocol version
    vSocks5.push_back(0x05);
    // CMD CONNECT
    vSocks5.push_back(0x01);
    // RSV Reserved
    vSocks5.push_back(0x00);
    // ATYP DOMAINNAME
    vSocks5.push_back(0x03);
    // Length<=255 is checked at beginning of function
    vSocks5.push_back(strDest.size());
    vSocks5.insert(vSocks5.end(), strDest.begin(), strDest.end());
    vSocks5.push_back((port >> 8) & 0xFF);
    vSocks5.push_back((port >> 0) & 0xFF);
    ret = send(hSocket, (const char *)vSocks5.data(), vSocks5.size(),
               MSG_NOSIGNAL);
    if (ret != (ssize_t)vSocks5.size()) {
        CloseSocket(hSocket);
        return error("Error sending to proxy");
    }
    char pchRet2[4];
    if (!InterruptibleRecv(pchRet2, 4, SOCKS5_RECV_TIMEOUT, hSocket)) {
        CloseSocket(hSocket);
        return error("Error reading proxy response");
    }
    if (pchRet2[0] != 0x05) {
        CloseSocket(hSocket);
        return error("Proxy failed to accept request");
    }
    if (pchRet2[1] != 0x00) {
        // Failures to connect to a peer that are not proxy errors
        CloseSocket(hSocket);
        LogPrintf("Socks5() connect to %s:%d failed: %s\n", strDest, port,
                  Socks5ErrorString(pchRet2[1]));
        return false;
    }
    if (pchRet2[2] != 0x00) {
        CloseSocket(hSocket);
        return error("Error: malformed proxy response");
    }
    char pchRet3[256];
    switch (pchRet2[3]) {
        case 0x01:
            ret = InterruptibleRecv(pchRet3, 4, SOCKS5_RECV_TIMEOUT, hSocket);
            break;
        case 0x04:
            ret = InterruptibleRecv(pchRet3, 16, SOCKS5_RECV_TIMEOUT, hSocket);
            break;
        case 0x03: {
            ret = InterruptibleRecv(pchRet3, 1, SOCKS5_RECV_TIMEOUT, hSocket);
            if (!ret) {
                CloseSocket(hSocket);
                return error("Error reading from proxy");
            }
            int nRecv = pchRet3[0];
            ret =
                InterruptibleRecv(pchRet3, nRecv, SOCKS5_RECV_TIMEOUT, hSocket);
            break;
        }
        default:
            CloseSocket(hSocket);
            return error("Error: malformed proxy response");
    }
    if (!ret) {
        CloseSocket(hSocket);
        return error("Error reading from proxy");
    }
    if (!InterruptibleRecv(pchRet3, 2, SOCKS5_RECV_TIMEOUT, hSocket)) {
        CloseSocket(hSocket);
        return error("Error reading from proxy");
    }
    LogPrint(BCLog::NET, "SOCKS5 connected %s\n", strDest);
    return true;
}

static bool ConnectSocketDirectly(const CService &addrConnect,
                                  SOCKET &hSocketRet, int nTimeout) {
    hSocketRet = INVALID_SOCKET;

    struct sockaddr_storage sockaddr;
    socklen_t len = sizeof(sockaddr);
    if (!addrConnect.GetSockAddr((struct sockaddr *)&sockaddr, &len)) {
        LogPrintf("Cannot connect to %s: unsupported network\n",
                  addrConnect.ToString());
        return false;
    }

    SOCKET hSocket = socket(((struct sockaddr *)&sockaddr)->sa_family,
                            SOCK_STREAM, IPPROTO_TCP);
    if (hSocket == INVALID_SOCKET) return false;

    int set = 1;
#ifdef SO_NOSIGPIPE
    // Different way of disabling SIGPIPE on BSD
    setsockopt(hSocket, SOL_SOCKET, SO_NOSIGPIPE, (void *)&set, sizeof(int));
#endif

// Disable Nagle's algorithm
#ifdef WIN32
    setsockopt(hSocket, IPPROTO_TCP, TCP_NODELAY, (const char *)&set,
               sizeof(int));
#else
    setsockopt(hSocket, IPPROTO_TCP, TCP_NODELAY, (void *)&set, sizeof(int));
#endif

    // Set to non-blocking
    if (!SetSocketNonBlocking(hSocket, true))
        return error("ConnectSocketDirectly: Setting socket to non-blocking "
                     "failed, error %s\n",
                     NetworkErrorString(WSAGetLastError()));

    if (connect(hSocket, (struct sockaddr *)&sockaddr, len) == SOCKET_ERROR) {
        int nErr = WSAGetLastError();
        // WSAEINVAL is here because some legacy version of winsock uses it
        if (nErr == WSAEINPROGRESS || nErr == WSAEWOULDBLOCK ||
            nErr == WSAEINVAL) {
            struct timeval timeout = MillisToTimeval(nTimeout);
            fd_set fdset;
            FD_ZERO(&fdset);
            FD_SET(hSocket, &fdset);
            int nRet = select(hSocket + 1, nullptr, &fdset, nullptr, &timeout);
            if (nRet == 0) {
                LogPrint(BCLog::NET, "connection to %s timeout\n",
                         addrConnect.ToString());
                CloseSocket(hSocket);
                return false;
            }
            if (nRet == SOCKET_ERROR) {
                LogPrintf("select() for %s failed: %s\n",
                          addrConnect.ToString(),
                          NetworkErrorString(WSAGetLastError()));
                CloseSocket(hSocket);
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
                LogPrintf("getsockopt() for %s failed: %s\n",
                          addrConnect.ToString(),
                          NetworkErrorString(WSAGetLastError()));
                CloseSocket(hSocket);
                return false;
            }
            if (nRet != 0) {
                LogPrintf("connect() to %s failed after select(): %s\n",
                          addrConnect.ToString(), NetworkErrorString(nRet));
                CloseSocket(hSocket);
                return false;
            }
        }
#ifdef WIN32
        else if (WSAGetLastError() != WSAEISCONN)
#else
        else
#endif
        {
            LogPrintf("connect() to %s failed: %s\n", addrConnect.ToString(),
                      NetworkErrorString(WSAGetLastError()));
            CloseSocket(hSocket);
            return false;
        }
    }

    hSocketRet = hSocket;
    return true;
}

bool SetProxy(enum Network net, const proxyType &addrProxy) {
    assert(net >= 0 && net < NET_MAX);
    if (!addrProxy.IsValid()) return false;
    LOCK(cs_proxyInfos);
    proxyInfo[net] = addrProxy;
    return true;
}

bool GetProxy(enum Network net, proxyType &proxyInfoOut) {
    assert(net >= 0 && net < NET_MAX);
    LOCK(cs_proxyInfos);
    if (!proxyInfo[net].IsValid()) return false;
    proxyInfoOut = proxyInfo[net];
    return true;
}

bool SetNameProxy(const proxyType &addrProxy) {
    if (!addrProxy.IsValid()) return false;
    LOCK(cs_proxyInfos);
    nameProxy = addrProxy;
    return true;
}

bool GetNameProxy(proxyType &nameProxyOut) {
    LOCK(cs_proxyInfos);
    if (!nameProxy.IsValid()) return false;
    nameProxyOut = nameProxy;
    return true;
}

bool HaveNameProxy() {
    LOCK(cs_proxyInfos);
    return nameProxy.IsValid();
}

bool IsProxy(const CNetAddr &addr) {
    LOCK(cs_proxyInfos);
    for (int i = 0; i < NET_MAX; i++) {
        if (addr == (CNetAddr)proxyInfo[i].proxy) return true;
    }
    return false;
}

static bool ConnectThroughProxy(const proxyType &proxy,
                                const std::string &strDest, int port,
                                SOCKET &hSocketRet, int nTimeout,
                                bool *outProxyConnectionFailed) {
    SOCKET hSocket = INVALID_SOCKET;
    // first connect to proxy server
    if (!ConnectSocketDirectly(proxy.proxy, hSocket, nTimeout)) {
        if (outProxyConnectionFailed) *outProxyConnectionFailed = true;
        return false;
    }
    // do socks negotiation
    if (proxy.randomize_credentials) {
        ProxyCredentials random_auth;
        static std::atomic_int counter;
        random_auth.username = random_auth.password =
            strprintf("%i", counter++);
        if (!Socks5(strDest, (unsigned short)port, &random_auth, hSocket))
            return false;
    } else {
        if (!Socks5(strDest, (unsigned short)port, 0, hSocket)) return false;
    }

    hSocketRet = hSocket;
    return true;
}

bool ConnectSocket(const CService &addrDest, SOCKET &hSocketRet, int nTimeout,
                   bool *outProxyConnectionFailed) {
    proxyType proxy;
    if (outProxyConnectionFailed) *outProxyConnectionFailed = false;

    if (GetProxy(addrDest.GetNetwork(), proxy)) {
        return ConnectThroughProxy(proxy, addrDest.ToStringIP(),
                                   addrDest.GetPort(), hSocketRet, nTimeout,
                                   outProxyConnectionFailed);
    } else {
        // no proxy needed (none set for target network)
        return ConnectSocketDirectly(addrDest, hSocketRet, nTimeout);
    }
}

bool ConnectSocketByName(CService &addr, SOCKET &hSocketRet,
                         const char *pszDest, int portDefault, int nTimeout,
                         bool *outProxyConnectionFailed) {
    std::string strDest;
    int port = portDefault;

    if (outProxyConnectionFailed) *outProxyConnectionFailed = false;

    SplitHostPort(std::string(pszDest), port, strDest);

    proxyType proxy;
    GetNameProxy(proxy);

    std::vector<CService> addrResolved;
    if (Lookup(strDest.c_str(), addrResolved, port,
               fNameLookup && !HaveNameProxy(), 256)) {
        if (addrResolved.size() > 0) {
            addr = addrResolved[GetRand(addrResolved.size())];
            return ConnectSocket(addr, hSocketRet, nTimeout);
        }
    }

    addr = CService();

    if (!HaveNameProxy()) return false;
    return ConnectThroughProxy(proxy, strDest, port, hSocketRet, nTimeout,
                               outProxyConnectionFailed);
}

bool LookupSubNet(const char *pszName, CSubNet &ret) {
    std::string strSubnet(pszName);
    size_t slash = strSubnet.find_last_of('/');
    std::vector<CNetAddr> vIP;

    std::string strAddress = strSubnet.substr(0, slash);
    if (LookupHost(strAddress.c_str(), vIP, 1, false)) {
        CNetAddr network = vIP[0];
        if (slash != strSubnet.npos) {
            std::string strNetmask = strSubnet.substr(slash + 1);
            int32_t n;
            // IPv4 addresses start at offset 12, and first 12 bytes must match,
            // so just offset n
            if (ParseInt32(strNetmask, &n)) {
                // If valid number, assume /24 syntax
                ret = CSubNet(network, n);
                return ret.IsValid();
            } else {
                // If not a valid number, try full netmask syntax
                // Never allow lookup for netmask
                if (LookupHost(strNetmask.c_str(), vIP, 1, false)) {
                    ret = CSubNet(network, vIP[0]);
                    return ret.IsValid();
                }
            }
        } else {
            ret = CSubNet(network);
            return ret.IsValid();
        }
    }
    return false;
}

#ifdef WIN32
std::string NetworkErrorString(int err) {
    char buf[256];
    buf[0] = 0;
    if (FormatMessageA(FORMAT_MESSAGE_FROM_SYSTEM |
                           FORMAT_MESSAGE_IGNORE_INSERTS |
                           FORMAT_MESSAGE_MAX_WIDTH_MASK,
                       nullptr, err, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
                       buf, sizeof(buf), nullptr)) {
        return strprintf("%s (%d)", buf, err);
    } else {
        return strprintf("Unknown error (%d)", err);
    }
}
#else
std::string NetworkErrorString(int err) {
    char buf[256];
    const char *s = buf;
    buf[0] = 0;
/* Too bad there are two incompatible implementations of the
 * thread-safe strerror. */
#ifdef STRERROR_R_CHAR_P
    /* GNU variant can return a pointer outside the passed buffer */
    s = strerror_r(err, buf, sizeof(buf));
#else
    /* POSIX variant always returns message in buffer */
    if (strerror_r(err, buf, sizeof(buf))) buf[0] = 0;
#endif
    return strprintf("%s (%d)", s, err);
}
#endif

bool CloseSocket(SOCKET &hSocket) {
    if (hSocket == INVALID_SOCKET) return false;
#ifdef WIN32
    int ret = closesocket(hSocket);
#else
    int ret = close(hSocket);
#endif
    hSocket = INVALID_SOCKET;
    return ret != SOCKET_ERROR;
}

bool SetSocketNonBlocking(SOCKET &hSocket, bool fNonBlocking) {
    if (fNonBlocking) {
#ifdef WIN32
        u_long nOne = 1;
        if (ioctlsocket(hSocket, FIONBIO, &nOne) == SOCKET_ERROR) {
#else
        int fFlags = fcntl(hSocket, F_GETFL, 0);
        if (fcntl(hSocket, F_SETFL, fFlags | O_NONBLOCK) == SOCKET_ERROR) {
#endif
            CloseSocket(hSocket);
            return false;
        }
    } else {
#ifdef WIN32
        u_long nZero = 0;
        if (ioctlsocket(hSocket, FIONBIO, &nZero) == SOCKET_ERROR) {
#else
        int fFlags = fcntl(hSocket, F_GETFL, 0);
        if (fcntl(hSocket, F_SETFL, fFlags & ~O_NONBLOCK) == SOCKET_ERROR) {
#endif
            CloseSocket(hSocket);
            return false;
        }
    }

    return true;
}

void InterruptSocks5(bool interrupt) {
    interruptSocks5Recv = interrupt;
}
