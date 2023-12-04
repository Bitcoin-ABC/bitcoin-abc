// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <netbase.h>

#include <compat.h>
#include <sync.h>
#include <tinyformat.h>
#include <util/sock.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/time.h>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <functional>
#include <memory>

#ifndef WIN32
#include <fcntl.h>
#else
#include <codecvt>
#endif

#ifdef USE_POLL
#include <poll.h>
#endif

// Settings
static GlobalMutex g_proxyinfo_mutex;
static proxyType proxyInfo[NET_MAX] GUARDED_BY(g_proxyinfo_mutex);
static proxyType nameProxy GUARDED_BY(g_proxyinfo_mutex);
int nConnectTimeout = DEFAULT_CONNECT_TIMEOUT;
bool fNameLookup = DEFAULT_NAME_LOOKUP;

// Need ample time for negotiation for very slow proxies such as Tor
// (milliseconds)
static const int SOCKS5_RECV_TIMEOUT = 20 * 1000;
static std::atomic<bool> interruptSocks5Recv(false);

std::vector<CNetAddr> WrappedGetAddrInfo(const std::string &name,
                                         bool allow_lookup) {
    addrinfo ai_hint{};
    // We want a TCP port, which is a streaming socket type
    ai_hint.ai_socktype = SOCK_STREAM;
    ai_hint.ai_protocol = IPPROTO_TCP;
    // We don't care which address family (IPv4 or IPv6) is returned
    ai_hint.ai_family = AF_UNSPEC;
    // If we allow lookups of hostnames, use the AI_ADDRCONFIG flag to only
    // return addresses whose family we have an address configured for.
    //
    // If we don't allow lookups, then use the AI_NUMERICHOST flag for
    // getaddrinfo to only decode numerical network addresses and suppress
    // hostname lookups.
    ai_hint.ai_flags = allow_lookup ? AI_ADDRCONFIG : AI_NUMERICHOST;

    addrinfo *ai_res{nullptr};
    const int n_err{getaddrinfo(name.c_str(), nullptr, &ai_hint, &ai_res)};
    if (n_err != 0) {
        return {};
    }

    // Traverse the linked list starting with ai_trav.
    addrinfo *ai_trav{ai_res};
    std::vector<CNetAddr> resolved_addresses;
    while (ai_trav != nullptr) {
        if (ai_trav->ai_family == AF_INET) {
            assert(ai_trav->ai_addrlen >= sizeof(sockaddr_in));
            resolved_addresses.emplace_back(
                reinterpret_cast<sockaddr_in *>(ai_trav->ai_addr)->sin_addr);
        }
        if (ai_trav->ai_family == AF_INET6) {
            assert(ai_trav->ai_addrlen >= sizeof(sockaddr_in6));
            const sockaddr_in6 *s6{
                reinterpret_cast<sockaddr_in6 *>(ai_trav->ai_addr)};
            resolved_addresses.emplace_back(s6->sin6_addr, s6->sin6_scope_id);
        }
        ai_trav = ai_trav->ai_next;
    }
    freeaddrinfo(ai_res);

    return resolved_addresses;
}

DNSLookupFn g_dns_lookup{WrappedGetAddrInfo};

enum Network ParseNetwork(const std::string &net_in) {
    std::string net = ToLower(net_in);
    if (net == "ipv4") {
        return NET_IPV4;
    }
    if (net == "ipv6") {
        return NET_IPV6;
    }
    if (net == "onion") {
        return NET_ONION;
    }
    if (net == "tor") {
        LogPrintf("Warning: net name 'tor' is deprecated and will be removed "
                  "in the future. You should use 'onion' instead.\n");
        return NET_ONION;
    }
    if (net == "i2p") {
        return NET_I2P;
    }
    return NET_UNROUTABLE;
}

std::string GetNetworkName(enum Network net) {
    switch (net) {
        case NET_UNROUTABLE:
            return "not_publicly_routable";
        case NET_IPV4:
            return "ipv4";
        case NET_IPV6:
            return "ipv6";
        case NET_ONION:
            return "onion";
        case NET_I2P:
            return "i2p";
        case NET_CJDNS:
            return "cjdns";
        case NET_INTERNAL:
            return "internal";
        case NET_MAX:
            assert(false);
    } // no default case, so the compiler can warn about missing cases

    assert(false);
}

