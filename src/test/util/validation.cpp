// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/validation.h>

#include <util/check.h>
#include <validation.h>
#include <validationinterface.h>

void ValidationInterfaceTest::BlockConnected(
    ChainstateRole role, CValidationInterface &obj,
    const std::shared_ptr<const CBlock> &block, const CBlockIndex *pindex) {
    obj.BlockConnected(role, block, pindex);
}

void TestChainstateManager::ResetIbd() {
    m_cached_finished_ibd = false;
    assert(IsInitialBlockDownload());
}

void TestChainstateManager::JumpOutOfIbd() {
    Assert(IsInitialBlockDownload());
    m_cached_finished_ibd = true;
    Assert(!IsInitialBlockDownload());
}
