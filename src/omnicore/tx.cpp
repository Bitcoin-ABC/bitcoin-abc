// Master Protocol transaction code

#include "omnicore/tx.h"

#include "omnicore/activation.h"
#include "omnicore/convert.h"
#include "omnicore/dex.h"
#include "omnicore/fees.h"
#include "omnicore/log.h"
#include "omnicore/mdex.h"
#include "omnicore/notifications.h"
#include "omnicore/omnicore.h"
#include "omnicore/rules.h"
#include "omnicore/sp.h"
#include "omnicore/sto.h"
#include "omnicore/utils.h"
#include "omnicore/utilsbitcoin.h"
#include "omnicore/version.h"
#include "omnicore/ERC721.h"
#include "omnicore/rpcvalues.h"

#include "validation.h"
#include "amount.h"
#include "base58.h"
#include "sync.h"
#include "utiltime.h"
#include "config.h"
#include "cashaddrenc.h"

#include <boost/algorithm/string.hpp>
#include <boost/lexical_cast.hpp>

#include <stdio.h>
#include <string.h>

#include <algorithm>
#include <utility>
#include <vector>

using boost::algorithm::token_compress_on;

using namespace mastercore;

/** Returns a label for the given transaction type. */
std::string mastercore::strTransactionType(uint16_t txType, uint8_t action)
{
    switch (txType) {
        case MSC_TYPE_SIMPLE_SEND: return "Simple Send";
        case MSC_TYPE_RESTRICTED_SEND: return "Restricted Send";
        case MSC_TYPE_SEND_TO_OWNERS: return "Send To Owners";
        case MSC_TYPE_SEND_ALL: return "Send All";
        case MSC_TYPE_SAVINGS_MARK: return "Savings";
        case MSC_TYPE_SAVINGS_COMPROMISED: return "Savings COMPROMISED";
        case MSC_TYPE_RATELIMITED_MARK: return "Rate-Limiting";
        case MSC_TYPE_AUTOMATIC_DISPENSARY: return "Automatic Dispensary";
        case MSC_TYPE_TRADE_OFFER: return "DEx Sell Offer";
        case MSC_TYPE_METADEX_TRADE: return "MetaDEx trade";
        case MSC_TYPE_METADEX_CANCEL_PRICE: return "MetaDEx cancel-price";
        case MSC_TYPE_METADEX_CANCEL_PAIR: return "MetaDEx cancel-pair";
        case MSC_TYPE_METADEX_CANCEL_ECOSYSTEM: return "MetaDEx cancel-ecosystem";
        case MSC_TYPE_ACCEPT_OFFER_BTC: return "DEx Accept Offer";
        case MSC_TYPE_CREATE_PROPERTY_FIXED: return "Create Property - Fixed";
        case MSC_TYPE_CREATE_PROPERTY_VARIABLE: return "Create Property - Variable";
        case MSC_TYPE_PROMOTE_PROPERTY: return "Promote Property";
        case MSC_TYPE_CLOSE_CROWDSALE: return "Close Crowdsale";
        case MSC_TYPE_CREATE_PROPERTY_MANUAL: return "Create Property - Manual";
        case MSC_TYPE_GRANT_PROPERTY_TOKENS: return "Grant Property Tokens";
        case MSC_TYPE_REVOKE_PROPERTY_TOKENS: return "Revoke Property Tokens";
        case MSC_TYPE_CHANGE_ISSUER_ADDRESS: return "Change Issuer Address";
        case MSC_TYPE_ENABLE_FREEZING: return "Enable Freezing";
        case MSC_TYPE_DISABLE_FREEZING: return "Disable Freezing";
        case MSC_TYPE_FREEZE_PROPERTY_TOKENS: return "Freeze Property Tokens";
        case MSC_TYPE_UNFREEZE_PROPERTY_TOKENS: return "Unfreeze Property Tokens";
        case MSC_TYPE_NOTIFICATION: return "Notification";
        case OMNICORE_MESSAGE_TYPE_ALERT: return "ALERT";
        case OMNICORE_MESSAGE_TYPE_DEACTIVATION: return "Feature Deactivation";
        case OMNICORE_MESSAGE_TYPE_ACTIVATION: return "Feature Activation";
        case WHC_TYPE_GET_BASE_PROPERTY:    return "burn BCH to get WHC";
        case MSC_TYPE_BUY_TOKEN: return "Crowdsale Purchase";
        case WHC_TYPE_ERC721:
            switch (action){
                case ERC721Action::ISSUE_ERC721_PROPERTY :
                    return "Issue ERC721 Property";
                case ERC721Action::ISSUE_ERC721_TOKEN :
                    return "Issue ERC721 Token";
                case ERC721Action::TRANSFER_REC721_TOKEN :
                    return "Transfer ERc721 Token";
                case ERC721Action::DESTROY_ERC721_TOKEN :
                    return "Destroy ERC721 Token";
            }
        default: return "* unknown type *";
    }
}

/** Helper to convert class number to string. */
static std::string intToClass(int encodingClass)
{
    switch (encodingClass) {
        case OMNI_CLASS_A:
            return "A";
        case OMNI_CLASS_B:
            return "B";
        case OMNI_CLASS_C:
            return "C";
    }

    return "-";
}

/** Checks whether a pointer to the payload is past it's last position. */
bool CMPTransaction::isOverrun(const char* p)
{
    ptrdiff_t pos = (char*) p - (char*) &pkt;
    return (pos > pkt_size);
}

// -------------------- PACKET PARSING -----------------------

/** Parses the packet or payload. */
bool CMPTransaction::interpret_Transaction()
{
    if (!interpret_TransactionType()) {
        PrintToLog("Failed to interpret type and version\n");
        return false;
    }

    switch (type) {
        case MSC_TYPE_SIMPLE_SEND:
            return interpret_SimpleSend();

        case MSC_TYPE_BUY_TOKEN:
            return interpret_BuyToken();

        case MSC_TYPE_SEND_TO_OWNERS:
            return interpret_SendToOwners();

        case MSC_TYPE_SEND_ALL:
            return interpret_SendAll();

        case WHC_TYPE_ERC721:
            return interpret_ERC721();

        //change_001
        /*
        case MSC_TYPE_TRADE_OFFER:
            return interpret_TradeOffer();

        case MSC_TYPE_ACCEPT_OFFER_BTC:
            return interpret_AcceptOfferBTC();

        case MSC_TYPE_METADEX_TRADE:
            return interpret_MetaDExTrade();

        case MSC_TYPE_METADEX_CANCEL_PRICE:
            return interpret_MetaDExCancelPrice();

        case MSC_TYPE_METADEX_CANCEL_PAIR:
            return interpret_MetaDExCancelPair();

        case MSC_TYPE_METADEX_CANCEL_ECOSYSTEM:
            return interpret_MetaDExCancelEcosystem();
        */

        case MSC_TYPE_CREATE_PROPERTY_FIXED:
            return interpret_CreatePropertyFixed();

        case MSC_TYPE_CREATE_PROPERTY_VARIABLE:
            return interpret_CreatePropertyVariable();

        case MSC_TYPE_CLOSE_CROWDSALE:
            return interpret_CloseCrowdsale();

        case MSC_TYPE_CREATE_PROPERTY_MANUAL:
            return interpret_CreatePropertyManaged();

        case MSC_TYPE_GRANT_PROPERTY_TOKENS:
            return interpret_GrantTokens();

        case MSC_TYPE_REVOKE_PROPERTY_TOKENS:
            return interpret_RevokeTokens();

        case MSC_TYPE_CHANGE_ISSUER_ADDRESS:
            return interpret_ChangeIssuer();

        case MSC_TYPE_FREEZE_PROPERTY_TOKENS:
            return interpret_FreezeTokens();

        case MSC_TYPE_UNFREEZE_PROPERTY_TOKENS:
            return interpret_UnfreezeTokens();
		/*
        case MSC_TYPE_ENABLE_FREEZING:
            return interpret_EnableFreezing();

        case MSC_TYPE_DISABLE_FREEZING:
            return interpret_DisableFreezing();



        case OMNICORE_MESSAGE_TYPE_DEACTIVATION:
            return interpret_Deactivation();

        case OMNICORE_MESSAGE_TYPE_ACTIVATION:
            return interpret_Activation();

        case OMNICORE_MESSAGE_TYPE_ALERT:
            return interpret_Alert();
	*/
        case WHC_TYPE_GET_BASE_PROPERTY:
            return interpret_BurnBCHGetWHC();
    }

    return false;
}

/** Version and type */
bool CMPTransaction::interpret_TransactionType()
{
    if (pkt_size < 4) {
        return false;
    }
    uint16_t txVersion = 0;
    uint16_t txType = 0;
    memcpy(&txVersion, &pkt[0], 2);
    swapByteOrder16(txVersion);
    memcpy(&txType, &pkt[2], 2);
    swapByteOrder16(txType);
    version = txVersion;
    type = txType;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t------------------------------\n");
        PrintToLog("\t         version: %d, class %s\n", txVersion, intToClass(encodingClass));
        PrintToLog("\t            type: %d (%s)\n", txType, strTransactionType(txType));
    }

    return true;
}

/** Tx 68 */
bool CMPTransaction::interpret_BurnBCHGetWHC()
{
    return true;
}

/** Tx 0 */
bool CMPTransaction::interpret_SimpleSend()
{
    if (pkt_size < 16) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
    }

    return true;
}

/** Tx 1 */
bool CMPTransaction::interpret_BuyToken()
{
    if (pkt_size < 16) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
    }

    return true;
}
/** Tx 3 */
bool CMPTransaction::interpret_SendToOwners()
{
    int expectedSize = 20;
    if (pkt_size < expectedSize) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;
    memcpy(&distribution_property, &pkt[16], 4);
    swapByteOrder32(distribution_property);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t             property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t                value: %s\n", FormatMP(property, nValue));
        if (version > MP_TX_PKT_V1) {
            PrintToLog("\t distributionproperty: %d (%s)\n", distribution_property, strMPProperty(distribution_property));
        }
    }

    return true;
}

/** Tx 4 */
bool CMPTransaction::interpret_SendAll()
{
    if (pkt_size < 5) {
        return false;
    }
    memcpy(&ecosystem, &pkt[4], 1);

    property = ecosystem; // provide a hint for the UI, TODO: better handling!

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t       ecosystem: %d\n", (int)ecosystem);
    }

    return true;
}

/** Tx 9 */
bool CMPTransaction::interpret_ERC721(){
    if(pkt_size < 5){
        return false;
    }
    memcpy(&erc721_action, &pkt[4], 1);

    switch (erc721_action){
        case ERC721Action::ISSUE_ERC721_PROPERTY :
            return interpret_ERC721_issueproperty();

        case ERC721Action::ISSUE_ERC721_TOKEN :
            return interpret_ERC721_issuetoken();

        case ERC721Action::TRANSFER_REC721_TOKEN :
            return interpret_ERC721_transfertoken();

        case ERC721Action::DESTROY_ERC721_TOKEN :
            return interpret_ERC721_destroytoken();
    }

    return false;
}

