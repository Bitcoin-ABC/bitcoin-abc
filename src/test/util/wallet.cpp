// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/wallet.h>

#include <config.h>
#include <key_io.h>

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
