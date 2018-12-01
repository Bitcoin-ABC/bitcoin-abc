// This file serves to provide payload creation functions.

#include "omnicore/createpayload.h"

#include "omnicore/convert.h"
#include "omnicore/omnicore.h"
#include "omnicore/utils.h"
#include "cashaddrenc.h"
#include "tinyformat.h"

#include "config.h"

#include <stdint.h>
#include <string>
#include <vector>

/**
 * Pushes bytes to the end of a vector.
 */
#define PUSH_BACK_BYTES(vector, value)\
    vector.insert(vector.end(), reinterpret_cast<unsigned char *>(&(value)),\
    reinterpret_cast<unsigned char *>(&(value)) + sizeof((value)));

/**
 * Pushes bytes to the end of a vector based on a pointer.
 */
#define PUSH_BACK_BYTES_PTR(vector, ptr, size)\
    vector.insert(vector.end(), reinterpret_cast<unsigned char *>((ptr)),\
    reinterpret_cast<unsigned char *>((ptr)) + (size));

std::vector<unsigned char> CreatePayload_PartiCrowsale(uint32_t propertyId, uint64_t amount)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = MSC_TYPE_BUY_TOKEN;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);

    return payload;
}

std::vector<unsigned char> CreatePayload_SimpleSend(uint32_t propertyId, uint64_t amount)
{
	
    std::vector<unsigned char> payload;
    uint16_t messageType = 0;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);

    return payload;
}

std::vector<unsigned char> CreatePayload_SendAll(uint8_t ecosystem)
{
	
    std::vector<unsigned char> payload;
    uint16_t messageVer = 0;
    uint16_t messageType = 4;
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, ecosystem);

    return payload;
}

std::vector<unsigned char> CreatePayload_DExSell(uint32_t propertyId, uint64_t amountForSale, uint64_t amountDesired, uint8_t timeLimit, uint64_t minFee, uint8_t subAction)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 20;
    uint16_t messageVer = 1;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amountForSale);
    mastercore::swapByteOrder64(amountDesired);
    mastercore::swapByteOrder64(minFee);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amountForSale);
    PUSH_BACK_BYTES(payload, amountDesired);
    PUSH_BACK_BYTES(payload, timeLimit);
    PUSH_BACK_BYTES(payload, minFee);
    PUSH_BACK_BYTES(payload, subAction);

    return payload;
}

std::vector<unsigned char> CreatePayload_DExAccept(uint32_t propertyId, uint64_t amount)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 22;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);

    return payload;
}

std::vector<unsigned char> CreatePayload_BurnBch()
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 68;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);

    return payload;
}

std::vector<unsigned char> CreatePayload_IssueERC721Property(std::string name, std::string symbol, std::string data,
                                                             std::string url, uint64_t totalToken){
    std::vector<unsigned char> payload;
    uint16_t messageType = WHC_TYPE_ERC721;
    uint16_t messageVer = 0;
    uint8_t action = ERC721Action::ISSUE_ERC721_PROPERTY;

    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder64(totalToken);
    if(name.size() > 255)   name = name.substr(0, 100);
    if(symbol.size() > 255)  symbol = symbol.substr(0, 100);
    if(data.size() > 255)   data = data.substr(0, 100);
    if(url.size() > 255)    url = data.substr(0, 100);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, action);
    payload.insert(payload.end(), name.begin(), name.end());
    payload.push_back('\0');
    payload.insert(payload.end(), symbol.begin(), symbol.end());
    payload.push_back('\0');
    payload.insert(payload.end(), data.begin(), data.end());
    payload.push_back('\0');
    payload.insert(payload.end(), url.begin(), url.end());
    payload.push_back('\0');
    PUSH_BACK_BYTES(payload, totalToken);

    return payload;
}

std::vector<unsigned char> CreatePayload_IssueERC721Token(const uint256& propertyID, const uint256& tokenID,
                                                          const uint256& tokenAttributes, std::string tokenURL){
    std::vector<unsigned char> payload;
    uint16_t messageType = WHC_TYPE_ERC721;
    uint16_t messageVer = 0;
    uint8_t action = ERC721Action::ISSUE_ERC721_TOKEN;

    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    if(tokenURL.size() > 255)    tokenURL = tokenURL.substr(0, 100);
    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, action);
    payload.insert(payload.end(), propertyID.begin(), propertyID.end());
    payload.insert(payload.end(), tokenID.begin(), tokenID.end());
    payload.insert(payload.end(), tokenAttributes.begin(), tokenAttributes.end());
    payload.insert(payload.end(), tokenURL.begin(), tokenURL.end());
    payload.push_back('\0');

    return payload;
}