bool CMPTransaction::interpret_ERC721_issueproperty(){
    if(pkt_size < 17){
        return false;
    }

    const char* p = (char*)&pkt + 5;
    std::vector<std::string> spstr;
    for (int i = 0; i < 4; i++) {
        spstr.push_back(std::string(p));
        p += spstr.back().size() + 1;
        if( (ptrdiff_t)sizeof(pkt) -1 - (p - (char*)&pkt) <= 0){
            PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
            return false;
        }
    }
    memcpy(erc721_propertyname, spstr[0].data(), sizeof(erc721_propertyname) - 1);
    memcpy(erc721_propertysymbol, spstr[1].data(), sizeof(erc721_propertysymbol) - 1);
    memcpy(erc721_propertydata, spstr[2].data(), sizeof(erc721_propertydata) - 1);
    memcpy(erc721_propertyurl, spstr[3].data(), sizeof(erc721_propertyurl) - 1);
    if((ptrdiff_t)sizeof(pkt) -1 - (p - (char*)&pkt) <= 8){
        PrintToLog("%s(): rejected: malformed string value(s). \n", __func__);
        return false;
    }
    memcpy(&max_erc721number, p, 8);
    swapByteOrder64(max_erc721number);

    if (isOverrun(p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

bool CMPTransaction::interpret_ERC721_issuetoken(){
    if(pkt_size < 102){
        return false;
    }

    std::vector<uint8_t > tmp(32);
    uint8_t* p = (uint8_t *)pkt + 5;
    tmp.assign(p, p + 32);
    p += 32;
    erc721_propertyid = uint256(tmp);
    tmp.assign(p, p + 32);
    p += 32;
    erc721_tokenid = uint256(tmp);
    memcpy(erc721token_attribute, p, sizeof(erc721token_attribute));
    p += 32;
    char *ptmp = (char*)p;
    std::string url = std::string(ptmp);
    p += url.size() + 1;
    memcpy(erc721_tokenurl, url.data(), sizeof(erc721_tokenurl) - 1);

    if (isOverrun((char*)p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

bool CMPTransaction::interpret_ERC721_transfertoken(){
    if(pkt_size < 69){
        return false;
    }

    std::vector<uint8_t > tmp(32);
    char* p = (char*)pkt + 5;
    tmp.assign(p, p + 32);
    p += 32;
    erc721_propertyid = uint256(tmp);
    tmp.assign(p, p + 32);
    p += 32;
    erc721_tokenid = uint256(tmp);

    return true;
}

bool CMPTransaction::interpret_ERC721_destroytoken(){
    if(pkt_size < 69){
        return false;
    }

    std::vector<uint8_t > tmp(32);
    char* p = (char*)pkt + 5;
    tmp.assign(p, p + 32);
    p += 32;
    erc721_propertyid = uint256(tmp);
    tmp.assign(p, p + 32);
    p += 32;
    erc721_tokenid = uint256(tmp);

    return true;
}

/** Tx 20 */
bool CMPTransaction::interpret_TradeOffer()
{
    int expectedSize = (version == MP_TX_PKT_V0) ? 33 : 34;
    if (pkt_size < expectedSize) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;
    memcpy(&amount_desired, &pkt[16], 8);
    memcpy(&blocktimelimit, &pkt[24], 1);
    memcpy(&min_fee, &pkt[25], 8);
    if (version > MP_TX_PKT_V0) {
        memcpy(&subaction, &pkt[33], 1);
    }
    swapByteOrder64(amount_desired);
    swapByteOrder64(min_fee);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
        PrintToLog("\t  amount desired: %s\n", FormatDivisibleMP(amount_desired, 8));
        PrintToLog("\tblock time limit: %d\n", blocktimelimit);
        PrintToLog("\t         min fee: %s\n", FormatDivisibleMP(min_fee, 8));
        if (version > MP_TX_PKT_V0) {
            PrintToLog("\t      sub-action: %d\n", subaction);
        }
    }

    return true;
}

/** Tx 22 */
bool CMPTransaction::interpret_AcceptOfferBTC()
{
    if (pkt_size < 16) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
    }

    return true;
}

/** Tx 25 */
bool CMPTransaction::interpret_MetaDExTrade()
{
    if (pkt_size < 28) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;
    memcpy(&desired_property, &pkt[16], 4);
    swapByteOrder32(desired_property);
    memcpy(&desired_value, &pkt[20], 8);
    swapByteOrder64(desired_value);

    action = CMPTransaction::ADD; // depreciated

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
        PrintToLog("\tdesired property: %d (%s)\n", desired_property, strMPProperty(desired_property));
        PrintToLog("\t   desired value: %s\n", FormatMP(desired_property, desired_value));
    }

    return true;
}

/** Tx 26 */
bool CMPTransaction::interpret_MetaDExCancelPrice()
{
    if (pkt_size < 28) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;
    memcpy(&desired_property, &pkt[16], 4);
    swapByteOrder32(desired_property);
    memcpy(&desired_value, &pkt[20], 8);
    swapByteOrder64(desired_value);

    action = CMPTransaction::CANCEL_AT_PRICE; // depreciated

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
        PrintToLog("\tdesired property: %d (%s)\n", desired_property, strMPProperty(desired_property));
        PrintToLog("\t   desired value: %s\n", FormatMP(desired_property, desired_value));
    }

    return true;
}

/** Tx 27 */
bool CMPTransaction::interpret_MetaDExCancelPair()
{
    if (pkt_size < 12) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&desired_property, &pkt[8], 4);
    swapByteOrder32(desired_property);

    nValue = 0; // depreciated
    nNewValue = nValue; // depreciated
    desired_value = 0; // depreciated
    action = CMPTransaction::CANCEL_ALL_FOR_PAIR; // depreciated

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\tdesired property: %d (%s)\n", desired_property, strMPProperty(desired_property));
    }

    return true;
}

/** Tx 28 */
bool CMPTransaction::interpret_MetaDExCancelEcosystem()
{
    if (pkt_size < 5) {
        return false;
    }
    memcpy(&ecosystem, &pkt[4], 1);

    property = ecosystem; // depreciated
    desired_property = ecosystem; // depreciated
    nValue = 0; // depreciated
    nNewValue = nValue; // depreciated
    desired_value = 0; // depreciated
    action = CMPTransaction::CANCEL_EVERYTHING; // depreciated

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t       ecosystem: %d\n", (int)ecosystem);
    }

    return true;
}

/** Tx 50 */
bool CMPTransaction::interpret_CreatePropertyFixed()
{
    if (pkt_size < 25) {
        return false;
    }
    const char* p = 11 + (char*) &pkt;
    std::vector<std::string> spstr;
    memcpy(&ecosystem, &pkt[4], 1);
    memcpy(&prop_type, &pkt[5], 2);
    swapByteOrder16(prop_type);
    memcpy(&prev_prop_id, &pkt[7], 4);
    swapByteOrder32(prev_prop_id);
    for (int i = 0; i < 5; i++) {
        spstr.push_back(std::string(p));
        p += spstr.back().size() + 1;
    }
    int i = 0;
    memcpy(category, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(category)-1)); i++;
    memcpy(subcategory, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(subcategory)-1)); i++;
    memcpy(name, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(name)-1)); i++;
    memcpy(url, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(url)-1)); i++;
    memcpy(data, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(data)-1)); i++;
    memcpy(&nValue, p, 8);
    swapByteOrder64(nValue);
    p += 8;
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t       ecosystem: %d\n", ecosystem);
        PrintToLog("\t   property type: %d (%s)\n", prop_type, strPropertyType(prop_type));
        PrintToLog("\tprev property id: %d\n", prev_prop_id);
        PrintToLog("\t        category: %s\n", category);
        PrintToLog("\t     subcategory: %s\n", subcategory);
        PrintToLog("\t            name: %s\n", name);
        PrintToLog("\t             url: %s\n", url);
        PrintToLog("\t            data: %s\n", data);
        PrintToLog("\t           value: %s\n", FormatByType(nValue, prop_type));
    }

    if (isOverrun(p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

/** Tx 51 */
bool CMPTransaction::interpret_CreatePropertyVariable()
{
    if (pkt_size < 47) {
        return false;
    }
    const char* p = 11 + (char*) &pkt;
    std::vector<std::string> spstr;
    memcpy(&ecosystem, &pkt[4], 1);
    memcpy(&prop_type, &pkt[5], 2);
    swapByteOrder16(prop_type);
    memcpy(&prev_prop_id, &pkt[7], 4);
    swapByteOrder32(prev_prop_id);
    for (int i = 0; i < 5; i++) {
        spstr.push_back(std::string(p));
        p += spstr.back().size() + 1;
    }
    int i = 0;
    memcpy(category, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(category)-1)); i++;
    memcpy(subcategory, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(subcategory)-1)); i++;
    memcpy(name, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(name)-1)); i++;
    memcpy(url, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(url)-1)); i++;
    memcpy(data, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(data)-1)); i++;
    memcpy(&property, p, 4);
    swapByteOrder32(property);
    p += 4;
    memcpy(&nValue, p, 8);
    swapByteOrder64(nValue);
    p += 8;
    nNewValue = nValue;
    memcpy(&deadline, p, 8);
    swapByteOrder64(deadline);
    p += 8;
    memcpy(&early_bird, p++, 1);
    memcpy(&percentage, p++, 1);
	memcpy(&totalCrowsToken, p, 8);
	swapByteOrder64(totalCrowsToken);

    if(percentage != 0){
        PrintToLog("%s(): rejected: undefined field must be 0(s)\n", __func__);
        return false;
    }

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t       ecosystem: %d\n", ecosystem);
        PrintToLog("\t   property type: %d (%s)\n", prop_type, strPropertyType(prop_type));
        PrintToLog("\tprev property id: %d\n", prev_prop_id);
        PrintToLog("\t        category: %s\n", category);
        PrintToLog("\t     subcategory: %s\n", subcategory);
        PrintToLog("\t            name: %s\n", name);
        PrintToLog("\t             url: %s\n", url);
        PrintToLog("\t            data: %s\n", data);
        PrintToLog("\tproperty desired: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t tokens per unit: %s\n", FormatRate(nValue));
        PrintToLog("\t        deadline: %s (%x)\n", DateTimeStrFormat("%Y-%m-%d %H:%M:%S", deadline), deadline);
        PrintToLog("\tearly bird bonus: %d\n", early_bird);
        PrintToLog("\t    issuer bonus: %d\n", percentage);
    }

    if (isOverrun(p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

/** Tx 53 */
bool CMPTransaction::interpret_CloseCrowdsale()
{
    if (pkt_size < 8) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
    }

    return true;
}

/** Tx 54 */
bool CMPTransaction::interpret_CreatePropertyManaged()
{
    if (pkt_size < 17) {
        return false;
    }
    const char* p = 11 + (char*) &pkt;
    std::vector<std::string> spstr;
    memcpy(&ecosystem, &pkt[4], 1);
    memcpy(&prop_type, &pkt[5], 2);
    swapByteOrder16(prop_type);
    memcpy(&prev_prop_id, &pkt[7], 4);
    swapByteOrder32(prev_prop_id);

    for (int i = 0; i < 5; i++) {
        spstr.push_back(std::string(p));
        p += spstr.back().size() + 1;
    }

    int i = 0;
    memcpy(category, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(category)-1)); i++;
    memcpy(subcategory, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(subcategory)-1)); i++;
    memcpy(name, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(name)-1)); i++;
    memcpy(url, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(url)-1)); i++;
    memcpy(data, spstr[i].c_str(), std::min(spstr[i].length(), sizeof(data)-1)); i++;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t       ecosystem: %d\n", ecosystem);
        PrintToLog("\t   property type: %d (%s)\n", prop_type, strPropertyType(prop_type));
        PrintToLog("\tprev property id: %d\n", prev_prop_id);
        PrintToLog("\t        category: %s\n", category);
        PrintToLog("\t     subcategory: %s\n", subcategory);
        PrintToLog("\t            name: %s\n", name);
        PrintToLog("\t             url: %s\n", url);
        PrintToLog("\t            data: %s\n", data);
    }

    if (isOverrun(p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

/** Tx 55 */
bool CMPTransaction::interpret_GrantTokens()
{
    if (pkt_size < 16) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
    }

    return true;
}

/** Tx 56 */
bool CMPTransaction::interpret_RevokeTokens()
{
    if (pkt_size < 16) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t           value: %s\n", FormatMP(property, nValue));
    }

    return true;
}

