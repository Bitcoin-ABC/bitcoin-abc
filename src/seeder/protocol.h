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

class CMessageHeader {
public:
    typedef uint8_t MessageMagic[4];

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
    MessageMagic pchMessageStart;
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

#endif // __INCLUDED_PROTOCOL_H__
