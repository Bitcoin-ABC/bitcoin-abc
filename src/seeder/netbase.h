// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_SEEDER_NETBASE_H
#define BITCOIN_SEEDER_NETBASE_H

#include "compat.h"
#include "netaddress.h"
#include "serialize.h"

#include <string>
#include <vector>

extern int nConnectTimeout;

#ifdef WIN32
// In MSVC, this is defined as a macro, undefine it to prevent a compile and
// link error
#undef SetPort
#endif

extern int nConnectTimeout;
extern bool fNameLookup;

/** A combination of a network address (CNetAddr) and a (TCP) port */
class CSeederService : public CNetAddr {
protected:
    unsigned short port; // host order

public:
    CSeederService();
    CSeederService(const CNetAddr &ip, unsigned short port);
    CSeederService(const struct in_addr &ipv4Addr, unsigned short port);
    CSeederService(const struct sockaddr_in &addr);
    explicit CSeederService(const char *pszIpPort, int portDefault,
                            bool fAllowLookup = false);
    explicit CSeederService(const char *pszIpPort, bool fAllowLookup = false);
    explicit CSeederService(const std::string &strIpPort, int portDefault,
                            bool fAllowLookup = false);
    explicit CSeederService(const std::string &strIpPort,
                            bool fAllowLookup = false);
    void Init();
    void SetPort(unsigned short portIn);
    unsigned short GetPort() const;
    bool GetSockAddr(struct sockaddr *paddr, socklen_t *addrlen) const;
    bool SetSockAddr(const struct sockaddr *paddr);
    friend bool operator==(const CSeederService &a, const CSeederService &b);
    friend bool operator!=(const CSeederService &a, const CSeederService &b);
    friend bool operator<(const CSeederService &a, const CSeederService &b);
    std::vector<uint8_t> GetKey() const;
    std::string ToString() const;
    std::string ToStringPort() const;
    std::string ToStringIPPort() const;
    void print() const;

    CSeederService(const struct in6_addr &ipv6Addr, unsigned short port);
    CSeederService(const struct sockaddr_in6 &addr);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        CSeederService *pthis = const_cast<CSeederService *>(this);
        READWRITE(FLATDATA(ip));
        unsigned short portN = htons(port);
        READWRITE(portN);
        if (ser_action.ForRead()) {
            pthis->port = ntohs(portN);
        }
    }
};

enum Network ParseNetwork(std::string net);
void SplitHostPort(std::string in, int &portOut, std::string &hostOut);
bool SetProxy(enum Network net, CSeederService addrProxy,
              int nSocksVersion = 5);
bool GetProxy(enum Network net, CSeederService &addrProxy);
bool IsProxy(const CNetAddr &addr);
bool SetNameProxy(CSeederService addrProxy, int nSocksVersion = 5);
bool GetNameProxy();
bool LookupHost(const char *pszName, std::vector<CNetAddr> &vIP,
                unsigned int nMaxSolutions = 0, bool fAllowLookup = true);
bool LookupHostNumeric(const char *pszName, std::vector<CNetAddr> &vIP,
                       unsigned int nMaxSolutions = 0);
bool Lookup(const char *pszName, CSeederService &addr, int portDefault = 0,
            bool fAllowLookup = true);
bool Lookup(const char *pszName, std::vector<CSeederService> &vAddr,
            int portDefault = 0, bool fAllowLookup = true,
            unsigned int nMaxSolutions = 0);
bool LookupNumeric(const char *pszName, CSeederService &addr,
                   int portDefault = 0);
bool ConnectSocket(const CSeederService &addr, SOCKET &hSocketRet,
                   int nTimeout = nConnectTimeout);
bool ConnectSocketByName(CSeederService &addr, SOCKET &hSocketRet,
                         const char *pszDest, int portDefault = 0,
                         int nTimeout = nConnectTimeout);

#endif
