// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_ADDRESS_H
#define BITCOIN_SEEDER_ADDRESS_H

#include "netbase.h"
#include "protocol.h"

class CSeederAddress : public CSeederService {
public:
    CSeederAddress();
    CSeederAddress(CSeederService ipIn,
                   uint64_t nServicesIn = NODE_NETWORK | NODE_BITCOIN_CASH);

    void Init();

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        CSeederAddress *pthis = const_cast<CSeederAddress *>(this);
        CSeederService *pip = (CSeederService *)pthis;
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

#endif // BITCOIN_SEEDER_ADDRESS_H
