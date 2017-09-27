// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2011 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#ifndef __cplusplus
#error This header can only be compiled as C++.
#endif

#ifndef BITCOIN_SEEDER_PROTOCOL_H
#define BITCOIN_SEEDER_PROTOCOL_H

#include "netbase.h"
#include "serialize.h"
#include "uint256.h"

#include <cstdint>
#include <string>

extern bool fTestNet;
static inline unsigned short GetDefaultPort(const bool testnet = fTestNet) {
    return testnet ? 18333 : 8333;
}

//
// Message header
//  (4) message start
//  (12) command
//  (4) size
//  (4) checksum

extern uint8_t pchMessageStart[4];

class CMessageHeader {
public:
    CMessageHeader();
    CMessageHeader(const char *pszCommand, unsigned int nMessageSizeIn);

    std::string GetCommand() const;
    bool IsValid() const;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(FLATDATA(pchMessageStart));
        READWRITE(FLATDATA(pchCommand));
        READWRITE(nMessageSize);
        if (s.GetVersion() >= 209) {
            READWRITE(nChecksum);
        }
    }

    // TODO: make private (improves encapsulation)
public:
    enum { COMMAND_SIZE = 12 };
    char pchMessageStart[sizeof(::pchMessageStart)];
    char pchCommand[COMMAND_SIZE];
    unsigned int nMessageSize;
    unsigned int nChecksum;
};

enum ServiceFlags : uint64_t {
    NODE_NETWORK = (1 << 0),
    NODE_BLOOM = (1 << 2),
    NODE_XTHIN = (1 << 4),
    NODE_BITCOIN_CASH = (1 << 5),
};

class CAddress : public CService {
public:
    CAddress();
    CAddress(CService ipIn,
             uint64_t nServicesIn = NODE_NETWORK | NODE_BITCOIN_CASH);

    void Init();

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        CAddress *pthis = const_cast<CAddress *>(this);
        CService *pip = (CService *)pthis;
        if (ser_action.ForRead()) {
            pthis->Init();
        }
        if (s.GetType() & SER_DISK) {
            READWRITE(nVersion);
        }
        if ((s.GetType() & SER_DISK) ||
            (nVersion >= 31402 && !(s.GetType() & SER_GETHASH))) {
            READWRITE(nTime);
        }
        READWRITE(nServices);
        READWRITE(*pip);
    }

    void print() const;

    // TODO: make private (improves encapsulation)
public:
    uint64_t nServices;

    // disk and network only
    unsigned int nTime;
};

class CInv {
public:
    CInv();
    CInv(uint32_t typeIn, const uint256 &hashIn);
    CInv(const std::string &strType, const uint256 &hashIn);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(type);
        READWRITE(hash);
    }

    friend bool operator<(const CInv &a, const CInv &b);

    bool IsKnownType() const;
    const char *GetCommand() const;
    std::string ToString() const;
    void print() const;

    // TODO: make private (improves encapsulation)
public:
    uint32_t type;
    uint256 hash;
};

#endif // __INCLUDED_PROTOCOL_H__
