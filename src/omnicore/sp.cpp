// Smart Properties & Crowd Sales

#include "omnicore/sp.h"

#include "omnicore/log.h"
#include "omnicore/omnicore.h"
#include "omnicore/uint256_extensions.h"

#include "arith_uint256.h"
#include "base58.h"
#include "clientversion.h"
#include "serialize.h"
#include "streams.h"
#include "tinyformat.h"
#include "uint256.h"
#include "utiltime.h"
#include "config.h"
#include "cashaddrenc.h"

#include <boost/algorithm/string.hpp>
#include <boost/filesystem.hpp>
#include <boost/lexical_cast.hpp>

#include "leveldb/db.h"
#include "leveldb/write_batch.h"

#include <stdint.h>

#include <map>
#include <string>
#include <vector>
#include <utility>

using namespace mastercore;

CMPSPInfo::Entry::Entry()
  : prop_type(0), prev_prop_id(0), num_tokens(0), property_desired(0),
    deadline(0), rate(0), early_bird(0), percentage(0),
    close_early(false), max_tokens(false), missedTokens(0), timeclosed(0),
    fixed(false), manual(false) {}

bool CMPSPInfo::Entry::isDivisible() const
{
    if(prop_type == MSC_PROPERTY_TYPE_INDIVISIBLE){
        return false;
    }

    return true;
}

int CMPSPInfo::Entry::getPrecision() const
{
    bool type;
    type = isDivisible();
    if(type){
        if(prop_type >= MSC_PROPERTY_MIN_PRECISION && prop_type <= MSC_PROPERTY_MAX_PRECISION){
            return prop_type;
        }
        else {
            return -1;
        }
    }

    return 0;
}

void CMPSPInfo::Entry::print() const
{
    PrintToConsole("%s:%s(Fixed=%s,Divisible=%s):%d:%s/%s, %s %s\n",
            issuer,
            name,
            fixed ? "Yes" : "No",
            isDivisible() ? "Yes" : "No",
            num_tokens,
            category, subcategory, url, data);
}

CMPSPInfo::CMPSPInfo(const boost::filesystem::path& path, bool fWipe)
{
	const CChainParams &params = GetConfig().GetChainParams();
    leveldb::Status status = Open(path, fWipe);
    PrintToConsole("Loading smart property database: %s\n", status.ToString());

    // special cases for constant SPs OMNI and TOMNI
    implied_omni.issuer = EncodeCashAddr(ExodusAddress(), params);
    implied_omni.prop_type = MSC_PROPERTY_MAX_PRECISION;
    implied_omni.num_tokens = 0;
    implied_omni.category = "N/A";
    implied_omni.subcategory = "N/A";
    implied_omni.name = "WHC";
    implied_omni.url = "http://www.wormhole.cash";
    implied_omni.data = "WHC serve as the binding between Bitcoin cash, smart properties and contracts created on the Wormhole.";
    implied_omni.creation_block = uint256S("");
    implied_omni.update_block = uint256S("");
    init();
    initburnbch();
}

CMPSPInfo::~CMPSPInfo()
{
    if (msc_debug_persistence) PrintToLog("CMPSPInfo closed\n");
}

void CMPSPInfo::Clear()
{
    // wipe database via parent class
    CDBBase::Clear();
    // reset "next property identifiers"
    init();
}

void CMPSPInfo::init(uint32_t nextSPID, uint32_t nextTestSPID)
{
    next_spid = nextSPID;
    next_test_spid = nextTestSPID;
}

uint32_t CMPSPInfo::peekNextSPID(uint8_t ecosystem) const
{
    uint32_t nextId = 0;

    switch (ecosystem) {
        case OMNI_PROPERTY_WHC: // Main ecosystem, MSC: 1, TMSC: 2, First available SP = 3
            nextId = next_spid;
            break;
        case OMNI_PROPERTY_TWHC: // Test ecosystem, same as above with high bit set
            nextId = next_test_spid;
            break;
        default: // Non-standard ecosystem, ID's start at 0
            nextId = 0;
    }

    return nextId;
}

