#ifndef BITCOIN_SEEDER_BITCOIN_H
#define BITCOIN_SEEDER_BITCOIN_H

#include <protocol.h>

#include <string>
#include <vector>

/**
 * The seeder do not use the Params facility.
 *
 * While this is sorted out, we need a replacement.
 */
extern bool fTestNet;
static inline unsigned short GetDefaultPort(const bool testnet = fTestNet) {
    return testnet ? 18333 : 8333;
}

// The network magic to use.
extern CMessageHeader::MessageMagic netMagic;

bool TestNode(const CService &cip, int &ban, int &client, std::string &clientSV,
              int &blocks, std::vector<CAddress> *vAddr);

#endif
