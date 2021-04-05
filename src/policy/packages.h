// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_PACKAGES_H
#define BITCOIN_POLICY_PACKAGES_H

#include <consensus/validation.h>
#include <policy/policy.h>
#include <primitives/transaction.h>

#include <vector>

/** Default maximum number of transactions in a package. */
static constexpr uint32_t MAX_PACKAGE_COUNT{50};
/** Default maximum total size of transactions in a package in KB. */
static constexpr uint32_t MAX_PACKAGE_SIZE{101};
static_assert(MAX_PACKAGE_SIZE * 1000 >= MAX_STANDARD_TX_SIZE);

/**
 * A "reason" why a package was invalid. It may be that one or more of the
 * included transactions is invalid or the package itself violates our rules.
 * We don't distinguish between consensus and policy violations right now.
 */
enum class PackageValidationResult {
    //! Initial value. The package has not yet been rejected.
    PCKG_RESULT_UNSET = 0,
    //! The package itself is invalid (e.g. too many transactions).
    PCKG_POLICY,
    //! At least one tx is invalid.
    PCKG_TX,
};

/**
 * A package is an ordered list of transactions. The transactions cannot
 * conflict with (spend the same inputs as) one another.
 */
using Package = std::vector<CTransactionRef>;

class PackageValidationState : public ValidationState<PackageValidationResult> {
};

#endif // BITCOIN_POLICY_PACKAGES_H
