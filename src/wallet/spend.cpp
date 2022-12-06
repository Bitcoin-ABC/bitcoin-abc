// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/spend.h>

#include <consensus/validation.h>
#include <interfaces/chain.h>
#include <policy/policy.h>
#include <util/check.h>
#include <util/moneystr.h>
#include <util/translation.h>
#include <wallet/coincontrol.h>
#include <wallet/fees.h>
#include <wallet/transaction.h>
#include <wallet/wallet.h>

using interfaces::FoundBlock;

static const size_t OUTPUT_GROUP_MAX_ENTRIES = 10;

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

void CWallet::AvailableCoins(std::vector<COutput> &vCoins, bool fOnlySafe,
                             const CCoinControl *coinControl,
                             const Amount nMinimumAmount,
                             const Amount nMaximumAmount,
                             const Amount nMinimumSumAmount,
                             const uint64_t nMaximumCount) const {
    AssertLockHeld(cs_wallet);

    vCoins.clear();
    Amount nTotal = Amount::zero();
    // Either the WALLET_FLAG_AVOID_REUSE flag is not set (in which case we
    // always allow), or we default to avoiding, and only in the case where a
    // coin control object is provided, and has the avoid address reuse flag set
    // to false, do we allow already used addresses
    bool allow_used_addresses =
        !IsWalletFlagSet(WALLET_FLAG_AVOID_REUSE) ||
        (coinControl && !coinControl->m_avoid_address_reuse);
    const int min_depth = {coinControl ? coinControl->m_min_depth
                                       : DEFAULT_MIN_DEPTH};
    const int max_depth = {coinControl ? coinControl->m_max_depth
                                       : DEFAULT_MAX_DEPTH};

    std::set<TxId> trusted_parents;
    for (const auto &entry : mapWallet) {
        const TxId &wtxid = entry.first;
        const CWalletTx &wtx = entry.second;

        TxValidationState state;
        if (!chain().contextualCheckTransactionForCurrentBlock(*wtx.tx,
                                                               state)) {
            continue;
        }

        if (wtx.IsImmatureCoinBase()) {
            continue;
        }

        int nDepth = wtx.GetDepthInMainChain();
        if (nDepth < 0) {
            continue;
        }

        // We should not consider coins which aren't at least in our mempool.
        // It's possible for these to be conflicted via ancestors which we may
        // never be able to detect.
        if (nDepth == 0 && !wtx.InMempool()) {
            continue;
        }

        bool safeTx = IsTrusted(wtx, trusted_parents);

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

        if (fOnlySafe && !safeTx) {
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

            if (IsLockedCoin(outpoint)) {
                continue;
            }

            if (IsSpent(outpoint)) {
                continue;
            }

            isminetype mine = IsMine(wtx.tx->vout[i]);

            if (mine == ISMINE_NO) {
                continue;
            }

            if (!allow_used_addresses && IsSpentKey(wtxid, i)) {
                continue;
            }

            std::unique_ptr<SigningProvider> provider =
                GetSolvingProvider(wtx.tx->vout[i].scriptPubKey);

            bool solvable =
                provider ? IsSolvable(*provider, wtx.tx->vout[i].scriptPubKey)
                         : false;
            bool spendable =
                ((mine & ISMINE_SPENDABLE) != ISMINE_NO) ||
                (((mine & ISMINE_WATCH_ONLY) != ISMINE_NO) &&
                 (coinControl && coinControl->fAllowWatchOnly && solvable));

            vCoins.push_back(
                COutput(&wtx, i, nDepth, spendable, solvable, safeTx,
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

Amount CWallet::GetAvailableBalance(const CCoinControl *coinControl) const {
    LOCK(cs_wallet);

    Amount balance = Amount::zero();
    std::vector<COutput> vCoins;
    AvailableCoins(vCoins, true, coinControl);
    for (const COutput &out : vCoins) {
        if (out.fSpendable) {
            balance += out.tx->tx->vout[out.i].nValue;
        }
    }
    return balance;
}

const CTxOut &CWallet::FindNonChangeParentOutput(const CTransaction &tx,
                                                 int output) const {
    AssertLockHeld(cs_wallet);
    const CTransaction *ptx = &tx;
    int n = output;
    while (IsChange(ptx->vout[n]) && ptx->vin.size() > 0) {
        const COutPoint &prevout = ptx->vin[0].prevout;
        auto it = mapWallet.find(prevout.GetTxId());
        if (it == mapWallet.end() ||
            it->second.tx->vout.size() <= prevout.GetN() ||
            !IsMine(it->second.tx->vout[prevout.GetN()])) {
            break;
        }
        ptx = it->second.tx.get();
        n = prevout.GetN();
    }
    return ptx->vout[n];
}

std::map<CTxDestination, std::vector<COutput>> CWallet::ListCoins() const {
    AssertLockHeld(cs_wallet);

    std::map<CTxDestination, std::vector<COutput>> result;
    std::vector<COutput> availableCoins;

    AvailableCoins(availableCoins);

    for (const auto &coin : availableCoins) {
        CTxDestination address;
        if ((coin.fSpendable ||
             (IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS) &&
              coin.fSolvable)) &&
            ExtractDestination(
                FindNonChangeParentOutput(*coin.tx->tx, coin.i).scriptPubKey,
                address)) {
            result[address].emplace_back(std::move(coin));
        }
    }

    std::vector<COutPoint> lockedCoins;
    ListLockedCoins(lockedCoins);
    // Include watch-only for LegacyScriptPubKeyMan wallets without private keys
    const bool include_watch_only =
        GetLegacyScriptPubKeyMan() &&
        IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS);
    const isminetype is_mine_filter =
        include_watch_only ? ISMINE_WATCH_ONLY : ISMINE_SPENDABLE;
    for (const auto &output : lockedCoins) {
        auto it = mapWallet.find(output.GetTxId());
        if (it != mapWallet.end()) {
            int depth = it->second.GetDepthInMainChain();
            if (depth >= 0 && output.GetN() < it->second.tx->vout.size() &&
                IsMine(it->second.tx->vout[output.GetN()]) == is_mine_filter) {
                CTxDestination address;
                if (ExtractDestination(
                        FindNonChangeParentOutput(*it->second.tx, output.GetN())
                            .scriptPubKey,
                        address)) {
                    result[address].emplace_back(
                        &it->second, output.GetN(), depth, true /* spendable */,
                        true /* solvable */, false /* safe */);
                }
            }
        }
    }

    return result;
}

std::vector<OutputGroup>
CWallet::GroupOutputs(const std::vector<COutput> &outputs, bool single_coin,
                      const size_t max_ancestors) const {
    std::vector<OutputGroup> groups;
    std::map<CTxDestination, OutputGroup> gmap;
    std::set<CTxDestination> full_groups;

    for (const auto &output : outputs) {
        if (output.fSpendable) {
            CTxDestination dst;
            CInputCoin input_coin = output.GetInputCoin();

            size_t ancestors, descendants;
            chain().getTransactionAncestry(output.tx->GetId(), ancestors,
                                           descendants);
            if (!single_coin &&
                ExtractDestination(output.tx->tx->vout[output.i].scriptPubKey,
                                   dst)) {
                auto it = gmap.find(dst);
                if (it != gmap.end()) {
                    // Limit output groups to no more than
                    // OUTPUT_GROUP_MAX_ENTRIES number of entries, to protect
                    // against inadvertently creating a too-large transaction
                    // when using -avoidpartialspends to prevent breaking
                    // consensus or surprising users with a very high amount of
                    // fees.
                    if (it->second.m_outputs.size() >=
                        OUTPUT_GROUP_MAX_ENTRIES) {
                        groups.push_back(it->second);
                        it->second = OutputGroup{};
                        full_groups.insert(dst);
                    }
                    it->second.Insert(input_coin, output.nDepth,
                                      output.tx->IsFromMe(ISMINE_ALL),
                                      ancestors, descendants);
                } else {
                    gmap[dst].Insert(input_coin, output.nDepth,
                                     output.tx->IsFromMe(ISMINE_ALL), ancestors,
                                     descendants);
                }
            } else {
                groups.emplace_back(input_coin, output.nDepth,
                                    output.tx->IsFromMe(ISMINE_ALL), ancestors,
                                    descendants);
            }
        }
    }
    if (!single_coin) {
        for (auto &it : gmap) {
            auto &group = it.second;
            if (full_groups.count(it.first) > 0) {
                // Make this unattractive as we want coin selection to avoid it
                // if possible
                group.m_ancestors = max_ancestors - 1;
            }
            groups.push_back(group);
        }
    }
    return groups;
}

bool CWallet::SelectCoinsMinConf(
    const Amount nTargetValue, const CoinEligibilityFilter &eligibility_filter,
    std::vector<OutputGroup> groups, std::set<CInputCoin> &setCoinsRet,
    Amount &nValueRet, const CoinSelectionParams &coin_selection_params,
    bool &bnb_used) const {
    setCoinsRet.clear();
    nValueRet = Amount::zero();

    std::vector<OutputGroup> utxo_pool;
    if (coin_selection_params.use_bnb) {
        // Get long term estimate
        CCoinControl temp;
        temp.m_confirm_target = 1008;
        CFeeRate long_term_feerate = GetMinimumFeeRate(*this, temp);

        // Calculate cost of change
        Amount cost_of_change = chain().relayDustFee().GetFee(
                                    coin_selection_params.change_spend_size) +
                                coin_selection_params.effective_fee.GetFee(
                                    coin_selection_params.change_output_size);

        // Filter by the min conf specs and add to utxo_pool and calculate
        // effective value
        for (OutputGroup &group : groups) {
            if (!group.EligibleForSpending(eligibility_filter)) {
                continue;
            }

            if (coin_selection_params.m_subtract_fee_outputs) {
                // Set the effective feerate to 0 as we don't want to use the
                // effective value since the fees will be deducted from the
                // output
                group.SetFees(CFeeRate(Amount::zero()) /* effective_feerate */,
                              long_term_feerate);
            } else {
                group.SetFees(coin_selection_params.effective_fee,
                              long_term_feerate);
            }

            OutputGroup pos_group = group.GetPositiveOnlyGroup();
            if (pos_group.effective_value > Amount::zero()) {
                utxo_pool.push_back(pos_group);
            }
        }
        // Calculate the fees for things that aren't inputs
        Amount not_input_fees = coin_selection_params.effective_fee.GetFee(
            coin_selection_params.tx_noinputs_size);
        bnb_used = true;
        return SelectCoinsBnB(utxo_pool, nTargetValue, cost_of_change,
                              setCoinsRet, nValueRet, not_input_fees);
    } else {
        // Filter by the min conf specs and add to utxo_pool
        for (const OutputGroup &group : groups) {
            if (!group.EligibleForSpending(eligibility_filter)) {
                continue;
            }
            utxo_pool.push_back(group);
        }
        bnb_used = false;
        return KnapsackSolver(nTargetValue, utxo_pool, setCoinsRet, nValueRet);
    }
}

bool CWallet::SelectCoins(const std::vector<COutput> &vAvailableCoins,
                          const Amount nTargetValue,
                          std::set<CInputCoin> &setCoinsRet, Amount &nValueRet,
                          const CCoinControl &coin_control,
                          CoinSelectionParams &coin_selection_params,
                          bool &bnb_used) const {
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
            mapWallet.find(outpoint.GetTxId());
        if (it != mapWallet.end()) {
            const CWalletTx &wtx = it->second;
            // Clearly invalid input, fail
            if (wtx.tx->vout.size() <= outpoint.GetN()) {
                return false;
            }
            // Just to calculate the marginal byte size
            CInputCoin coin(wtx.tx, outpoint.GetN(),
                            wtx.GetSpendSize(outpoint.GetN(), false));
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

    size_t max_ancestors{0};
    size_t max_descendants{0};
    chain().getPackageLimits(max_ancestors, max_descendants);
    bool fRejectLongChains = gArgs.GetBoolArg(
        "-walletrejectlongchains", DEFAULT_WALLET_REJECT_LONG_CHAINS);

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

    std::vector<OutputGroup> groups = GroupOutputs(
        vCoins, !coin_control.m_avoid_partial_spends, max_ancestors);

    bool res =
        value_to_select <= Amount::zero() ||
        SelectCoinsMinConf(value_to_select, CoinEligibilityFilter(1, 6, 0),
                           groups, setCoinsRet, nValueRet,
                           coin_selection_params, bnb_used) ||
        SelectCoinsMinConf(value_to_select, CoinEligibilityFilter(1, 1, 0),
                           groups, setCoinsRet, nValueRet,
                           coin_selection_params, bnb_used) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(value_to_select, CoinEligibilityFilter(0, 1, 2),
                            groups, setCoinsRet, nValueRet,
                            coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(
             value_to_select,
             CoinEligibilityFilter(0, 1, std::min((size_t)4, max_ancestors / 3),
                                   std::min((size_t)4, max_descendants / 3)),
             groups, setCoinsRet, nValueRet, coin_selection_params,
             bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(value_to_select,
                            CoinEligibilityFilter(0, 1, max_ancestors / 2,
                                                  max_descendants / 2),
                            groups, setCoinsRet, nValueRet,
                            coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change &&
         SelectCoinsMinConf(value_to_select,
                            CoinEligibilityFilter(0, 1, max_ancestors - 1,
                                                  max_descendants - 1),
                            groups, setCoinsRet, nValueRet,
                            coin_selection_params, bnb_used)) ||
        (m_spend_zero_conf_change && !fRejectLongChains &&
         SelectCoinsMinConf(
             value_to_select,
             CoinEligibilityFilter(0, 1, std::numeric_limits<uint64_t>::max()),
             groups, setCoinsRet, nValueRet, coin_selection_params, bnb_used));

    // Because SelectCoinsMinConf clears the setCoinsRet, we now add the
    // possible inputs to the coinset.
    util::insert(setCoinsRet, setPresetCoins);

    // Add preset inputs to the total value selected.
    nValueRet += nValueFromPresetInputs;

    return res;
}

static bool IsCurrentForAntiFeeSniping(interfaces::Chain &chain,
                                       const BlockHash &block_hash) {
    if (chain.isInitialBlockDownload()) {
        return false;
    }

    // in seconds
    constexpr int64_t MAX_ANTI_FEE_SNIPING_TIP_AGE = 8 * 60 * 60;
    int64_t block_time;
    CHECK_NONFATAL(chain.findBlock(block_hash, FoundBlock().time(block_time)));
    if (block_time < (GetTime() - MAX_ANTI_FEE_SNIPING_TIP_AGE)) {
        return false;
    }
    return true;
}

/**
 * Return a height-based locktime for new transactions (uses the height of the
 * current chain tip unless we are not synced with the current chain
 */
static uint32_t GetLocktimeForNewTransaction(interfaces::Chain &chain,
                                             const BlockHash &block_hash,
                                             int block_height) {
    uint32_t locktime;
    // Discourage fee sniping.
    //
    // For a large miner the value of the transactions in the best block and
    // the mempool can exceed the cost of deliberately attempting to mine two
    // blocks to orphan the current best block. By setting nLockTime such that
    // only the next block can include the transaction, we discourage this
    // practice as the height restricted and limited blocksize gives miners
    // considering fee sniping fewer options for pulling off this attack.
    //
    // A simple way to think about this is from the wallet's point of view we
    // always want the blockchain to move forward. By setting nLockTime this
    // way we're basically making the statement that we only want this
    // transaction to appear in the next block; we don't want to potentially
    // encourage reorgs by allowing transactions to appear at lower heights
    // than the next block in forks of the best chain.
    //
    // Of course, the subsidy is high enough, and transaction volume low
    // enough, that fee sniping isn't a problem yet, but by implementing a fix
    // now we ensure code won't be written that makes assumptions about
    // nLockTime that preclude a fix later.
    if (IsCurrentForAntiFeeSniping(chain, block_hash)) {
        locktime = block_height;

        // Secondly occasionally randomly pick a nLockTime even further back, so
        // that transactions that are delayed after signing for whatever reason,
        // e.g. high-latency mix networks and some CoinJoin implementations,
        // have better privacy.
        if (GetRandInt(10) == 0) {
            locktime = std::max(0, int(locktime) - GetRandInt(100));
        }
    } else {
        // If our chain is lagging behind, we can't discourage fee sniping nor
        // help the privacy of high-latency transactions. To avoid leaking a
        // potentially unique "nLockTime fingerprint", set nLockTime to a
        // constant.
        locktime = 0;
    }
    assert(locktime < LOCKTIME_THRESHOLD);
    return locktime;
}

bool CWallet::CreateTransactionInternal(const std::vector<CRecipient> &vecSend,
                                        CTransactionRef &tx, Amount &nFeeRet,
                                        int &nChangePosInOut,
                                        bilingual_str &error,
                                        const CCoinControl &coin_control,
                                        bool sign) {
    Amount nValue = Amount::zero();
    const OutputType change_type = TransactionChangeType(
        coin_control.m_change_type ? *coin_control.m_change_type
                                   : m_default_change_type,
        vecSend);
    ReserveDestination reservedest(this, change_type);
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
        LOCK(cs_wallet);
        txNew.nLockTime = GetLocktimeForNewTransaction(
            chain(), GetLastBlockHash(), GetLastBlockHeight());
        std::vector<COutput> vAvailableCoins;
        AvailableCoins(vAvailableCoins, true, &coin_control);
        // Parameters for coin selection, init with dummy
        CoinSelectionParams coin_selection_params;

        // Create change script that will be used if we need change
        // TODO: pass in scriptChange instead of reservedest so
        // change transaction isn't always pay-to-bitcoin-address
        CScript scriptChange;

        // coin control: send change to custom address
        if (!boost::get<CNoDestination>(&coin_control.destChange)) {
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
        CFeeRate nFeeRateNeeded = GetMinimumFeeRate(*this, coin_control);
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

                if (IsDust(txout, chain().relayDustFee())) {
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
                    change_prototype_txout, this);
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
                if (!SelectCoins(vAvailableCoins, nValueToSelect, setCoins,
                                 nValueIn, coin_control, coin_selection_params,
                                 bnb_used)) {
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
                if (IsDust(newTxOut, chain().relayDustFee()) || bnb_used) {
                    nChangePosInOut = -1;
                    nFeeRet += nChange;
                } else {
                    if (nChangePosInOut == -1) {
                        // Insert change txn at random position:
                        nChangePosInOut = GetRandInt(txNew.vout.size() + 1);
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
                txNewConst, this, coin_control.fAllowWatchOnly);
            if (nBytes < 0) {
                error = _("Signing transaction failed");
                return false;
            }

            Amount nFeeNeeded = GetMinimumFee(*this, nBytes, coin_control);

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
                    Amount fee_needed_with_change =
                        GetMinimumFee(*this, tx_size_with_change, coin_control);
                    Amount minimum_value_for_change = GetDustThreshold(
                        change_prototype_txout, chain().relayDustFee());
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

        if (sign && !SignTransaction(txNew)) {
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

    if (nFeeRet > m_default_max_tx_fee) {
        error = TransactionErrorString(TransactionError::MAX_FEE_EXCEEDED);
        return false;
    }

    if (gArgs.GetBoolArg("-walletrejectlongchains",
                         DEFAULT_WALLET_REJECT_LONG_CHAINS)) {
        // Lastly, ensure this tx will pass the mempool's chain limits
        if (!chain().checkChainLimits(tx)) {
            error = _("Transaction has too long of a mempool chain");
            return false;
        }
    }

    // Before we return success, we assume any change key will be used to
    // prevent accidental re-use.
    reservedest.KeepDestination();

    return true;
}

bool CWallet::CreateTransaction(const std::vector<CRecipient> &vecSend,
                                CTransactionRef &tx, Amount &nFeeRet,
                                int &nChangePosInOut, bilingual_str &error,
                                const CCoinControl &coin_control, bool sign) {
    int nChangePosIn = nChangePosInOut;
    CTransactionRef tx2 = tx;
    bool res = CreateTransactionInternal(vecSend, tx, nFeeRet, nChangePosInOut,
                                         error, coin_control, sign);
    // try with avoidpartialspends unless it's enabled already
    if (res &&
        nFeeRet >
            Amount::zero() /* 0 means non-functional fee rate estimation */
        && m_max_aps_fee > (-1 * SATOSHI) &&
        !coin_control.m_avoid_partial_spends) {
        CCoinControl tmp_cc = coin_control;
        tmp_cc.m_avoid_partial_spends = true;
        Amount nFeeRet2;
        int nChangePosInOut2 = nChangePosIn;
        // fired and forgotten; if an error occurs, we discard the results
        bilingual_str error2;
        if (CreateTransactionInternal(vecSend, tx2, nFeeRet2, nChangePosInOut2,
                                      error2, tmp_cc, sign)) {
            // if fee of this alternative one is within the range of the max
            // fee, we use this one
            const bool use_aps = nFeeRet2 <= nFeeRet + m_max_aps_fee;
            WalletLogPrintf(
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

bool CWallet::FundTransaction(CMutableTransaction &tx, Amount &nFeeRet,
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
    LOCK(cs_wallet);

    CTransactionRef tx_new;
    if (!CreateTransaction(vecSend, tx_new, nFeeRet, nChangePosInOut, error,
                           coinControl, false)) {
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
            LockCoin(txin.prevout);
        }
    }

    return true;
}