std::vector<unsigned char> CreatePayload_TransferERC721Token(const uint256& propertyID, const uint256& tokenID){
    std::vector<unsigned char> payload;
    uint16_t messageType = WHC_TYPE_ERC721;
    uint16_t messageVer = 0;
    uint8_t action = ERC721Action::TRANSFER_REC721_TOKEN;

    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, action);
    payload.insert(payload.end(), propertyID.begin(), propertyID.end());
    payload.insert(payload.end(), tokenID.begin(), tokenID.end());

    return payload;
}

std::vector<unsigned char> CreatePayload_DestroyERC721Token(const uint256& propertyID, const uint256& tokenID){
    std::vector<unsigned char> payload;
    uint16_t messageType = WHC_TYPE_ERC721;
    uint16_t messageVer = 0;
    uint8_t action = ERC721Action::DESTROY_ERC721_TOKEN;

    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, action);
    payload.insert(payload.end(), propertyID.begin(), propertyID.end());
    payload.insert(payload.end(), tokenID.begin(), tokenID.end());

    return payload;
}

std::vector<unsigned char> CreatePayload_SendToOwners(uint32_t propertyId, uint64_t amount, uint32_t distributionProperty)
{
    std::vector<unsigned char> payload;

    uint16_t messageType = 3;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);
    mastercore::swapByteOrder32(distributionProperty);
    PUSH_BACK_BYTES(payload, distributionProperty);

    return payload;
}

std::vector<unsigned char> CreatePayload_IssuanceFixed(uint8_t ecosystem, uint16_t propertyType, uint32_t previousPropertyId, std::string category,
                                                       std::string subcategory, std::string name, std::string url, std::string data, uint64_t amount)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 50;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(propertyType);
    mastercore::swapByteOrder32(previousPropertyId);
    mastercore::swapByteOrder64(amount);
    if (category.size() > 255) category = category.substr(0,255);
    if (subcategory.size() > 255) subcategory = subcategory.substr(0,255);
    if (name.size() > 255) name = name.substr(0,255);
    if (url.size() > 255) url = url.substr(0,255);
    if (data.size() > 255) data = data.substr(0,255);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, ecosystem);
    PUSH_BACK_BYTES(payload, propertyType);
    PUSH_BACK_BYTES(payload, previousPropertyId);
    payload.insert(payload.end(), category.begin(), category.end());
    payload.push_back('\0');
    payload.insert(payload.end(), subcategory.begin(), subcategory.end());
    payload.push_back('\0');
    payload.insert(payload.end(), name.begin(), name.end());
    payload.push_back('\0');
    payload.insert(payload.end(), url.begin(), url.end());
    payload.push_back('\0');
    payload.insert(payload.end(), data.begin(), data.end());
    payload.push_back('\0');
    PUSH_BACK_BYTES(payload, amount);

    return payload;
}

std::vector<unsigned char> CreatePayload_IssuanceVariable(uint8_t ecosystem, uint16_t propertyType, uint32_t previousPropertyId, std::string category,
                                                          std::string subcategory, std::string name, std::string url, std::string data, uint32_t propertyIdDesired,
                                                          uint64_t amountPerUnit, uint64_t deadline, uint8_t earlyBonus, uint8_t issuerPercentage, uint64_t amount)
{
	
    std::vector<unsigned char> payload;
    uint16_t messageType = 51;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(propertyType);
    mastercore::swapByteOrder32(previousPropertyId);
    mastercore::swapByteOrder32(propertyIdDesired);
    mastercore::swapByteOrder64(amountPerUnit);
    mastercore::swapByteOrder64(deadline);
	mastercore::swapByteOrder64(amount);
    if (category.size() > 255) category = category.substr(0,255);
    if (subcategory.size() > 255) subcategory = subcategory.substr(0,255);
    if (name.size() > 255) name = name.substr(0,255);
    if (url.size() > 255) url = url.substr(0,255);
    if (data.size() > 255) data = data.substr(0,255);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, ecosystem);
    PUSH_BACK_BYTES(payload, propertyType);
    PUSH_BACK_BYTES(payload, previousPropertyId);
    payload.insert(payload.end(), category.begin(), category.end());
    payload.push_back('\0');
    payload.insert(payload.end(), subcategory.begin(), subcategory.end());
    payload.push_back('\0');
    payload.insert(payload.end(), name.begin(), name.end());
    payload.push_back('\0');
    payload.insert(payload.end(), url.begin(), url.end());
    payload.push_back('\0');
    payload.insert(payload.end(), data.begin(), data.end());
    payload.push_back('\0');
    PUSH_BACK_BYTES(payload, propertyIdDesired);
    PUSH_BACK_BYTES(payload, amountPerUnit);
    PUSH_BACK_BYTES(payload, deadline);
    PUSH_BACK_BYTES(payload, earlyBonus);
    PUSH_BACK_BYTES(payload, issuerPercentage);
	PUSH_BACK_BYTES(payload, amount);

    return payload;
}

