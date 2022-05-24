// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/coinselection.h>

#include <common/system.h>
#include <consensus/amount.h>
#include <feerate.h>
#include <logging.h>
#include <util/insert.h>
#include <util/moneystr.h>

#include <optional>

// Descending order comparator
struct {
    bool operator()(const OutputGroup &a, const OutputGroup &b) const {
        return a.effective_value > b.effective_value;
    }
} descending;

static const size_t TOTAL_TRIES = 100000;

/**
 * This is the Branch and Bound Coin Selection algorithm designed by Murch. It
 * searches for an input set that can pay for the spending target and does not
 * exceed the spending target by more than the cost of creating and spending a
 * change output. The algorithm uses a depth-first search on a binary tree. In
 * the binary tree, each node corresponds to the inclusion or the omission of a
 * UTXO. UTXOs are sorted by their effective values and the trees is explored
 * deterministically per the inclusion branch first. At each node, the algorithm
 * checks whether the selection is within the target range. While the selection
 * has not reached the target range, more UTXOs are included. When a selection's
 * value exceeds the target range, the complete subtree deriving from this
 * selection can be omitted. At that point, the last included UTXO is deselected
 * and the corresponding omission branch explored instead. The search ends after
 * the complete tree has been searched or after a limited number of tries.
 *
 * The search continues to search for better solutions after one solution has
 * been found. The best solution is chosen by minimizing the waste metric. The
 * waste metric is defined as the cost to spend the current inputs at the given
 * fee rate minus the long term expected cost to spend the inputs, plus the
 * amount the selection exceeds the spending target:
 *
 * waste = selectionTotal - target + inputs × (currentFeeRate - longTermFeeRate)
 *
 * The algorithm uses two additional optimizations. A lookahead keeps track of
 * the total value of the unexplored UTXOs. A subtree is not explored if the
 * lookahead indicates that the target range cannot be reached. Further, it is
 * unnecessary to test equivalent combinations. This allows us to skip testing
 * the inclusion of UTXOs that match the effective value and waste of an omitted
 * predecessor.
 *
 * The Branch and Bound algorithm is described in detail in Murch's Master
 * Thesis:
 * https://murch.one/wp-content/uploads/2016/11/erhardt2016coinselection.pdf
 *
 * @param utxo_pool The set of UTXOs that we are choosing from. These UTXOs will
 *     be sorted in descending order by effective value and the CInputCoins'
 *     values are their effective values.
 * @param target_value This is the value that we want to select.
 *     It is the lower bound of the range.
 * @param cost_of_change This is the cost of creating and spending a change
 *     output. This plus target_value is the upper bound of the range.
 * @param out_set This is an output parameter for the set of CInputCoins that
 *     have been selected.
 * @param value_ret This is an output parameter for the total value of the
 *     CInputCoins that were selected.
 * @param not_input_fees -> The fees that need to be paid for the outputs and
 *     fixed size overhead (version, locktime, marker and flag)
 */