std::vector<std::string> GetNetworkNames(bool append_unroutable) {
    std::vector<std::string> names;
    for (int n = 0; n < NET_MAX; ++n) {
        const enum Network network { static_cast<Network>(n) };
        if (network == NET_UNROUTABLE || network == NET_CJDNS ||
            network == NET_INTERNAL) {
            continue;
        }
        names.emplace_back(GetNetworkName(network));
    }
    if (append_unroutable) {
        names.emplace_back(GetNetworkName(NET_UNROUTABLE));
    }
    return names;
}

static bool LookupIntern(const std::string &name, std::vector<CNetAddr> &vIP,
                         unsigned int nMaxSolutions, bool fAllowLookup,
                         DNSLookupFn dns_lookup_function) {
    vIP.clear();

    if (!ValidAsCString(name)) {
        return false;
    }

    {
        CNetAddr addr;
        // From our perspective, onion addresses are not hostnames but rather
        // direct encodings of CNetAddr much like IPv4 dotted-decimal notation
        // or IPv6 colon-separated hextet notation. Since we can't use
        // getaddrinfo to decode them and it wouldn't make sense to resolve
        // them, we return a network address representing it instead. See
        // CNetAddr::SetSpecial(const std::string&) for more details.
        if (addr.SetSpecial(name)) {
            vIP.push_back(addr);
            return true;
        }
    }

    for (const CNetAddr &resolved : dns_lookup_function(name, fAllowLookup)) {
        if (nMaxSolutions > 0 && vIP.size() >= nMaxSolutions) {
            break;
        }

        // Never allow resolving to an internal address. Consider any such
        // result invalid.
        if (!resolved.IsInternal()) {
            vIP.push_back(resolved);
        }
    }

    return (vIP.size() > 0);
}

bool LookupHost(const std::string &name, std::vector<CNetAddr> &vIP,
                unsigned int nMaxSolutions, bool fAllowLookup,
                DNSLookupFn dns_lookup_function) {
    if (!ValidAsCString(name)) {
        return false;
    }
    std::string strHost = name;
    if (strHost.empty()) {
        return false;
    }
    if (strHost.front() == '[' && strHost.back() == ']') {
        strHost = strHost.substr(1, strHost.size() - 2);
    }

    return LookupIntern(strHost, vIP, nMaxSolutions, fAllowLookup,
                        dns_lookup_function);
}

bool LookupHost(const std::string &name, CNetAddr &addr, bool fAllowLookup,
                DNSLookupFn dns_lookup_function) {
    if (!ValidAsCString(name)) {
        return false;
    }
    std::vector<CNetAddr> vIP;
    LookupHost(name, vIP, 1, fAllowLookup, dns_lookup_function);
    if (vIP.empty()) {
        return false;
    }
    addr = vIP.front();
    return true;
}

bool Lookup(const std::string &name, std::vector<CService> &vAddr,
            uint16_t portDefault, bool fAllowLookup, unsigned int nMaxSolutions,
            DNSLookupFn dns_lookup_function) {
    if (name.empty() || !ValidAsCString(name)) {
        return false;
    }
    uint16_t port{portDefault};
    std::string hostname;
    SplitHostPort(name, port, hostname);

    std::vector<CNetAddr> vIP;
    bool fRet = LookupIntern(hostname, vIP, nMaxSolutions, fAllowLookup,
                             dns_lookup_function);
    if (!fRet) {
        return false;
    }
    vAddr.resize(vIP.size());
    for (unsigned int i = 0; i < vIP.size(); i++) {
        vAddr[i] = CService(vIP[i], port);
    }
    return true;
}

bool Lookup(const std::string &name, CService &addr, uint16_t portDefault,
            bool fAllowLookup, DNSLookupFn dns_lookup_function) {
    if (!ValidAsCString(name)) {
        return false;
    }
    std::vector<CService> vService;
    bool fRet = Lookup(name, vService, portDefault, fAllowLookup, 1,
                       dns_lookup_function);
    if (!fRet) {
        return false;
    }
    addr = vService[0];
    return true;
}

