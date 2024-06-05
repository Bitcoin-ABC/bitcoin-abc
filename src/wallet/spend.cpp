// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/spend.h>

#include <common/args.h>
#include <common/system.h>
#include <consensus/validation.h>
#include <interfaces/chain.h>
#include <policy/policy.h>
#include <util/check.h>
#include <util/insert.h>
#include <util/moneystr.h>
#include <util/translation.h>
#include <wallet/coincontrol.h>
#include <wallet/fees.h>
#include <wallet/receive.h>
#include <wallet/transaction.h>
#include <wallet/wallet.h>

using interfaces::FoundBlock;

static const size_t OUTPUT_GROUP_MAX_ENTRIES = 10;

int GetTxSpendSize(const CWallet &wallet, const CWalletTx &wtx,
                   unsigned int out, bool use_max_sig) {
    return CalculateMaximumSignedInputSize(wtx.tx->vout[out], &wallet,
                                           use_max_sig);
}
std::string COutput::ToString() const {
    return strprintf("COutput(%s, %d, %d) [%s]", tx->GetId().ToString(), i,
                     nDepth, FormatMoney(tx->tx->vout[i].nValue));
}

int CalculateMaximumSignedInputSize(const CTxOut &txout, const CWallet *wallet,
                                    bool use_max_sig) {
    CMutableTransaction txn;
    txn.vin.push_back(CTxIn(COutPoint()));
    if (!wallet->DummySignInput(txn.vin[0], txout, use_max_sig)) {
        return -1;
    }
    return GetSerializeSize(txn.vin[0], PROTOCOL_VERSION);
}

// txouts needs to be in the order of tx.vin
int64_t CalculateMaximumSignedTxSize(const CTransaction &tx,
                                     const CWallet *wallet,
                                     const std::vector<CTxOut> &txouts,
                                     bool use_max_sig) {
    CMutableTransaction txNew(tx);
    if (!wallet->DummySignTx(txNew, txouts, use_max_sig)) {
        return -1;
    }
    return GetSerializeSize(txNew, PROTOCOL_VERSION);
}

int64_t CalculateMaximumSignedTxSize(const CTransaction &tx,
                                     const CWallet *wallet, bool use_max_sig) {
    std::vector<CTxOut> txouts;
    for (auto &input : tx.vin) {
        const auto mi = wallet->mapWallet.find(input.prevout.GetTxId());
        // Can not estimate size without knowing the input details
        if (mi == wallet->mapWallet.end()) {
            return -1;
        }
        assert(input.prevout.GetN() < mi->second.tx->vout.size());
        txouts.emplace_back(mi->second.tx->vout[input.prevout.GetN()]);
    }
    return CalculateMaximumSignedTxSize(tx, wallet, txouts, use_max_sig);
}

