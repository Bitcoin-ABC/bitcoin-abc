// Copyright (c) 2017 IOP Ventures LLC
// Copyright (c) 2019 DeVault Developers 
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "minerwhitelist.h"
#include "chain.h"
#include "util.h"
#include "consensus/consensus.h"
#include "chainparams.h"
#include <unordered_map>

// CChain chainActive;

static const std::string DUMMY = "0000"; 

static const char WL_FACTOR  = 'f';
static const char WL_WINDOW_LENGTH  = 'w';
static const char WL_CAP_ENABLED = 'e';
static const char WL_NUMBER_MINERS = 'N';
static const char WL_ADDRESS = 'a';

static const char DB_HEIGHT = 'h';
static const char DB_BLOCK   = 'b';
static const char DB_INIT  = 'I';
// static const char DB_REINDEX_FLAG = 'R';


namespace {
    struct BlockEntry {
        char key;
        unsigned int index;
        BlockEntry(): key(DB_BLOCK), index(0) {}
        BlockEntry(unsigned int bindex) : key(DB_BLOCK), index(bindex) {}
        
        template<typename Stream>
        void Serialize(Stream &s) const {
            s << key;
            s << index;
        }
        
        template<typename Stream>
        void Unserialize(Stream& s) {
            s >> key;
            s >> index;
        }
    };

    struct BlockDetails {
        bool minedUnderCap;
        std::string miner;
        unsigned int prevFactor;
        BlockDetails(): minedUnderCap(false), miner(DUMMY), prevFactor(0) {}
        BlockDetails(std::string min, bool enabled, unsigned int prevFactor) : minedUnderCap(enabled), miner(min), prevFactor(prevFactor) {}

        template<typename Stream>
        void Serialize(Stream &s) const {
            s << miner;
            s << minedUnderCap;
            s << prevFactor;
        }
        
        template<typename Stream>
        void Unserialize(Stream& s) {
            s >> miner;
            s >> minedUnderCap;
            s >> prevFactor;
        }

    };

    struct MinerEntry {
        char key;
        std::string addr;
        MinerEntry() : key(WL_ADDRESS), addr(DUMMY) {}
      //MinerEntry(CDeVaultAddress address) : key(WL_ADDRESS), addr(address.ToString()) {}
        MinerEntry(std::string address) : key(WL_ADDRESS), addr(address) {}
        
        template<typename Stream>
        void Serialize(Stream &s) const {
            s << key;
            s << addr;
        }
        
        template<typename Stream>
        void Unserialize(Stream& s) {
            s >> key;
            s >> addr;
        }
    };

    struct MinerDetails {
        bool whitelisted;
        int wlcount;
        bool isAdmin;
        unsigned int totalBlocks;
        unsigned int windowBlocks;
        std::vector<unsigned int> blockVector;
        MinerDetails() : whitelisted(false), wlcount(0), isAdmin(false), totalBlocks(0), windowBlocks(0) {}
        MinerDetails(bool wlisted, bool isAdmin) : whitelisted(wlisted), wlcount(1), isAdmin(isAdmin), totalBlocks(0), windowBlocks(0) {}

        template<typename Stream>
        void Serialize(Stream &s) const {
            s << whitelisted;
            s << wlcount;
            s << totalBlocks;
            s << windowBlocks;
            s << blockVector;
        }
        
        template<typename Stream>
        void Unserialize(Stream& s) {
            s >> whitelisted;
            s >> wlcount;
            s >> totalBlocks;
            s >> windowBlocks;
            s >> blockVector;
        }
    };
}


CMinerWhitelistDB::CMinerWhitelistDB(size_t nCacheSize, bool fMemory, bool fWipe) : CDBWrapper(GetDataDir() / "minerwhitelist", nCacheSize, fMemory, fWipe) 
{
}