CService LookupNumeric(const std::string &name, uint16_t portDefault,
                       DNSLookupFn dns_lookup_function) {
    if (!ValidAsCString(name)) {
        return {};
    }
    CService addr;
    // "1.2:345" will fail to resolve the ip, but will still set the port.
    // If the ip fails to resolve, re-init the result.
    if (!Lookup(name, addr, portDefault, false, dns_lookup_function)) {
        addr = CService();
    }
    return addr;
}

/** SOCKS version */
enum SOCKSVersion : uint8_t { SOCKS4 = 0x04, SOCKS5 = 0x05 };

/** Values defined for METHOD in RFC1928 */
enum SOCKS5Method : uint8_t {
    NOAUTH = 0x00,        //!< No authentication required
    GSSAPI = 0x01,        //!< GSSAPI
    USER_PASS = 0x02,     //!< Username/password
    NO_ACCEPTABLE = 0xff, //!< No acceptable methods
};

/** Values defined for CMD in RFC1928 */
enum SOCKS5Command : uint8_t {
    CONNECT = 0x01,
    BIND = 0x02,
    UDP_ASSOCIATE = 0x03
};

/** Values defined for REP in RFC1928 */
enum SOCKS5Reply : uint8_t {
    SUCCEEDED = 0x00,        //!< Succeeded
    GENFAILURE = 0x01,       //!< General failure
    NOTALLOWED = 0x02,       //!< Connection not allowed by ruleset
    NETUNREACHABLE = 0x03,   //!< Network unreachable
    HOSTUNREACHABLE = 0x04,  //!< Network unreachable
    CONNREFUSED = 0x05,      //!< Connection refused
    TTLEXPIRED = 0x06,       //!< TTL expired
    CMDUNSUPPORTED = 0x07,   //!< Command not supported
    ATYPEUNSUPPORTED = 0x08, //!< Address type not supported
};

/** Values defined for ATYPE in RFC1928 */
enum SOCKS5Atyp : uint8_t {
    IPV4 = 0x01,
    DOMAINNAME = 0x03,
    IPV6 = 0x04,
};

/** Status codes that can be returned by InterruptibleRecv */
enum class IntrRecvError {
    OK,
    Timeout,
    Disconnected,
    NetworkError,
    Interrupted
};

/**
 * Try to read a specified number of bytes from a socket. Please read the "see
 * also" section for more detail.
 *
 * @param data The buffer where the read bytes should be stored.
 * @param len The number of bytes to read into the specified buffer.
 * @param timeout The total timeout in milliseconds for this read.
 * @param sock The socket (has to be in non-blocking mode) from which to read
 * bytes.
 *
 * @returns An IntrRecvError indicating the resulting status of this read.
 *          IntrRecvError::OK only if all of the specified number of bytes were
 *          read.
 *
 * @see This function can be interrupted by calling InterruptSocks5(bool).
 *      Sockets can be made non-blocking with SetSocketNonBlocking(const
 *      SOCKET&, bool).
 */
static IntrRecvError InterruptibleRecv(uint8_t *data, size_t len, int timeout,
                                       const Sock &sock) {
    int64_t curTime = GetTimeMillis();
    int64_t endTime = curTime + timeout;
    while (len > 0 && curTime < endTime) {
        // Optimistically try the recv first
        ssize_t ret = sock.Recv(data, len, 0);
        if (ret > 0) {
            len -= ret;
            data += ret;
        } else if (ret == 0) {
            // Unexpected disconnection
            return IntrRecvError::Disconnected;
        } else {
            // Other error or blocking
            int nErr = WSAGetLastError();
            if (nErr == WSAEINPROGRESS || nErr == WSAEWOULDBLOCK ||
                nErr == WSAEINVAL) {
                // Only wait at most MAX_WAIT_FOR_IO at a time, unless
                // we're approaching the end of the specified total timeout
                const auto remaining =
                    std::chrono::milliseconds{endTime - curTime};
                const auto timeout_ = std::min(
                    remaining, std::chrono::milliseconds{MAX_WAIT_FOR_IO});
                if (!sock.Wait(timeout_, Sock::RECV)) {
                    return IntrRecvError::NetworkError;
                }
            } else {
                return IntrRecvError::NetworkError;
            }
        }
        if (interruptSocks5Recv) {
            return IntrRecvError::Interrupted;
        }
        curTime = GetTimeMillis();
    }
    return len == 0 ? IntrRecvError::OK : IntrRecvError::Timeout;
}