/** Tx 70 */
bool CMPTransaction::interpret_ChangeIssuer()
{
    if (pkt_size < 8) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
    }

    return true;
}

/** Tx 71 */
bool CMPTransaction::interpret_EnableFreezing()
{
    if (pkt_size < 8) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
    }

    return true;
}

/** Tx 72 */
bool CMPTransaction::interpret_DisableFreezing()
{
    if (pkt_size < 8) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
    }

    return true;
}

/** Tx 185 */
//#if 0
bool CMPTransaction::interpret_FreezeTokens()
{
    if (pkt_size < 17) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;

    const CChainParams &param = GetConfig().GetChainParams();
    const char* destaddr = (char*)&pkt[16];
    UniValue unfreezaddr(destaddr);

    CTxDestination addr = DecodeCashAddr(unfreezaddr.get_str(), param);
    CTxDestination comAddr = CNoDestination{};
    if (addr == comAddr){
        return false;
    }
    receiver = EncodeCashAddr(addr, param);

    if (receiver.empty()) {
        return false;
    }

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t  value (unused): %s\n", FormatMP(property, nValue));
        PrintToLog("\t         address: %s\n", receiver);
    }

    return true;
}

/** Tx 186 */
bool CMPTransaction::interpret_UnfreezeTokens()
{
    if (pkt_size < 37) {
        return false;
    }
    memcpy(&property, &pkt[4], 4);
    swapByteOrder32(property);
    memcpy(&nValue, &pkt[8], 8);
    swapByteOrder64(nValue);
    nNewValue = nValue;
    const CChainParams &param = GetConfig().GetChainParams();
    const char* destaddr = (char*)&pkt[16];
    UniValue unfreezaddr(destaddr);

    CTxDestination addr = DecodeCashAddr(unfreezaddr.get_str(), param);
    CTxDestination comAddr = CNoDestination{};
    if (addr == comAddr){
        return false;
    }
    receiver = EncodeCashAddr(addr, param);

    if (receiver.empty()) {
        return false;
    }

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t        property: %d (%s)\n", property, strMPProperty(property));
        PrintToLog("\t  value (unused): %s\n", FormatMP(property, nValue));
        PrintToLog("\t         address: %s\n", receiver);
    }

    return true;
}
//#endif

/** Tx 65533 */
bool CMPTransaction::interpret_Deactivation()
{
    if (pkt_size < 6) {
        return false;
    }
    memcpy(&feature_id, &pkt[4], 2);
    swapByteOrder16(feature_id);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t      feature id: %d\n", feature_id);
    }

    return true;
}

/** Tx 65534 */
bool CMPTransaction::interpret_Activation()
{
    if (pkt_size < 14) {
        return false;
    }
    memcpy(&feature_id, &pkt[4], 2);
    swapByteOrder16(feature_id);
    memcpy(&activation_block, &pkt[6], 4);
    swapByteOrder32(activation_block);
    memcpy(&min_client_version, &pkt[10], 4);
    swapByteOrder32(min_client_version);

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t      feature id: %d\n", feature_id);
        PrintToLog("\tactivation block: %d\n", activation_block);
        PrintToLog("\t minimum version: %d\n", min_client_version);
    }

    return true;
}

/** Tx 65535 */
bool CMPTransaction::interpret_Alert()
{
    if (pkt_size < 11) {
        return false;
    }

    memcpy(&alert_type, &pkt[4], 2);
    swapByteOrder16(alert_type);
    memcpy(&alert_expiry, &pkt[6], 4);
    swapByteOrder32(alert_expiry);

    const char* p = 10 + (char*) &pkt;
    std::string spstr(p);
    memcpy(alert_text, spstr.c_str(), std::min(spstr.length(), sizeof(alert_text)-1));

    if ((!rpcOnly && msc_debug_packets) || msc_debug_packets_readonly) {
        PrintToLog("\t      alert type: %d\n", alert_type);
        PrintToLog("\t    expiry value: %d\n", alert_expiry);
        PrintToLog("\t   alert message: %s\n", alert_text);
    }

    if (isOverrun(p)) {
        PrintToLog("%s(): rejected: malformed string value(s)\n", __func__);
        return false;
    }

    return true;
}

// ---------------------- CORE LOGIC -------------------------

/**
 * Interprets the payload and executes the logic.
 *
 * @return  0  if the transaction is fully valid
 *         <0  if the transaction is invalid
 */
int CMPTransaction::interpretPacket()
{
    if (rpcOnly) {
        PrintToLog("%s(): ERROR: attempt to execute logic in RPC mode\n", __func__);
        return (PKT_ERROR -1);
    }

    if (!interpret_Transaction()) {
        return (PKT_ERROR -2);
    }

    LOCK(cs_tally);

    //change_001
    
    if (isAddressFrozen(sender, property)) {
        PrintToLog("%s(): REJECTED: address %s is frozen for property %d\n", __func__, sender, property);
        return (PKT_ERROR -3);
    }
    /*
    if (isAddressFrozen(receiver, property) && (type != MSC_TYPE_UNFREEZE_PROPERTY_TOKENS)) {
        PrintToLog("%s(): REJECTED: address %s is frozen for property %d\n", __func__, receiver, property);
        return (PKT_ERROR -3);
    }
    */
    switch (type) {
        case MSC_TYPE_SIMPLE_SEND:
            return logicMath_SimpleSend();

        case MSC_TYPE_BUY_TOKEN:
            return logicMath_BuyToken();

        case MSC_TYPE_SEND_TO_OWNERS:
            return logicMath_SendToOwners();

        case MSC_TYPE_SEND_ALL:
            return logicMath_SendAll();

        case MSC_TYPE_CREATE_PROPERTY_FIXED:
            return logicMath_CreatePropertyFixed();

        case MSC_TYPE_CREATE_PROPERTY_VARIABLE:
            return logicMath_CreatePropertyVariable();

        case MSC_TYPE_CLOSE_CROWDSALE:
            return logicMath_CloseCrowdsale();

        case MSC_TYPE_CREATE_PROPERTY_MANUAL:
            return logicMath_CreatePropertyManaged();

        case MSC_TYPE_GRANT_PROPERTY_TOKENS:
            return logicMath_GrantTokens();

        case MSC_TYPE_REVOKE_PROPERTY_TOKENS:
            return logicMath_RevokeTokens();

        case MSC_TYPE_CHANGE_ISSUER_ADDRESS:
            return logicMath_ChangeIssuer();
			
		case MSC_TYPE_FREEZE_PROPERTY_TOKENS:
            return logicMath_FreezeTokens();

        case MSC_TYPE_UNFREEZE_PROPERTY_TOKENS:
            return logicMath_UnfreezeTokens();

        case WHC_TYPE_GET_BASE_PROPERTY:
            return logicMath_burnBCHGetWHC();

        case WHC_TYPE_ERC721:
            return logicMath_ERC721();
    }

    return (PKT_ERROR -100);
}

int CMPTransaction::interpretFreezeTx()
{
    int ret = 0;
    if (!interpret_Transaction()) {
        return (PKT_ERROR -2);
    }
    LOCK(cs_tally);

    switch (type) {
        case MSC_TYPE_CREATE_PROPERTY_MANUAL: {
            uint32_t propertyId = _my_sps->findSPByTX(txid);
            if(propertyId == 0)
            {
                PrintToLog("%s(): ERROR: propertyid is zero!\n", __func__);
                return (PKT_ERROR_TOKENS - 24);
            }
            if (ucFreezingFlag) {
                enableFreezing(propertyId, block);
            }
            break;
        }
        case MSC_TYPE_FREEZE_PROPERTY_TOKENS: {
            ret = logicMath_FreezeTokens();
            break;
        }
        case MSC_TYPE_UNFREEZE_PROPERTY_TOKENS:{
            ret = logicMath_UnfreezeTokens();
            break;
        }
    }
    return ret;
}

bool CMPTransaction::isFreezeEnable()
{
    memcpy(&prev_prop_id, &pkt[7], 4);
    swapByteOrder32(prev_prop_id);
    const CConsensusParams& params = ConsensusParams();

    if(block >= params.WHC_FREEZENACTIVATE_BLOCK)
    {
        ucFreezingFlag = prev_prop_id & 0x00000001;
        prev_prop_id = prev_prop_id >> 1;
    }
    else {
        ucFreezingFlag = 0;
    }
    return ucFreezingFlag;
}

// change_101 insert a entry to global state, when one address burn BCH to get WHC.
int CMPTransaction::logicMath_burnBCHGetWHC()
{
    const CConsensusParams& params = ConsensusParams();
	PrintToLog("find txid: %s will burn %d BCH to get WHC\n", txid.ToString(), burnBCH);
    if (block >= params.GENESIS_BLOCK && block <= params.LAST_EXODUS_BLOCK) {
        if (burnBCH < COIN.GetSatoshis()) {
            PrintToLog("%s(): rejected: no enough burn money. expect min : 1BCH, actual burn amount : %d Satoshis\n", __func__, burnBCH);
            return PKT_ERROR_BURN - 1;
        }

        int64_t amountGenerated = params.exodusReward * burnBCH;
        if (amountGenerated > 0) {
            pendingCreateWHC.insert({block, std::make_pair(txid.ToString(), std::make_pair(sender, amountGenerated))});
            PrintToLog("Exodus Fundraiser tx detected, tx %s generated %s\n", txid.ToString(), amountGenerated);
            return 0;
        }{
		    PrintToLog("not have enough bch : %d\n", burnBCH);
	    }
    }else{
	    PrintToLog("tx in %d blockHeight, is not in valid range [%d, %d]\n", block, params.GENESIS_BLOCK, params.LAST_EXODUS_BLOCK);
	}

    return PKT_ERROR_BURN - 2;
}