std::vector<unsigned char> CreatePayload_IssuanceManaged(uint8_t ecosystem, uint16_t propertyType, uint32_t previousPropertyId, std::string category,
                                                       std::string subcategory, std::string name, std::string url, std::string data)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 54;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(propertyType);
    mastercore::swapByteOrder32(previousPropertyId);
    if (category.size() > 255) category = category.substr(0,255);
    if (subcategory.size() > 255) subcategory = subcategory.substr(0,255);
    if (name.size() > 255) name = name.substr(0,255);
    if (url.size() > 255) url = url.substr(0,255);
    if (data.size() > 255) data = data.substr(0,255);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, ecosystem);
    PUSH_BACK_BYTES(payload, propertyType);
    PUSH_BACK_BYTES(payload, previousPropertyId);
    payload.insert(payload.end(), category.begin(), category.end());
    payload.push_back('\0');
    payload.insert(payload.end(), subcategory.begin(), subcategory.end());
    payload.push_back('\0');
    payload.insert(payload.end(), name.begin(), name.end());
    payload.push_back('\0');
    payload.insert(payload.end(), url.begin(), url.end());
    payload.push_back('\0');
    payload.insert(payload.end(), data.begin(), data.end());
    payload.push_back('\0');

    return payload;
}

std::vector<unsigned char> CreatePayload_CloseCrowdsale(uint32_t propertyId)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 53;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);

    return payload;
}

std::vector<unsigned char> CreatePayload_Grant(uint32_t propertyId, uint64_t amount, std::string memo)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 55;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);
    if (memo.size() > 255) memo = memo.substr(0,255);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);
    payload.insert(payload.end(), memo.begin(), memo.end());
    payload.push_back('\0');

    return payload;
}


std::vector<unsigned char> CreatePayload_Revoke(uint32_t propertyId, uint64_t amount, std::string memo)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 56;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);
    if (memo.size() > 255) memo = memo.substr(0,255);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);
    payload.insert(payload.end(), memo.begin(), memo.end());
    payload.push_back('\0');

    return payload;
}

std::vector<unsigned char> CreatePayload_ChangeIssuer(uint32_t propertyId)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 70;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);

    return payload;
}

std::vector<unsigned char> CreatePayload_EnableFreezing(uint32_t propertyId)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 71;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);

    return payload;
}

std::vector<unsigned char> CreatePayload_DisableFreezing(uint32_t propertyId)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 72;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);

    return payload;
}

std::vector<unsigned char> CreatePayload_FreezeTokens(uint32_t propertyId, uint64_t amount, const std::string& address)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 185;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);
    //const CChainParams& params = GetConfig().GetChainParams();
    //CTxDestination dest = DecodeCashAddr(address, params);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);
    payload.insert(payload.end(), address.begin(), address.end());
    payload.push_back('\0');

    return payload;
}

std::vector<unsigned char> CreatePayload_UnfreezeTokens(uint32_t propertyId, uint64_t amount, const std::string& address)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 186;
    uint16_t messageVer = 0;
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder32(propertyId);
    mastercore::swapByteOrder64(amount);
    //const CChainParams& params = GetConfig().GetChainParams();
    //CTxDestination dest = DecodeCashAddr(address, params);
    //std::vector<unsigned char> addressBytes = dest.GetHex();

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyId);
    PUSH_BACK_BYTES(payload, amount);
    //std::string addressBytes;
    payload.insert(payload.end(), address.begin(), address.end());
    payload.push_back('\0');

    return payload;
}

