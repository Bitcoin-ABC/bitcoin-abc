#include "omnicore/rpcpayload.h"

#include "omnicore/createpayload.h"
#include "omnicore/rpcvalues.h"
#include "omnicore/rpcrequirements.h"
#include "omnicore/omnicore.h"
#include "omnicore/sp.h"
#include "omnicore/tx.h"

#include "rpc/server.h"
#include "utilstrencodings.h"

#include <univalue.h>

using std::runtime_error;
using namespace mastercore;

UniValue whc_createpayload_particrowdsale(const Config &config,const JSONRPCRequest &request){
   if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "whc_createpayload_particrowdsale \"amount\"\n"

            "\nCreate the payload for a participate crowsale transaction.\n"

            "\nArguments:\n"
            "1. amount               (string, required) the amount of WHC to particrowsale\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_particrowdsale", " \"100.0\"")
            + HelpExampleRpc("whc_createpayload_particrowdsale", " \"100.0\"")
        );
	
    int64_t amount = ParseAmount(request.params[0], PRICE_PRECISION);
    std::vector<unsigned char> payload = CreatePayload_PartiCrowsale(OMNI_PROPERTY_WHC, amount);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_simplesend(const Config &config,const JSONRPCRequest &request)
{
   if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
            "whc_createpayload_simplesend propertyid \"amount\"\n"

            "\nCreate the payload for a simple send transaction.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens to send\n"
            "2. amount               (string, required) the amount to send\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_simplesend", "1 \"100.0\"")
            + HelpExampleRpc("whc_createpayload_simplesend", "1, \"100.0\"")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[1], getPropertyType(propertyId));
    std::vector<unsigned char> payload = CreatePayload_SimpleSend(propertyId, amount);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_sendall(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "whc_createpayload_sendall ecosystem\n"

            "\nCreate the payload for a send all transaction.\n"

            "\nArguments:\n"
            "1. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"

            "\nResult:\n"
            "\"payload\"               (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_sendall", "1")
            + HelpExampleRpc("whc_createpayload_sendall", "1")
        );

    uint8_t ecosystem = ParseEcosystem(request.params[0]);
    RequirePropertyEcosystem(ecosystem);
    std::vector<unsigned char> payload = CreatePayload_SendAll(ecosystem);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_dexsell(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 6)
        throw runtime_error(
            "omni_createpayload_dexsell propertyidforsale \"amountforsale\" \"amountdesired\" paymentwindow minacceptfee action\n"

            "\nCreate a payload to place, update or cancel a sell offer on the traditional distributed OMNI/BTC exchange.\n"

            "\nArguments:\n"

            "1. propertyidforsale    (number, required) the identifier of the tokens to list for sale (must be 1 for OMNI or 2 for TOMNI)\n"
            "2. amountforsale        (string, required) the amount of tokens to list for sale\n"
            "3. amountdesired        (string, required) the amount of bitcoins desired\n"
            "4. paymentwindow        (number, required) a time limit in blocks a buyer has to pay following a successful accepting order\n"
            "5. minacceptfee         (string, required) a minimum mining fee a buyer has to pay to accept the offer\n"
            "6. action               (number, required) the action to take (1 for new offers, 2 to update\", 3 to cancel)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_dexsell", "1 \"1.5\" \"0.75\" 25 \"0.0005\" 1")
            + HelpExampleRpc("omni_createpayload_dexsell", "1, \"1.5\", \"0.75\", 25, \"0.0005\", 1")
        );

    uint32_t propertyIdForSale = ParsePropertyId(request.params[0]);
    uint8_t action = ParseDExAction(request.params[5]);

    int64_t amountForSale = 0; // depending on action
    int64_t amountDesired = 0; // depending on action
    uint8_t paymentWindow = 0; // depending on action
    int64_t minAcceptFee = 0;  // depending on action

    if (action <= CMPTransaction::UPDATE) { // actions 3 permit zero values, skip check
        amountForSale = ParseAmount(request.params[1], true); // TMSC/MSC is divisible
        amountDesired = ParseAmount(request.params[2], true); // BTC is divisible
        paymentWindow = ParseDExPaymentWindow(request.params[3]);
        minAcceptFee = ParseDExFee(request.params[4]);
    }

    std::vector<unsigned char> payload = CreatePayload_DExSell(propertyIdForSale, amountForSale, amountDesired, paymentWindow, minAcceptFee, action);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_dexaccept(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
            "omni_senddexaccept propertyid \"amount\"\n"

            "\nCreate the payload for an accept offer for the specified token and amount.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the token to purchase\n"
            "2. amount               (string, required) the amount to accept\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_dexaccept", "1 \"15.0\"")
            + HelpExampleRpc("omni_createpayload_dexaccept", "1, \"15.0\"")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequirePrimaryToken(propertyId);
    int64_t amount = ParseAmount(request.params[1], true);

    std::vector<unsigned char> payload = CreatePayload_DExAccept(propertyId, amount);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_sto(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 2 || request.params.size() > 3)
        throw runtime_error(
            "whc_createpayload_sto propertyid \"amount\" ( distributionproperty )\n"

            "\nCreates the payload for a send-to-owners transaction.\n"

            "\nArguments:\n"
            "1. propertyid             (number, required) the identifier of the tokens to distribute\n"
            "2. amount                 (string, required) the amount to distribute\n"
            "3. distributionproperty   (number, optional) the identifier of the property holders to distribute to\n"
            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_sto", "3 \"5000\"")
            + HelpExampleRpc("whc_createpayload_sto", "3, \"5000\"")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[1], getPropertyType(propertyId));
    uint32_t distributionPropertyId = (request.params.size() > 2) ? ParsePropertyId(request.params[2]) : propertyId;
    std::vector<unsigned char> payload = CreatePayload_SendToOwners(propertyId, amount, distributionPropertyId);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_issuancefixed(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 9)
        throw runtime_error(
            "whc_createpayload_issuancefixed ecosystem type previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\" \"amount\"\n"

            "\nCreates the payload for a new tokens issuance with fixed supply.\n"

            "\nArguments:\n"
            "1. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"
            "2. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "3. previousid           (number, required) an identifier of a predecessor token (use 0 for new tokens)\n"
            "4. category             (string, required) a category for the new tokens (can be \"\")\n"
            "5. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "6. name                 (string, required) the name of the new tokens to create\n"
            "7. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "8. data                 (string, required) a description for the new tokens (can be \"\")\n"
            "9. amount               (string, required) the number of tokens to create\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_issuancefixed", "1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\" \"1000000\"")
            + HelpExampleRpc("whc_createpayload_issuancefixed", "1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\", \"1000000\"")
        );

    uint8_t ecosystem = ParseEcosystem(request.params[0]);
    uint16_t type = ParsePropertyType(request.params[1]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[2]);
    std::string category = ParseText(request.params[3]);
    std::string subcategory = ParseText(request.params[4]);
    std::string name = ParseText(request.params[5]);
    std::string url = ParseText(request.params[6]);
    std::string data = ParseText(request.params[7]);

    RequirePropertyType(type);
    RequirePropertyName(name);
    RequirePropertyEcosystem(ecosystem);
    int64_t amount = ParseAmount(request.params[8], type);

    std::vector<unsigned char> payload = CreatePayload_IssuanceFixed(ecosystem, type, previousId, category, subcategory, name, url, data, amount);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_issuancecrowdsale(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 14)
        throw runtime_error(
            "whc_createpayload_issuancecrowdsale ecosystem type previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\" propertyiddesired tokensperunit deadline earlybonus issuerpercentage amount\n"

            "\nCreates the payload for a new tokens issuance with crowdsale.\n"

            "\nArguments:\n"
            "1. ecosystem            (number, required) the ecosystem to create the tokens in, must be 1\n"
            "2. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "3. previousid           (number, required) an identifier of a predecessor token (0 for new crowdsales)\n"
            "4. category             (string, required) a category for the new tokens (can be \"\")\n"
            "5. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "6. name                 (string, required) the name of the new tokens to create\n"
            "7. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "8. data                 (string, required) a description for the new tokens (can be \"\")\n"
            "9. propertyiddesired    (number, required) the identifier of a token eligible to participate in the crowdsale\n"
            "10. tokensperunit       (string, required) the amount of tokens granted per unit invested in the crowdsale\n"
            "11. deadline            (number, required) the deadline of the crowdsale as Unix timestamp\n"
            "12. earlybonus          (number, required) an early bird bonus for participants in percent per week\n"
            "13. Undefine 	         (number, required) the value must be 0\n"
		    "14. totalNumber         (string, required) the number of tokens to create\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_issuancecrowdsale", "1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\" 2 \"100\" 1483228800 30 2 10383903719")
            + HelpExampleRpc("whc_createpayload_issuancecrowdsale", "1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\", 2, \"100\", 1483228800, 30, 2 192978657")
        );

    uint8_t ecosystem = ParseEcosystem(request.params[0]);
    uint16_t type = ParsePropertyType(request.params[1]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[2]);
    std::string category = ParseText(request.params[3]);
    std::string subcategory = ParseText(request.params[4]);
    std::string name = ParseText(request.params[5]);
    std::string url = ParseText(request.params[6]);
    std::string data = ParseText(request.params[7]);
    uint32_t propertyIdDesired = ParsePropertyId(request.params[8]);
    int64_t numTokens = ParseAmount(request.params[9], PRICE_PRECISION);
    int64_t deadline = ParseDeadline(request.params[10]);
    uint8_t earlyBonus = ParseEarlyBirdBonus(request.params[11]);
    uint8_t issuerPercentage = ParseIssuerBonus(request.params[12]);

    RequireTokenPrice(numTokens);
    RequireIssuerPercentage(issuerPercentage);
    RequireCrowsDesireProperty(propertyIdDesired);
    RequirePropertyName(name);
    RequirePropertyEcosystem(ecosystem);
    RequireExistingProperty(propertyIdDesired);
    RequireSameEcosystem(ecosystem, propertyIdDesired);
	RequirePropertyType(type);
    int64_t amount = ParseAmount(request.params[13], type);

    std::vector<unsigned char> payload = CreatePayload_IssuanceVariable(ecosystem, type, previousId, category, subcategory, name, url, data, propertyIdDesired, numTokens, deadline, earlyBonus, issuerPercentage, amount);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_issuancemanaged(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 8)
        throw runtime_error(
            "whc_createpayload_issuancemanaged ecosystem type previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\"\n"

            "\nCreates the payload for a new tokens issuance with manageable supply.\n"

            "\nArguments:\n"
            "1. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"
            "2. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "3. previousid           (number, required) an identifier of a predecessor token (use 0 for new tokens)\n"
            "4. category             (string, required) a category for the new tokens (can be \"\")\n"
            "5. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "6. name                 (string, required) the name of the new tokens to create\n"
            "7. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "8. data                 (string, required) a description for the new tokens (can be \"\")\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_issuancemanaged", "1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\"")
            + HelpExampleRpc("whc_createpayload_issuancemanaged", "1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\"")
        );

    uint8_t ecosystem = ParseEcosystem(request.params[0]);
    uint16_t type = ParsePropertyType(request.params[1]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[2]);
    std::string category = ParseText(request.params[3]);
    std::string subcategory = ParseText(request.params[4]);
    std::string name = ParseText(request.params[5]);
    std::string url = ParseText(request.params[6]);
    std::string data = ParseText(request.params[7]);

    RequirePropertyName(name);
    RequirePropertyEcosystem(ecosystem);
	RequirePropertyType(type);

    std::vector<unsigned char> payload = CreatePayload_IssuanceManaged(ecosystem, type, previousId, category, subcategory, name, url, data);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_closecrowdsale(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "whc_createpayload_closecrowdsale propertyid\n"

            "\nCreates the payload to manually close a crowdsale.\n"

            "\nArguments:\n"
            "1. propertyid             (number, required) the identifier of the crowdsale to close\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_closecrowdsale", "70")
            + HelpExampleRpc("whc_createpayload_closecrowdsale", "70")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    // checks bypassed because someone may wish to prepare the payload to close a crowdsale creation not yet broadcast

    std::vector<unsigned char> payload = CreatePayload_CloseCrowdsale(propertyId);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_burnbch(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 0)
        throw runtime_error(
            "whc_createpayload_burnbch \n"

            "\nCreates the payload to burn bch to get whc.\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_burnbch", "")
            + HelpExampleRpc("whc_createpayload_burnbch", "")
        );

    std::vector<unsigned char> payload = CreatePayload_BurnBch();

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_issueERC721property(const Config &config,const JSONRPCRequest &request){
    if (request.fHelp || request.params.size() != 5)
        throw runtime_error(
                "whc_createpayload_issueERC721property  \"name\" \"symbol\" \"data\" \"url\" \"number\" \n"
                        "\nCreates the payload to issue ERC721 property\n"
                        "Argument:\n"
                        "1. propertyName       (string, required) the name of created property \n"
                        "2. propertySymbol     (string, required) the symbol of created property \n"
                        "3. propertyData       (string, required) the Data of created property \n"
                        "4. propertyURL        (string, required) the URL of created property \n"
                        "5. totalNumber        (string, required) the number of token that created property will issued in the future\n"
                        "\nResult:\n"
                        "\"payload\"             (string) the hex-encoded payload\n"

                        "\nExamples:\n"
                + HelpExampleCli("whc_createpayload_issueERC721property", "\"name\" \"symbol\" \"data\" \"url\" \"number\" ")
                + HelpExampleRpc("whc_createpayload_issueERC721property", "\"name\" \"symbol\" \"data\" \"url\" \"number\" ")
        );

    int i = 0;
    std::string propertyName = request.params[i++].get_str();
    std::string propertySymbol = request.params[i++].get_str();
    std::string propertyData = request.params[i++].get_str();
    std::string propertyURL = request.params[i++].get_str();
    uint64_t totalNumber = ParseStrToUInt64(request.params[i++].get_str());

    // perform checks
    RequirePropertyName(propertyName);
    RequireTokenNumber(totalNumber);

    std::vector<unsigned char> payload = CreatePayload_IssueERC721Property(propertyName, propertySymbol, propertyData, propertyURL, totalNumber);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_issueERC721token(const Config &config,const JSONRPCRequest &request){
    if (request.fHelp || request.params.size() > 4 || request.params.size() < 3)
        throw runtime_error(
                "whc_createpayload_issueERC721token \"1\" \"2\" \"0x03\" \"url\" \n"
                        "\nCreates the payload to issue ERC721 property\n"
                        "Argument:\n"
                        "1. propertyID              (string, required) The ID of the special property that will be issued token \n"
                        "2. tokenID                 (string, optional) The tokenID that will be issued, if you don't want to skip this parament, wormhole system will automatic tokenID \n"
                        "3. tokenAttributes         (string, required) The Attributes of the new created token\n"
                        "4. tokenURL                (string, required) The URL of the new created token\n"
                        "\nResult:\n"
                        "\"payload\"             (string) the hex-encoded payload\n"

                        "\nExamples:\n"
                + HelpExampleCli("whc_createpayload_issueERC721token", "\"1\" \"2\" \"0x03\" \"url\"  ")
                + HelpExampleRpc("whc_createpayload_issueERC721token", "\"1\" \"2\" \"0x03\" \"url\" ")
        );

    int i = 0;
    uint256 propertyid = uint256S(convertDecToHex(request.params[i++].get_str()));
    uint256 tokenid;
    if(request.params.size() == 4){
        tokenid = uint256S(convertDecToHex(request.params[i++].get_str()));
    }
    RequireHexNumber(request.params[i].get_str());
    uint256 tokenAttributes = uint256S(request.params[i++].get_str());
    std::string tokenURL = request.params[i++].get_str();

    std::vector<unsigned char> payload = CreatePayload_IssueERC721Token(propertyid, tokenid, tokenAttributes, tokenURL);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_transferERC721token(const Config &config,const JSONRPCRequest &request){
    if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
                "whc_createpayload_transferERC721token \"1\" \"2\" \n"
                        "\nburn BCH to get WHC"
                        "\nArguments:\n"
                        "1. propertyID              (string, required) The propertyid within the token that will be transfer \n"
                        "2. tokenID                 (string, optional) The tokenid that will be transfer\n"
                        "\nResult:\n"
                        "\"hash\"                  (string) the hex-encoded transaction hash\n"
                        "\nExamples:\n"
                + HelpExampleCli("whc_createpayload_transferERC721token", " \"1\" \"2\" ")
                + HelpExampleRpc("whc_createpayload_transferERC721token", " \"1\" \"2\" ")
        );

    int i = 0;
    uint256 propertyid = uint256S(convertDecToHex(request.params[i++].get_str()));
    uint256 tokenid = uint256S(convertDecToHex(request.params[i++].get_str()));

    std::vector<unsigned char> payload = CreatePayload_TransferERC721Token(propertyid, tokenid);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_destroyERC721token(const Config &config,const JSONRPCRequest &request){
    if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
                "whc_createpayload_destroyERC721token \"1\" \"2\" \n"
                        "\nburn BCH to get WHC"
                        "\nArguments:\n"
                        "1. propertyID              (string, required) The token within the property that will be destroy \n"
                        "2. tokenID                 (string, optional) The tokenid that will be destroy\n"
                        "\nResult:\n"
                        "\"hash\"                  (string) the hex-encoded transaction hash\n"
                        "\nExamples:\n"
                + HelpExampleCli("whc_createpayload_destroyERC721token", " \"1\" \"2\" ")
                + HelpExampleRpc("whc_createpayload_destroyERC721token", " \"1\" \"2\" ")
        );

    int i = 0;
    uint256 propertyid = uint256S(convertDecToHex(request.params[i++].get_str()));
    uint256 tokenid = uint256S(convertDecToHex(request.params[i++].get_str()));

    std::vector<unsigned char> payload = CreatePayload_DestroyERC721Token(propertyid, tokenid);

    return HexStr(payload.begin(), payload.end());
}
UniValue whc_createpayload_grant(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 2 || request.params.size() > 3)
        throw runtime_error(
            "whc_createpayload_grant propertyid \"amount\" ( \"memo\" )\n"

            "\nCreates the payload to issue or grant new units of managed tokens.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens to grant\n"
            "2. amount               (string, required) the amount of tokens to create\n"
            "3. memo                 (string, optional) a text note attached to this transaction (none by default)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_grant", "51 \"7000\"")
            + HelpExampleRpc("whc_createpayload_grant", "51, \"7000\"")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);
    int64_t amount = ParseAmount(request.params[1], getPropertyType(propertyId));
    std::string memo = (request.params.size() > 2) ? ParseText(request.params[2]): "";

    std::vector<unsigned char> payload = CreatePayload_Grant(propertyId, amount, memo);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_revoke(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 2 || request.params.size() > 3)
        throw runtime_error(
            "whc_createpayload_revoke propertyid \"amount\" ( \"memo\" )\n"

            "\nCreates the payload to revoke units of managed tokens.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens to revoke\n"
            "2. amount               (string, required) the amount of tokens to revoke\n"
            "3. memo                 (string, optional) a text note attached to this transaction (none by default)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_revoke", "51 \"100\"")
            + HelpExampleRpc("whc_createpayload_revoke", "51, \"100\"")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);
    int64_t amount = ParseAmount(request.params[1], getPropertyType(propertyId));
    std::string memo = (request.params.size() > 2) ? ParseText(request.params[2]): "";

    std::vector<unsigned char> payload = CreatePayload_Revoke(propertyId, amount, memo);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_changeissuer(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "whc_createpayload_changeissuer propertyid\n"

            "\nCreats the payload to change the issuer on record of the given tokens.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_changeissuer", "3")
            + HelpExampleRpc("whc_createpayload_changeissuer", "3")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);

    std::vector<unsigned char> payload = CreatePayload_ChangeIssuer(propertyId);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_trade(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 4)
        throw runtime_error(
            "omni_createpayload_trade propertyidforsale \"amountforsale\" propertiddesired \"amountdesired\"\n"

            "\nCreates the payload to place a trade offer on the distributed token exchange.\n"

            "\nArguments:\n"
            "1. propertyidforsale    (number, required) the identifier of the tokens to list for sale\n"
            "2. amountforsale        (string, required) the amount of tokens to list for sale\n"
            "3. propertiddesired     (number, required) the identifier of the tokens desired in exchange\n"
            "4. amountdesired        (string, required) the amount of tokens desired in exchange\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_trade", "31 \"250.0\" 1 \"10.0\"")
            + HelpExampleRpc("omni_createpayload_trade", "31, \"250.0\", 1, \"10.0\"")
        );

    uint32_t propertyIdForSale = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyIdForSale);
    int64_t amountForSale = ParseAmount(request.params[1], getPropertyType(propertyIdForSale));
    uint32_t propertyIdDesired = ParsePropertyId(request.params[2]);
    RequireExistingProperty(propertyIdDesired);
    int64_t amountDesired = ParseAmount(request.params[3], getPropertyType(propertyIdDesired));
    RequireSameEcosystem(propertyIdForSale, propertyIdDesired);
    RequireDifferentIds(propertyIdForSale, propertyIdDesired);
    RequireDifferentIds(propertyIdForSale, propertyIdDesired);

    std::vector<unsigned char> payload = CreatePayload_MetaDExTrade(propertyIdForSale, amountForSale, propertyIdDesired, amountDesired);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_canceltradesbyprice(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 4)
        throw runtime_error(
            "omni_createpayload_canceltradesbyprice propertyidforsale \"amountforsale\" propertiddesired \"amountdesired\"\n"

            "\nCreates the payload to cancel offers on the distributed token exchange with the specified price.\n"

            "\nArguments:\n"
            "1. propertyidforsale    (number, required) the identifier of the tokens listed for sale\n"
            "2. amountforsale        (string, required) the amount of tokens to listed for sale\n"
            "3. propertiddesired     (number, required) the identifier of the tokens desired in exchange\n"
            "4. amountdesired        (string, required) the amount of tokens desired in exchange\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_canceltradesbyprice", "31 \"100.0\" 1 \"5.0\"")
            + HelpExampleRpc("omni_createpayload_canceltradesbyprice", "31, \"100.0\", 1, \"5.0\"")
        );

    uint32_t propertyIdForSale = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyIdForSale);
    int64_t amountForSale = ParseAmount(request.params[1], getPropertyType(propertyIdForSale));
    uint32_t propertyIdDesired = ParsePropertyId(request.params[2]);
    RequireExistingProperty(propertyIdDesired);
    int64_t amountDesired = ParseAmount(request.params[3], getPropertyType(propertyIdDesired));
    RequireSameEcosystem(propertyIdForSale, propertyIdDesired);
    RequireDifferentIds(propertyIdForSale, propertyIdDesired);

    std::vector<unsigned char> payload = CreatePayload_MetaDExCancelPrice(propertyIdForSale, amountForSale, propertyIdDesired, amountDesired);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_canceltradesbypair(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
            "omni_createpayload_canceltradesbypair propertyidforsale propertiddesired\n"

            "\nCreates the payload to cancel all offers on the distributed token exchange with the given currency pair.\n"

            "\nArguments:\n"
            "1. propertyidforsale    (number, required) the identifier of the tokens listed for sale\n"
            "2. propertiddesired     (number, required) the identifier of the tokens desired in exchange\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_canceltradesbypair", "1 31")
            + HelpExampleRpc("omni_createpayload_canceltradesbypair", "1, 31")
        );

    uint32_t propertyIdForSale = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyIdForSale);
    uint32_t propertyIdDesired = ParsePropertyId(request.params[1]);
    RequireExistingProperty(propertyIdDesired);
    RequireSameEcosystem(propertyIdForSale, propertyIdDesired);
    RequireDifferentIds(propertyIdForSale, propertyIdDesired);

    std::vector<unsigned char> payload = CreatePayload_MetaDExCancelPair(propertyIdForSale, propertyIdDesired);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_cancelalltrades(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "omni_createpayload_cancelalltrades ecosystem\n"

            "\nCreates the payload to cancel all offers on the distributed token exchange.\n"

            "\nArguments:\n"
            "1. ecosystem            (number, required) the ecosystem of the offers to cancel (1 for main ecosystem, 2 for test ecosystem)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_cancelalltrades", "1")
            + HelpExampleRpc("omni_createpayload_cancelalltrades", "1")
        );

    uint8_t ecosystem = ParseEcosystem(request.params[0]);

    std::vector<unsigned char> payload = CreatePayload_MetaDExCancelEcosystem(ecosystem);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_enablefreezing(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "omni_createpayload_enablefreezing propertyid\n"

            "\nCreates the payload to enable address freezing for a centrally managed property.\n"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_enablefreezing", "3")
            + HelpExampleRpc("omni_createpayload_enablefreezing", "3")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);

    std::vector<unsigned char> payload = CreatePayload_EnableFreezing(propertyId);

    return HexStr(payload.begin(), payload.end());
}