int CMPTransaction::logicMath_ERC721(){

    switch (erc721_action){
        case ERC721Action::ISSUE_ERC721_PROPERTY :
            return logicMath_ERC721_issueproperty();

        case ERC721Action::ISSUE_ERC721_TOKEN :
            return logicMath_ERC721_issuetoken();

        case ERC721Action::TRANSFER_REC721_TOKEN :
            return logicMath_ERC721_transfertoken();

        case ERC721Action::DESTROY_ERC721_TOKEN :
            return logicMath_ERC721_destroytoken();
    }

    return PKT_ERROR_ERC721 - 1;
}

int CMPTransaction::logicMath_ERC721_issueproperty(){
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsERC721TransactionTypeAllowed(block, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for create ERC721 property at block %d\n",
                   __func__,
                   type,
                   version,
                   block);
        return (PKT_ERROR_SP -22);
    }

    int64_t money = getMPbalance(sender, OMNI_PROPERTY_WHC, BALANCE);
    if(money < CREATE_TOKEN_FEE) {
        PrintToLog("%s(): rejected: no enough whc for pay create_token_fee: %s\n", __func__, FormatDivisibleMP(money, PRICE_PRECISION));
        return (PKT_ERROR_BURN - 3);
    }

    if ('\0' == erc721_propertyname[0]) {
        PrintToLog("%s(): rejected: property name must not be empty\n", __func__);
        return (PKT_ERROR_SP -37);
    }

    if(max_erc721number == 0){
        PrintToLog("%s(): rejected: property issue token number :%d out of range or zero \n", __func__, max_erc721number);
        return (PKT_ERROR_ERC721 - 101);
    }

    CMPSPERC721Info::PropertyInfo info;
    info.updateBlock = blockHash;
    info.creationBlock = blockHash;
    info.txid = txid;
    info.issuer = sender;
    info.data.assign(erc721_propertydata);
    info.symbol.assign(erc721_propertysymbol);
    info.url.assign(erc721_propertyurl);
    info.name.assign(erc721_propertyname);
    info.maxTokens = max_erc721number;

    uint256 properyid = my_erc721sps->putSP(info);
    assert(update_tally_map(sender, OMNI_PROPERTY_WHC, -CREATE_TOKEN_FEE, BALANCE));
    assert(update_tally_map(burnwhc_address, OMNI_PROPERTY_WHC, CREATE_TOKEN_FEE, BALANCE));

    PrintToLog("%s(): sender : %s have succeed ERC721 property, ID : %s \n", __func__, sender, properyid.GetHex());

    return 0;
}

int CMPTransaction::logicMath_ERC721_issuetoken(){

    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsERC721TransactionTypeAllowed(block, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for create ERC721 Token at block %d\n",
                   __func__,
                   type,
                   version,
                   block);
        return (PKT_ERROR_SP -22);
    }

    std::pair<CMPSPERC721Info::PropertyInfo, Flags> *spInfo = NULL;
    if(!my_erc721sps->getForUpdateSP(erc721_propertyid, &spInfo)){
        PrintToLog("%s(): rejected: type %d or version %d action %d not permitted, because get special property %s failed at block %d\n",
                   __func__,
                   type,
                   version,
                   erc721_action,
                   erc721_propertyid.GetHex(),
                   block);
        return (PKT_ERROR_ERC721 -202);
    }

    if(spInfo->first.issuer != sender){
        PrintToLog("%s(): rejected: the erc721 token's issuer %s is not the special property issuer %s at block %d\n",
                   __func__,
                   sender,
                   spInfo->first.issuer,
                   block);
        return (PKT_ERROR_ERC721 - 203);
    }

    if(receiver.empty()){
        receiver = sender;
    }

    if(receiver == burnwhc_address){
        PrintToLog("%s(): rejected: issue token's receiver address or transfer token's receiver is not destory address\n", __func__);
        return (PKT_ERROR_ERC721 - 206);
    }

    if(spInfo->first.haveIssuedNumber == spInfo->first.maxTokens){
        PrintToLog("%s(): rejected: sender : %s have issued erc721 token's number exceed property created maxnumber setup at block %d\n",
                   __func__,
                   sender,
                   block);
        return (PKT_ERROR_ERC721 - 207);
    }

    bool autoTokenID = false;
    uint64_t tmpTokenID = 0;
    if(!erc721_tokenid.IsNull()){
        if(my_erc721tokens->existToken(erc721_propertyid, erc721_tokenid)){
            PrintToLog("%s(): rejected: user special property %s tokenid %s will be created that have exist at block %d\n",
                       __func__,
                       erc721_propertyid.GetHex(),
                       erc721_tokenid.GetHex(),
                       block);
            return (PKT_ERROR_ERC721 - 204);
        }
    } else{
        tmpTokenID = spInfo->first.autoNextTokenID;
        do{
            erc721_tokenid = ArithToUint256(arith_uint256(tmpTokenID++));
        }while(my_erc721tokens->existToken(erc721_propertyid, erc721_tokenid));
        autoTokenID = true;
    }

    ERC721TokenInfos::TokenInfo info;
    info.txid = txid;
    info.owner = receiver;
    info.updateBlockHash = blockHash;
    info.creationBlockHash = blockHash;
    info.attributes = uint256(std::vector<uint8_t>(erc721token_attribute, erc721token_attribute + sizeof(erc721token_attribute)));
    info.url.assign(erc721_tokenurl);
    if (!my_erc721tokens->putToken(erc721_propertyid, erc721_tokenid, info)){
        PrintToLog("%s(): rejected: put new token %s in property %s failed at block %d \n",
                   __func__,
                   erc721_tokenid.GetHex(),
                   erc721_propertyid.GetHex(),
                   block);
        return (PKT_ERROR_ERC721 - 205);
    }
    spInfo->second = Flags::DIRTY;
    spInfo->first.haveIssuedNumber++;
    spInfo->first.currentValidIssuedNumer++;
    if (autoTokenID) spInfo->first.autoNextTokenID = tmpTokenID;

    PrintToLog("%s(): sender : %s have succeed issued ERC721 Token, propertyid : %s tokenid : %s at block %d \n",
               __func__, sender, erc721_propertyid.GetHex(), erc721_tokenid.GetHex(), block);
    return 0;
}

int CMPTransaction::logicMath_ERC721_transfertoken(){
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsERC721TransactionTypeAllowed(block, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for transfer ERC721 token at block %d\n",
                   __func__,
                   type,
                   version,
                   block);
        return (PKT_ERROR_SP -22);
    }

    std::pair<ERC721TokenInfos::TokenInfo, Flags>* info = NULL;
    if(!my_erc721tokens->getForUpdateToken(erc721_propertyid, erc721_tokenid, &info)){
        PrintToLog("%s(): rejected: get ERC721 property : %s token : %s at block %d failed\n",
                   __func__,
                   erc721_propertyid.GetHex(),
                   erc721_tokenid.GetHex(),
                   block);
        return (PKT_ERROR_ERC721 - 208);
    }

    if(info->first.owner != sender){
        PrintToLog("%s(): rejected: Transfer ERC721 property : %s sender : %s is not owned this token : %s, tokens' owner : %s at block %d\n",
                   __func__,
                   erc721_propertyid.GetHex(),
                   sender,
                   erc721_tokenid.GetHex(),
                   info->first.owner,
                   block);
        return (PKT_ERROR_ERC721 -302);
    }

    if(receiver.empty()){
        receiver = sender;
    }

    if(receiver == burnwhc_address){
        PrintToLog("%s(): rejected: issue token's receiver address or transfer token's receiver is destory address\n", __func__);
        return (PKT_ERROR_ERC721 - 206);
    }

    info->first.owner = receiver;
    info->second = Flags::DIRTY;

    PrintToLog("%s(): sender : %s have succeed transfer ERC721 Token, propertyid : %s tokenid : %s to receiver %s at block %d \n",
               __func__, sender, erc721_propertyid.GetHex(), erc721_tokenid.GetHex(), receiver, block);

    return 0;
}

int CMPTransaction::logicMath_ERC721_destroytoken(){
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsERC721TransactionTypeAllowed(block, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for destroy ERC721 token at block %d\n",
                   __func__,
                   type,
                   version,
                   block);
        return (PKT_ERROR_SP -22);
    }

    std::pair<CMPSPERC721Info::PropertyInfo, Flags> *spInfo = NULL;
    if(!my_erc721sps->getForUpdateSP(erc721_propertyid, &spInfo)){
        PrintToLog("%s(): rejected: type %d or version %d action %d not permitted, because get special property %s failed at block %d\n",
                   __func__,
                   type,
                   version,
                   erc721_action,
                   erc721_propertyid.GetHex(),
                   block);
        return (PKT_ERROR_ERC721 -202);
    }

    std::pair<ERC721TokenInfos::TokenInfo, Flags>* info = NULL;
    if(!my_erc721tokens->getForUpdateToken(erc721_propertyid, erc721_tokenid, &info)){
        PrintToLog("%s(): rejected: get ERC721 property : %s token : %s at block %d failed\n",
                   __func__,
                   erc721_propertyid.GetHex(),
                   erc721_tokenid.GetHex(),
                   block);
        return (PKT_ERROR_ERC721 - 208);
    }

    if(info->first.owner != sender){
        PrintToLog("%s(): rejected: Transfer ERC721 property : %s sender : %s is not owned this token : %s, tokens' owner : %s at block %d\n",
                   __func__,
                   erc721_propertyid.GetHex(),
                   sender,
                   erc721_tokenid.GetHex(),
                   info->first.owner,
                   block);
        return (PKT_ERROR_ERC721 -302);
    }

    info->first.owner = burnwhc_address;
    info->second = Flags::DIRTY;
    spInfo->first.currentValidIssuedNumer --;
    spInfo->second = Flags::DIRTY;

    PrintToLog("%s(): sender : %s have succeed destroy ERC721 Token, propertyid : %s tokenid : %s to receiver %s at block %d \n",
               __func__, sender, erc721_propertyid.GetHex(), erc721_tokenid.GetHex(), burnwhc_address, block);

    return 0;
}

/** Tx 0 */
int CMPTransaction::logicMath_SimpleSend()
{
    if (isAddressFrozen(sender, property)) {
        PrintToLog("%s(): REJECTED: address %s is frozen for property %d\n", __func__, sender, property);
        return (PKT_ERROR -3);
    }
    if (isAddressFrozen(receiver, property)) {
        PrintToLog("%s(): REJECTED: address %s is frozen for property %d\n", __func__, receiver, property);
        return (PKT_ERROR -4);
    }
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_SEND -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d", __func__, nValue);
        return (PKT_ERROR_SEND -23);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_SEND -24);
    }

    int64_t nBalance = getMPbalance(sender, property, BALANCE);
    if (nBalance < (int64_t) nValue) {
        PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d [%s < %s]\n",
                __func__,
                sender,
                property,
                FormatMP(property, nBalance),
                FormatMP(property, nValue));
        return (PKT_ERROR_SEND -25);
    }

    // ------------------------------------------

    // Special case: if can't find the receiver -- assume send to self!
    if (receiver.empty()) {
        receiver = sender;
    }

    // Move the tokens
    assert(update_tally_map(sender, property, -nValue, BALANCE));
    assert(update_tally_map(receiver, property, nValue, BALANCE));

    return 0;
}

