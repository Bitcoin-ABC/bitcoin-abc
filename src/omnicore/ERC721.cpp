#include "omnicore/ERC721.h"
#include "omnicore/log.h"

#include "streams.h"
#include "config.h"
#include "clientversion.h"
#include "serialize.h"

#include <boost/filesystem.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/algorithm/string.hpp>

#include "leveldb/db.h"
#include "leveldb/write_batch.h"
#include "ERC721.h"
#include "../leveldb/include/leveldb/slice.h"
#include "../streams.h"
#include "../clientversion.h"
#include "../leveldb/include/leveldb/status.h"

#include <stdint.h>

#include <map>
#include <string>
#include <vector>
#include <utility>

CMPSPERC721Info::PropertyInfo::PropertyInfo()
        : maxTokens(0), haveIssuedNumber(0), currentValidIssuedNumer(0),
          autoNextTokenID(1){}

CMPSPERC721Info::CMPSPERC721Info(const boost::filesystem::path& path, bool fWipe) {
    leveldb::Status status = Open(path, fWipe);
    PrintToConsole("Loading ERC721 smart property database: %s\n", status.ToString());
    init();
}

void CMPSPERC721Info::init(uint256 nextSPID){
    next_erc721spid = nextSPID;
}

uint256 CMPSPERC721Info::peekNextSPID() const{
    return next_erc721spid;
}

CMPSPERC721Info::~CMPSPERC721Info() {
    if (msc_debug_persistence) PrintToLog("CMPSPERC721Info closed\n");
}

static uint256 increaseOne(uint256& origin){
    arith_uint256 tmp = UintToArith256(origin);
    tmp++;
    return ArithToUint256(tmp);
}

uint256 CMPSPERC721Info::putSP(const PropertyInfo& info){
    uint256 propertyId = next_erc721spid;
    next_erc721spid = increaseOne(next_erc721spid);
    cacheMapPropertyInfo[propertyId] = std::make_pair(info, Flags::DIRTY);
    return propertyId;
}

bool CMPSPERC721Info::existSP(uint256 propertyID){
    auto iter = cacheMapPropertyInfo.find(propertyID);
    if (iter != cacheMapPropertyInfo.end()){
        return true;
    }

    // DB key for property entry
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', propertyID);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    std::string strSpValue;
    leveldb::Status status = pdb->Get(readoptions, slSpKey, &strSpValue);
    if (!status.ok()) {
        if (!status.IsNotFound()) {
            PrintToLog("%s(): ERROR for SP %s: %s\n", __func__, propertyID.GetHex(), status.ToString());
        }
        return false;
    }

    PropertyInfo tmpInfo;
    try {
        CDataStream ssSpValue(strSpValue.data(), strSpValue.data() + strSpValue.size(), SER_DISK, CLIENT_VERSION);
        ssSpValue >> tmpInfo;
        cacheMapPropertyInfo[propertyID] = std::make_pair(tmpInfo, Flags::FRESH);
    } catch (const std::exception& e) {
        PrintToLog("%s(): ERROR for SP %s: %s\n", __func__, propertyID.GetHex(), e.what());
        return false;
    }
    return true;
}

bool CMPSPERC721Info::getAndUpdateSP(uint256 propertyID, std::pair<PropertyInfo, Flags>** info){
    auto iter = cacheMapPropertyInfo.find(propertyID);
    if (iter == cacheMapPropertyInfo.end()){
        // DB key for property entry
        CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
        ssSpKey << std::make_pair('s', propertyID);
        leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

        // DB value for property entry
        std::string strSpValue;
        leveldb::Status status = pdb->Get(readoptions, slSpKey, &strSpValue);
        if (!status.ok()) {
            if (!status.IsNotFound()) {
                PrintToLog("%s(): ERROR for SP %s: %s\n", __func__, propertyID.GetHex(), status.ToString());
            }
            return false;
        }

        PropertyInfo tmpInfo;
        try {
            CDataStream ssSpValue(strSpValue.data(), strSpValue.data() + strSpValue.size(), SER_DISK, CLIENT_VERSION);
            ssSpValue >> tmpInfo;
            cacheMapPropertyInfo[propertyID] = std::make_pair(tmpInfo, Flags::FRESH);
        } catch (const std::exception& e) {
            PrintToLog("%s(): ERROR for SP %s: %s\n", __func__, propertyID.GetHex(), e.what());
            return false;
        }

        *info = &(cacheMapPropertyInfo[propertyID]);
        return true;
    }

    *info = &(iter->second);
    return true;
}