bool CMinerWhitelistDB::Init(const Config& config, bool fWipe){
  const Consensus::Params &consensusParams = config.GetChainParams().GetConsensus();

    bool init;
    if(fWipe || Read(DB_INIT,init)==false || init==false ) {
        LogPrintf("MinerDatabase: Create new Database.\n");
        CDBBatch batch(*this);
        batch.Write(WL_FACTOR, 0);
        batch.Write(WL_WINDOW_LENGTH, 2016);
        batch.Write(WL_CAP_ENABLED, 0);
        batch.Write(DB_HEIGHT, 0);
        unsigned int numberMiners = 0;
        for (const auto& it : consensusParams.minerWhiteListAdminAddress) {
          LogPrintf("Adding admin address %s", it);
          batch.Write(MinerEntry(it), MinerDetails(true,true));
          numberMiners += 1;
        }
        
        batch.Write(WL_NUMBER_MINERS, numberMiners);
        LogPrintf("MinerDatabase: Added admin keys.\n");

        // add dummy address which will be first entry for searching the database
        batch.Write(MinerEntry(DUMMY), MinerDetails(false,false)); 
        /*
        for (unsigned int i=1; i <= Params().GetConsensus().minerWhiteListActivationHeight; i++) {
            batch.Write(BlockEntry(i), BlockDetails(DUMMY, false, 0));
         }
        */
        batch.Write(DB_INIT,true);
        WriteBatch(batch);
    }
    return true;
}

bool CMinerWhitelistDB::EnableCap(unsigned int factor) {
    LogPrintf("MinerDatabase: Enabling Cap with factor %d.\n", factor);
    CDBBatch batch(*this);
    batch.Write(WL_FACTOR, factor);
    batch.Write(WL_CAP_ENABLED, true);
    return WriteBatch(batch);
}

bool CMinerWhitelistDB::RevertCap() {
    unsigned int height;
    LogPrintf("MinerDatabase: Reverting Cap to previous state.\n");
    if (!Read(DB_HEIGHT, height))
        return false;
    BlockDetails det = BlockDetails();
    if (!Read(BlockEntry(height), det))
        return false;
    LogPrintf("MinerDatabase: Previous factor was %d\n", det.prevFactor);
    CDBBatch batch(*this);
    batch.Write(WL_FACTOR, det.prevFactor);
    if (det.prevFactor == 0) {
        batch.Write(WL_CAP_ENABLED, false);
    } else {
        batch.Write(WL_CAP_ENABLED, true);
    }
    return WriteBatch(batch);
}

bool CMinerWhitelistDB::DisableCap() {
    LogPrintf("MinerDatabase: Disabling Cap.\n");
    CDBBatch batch(*this);
    batch.Write(WL_CAP_ENABLED,false);
    batch.Write(WL_FACTOR, 0);// TODO: think about this a bit more!
    return WriteBatch(batch);
}

bool CMinerWhitelistDB::IsCapEnabled() {
    char fEnabled;
    if (!Read(WL_CAP_ENABLED, fEnabled))
        return false;
    return fEnabled == true;
}

bool CMinerWhitelistDB::IsWhitelistEnabled() { return true; } // Assume always on

unsigned int CMinerWhitelistDB::GetCapFactor() {
    unsigned int factor;
    Read(WL_FACTOR, factor);
    return factor;
}

unsigned int CMinerWhitelistDB::GetNumberOfWhitelistedMiners() {
    unsigned int number;
    Read(WL_NUMBER_MINERS, number);
    return number;
}


unsigned int CMinerWhitelistDB::GetAvgBlocksPerMiner() {
    unsigned int number = GetNumberOfWhitelistedMiners();
    return 2016/number;
}


unsigned int CMinerWhitelistDB::GetCap() {
  return 0; // REMOVED
}