/** Tx 1 */
int CMPTransaction::logicMath_BuyToken()
{
    if (isAddressFrozen(sender, property)) {
        PrintToLog("%s(): rejected: property %d is frozen\n", __func__, property);
        return (PKT_ERROR -3);
    }
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                   __func__,
                   type,
                   version,
                   property,
                   block);
        return (PKT_ERROR_SEND -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d", __func__, nValue);
        return (PKT_ERROR_SEND -23);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_SEND -24);
    }

    int64_t nBalance = getMPbalance(sender, property, BALANCE);
    if (nBalance < (int64_t) nValue) {
        PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d [%s < %s]\n",
                   __func__,
                   sender,
                   property,
                   FormatMP(property, nBalance),
                   FormatMP(property, nValue));
        return (PKT_ERROR_SEND -25);
    }

    // ------------------------------------------

    if (receiver.empty()) {
        return (PKT_ERROR_SEND -26);
    }

    // Is there an active crowdsale running from this recepient?
    CMPCrowd* pcrowdsale = getCrowd(receiver);

    // No active crowdsale
    if (pcrowdsale == NULL) {
        return (PKT_ERROR_CROWD -1);
    }
    // Active crowdsale, but not for this property
    if (pcrowdsale->getCurrDes() != property) {
        return (PKT_ERROR_CROWD -2);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(pcrowdsale->getPropertyId(), sp));
    PrintToLog("INVESTMENT SEND to Crowdsale Issuer: %s\n", receiver);
    if(sp.issuer == sender){
        return (PKT_ERROR_CROWD -3);
    }

    // Holds the tokens to be credited to the sender and issuer
    std::pair<int64_t, int64_t> tokens;
    int64_t refund,money;

    // Passed by reference to determine, if max_tokens has been reached
    bool close_crowdsale = false;

    // Units going into the calculateFundraiser function must match the unit of
    // the fundraiser's property_type. By default this means satoshis in and
    // satoshis out. In the condition that the fundraiser is divisible, but
    // indivisible tokens are accepted, it must account for .0 Div != 1 Indiv,
    // but actually 1.0 Div == 100000000 Indiv. The unit must be shifted or the
    // values will be incorrect, which is what is checked below.
    uint16_t precision = sp.getPrecision();

    tokens.first = 0;
    tokens.second = 0;

    // Calculate the amounts to credit for this fundraiser
    calculateFundraiser(precision, nValue, sp.early_bird, sp.deadline, blockTime, sp.rate,
                        getSaledTokens(pcrowdsale->getPropertyId()),sp.num_tokens,
                        tokens.first, close_crowdsale,refund);

    if (msc_debug_sp) {
        PrintToLog("%s(): granting via crowdsale to user: %s %d (%s)\n",
                   __func__, FormatMP(property, tokens.first), property, strMPProperty(property));
        PrintToLog("%s(): granting via crowdsale to issuer: %s %d (%s)\n",
                   __func__, FormatMP(property, tokens.second), property, strMPProperty(property));
    }

    if(refund >= 0) {
        money = nValue - refund;
    }
    else {
        return (PKT_ERROR_CROWD -4);
    }

    // Update the crowdsale object
    pcrowdsale->incTokensUserCreated(tokens.first);
    pcrowdsale->incTokensIssuerCreated(tokens.second);

    // Data to pass to txFundraiserData
    int64_t txdata[] = {(int64_t)money, blockTime, tokens.first, tokens.second};
    std::vector<int64_t> txDataVec(txdata, txdata + sizeof(txdata) / sizeof(txdata[0]));

    // Insert data about crowdsale participation
    pcrowdsale->insertDatabase(txid, txDataVec);

    // Credit tokens for this fundraiser
    if (tokens.first > 0) {
        if(money > 0) {
            assert(update_tally_map(sender, pcrowdsale->getPropertyId(), tokens.first, BALANCE));
            assert(update_tally_map(sender, property, -money, BALANCE));
            assert(update_tally_map(receiver, property, money, BALANCE));
        }
        else {
            return (PKT_ERROR_CROWD -5);
        }
    }
    if (tokens.second > 0) {
        assert(update_tally_map(receiver, pcrowdsale->getPropertyId(), tokens.second, BALANCE));
    }

    // Number of tokens has changed, update fee distribution thresholds
    NotifyTotalTokensChanged(pcrowdsale->getPropertyId(), block);

    // Close crowdsale, if we hit MAX_TOKENS
    if (close_crowdsale) {
        eraseMaxedCrowdsale(receiver, blockTime, block);
    }

    return 0;
}

/** Tx 3 */
int CMPTransaction::logicMath_SendToOwners()
{
    if (isAddressFrozen(sender, property)) {
        PrintToLog("%s(): rejected: property %d is frozen\n", __func__, property);
        return (PKT_ERROR -3);
    }
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_STO -22);
    }
	
	if (version != MP_TX_PKT_V0) {
		PrintToLog("%s(): rejected: only support MP_TX_PKT_V0 version SendToOwners\n", __func__);
	}

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (PKT_ERROR_STO -23);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_STO -24);
    }

    if (!IsPropertyIdValid(distribution_property)) {
        PrintToLog("%s(): rejected: distribution property %d does not exist\n", __func__, distribution_property);
        return (PKT_ERROR_STO -24);
    }

    int64_t nBalance = getMPbalance(sender, property, BALANCE);
    if (nBalance < (int64_t) nValue) {
        PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d [%s < %s]\n",
                __func__,
                sender,
                property,
                FormatMP(property, nBalance),
                FormatMP(property, nValue)
                );
        return (PKT_ERROR_STO -25);
    }

    // ------------------------------------------

    uint32_t distributeTo = distribution_property;
    OwnerAddrType receiversSet = STO_GetReceivers(sender, distributeTo, nValue, block, property);
    uint64_t numberOfReceivers = receiversSet.size();

    // make sure we found some owners
    if (numberOfReceivers <= 0) {
        PrintToLog("%s(): rejected: no other owners of property %d [owners=%d <= 0]\n", __func__, distributeTo, numberOfReceivers);
        return (PKT_ERROR_STO -26);
    }

    // determine which property the fee will be paid in
    uint32_t feeProperty = isTestEcosystemProperty(property) ? OMNI_PROPERTY_TWHC : OMNI_PROPERTY_WHC;
    int64_t feePerOwner = (version == MP_TX_PKT_V0) ? TRANSFER_FEE_PER_OWNER : TRANSFER_FEE_PER_OWNER_V1;
    int64_t transferFee = feePerOwner * numberOfReceivers;
    PrintToLog("\t    Transfer fee: %s %s\n", FormatIndivisibleMP(transferFee), strMPProperty(feeProperty));

    // enough coins to pay the fee?
    if (feeProperty != property) {
        int64_t nBalanceFee = getMPbalance(sender, feeProperty, BALANCE);
        if (nBalanceFee < transferFee) {
            PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d to pay for fee [%s < %s]\n",
                    __func__,
                    sender,
                    feeProperty,
                    FormatMP(property, nBalanceFee),
                    FormatMP(property, transferFee));
            return (PKT_ERROR_STO -27);
        }
    } else {
        // special case check, only if distributing MSC or TMSC -- the property the fee will be paid in
        int64_t nBalanceFee = getMPbalance(sender, feeProperty, BALANCE);
        if (nBalanceFee < ((int64_t) nValue + transferFee)) {
            PrintToLog("%s(): rejected: sender %s has insufficient balance of %d to pay for amount + fee [%s < %s + %s]\n",
                    __func__,
                    sender,
                    feeProperty,
                    FormatMP(property, nBalanceFee),
                    FormatMP(property, nValue),
                    FormatMP(property, transferFee));
            return (PKT_ERROR_STO -28);
        }
    }

    // ------------------------------------------

    assert(update_tally_map(sender, feeProperty, -transferFee, BALANCE));
    assert(update_tally_map(burnwhc_address, OMNI_PROPERTY_WHC, transferFee, BALANCE));
    if (version == MP_TX_PKT_V0) {
        // v0 - do not credit the subtracted fee to any tally (ie burn the tokens)
    } else {
        // v1 - credit the subtracted fee to the fee cache
        p_feecache->AddFee(feeProperty, block, transferFee);
    }

    // split up what was taken and distribute between all holders
    int64_t sent_so_far = 0;
    for (OwnerAddrType::reverse_iterator it = receiversSet.rbegin(); it != receiversSet.rend(); ++it) {
        const std::string& address = it->second;

        int64_t will_really_receive = it->first;
        sent_so_far += will_really_receive;

        // real execution of the loop
        assert(update_tally_map(sender, property, -will_really_receive, BALANCE));
        assert(update_tally_map(address, property, will_really_receive, BALANCE));

        // add to stodb
        s_stolistdb->recordSTOReceive(address, txid, block, property, will_really_receive);

        if (sent_so_far != (int64_t)nValue) {
            PrintToLog("sent_so_far= %14d, nValue= %14d, n_owners= %d\n", sent_so_far, nValue, numberOfReceivers);
        } else {
            PrintToLog("SendToOwners: DONE HERE\n");
        }
    }

    // sent_so_far must equal nValue here
    assert(sent_so_far == (int64_t)nValue);

    // Number of tokens has changed, update fee distribution thresholds
    if (version == MP_TX_PKT_V0) NotifyTotalTokensChanged(OMNI_PROPERTY_WHC, block); // fee was burned

    return 0;
}

/** Tx 4 */
int CMPTransaction::logicMath_SendAll()
{
    if (!IsTransactionTypeAllowed(block, ecosystem, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                ecosystem,
                block);
        return (PKT_ERROR_SEND_ALL -22);
    }

    // ------------------------------------------

    // Special case: if can't find the receiver -- assume send to self!
    if (receiver.empty()) {
        receiver = sender;
    }

    //change_002
    if (OMNI_PROPERTY_WHC != ecosystem) {
        PrintToLog("%s(): rejected: invalid ecosystem: %d\n", __func__, (uint32_t) ecosystem);
        return (PKT_ERROR_SP -21);
    }

    CMPTally* ptally = getTally(sender);
    if (ptally == NULL) {
        PrintToLog("%s(): rejected: sender %s has no tokens to send\n", __func__, sender);
        return (PKT_ERROR_SEND_ALL -54);
    }

    uint32_t propertyId = ptally->init();
    int numberOfPropertiesSent = 0;

    while (0 != (propertyId = ptally->next())) {
        // only transfer tokens in the specified ecosystem
        if (ecosystem == OMNI_PROPERTY_WHC && isTestEcosystemProperty(propertyId)) {
            continue;
        }
        if (ecosystem == OMNI_PROPERTY_TWHC && isMainEcosystemProperty(propertyId)) {
            continue;
        }

        // do not transfer tokens from a frozen property
        if (isAddressFrozen(sender, propertyId)) {
            PrintToLog("%s(): sender %s is frozen for property %d - the property will not be included in processing.\n", __func__, sender, propertyId);
            continue;
        }
        if (isAddressFrozen(receiver, propertyId)) {
            PrintToLog("%s(): receiver %s is frozen for property %d - the property will not be included in processing.\n", __func__, receiver, propertyId);
            continue;
        }
        int64_t moneyAvailable = ptally->getMoney(propertyId, BALANCE);
        if (moneyAvailable > 0) {
            ++numberOfPropertiesSent;
            assert(update_tally_map(sender, propertyId, -moneyAvailable, BALANCE));
            assert(update_tally_map(receiver, propertyId, moneyAvailable, BALANCE));
            p_txlistdb->recordSendAllSubRecord(txid, numberOfPropertiesSent, propertyId, moneyAvailable);
        }
    }

    if (!numberOfPropertiesSent) {
        PrintToLog("%s(): rejected: sender %s has no tokens to send\n", __func__, sender);
        return (PKT_ERROR_SEND_ALL -55);
    }

    nNewValue = numberOfPropertiesSent;

    return 0;
}