/** Credentials for proxy authentication */
struct ProxyCredentials {
    std::string username;
    std::string password;
};

/** Convert SOCKS5 reply to an error message */
static std::string Socks5ErrorString(uint8_t err) {
    switch (err) {
        case SOCKS5Reply::GENFAILURE:
            return "general failure";
        case SOCKS5Reply::NOTALLOWED:
            return "connection not allowed";
        case SOCKS5Reply::NETUNREACHABLE:
            return "network unreachable";
        case SOCKS5Reply::HOSTUNREACHABLE:
            return "host unreachable";
        case SOCKS5Reply::CONNREFUSED:
            return "connection refused";
        case SOCKS5Reply::TTLEXPIRED:
            return "TTL expired";
        case SOCKS5Reply::CMDUNSUPPORTED:
            return "protocol error";
        case SOCKS5Reply::ATYPEUNSUPPORTED:
            return "address type not supported";
        default:
            return "unknown";
    }
}

/**
 * Connect to a specified destination service through an already connected
 * SOCKS5 proxy.
 *
 * @param strDest The destination fully-qualified domain name.
 * @param port The destination port.
 * @param auth The credentials with which to authenticate with the specified
 *             SOCKS5 proxy.
 * @param sock The SOCKS5 proxy socket.
 *
 * @returns Whether or not the operation succeeded.
 *
 * @note The specified SOCKS5 proxy socket must already be connected to the
 *       SOCKS5 proxy.
 *
 * @see <a href="https://www.ietf.org/rfc/rfc1928.txt">RFC1928: SOCKS Protocol
 *      Version 5</a>
 */
