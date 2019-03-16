// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once
#include "amount.h"
#include "consensus/consensus.h"
Amount CalculateReward(const Consensus::Params &consensusParams, int Height, int HeightDiff, Amount balance);