bool CMinerWhitelistDB::WhitelistMiner(std::string address) {
    
    MinerEntry mEntry(address);
    MinerDetails mDetails = MinerDetails();
    CDBBatch batch(*this);
    unsigned int number;
    Read(WL_NUMBER_MINERS, number);
    if (Read(mEntry, mDetails)) {
        //LogPrintf("MinerDatabase: Miner already in Database. %s\n", address);
        if (!mDetails.whitelisted) {
            LogPrintf("MinerDatabase: Adding Miner back to whitelist. %s\n", address);
            mDetails.whitelisted = true;
            mDetails.wlcount = 1;
            batch.Write(mEntry, mDetails);
            batch.Write(WL_NUMBER_MINERS, number+1);
        } else {
            LogPrintf("MinerDatabase: Miner already whitelisted. %s\n", address);
            mDetails.wlcount += 1;
            batch.Write(mEntry, mDetails);
        }
    } 
    else {
        LogPrintf("MinerDatabase: Whitelisting previously unknown Miner %s\n", address);
        batch.Write(mEntry,MinerDetails(true,false));
        batch.Write(WL_NUMBER_MINERS, number+1);
    }
    
    return WriteBatch(batch);
}

bool CMinerWhitelistDB::BlacklistMiner(std::string address) {
    
    MinerEntry mEntry(address);
    MinerDetails mDetails = MinerDetails();
    CDBBatch batch(*this);

    unsigned int number;
    Read(WL_NUMBER_MINERS, number);

    if (Read(mEntry, mDetails)) {
        if (mDetails.whitelisted) {
            LogPrintf("MinerDatabase: Blacklisting Miner %s\n", address);
            mDetails.wlcount = 0;
            mDetails.whitelisted = false;
            batch.Write(mEntry, mDetails);
            batch.Write(WL_NUMBER_MINERS, number-1);
        } else {
            LogPrintf("MinerDatabase: Miner already blacklisted. %s\n", address);
            mDetails.wlcount -= 1;
            batch.Write(mEntry, mDetails);
        }
    }
    else {
        LogPrintf("MinerDatabase: Blacklisting previously unknown Miner %s\n", address);
        batch.Write(mEntry, MinerDetails(false,false));
    }

    return WriteBatch(batch);
}

bool CMinerWhitelistDB::RevertWhitelistMiner(std::string address) { 
    // This is different from blacklisting.
    // Blacklisting immediately removes miner from list,
    // This routine only does so if miner was only added to whitelist once
    
    MinerEntry mEntry(address);
    MinerDetails mDetails = MinerDetails();
    CDBBatch batch(*this);

    unsigned int number;
    Read(WL_NUMBER_MINERS, number);

    if (Read(mEntry, mDetails)) {
        if (mDetails.whitelisted) {
            LogPrintf("MinerDatabase: Reverting Whitelisting of Miner %s\n", address);
            mDetails.wlcount -= 1;
            if (mDetails.wlcount == 0) {
                LogPrintf("MinerDatabase: Blacklisting Miner %s\n", address);
                mDetails.whitelisted = false;
                batch.Write(WL_NUMBER_MINERS, number-1);
            } else {
                LogPrintf("MinerDatabase: Miner %s is still whitelisted because of a previous transaction.\n", address);
            }
            batch.Write(mEntry, mDetails);
        } else {
            LogPrintf("Trying to revert whitelisting for a miner on the blacklist. Database is corrupted.");
            return false;
        }
    } else {
        LogPrintf("Trying to revert unknown whitelisting. Database is corrupted.");
        return false;
    }

    return WriteBatch(batch);
}

