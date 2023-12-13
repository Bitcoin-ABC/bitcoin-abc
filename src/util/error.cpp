// Copyright (c) 2010-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/error.h>

#include <common/system.h>
#include <common/types.h>
#include <tinyformat.h>
#include <util/translation.h>
using common::PSBTError;

bilingual_str PSBTErrorString(PSBTError err) {
    switch (err) {
        case PSBTError::MISSING_INPUTS:
            return Untranslated("Inputs missing or spent");
        case PSBTError::SIGHASH_MISMATCH:
            return Untranslated(
                "Specified sighash value does not match value stored in PSBT");
        case PSBTError::UNSUPPORTED:
            return Untranslated("Signer does not support PSBT");
            // no default case, so the compiler can warn about missing cases
    }
    assert(false);
}

bilingual_str TransactionErrorString(const TransactionError error) {
    switch (error) {
        case TransactionError::OK:
            return Untranslated("No error");
        case TransactionError::MISSING_INPUTS:
            return Untranslated("Missing inputs");
        case TransactionError::ALREADY_IN_CHAIN:
            return Untranslated("Transaction already in block chain");
        case TransactionError::MEMPOOL_REJECTED:
            return Untranslated("Transaction rejected by mempool");
        case TransactionError::MEMPOOL_ERROR:
            return Untranslated("Mempool internal error");
        case TransactionError::MAX_FEE_EXCEEDED:
            return Untranslated("Fee exceeds maximum configured by user (e.g. "
                                "-maxtxfee, maxfeerate)");
        case TransactionError::INVALID_PACKAGE:
            return Untranslated("Transaction rejected due to invalid package");
            // no default case, so the compiler can warn about missing cases
    }
    assert(false);
}

bilingual_str ResolveErrMsg(const std::string &optname,
                            const std::string &strBind) {
    return strprintf(_("Cannot resolve -%s address: '%s'"), optname, strBind);
}

bilingual_str InvalidPortErrMsg(const std::string &optname,
                                const std::string &invalid_value) {
    return strprintf(_("Invalid port specified in %s: '%s'"), optname,
                     invalid_value);
}

bilingual_str AmountHighWarn(const std::string &optname) {
    return strprintf(_("%s is set very high!"), optname);
}

bilingual_str AmountErrMsg(const std::string &optname,
                           const std::string &strValue) {
    return strprintf(_("Invalid amount for -%s=<amount>: '%s'"), optname,
                     strValue);
}
