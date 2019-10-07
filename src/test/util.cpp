// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <key_io.h>
#include <miner.h>
#include <pow/pow.h>
#include <validation.h>

#ifdef ENABLE_WALLET
#include <wallet/wallet.h>
#endif // ENABLE_WALLET

const std::string ADDRESS_BCHREG_UNSPENDABLE =
    "bchreg:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqha9s37tt";

#ifdef ENABLE_WALLET
std::string getnewaddress(const Config &config, CWallet &w) {
    constexpr auto output_type = OutputType::LEGACY;
    CTxDestination dest;
    std::string error;
    if (!w.GetNewDestination(output_type, "", dest, error)) {
        assert(false);
    }

    return EncodeDestination(dest, config);
}

void importaddress(CWallet &wallet, const std::string &address) {
    auto spk_man = wallet.GetLegacyScriptPubKeyMan();
    LOCK(wallet.cs_wallet);
    AssertLockHeld(spk_man->cs_wallet);
    const auto dest = DecodeDestination(address, wallet.chainParams);
    assert(IsValidDestination(dest));
    const auto script = GetScriptForDestination(dest);
    wallet.MarkDirty();
    assert(!spk_man->HaveWatchOnly(script));
    if (!spk_man->AddWatchOnly(script, 0 /* nCreateTime */)) {
        assert(false);
    }
    wallet.SetAddressBook(dest, /* label */ "", "receive");
}
#endif // ENABLE_WALLET

CTxIn generatetoaddress(const Config &config, const std::string &address) {
    const auto dest = DecodeDestination(address, config.GetChainParams());
    assert(IsValidDestination(dest));
    const auto coinbase_script = GetScriptForDestination(dest);

    return MineBlock(config, coinbase_script);
}

CTxIn MineBlock(const Config &config, const CScript &coinbase_scriptPubKey) {
    auto block = PrepareBlock(config, coinbase_scriptPubKey);

    while (!CheckProofOfWork(block->GetHash(), block->nBits,
                             config.GetChainParams().GetConsensus())) {
        ++block->nNonce;
        assert(block->nNonce);
    }

    bool processed{ProcessNewBlock(config, block, true, nullptr)};
    assert(processed);

    return CTxIn{block->vtx[0]->GetId(), 0};
}

std::shared_ptr<CBlock> PrepareBlock(const Config &config,
                                     const CScript &coinbase_scriptPubKey) {
    auto block =
        std::make_shared<CBlock>(BlockAssembler{config, ::g_mempool}
                                     .CreateNewBlock(coinbase_scriptPubKey)
                                     ->block);

    LOCK(cs_main);
    block->nTime = ::ChainActive().Tip()->GetMedianTimePast() + 1;
    block->hashMerkleRoot = BlockMerkleRoot(*block);

    return block;
}