bool CMinerWhitelistDB::RevertBlacklistMiner(std::string address) { 
    // This is different from whitelisting.
    // Whitelisting immediately adds miner to whitelist,
    // This routine only does so if miner was only blacklisted once
    
    MinerEntry mEntry(address);
    MinerDetails mDetails = MinerDetails();
    CDBBatch batch(*this);

    unsigned int number;
    Read(WL_NUMBER_MINERS, number);

    if (Read(mEntry, mDetails)) {
        if (!mDetails.whitelisted) {
            LogPrintf("MinerDatabase: Reverting Blacklisting of Miner %s\n", address);
            mDetails.wlcount += 1;
            if (mDetails.wlcount == 1) {
                LogPrintf("MinerDatabase: Whitelisting Miner %s\n", address);
                mDetails.whitelisted = true;
                batch.Write(WL_NUMBER_MINERS, number+1);
            } else {
                LogPrintf("MinerDatabase: Miner %s is still blacklisted because of a previous transaction.\n", address);
            }
            batch.Write(mEntry, mDetails);
        } else {
            LogPrintf("Trying to revert blacklisting for a miner on the whitelist. Database is corrupted.");
            return false;
        }
    } else {
        LogPrintf("MinerDatabase: Trying to revert unknown blacklisting. Database is corrupted.");
        return false;
    }

    return WriteBatch(batch);
}

bool CMinerWhitelistDB::ExistMiner(std::string address) {
    return Exists(MinerEntry(address));
}

bool CMinerWhitelistDB::isWhitelisted(std::string address) {
    MinerEntry mEntry(address);
    MinerDetails mDetails = MinerDetails();
    if (!Exists(mEntry)) {
        LogPrintf("MinerDatabase: Miner does not exist in database.\n");
        return false;
    }
    //LogPrintf("MinerDatabase: Miner is in database.\n");
    Read(mEntry, mDetails);
    return mDetails.whitelisted;
}

unsigned int CMinerWhitelistDB::GetLastBlock(std::string address) {
    MinerDetails det = MinerDetails();
    if (Read(MinerEntry(address), det))
        if (!det.blockVector.empty()) {
            return det.blockVector.back();
        }
    return 0;
}

unsigned int CMinerWhitelistDB::GetTotalBlocks(std::string address) {
    MinerDetails det = MinerDetails();
    if (Read(MinerEntry(address), det))
        return det.totalBlocks;
    return 0;
}

unsigned int CMinerWhitelistDB::GetBlocksInWindow(std::string address) {
    MinerDetails det = MinerDetails();
    if (Read(MinerEntry(address), det))
        return det.windowBlocks;
    return 0;
}

unsigned int CMinerWhitelistDB::GetWindowStart(unsigned int height) {
  if (height < 2017)
		return 1;
  if (height < Params().GetConsensus().minerCapSystemChangeHeight) {
  	return height-height%2016;
  }
	return height - 2016 + 1;
}

bool CMinerWhitelistDB::DumpWindowStats(std::vector< std::pair< std::string, uint32_t > > *MinerVector) {
    // LogPrintf("MinerDatabase: Dumping all miner stats.\n");
    // Sync();
    if (IsEmpty())
        LogPrintf("MinerDatabase: DB is empty.\n");
    std::unique_ptr<CDBIterator> it(NewIterator());
    for (it->Seek(MinerEntry(DUMMY)); it->Valid(); it->Next()) { // DUMMY is the lexically first address.
        MinerEntry entry;
        if (it->GetKey(entry) && entry.key == WL_ADDRESS) { // Does this work? Should give false if Key is of other type than what we expect?!
            // LogPrintf("Got entry type %s\n", entry.key);
            // LogPrintf("Got entry %s with pointer %x\n", entry.addr, entry.addr);
            MinerDetails det;
            it->GetValue(det);
            // LogPrintf("Got details: Blockcount %s\n", det.totalBlocks);
            if (det.windowBlocks == 0) 
                continue; // do not print useless data
            MinerVector->emplace_back(entry.addr, det.windowBlocks);
        } else { 
            break; // we are done with the addresses.
        }
    } 
    // for (const auto &item : *MinerVector) { LogPrintf("addr:%x blc:%d\n", item.first, item.second); }
    return true;
}

