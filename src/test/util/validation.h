// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_VALIDATION_H
#define BITCOIN_TEST_UTIL_VALIDATION_H

#include <validation.h>

class CValidationInterface;

class ValidationInterfaceTest {
public:
    static void BlockConnected(CValidationInterface &obj,
                               const std::shared_ptr<const CBlock> &block,
                               const CBlockIndex *pindex);
};

struct TestChainState : public Chainstate {
    /** Reset the ibd cache to its initial state */
    void ResetIbd();
    /** Toggle IsInitialBlockDownload from true to false */
    void JumpOutOfIbd();
};

#endif // BITCOIN_TEST_UTIL_VALIDATION_H