bool CMPSPInfo::updateSP(uint32_t propertyId, const Entry& info)
{
    // DB key for property entry
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', propertyId);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    CDataStream ssSpValue(SER_DISK, CLIENT_VERSION);
    ssSpValue.reserve(GetSerializeSize(info, ssSpValue.GetType(), ssSpValue.GetVersion()));
    ssSpValue << info;
    leveldb::Slice slSpValue(&ssSpValue[0], ssSpValue.size());

    // DB key for historical property entry
    CDataStream ssSpPrevKey(SER_DISK, CLIENT_VERSION);
    ssSpPrevKey << 'b';
    ssSpPrevKey << info.update_block;
    ssSpPrevKey << propertyId;
    leveldb::Slice slSpPrevKey(&ssSpPrevKey[0], ssSpPrevKey.size());

    leveldb::WriteBatch batch;
    std::string strSpPrevValue;

    // if a value exists move it to the old key
    if (!pdb->Get(readoptions, slSpKey, &strSpPrevValue).IsNotFound()) {
        batch.Put(slSpPrevKey, strSpPrevValue);
    }
    batch.Put(slSpKey, slSpValue);
    leveldb::Status status = pdb->Write(syncoptions, &batch);

    if (!status.ok()) {
        PrintToLog("%s(): ERROR for SP %d: %s\n", __func__, propertyId, status.ToString());
        return false;
    }

    PrintToLog("%s(): updated entry for SP %d successfully\n", __func__, propertyId);
    return true;
}

void CMPSPInfo::initburnbch(){
    if (hasSP(OMNI_PROPERTY_WHC)){
        return;
    }
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', OMNI_PROPERTY_WHC);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    CDataStream ssSpValue(SER_DISK, CLIENT_VERSION);
    ssSpValue.reserve(GetSerializeSize(implied_omni, ssSpValue.GetType(), ssSpValue.GetVersion()));
    ssSpValue << implied_omni;
    leveldb::Slice slSpValue(&ssSpValue[0], ssSpValue.size());

    // atomically write both the the SP and the index to the database
    leveldb::WriteBatch batch;
    batch.Put(slSpKey, slSpValue);

    leveldb::Status status = pdb->Write(syncoptions, &batch);
    if (!status.ok()) {
        PrintToLog("%s(): ERROR for SP %d: %s\n", __func__, OMNI_PROPERTY_WHC, status.ToString());
    }

}

uint32_t CMPSPInfo::putSP(uint8_t ecosystem, const Entry& info)
{
    uint32_t propertyId = 0;
    switch (ecosystem) {
        case OMNI_PROPERTY_WHC: // Main ecosystem, WHC: 1, TWHC: 2, First available SP = 3
            propertyId = next_spid++;
            break;
        case OMNI_PROPERTY_TWHC: // Test ecosystem, same as above with high bit set
            propertyId = next_test_spid++;
            break;
        default: // Non-standard ecosystem, ID's start at 0
            propertyId = 0;
    }

    // DB key for property entry
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', propertyId);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    CDataStream ssSpValue(SER_DISK, CLIENT_VERSION);
    ssSpValue.reserve(GetSerializeSize(info, ssSpValue.GetType(), ssSpValue.GetVersion()));
    ssSpValue << info;
    leveldb::Slice slSpValue(&ssSpValue[0], ssSpValue.size());

    // DB key for identifier lookup entry
    CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
    ssTxIndexKey << std::make_pair('t', info.txid);
    leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());

    // DB value for identifier
    CDataStream ssTxValue(SER_DISK, CLIENT_VERSION);
    ssTxValue.reserve(GetSerializeSize(propertyId, ssTxValue.GetType(), ssTxValue.GetVersion()));
    ssTxValue << propertyId;
    leveldb::Slice slTxValue(&ssTxValue[0], ssTxValue.size());

    // sanity checking
    std::string existingEntry;
    if (!pdb->Get(readoptions, slSpKey, &existingEntry).IsNotFound() && slSpValue.compare(existingEntry) != 0) {
        std::string strError = strprintf("writing SP %d to DB, when a different SP already exists for that identifier", propertyId);
        PrintToLog("%s() ERROR: %s\n", __func__, strError);
    } else if (!pdb->Get(readoptions, slTxIndexKey, &existingEntry).IsNotFound() && slTxValue.compare(existingEntry) != 0) {
        std::string strError = strprintf("writing index txid %s : SP %d is overwriting a different value", info.txid.ToString(), propertyId);
        PrintToLog("%s() ERROR: %s\n", __func__, strError);
    }

    // atomically write both the the SP and the index to the database
    leveldb::WriteBatch batch;
    batch.Put(slSpKey, slSpValue);
    batch.Put(slTxIndexKey, slTxValue);

    leveldb::Status status = pdb->Write(syncoptions, &batch);

    if (!status.ok()) {
        PrintToLog("%s(): ERROR for SP %d: %s\n", __func__, propertyId, status.ToString());
    }

    return propertyId;
}