static bool Socks5(const std::string &strDest, uint16_t port,
                   const ProxyCredentials *auth, const Sock &sock) {
    IntrRecvError recvr;
    LogPrint(BCLog::NET, "SOCKS5 connecting %s\n", strDest);
    if (strDest.size() > 255) {
        return error("Hostname too long");
    }
    // Construct the version identifier/method selection message
    std::vector<uint8_t> vSocks5Init;
    // We want the SOCK5 protocol
    vSocks5Init.push_back(SOCKSVersion::SOCKS5);
    if (auth) {
        // 2 method identifiers follow...
        vSocks5Init.push_back(0x02);
        vSocks5Init.push_back(SOCKS5Method::NOAUTH);
        vSocks5Init.push_back(SOCKS5Method::USER_PASS);
    } else {
        // 1 method identifier follows...
        vSocks5Init.push_back(0x01);
        vSocks5Init.push_back(SOCKS5Method::NOAUTH);
    }
    ssize_t ret =
        sock.Send(vSocks5Init.data(), vSocks5Init.size(), MSG_NOSIGNAL);
    if (ret != (ssize_t)vSocks5Init.size()) {
        return error("Error sending to proxy");
    }
    uint8_t pchRet1[2];
    if ((recvr = InterruptibleRecv(pchRet1, 2, SOCKS5_RECV_TIMEOUT, sock)) !=
        IntrRecvError::OK) {
        LogPrintf("Socks5() connect to %s:%d failed: InterruptibleRecv() "
                  "timeout or other failure\n",
                  strDest, port);
        return false;
    }
    if (pchRet1[0] != SOCKSVersion::SOCKS5) {
        return error("Proxy failed to initialize");
    }
    if (pchRet1[1] == SOCKS5Method::USER_PASS && auth) {
        // Perform username/password authentication (as described in RFC1929)
        std::vector<uint8_t> vAuth;
        // Current (and only) version of user/pass subnegotiation
        vAuth.push_back(0x01);
        if (auth->username.size() > 255 || auth->password.size() > 255) {
            return error("Proxy username or password too long");
        }
        vAuth.push_back(auth->username.size());
        vAuth.insert(vAuth.end(), auth->username.begin(), auth->username.end());
        vAuth.push_back(auth->password.size());
        vAuth.insert(vAuth.end(), auth->password.begin(), auth->password.end());
        ret = sock.Send(vAuth.data(), vAuth.size(), MSG_NOSIGNAL);
        if (ret != (ssize_t)vAuth.size()) {
            return error("Error sending authentication to proxy");
        }
        LogPrint(BCLog::PROXY, "SOCKS5 sending proxy authentication %s:%s\n",
                 auth->username, auth->password);
        uint8_t pchRetA[2];
        if ((recvr = InterruptibleRecv(pchRetA, 2, SOCKS5_RECV_TIMEOUT,
                                       sock)) != IntrRecvError::OK) {
            return error("Error reading proxy authentication response");
        }
        if (pchRetA[0] != 0x01 || pchRetA[1] != 0x00) {
            return error("Proxy authentication unsuccessful");
        }
    } else if (pchRet1[1] == SOCKS5Method::NOAUTH) {
        // Perform no authentication
    } else {
        return error("Proxy requested wrong authentication method %02x",
                     pchRet1[1]);
    }
    std::vector<uint8_t> vSocks5;
    // VER protocol version
    vSocks5.push_back(SOCKSVersion::SOCKS5);
    // CMD CONNECT
    vSocks5.push_back(SOCKS5Command::CONNECT);
    // RSV Reserved must be 0
    vSocks5.push_back(0x00);
    // ATYP DOMAINNAME
    vSocks5.push_back(SOCKS5Atyp::DOMAINNAME);
    // Length<=255 is checked at beginning of function
    vSocks5.push_back(strDest.size());
    vSocks5.insert(vSocks5.end(), strDest.begin(), strDest.end());
    vSocks5.push_back((port >> 8) & 0xFF);
    vSocks5.push_back((port >> 0) & 0xFF);
    ret = sock.Send(vSocks5.data(), vSocks5.size(), MSG_NOSIGNAL);
    if (ret != (ssize_t)vSocks5.size()) {
        return error("Error sending to proxy");
    }
    uint8_t pchRet2[4];
    if ((recvr = InterruptibleRecv(pchRet2, 4, SOCKS5_RECV_TIMEOUT, sock)) !=
        IntrRecvError::OK) {
        if (recvr == IntrRecvError::Timeout) {
            /**
             * If a timeout happens here, this effectively means we timed out
             * while connecting to the remote node. This is very common for Tor,
             * so do not print an error message.
             */
            return false;
        } else {
            return error("Error while reading proxy response");
        }
    }
    if (pchRet2[0] != SOCKSVersion::SOCKS5) {
        return error("Proxy failed to accept request");
    }
    if (pchRet2[1] != SOCKS5Reply::SUCCEEDED) {
        // Failures to connect to a peer that are not proxy errors
        LogPrintf("Socks5() connect to %s:%d failed: %s\n", strDest, port,
                  Socks5ErrorString(pchRet2[1]));
        return false;
    }
    // Reserved field must be 0
    if (pchRet2[2] != 0x00) {
        return error("Error: malformed proxy response");
    }
    uint8_t pchRet3[256];
    switch (pchRet2[3]) {
        case SOCKS5Atyp::IPV4:
            recvr = InterruptibleRecv(pchRet3, 4, SOCKS5_RECV_TIMEOUT, sock);
            break;
        case SOCKS5Atyp::IPV6:
            recvr = InterruptibleRecv(pchRet3, 16, SOCKS5_RECV_TIMEOUT, sock);
            break;
        case SOCKS5Atyp::DOMAINNAME: {
            recvr = InterruptibleRecv(pchRet3, 1, SOCKS5_RECV_TIMEOUT, sock);
            if (recvr != IntrRecvError::OK) {
                return error("Error reading from proxy");
            }
            int nRecv = pchRet3[0];
            recvr =
                InterruptibleRecv(pchRet3, nRecv, SOCKS5_RECV_TIMEOUT, sock);
            break;
        }
        default:
            return error("Error: malformed proxy response");
    }
    if (recvr != IntrRecvError::OK) {
        return error("Error reading from proxy");
    }
    if ((recvr = InterruptibleRecv(pchRet3, 2, SOCKS5_RECV_TIMEOUT, sock)) !=
        IntrRecvError::OK) {
        return error("Error reading from proxy");
    }
    LogPrint(BCLog::NET, "SOCKS5 connected %s\n", strDest);
    return true;
}

