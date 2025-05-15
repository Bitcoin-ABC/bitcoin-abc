// Copyright (c) 2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <mempool_args.h>

#include <kernel/mempool_options.h>

#include <common/args.h>
#include <consensus/amount.h>
#include <kernel/chainparams.h>
#include <policy/policy.h>
#include <tinyformat.h>
#include <util/error.h>
#include <util/moneystr.h>
#include <util/translation.h>

#include <chrono>
#include <memory>

using kernel::MemPoolOptions;

//! Maximum mempool size on 32-bit systems.
static constexpr int MAX_32BIT_MEMPOOL_MB{500};

std::optional<bilingual_str>
ApplyArgsManOptions(const ArgsManager &argsman, const CChainParams &chainparams,
                    MemPoolOptions &mempool_opts) {
    mempool_opts.check_ratio =
        argsman.GetIntArg("-checkmempool", mempool_opts.check_ratio);

    if (auto mb = argsman.GetIntArg("-maxmempool")) {
        mempool_opts.max_size_bytes = *mb * 1'000'000;
    }
    if (auto mb = argsman.GetIntArg("-maxmempool")) {
        constexpr bool is_32bit{sizeof(void *) == 4};
        if (is_32bit && *mb > MAX_32BIT_MEMPOOL_MB) {
            return Untranslated(strprintf("-maxmempool is set to %i but can't "
                                          "be over %i MB on 32-bit systems",
                                          *mb, MAX_32BIT_MEMPOOL_MB));
        }
        mempool_opts.max_size_bytes = *mb * 1'000'000;
    }

    if (auto hours = argsman.GetIntArg("-mempoolexpiry")) {
        mempool_opts.expiry = std::chrono::hours{*hours};
    }

    if (argsman.IsArgSet("-minrelaytxfee")) {
        Amount n = Amount::zero();
        auto parsed = ParseMoney(argsman.GetArg("-minrelaytxfee", ""), n);
        if (!parsed || n == Amount::zero()) {
            return AmountErrMsg("minrelaytxfee",
                                argsman.GetArg("-minrelaytxfee", ""));
        }
        // High fee check is done afterward in CWallet::Create()
        mempool_opts.min_relay_feerate = CFeeRate(n);
    }

    // Feerate used to define dust.  Shouldn't be changed lightly as old
    // implementations may inadvertently create non-standard transactions.
    if (argsman.IsArgSet("-dustrelayfee")) {
        Amount n = Amount::zero();
        auto parsed = ParseMoney(argsman.GetArg("-dustrelayfee", ""), n);
        if (!parsed || Amount::zero() == n) {
            return AmountErrMsg("dustrelayfee",
                                argsman.GetArg("-dustrelayfee", ""));
        }
        mempool_opts.dust_relay_feerate = CFeeRate(n);
    }

    mempool_opts.permit_bare_multisig =
        argsman.GetBoolArg("-permitbaremultisig", DEFAULT_PERMIT_BAREMULTISIG);

    mempool_opts.max_datacarrier_bytes =
        argsman.GetBoolArg("-datacarrier", DEFAULT_ACCEPT_DATACARRIER)
            ? std::optional<unsigned>{argsman.GetIntArg("-datacarriersize",
                                                        MAX_OP_RETURN_RELAY)}
            : std::nullopt;

    mempool_opts.require_standard =
        !argsman.GetBoolArg("-acceptnonstdtxn", !chainparams.RequireStandard());
    if (!chainparams.IsTestChain() && !mempool_opts.require_standard) {
        return strprintf(
            Untranslated(
                "acceptnonstdtxn is not currently supported for %s chain"),
            chainparams.GetChainTypeString());
    }

    return std::nullopt;
}