bool CMPSPInfo::getSP(uint32_t propertyId, Entry& info) const
{
    // DB key for property entry
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', propertyId);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    std::string strSpValue;
    leveldb::Status status = pdb->Get(readoptions, slSpKey, &strSpValue);
    if (!status.ok()) {
        if (!status.IsNotFound()) {
            PrintToLog("%s(): ERROR for SP %d: %s\n", __func__, propertyId, status.ToString());
        }
        return false;
    }

    try {
        CDataStream ssSpValue(strSpValue.data(), strSpValue.data() + strSpValue.size(), SER_DISK, CLIENT_VERSION);
        ssSpValue >> info;
    } catch (const std::exception& e) {
        PrintToLog("%s(): ERROR for SP %d: %s\n", __func__, propertyId, e.what());
        return false;
    }

    return true;
}

bool CMPSPInfo::hasSP(uint32_t propertyId) const
{
    // DB key for property entry
    CDataStream ssSpKey(SER_DISK, CLIENT_VERSION);
    ssSpKey << std::make_pair('s', propertyId);
    leveldb::Slice slSpKey(&ssSpKey[0], ssSpKey.size());

    // DB value for property entry
    std::string strSpValue;
    leveldb::Status status = pdb->Get(readoptions, slSpKey, &strSpValue);

    return status.ok();
}

uint32_t CMPSPInfo::findSPByTX(const uint256& txid) const
{
    uint32_t propertyId = 0;

    // DB key for identifier lookup entry
    CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
    ssTxIndexKey << std::make_pair('t', txid);
    leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());

    // DB value for identifier
    std::string strTxIndexValue;
    if (!pdb->Get(readoptions, slTxIndexKey, &strTxIndexValue).ok()) {
        std::string strError = strprintf("failed to find property created with %s", txid.GetHex());
        PrintToLog("%s(): ERROR: %s", __func__, strError);
        return 0;
    }

    try {
        CDataStream ssValue(strTxIndexValue.data(), strTxIndexValue.data() + strTxIndexValue.size(), SER_DISK, CLIENT_VERSION);
        ssValue >> propertyId;
    } catch (const std::exception& e) {
        PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
        return 0;
    }

    return propertyId;
}

