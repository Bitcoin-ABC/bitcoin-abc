// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NETADDRESS_H
#define BITCOIN_NETADDRESS_H

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <compat.h>
#include <serialize.h>

#include <cstdint>
#include <string>
#include <vector>

enum Network {
    NET_UNROUTABLE = 0,
    NET_IPV4,
    NET_IPV6,
    NET_ONION,
    NET_INTERNAL,

    NET_MAX,
};

/** IP address (IPv6, or IPv4 using mapped IPv6 range (::FFFF:0:0/96)) */
class CNetAddr {
protected:
    // in network byte order
    uint8_t ip[16];
    // for scoped/link-local ipv6 addresses
    uint32_t scopeId;

public:
    CNetAddr();
    explicit CNetAddr(const struct in_addr &ipv4Addr);
    void SetIP(const CNetAddr &ip);

private:
    /**
     * Set raw IPv4 or IPv6 address (in network byte order)
     * @note Only NET_IPV4 and NET_IPV6 are allowed for network.
     */
    void SetRaw(Network network, const uint8_t *data);

public:
    /**
     * Transform an arbitrary string into a non-routable ipv6 address.
     * Useful for mapping resolved addresses back to their source.
     */
    bool SetInternal(const std::string &name);

    // for Tor addresses
    bool SetSpecial(const std::string &strName);
    // IPv4 mapped address (::FFFF:0:0/96, 0.0.0.0/0)
    bool IsIPv4() const;
    // IPv6 address (not mapped IPv4, not Tor)
    bool IsIPv6() const;
    // IPv4 private networks (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
    bool IsRFC1918() const;
    // IPv4 inter-network communications (192.18.0.0/15)
    bool IsRFC2544() const;
    // IPv4 ISP-level NAT (100.64.0.0/10)
    bool IsRFC6598() const;
    // IPv4 documentation addresses (192.0.2.0/24, 198.51.100.0/24,
    // 203.0.113.0/24)
    bool IsRFC5737() const;
    // IPv6 documentation address (2001:0DB8::/32)
    bool IsRFC3849() const;
    // IPv4 autoconfig (169.254.0.0/16)
    bool IsRFC3927() const;
    // IPv6 6to4 tunnelling (2002::/16)
    bool IsRFC3964() const;
    // IPv6 unique local (FC00::/7)
    bool IsRFC4193() const;
    // IPv6 Teredo tunnelling (2001::/32)
    bool IsRFC4380() const;
    // IPv6 ORCHID (2001:10::/28)
    bool IsRFC4843() const;
    // IPv6 autoconfig (FE80::/64)
    bool IsRFC4862() const;
    // IPv6 well-known prefix (64:FF9B::/96)
    bool IsRFC6052() const;
    // IPv6 IPv4-translated address (::FFFF:0:0:0/96)
    bool IsRFC6145() const;
    bool IsTor() const;
    bool IsLocal() const;
    bool IsRoutable() const;
    bool IsInternal() const;
    bool IsValid() const;
    enum Network GetNetwork() const;
    std::string ToString() const;
    std::string ToStringIP() const;
    unsigned int GetByte(int n) const;
    uint64_t GetHash() const;
    bool GetInAddr(struct in_addr *pipv4Addr) const;
    std::vector<uint8_t> GetGroup() const;
    int GetReachabilityFrom(const CNetAddr *paddrPartner = nullptr) const;

    explicit CNetAddr(const struct in6_addr &pipv6Addr,
                      const uint32_t scope = 0);
    bool GetIn6Addr(struct in6_addr *pipv6Addr) const;

    friend bool operator==(const CNetAddr &a, const CNetAddr &b);
    friend bool operator!=(const CNetAddr &a, const CNetAddr &b) {
        return !(a == b);
    }
    friend bool operator<(const CNetAddr &a, const CNetAddr &b);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(FLATDATA(ip));
    }

    friend class CSubNet;
};

class CSubNet {
protected:
    /// Network (base) address
    CNetAddr network;
    /// Netmask, in network byte order
    uint8_t netmask[16];
    /// Is this value valid? (only used to signal parse errors)
    bool valid;

public:
    CSubNet();
    CSubNet(const CNetAddr &addr, int32_t mask);
    CSubNet(const CNetAddr &addr, const CNetAddr &mask);

    // constructor for single ip subnet (<ipv4>/32 or <ipv6>/128)
    explicit CSubNet(const CNetAddr &addr);

    bool Match(const CNetAddr &addr) const;

    std::string ToString() const;
    bool IsValid() const;

    friend bool operator==(const CSubNet &a, const CSubNet &b);
    friend bool operator!=(const CSubNet &a, const CSubNet &b) {
        return !(a == b);
    }
    friend bool operator<(const CSubNet &a, const CSubNet &b);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(network);
        READWRITE(FLATDATA(netmask));
        READWRITE(FLATDATA(valid));
    }
};

/** A combination of a network address (CNetAddr) and a (TCP) port */
class CService : public CNetAddr {
protected:
    // host order
    unsigned short port;

public:
    CService();
    CService(const CNetAddr &ip, unsigned short port);
    CService(const struct in_addr &ipv4Addr, unsigned short port);
    explicit CService(const struct sockaddr_in &addr);
    unsigned short GetPort() const;
    bool GetSockAddr(struct sockaddr *paddr, socklen_t *addrlen) const;
    bool SetSockAddr(const struct sockaddr *paddr);
    friend bool operator==(const CService &a, const CService &b);
    friend bool operator!=(const CService &a, const CService &b) {
        return !(a == b);
    }
    friend bool operator<(const CService &a, const CService &b);
    std::vector<uint8_t> GetKey() const;
    std::string ToString() const;
    std::string ToStringPort() const;
    std::string ToStringIPPort() const;

    CService(const struct in6_addr &ipv6Addr, unsigned short port);
    explicit CService(const struct sockaddr_in6 &addr);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(FLATDATA(ip));
        unsigned short portN = htons(port);
        READWRITE(FLATDATA(portN));
        if (ser_action.ForRead()) {
            port = ntohs(portN);
        }
    }
};

#endif // BITCOIN_NETADDRESS_H