void AvailableCoins(const CWallet &wallet, std::vector<COutput> &vCoins,
                    const CCoinControl *coinControl,
                    const Amount nMinimumAmount, const Amount nMaximumAmount,
                    const Amount nMinimumSumAmount,
                    const uint64_t nMaximumCount) {
    AssertLockHeld(wallet.cs_wallet);

    vCoins.clear();
    Amount nTotal = Amount::zero();
    // Either the WALLET_FLAG_AVOID_REUSE flag is not set (in which case we
    // always allow), or we default to avoiding, and only in the case where a
    // coin control object is provided, and has the avoid address reuse flag set
    // to false, do we allow already used addresses
    bool allow_used_addresses =
        !wallet.IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE) ||
        (coinControl && !coinControl->m_avoid_address_reuse);
    const int min_depth = {coinControl ? coinControl->m_min_depth
                                       : DEFAULT_MIN_DEPTH};
    const int max_depth = {coinControl ? coinControl->m_max_depth
                                       : DEFAULT_MAX_DEPTH};
    const bool only_safe = {coinControl ? !coinControl->m_include_unsafe_inputs
                                        : true};

    std::set<TxId> trusted_parents;
    for (const auto &entry : wallet.mapWallet) {
        const TxId &wtxid = entry.first;
        const CWalletTx &wtx = entry.second;

        if (wallet.IsTxImmatureCoinBase(wtx)) {
            continue;
        }

        int nDepth = wallet.GetTxDepthInMainChain(wtx);
        if (nDepth < 0) {
            continue;
        }

        // We should not consider coins which aren't at least in our mempool.
        // It's possible for these to be conflicted via ancestors which we may
        // never be able to detect.
        if (nDepth == 0 && !wtx.InMempool()) {
            continue;
        }

        bool safeTx = CachedTxIsTrusted(wallet, wtx, trusted_parents);

        // Bitcoin-ABC: Removed check that prevents consideration of coins from
        // transactions that are replacing other transactions. This check based
        // on wtx.mapValue.count("replaces_txid") which was not being set
        // anywhere.

        // Similarly, we should not consider coins from transactions that have
        // been replaced. In the example above, we would want to prevent
        // creation of a transaction A' spending an output of A, because if
        // transaction B were initially confirmed, conflicting with A and A', we
        // wouldn't want to the user to create a transaction D intending to
        // replace A', but potentially resulting in a scenario where A, A', and
        // D could all be accepted (instead of just B and D, or just A and A'
        // like the user would want).

        // Bitcoin-ABC: retained this check as 'replaced_by_txid' is still set
        // in the wallet code.
        if (nDepth == 0 && wtx.mapValue.count("replaced_by_txid")) {
            safeTx = false;
        }

        if (only_safe && !safeTx) {
            continue;
        }

        if (nDepth < min_depth || nDepth > max_depth) {
            continue;
        }

        for (uint32_t i = 0; i < wtx.tx->vout.size(); i++) {
            // Only consider selected coins if add_inputs is false
            if (coinControl && !coinControl->m_add_inputs &&
                !coinControl->IsSelected(COutPoint(entry.first, i))) {
                continue;
            }

            if (wtx.tx->vout[i].nValue < nMinimumAmount ||
                wtx.tx->vout[i].nValue > nMaximumAmount) {
                continue;
            }

            const COutPoint outpoint(wtxid, i);

            if (coinControl && coinControl->HasSelected() &&
                !coinControl->fAllowOtherInputs &&
                !coinControl->IsSelected(outpoint)) {
                continue;
            }

            if (wallet.IsLockedCoin(outpoint)) {
                continue;
            }

            if (wallet.IsSpent(outpoint)) {
                continue;
            }

            isminetype mine = wallet.IsMine(wtx.tx->vout[i]);

            if (mine == ISMINE_NO) {
                continue;
            }

            if (!allow_used_addresses && wallet.IsSpentKey(wtxid, i)) {
                continue;
            }

            std::unique_ptr<SigningProvider> provider =
                wallet.GetSolvingProvider(wtx.tx->vout[i].scriptPubKey);

            bool solvable =
                provider ? IsSolvable(*provider, wtx.tx->vout[i].scriptPubKey)
                         : false;
            bool spendable =
                ((mine & ISMINE_SPENDABLE) != ISMINE_NO) ||
                (((mine & ISMINE_WATCH_ONLY) != ISMINE_NO) &&
                 (coinControl && coinControl->fAllowWatchOnly && solvable));

            vCoins.push_back(
                COutput(wallet, wtx, i, nDepth, spendable, solvable, safeTx,
                        (coinControl && coinControl->fAllowWatchOnly)));

            // Checks the sum amount of all UTXO's.
            if (nMinimumSumAmount != MAX_MONEY) {
                nTotal += wtx.tx->vout[i].nValue;

                if (nTotal >= nMinimumSumAmount) {
                    return;
                }
            }

            // Checks the maximum number of UTXO's.
            if (nMaximumCount > 0 && vCoins.size() >= nMaximumCount) {
                return;
            }
        }
    }
}

Amount GetAvailableBalance(const CWallet &wallet,
                           const CCoinControl *coinControl) {
    LOCK(wallet.cs_wallet);

    Amount balance = Amount::zero();
    std::vector<COutput> vCoins;
    AvailableCoins(wallet, vCoins, coinControl);
    for (const COutput &out : vCoins) {
        if (out.fSpendable) {
            balance += out.tx->tx->vout[out.i].nValue;
        }
    }
    return balance;
}

const CTxOut &FindNonChangeParentOutput(const CWallet &wallet,
                                        const CTransaction &tx, int output) {
    AssertLockHeld(wallet.cs_wallet);
    const CTransaction *ptx = &tx;
    int n = output;
    while (OutputIsChange(wallet, ptx->vout[n]) && ptx->vin.size() > 0) {
        const COutPoint &prevout = ptx->vin[0].prevout;
        auto it = wallet.mapWallet.find(prevout.GetTxId());
        if (it == wallet.mapWallet.end() ||
            it->second.tx->vout.size() <= prevout.GetN() ||
            !wallet.IsMine(it->second.tx->vout[prevout.GetN()])) {
            break;
        }
        ptx = it->second.tx.get();
        n = prevout.GetN();
    }
    return ptx->vout[n];
}

std::map<CTxDestination, std::vector<COutput>>
ListCoins(const CWallet &wallet) {
    AssertLockHeld(wallet.cs_wallet);

    std::map<CTxDestination, std::vector<COutput>> result;
    std::vector<COutput> availableCoins;

    AvailableCoins(wallet, availableCoins);

    for (COutput &coin : availableCoins) {
        CTxDestination address;
        if ((coin.fSpendable ||
             (wallet.IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS) &&
              coin.fSolvable)) &&
            ExtractDestination(
                FindNonChangeParentOutput(wallet, *coin.tx->tx, coin.i)
                    .scriptPubKey,
                address)) {
            result[address].emplace_back(std::move(coin));
        }
    }

    std::vector<COutPoint> lockedCoins;
    wallet.ListLockedCoins(lockedCoins);
    // Include watch-only for LegacyScriptPubKeyMan wallets without private keys
    const bool include_watch_only =
        wallet.GetLegacyScriptPubKeyMan() &&
        wallet.IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS);
    const isminetype is_mine_filter =
        include_watch_only ? ISMINE_WATCH_ONLY : ISMINE_SPENDABLE;
    for (const auto &output : lockedCoins) {
        auto it = wallet.mapWallet.find(output.GetTxId());
        if (it != wallet.mapWallet.end()) {
            int depth = wallet.GetTxDepthInMainChain(it->second);
            if (depth >= 0 && output.GetN() < it->second.tx->vout.size() &&
                wallet.IsMine(it->second.tx->vout[output.GetN()]) ==
                    is_mine_filter) {
                CTxDestination address;
                if (ExtractDestination(FindNonChangeParentOutput(wallet,
                                                                 *it->second.tx,
                                                                 output.GetN())
                                           .scriptPubKey,
                                       address)) {
                    result[address].emplace_back(
                        wallet, it->second, output.GetN(), depth,
                        true /* spendable */, true /* solvable */,
                        false /* safe */);
                }
            }
        }
    }

    return result;
}

