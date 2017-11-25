// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "address.h"

CSeederAddress::CSeederAddress() : CSeederService() {
    Init();
}

CSeederAddress::CSeederAddress(CSeederService ipIn, uint64_t nServicesIn)
    : CSeederService(ipIn) {
    Init();
    nServices = nServicesIn;
}

void CSeederAddress::Init() {
    nServices = NODE_NETWORK | NODE_BITCOIN_CASH;
    nTime = 100000000;
}

void CSeederAddress::print() const {
    printf("CSeederAddress(%s)\n", ToString().c_str());
}
