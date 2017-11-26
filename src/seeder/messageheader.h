// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_MESSAGEHEADER_H
#define BITCOIN_SEEDER_MESSAGEHEADER_H

#include "netbase.h"
#include "serialize.h"
#include "uint256.h"

#include <cstdint>
#include <string>

class CSeederMessageHeader {
public:
    typedef uint8_t MessageMagic[4];

    CSeederMessageHeader();
    CSeederMessageHeader(const char *pszCommand, unsigned int nMessageSizeIn);

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

#endif // BITCOIN_SEEDER_MESSAGEHEADER_H