bool SelectCoinsBnB(std::vector<OutputGroup> &utxo_pool,
                    const Amount &target_value, const Amount &cost_of_change,
                    std::set<CInputCoin> &out_set, Amount &value_ret,
                    const Amount not_input_fees) {
    out_set.clear();
    Amount curr_value = Amount::zero();

    // select the utxo at this index
    std::vector<bool> curr_selection;
    curr_selection.reserve(utxo_pool.size());
    Amount actual_target = not_input_fees + target_value;

    // Calculate curr_available_value
    Amount curr_available_value = Amount::zero();
    for (const OutputGroup &utxo : utxo_pool) {
        // Assert that this utxo is not negative. It should never be negative,
        // effective value calculation should have removed it
        assert(utxo.effective_value > Amount::zero());
        curr_available_value += utxo.effective_value;
    }
    if (curr_available_value < actual_target) {
        return false;
    }

    // Sort the utxo_pool
    std::sort(utxo_pool.begin(), utxo_pool.end(), descending);

    Amount curr_waste = Amount::zero();
    std::vector<bool> best_selection;
    Amount best_waste = MAX_MONEY;

    // Depth First search loop for choosing the UTXOs
    for (size_t i = 0; i < TOTAL_TRIES; ++i) {
        // Conditions for starting a backtrack
        bool backtrack = false;
        if (curr_value + curr_available_value <
                actual_target || // Cannot possibly reach target with the amount
                                 // remaining in the curr_available_value.
            curr_value >
                actual_target +
                    cost_of_change || // Selected value is out of range, go back
                                      // and try other branch
            (curr_waste > best_waste &&
             (utxo_pool.at(0).fee - utxo_pool.at(0).long_term_fee) >
                 Amount::zero())) {
            // Don't select things which we know will be more wasteful if the
            // waste is increasing
            backtrack = true;
        }

        // Selected value is within range
        else if (curr_value >= actual_target) {
            // This is the excess value which is added to the waste for the
            // below comparison. Adding another UTXO after this check could
            // bring the waste down if the long term fee is higher than the
            // current fee. However we are not going to explore that because
            // this optimization for the waste is only done when we have hit our
            // target value. Adding any more UTXOs will be just burning the
            // UTXO; it will go entirely to fees. Thus we aren't going to
            // explore any more UTXOs to avoid burning money like that.
            curr_waste += (curr_value - actual_target);

            if (curr_waste <= best_waste) {
                best_selection = curr_selection;
                best_selection.resize(utxo_pool.size());
                best_waste = curr_waste;
                if (best_waste == Amount::zero()) {
                    break;
                }
            }
            // Remove the excess value as we will be selecting different coins
            // now
            curr_waste -= (curr_value - actual_target);
            backtrack = true;
        }

        // Backtracking, moving backwards
        if (backtrack) {
            // Walk backwards to find the last included UTXO that still needs to
            // have its omission branch traversed.
            while (!curr_selection.empty() && !curr_selection.back()) {
                curr_selection.pop_back();
                curr_available_value +=
                    utxo_pool.at(curr_selection.size()).effective_value;
            }

            if (curr_selection.empty()) {
                // We have walked back to the first utxo and no branch is
                // untraversed. All solutions searched
                break;
            }

            // Output was included on previous iterations, try excluding now.
            curr_selection.back() = false;
            OutputGroup &utxo = utxo_pool.at(curr_selection.size() - 1);
            curr_value -= utxo.effective_value;
            curr_waste -= utxo.fee - utxo.long_term_fee;
        }

        // Moving forwards, continuing down this branch
        else {
            OutputGroup &utxo = utxo_pool.at(curr_selection.size());

            // Remove this utxo from the curr_available_value utxo amount
            curr_available_value -= utxo.effective_value;

            // Avoid searching a branch if the previous UTXO has the same value
            // and same waste and was excluded. Since the ratio of fee to long
            // term fee is the same, we only need to check if one of those
            // values match in order to know that the waste is the same.
            if (!curr_selection.empty() && !curr_selection.back() &&
                utxo.effective_value ==
                    utxo_pool.at(curr_selection.size() - 1).effective_value &&
                utxo.fee == utxo_pool.at(curr_selection.size() - 1).fee) {
                curr_selection.push_back(false);
            } else {
                // Inclusion branch first (Largest First Exploration)
                curr_selection.push_back(true);
                curr_value += utxo.effective_value;
                curr_waste += utxo.fee - utxo.long_term_fee;
            }
        }
    }

    // Check for solution
    if (best_selection.empty()) {
        return false;
    }

    // Set output set
    value_ret = Amount::zero();
    for (size_t i = 0; i < best_selection.size(); ++i) {
        if (best_selection.at(i)) {
            util::insert(out_set, utxo_pool.at(i).m_outputs);
            value_ret += utxo_pool.at(i).m_value;
        }
    }

    return true;
}

static void ApproximateBestSubset(const std::vector<OutputGroup> &groups,
                                  const Amount &nTotalLower,
                                  const Amount &nTargetValue,
                                  std::vector<char> &vfBest, Amount &nBest,
                                  int iterations = 1000) {
    std::vector<char> vfIncluded;

    vfBest.assign(groups.size(), true);
    nBest = nTotalLower;

    FastRandomContext insecure_rand;

    for (int nRep = 0; nRep < iterations && nBest != nTargetValue; nRep++) {
        vfIncluded.assign(groups.size(), false);
        Amount nTotal = Amount::zero();
        bool fReachedTarget = false;
        for (int nPass = 0; nPass < 2 && !fReachedTarget; nPass++) {
            for (size_t i = 0; i < groups.size(); i++) {
                // The solver here uses a randomized algorithm, the randomness
                // serves no real security purpose but is just needed to prevent
                // degenerate behavior and it is important that the rng is fast.
                // We do not use a constant random sequence, because there may
                // be some privacy improvement by making the selection random.
                if (nPass == 0 ? insecure_rand.randbool() : !vfIncluded[i]) {
                    nTotal += groups[i].m_value;
                    vfIncluded[i] = true;
                    if (nTotal >= nTargetValue) {
                        fReachedTarget = true;
                        if (nTotal < nBest) {
                            nBest = nTotal;
                            vfBest = vfIncluded;
                        }

                        nTotal -= groups[i].m_value;
                        vfIncluded[i] = false;
                    }
                }
            }
        }
    }
}