int64_t CMPSPInfo::popBlock(const uint256& block_hash)
{
    int64_t remainingSPs = 0;
    leveldb::WriteBatch commitBatch;
    leveldb::Iterator* iter = NewIterator();

    CDataStream ssSpKeyPrefix(SER_DISK, CLIENT_VERSION);
    ssSpKeyPrefix << 's';
    leveldb::Slice slSpKeyPrefix(&ssSpKeyPrefix[0], ssSpKeyPrefix.size());

    for (iter->Seek(slSpKeyPrefix); iter->Valid() && iter->key().starts_with(slSpKeyPrefix); iter->Next()) {
        // deserialize the persisted value
        leveldb::Slice slSpValue = iter->value();
        Entry info;
        try {
            CDataStream ssValue(slSpValue.data(), slSpValue.data() + slSpValue.size(), SER_DISK, CLIENT_VERSION);
            ssValue >> info;
        } catch (const std::exception& e) {
            PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
            return -1;
        }
        // pop the block
        if (info.update_block == block_hash) {
            leveldb::Slice slSpKey = iter->key();

            // need to roll this SP back
            if (info.update_block == info.creation_block) {
                // this is the block that created this SP, so delete the SP and the tx index entry
                CDataStream ssTxIndexKey(SER_DISK, CLIENT_VERSION);
                ssTxIndexKey << std::make_pair('t', info.txid);
                leveldb::Slice slTxIndexKey(&ssTxIndexKey[0], ssTxIndexKey.size());
                commitBatch.Delete(slSpKey);
                commitBatch.Delete(slTxIndexKey);
            } else {
                uint32_t propertyId = 0;
                try {
                    CDataStream ssValue(1+slSpKey.data(), 1+slSpKey.data()+slSpKey.size(), SER_DISK, CLIENT_VERSION);
                    ssValue >> propertyId;
                } catch (const std::exception& e) {
                    PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
                    return -2;
                }

                CDataStream ssSpPrevKey(SER_DISK, CLIENT_VERSION);
                ssSpPrevKey << 'b';
                ssSpPrevKey << info.update_block;
                ssSpPrevKey << propertyId;
                leveldb::Slice slSpPrevKey(&ssSpPrevKey[0], ssSpPrevKey.size());

                std::string strSpPrevValue;
                if (!pdb->Get(readoptions, slSpPrevKey, &strSpPrevValue).IsNotFound()) {
                    // copy the prev state to the current state and delete the old state
                    commitBatch.Put(slSpKey, strSpPrevValue);
                    commitBatch.Delete(slSpPrevKey);
                    ++remainingSPs;
                } else {
                    // failed to find a previous SP entry, trigger reparse
                    PrintToLog("%s(): ERROR: failed to retrieve previous SP entry\n", __func__);
                    return -3;
                }
            }
        } else {
            ++remainingSPs;
        }
    }

    // clean up the iterator
    delete iter;

    leveldb::Status status = pdb->Write(syncoptions, &commitBatch);

    if (!status.ok()) {
        PrintToLog("%s(): ERROR: %s\n", __func__, status.ToString());
        return -4;
    }

    return remainingSPs;
}

void CMPSPInfo::setWatermark(const uint256& watermark)
{
    leveldb::WriteBatch batch;

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
        PrintToLog("%s(): ERROR: failed to write watermark: %s\n", __func__, status.ToString());
    }
}