std::unique_ptr<Sock> CreateSockTCP(const CService &address_family) {
    // Create a sockaddr from the specified service.
    struct sockaddr_storage sockaddr;
    socklen_t len = sizeof(sockaddr);
    if (!address_family.GetSockAddr((struct sockaddr *)&sockaddr, &len)) {
        LogPrintf("Cannot create socket for %s: unsupported network\n",
                  address_family.ToString());
        return nullptr;
    }

    // Create a TCP socket in the address family of the specified service.
    SOCKET hSocket = socket(((struct sockaddr *)&sockaddr)->sa_family,
                            SOCK_STREAM, IPPROTO_TCP);
    if (hSocket == INVALID_SOCKET) {
        return nullptr;
    }

    // Ensure that waiting for I/O on this socket won't result in undefined
    // behavior.
    if (!IsSelectableSocket(hSocket)) {
        CloseSocket(hSocket);
        LogPrintf("Cannot create connection: non-selectable socket created (fd "
                  ">= FD_SETSIZE ?)\n");
        return nullptr;
    }

#ifdef SO_NOSIGPIPE
    int set = 1;
    // Set the no-sigpipe option on the socket for BSD systems, other UNIXes
    // should use the MSG_NOSIGNAL flag for every send.
    setsockopt(hSocket, SOL_SOCKET, SO_NOSIGPIPE, (sockopt_arg_type)&set,
               sizeof(int));
#endif

    // Set the no-delay option (disable Nagle's algorithm) on the TCP socket.
    SetSocketNoDelay(hSocket);

    // Set the non-blocking option on the socket.
    if (!SetSocketNonBlocking(hSocket, true)) {
        CloseSocket(hSocket);
        LogPrintf("CreateSocket: Setting socket to non-blocking "
                  "failed, error %s\n",
                  NetworkErrorString(WSAGetLastError()));
        return nullptr;
    }
    return std::make_unique<Sock>(hSocket);
}

std::function<std::unique_ptr<Sock>(const CService &)> CreateSock =
    CreateSockTCP;

template <typename... Args>
static void LogConnectFailure(bool manual_connection, const char *fmt,
                              const Args &...args) {
    std::string error_message = tfm::format(fmt, args...);
    if (manual_connection) {
        LogPrintf("%s\n", error_message);
    } else {
        LogPrint(BCLog::NET, "%s\n", error_message);
    }
}

bool ConnectSocketDirectly(const CService &addrConnect, const Sock &sock,
                           int nTimeout, bool manual_connection) {
    // Create a sockaddr from the specified service.
    struct sockaddr_storage sockaddr;
    socklen_t len = sizeof(sockaddr);
    if (sock.Get() == INVALID_SOCKET) {
        LogPrintf("Cannot connect to %s: invalid socket\n",
                  addrConnect.ToString());
        return false;
    }
    if (!addrConnect.GetSockAddr((struct sockaddr *)&sockaddr, &len)) {
        LogPrintf("Cannot connect to %s: unsupported network\n",
                  addrConnect.ToString());
        return false;
    }

    // Connect to the addrConnect service on the hSocket socket.
    if (sock.Connect(reinterpret_cast<struct sockaddr *>(&sockaddr), len) ==
        SOCKET_ERROR) {
        int nErr = WSAGetLastError();
        // WSAEINVAL is here because some legacy version of winsock uses it
        if (nErr == WSAEINPROGRESS || nErr == WSAEWOULDBLOCK ||
            nErr == WSAEINVAL) {
            // Connection didn't actually fail, but is being established
            // asynchronously. Thus, use async I/O api (select/poll)
            // synchronously to check for successful connection with a timeout.
            const Sock::Event requested = Sock::RECV | Sock::SEND;
            Sock::Event occurred;
            if (!sock.Wait(std::chrono::milliseconds{nTimeout}, requested,
                           &occurred)) {
                LogPrintf("wait for connect to %s failed: %s\n",
                          addrConnect.ToString(),
                          NetworkErrorString(WSAGetLastError()));
                return false;
            } else if (occurred == 0) {
                LogPrint(BCLog::NET, "connection attempt to %s timed out\n",
                         addrConnect.ToString());
                return false;
            }

            // Even if the wait was successful, the connect might not
            // have been successful. The reason for this failure is hidden away
            // in the SO_ERROR for the socket in modern systems. We read it into
            // sockerr here.
            int sockerr;
            socklen_t sockerr_len = sizeof(sockerr);
            if (sock.GetSockOpt(SOL_SOCKET, SO_ERROR,
                                (sockopt_arg_type)&sockerr,
                                &sockerr_len) == SOCKET_ERROR) {
                LogPrintf("getsockopt() for %s failed: %s\n",
                          addrConnect.ToString(),
                          NetworkErrorString(WSAGetLastError()));
                return false;
            }
            if (sockerr != 0) {
                LogConnectFailure(
                    manual_connection, "connect() to %s failed after wait: %s",
                    addrConnect.ToString(), NetworkErrorString(sockerr));
                return false;
            }
        }
#ifdef WIN32
        else if (WSAGetLastError() != WSAEISCONN)
#else
        else
#endif
        {
            LogConnectFailure(manual_connection, "connect() to %s failed: %s",
                              addrConnect.ToString(),
                              NetworkErrorString(WSAGetLastError()));
            return false;
        }
    }
    return true;
}