/** Tx 20 */
int CMPTransaction::logicMath_TradeOffer()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TRADEOFFER -22);
    }

    if (MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (PKT_ERROR_TRADEOFFER -23);
    }

    if (OMNI_PROPERTY_TWHC != property && OMNI_PROPERTY_WHC != property) {
        PrintToLog("%s(): rejected: property for sale %d must be OMNI or TOMNI\n", __func__, property);
        return (PKT_ERROR_TRADEOFFER -47);
    }

    // ------------------------------------------

    int rc = PKT_ERROR_TRADEOFFER;

    // figure out which Action this is based on amount for sale, version & etc.
    switch (version)
    {
        case MP_TX_PKT_V0:
        {
            if (0 != nValue) {
                if (!DEx_offerExists(sender, property)) {
                    rc = DEx_offerCreate(sender, property, nValue, block, amount_desired, min_fee, blocktimelimit, txid, &nNewValue);
                } else {
                    rc = DEx_offerUpdate(sender, property, nValue, block, amount_desired, min_fee, blocktimelimit, txid, &nNewValue);
                }
            } else {
                // what happens if nValue is 0 for V0 ?  ANSWER: check if exists and it does -- cancel, otherwise invalid
                if (DEx_offerExists(sender, property)) {
                    rc = DEx_offerDestroy(sender, property);
                } else {
                    PrintToLog("%s(): rejected: sender %s has no active sell offer for property: %d\n", __func__, sender, property);
                    rc = (PKT_ERROR_TRADEOFFER -49);
                }
            }

            break;
        }

        case MP_TX_PKT_V1:
        {
            if (DEx_offerExists(sender, property)) {
                if (CANCEL != subaction && UPDATE != subaction) {
                    PrintToLog("%s(): rejected: sender %s has an active sell offer for property: %d\n", __func__, sender, property);
                    rc = (PKT_ERROR_TRADEOFFER -48);
                    break;
                }
            } else {
                // Offer does not exist
                if (NEW != subaction) {
                    PrintToLog("%s(): rejected: sender %s has no active sell offer for property: %d\n", __func__, sender, property);
                    rc = (PKT_ERROR_TRADEOFFER -49);
                    break;
                }
            }

            switch (subaction) {
                case NEW:
                    rc = DEx_offerCreate(sender, property, nValue, block, amount_desired, min_fee, blocktimelimit, txid, &nNewValue);
                    break;

                case UPDATE:
                    rc = DEx_offerUpdate(sender, property, nValue, block, amount_desired, min_fee, blocktimelimit, txid, &nNewValue);
                    break;

                case CANCEL:
                    rc = DEx_offerDestroy(sender, property);
                    break;

                default:
                    rc = (PKT_ERROR -999);
                    break;
            }
            break;
        }

        default:
            rc = (PKT_ERROR -500); // neither V0 nor V1
            break;
    };

    return rc;
}

/** Tx 22 */
int CMPTransaction::logicMath_AcceptOffer_BTC()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (DEX_ERROR_ACCEPT -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (DEX_ERROR_ACCEPT -23);
    }

    // ------------------------------------------

    // the min fee spec requirement is checked in the following function
    int rc = DEx_acceptCreate(sender, receiver, property, nValue, block, tx_fee_paid, &nNewValue);

    return rc;
}

/** Tx 25 */
int CMPTransaction::logicMath_MetaDExTrade()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_METADEX -22);
    }

    if (property == desired_property) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d must not be equal\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -29);
    }

    if (isTestEcosystemProperty(property) != isTestEcosystemProperty(desired_property)) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d not in same ecosystem\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -30);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property for sale %d does not exist\n", __func__, property);
        return (PKT_ERROR_METADEX -31);
    }

    if (!IsPropertyIdValid(desired_property)) {
        PrintToLog("%s(): rejected: desired property %d does not exist\n", __func__, desired_property);
        return (PKT_ERROR_METADEX -32);
    }

    if (nNewValue <= 0 || MAX_INT_8_BYTES < nNewValue) {
        PrintToLog("%s(): rejected: amount for sale out of range or zero: %d\n", __func__, nNewValue);
        return (PKT_ERROR_METADEX -33);
    }

    if (desired_value <= 0 || MAX_INT_8_BYTES < desired_value) {
        PrintToLog("%s(): rejected: desired amount out of range or zero: %d\n", __func__, desired_value);
        return (PKT_ERROR_METADEX -34);
    }

    if (!IsFeatureActivated(FEATURE_TRADEALLPAIRS, block)) {
        // Trading non-Omni pairs is not allowed before trading all pairs is activated
        if ((property != OMNI_PROPERTY_WHC) && (desired_property != OMNI_PROPERTY_WHC) &&
            (property != OMNI_PROPERTY_TWHC) && (desired_property != OMNI_PROPERTY_TWHC)) {
            PrintToLog("%s(): rejected: one side of a trade [%d, %d] must be OMNI or TOMNI\n", __func__, property, desired_property);
            return (PKT_ERROR_METADEX -35);
        }
    }

    int64_t nBalance = getMPbalance(sender, property, BALANCE);
    if (nBalance < (int64_t) nNewValue) {
        PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d [%s < %s]\n",
                __func__,
                sender,
                property,
                FormatMP(property, nBalance),
                FormatMP(property, nNewValue));
        return (PKT_ERROR_METADEX -25);
    }

    // ------------------------------------------

    t_tradelistdb->recordNewTrade(txid, sender, property, desired_property, block, tx_idx);
    int rc = MetaDEx_ADD(sender, property, nNewValue, block, desired_property, desired_value, txid, tx_idx);
    return rc;
}

/** Tx 26 */
int CMPTransaction::logicMath_MetaDExCancelPrice()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_METADEX -22);
    }

    if (property == desired_property) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d must not be equal\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -29);
    }

    if (isTestEcosystemProperty(property) != isTestEcosystemProperty(desired_property)) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d not in same ecosystem\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -30);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property for sale %d does not exist\n", __func__, property);
        return (PKT_ERROR_METADEX -31);
    }

    if (!IsPropertyIdValid(desired_property)) {
        PrintToLog("%s(): rejected: desired property %d does not exist\n", __func__, desired_property);
        return (PKT_ERROR_METADEX -32);
    }

    if (nNewValue <= 0 || MAX_INT_8_BYTES < nNewValue) {
        PrintToLog("%s(): rejected: amount for sale out of range or zero: %d\n", __func__, nNewValue);
        return (PKT_ERROR_METADEX -33);
    }

    if (desired_value <= 0 || MAX_INT_8_BYTES < desired_value) {
        PrintToLog("%s(): rejected: desired amount out of range or zero: %d\n", __func__, desired_value);
        return (PKT_ERROR_METADEX -34);
    }

    // ------------------------------------------

    int rc = MetaDEx_CANCEL_AT_PRICE(txid, block, sender, property, nNewValue, desired_property, desired_value);

    return rc;
}

/** Tx 27 */
int CMPTransaction::logicMath_MetaDExCancelPair()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_METADEX -22);
    }

    if (property == desired_property) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d must not be equal\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -29);
    }

    if (isTestEcosystemProperty(property) != isTestEcosystemProperty(desired_property)) {
        PrintToLog("%s(): rejected: property for sale %d and desired property %d not in same ecosystem\n",
                __func__,
                property,
                desired_property);
        return (PKT_ERROR_METADEX -30);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property for sale %d does not exist\n", __func__, property);
        return (PKT_ERROR_METADEX -31);
    }

    if (!IsPropertyIdValid(desired_property)) {
        PrintToLog("%s(): rejected: desired property %d does not exist\n", __func__, desired_property);
        return (PKT_ERROR_METADEX -32);
    }

    // ------------------------------------------

    int rc = MetaDEx_CANCEL_ALL_FOR_PAIR(txid, block, sender, property, desired_property);

    return rc;
}

/** Tx 28 */
int CMPTransaction::logicMath_MetaDExCancelEcosystem()
{
    if (!IsTransactionTypeAllowed(block, ecosystem, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_METADEX -22);
    }

    if (OMNI_PROPERTY_WHC != ecosystem && OMNI_PROPERTY_TWHC != ecosystem) {
        PrintToLog("%s(): rejected: invalid ecosystem: %d\n", __func__, ecosystem);
        return (PKT_ERROR_METADEX -21);
    }

    int rc = MetaDEx_CANCEL_EVERYTHING(txid, block, sender, ecosystem);

    return rc;
}

/** Tx 50 */
int CMPTransaction::logicMath_CreatePropertyFixed()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    //change_002
    if (OMNI_PROPERTY_WHC != ecosystem) {
        PrintToLog("%s(): rejected: invalid ecosystem: %d\n", __func__, (uint32_t) ecosystem);
        return (PKT_ERROR_SP -21);
    }
	if ( prop_type > 8){
        PrintToLog("%s(): rejected: invalid property type: %d\n", __func__, (uint32_t) prop_type);
        return (PKT_ERROR_SP -36);
	}

    if (!IsTransactionTypeAllowed(block, ecosystem, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_SP -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (PKT_ERROR_SP -23);
    }

    //change_002
    if (0 != prev_prop_id) {
        PrintToLog("%s(): rejected: do not support prev_prop_id parameters %d\n", __func__, prev_prop_id);
        return (PKT_ERROR_SP -51);
    }

    int64_t money = getMPbalance(sender, OMNI_PROPERTY_WHC, BALANCE);
    if(money < CREATE_TOKEN_FEE) {
        PrintToLog("%s(): rejected: no enough whc for pay create_token_fee: %d\n", __func__, money);
        return (PKT_ERROR_BURN -3);
    }

    if ('\0' == name[0]) {
        PrintToLog("%s(): rejected: property name must not be empty\n", __func__);
        return (PKT_ERROR_SP -37);
    }

    // ------------------------------------------

    CMPSPInfo::Entry newSP;
    newSP.issuer = sender;
    newSP.txid = txid;
    newSP.prop_type = prop_type;
    newSP.num_tokens = nValue;
    newSP.category.assign(category);
    newSP.subcategory.assign(subcategory);
    newSP.name.assign(name);
    newSP.url.assign(url);
    newSP.data.assign(data);
    newSP.fixed = true;
    newSP.creation_block = blockHash;
    newSP.update_block = newSP.creation_block;

    const uint32_t propertyId = _my_sps->putSP(ecosystem, newSP);
    assert(propertyId > 0);
    //change_002
    assert(update_tally_map(sender, OMNI_PROPERTY_WHC, -CREATE_TOKEN_FEE, BALANCE));
    assert(update_tally_map(burnwhc_address, OMNI_PROPERTY_WHC, CREATE_TOKEN_FEE, BALANCE));
    assert(update_tally_map(sender, propertyId, nValue, BALANCE));

    NotifyTotalTokensChanged(propertyId, block);

    return 0;
}

