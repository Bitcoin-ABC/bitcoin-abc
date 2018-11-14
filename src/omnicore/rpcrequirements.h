#ifndef OMNICORE_RPCREQUIREMENTS_H
#define OMNICORE_RPCREQUIREMENTS_H

#include "uint256.h"
#include <stdint.h>
#include <string>

void RequirePropertyType(int type);
void RequireBalance(const std::string& address, uint32_t propertyId, int64_t amount);
void RequirePrimaryToken(uint32_t propertyId);
void RequirePropertyName(const std::string& name);
void RequirePropertyEcosystem(uint8_t ecosystem);
void RequireExistingProperty(uint32_t propertyId);
void RequireSameEcosystem(uint32_t propertyId, uint32_t otherId);
void RequireDifferentIds(uint32_t propertyId, uint32_t otherId);
void RequireCrowdsale(uint32_t propertyId);
void RequireIssuerPercentage(uint8_t percentage);
void RequireTokenPrice(int64_t price);
void RequireCrowsDesireProperty(uint32_t propertyId);
void RequireActiveCrowdsale(uint32_t propertyId);
void RequireManagedProperty(uint32_t propertyId);
void RequireTokenIssuer(const std::string& address, uint32_t propertyId);
void RequireMatchingDExOffer(const std::string& address, uint32_t propertyId);
void RequireNoOtherDExOffer(const std::string& address, uint32_t propertyId);
void RequireSaneReferenceAmount(int64_t amount);
void RequireSaneDExPaymentWindow(const std::string& address, uint32_t propertyId);
void RequireSaneDExFee(const std::string& address, uint32_t propertyId);
void RequireHeightInChain(int blockHeight);
void RequireTokenNumber(uint64_t totalNumber);
void RequireHexNumber(std::string str);
void RequireExistingERC721Token(const uint256& propertyId, const uint256& tokenid);
void RequireExistingERC721Property(const uint256& propertyId);
void RequireRemainERC721Token(const uint256& propertyId);
void RequireOwnerOfERC721Token(const uint256& propertyId, const uint256& tokenId, const std::string& owner);
void RequireOwnerOfERC721Property(const uint256& propertyId, std::string& owner);

// TODO:
// Checks for MetaDEx orders for cancel operations


#endif // OMNICORE_RPCREQUIREMENTS_H