std::vector<OutputGroup>
GroupOutputs(const CWallet &wallet, const std::vector<COutput> &outputs,
             bool separate_coins, const CFeeRate &effective_feerate,
             const CFeeRate &long_term_feerate,
             const CoinEligibilityFilter &filter, bool positive_only) {
    std::vector<OutputGroup> groups_out;

    if (separate_coins) {
        // Single coin means no grouping. Each COutput gets its own OutputGroup.
        for (const COutput &output : outputs) {
            // Skip outputs we cannot spend
            if (!output.fSpendable) {
                continue;
            }

            CInputCoin input_coin = output.GetInputCoin();

            // Make an OutputGroup containing just this output
            OutputGroup group{effective_feerate, long_term_feerate};
            group.Insert(input_coin, output.nDepth,
                         CachedTxIsFromMe(wallet, *output.tx, ISMINE_ALL),
                         positive_only);

            // Check the OutputGroup's eligibility. Only add the eligible ones.
            if (positive_only && group.effective_value <= Amount::zero()) {
                continue;
            }
            if (group.m_outputs.size() > 0 &&
                group.EligibleForSpending(filter)) {
                groups_out.push_back(group);
            }
        }
        return groups_out;
    }

    // We want to combine COutputs that have the same scriptPubKey into single
    // OutputGroups except when there are more than OUTPUT_GROUP_MAX_ENTRIES
    // COutputs grouped in an OutputGroup.
    // To do this, we maintain a map where the key is the scriptPubKey and the
    // value is a vector of OutputGroups.
    // For each COutput, we check if the scriptPubKey is in the map, and if it
    // is, the COutput's CInputCoin is added to the last OutputGroup in the
    // vector for the scriptPubKey. When the last OutputGroup has
    // OUTPUT_GROUP_MAX_ENTRIES CInputCoins, a new OutputGroup is added to the
    // end of the vector.
    std::map<CScript, std::vector<OutputGroup>> spk_to_groups_map;
    for (const auto &output : outputs) {
        // Skip outputs we cannot spend
        if (!output.fSpendable) {
            continue;
        }

        CInputCoin input_coin = output.GetInputCoin();
        CScript spk = input_coin.txout.scriptPubKey;

        std::vector<OutputGroup> &groups = spk_to_groups_map[spk];

        if (groups.size() == 0) {
            // No OutputGroups for this scriptPubKey yet, add one
            groups.emplace_back(effective_feerate, long_term_feerate);
        }

        // Get the last OutputGroup in the vector so that we can add the
        // CInputCoin to it.
        // A pointer is used here so that group can be reassigned later if it
        // is full.
        OutputGroup *group = &groups.back();

        // Check if this OutputGroup is full. We limit to
        // OUTPUT_GROUP_MAX_ENTRIES when using -avoidpartialspends to avoid
        // surprising users with very high fees.
        if (group->m_outputs.size() >= OUTPUT_GROUP_MAX_ENTRIES) {
            // The last output group is full, add a new group to the vector and
            // use that group for the insertion
            groups.emplace_back(effective_feerate, long_term_feerate);
            group = &groups.back();
        }

        // Add the input_coin to group
        group->Insert(input_coin, output.nDepth,
                      CachedTxIsFromMe(wallet, *output.tx, ISMINE_ALL),
                      positive_only);
    }

    // Now we go through the entire map and pull out the OutputGroups
    for (const auto &spk_and_groups_pair : spk_to_groups_map) {
        const std::vector<OutputGroup> &groups_per_spk =
            spk_and_groups_pair.second;

        // Go through the vector backwards. This allows for the first item we
        // deal with being the partial group.
        for (auto group_it = groups_per_spk.rbegin();
             group_it != groups_per_spk.rend(); group_it++) {
            const OutputGroup &group = *group_it;

            // Don't include partial groups if there are full groups too and we
            // don't want partial groups
            if (group_it == groups_per_spk.rbegin() &&
                groups_per_spk.size() > 1 && !filter.m_include_partial_groups) {
                continue;
            }

            // Check the OutputGroup's eligibility. Only add the eligible ones.
            if (positive_only && group.effective_value <= Amount::zero()) {
                continue;
            }
            if (group.m_outputs.size() > 0 &&
                group.EligibleForSpending(filter)) {
                groups_out.push_back(group);
            }
        }
    }

    return groups_out;
}