bool CMPSPERC721Info::getWatermark(uint256& watermark) const{

    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    ssKey << 'B';
    leveldb::Slice slKey(&ssKey[0], ssKey.size());

    std::string strValue;
    leveldb::Status status = pdb->Get(readoptions, slKey, &strValue);
    if (!status.ok()) {
        if (!status.IsNotFound()) {
            PrintToLog("%s(): ERROR: failed to retrieve watermark: %s\n", __func__, status.ToString());
        }
        return false;
    }

    try {
        CDataStream ssValue(strValue.data(), strValue.data() + strValue.size(), SER_DISK, CLIENT_VERSION);
        ssValue >> watermark;
    } catch (const std::exception& e) {
        PrintToLog("%s(): ERROR: failed to deserialize watermark: %s\n", __func__, e.what());
        return false;
    }

    return true;
}

bool CMPSPERC721Info::popBlock(const uint256& block_hash){
    leveldb::WriteBatch commitBatch;
    leveldb::Iterator* iter = NewIterator();

    CDataStream ssSpKeyPrefix(SER_DISK, CLIENT_VERSION);
    ssSpKeyPrefix << 's';
    leveldb::Slice slSpKeyPrefix(&ssSpKeyPrefix[0], ssSpKeyPrefix.size());

    for (iter->Seek(slSpKeyPrefix); iter->Valid() && iter->key().starts_with(slSpKeyPrefix); iter->Next()) {
        // deserialize the persisted value
        leveldb::Slice slSpValue = iter->value();
        PropertyInfo info;
        try {
            CDataStream ssValue(slSpValue.data(), slSpValue.data() + slSpValue.size(), SER_DISK, CLIENT_VERSION);
            ssValue >> info;
        } catch (const std::exception& e) {
            PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
            return false;
        }

        if(info.updateBlock == block_hash){
            leveldb::Slice slSpKey = iter->key();

            // need to roll this SP back
            if (info.updateBlock == info.creationBlock) {
                // this is the block that created this SP, so delete the SP and the tx index entry
                CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
                ssTxIndexKey << std::make_pair('t', info.txid);
                leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());
                commitBatch.Delete(slSpKey);
                commitBatch.Delete(slTxIndexKey);
            } else {
                uint256 propertyId;
                try {
                    CDataStream ssValue(1+slSpKey.data(), 1+slSpKey.data()+slSpKey.size(), SER_DISK, CLIENT_VERSION);
                    ssValue >> propertyId;
                } catch (const std::exception& e) {
                    PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
                    return false;
                }

                CDataStream ssSpPrevKey(SER_DISK, CLIENT_VERSION);
                ssSpPrevKey << 'b';
                ssSpPrevKey << info.updateBlock;
                ssSpPrevKey << propertyId;
                leveldb::Slice slSpPrevKey(&ssSpPrevKey[0], ssSpPrevKey.size());

                std::string strSpPrevValue;
                if (!pdb->Get(readoptions, slSpPrevKey, &strSpPrevValue).IsNotFound()) {
                    // copy the prev state to the current state and delete the old state
                    commitBatch.Put(slSpKey, strSpPrevValue);
                    commitBatch.Delete(slSpPrevKey);
                } else {
                    // failed to find a previous SP entry, trigger reparse
                    PrintToLog("%s(): ERROR: failed to retrieve previous SP entry\n", __func__);
                    return false;
                }
            }
        }
    }

    // clean up the iterator
    delete iter;

    leveldb::Status status = pdb->Write(syncoptions, &commitBatch);
    if (!status.ok()) {
        PrintToLog("%s(): ERROR: %s\n", __func__, status.ToString());
        return false;
    }

    return true;
}