std::vector<unsigned char> CreatePayload_MetaDExTrade(uint32_t propertyIdForSale, uint64_t amountForSale, uint32_t propertyIdDesired, uint64_t amountDesired)
{
    std::vector<unsigned char> payload;

    uint16_t messageType = 25;
    uint16_t messageVer = 0;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder32(propertyIdForSale);
    mastercore::swapByteOrder64(amountForSale);
    mastercore::swapByteOrder32(propertyIdDesired);
    mastercore::swapByteOrder64(amountDesired);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyIdForSale);
    PUSH_BACK_BYTES(payload, amountForSale);
    PUSH_BACK_BYTES(payload, propertyIdDesired);
    PUSH_BACK_BYTES(payload, amountDesired);

    return payload;
}

std::vector<unsigned char> CreatePayload_MetaDExCancelPrice(uint32_t propertyIdForSale, uint64_t amountForSale, uint32_t propertyIdDesired, uint64_t amountDesired)
{
    std::vector<unsigned char> payload;

    uint16_t messageType = 26;
    uint16_t messageVer = 0;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder32(propertyIdForSale);
    mastercore::swapByteOrder64(amountForSale);
    mastercore::swapByteOrder32(propertyIdDesired);
    mastercore::swapByteOrder64(amountDesired);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyIdForSale);
    PUSH_BACK_BYTES(payload, amountForSale);
    PUSH_BACK_BYTES(payload, propertyIdDesired);
    PUSH_BACK_BYTES(payload, amountDesired);

    return payload;
}

std::vector<unsigned char> CreatePayload_MetaDExCancelPair(uint32_t propertyIdForSale, uint32_t propertyIdDesired)
{
    std::vector<unsigned char> payload;

    uint16_t messageType = 27;
    uint16_t messageVer = 0;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder32(propertyIdForSale);
    mastercore::swapByteOrder32(propertyIdDesired);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, propertyIdForSale);
    PUSH_BACK_BYTES(payload, propertyIdDesired);

    return payload;
}

std::vector<unsigned char> CreatePayload_MetaDExCancelEcosystem(uint8_t ecosystem)
{
    std::vector<unsigned char> payload;

    uint16_t messageType = 28;
    uint16_t messageVer = 0;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, ecosystem);

    return payload;
}

std::vector<unsigned char> CreatePayload_DeactivateFeature(uint16_t featureId)
{
    std::vector<unsigned char> payload;

    uint16_t messageVer = 65535;
    uint16_t messageType = 65533;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(featureId);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, featureId);

    return payload;
}

std::vector<unsigned char> CreatePayload_ActivateFeature(uint16_t featureId, uint32_t activationBlock, uint32_t minClientVersion)
{
    std::vector<unsigned char> payload;

    uint16_t messageVer = 65535;
    uint16_t messageType = 65534;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(featureId);
    mastercore::swapByteOrder32(activationBlock);
    mastercore::swapByteOrder32(minClientVersion);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, featureId);
    PUSH_BACK_BYTES(payload, activationBlock);
    PUSH_BACK_BYTES(payload, minClientVersion);

    return payload;
}

std::vector<unsigned char> CreatePayload_OmniCoreAlert(uint16_t alertType, uint32_t expiryValue, const std::string& alertMessage)
{
    std::vector<unsigned char> payload;
    uint16_t messageType = 65535;
    uint16_t messageVer = 65535;

    mastercore::swapByteOrder16(messageVer);
    mastercore::swapByteOrder16(messageType);
    mastercore::swapByteOrder16(alertType);
    mastercore::swapByteOrder32(expiryValue);

    PUSH_BACK_BYTES(payload, messageVer);
    PUSH_BACK_BYTES(payload, messageType);
    PUSH_BACK_BYTES(payload, alertType);
    PUSH_BACK_BYTES(payload, expiryValue);
    payload.insert(payload.end(), alertMessage.begin(), alertMessage.end());
    payload.push_back('\0');

    return payload;
}

#undef PUSH_BACK_BYTES
#undef PUSH_BACK_BYTES_PTR