bool SelectCoinsMinConf(const CWallet &wallet, const Amount nTargetValue,
                        const CoinEligibilityFilter &eligibility_filter,
                        std::vector<COutput> coins,
                        std::set<CInputCoin> &setCoinsRet, Amount &nValueRet,
                        const CoinSelectionParams &coin_selection_params,
                        bool &bnb_used) {
    setCoinsRet.clear();
    nValueRet = Amount::zero();

    if (coin_selection_params.use_bnb) {
        // Get long term estimate
        CCoinControl temp;
        temp.m_confirm_target = 1008;
        CFeeRate long_term_feerate = GetMinimumFeeRate(wallet, temp);

        // Get the feerate for effective value.
        // When subtracting the fee from the outputs, we want the effective
        // feerate to be 0
        CFeeRate effective_feerate{Amount::zero()};
        if (!coin_selection_params.m_subtract_fee_outputs) {
            effective_feerate = coin_selection_params.effective_fee;
        }

        std::vector<OutputGroup> groups = GroupOutputs(
            wallet, coins, !coin_selection_params.m_avoid_partial_spends,
            effective_feerate, long_term_feerate, eligibility_filter,
            /*positive_only=*/true);

        // Calculate cost of change
        Amount cost_of_change = wallet.chain().relayDustFee().GetFee(
                                    coin_selection_params.change_spend_size) +
                                coin_selection_params.effective_fee.GetFee(
                                    coin_selection_params.change_output_size);

        // Calculate the fees for things that aren't inputs
        Amount not_input_fees = coin_selection_params.effective_fee.GetFee(
            coin_selection_params.tx_noinputs_size);
        bnb_used = true;
        return SelectCoinsBnB(groups, nTargetValue, cost_of_change, setCoinsRet,
                              nValueRet, not_input_fees);
    } else {
        std::vector<OutputGroup> groups = GroupOutputs(
            wallet, coins, !coin_selection_params.m_avoid_partial_spends,
            CFeeRate(Amount::zero()), CFeeRate(Amount::zero()),
            eligibility_filter,
            /*positive_only=*/false);

        bnb_used = false;
        return KnapsackSolver(nTargetValue, groups, setCoinsRet, nValueRet);
    }
}

bool SelectCoins(const CWallet &wallet,
                 const std::vector<COutput> &vAvailableCoins,
                 const Amount nTargetValue, std::set<CInputCoin> &setCoinsRet,
                 Amount &nValueRet, const CCoinControl &coin_control,
                 CoinSelectionParams &coin_selection_params, bool &bnb_used) {
    std::vector<COutput> vCoins(vAvailableCoins);
    Amount value_to_select = nTargetValue;

    // Default to bnb was not used. If we use it, we set it later
    bnb_used = false;

    // coin control -> return all selected outputs (we want all selected to go
    // into the transaction for sure)
    if (coin_control.HasSelected() && !coin_control.fAllowOtherInputs) {
        for (const COutput &out : vCoins) {
            if (!out.fSpendable) {
                continue;
            }

            nValueRet += out.tx->tx->vout[out.i].nValue;
            setCoinsRet.insert(out.GetInputCoin());
        }

        return (nValueRet >= nTargetValue);
    }

    // Calculate value from preset inputs and store them.
    std::set<CInputCoin> setPresetCoins;
    Amount nValueFromPresetInputs = Amount::zero();

    std::vector<COutPoint> vPresetInputs;
    coin_control.ListSelected(vPresetInputs);

    for (const COutPoint &outpoint : vPresetInputs) {
        std::map<TxId, CWalletTx>::const_iterator it =
            wallet.mapWallet.find(outpoint.GetTxId());
        if (it != wallet.mapWallet.end()) {
            const CWalletTx &wtx = it->second;
            // Clearly invalid input, fail
            if (wtx.tx->vout.size() <= outpoint.GetN()) {
                return false;
            }
            // Just to calculate the marginal byte size
            CInputCoin coin(
                wtx.tx, outpoint.GetN(),
                GetTxSpendSize(wallet, wtx, outpoint.GetN(), false));
            nValueFromPresetInputs += coin.txout.nValue;
            if (coin.m_input_bytes <= 0) {
                // Not solvable, can't estimate size for fee
                return false;
            }
            coin.effective_value =
                coin.txout.nValue -
                coin_selection_params.effective_fee.GetFee(coin.m_input_bytes);
            if (coin_selection_params.use_bnb) {
                value_to_select -= coin.effective_value;
            } else {
                value_to_select -= coin.txout.nValue;
            }
            setPresetCoins.insert(coin);
        } else {
            return false; // TODO: Allow non-wallet inputs
        }
    }

    // Remove preset inputs from vCoins
    for (std::vector<COutput>::iterator it = vCoins.begin();
         it != vCoins.end() && coin_control.HasSelected();) {
        if (setPresetCoins.count(it->GetInputCoin())) {
            it = vCoins.erase(it);
        } else {
            ++it;
        }
    }

    // form groups from remaining coins; note that preset coins will not
    // automatically have their associated (same address) coins included
    if (coin_control.m_avoid_partial_spends &&
        vCoins.size() > OUTPUT_GROUP_MAX_ENTRIES) {
        // Cases where we have 11+ outputs all pointing to the same destination
        // may result in privacy leaks as they will potentially be
        // deterministically sorted. We solve that by explicitly shuffling the
        // outputs before processing
        Shuffle(vCoins.begin(), vCoins.end(), FastRandomContext());
    }

    bool res =
        value_to_select <= Amount::zero() ||
        SelectCoinsMinConf(wallet, value_to_select, CoinEligibilityFilter(1, 6),
                           vCoins, setCoinsRet, nValueRet,
                           coin_selection_params, bnb_used) ||
        SelectCoinsMinConf(wallet, value_to_select, CoinEligibilityFilter(1, 1),
                           vCoins, setCoinsRet, nValueRet,
                           coin_selection_params, bnb_used) ||
        (wallet.m_spend_zero_conf_change &&
         SelectCoinsMinConf(wallet, value_to_select,
                            CoinEligibilityFilter(0, 1), vCoins, setCoinsRet,
                            nValueRet, coin_selection_params, bnb_used)) ||
        (wallet.m_spend_zero_conf_change &&
         SelectCoinsMinConf(wallet, value_to_select,
                            CoinEligibilityFilter(0, 1), vCoins, setCoinsRet,
                            nValueRet, coin_selection_params, bnb_used)) ||
        (wallet.m_spend_zero_conf_change &&
         SelectCoinsMinConf(wallet, value_to_select,
                            CoinEligibilityFilter(0, 1), vCoins, setCoinsRet,
                            nValueRet, coin_selection_params, bnb_used)) ||
        (wallet.m_spend_zero_conf_change &&
         SelectCoinsMinConf(
             wallet, value_to_select,
             CoinEligibilityFilter(0, 1, /*include_partial_groups=*/true),
             vCoins, setCoinsRet, nValueRet, coin_selection_params,
             bnb_used)) ||
        (wallet.m_spend_zero_conf_change &&
         SelectCoinsMinConf(
             wallet, value_to_select,
             CoinEligibilityFilter(0, 1, /*include_partial_groups=*/true),
             vCoins, setCoinsRet, nValueRet, coin_selection_params,
             bnb_used)) ||
        // Try with unsafe inputs if they are allowed. This may spend
        // unconfirmed outputs received from other wallets.
        (coin_control.m_include_unsafe_inputs &&
         SelectCoinsMinConf(
             wallet, value_to_select,
             CoinEligibilityFilter(/*conf_mine=*/0, /*conf_theirs=*/0,
                                   /*include_partial_groups=*/true),
             vCoins, setCoinsRet, nValueRet, coin_selection_params, bnb_used));

    // Because SelectCoinsMinConf clears the setCoinsRet, we now add the
    // possible inputs to the coinset.
    util::insert(setCoinsRet, setPresetCoins);

    // Add preset inputs to the total value selected.
    nValueRet += nValueFromPresetInputs;

    return res;
}