bool CMinerWhitelistDB::DumpStatsForMiner(std::string address, bool *wlisted, unsigned int *windowBlocks, unsigned int *totalBlocks, unsigned int *lastBlock) {
    //LogPrintf("MinerDatabase: Dumping stats for miner %s.\n", address);
    
    MinerEntry entry = MinerEntry(address);
    if(!Exists(entry))
        return false;
    
    MinerDetails details = MinerDetails();
    Read(entry, details);
    *wlisted = details.whitelisted;
    *windowBlocks = details.windowBlocks;
    *totalBlocks = details.totalBlocks;
    if (details.totalBlocks == 0) {
        *lastBlock = 0;
    } else {
        *lastBlock = details.blockVector.back();
    }
    return true;
}

bool CMinerWhitelistDB::DumpFullStatsForMiner(std::string address, bool *wlisted, unsigned int *windowBlocks, unsigned int *totalBlocks, std::vector<unsigned int> &lastBlocks) {
    //LogPrintf("MinerDatabase: Dumping stats for miner %s.\n", address);
    
    MinerEntry entry = MinerEntry(address);
    if(!Exists(entry))
        return false;
    
    MinerDetails details = MinerDetails();
    Read(entry, details);
    *wlisted = details.whitelisted;
    *windowBlocks = details.windowBlocks;
    *totalBlocks = details.totalBlocks;
    lastBlocks = details.blockVector;
    return true;
}


bool CMinerWhitelistDB::MineBlock(const Config& config, unsigned int newHeight, std::string address) {
    const Consensus::Params consensusParams = config.GetChainParams().GetConsensus();
    unsigned int currHeight;
    Read(DB_HEIGHT, currHeight);
    if (newHeight!=currHeight+1 ) {
        LogPrintf("WARNING: Miner Whitelist database is corrupted. Please resync the blockchain by using `-reindex`");
        
        LogPrintf("WARNING: Miner Whitelist database is corrupted. Please resync the blockchain by using `-reindex`\n");
        LogPrintf("New Height: %i, Current Height: %i\n", newHeight, currHeight);
        return false;
    }

    CDBBatch batch(*this);
    

    // First make entry for the new Block
    batch.Write(BlockEntry(newHeight), BlockDetails(address, IsCapEnabled(), GetCapFactor()));
    batch.Write(DB_HEIGHT, newHeight);
   
    // Now make sure that the minerstats match up. 
    // Window Handling
    if ( newHeight < consensusParams.minerCapSystemChangeHeight ) {
        // old system
        // Reset the window every 2016 blocks
        if ( newHeight%2016 == 0) {
            std::unique_ptr<CDBIterator> it(NewIterator());
            for (it->Seek(MinerEntry(DUMMY)); it->Valid(); it->Next()) { 
                MinerEntry entry;
                if (it->GetKey(entry) && entry.key == WL_ADDRESS) { // Does this work? Should give false if Key is of other type than what we expect?!
                    MinerDetails det;
                    it->GetValue(det);
                    if (entry.addr == address) { 
                        det.totalBlocks += 1;
                        det.blockVector.push_back(newHeight);
                    }
                    det.windowBlocks = 0;
                    batch.Write(entry, det);
                } else { // No miner anymore
                    break;
                }
            }
        } 
        else {
            MinerDetails minDets = MinerDetails();
            if (!Exists(MinerEntry(address)))
                return false;
            Read(MinerEntry(address), minDets);
            // Increase counter for the one mining the block
            minDets.totalBlocks += 1;
            minDets.windowBlocks += 1;
            minDets.blockVector.push_back(newHeight);
            batch.Write(MinerEntry(address), minDets);
        }
    }
    else {
        // new System
        MinerDetails minDets = MinerDetails();
        if (!Exists(MinerEntry(address)))
            return false;
        Read(MinerEntry(address), minDets);
        // Increase counter for the one mining the block
        minDets.totalBlocks += 1;
        minDets.windowBlocks += 1;
        minDets.blockVector.push_back(newHeight);

      
        // Check if there is a block dropping out of the window
        unsigned int blockDroppingOut = GetWindowStart(newHeight)-1;

        // we should only let a block drop out if it counted toward the windowBlocks. 
        // if we are at the minercapsystemchangeheight=40320, the block dropping out is 
        // 40320-2016=38304, but block 38304 was not counted in windowBlocks 
        // in testnet the system changes on block 7800, the corresponding window of the 
        // old system started on height 6048, we should only count blocks dropping out
        // from 6049 forward. The following formula achieves exactly that.

        unsigned int changeHeight = consensusParams.minerCapSystemChangeHeight;
        if (blockDroppingOut >= changeHeight - ( (changeHeight-1) % 2016) ) { // There is!
        //if (Params().NetworkIDString() == "main" && blockDroppingOut > 38304 && Params().NetworkIDString() == "test" && blockDroppingOut > 6048 || Params().NetworkIDString() == "regtest" && blockDroppingOut > 4032) {
            BlockDetails dropDets = BlockDetails();
            if (!Exists(BlockEntry(blockDroppingOut)))
                return false;
            Read(BlockEntry(blockDroppingOut), dropDets);
            if (dropDets.miner == address) { 
                // the miner who mined the current block also mined the one 
                // dropping out of the window so decrease his count again.
                minDets.windowBlocks -= 1;
                batch.Write(MinerEntry(address), minDets);  
            } else { // different Miner
                MinerDetails otherDets = MinerDetails();
                if (!Exists(MinerEntry(dropDets.miner)))
                    return false;
                Read(MinerEntry(dropDets.miner), otherDets);
                otherDets.windowBlocks -= 1;
                batch.Write(MinerEntry(address), minDets);  
                batch.Write(MinerEntry(dropDets.miner), otherDets);  
            }
        } else {
            batch.Write(MinerEntry(address), minDets);
        }
    }
    WriteBatch(batch);
    return true;
}
      
