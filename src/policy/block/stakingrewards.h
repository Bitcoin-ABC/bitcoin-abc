// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H
#define BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H

struct Amount;

Amount GetStakingRewardsAmount(const Amount &coinbaseValue);

#endif // BITCOIN_POLICY_BLOCK_STAKINGREWARDS_H
