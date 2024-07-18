// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/validation.h>
#include <policy/packages.h>
#include <primitives/transaction.h>
#include <util/hasher.h>

#include <numeric>
#include <unordered_set>

bool CheckPackage(const Package &txns, PackageValidationState &state) {
    const size_t package_count = txns.size();

    // These context-free package limits can be checked before taking the
    // mempool lock.
    if (package_count > MAX_PACKAGE_COUNT) {
        return state.Invalid(PackageValidationResult::PCKG_POLICY,
                             "package-too-many-transactions");
    }

    const int64_t total_size = std::accumulate(
        txns.cbegin(), txns.cend(), 0, [](int64_t sum, const auto &tx) {
            return sum + GetVirtualTransactionSize(*tx);
        });
    // If the package only contains 1 tx, it's better to report the policy
    // violation on individual tx size.
    if (package_count > 1 && total_size > MAX_PACKAGE_SIZE * 1000) {
        return state.Invalid(PackageValidationResult::PCKG_POLICY,
                             "package-too-large");
    }

    // Require the package to be sorted in order of dependency, i.e. parents
    // appear before children.
    // An unsorted package will fail anyway on missing-inputs, but it's better
    // to quit earlier and fail on something less ambiguous (missing-inputs
    // could also be an orphan or trying to spend nonexistent coins).
    std::unordered_set<TxId, SaltedTxIdHasher> later_txids;
    std::transform(txns.cbegin(), txns.cend(),
                   std::inserter(later_txids, later_txids.end()),
                   [](const auto &tx) { return tx->GetId(); });

    // Package must not contain any duplicate transactions, which is checked by
    // txid.
    if (later_txids.size() != txns.size()) {
        return state.Invalid(PackageValidationResult::PCKG_POLICY,
                             "package-contains-duplicates");
    }

    for (const auto &tx : txns) {
        for (const auto &input : tx->vin) {
            if (later_txids.find(input.prevout.GetTxId()) !=
                later_txids.end()) {
                // The parent is a subsequent transaction in the package.
                return state.Invalid(PackageValidationResult::PCKG_POLICY,
                                     "package-not-sorted");
            }
        }
        later_txids.erase(tx->GetId());
    }

    // Don't allow any conflicting transactions, i.e. spending the same
    // inputs, in a package.
    std::unordered_set<COutPoint, SaltedOutpointHasher> inputs_seen;
    for (const auto &tx : txns) {
        for (const auto &input : tx->vin) {
            if (inputs_seen.find(input.prevout) != inputs_seen.end()) {
                // This input is also present in another tx in the package.
                return state.Invalid(PackageValidationResult::PCKG_POLICY,
                                     "conflict-in-package");
            }
        }
        // Batch-add all the inputs for a tx at a time. If we added them 1
        // at a time, we could catch duplicate inputs within a single tx.
        // This is a more severe, consensus error, and we want to report
        // that from CheckTransaction instead.
        std::transform(tx->vin.cbegin(), tx->vin.cend(),
                       std::inserter(inputs_seen, inputs_seen.end()),
                       [](const auto &input) { return input.prevout; });
    }
    return true;
}

bool IsChildWithParents(const Package &package) {
    assert(std::all_of(package.cbegin(), package.cend(),
                       [](const auto &tx) { return tx != nullptr; }));
    if (package.size() < 2) {
        return false;
    }

    // The package is expected to be sorted, so the last transaction is the
    // child.
    const auto &child = package.back();
    std::unordered_set<TxId, SaltedTxIdHasher> input_txids;
    std::transform(child->vin.cbegin(), child->vin.cend(),
                   std::inserter(input_txids, input_txids.end()),
                   [](const auto &input) { return input.prevout.GetTxId(); });

    // Every transaction must be a parent of the last transaction in the
    // package.
    return std::all_of(package.cbegin(), package.cend() - 1,
                       [&input_txids](const auto &ptx) {
                           return input_txids.count(ptx->GetId()) > 0;
                       });
}

bool IsChildWithParentsTree(const Package &package) {
    if (!IsChildWithParents(package)) {
        return false;
    }
    std::unordered_set<TxId, SaltedTxIdHasher> parent_txids;
    std::transform(package.cbegin(), package.cend() - 1,
                   std::inserter(parent_txids, parent_txids.end()),
                   [](const auto &ptx) { return ptx->GetId(); });
    // Each parent must not have an input who is one of the other parents.
    return std::all_of(
        package.cbegin(), package.cend() - 1, [&](const auto &ptx) {
            for (const auto &input : ptx->vin) {
                if (parent_txids.count(input.prevout.GetTxId()) > 0) {
                    return false;
                }
            }
            return true;
        });
}