bool CMPSPERC721Info::flush(uint256& watermark){
    // atomically write both the the SP and the index to the database
    leveldb::WriteBatch batch;

    for(const auto& it : cacheMapPropertyInfo){
        if (it.second.second & Flags::DIRTY){
            // DB key for property entry
            CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
            ssSpKey << std::make_pair('s', it.first);
            leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

            // DB value for property entry
            CDataStream ssSpValue(SER_DISK, CLIENT_VERSION);
            ssSpValue.reserve(GetSerializeSize(it.second.first, ssSpValue.GetType(), ssSpValue.GetVersion()));
            ssSpValue << it.second.first;
            leveldb::Slice slSpValue(&ssSpValue[0], ssSpValue.size());

            // DB value for property entry
            std::string strSpPrevValue;
            leveldb::Status status = pdb->Get(readoptions, slSpKey, &strSpPrevValue);
            if (!status.ok()) {
                if (!status.IsNotFound()) {
                    PrintToLog("%s(): ERROR for SP %s: %s\n", __func__, it.first.GetHex(), status.ToString());
                }

                // create a new property, will put the property to database.
                // DB key for identifier lookup entry
                CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
                ssTxIndexKey << std::make_pair('t', it.second.first.txid);
                leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());

                // DB value for identifier
                CDataStream ssTxValue(SER_DISK, CLIENT_VERSION);
                ssTxValue.reserve(GetSerializeSize(it.first, ssTxValue.GetType(), ssTxValue.GetVersion()));
                ssTxValue << it.first;
                leveldb::Slice slTxValue(&ssTxValue[0], ssTxValue.size());

                std::string existingEntry;
                if(!pdb->Get(readoptions, slTxIndexKey, &existingEntry).IsNotFound() && slTxValue.compare(existingEntry) != 0){
                    std::string strError = strprintf("writing index txid %s : SP %s is overwriting a different value", it.second.first.txid.ToString(), it.first.GetHex());
                    PrintToLog("%s() ERROR: %s\n", __func__, strError);
                }

                batch.Put(slSpKey, slSpValue);
                batch.Put(slTxIndexKey, slTxValue);

                continue;
            }

            // DB key for historical property entry
            CDataStream ssSpPrevKey(SER_DISK, CLIENT_VERSION);
            ssSpPrevKey << 'b';
            ssSpPrevKey << it.second.first.updateBlock;
            ssSpPrevKey << it.first;
            leveldb::Slice slSpPrevKey(&ssSpPrevKey[0], ssSpPrevKey.size());

            batch.Put(slSpPrevKey, strSpPrevValue);
            batch.Put(slSpKey, slSpValue);
        }
    }

    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    ssKey << 'B';
    leveldb::Slice slKey(&ssKey[0], ssKey.size());

    CDataStream ssValue(SER_DISK, CLIENT_VERSION);
    ssValue.reserve(GetSerializeSize(watermark, ssValue.GetType(), ssValue.GetVersion()));
    ssValue << watermark;
    leveldb::Slice slValue(&ssValue[0], ssValue.size());
    batch.Delete(slKey);
    batch.Put(slKey, slValue);

    leveldb::Status status = pdb->Write(syncoptions, &batch);
    if (!status.ok()) {
        PrintToLog("%s(): ERROR for fluash %s\n", __func__,  status.ToString());
        return false;
    }
    cacheMapPropertyInfo.clear();

    return true;
}

bool CMPSPERC721Info::findERCSPByTX(const uint256& txhash, uint256& propertyId){

    // DB key for identifier lookup entry
    CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
    ssTxIndexKey << std::make_pair('t', txhash);
    leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());

    // DB value for identifier
    std::string strTxIndexValue;
    if (!pdb->Get(readoptions, slTxIndexKey, &strTxIndexValue).ok()) {
        std::string strError = strprintf("failed to find property created with %s", txhash.GetHex());
        PrintToLog("%s(): ERROR: %s", __func__, strError);
        return false;
    }

    try {
        CDataStream ssValue(strTxIndexValue.data(), strTxIndexValue.data() + strTxIndexValue.size(), SER_DISK, CLIENT_VERSION);
        ssValue >> propertyId;
    } catch (const std::exception& e) {
        PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
        return false;
    }

    return true;
}