bool CMinerWhitelistDB::RewindBlock(const Config& config, unsigned int index) {
    const Consensus::Params consensusParams = config.GetChainParams().GetConsensus();
    CDBBatch batch(*this);

    // First check that we are actually at the tip
    unsigned int currHeight;
    Read(DB_HEIGHT, currHeight);
    if (currHeight!=index) {
        LogPrintf("WARNING: Miner Whitelist database is corrupted. Please resync the blockchain by using `-reindex`\n");
        return false;
    }

    // See who mined this block
    BlockDetails currDets = BlockDetails();
    if (!Exists(BlockEntry(currHeight)))
        return false;
    Read(BlockEntry(currHeight), currDets);
    std::string miner = currDets.miner;

    // delete entry for the block
    batch.Erase(BlockEntry(index));
    batch.Write(DB_HEIGHT, index-1);
   

    // Window Handling
    if ( index < consensusParams.minerCapSystemChangeHeight ) {
        // old system
        // code will never be used as the old system is buried unter checkpoints
        // so this is more for understanding the system

        // This is what happens at the window border
        if (index%2016==0) {
            // TODO iterate over the last 2016 blocks to restore the correct value for the cap.
            std::unique_ptr<CDBIterator> it(NewIterator());
            std::unordered_map<std::string, unsigned int> coinMap; 
            int bcount = 0;
            for (it->Seek(BlockEntry(index-2016+1)); it->Valid(); it->Next()) { // Start at beginning of Window
                BlockEntry entry = BlockEntry();
                bcount+=1; // count blocks
                if (bcount > 2016)
                    break; // only work until current block
                if (it->GetKey(entry)) { // Does this work? Should give false if Key is of other type than what we expect?!
                    BlockDetails det = BlockDetails();
                    it->GetValue(det);
                    MinerDetails bMDets = MinerDetails();
                    
                    if (!Exists(MinerEntry(det.miner)))
                        return false;
                    Read(MinerEntry(det.miner), bMDets);
                    if (coinMap.count(det.miner)) {
                        coinMap[det.miner] += 1; // miner already has coins
                    } else {
                        coinMap[det.miner] = 1; // first appearance of miner this window
                    }
                } else { // Not a block anymore (LevelDB is sorted)
                    break;
                }
            }
            // we now have a map of the coincount per miner. rewrite it into db
            for (auto& x: coinMap) {
                MinerDetails mdetails = MinerDetails(); 
                Read(MinerEntry(x.first), mdetails);
                if (x.first == miner) {
                    mdetails.windowBlocks = x.second - 1; // The current block will be removed from database. Do not count it
                    mdetails.totalBlocks -= 1; // also remove current block from the miners total count.
                } else {
                    mdetails.windowBlocks = x.second;
                }
                batch.Write(MinerEntry(x.first), mdetails);
            } 
        } else { // normal stuff during the window
            MinerDetails minDets = MinerDetails();
            if (!Exists(MinerEntry(miner)))
                return false;
            Read(MinerEntry(miner), minDets);
            // Decrease counter for the one mining the block
            minDets.totalBlocks -= 1;
            minDets.windowBlocks -= 1;
            minDets.blockVector.pop_back();
            batch.Write(MinerEntry(miner), minDets);
        }
    }
    else {
        // new System
        MinerDetails minDets = MinerDetails();
        if (!Exists(MinerEntry(miner)))
            return false;
        Read(MinerEntry(miner), minDets);
        // Decrease counter for the one mining the block
        minDets.totalBlocks -= 1;
        minDets.windowBlocks -= 1;
        minDets.blockVector.pop_back();

        // Check if there is a block moving back into the window
        unsigned int blockMovingIn = GetWindowStart(index)-1;
        
        // we should only let a block drop out if it counted toward the windowBlocks. 
        // if we are at the minercapsystemchangeheight=40320, the block dropping out is 
        // 40320-2016=38304, but block 38304 was not counted in windowBlocks
        // in testnet the system changes on block 7800, the corresponding window of the 
        // old system started on height 6048, so we should only count blocks dropping out
        // from 6049 forward. The following formula achieves exactly that.

        unsigned int changeHeight = consensusParams.minerCapSystemChangeHeight;
        if (blockMovingIn >= changeHeight - ( (changeHeight-1) % 2016) ) { // There is!
        //if (Params().NetworkIDString() == "main" && blockDroppingOut > 38304 && Params().NetworkIDString() == "test" && blockDroppingOut > 6048 || Params().NetworkIDString() == "regtest" && blockDroppingOut > 4032) {
            BlockDetails dropDets = BlockDetails();
            if (!Exists(BlockEntry(blockMovingIn)))
                return false;
            Read(BlockEntry(blockMovingIn), dropDets);
            if (dropDets.miner == miner) { 
                // the miner who mined the current block also mined the one 
                // moving into the window so re-increase his count.
                minDets.windowBlocks += 1;
                batch.Write(MinerEntry(miner), minDets);  
            } else { // different Miner
                MinerDetails dets = MinerDetails();
                if (!Exists(MinerEntry(dropDets.miner)))
                    return false;
                Read(MinerEntry(dropDets.miner), dets);
                dets.windowBlocks += 1;
                batch.Write(MinerEntry(miner), minDets);  
                batch.Write(MinerEntry(dropDets.miner), dets);  
            }
        } else {
            batch.Write(MinerEntry(miner), minDets);
        }
    }
    WriteBatch(batch);
    return true;
}

bool CMinerWhitelistDB::hasExceededCap(std::string address) {
  return false;
}

std::string CMinerWhitelistDB::getMinerforBlock(unsigned int index) {
    BlockDetails bdets = BlockDetails();
    Read(BlockEntry(index), bdets);
    return bdets.miner;
}