/** Tx 51 */
int CMPTransaction::logicMath_CreatePropertyVariable()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    //change_002
    if (OMNI_PROPERTY_WHC != ecosystem) {
        PrintToLog("%s(): rejected: invalid ecosystem: %d\n", __func__, (uint32_t) ecosystem);
        return (PKT_ERROR_SP -21);
    }
	if (prop_type > 8){
        PrintToLog("%s(): rejected: invalid property precision: %d\n", __func__, (uint32_t) prop_type);
        return (PKT_ERROR_SP -35);
	}

    //if (IsFeatureActivated(FEATURE_SPCROWDCROSSOVER, block)) {
    /**
     * Ecosystem crossovers shall not be allowed after the feature was enabled.
     */
    /*
    if (isTestEcosystemProperty(ecosystem) != isTestEcosystemProperty(property)) {
        PrintToLog("%s(): rejected: ecosystem %d of tokens to issue and desired property %d not in same ecosystem\n",
                __func__,
                ecosystem,
                property);
        return (PKT_ERROR_SP -50);
    }
    }
    */

    if (!IsTransactionTypeAllowed(block, ecosystem, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_SP -22);
    }

    if (nValue <= 0 || MAX_TOKENPRICE < nValue) {
        PrintToLog("%s(): rejected: value %d out of range, range : [%d, %d]\n", __func__, nValue, MIN_TOKENPRICE, MAX_TOKENPRICE);
        return (PKT_ERROR_SP -23);
    }

    const CConsensusParams& params = ConsensusParams();
    if(block >= params.MSC_CHECK_VARIABLE_TOKEN){
        if (totalCrowsToken <= 0 || MAX_INT_8_BYTES < totalCrowsToken) {
            PrintToLog("%s(): rejected: totalCrowsToken out of range or zero: %d\n", __func__, totalCrowsToken);
            return (PKT_ERROR_SP -25);
        }
    }

    if (property != OMNI_PROPERTY_WHC) {
        PrintToLog("%s(): rejected: Desired property must be 1 now\n", __func__);
        return (PKT_ERROR_SP -34);
    }

    int64_t money = getMPbalance(sender, OMNI_PROPERTY_WHC, BALANCE);
    if(money < CREATE_TOKEN_FEE) {
        PrintToLog("%s(): rejected: no enough whc for pay create_token_fee: %d\n", __func__, money);
        return (PKT_ERROR_BURN -3);
    }

    if (0 != prev_prop_id) {
        PrintToLog("%s(): rejected: do not support prev_prop_id parameters %d\n", __func__, prev_prop_id);
        return (PKT_ERROR_SP -51);
    }

    if ('\0' == name[0]) {
        PrintToLog("%s(): rejected: property name must not be empty\n", __func__);
        return (PKT_ERROR_SP -37);
    }

    if (!deadline || (int64_t) deadline < blockTime) {
        PrintToLog("%s(): rejected: deadline must not be in the past [%d < %d]\n", __func__, deadline, blockTime);
        return (PKT_ERROR_SP -38);
    }

    if (NULL != getCrowd(sender)) {
        PrintToLog("%s(): rejected: sender %s has an active crowdsale\n", __func__, sender);
        return (PKT_ERROR_SP -39);
    }

    // ------------------------------------------

    CMPSPInfo::Entry newSP;
    newSP.issuer = sender;
    newSP.txid = txid;
    newSP.prop_type = prop_type;
    newSP.num_tokens = totalCrowsToken;
    newSP.category.assign(category);
    newSP.subcategory.assign(subcategory);
    newSP.name.assign(name);
    newSP.url.assign(url);
    newSP.data.assign(data);
    newSP.fixed = false;
    //change_002
    newSP.manual = false;
    newSP.rate = nValue;
    newSP.property_desired = OMNI_PROPERTY_WHC;
    newSP.deadline = deadline;
    newSP.early_bird = early_bird;
    newSP.percentage = percentage;
    newSP.creation_block = blockHash;
    newSP.update_block = newSP.creation_block;

    const uint32_t propertyId = _my_sps->putSP(ecosystem, newSP);
    assert(propertyId > 0);
    //change_002
    assert(update_tally_map(sender, OMNI_PROPERTY_WHC, -CREATE_TOKEN_FEE, BALANCE));
    assert(update_tally_map(burnwhc_address, OMNI_PROPERTY_WHC, CREATE_TOKEN_FEE, BALANCE));
    my_crowds.insert(std::make_pair(sender, CMPCrowd(propertyId, nValue, OMNI_PROPERTY_WHC, deadline, early_bird, percentage, 0, 0)));

    PrintToLog("CREATED CROWDSALE id: %d value: %d property: %d\n", propertyId, nValue, OMNI_PROPERTY_WHC);

    return 0;
}

/** Tx 53 */
int CMPTransaction::logicMath_CloseCrowdsale()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_SP -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_SP -24);
    }

    CrowdMap::iterator it = my_crowds.find(sender);
    if (it == my_crowds.end()) {
        PrintToLog("%s(): rejected: sender %s has no active crowdsale\n", __func__, sender);
        return (PKT_ERROR_SP -40);
    }

    const CMPCrowd& crowd = it->second;
    if (property != crowd.getPropertyId()) {
        PrintToLog("%s(): rejected: property identifier mismatch [%d != %d]\n", __func__, property, crowd.getPropertyId());
        return (PKT_ERROR_SP -41);
    }

    // ------------------------------------------

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    int64_t missedTokens = GetMissedIssuerBonus(sp, crowd);

    sp.historicalData = crowd.getDatabase();
    sp.update_block = blockHash;
    sp.close_early = true;
    sp.timeclosed = blockTime;
    sp.txid_close = txid;
    sp.missedTokens = missedTokens;

    assert(_my_sps->updateSP(property, sp));
    if (missedTokens > 0) {
        assert(update_tally_map(sp.issuer, property, missedTokens, BALANCE));
    }
    my_crowds.erase(it);

    if (msc_debug_sp) PrintToLog("CLOSED CROWDSALE id: %d=%X\n", property, property);

    return 0;
}

/** Tx 54 */
int CMPTransaction::logicMath_CreatePropertyManaged()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (OMNI_PROPERTY_WHC != ecosystem) {
        PrintToLog("%s(): rejected: invalid ecosystem: %d\n", __func__, (uint32_t) ecosystem);
        return (PKT_ERROR_SP -21);
    }
	if ( prop_type > 8){
        PrintToLog("%s(): rejected: invalid property type: %d\n", __func__, (uint32_t) prop_type);
        return (PKT_ERROR_SP -36);
	}

    if (!IsTransactionTypeAllowed(block, ecosystem, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_SP -22);
    }

    int64_t money = getMPbalance(sender, OMNI_PROPERTY_WHC, BALANCE);
    if(money < CREATE_TOKEN_FEE) {
        PrintToLog("%s(): rejected: no enough whc for pay create_token_fee: %d\n", __func__, money);
        return (PKT_ERROR_BURN -3);
    }

    const CConsensusParams& params = ConsensusParams();

    if(block >= params.WHC_FREEZENACTIVATE_BLOCK)
    {
        if(prev_prop_id != 0 && prev_prop_id != 1)
        {
            PrintToLog("%s(): rejected: do not support prev_prop_id parameters %d\n", __func__, prev_prop_id);
            return (PKT_ERROR_SP -52);
        }
    }
    else {
        if(prev_prop_id != 0)
        {
            PrintToLog("%s(): rejected: do not support prev_prop_id parameters %d\n", __func__, prev_prop_id);
            return (PKT_ERROR_SP -51);
        }
    }


    if ('\0' == name[0]) {
        PrintToLog("%s(): rejected: property name must not be empty\n", __func__);
        return (PKT_ERROR_SP -37);
    }

    // ------------------------------------------

    CMPSPInfo::Entry newSP;
    newSP.issuer = sender;
    newSP.txid = txid;
    newSP.prop_type = prop_type;
    newSP.prev_prop_id = prev_prop_id;
    newSP.category.assign(category);
    newSP.subcategory.assign(subcategory);
    newSP.name.assign(name);
    newSP.url.assign(url);
    newSP.data.assign(data);
    newSP.fixed = false;
    newSP.manual = true;
    newSP.creation_block = blockHash;
    newSP.update_block = newSP.creation_block;
    uint32_t propertyId = _my_sps->putSP(ecosystem, newSP);
    assert(propertyId > 0);
    //change_002
    assert(update_tally_map(sender, OMNI_PROPERTY_WHC, -CREATE_TOKEN_FEE, BALANCE));
    assert(update_tally_map(burnwhc_address, OMNI_PROPERTY_WHC, CREATE_TOKEN_FEE, BALANCE));

    PrintToLog("CREATED MANUAL PROPERTY id: %d admin: %s\n", propertyId, sender);

    return 0;
}

/** Tx 55 */
int CMPTransaction::logicMath_GrantTokens()
{
    uint256 blockHash;
    {
        LOCK(cs_main);
        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_SP -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (isAddressFrozen(receiver, property)) {
        PrintToLog("%s(): REJECTED: address %s is frozen for property %d\n", __func__, receiver, property);
        return (PKT_ERROR -4);
    }

	if (property == OMNI_PROPERTY_TWHC || OMNI_PROPERTY_WHC == property){
		PrintToLog("%s(): property: %d should not be OMNI_PROPERTY_TWHC or OMNI_PROPERTY_MSC\n", __func__, property);
		return (PKT_ERROR_TOKENS - 25);
	}	

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (PKT_ERROR_TOKENS -23);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }

    int64_t nTotalTokens = getTotalTokens(property);
    if (nValue > (MAX_INT_8_BYTES - nTotalTokens)) {
        PrintToLog("%s(): rejected: no more than %s tokens can ever exist [%s + %s > %s]\n",
                __func__,
                FormatMP(property, MAX_INT_8_BYTES),
                FormatMP(property, nTotalTokens),
                FormatMP(property, nValue),
                FormatMP(property, MAX_INT_8_BYTES));
        return (PKT_ERROR_TOKENS -44);
    }

    // ------------------------------------------

    std::vector<int64_t> dataPt;
    dataPt.push_back(nValue);
    dataPt.push_back(0);
    sp.historicalData.insert(std::make_pair(txid, dataPt));
    sp.update_block = blockHash;

    // Persist the number of granted tokens
    assert(_my_sps->updateSP(property, sp));

    // Special case: if can't find the receiver -- assume grant to self!
    if (receiver.empty()) {
        receiver = sender;
    }

    // Move the tokens
    assert(update_tally_map(receiver, property, nValue, BALANCE));

    NotifyTotalTokensChanged(property, block);

    return 0;
}