UniValue omni_createpayload_disablefreezing(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 1)
        throw runtime_error(
            "omni_createpayload_disablefreezing propertyid\n"

            "\nCreates the payload to disable address freezing for a centrally managed property.\n"
            "\nIMPORTANT NOTE:  Disabling freezing for a property will UNFREEZE all frozen addresses for that property!"

            "\nArguments:\n"
            "1. propertyid           (number, required) the identifier of the tokens\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("omni_createpayload_disablefreezing", "3")
            + HelpExampleRpc("omni_createpayload_disablefreezing", "3")
        );

    uint32_t propertyId = ParsePropertyId(request.params[0]);
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);

    std::vector<unsigned char> payload = CreatePayload_DisableFreezing(propertyId);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_freeze(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 3)
        throw runtime_error(
            "whc_createpayload_freeze \"toaddress\" propertyid amount \n"

            "\nCreates the payload to freeze an address for a centrally managed token.\n"

            "\nArguments:\n"
            "1. toaddress            (string, required) the address to freeze tokens for\n"
            "2. propertyid           (number, required) the property to freeze tokens for (must be managed type and have freezing option enabled)\n"
            "3. amount               (string, required) the amount of tokens to freeze (note: this is unused - once frozen an address cannot send any transactions)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_freeze", "\"3HTHRxu3aSDV4deakjC7VmsiUp7c6dfbvs\" 1 0")
            + HelpExampleRpc("whc_createpayload_freeze", "\"3HTHRxu3aSDV4deakjC7VmsiUp7c6dfbvs\", 1, 0")
        );

    std::string refAddress = ParseAddress(request.params[0]);

    uint32_t propertyId = ParsePropertyId(request.params[1]);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));

    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);

    std::vector<unsigned char> payload = CreatePayload_FreezeTokens(propertyId, amount, refAddress);

    return HexStr(payload.begin(), payload.end());
}

