#include "omnicore/rpcrequirements.h"

#include "omnicore/dex.h"
#include "omnicore/omnicore.h"
#include "omnicore/sp.h"
#include "omnicore/utilsbitcoin.h"
#include "omnicore/ERC721.h"

#include "amount.h"
#include "rpc/protocol.h"
#include "sync.h"
#include "tinyformat.h"

#include <stdint.h>
#include <string>

void RequireBalance(const std::string& address, uint32_t propertyId, int64_t amount)
{
    int64_t balance = getMPbalance(address, propertyId, BALANCE);
    if (balance < amount) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Sender has insufficient balance");
    }
    int64_t balanceUnconfirmed = getUserAvailableMPbalance(address, propertyId);
    if (balanceUnconfirmed < amount) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Sender has insufficient balance (due to pending transactions)");
    }
}

void RequirePrimaryToken(uint32_t propertyId)
{
    if (propertyId < 1 || 2 < propertyId) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property identifier must be 1 (OMNI) or 2 (TOMNI)");
    }
}

void RequirePropertyType(int type)
{
    if(type < 0 || type > 8 ){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "property type must be [0, 8] range");
    }
}

void RequirePropertyEcosystem(uint8_t ecosystem){
    if (ecosystem != 1){
        throw JSONRPCError(RPC_TYPE_ERROR, "property ecosystem must be 1");
    }
}

void RequireCrowsDesireProperty(uint32_t propertyId){
    if (propertyId != OMNI_PROPERTY_WHC){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property ID only support WHC");
    }
}

void RequireIssuerPercentage(uint8_t percentage){
    if (percentage != 0){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "undefiend field must be 0");
    }
}

void RequireTokenPrice(int64_t price){
    if (price < MIN_TOKENPRICE || price > MAX_TOKENPRICE){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "token price must be [1 * 10^-8, 1* 10^8]");
    }
}

void RequirePropertyName(const std::string& name)
{
    if (name.empty()) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Property name must not be empty");
    }
}

void RequireExistingProperty(uint32_t propertyId)
{
    LOCK(cs_tally);
    if (!mastercore::IsPropertyIdValid(propertyId)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property identifier does not exist");
    }
}

void RequireSameEcosystem(uint32_t propertyId, uint32_t otherId)
{
    if (mastercore::isTestEcosystemProperty(propertyId) != mastercore::isTestEcosystemProperty(otherId)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Properties must be in the same ecosystem");
    }
}

void RequireDifferentIds(uint32_t propertyId, uint32_t otherId)
{
    if (propertyId == otherId) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property identifiers must not be the same");
    }
}

void RequireCrowdsale(uint32_t propertyId)
{
    LOCK(cs_tally);
    CMPSPInfo::Entry sp;
    if (!mastercore::_my_sps->getSP(propertyId, sp)) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "Failed to retrieve property");
    }
    if (sp.fixed || sp.manual) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property identifier does not refer to a crowdsale");
    }
}

void RequireActiveCrowdsale(uint32_t propertyId)
{
    LOCK(cs_tally);
    if (!mastercore::isCrowdsaleActive(propertyId)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Property identifier does not refer to an active crowdsale");
    }
}

void RequireManagedProperty(uint32_t propertyId)
{
    LOCK(cs_tally);
    CMPSPInfo::Entry sp;
    if (!mastercore::_my_sps->getSP(propertyId, sp)) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "Failed to retrieve property");
    }
    if (sp.fixed || !sp.manual) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Property identifier does not refer to a managed property");
    }
}

void RequireTokenIssuer(const std::string& address, uint32_t propertyId)
{
    LOCK(cs_tally);
    CMPSPInfo::Entry sp;
    if (!mastercore::_my_sps->getSP(propertyId, sp)) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "Failed to retrieve property");
    }
    if (address != sp.issuer) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Sender is not authorized to manage the property");
    }
}

void RequireMatchingDExOffer(const std::string& address, uint32_t propertyId)
{
    LOCK(cs_tally);
    if (!mastercore::DEx_offerExists(address, propertyId)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "No matching sell offer on the distributed exchange");
    }
}

void RequireNoOtherDExOffer(const std::string& address, uint32_t propertyId)
{
    LOCK(cs_tally);
    if (mastercore::DEx_offerExists(address, propertyId)) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Another active sell offer from the given address already exists on the distributed exchange");
    }
}

void RequireSaneReferenceAmount(int64_t amount)
{
    if ((0.01 * COIN.GetSatoshis()) < amount) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Reference amount higher is than 0.01 BTC");
    }
}

void RequireSaneDExPaymentWindow(const std::string& address, uint32_t propertyId)
{
    LOCK(cs_tally);
    const CMPOffer* poffer = mastercore::DEx_getOffer(address, propertyId);
    if (poffer == NULL) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "Unable to load sell offer from the distributed exchange");
    }
    if (poffer->getBlockTimeLimit() < 10) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Payment window is less than 10 blocks (use override = true to continue)");
    }
}

void RequireSaneDExFee(const std::string& address, uint32_t propertyId)
{
    LOCK(cs_tally);
    const CMPOffer* poffer = mastercore::DEx_getOffer(address, propertyId);
    if (poffer == NULL) {
        throw JSONRPCError(RPC_DATABASE_ERROR, "Unable to load sell offer from the distributed exchange");
    }
    if (poffer->getMinFee() > 1000000) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Minimum accept fee is higher than 0.01 BTC (use override = true to continue)");
    }
}

void RequireHeightInChain(int blockHeight)
{
    if (blockHeight < 0 || mastercore::GetHeight() < blockHeight) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Block height is out of range");
    }
}

void RequireTokenNumber(uint64_t totalNumber){
    if (totalNumber == 0 ){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Issue token number should not equal 0");
    }
}

void RequireHexNumber(std::string str){
    if(!IsHexNumber(str)){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "param should be hex string ");
    }
}

void RequireExistingERC721Token(const uint256& propertyId, const uint256& tokenid)
{
    LOCK(cs_tally);
    if (!mastercore::IsERC721TokenValid(propertyId, tokenid)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "ERC721 token identifier does not exist");
    }
}

void RequireExistingERC721Property(const uint256& propertyId)
{
    LOCK(cs_tally);
    if (!mastercore::IsERC721PropertyIdValid(propertyId)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "ERC721 property identifier does not exist");
    }
}

void RequireRemainERC721Token(const uint256& propertyId){
    LOCK(cs_tally);
    if(mastercore::HaveAllIssued(propertyId)){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "All ERC721Token have been issued");
    }
}

void RequireOwnerOfERC721Property(const uint256& propertyId, std::string& owner){
    LOCK(cs_tally);
    if(!mastercore::OwnerofERC721Property(propertyId, owner)){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "The sender does not own the specified ERC721 property .");
    }
}

void RequireOwnerOfERC721Token(const uint256& propertyId, const uint256& tokenId, const std::string& owner){
    LOCK(cs_tally);
    if(!mastercore::IsERC721TokenOwner(propertyId, tokenId, owner)){
        throw JSONRPCError(RPC_INVALID_PARAMETER, "The sender does not own the specified ERC721 Token .");
    }
}