bool CMPSPInfo::getWatermark(uint256& watermark) const
{
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

void CMPSPInfo::printAll() const
{
    // print off the hard coded MSC and TMSC entries
    for (uint32_t idx = OMNI_PROPERTY_WHC; idx <= OMNI_PROPERTY_TWHC; idx++) {
        Entry info;
        PrintToConsole("%10d => ", idx);
        if (getSP(idx, info)) {
            info.print();
        } else {
            PrintToConsole("<Internal Error on implicit SP>\n");
        }
    }

    leveldb::Iterator* iter = NewIterator();

    CDataStream ssSpKeyPrefix(SER_DISK, CLIENT_VERSION);
    ssSpKeyPrefix << 's';
    leveldb::Slice slSpKeyPrefix(&ssSpKeyPrefix[0], ssSpKeyPrefix.size());

    for (iter->Seek(slSpKeyPrefix); iter->Valid() && iter->key().starts_with(slSpKeyPrefix); iter->Next()) {
        leveldb::Slice slSpKey = iter->key();
        uint32_t propertyId = 0;
        try {
            CDataStream ssValue(1+slSpKey.data(), 1+slSpKey.data()+slSpKey.size(), SER_DISK, CLIENT_VERSION);
            ssValue >> propertyId;
        } catch (const std::exception& e) {
            PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
            PrintToConsole("<Malformed key in DB>\n");
            continue;
        }
        PrintToConsole("%10s => ", propertyId);

        // deserialize the persisted data
        leveldb::Slice slSpValue = iter->value();
        Entry info;
        try {
            CDataStream ssSpValue(slSpValue.data(), slSpValue.data() + slSpValue.size(), SER_DISK, CLIENT_VERSION);
            ssSpValue >> info;
        } catch (const std::exception& e) {
            PrintToConsole("<Malformed value in DB>\n");
            PrintToLog("%s(): ERROR: %s\n", __func__, e.what());
            continue;
        }
        info.print();
    }

    // clean up the iterator
    delete iter;
}

CMPCrowd::CMPCrowd()
  : propertyId(0), nValue(0), property_desired(0), deadline(0),
    early_bird(0), percentage(0), u_created(0), i_created(0)
{
}

CMPCrowd::CMPCrowd(uint32_t pid, int64_t nv, uint32_t cd, int64_t dl, uint8_t eb, uint8_t per, int64_t uct, int64_t ict)
  : propertyId(pid), nValue(nv), property_desired(cd), deadline(dl),
    early_bird(eb), percentage(per), u_created(uct), i_created(ict)
{
}

void CMPCrowd::insertDatabase(const uint256& txHash, const std::vector<int64_t>& txData)
{
    txFundraiserData.insert(std::make_pair(txHash, txData));
}

std::string CMPCrowd::toString(const std::string& address) const
{
    return strprintf("%34s : id=%u=%X; prop=%u, value= %li, deadline: %s (%lX)", address, propertyId, propertyId,
        property_desired, nValue, DateTimeStrFormat("%Y-%m-%d %H:%M:%S", deadline), deadline);
}

void CMPCrowd::print(const std::string& address, FILE* fp) const
{
    fprintf(fp, "%s\n", toString(address).c_str());
}

void CMPCrowd::saveCrowdSale(std::ofstream& file, SHA256_CTX* shaCtx, const std::string& addr) const
{
    // compose the outputline
    // addr,propertyId,nValue,property_desired,deadline,early_bird,percentage,created,mined
    std::string lineOut = strprintf("%s,%d,%d,%d,%d,%d,%d,%d,%d",
            addr,
            propertyId,
            nValue,
            property_desired,
            deadline,
            early_bird,
            percentage,
            u_created,
            i_created);

    // append N pairs of address=nValue;blockTime for the database
    std::map<uint256, std::vector<int64_t> >::const_iterator iter;
    for (iter = txFundraiserData.begin(); iter != txFundraiserData.end(); ++iter) {
        lineOut.append(strprintf(",%s=", (*iter).first.GetHex()));
        std::vector<int64_t> const &vals = (*iter).second;

        std::vector<int64_t>::const_iterator valIter;
        for (valIter = vals.begin(); valIter != vals.end(); ++valIter) {
            if (valIter != vals.begin()) {
                lineOut.append(";");
            }

            lineOut.append(strprintf("%d", *valIter));
        }
    }

    // add the line to the hash
    SHA256_Update(shaCtx, lineOut.c_str(), lineOut.length());

    // write the line
    file << lineOut << std::endl;
}

CMPCrowd* mastercore::getCrowd(const std::string& address)
{
    CrowdMap::iterator my_it = my_crowds.find(address);

    if (my_it != my_crowds.end()) return &(my_it->second);

    return (CMPCrowd *)NULL;
}

bool mastercore::IsPropertyIdValid(uint32_t propertyId)
{
    if (propertyId == 0 || propertyId == OMNI_PROPERTY_TWHC ) return false;

    uint32_t nextId = 0;

    if (propertyId < TEST_ECO_PROPERTY_1) {
        nextId = _my_sps->peekNextSPID(1);
    } else {
        nextId = _my_sps->peekNextSPID(2);
    }

    if (propertyId < nextId) {
        return true;
    }

    return false;
}

bool mastercore::isPropertyDivisible(uint32_t propertyId)
{
    // TODO: is a lock here needed
    CMPSPInfo::Entry sp;

    if (_my_sps->getSP(propertyId, sp)) return sp.isDivisible();

    return true;
}

int mastercore::getPropertyType(uint32_t propertyId){
	CMPSPInfo::Entry sp;
	if (_my_sps->getSP(propertyId, sp))	return sp.getPrecision();
	return -1;
}

std::string mastercore::getPropertyName(uint32_t propertyId)
{
    CMPSPInfo::Entry sp;
    if (_my_sps->getSP(propertyId, sp)) return sp.name;
    return "Property Name Not Found";
}

bool mastercore::isCrowdsaleActive(uint32_t propertyId)
{
    for (CrowdMap::const_iterator it = my_crowds.begin(); it != my_crowds.end(); ++it) {
        const CMPCrowd& crowd = it->second;
        uint32_t foundPropertyId = crowd.getPropertyId();
        if (foundPropertyId == propertyId) return true;
    }
    return false;
}

/**
 * Calculates missing bonus tokens, which are credited to the crowdsale issuer.
 *
 * Due to rounding effects, a crowdsale issuer may not receive the full
 * bonus immediatly. The missing amount is calculated based on the total
 * tokens created and already credited.
 *
 * @param sp        The crowdsale property
 * @param crowdsale The crowdsale
 * @return The number of missed tokens
 */
int64_t mastercore::GetMissedIssuerBonus(const CMPSPInfo::Entry& sp, const CMPCrowd& crowdsale)
{
    // consistency check
    assert(getSaledTokens(crowdsale.getPropertyId())
            == (crowdsale.getIssuerCreated() + crowdsale.getUserCreated()));

    arith_uint256 amountMissing = 0;
    arith_uint256 bonusPercentForIssuer = ConvertTo256(sp.percentage);
    arith_uint256 amountAlreadyCreditedToIssuer = ConvertTo256(crowdsale.getIssuerCreated());
    arith_uint256 amountCreditedToUsers = ConvertTo256(crowdsale.getUserCreated());
    arith_uint256 amountTotal = amountCreditedToUsers + amountAlreadyCreditedToIssuer;

    // calculate theoretical bonus for issuer based on the amount of
    // tokens credited to users
    arith_uint256 exactBonus = amountCreditedToUsers * bonusPercentForIssuer;
    exactBonus /= ConvertTo256(100); // 100 %

    // there shall be no negative missing amount
    if (exactBonus < amountAlreadyCreditedToIssuer) {
        return 0;
    }

    // subtract the amount already credited to the issuer
    if (exactBonus > amountAlreadyCreditedToIssuer) {
        amountMissing = exactBonus - amountAlreadyCreditedToIssuer;
    }

    // calculate theoretical total amount of all tokens
    arith_uint256 newTotal = amountTotal + amountMissing;

    // reduce to max. possible amount
    if (newTotal > uint256_const::max_int64) {
        amountMissing = uint256_const::max_int64 - amountTotal;
    }

    return ConvertTo64(amountMissing);
}

// @price, the value assigned to this argument is enlarged by 10**8
// e.g. 1WHC = 10**-8 Token --> price = 1, supported most expensive token
// e.g. 1WHC = 1      Token --> price = 10**8
// e.g. 1WHC = 10**8  Token --> price = 10**16, supported most cheap token
void mastercore::calculateFundraiser(uint16_t tokenPrecision, int64_t transfer,
                                     uint8_t bonusPerc, int64_t closeSeconds,
                                     int64_t currentSeconds, int64_t price,
                                     int64_t soldTokens, int64_t totalTokens,
                                     int64_t &purchasedTokens,
                                     bool &closeCrowdsale, int64_t &refund) {
    // Weeks in seconds
    arith_uint256 week_sec = ConvertTo256(604800);

    // Precision for all non-bitcoin values (bonus percentages, for example)
    arith_uint256 precision = ConvertTo256(1000000000000LL);  // 10**12
    // Precision for all percentages (10/100 = 10%)
    arith_uint256 percentage_precision = ConvertTo256(100);
    arith_uint256 whc_precision = ConvertTo256(100000000LL);  // 1WHC=10**8C
    static const int64_t decimalArr[9] = {
            1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000};
    assert(tokenPrecision <= 8);
    arith_uint256 token_precision = ConvertTo256(decimalArr[tokenPrecision]);

    // Calculate the bonus seconds
    arith_uint256 bonus_seconds = 0;
    if (currentSeconds < closeSeconds) {
        bonus_seconds =
                ConvertTo256(closeSeconds) - ConvertTo256(currentSeconds);
    }
    // Calculate the whole number of weeks to apply bonus
    arith_uint256 weeks = (bonus_seconds / week_sec) * precision;
    weeks += (Modulo256(bonus_seconds, week_sec) * precision) / week_sec;

    // Calculate the earlybird percentage to be applied
    arith_uint256 earlybird_percentage = weeks * ConvertTo256(bonusPerc);

    arith_uint256 bonus_percentage = (precision * percentage_precision);
    bonus_percentage += earlybird_percentage;
    bonus_percentage /= percentage_precision;

    // transfer is measured with unit of C while price is measured with WHC
    // created_tokens_cal = token_precision * transfer * bonus * price
    arith_uint256 created_tokens_cal = token_precision;
    created_tokens_cal *= ConvertTo256(transfer);
    created_tokens_cal *= bonus_percentage;
    created_tokens_cal *= ConvertTo256(price);
    created_tokens_cal /= whc_precision;

    arith_uint256 created_tokens_int = created_tokens_cal / precision;
    created_tokens_int = created_tokens_int / whc_precision;

    arith_uint256 max_creatable =
            ConvertTo256(totalTokens) - ConvertTo256(soldTokens);

    // min_num: the smallest num of tokens that can be sold (worth at least 1C)
    arith_uint256 min_num = ConvertTo256(price);
    min_num *= precision;
    min_num *= token_precision;
    min_num /= whc_precision;
    min_num /= whc_precision;
    if (max_creatable * precision < min_num) {
        // not a single C can be spent in this case
        purchasedTokens = 0;
        closeCrowdsale = true;
        refund = transfer;
        return;
    }

    if (created_tokens_int < max_creatable) {
        purchasedTokens = ConvertTo64(created_tokens_int);
        closeCrowdsale = false;

        // Refund the part that are not enough for smallest token unit
        // Note that, there is no bonus for this part
        //
        // The part of token that is smaller than the smallest unit
        // e.g. for token with precision 1, 0.05 token < 0.1 token
        arith_uint256 created_tokens_rem = created_tokens_int;
        created_tokens_rem *= precision;
        created_tokens_rem *= whc_precision;
        created_tokens_rem = created_tokens_cal - created_tokens_rem;

        // remove the earlybird bonus from refund_whc
        // e.g. suppose extra bonus percentage is 0.1,
        // then tokens buyer gets is enlarged by x1.1
        // to remove the earlybird bonus, we simply divide the refund by 1.1
        arith_uint256 refund_money = created_tokens_rem;
        refund_money *= whc_precision;
        refund_money *= precision;
        refund_money /= bonus_percentage;
        refund_money /= price;
        refund_money /= token_precision;
        refund_money /= precision;
        refund = ConvertTo64(refund_money);

    } else {  // created_tokens_int > max_creatable
        purchasedTokens = ConvertTo64(max_creatable);
        closeCrowdsale = true;  // close crowdsale

        arith_uint256 ratio = created_tokens_int * precision;
        ratio /= max_creatable;

        arith_uint256 spent = ConvertTo256(transfer);
        spent *= precision;
        spent /= ratio;
        refund = ConvertTo64(ConvertTo256(transfer) - spent);
    }
}

// go hunting for whether a simple send is a crowdsale purchase
// TODO !!!! horribly inefficient !!!! find a more efficient way to do this
bool mastercore::isCrowdsalePurchase(const uint256& txid, const std::string& address, int64_t* propertyId, int64_t* userTokens, int64_t* issuerTokens, int64_t* invested)
{
    // 1. loop crowdsales (active/non-active) looking for issuer address
    // 2. loop those crowdsales for that address and check their participant txs in database

    // check for an active crowdsale to this address
    CMPCrowd* pcrowdsale = getCrowd(address);
    if (pcrowdsale) {
        std::map<uint256, std::vector<int64_t> >::const_iterator it;
        const std::map<uint256, std::vector<int64_t> >& database = pcrowdsale->getDatabase();
        for (it = database.begin(); it != database.end(); it++) {
            const uint256& tmpTxid = it->first;
            if (tmpTxid == txid) {
                *propertyId = pcrowdsale->getPropertyId();
                *invested = it->second.at(0);
                *userTokens = it->second.at(2);
                *issuerTokens = it->second.at(3);
                return true;
            }
        }
    }

    // if we still haven't found txid, check non active crowdsales to this address
    for (uint8_t ecosystem = 1; ecosystem <= 2; ecosystem++) {
        uint32_t startPropertyId = (ecosystem == 1) ? 1 : TEST_ECO_PROPERTY_1;
        for (uint32_t loopPropertyId = startPropertyId; loopPropertyId < _my_sps->peekNextSPID(ecosystem); loopPropertyId++) {
            CMPSPInfo::Entry sp;
            if (!_my_sps->getSP(loopPropertyId, sp)) continue;
            if (sp.issuer != address) continue;
            for (std::map<uint256, std::vector<int64_t> >::const_iterator it = sp.historicalData.begin(); it != sp.historicalData.end(); it++) {
                if (it->first == txid) {
                    *propertyId = loopPropertyId;
                    *invested = it->second.at(0);
                    *userTokens = it->second.at(2);
                    *issuerTokens = it->second.at(3);
                    return true;
                }
            }
        }
    }

    // didn't find anything, not a crowdsale purchase
    return false;
}

void mastercore::eraseMaxedCrowdsale(const std::string& address, int64_t blockTime, int block)
{
    CrowdMap::iterator it = my_crowds.find(address);

    if (it != my_crowds.end()) {
        const CMPCrowd& crowdsale = it->second;

        PrintToLog("%s(): ERASING MAXED OUT CROWDSALE from address=%s, at block %d (timestamp: %d), SP: %d (%s)\n",
            __func__, address, block, blockTime, crowdsale.getPropertyId(), strMPProperty(crowdsale.getPropertyId()));

        if (msc_debug_sp) {
            PrintToLog("%s(): %s\n", __func__, DateTimeStrFormat("%Y-%m-%d %H:%M:%S", blockTime));
            PrintToLog("%s(): %s\n", __func__, crowdsale.toString(address));
        }

        // get sp from data struct
        CMPSPInfo::Entry sp;
        assert(_my_sps->getSP(crowdsale.getPropertyId(), sp));

        // get txdata
        sp.historicalData = crowdsale.getDatabase();
        sp.close_early = true;
        sp.max_tokens = true;
        sp.timeclosed = blockTime;

        // update SP with this data
        sp.update_block = chainActive[block]->GetBlockHash();
        assert(_my_sps->updateSP(crowdsale.getPropertyId(), sp));

        // no calculate fractional calls here, no more tokens (at MAX)
        my_crowds.erase(it);
    }
}

unsigned int mastercore::eraseExpiredCrowdsale(const CBlockIndex* pBlockIndex)
{
    if (pBlockIndex == NULL) return 0;

    const int64_t blockTime = pBlockIndex->GetBlockTime();
    const int blockHeight = pBlockIndex->nHeight;
    unsigned int how_many_erased = 0;
    CrowdMap::iterator my_it = my_crowds.begin();

    while (my_crowds.end() != my_it) {
        const std::string& address = my_it->first;
        const CMPCrowd& crowdsale = my_it->second;

        if (blockTime > crowdsale.getDeadline()) {
            PrintToLog("%s(): ERASING EXPIRED CROWDSALE from address=%s, at block %d (timestamp: %d), SP: %d (%s)\n",
                __func__, address, blockHeight, blockTime, crowdsale.getPropertyId(), strMPProperty(crowdsale.getPropertyId()));

            if (msc_debug_sp) {
                PrintToLog("%s(): %s\n", __func__, DateTimeStrFormat("%Y-%m-%d %H:%M:%S", blockTime));
                PrintToLog("%s(): %s\n", __func__, crowdsale.toString(address));
            }

            // get sp from data struct
            CMPSPInfo::Entry sp;
            assert(_my_sps->getSP(crowdsale.getPropertyId(), sp));

            // find missing tokens
            int64_t missedTokens = GetMissedIssuerBonus(sp, crowdsale);

            // get txdata
            sp.historicalData = crowdsale.getDatabase();
            sp.missedTokens = missedTokens;

            // update SP with this data
            sp.update_block = pBlockIndex->GetBlockHash();
            assert(_my_sps->updateSP(crowdsale.getPropertyId(), sp));

            // update values
            if (missedTokens > 0) {
                assert(update_tally_map(sp.issuer, crowdsale.getPropertyId(), missedTokens, BALANCE));
            }

            my_crowds.erase(my_it++);

            ++how_many_erased;

        } else my_it++;
    }

    return how_many_erased;
}

std::string mastercore::strPropertyType(int propertyType)
{
	char buf[2];
    memset(buf, 0, 2);
    if (propertyType >= 0 && propertyType <= 8){
        sprintf(buf, "%d", propertyType);
        return buf;
    }
    return "unknown";
}

std::string mastercore::getprecision(uint32_t property){
    int type = getPropertyType(property);
    return strPropertyType(type);
}

std::string mastercore::strEcosystem(uint8_t ecosystem)
{
    switch (ecosystem) {
        case OMNI_PROPERTY_WHC: return "main";
        case OMNI_PROPERTY_TWHC: return "test";
    }

    return "unknown";
}