bool SetProxy(enum Network net, const proxyType &addrProxy) {
    assert(net >= 0 && net < NET_MAX);
    if (!addrProxy.IsValid()) {
        return false;
    }
    LOCK(g_proxyinfo_mutex);
    proxyInfo[net] = addrProxy;
    return true;
}

bool GetProxy(enum Network net, proxyType &proxyInfoOut) {
    assert(net >= 0 && net < NET_MAX);
    LOCK(g_proxyinfo_mutex);
    if (!proxyInfo[net].IsValid()) {
        return false;
    }
    proxyInfoOut = proxyInfo[net];
    return true;
}

bool SetNameProxy(const proxyType &addrProxy) {
    if (!addrProxy.IsValid()) {
        return false;
    }
    LOCK(g_proxyinfo_mutex);
    nameProxy = addrProxy;
    return true;
}

bool GetNameProxy(proxyType &nameProxyOut) {
    LOCK(g_proxyinfo_mutex);
    if (!nameProxy.IsValid()) {
        return false;
    }
    nameProxyOut = nameProxy;
    return true;
}

bool HaveNameProxy() {
    LOCK(g_proxyinfo_mutex);
    return nameProxy.IsValid();
}

bool IsProxy(const CNetAddr &addr) {
    LOCK(g_proxyinfo_mutex);
    for (int i = 0; i < NET_MAX; i++) {
        if (addr == static_cast<CNetAddr>(proxyInfo[i].proxy)) {
            return true;
        }
    }
    return false;
}

bool ConnectThroughProxy(const proxyType &proxy, const std::string &strDest,
                         uint16_t port, const Sock &sock, int nTimeout,
                         bool &outProxyConnectionFailed) {
    // first connect to proxy server
    if (!ConnectSocketDirectly(proxy.proxy, sock, nTimeout, true)) {
        outProxyConnectionFailed = true;
        return false;
    }
    // do socks negotiation
    if (proxy.randomize_credentials) {
        ProxyCredentials random_auth;
        static std::atomic_int counter(0);
        random_auth.username = random_auth.password =
            strprintf("%i", counter++);
        if (!Socks5(strDest, port, &random_auth, sock)) {
            return false;
        }
    } else if (!Socks5(strDest, port, 0, sock)) {
        return false;
    }
    return true;
}