static bool CreateTransactionInternal(
    CWallet &wallet, const std::vector<CRecipient> &vecSend,
    CTransactionRef &tx, Amount &nFeeRet, int &nChangePosInOut,
    bilingual_str &error, const CCoinControl &coin_control, bool sign) {
    // TODO: remember to add the lock annotation when adding AssertLockHeld.
    //       The lock annotation was added by core in PR22100, but due to
    //       other missing backports it was not possible to add it during that
    //       backport.
    Amount nValue = Amount::zero();
    const OutputType change_type = wallet.TransactionChangeType(
        coin_control.m_change_type ? *coin_control.m_change_type
                                   : wallet.m_default_change_type,
        vecSend);
    ReserveDestination reservedest(&wallet, change_type);
    int nChangePosRequest = nChangePosInOut;
    unsigned int nSubtractFeeFromAmount = 0;
    for (const auto &recipient : vecSend) {
        if (nValue < Amount::zero() || recipient.nAmount < Amount::zero()) {
            error = _("Transaction amounts must not be negative");
            return false;
        }

        nValue += recipient.nAmount;

        if (recipient.fSubtractFeeFromAmount) {
            nSubtractFeeFromAmount++;
        }
    }

    if (vecSend.empty()) {
        error = _("Transaction must have at least one recipient");
        return false;
    }

    CMutableTransaction txNew;

    {
        std::set<CInputCoin> setCoins;
        LOCK(wallet.cs_wallet);
        // Previously the locktime was set to the current block height, to
        // prevent fee-sniping. This is now disabled as fee-sniping is mitigated
        // by avalanche post-consensus. Consistently Using a locktime of 0 for
        // most wallets in the ecosystem improves privacy, as this is the
        // easiest solution to implement for light wallets which are not aware
        // of the current block height.
        txNew.nLockTime = 0;
        std::vector<COutput> vAvailableCoins;
        AvailableCoins(wallet, vAvailableCoins, &coin_control);
        // Parameters for coin selection, init with dummy
        CoinSelectionParams coin_selection_params;
        coin_selection_params.m_avoid_partial_spends =
            coin_control.m_avoid_partial_spends;

        // Create change script that will be used if we need change
        // TODO: pass in scriptChange instead of reservedest so
        // change transaction isn't always pay-to-bitcoin-address
        CScript scriptChange;

        // coin control: send change to custom address
        if (!std::get_if<CNoDestination>(&coin_control.destChange)) {
            scriptChange = GetScriptForDestination(coin_control.destChange);

            // no coin control: send change to newly generated address
        } else {
            // Note: We use a new key here to keep it from being obvious
            // which side is the change.
            //  The drawback is that by not reusing a previous key, the
            //  change may be lost if a backup is restored, if the backup
            //  doesn't have the new private key for the change. If we
            //  reused the old key, it would be possible to add code to look
            //  for and rediscover unknown transactions that were written
            //  with keys of ours to recover post-backup change.

            // Reserve a new key pair from key pool. If it fails, provide a
            // dummy destination in case we don't need change.
            CTxDestination dest;
            if (!reservedest.GetReservedDestination(dest, true)) {
                error = _("Transaction needs a change address, but we can't "
                          "generate it. Please call keypoolrefill first.");
            }

            scriptChange = GetScriptForDestination(dest);
            // A valid destination implies a change script (and
            // vice-versa). An empty change script will abort later, if the
            // change keypool ran out, but change is required.
            CHECK_NONFATAL(IsValidDestination(dest) != scriptChange.empty());
        }
        CTxOut change_prototype_txout(Amount::zero(), scriptChange);
        coin_selection_params.change_output_size =
            GetSerializeSize(change_prototype_txout);

        // Get the fee rate to use effective values in coin selection
        CFeeRate nFeeRateNeeded = GetMinimumFeeRate(wallet, coin_control);
        // Do not, ever, assume that it's fine to change the fee rate if the
        // user has explicitly provided one
        if (coin_control.m_feerate &&
            nFeeRateNeeded > *coin_control.m_feerate) {
            error = strprintf(_("Fee rate (%s) is lower than the minimum fee "
                                "rate setting (%s)"),
                              coin_control.m_feerate->ToString(),
                              nFeeRateNeeded.ToString());
            return false;
        }

        nFeeRet = Amount::zero();
        bool pick_new_inputs = true;
        Amount nValueIn = Amount::zero();

        // BnB selector is the only selector used when this is true.
        // That should only happen on the first pass through the loop.
        coin_selection_params.use_bnb = true;
        // If we are doing subtract fee from recipient, don't use effective
        // values
        coin_selection_params.m_subtract_fee_outputs =
            nSubtractFeeFromAmount != 0;
        // Start with no fee and loop until there is enough fee
        while (true) {
            nChangePosInOut = nChangePosRequest;
            txNew.vin.clear();
            txNew.vout.clear();
            bool fFirst = true;

            Amount nValueToSelect = nValue;
            if (nSubtractFeeFromAmount == 0) {
                nValueToSelect += nFeeRet;
            }

            // vouts to the payees
            if (!coin_selection_params.m_subtract_fee_outputs) {
                // Static size overhead + outputs vsize. 4 nVersion, 4
                // nLocktime, 1 input count, 1 output count
                coin_selection_params.tx_noinputs_size = 10;
            }
            // vouts to the payees
            for (const auto &recipient : vecSend) {
                CTxOut txout(recipient.nAmount, recipient.scriptPubKey);

                if (recipient.fSubtractFeeFromAmount) {
                    assert(nSubtractFeeFromAmount != 0);
                    // Subtract fee equally from each selected recipient.
                    txout.nValue -= nFeeRet / int(nSubtractFeeFromAmount);

                    // First receiver pays the remainder not divisible by output
                    // count.
                    if (fFirst) {
                        fFirst = false;
                        txout.nValue -= nFeeRet % int(nSubtractFeeFromAmount);
                    }
                }

                // Include the fee cost for outputs. Note this is only used for
                // BnB right now
                if (!coin_selection_params.m_subtract_fee_outputs) {
                    coin_selection_params.tx_noinputs_size +=
                        ::GetSerializeSize(txout, PROTOCOL_VERSION);
                }

                if (IsDust(txout, wallet.chain().relayDustFee())) {
                    if (recipient.fSubtractFeeFromAmount &&
                        nFeeRet > Amount::zero()) {
                        if (txout.nValue < Amount::zero()) {
                            error = _("The transaction amount is too small to "
                                      "pay the fee");
                        } else {
                            error = _("The transaction amount is too small to "
                                      "send after the fee has been deducted");
                        }
                    } else {
                        error = _("Transaction amount too small");
                    }

                    return false;
                }

                txNew.vout.push_back(txout);
            }

            // Choose coins to use
            bool bnb_used = false;
            if (pick_new_inputs) {
                nValueIn = Amount::zero();
                setCoins.clear();
                int change_spend_size = CalculateMaximumSignedInputSize(
                    change_prototype_txout, &wallet);
                // If the wallet doesn't know how to sign change output, assume
                // p2pkh as lower-bound to allow BnB to do it's thing
                if (change_spend_size == -1) {
                    coin_selection_params.change_spend_size =
                        DUMMY_P2PKH_INPUT_SIZE;
                } else {
                    coin_selection_params.change_spend_size =
                        size_t(change_spend_size);
                }
                coin_selection_params.effective_fee = nFeeRateNeeded;
                if (!SelectCoins(wallet, vAvailableCoins, nValueToSelect,
                                 setCoins, nValueIn, coin_control,
                                 coin_selection_params, bnb_used)) {
                    // If BnB was used, it was the first pass. No longer the
                    // first pass and continue loop with knapsack.
                    if (bnb_used) {
                        coin_selection_params.use_bnb = false;
                        continue;
                    } else {
                        error = _("Insufficient funds");
                        return false;
                    }
                }
            } else {
                bnb_used = false;
            }

            const Amount nChange = nValueIn - nValueToSelect;
            if (nChange > Amount::zero()) {
                // Fill a vout to ourself.
                CTxOut newTxOut(nChange, scriptChange);

                // Never create dust outputs; if we would, just add the dust to
                // the fee.
                // The nChange when BnB is used is always going to go to fees.
                if (IsDust(newTxOut, wallet.chain().relayDustFee()) ||
                    bnb_used) {
                    nChangePosInOut = -1;
                    nFeeRet += nChange;
                } else {
                    if (nChangePosInOut == -1) {
                        // Insert change txn at random position:
                        nChangePosInOut = GetRand<int>(txNew.vout.size() + 1);
                    } else if ((unsigned int)nChangePosInOut >
                               txNew.vout.size()) {
                        error = _("Change index out of range");
                        return false;
                    }

                    std::vector<CTxOut>::iterator position =
                        txNew.vout.begin() + nChangePosInOut;
                    txNew.vout.insert(position, newTxOut);
                }
            } else {
                nChangePosInOut = -1;
            }

            // Dummy fill vin for maximum size estimation
            //
            for (const auto &coin : setCoins) {
                txNew.vin.push_back(CTxIn(coin.outpoint, CScript()));
            }

            CTransaction txNewConst(txNew);
            int nBytes = CalculateMaximumSignedTxSize(
                txNewConst, &wallet, coin_control.fAllowWatchOnly);
            if (nBytes < 0) {
                error = _("Signing transaction failed");
                return false;
            }

            Amount nFeeNeeded = GetMinimumFee(wallet, nBytes, coin_control);

            if (nFeeRet >= nFeeNeeded) {
                // Reduce fee to only the needed amount if possible. This
                // prevents potential overpayment in fees if the coins selected
                // to meet nFeeNeeded result in a transaction that requires less
                // fee than the prior iteration.

                // If we have no change and a big enough excess fee, then try to
                // construct transaction again only without picking new inputs.
                // We now know we only need the smaller fee (because of reduced
                // tx size) and so we should add a change output. Only try this
                // once.
                if (nChangePosInOut == -1 && nSubtractFeeFromAmount == 0 &&
                    pick_new_inputs) {
                    // Add 2 as a buffer in case increasing # of outputs changes
                    // compact size
                    unsigned int tx_size_with_change =
                        nBytes + coin_selection_params.change_output_size + 2;
                    Amount fee_needed_with_change = GetMinimumFee(
                        wallet, tx_size_with_change, coin_control);
                    Amount minimum_value_for_change = GetDustThreshold(
                        change_prototype_txout, wallet.chain().relayDustFee());
                    if (nFeeRet >=
                        fee_needed_with_change + minimum_value_for_change) {
                        pick_new_inputs = false;
                        nFeeRet = fee_needed_with_change;
                        continue;
                    }
                }

                // If we have change output already, just increase it
                if (nFeeRet > nFeeNeeded && nChangePosInOut != -1 &&
                    nSubtractFeeFromAmount == 0) {
                    Amount extraFeePaid = nFeeRet - nFeeNeeded;
                    std::vector<CTxOut>::iterator change_position =
                        txNew.vout.begin() + nChangePosInOut;
                    change_position->nValue += extraFeePaid;
                    nFeeRet -= extraFeePaid;
                }

                // Done, enough fee included.
                break;
            } else if (!pick_new_inputs) {
                // This shouldn't happen, we should have had enough excess fee
                // to pay for the new output and still meet nFeeNeeded.
                // Or we should have just subtracted fee from recipients and
                // nFeeNeeded should not have changed.
                error = _("Transaction fee and change calculation failed");
                return false;
            }

            // Try to reduce change to include necessary fee.
            if (nChangePosInOut != -1 && nSubtractFeeFromAmount == 0) {
                Amount additionalFeeNeeded = nFeeNeeded - nFeeRet;
                std::vector<CTxOut>::iterator change_position =
                    txNew.vout.begin() + nChangePosInOut;
                // Only reduce change if remaining amount is still a large
                // enough output.
                if (change_position->nValue >=
                    MIN_FINAL_CHANGE + additionalFeeNeeded) {
                    change_position->nValue -= additionalFeeNeeded;
                    nFeeRet += additionalFeeNeeded;
                    // Done, able to increase fee from change.
                    break;
                }
            }

            // If subtracting fee from recipients, we now know what fee we
            // need to subtract, we have no reason to reselect inputs.
            if (nSubtractFeeFromAmount > 0) {
                pick_new_inputs = false;
            }

            // Include more fee and try again.
            nFeeRet = nFeeNeeded;
            coin_selection_params.use_bnb = false;
            continue;
        }

        // Give up if change keypool ran out and change is required
        if (scriptChange.empty() && nChangePosInOut != -1) {
            return false;
        }

        // Shuffle selected coins and fill in final vin
        txNew.vin.clear();
        std::vector<CInputCoin> selected_coins(setCoins.begin(),
                                               setCoins.end());
        Shuffle(selected_coins.begin(), selected_coins.end(),
                FastRandomContext());

        // Note how the sequence number is set to non-maxint so that
        // the nLockTime set above actually works.
        for (const auto &coin : selected_coins) {
            txNew.vin.push_back(
                CTxIn(coin.outpoint, CScript(),
                      std::numeric_limits<uint32_t>::max() - 1));
        }

        if (sign && !wallet.SignTransaction(txNew)) {
            error = _("Signing transaction failed");
            return false;
        }

        // Return the constructed transaction data.
        tx = MakeTransactionRef(std::move(txNew));

        // Limit size.
        if (tx->GetTotalSize() > MAX_STANDARD_TX_SIZE) {
            error = _("Transaction too large");
            return false;
        }
    }

    if (nFeeRet > wallet.m_default_max_tx_fee) {
        error = TransactionErrorString(TransactionError::MAX_FEE_EXCEEDED);
        return false;
    }

    // Before we return success, we assume any change key will be used to
    // prevent accidental re-use.
    reservedest.KeepDestination();

    return true;
}