UniValue whc_createpayload_unfreeze(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 3)
        throw runtime_error(
            "whc_createpayload_unfreeze \"toaddress\" propertyid amount \n"

            "\nCreates the payload to unfreeze an address for a centrally managed token.\n"

            "\nArguments:\n"
            "1. toaddress            (string, required) the address to unfreeze tokens for\n"
            "2. propertyid           (number, required) the property to unfreeze tokens for (must be managed type and have freezing option enabled)\n"
            "3. amount               (string, required) the amount of tokens to unfreeze (note: this is unused)\n"

            "\nResult:\n"
            "\"payload\"             (string) the hex-encoded payload\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_createpayload_unfreeze", "\"3HTHRxu3aSDV4deakjC7VmsiUp7c6dfbvs\" 1 0")
            + HelpExampleRpc("whc_createpayload_unfreeze", "\"3HTHRxu3aSDV4deakjC7VmsiUp7c6dfbvs\", 1, 0")
        );

    std::string refAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));

    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);

    std::vector<unsigned char> payload = CreatePayload_UnfreezeTokens(propertyId, amount, refAddress);

    return HexStr(payload.begin(), payload.end());
}

static const ContextFreeRPCCommand commands[] =
{ //  category                         name                                      actor (function)                         okSafeMode
  //  -------------------------------- ----------------------------------------- ---------------------------------------- ----------
    //change_003
    { "omni layer (payload creation)", "whc_createpayload_simplesend",          &whc_createpayload_simplesend,          true, {} },
    { "omni layer (payload creation)", "whc_createpayload_sendall",             &whc_createpayload_sendall,             true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_dexsell",             &omni_createpayload_dexsell,             true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_dexaccept",           &omni_createpayload_dexaccept,           true, {} },
    { "omni layer (payload creation)", "whc_createpayload_sto",                 &whc_createpayload_sto,                 true, {} },
    { "omni layer (payload creation)", "whc_createpayload_grant",               &whc_createpayload_grant,               true, {} },
    { "omni layer (payload creation)", "whc_createpayload_revoke",              &whc_createpayload_revoke,              true, {} },
    { "omni layer (payload creation)", "whc_createpayload_changeissuer",        &whc_createpayload_changeissuer,        true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_trade",               &omni_createpayload_trade,               true, {} },
    { "omni layer (payload creation)", "whc_createpayload_issuancefixed",       &whc_createpayload_issuancefixed,       true, {} },
    { "omni layer (payload creation)", "whc_createpayload_issuancecrowdsale",   &whc_createpayload_issuancecrowdsale,   true, {} },
    { "omni layer (payload creation)", "whc_createpayload_issuancemanaged",     &whc_createpayload_issuancemanaged,     true, {} },
    { "omni layer (payload creation)", "whc_createpayload_closecrowdsale",      &whc_createpayload_closecrowdsale,      true, {} },
    { "omni layer (payload creation)", "whc_createpayload_destroyERC721token",      &whc_createpayload_destroyERC721token,      true, {} },
    { "omni layer (payload creation)", "whc_createpayload_issueERC721property",      &whc_createpayload_issueERC721property,      true, {} },
    { "omni layer (payload creation)", "whc_createpayload_transferERC721token",      &whc_createpayload_transferERC721token,      true, {} },
    { "omni layer (payload creation)", "whc_createpayload_issueERC721token",      &whc_createpayload_issueERC721token,      true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_canceltradesbyprice", &omni_createpayload_canceltradesbyprice, true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_canceltradesbypair",  &omni_createpayload_canceltradesbypair,  true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_cancelalltrades",     &omni_createpayload_cancelalltrades,     true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_enablefreezing",      &omni_createpayload_enablefreezing,      true, {} },
//    { "omni layer (payload creation)", "omni_createpayload_disablefreezing",     &omni_createpayload_disablefreezing,     true, {} },
    { "omni layer (payload creation)", "whc_createpayload_burnbch",             &whc_createpayload_burnbch,             true, {} },
    { "omni layer (payload creation)", "whc_createpayload_particrowdsale",             &whc_createpayload_particrowdsale,             true, {} },
    { "omni layer (payload creation)", "whc_createpayload_freeze",              &whc_createpayload_freeze,              true, {} },
    { "omni layer (payload creation)", "whc_createpayload_unfreeze",            &whc_createpayload_unfreeze,            true, {} },
};

void RegisterOmniPayloadCreationRPCCommands(CRPCTable &tableRPC)
{
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++)
        tableRPC.appendCommand(commands[vcidx].name, &commands[vcidx]);
}