bool KnapsackSolver(const Amount nTargetValue, std::vector<OutputGroup> &groups,
                    std::set<CInputCoin> &setCoinsRet, Amount &nValueRet) {
    setCoinsRet.clear();
    nValueRet = Amount::zero();

    // List of values less than target
    std::optional<OutputGroup> lowest_larger;
    std::vector<OutputGroup> applicable_groups;
    Amount nTotalLower = Amount::zero();

    Shuffle(groups.begin(), groups.end(), FastRandomContext());

    for (const OutputGroup &group : groups) {
        if (group.m_value == nTargetValue) {
            util::insert(setCoinsRet, group.m_outputs);
            nValueRet += group.m_value;
            return true;
        } else if (group.m_value < nTargetValue + MIN_CHANGE) {
            applicable_groups.push_back(group);
            nTotalLower += group.m_value;
        } else if (!lowest_larger || group.m_value < lowest_larger->m_value) {
            lowest_larger = group;
        }
    }

    if (nTotalLower == nTargetValue) {
        for (const auto &group : applicable_groups) {
            util::insert(setCoinsRet, group.m_outputs);
            nValueRet += group.m_value;
        }
        return true;
    }

    if (nTotalLower < nTargetValue) {
        if (!lowest_larger) {
            return false;
        }
        util::insert(setCoinsRet, lowest_larger->m_outputs);
        nValueRet += lowest_larger->m_value;
        return true;
    }

    // Solve subset sum by stochastic approximation
    std::sort(applicable_groups.begin(), applicable_groups.end(), descending);
    std::vector<char> vfBest;
    Amount nBest;

    ApproximateBestSubset(applicable_groups, nTotalLower, nTargetValue, vfBest,
                          nBest);
    if (nBest != nTargetValue && nTotalLower >= nTargetValue + MIN_CHANGE) {
        ApproximateBestSubset(applicable_groups, nTotalLower,
                              nTargetValue + MIN_CHANGE, vfBest, nBest);
    }

    // If we have a bigger coin and (either the stochastic approximation didn't
    // find a good solution, or the next bigger coin is closer), return the
    // bigger coin
    if (lowest_larger &&
        ((nBest != nTargetValue && nBest < nTargetValue + MIN_CHANGE) ||
         lowest_larger->m_value <= nBest)) {
        util::insert(setCoinsRet, lowest_larger->m_outputs);
        nValueRet += lowest_larger->m_value;
    } else {
        for (size_t i = 0; i < applicable_groups.size(); i++) {
            if (vfBest[i]) {
                util::insert(setCoinsRet, applicable_groups[i].m_outputs);
                nValueRet += applicable_groups[i].m_value;
            }
        }

        if (LogAcceptCategory(BCLog::SELECTCOINS, BCLog::Level::Debug)) {
            /* Continued */
            LogPrintToBeContinued(BCLog::SELECTCOINS,
                                  "SelectCoins() best subset: ");
            for (size_t i = 0; i < applicable_groups.size(); i++) {
                if (vfBest[i]) {
                    /* Continued */
                    LogPrintToBeContinued(
                        BCLog::SELECTCOINS, "%s ",
                        FormatMoney(applicable_groups[i].m_value));
                }
            }
            LogPrint(BCLog::SELECTCOINS, "total %s\n", FormatMoney(nBest));
        }
    }

    return true;
}

/******************************************************************************

 OutputGroup

 ******************************************************************************/

void OutputGroup::Insert(const CInputCoin &output, int depth, bool from_me,
                         bool positive_only) {
    // Compute the effective value first
    const Amount coin_fee =
        output.m_input_bytes < 0
            ? Amount::zero()
            : m_effective_feerate.GetFee(output.m_input_bytes);
    const Amount ev = output.txout.nValue - coin_fee;

    // Filter for positive only here before adding the coin
    if (positive_only && ev <= Amount::zero()) {
        return;
    }

    m_outputs.push_back(output);
    CInputCoin &coin = m_outputs.back();

    coin.m_fee = coin_fee;
    fee += coin.m_fee;

    coin.m_long_term_fee = coin.m_input_bytes < 0
                               ? Amount::zero()
                               : m_long_term_feerate.GetFee(coin.m_input_bytes);
    long_term_fee += coin.m_long_term_fee;

    coin.effective_value = ev;
    effective_value += coin.effective_value;

    m_from_me &= from_me;
    m_value += output.txout.nValue;
    m_depth = std::min(m_depth, depth);
}

bool OutputGroup::EligibleForSpending(
    const CoinEligibilityFilter &eligibility_filter) const {
    return m_depth >= (m_from_me ? eligibility_filter.conf_mine
                                 : eligibility_filter.conf_theirs);
}
