// Copyright (c) 2017 IOP Developers 
// Copyright (c) 2019 DeVault Developers 
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once

#include "chain.h"
#include "config.h"
#include "dbwrapper.h"

/** The currently-connected chain of blocks (protected by cs_main). */
extern CChain chainActive;

class CMinerWhitelistDB : CDBWrapper 
{
public:
    CMinerWhitelistDB(size_t nCacheSize, bool fMemory, bool fWipe);
    bool Init(const Config& config, bool fWipe);

    enum WhitelistAction {ADD_MINER, REMOVE_MINER, ENABLE_CAP, DISABLE_CAP, NONE};
    
    // Cap management
    bool EnableCap(unsigned int factor);
    bool RevertCap();
    
    bool DisableCap();
    bool IsCapEnabled();
    bool IsWhitelistEnabled();
    
    // Statistics
    unsigned int GetCapFactor();
    unsigned int GetNumberOfWhitelistedMiners();
    unsigned int GetAvgBlocksPerMiner();
    unsigned int GetCap();
    bool DumpWindowStats(std::vector<std::pair<std::string, uint32_t>> *MinerVector);
    
    // Managing Whitelist
    bool WhitelistMiner(std::string address);
    bool BlacklistMiner(std::string address);
    bool RevertWhitelistMiner(std::string address);
    bool RevertBlacklistMiner(std::string address);
    bool ExistMiner(std::string address);
    bool isWhitelisted(std::string address);
    
    unsigned int GetLastBlock(std::string address);
    unsigned int GetTotalBlocks(std::string address);
    unsigned int GetBlocksInWindow(std::string address);
    unsigned int GetWindowStart(unsigned int height);
    bool hasExceededCap(std::string address);

    // Managing Cap

    bool MineBlock(const Config& config, unsigned int index, std::string address);
    bool RewindBlock(const Config& config, unsigned int index);
    std::string getMinerforBlock(unsigned int index);
    bool DumpStatsForMiner(std::string address, bool *wlisted, unsigned int *windowCoins, unsigned int *totalCoins, unsigned int *lastBlock);
    bool DumpFullStatsForMiner(std::string address, bool *wlisted, unsigned int *windowCoins, unsigned int *totalCoins, std::vector<unsigned int> &lastBlocks);
    
    
    using CDBWrapper::Sync;

  
};