bool CreateTransaction(CWallet &wallet, const std::vector<CRecipient> &vecSend,
                       CTransactionRef &tx, Amount &nFeeRet,
                       int &nChangePosInOut, bilingual_str &error,
                       const CCoinControl &coin_control, bool sign) {
    int nChangePosIn = nChangePosInOut;
    CTransactionRef tx2 = tx;
    bool res =
        CreateTransactionInternal(wallet, vecSend, tx, nFeeRet, nChangePosInOut,
                                  error, coin_control, sign);
    // try with avoidpartialspends unless it's enabled already
    if (res &&
        nFeeRet >
            Amount::zero() /* 0 means non-functional fee rate estimation */
        && wallet.m_max_aps_fee > (-1 * SATOSHI) &&
        !coin_control.m_avoid_partial_spends) {
        CCoinControl tmp_cc = coin_control;
        tmp_cc.m_avoid_partial_spends = true;
        Amount nFeeRet2;
        int nChangePosInOut2 = nChangePosIn;
        // fired and forgotten; if an error occurs, we discard the results
        bilingual_str error2;
        if (CreateTransactionInternal(wallet, vecSend, tx2, nFeeRet2,
                                      nChangePosInOut2, error2, tmp_cc, sign)) {
            // if fee of this alternative one is within the range of the max
            // fee, we use this one
            const bool use_aps = nFeeRet2 <= nFeeRet + wallet.m_max_aps_fee;
            wallet.WalletLogPrintf(
                "Fee non-grouped = %lld, grouped = %lld, using %s\n", nFeeRet,
                nFeeRet2, use_aps ? "grouped" : "non-grouped");
            if (use_aps) {
                tx = tx2;
                nFeeRet = nFeeRet2;
                nChangePosInOut = nChangePosInOut2;
            }
        }
    }
    return res;
}