bool LookupSubNet(const std::string &strSubnet, CSubNet &ret,
                  DNSLookupFn dns_lookup_function) {
    if (!ValidAsCString(strSubnet)) {
        return false;
    }
    size_t slash = strSubnet.find_last_of('/');
    std::vector<CNetAddr> vIP;

    std::string strAddress = strSubnet.substr(0, slash);
    // TODO: Use LookupHost(const std::string&, CNetAddr&, bool) instead to just
    if (LookupHost(strAddress, vIP, 1, false, dns_lookup_function)) {
        CNetAddr network = vIP[0];
        if (slash != strSubnet.npos) {
            std::string strNetmask = strSubnet.substr(slash + 1);
            uint8_t n;
            if (ParseUInt8(strNetmask, &n)) {
                // If valid number, assume CIDR variable-length subnet masking
                ret = CSubNet(network, n);
                return ret.IsValid();
            } else {
                // If not a valid number, try full netmask syntax
                // Never allow lookup for netmask
                if (LookupHost(strNetmask, vIP, 1, false,
                               dns_lookup_function)) {
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

bool SetSocketNonBlocking(const SOCKET &hSocket, bool fNonBlocking) {
    if (fNonBlocking) {
#ifdef WIN32
        u_long nOne = 1;
        if (ioctlsocket(hSocket, FIONBIO, &nOne) == SOCKET_ERROR) {
#else
        int fFlags = fcntl(hSocket, F_GETFL, 0);
        if (fcntl(hSocket, F_SETFL, fFlags | O_NONBLOCK) == SOCKET_ERROR) {
#endif
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
            return false;
        }
    }

    return true;
}

bool SetSocketNoDelay(const SOCKET &hSocket) {
    int set = 1;
    int rc = setsockopt(hSocket, IPPROTO_TCP, TCP_NODELAY,
                        (sockopt_arg_type)&set, sizeof(int));
    return rc == 0;
}

void InterruptSocks5(bool interrupt) {
    interruptSocks5Recv = interrupt;
}

bool IsBadPort(uint16_t port) {
    // Don't forget to update doc/p2p-bad-ports.md if you change this list.

    switch (port) {
        case 1:     // tcpmux
        case 7:     // echo
        case 9:     // discard
        case 11:    // systat
        case 13:    // daytime
        case 15:    // netstat
        case 17:    // qotd
        case 19:    // chargen
        case 20:    // ftp data
        case 21:    // ftp access
        case 22:    // ssh
        case 23:    // telnet
        case 25:    // smtp
        case 37:    // time
        case 42:    // name
        case 43:    // nicname
        case 53:    // domain
        case 69:    // tftp
        case 77:    // priv-rjs
        case 79:    // finger
        case 87:    // ttylink
        case 95:    // supdup
        case 101:   // hostname
        case 102:   // iso-tsap
        case 103:   // gppitnp
        case 104:   // acr-nema
        case 109:   // pop2
        case 110:   // pop3
        case 111:   // sunrpc
        case 113:   // auth
        case 115:   // sftp
        case 117:   // uucp-path
        case 119:   // nntp
        case 123:   // NTP
        case 135:   // loc-srv /epmap
        case 137:   // netbios
        case 139:   // netbios
        case 143:   // imap2
        case 161:   // snmp
        case 179:   // BGP
        case 389:   // ldap
        case 427:   // SLP (Also used by Apple Filing Protocol)
        case 465:   // smtp+ssl
        case 512:   // print / exec
        case 513:   // login
        case 514:   // shell
        case 515:   // printer
        case 526:   // tempo
        case 530:   // courier
        case 531:   // chat
        case 532:   // netnews
        case 540:   // uucp
        case 548:   // AFP (Apple Filing Protocol)
        case 554:   // rtsp
        case 556:   // remotefs
        case 563:   // nntp+ssl
        case 587:   // smtp (rfc6409)
        case 601:   // syslog-conn (rfc3195)
        case 636:   // ldap+ssl
        case 989:   // ftps-data
        case 990:   // ftps
        case 993:   // ldap+ssl
        case 995:   // pop3+ssl
        case 1719:  // h323gatestat
        case 1720:  // h323hostcall
        case 1723:  // pptp
        case 2049:  // nfs
        case 3659:  // apple-sasl / PasswordServer
        case 4045:  // lockd
        case 5060:  // sip
        case 5061:  // sips
        case 6000:  // X11
        case 6566:  // sane-port
        case 6665:  // Alternate IRC
        case 6666:  // Alternate IRC
        case 6667:  // Standard IRC
        case 6668:  // Alternate IRC
        case 6669:  // Alternate IRC
        case 6697:  // IRC + TLS
        case 10080: // Amanda
            return true;
    }
    return false;
}