/** Tx 56 */
int CMPTransaction::logicMath_RevokeTokens()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }
	
	if (property == OMNI_PROPERTY_TWHC || OMNI_PROPERTY_WHC == property){
		PrintToLog("%s(): property: %d should not be OMNI_PROPERTY_TWHC or OMNI_PROPERTY_MSC\n", __func__, property);
		return (PKT_ERROR_TOKENS - 25);
	}	
	
		printf("%s(): property: %d property type : %d\n", __func__, property, getPropertyType());

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (nValue <= 0 || MAX_INT_8_BYTES < nValue) {
        PrintToLog("%s(): rejected: value out of range or zero: %d\n", __func__, nValue);
        return (PKT_ERROR_TOKENS -23);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }
    
    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }

    int64_t nBalance = getMPbalance(sender, property, BALANCE);
    if (nBalance < (int64_t) nValue) {
        PrintToLog("%s(): rejected: sender %s has insufficient balance of property %d [%s < %s]\n",
                __func__,
                sender,
                property,
                FormatMP(property, nBalance),
                FormatMP(property, nValue));
        return (PKT_ERROR_TOKENS -25);
    }

    // ------------------------------------------

    std::vector<int64_t> dataPt;
    dataPt.push_back(0);
    dataPt.push_back(nValue);
    sp.historicalData.insert(std::make_pair(txid, dataPt));
    sp.update_block = blockHash;

    assert(update_tally_map(sender, property, -nValue, BALANCE));
    assert(_my_sps->updateSP(property, sp));

    NotifyTotalTokensChanged(property, block);

    return 0;
}

/** Tx 70 */
int CMPTransaction::logicMath_ChangeIssuer()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }

	if (property == OMNI_PROPERTY_TWHC || OMNI_PROPERTY_WHC == property){
		PrintToLog("%s(): property: %d should not be OMNI_PROPERTY_TWHC or OMNI_PROPERTY_MSC\n", __func__, property);
		return (PKT_ERROR_TOKENS - 25);
	}	

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }

    if (NULL != getCrowd(sender)) {
        PrintToLog("%s(): rejected: sender %s has an active crowdsale\n", __func__, sender);
        return (PKT_ERROR_TOKENS -39);
    }

    if (receiver.empty()) {
        PrintToLog("%s(): rejected: receiver is empty\n", __func__);
        return (PKT_ERROR_TOKENS -45);
    }

    if(isAddressFrozen(receiver, property))
    {
        PrintToLog("%s(): rejected: receiver is frozen\n", __func__);
        return (PKT_ERROR_SP -45);
    }

    if (NULL != getCrowd(receiver)) {
        PrintToLog("%s(): rejected: receiver %s has an active crowdsale\n", __func__, receiver);
        return (PKT_ERROR_TOKENS -46);
    }

    // ------------------------------------------

    sp.issuer = receiver;
    sp.update_block = blockHash;

    assert(_my_sps->updateSP(property, sp));

    return 0;
}

/** Tx 71 */
int CMPTransaction::logicMath_EnableFreezing()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }

    if (isFreezingEnabled(property, block)) {
        PrintToLog("%s(): rejected: freezing is already enabled for property %d\n", __func__, property);
        return (PKT_ERROR_TOKENS -49);
    }

    int liveBlock = 0;
    if (!IsFeatureActivated(FEATURE_FREEZENOTICE, block)) {
        liveBlock = block;
    } else {
        const CConsensusParams& params = ConsensusParams();
        liveBlock = params.OMNI_FREEZE_WAIT_PERIOD + block;
    }

    enableFreezing(property, liveBlock);

    return 0;
}

/** Tx 72 */
int CMPTransaction::logicMath_DisableFreezing()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }

    if (!isFreezingEnabled(property, block)) {
        PrintToLog("%s(): rejected: freezing is not enabled for property %d\n", __func__, property);
        return (PKT_ERROR_TOKENS -47);
    }

    disableFreezing(property);

    return 0;
}

/** Tx 185 */
int CMPTransaction::logicMath_FreezeTokens()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }
    if(sender == receiver)
    {
        PrintToLog("%s(): rejected: freezed address %s cannot be the same with the issuer %s\n", __func__, receiver, sender);
        return (PKT_ERROR_TOKENS -51);
    }
    if (!isFreezingEnabled(property, block)) {
        PrintToLog("%s(): rejected: freezing is not enabled for property %d\n", __func__, property);
        return (PKT_ERROR_TOKENS -47);
    }
/*
    if (isAddressFrozen(receiver, property)) {
        PrintToLog("%s(): rejected: address %s is already frozen for property %d\n", __func__, receiver, property);
        return (PKT_ERROR_TOKENS -50);
    }
*/
    freezeAddress(receiver, property);

    return 0;
}

/** Tx 186 */
int CMPTransaction::logicMath_UnfreezeTokens()
{
    uint256 blockHash;
    {
        LOCK(cs_main);

        CBlockIndex* pindex = chainActive[block];
        if (pindex == NULL) {
            PrintToLog("%s(): ERROR: block %d not in the active chain\n", __func__, block);
            return (PKT_ERROR_TOKENS -20);
        }
        blockHash = pindex->GetBlockHash();
    }

    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR_TOKENS -22);
    }

    if (!IsPropertyIdValid(property)) {
        PrintToLog("%s(): rejected: property %d does not exist\n", __func__, property);
        return (PKT_ERROR_TOKENS -24);
    }

    CMPSPInfo::Entry sp;
    assert(_my_sps->getSP(property, sp));

    if (!sp.manual) {
        PrintToLog("%s(): rejected: property %d is not managed\n", __func__, property);
        return (PKT_ERROR_TOKENS -42);
    }

    if (sender != sp.issuer) {
        PrintToLog("%s(): rejected: sender %s is not issuer of property %d [issuer=%s]\n", __func__, sender, property, sp.issuer);
        return (PKT_ERROR_TOKENS -43);
    }
    if(sender == receiver)
    {
        PrintToLog("%s(): rejected: unfreezed address %s cannot be the same with the issuer %s\n", __func__, receiver, sender);
        return (PKT_ERROR_TOKENS -51);
    }
    if (!isFreezingEnabled(property, block)) {
        PrintToLog("%s(): rejected: freezing is not enabled for property %d\n", __func__, property);
        return (PKT_ERROR_TOKENS -47);
    }
/*
    if (!isAddressFrozen(receiver, property)) {
        PrintToLog("%s(): rejected: address %s is not frozen for property %d\n", __func__, receiver, property);
        return (PKT_ERROR_TOKENS -48);
    }
*/
    unfreezeAddress(receiver, property);

    return 0;
}

/** Tx 65533 */
int CMPTransaction::logicMath_Deactivation()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR -22);
    }

    // is sender authorized
    bool authorized = CheckDeactivationAuthorization(sender);

    PrintToLog("\t          sender: %s\n", sender);
    PrintToLog("\t      authorized: %s\n", authorized);

    if (!authorized) {
        PrintToLog("%s(): rejected: sender %s is not authorized to deactivate features\n", __func__, sender);
        return (PKT_ERROR -51);
    }

    // authorized, request feature deactivation
    bool DeactivationSuccess = DeactivateFeature(feature_id, block);

    if (!DeactivationSuccess) {
        PrintToLog("%s(): DeactivateFeature failed\n", __func__);
        return (PKT_ERROR -54);
    }

    // successful deactivation - did we deactivate the MetaDEx?  If so close out all trades
    if (feature_id == FEATURE_METADEX) {
        MetaDEx_SHUTDOWN();
    }
    if (feature_id == FEATURE_TRADEALLPAIRS) {
        MetaDEx_SHUTDOWN_ALLPAIR();
    }

    return 0;
}

/** Tx 65534 */
int CMPTransaction::logicMath_Activation()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR -22);
    }

    // is sender authorized - temporarily use alert auths but ## TO BE MOVED TO FOUNDATION P2SH KEY ##
    bool authorized = CheckActivationAuthorization(sender);

    PrintToLog("\t          sender: %s\n", sender);
    PrintToLog("\t      authorized: %s\n", authorized);

    if (!authorized) {
        PrintToLog("%s(): rejected: sender %s is not authorized for feature activations\n", __func__, sender);
        return (PKT_ERROR -51);
    }

    // authorized, request feature activation
    bool activationSuccess = ActivateFeature(feature_id, activation_block, min_client_version, block);

    if (!activationSuccess) {
        PrintToLog("%s(): ActivateFeature failed to activate this feature\n", __func__);
        return (PKT_ERROR -54);
    }

    return 0;
}

/** Tx 65535 */
int CMPTransaction::logicMath_Alert()
{
    if (!IsTransactionTypeAllowed(block, property, type, version)) {
        PrintToLog("%s(): rejected: type %d or version %d not permitted for property %d at block %d\n",
                __func__,
                type,
                version,
                property,
                block);
        return (PKT_ERROR -22);
    }

    // is sender authorized?
    bool authorized = CheckAlertAuthorization(sender);

    PrintToLog("\t          sender: %s\n", sender);
    PrintToLog("\t      authorized: %s\n", authorized);

    if (!authorized) {
        PrintToLog("%s(): rejected: sender %s is not authorized for alerts\n", __func__, sender);
        return (PKT_ERROR -51);
    }

    if (alert_type == ALERT_CLIENT_VERSION_EXPIRY && OMNICORE_VERSION < alert_expiry) {
        // regular alert keys CANNOT be used to force a client upgrade on mainnet - at least 3 signatures from board/devs are required
        if (sender == "34kwkVRSvFVEoUwcQSgpQ4ZUasuZ54DJLD" || isNonMainNet()) {
            std::string msgText = "Client upgrade is required!  Shutting down due to unsupported consensus state!";
            PrintToLog(msgText);
            PrintToConsole(msgText);
            if (!gArgs.GetBoolArg("-overrideforcedshutdown", false)) {
                boost::filesystem::path persistPath = GetDataDir() / "MP_persist";
                if (boost::filesystem::exists(persistPath)) boost::filesystem::remove_all(persistPath); // prevent the node being restarted without a reparse after forced shutdown
                AbortNode(msgText, msgText);
            }
        }
    }

    if (alert_type == 65535) { // set alert type to FFFF to clear previously sent alerts
        DeleteAlerts(sender);
    } else {
        AddAlert(sender, alert_type, alert_expiry, alert_text);
    }

    // we have a new alert, fire a notify event if needed
    AlertNotify(alert_text);

    return 0;
}
