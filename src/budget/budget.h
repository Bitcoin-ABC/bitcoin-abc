// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include "amount.h"
#include "script/script.h"
#include <cstdint>

class CTransaction;
class Config;
class CBlock;
class CMutableTransaction;

class CBudget {

  private:
    std::unique_ptr<CScript []> Scripts;
    std::unique_ptr<Amount []> nPayment;

    int64_t nBlocksPerPeriod;
    bool fTestNet;
    
  public:
    CBudget(const Config &config);
    // Superblock is once/month
    bool IsSuperBlock(int nBlockHeight) { return (nBlockHeight % nBlocksPerPeriod == 0); }
    Amount CalculateSuperBlockRewards(int nBlockHeight, const Amount &nOverallReward);
    bool CheckBudgetTransaction(const int nHeight, const CTransaction &tx);
    bool Validate(const CBlock &block, int nHeight, const Amount& BlockRewrd, Amount& nSumReward);
    bool FillPayments(CMutableTransaction &txNew, int nHeight, const Amount &nOverallReward);
};