bool FundTransaction(CWallet &wallet, CMutableTransaction &tx, Amount &nFeeRet,
                     int &nChangePosInOut, bilingual_str &error,
                     bool lockUnspents,
                     const std::set<int> &setSubtractFeeFromOutputs,
                     CCoinControl coinControl) {
    std::vector<CRecipient> vecSend;

    // Turn the txout set into a CRecipient vector.
    for (size_t idx = 0; idx < tx.vout.size(); idx++) {
        const CTxOut &txOut = tx.vout[idx];
        CRecipient recipient = {txOut.scriptPubKey, txOut.nValue,
                                setSubtractFeeFromOutputs.count(idx) == 1};
        vecSend.push_back(recipient);
    }

    coinControl.fAllowOtherInputs = true;

    for (const CTxIn &txin : tx.vin) {
        coinControl.Select(txin.prevout);
    }

    // Acquire the locks to prevent races to the new locked unspents between the
    // CreateTransaction call and LockCoin calls (when lockUnspents is true).
    LOCK(wallet.cs_wallet);

    CTransactionRef tx_new;
    if (!CreateTransaction(wallet, vecSend, tx_new, nFeeRet, nChangePosInOut,
                           error, coinControl, false)) {
        return false;
    }

    if (nChangePosInOut != -1) {
        tx.vout.insert(tx.vout.begin() + nChangePosInOut,
                       tx_new->vout[nChangePosInOut]);
    }

    // Copy output sizes from new transaction; they may have had the fee
    // subtracted from them.
    for (size_t idx = 0; idx < tx.vout.size(); idx++) {
        tx.vout[idx].nValue = tx_new->vout[idx].nValue;
    }

    // Add new txins (keeping original txin scriptSig/order)
    for (const CTxIn &txin : tx_new->vin) {
        if (!coinControl.IsSelected(txin.prevout)) {
            tx.vin.push_back(txin);
        }
        if (lockUnspents) {
            wallet.LockCoin(txin.prevout);
        }
    }

    return true;
}
