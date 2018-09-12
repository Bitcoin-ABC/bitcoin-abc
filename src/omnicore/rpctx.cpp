/**
 * @file rpctx.cpp
 *
 * This file contains RPC calls for creating and sending Omni transactions.
 */

#include "omnicore/rpctx.h"

#include "omnicore/createpayload.h"
#include "omnicore/dex.h"
#include "omnicore/errors.h"
#include "omnicore/omnicore.h"
#include "omnicore/encoding.h"
#include "omnicore/pending.h"
#include "omnicore/rpcrequirements.h"
#include "omnicore/rpcvalues.h"
#include "omnicore/sp.h"
#include "omnicore/tx.h"

#include "wallet/coincontrol.h"
#include "consensus/validation.h"
#include "config.h"
#include "cashaddrenc.h"
#include "init.h"
#include "net.h"
#include "rpc/server.h"
#include "sync.h"
#include "utilmoneystr.h"
#ifdef ENABLE_WALLET
#include "wallet/wallet.h"
#endif

#include <univalue.h>

#include <stdint.h>
#include <stdexcept>
#include <string>

using std::runtime_error;
using namespace mastercore;

UniValue whc_sendrawtx(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 2 || request.params.size() > 5)
        throw runtime_error(
            "whc_sendrawtx \"fromaddress\" \"rawtransaction\" ( \"referenceaddress\" \"redeemaddress\" \"referenceamount\" )\n"
            "\nBroadcasts a raw Omni Layer transaction.\n"
            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. rawtransaction       (string, required) the hex-encoded raw transaction\n"
            "3. referenceaddress     (string, optional) a reference address (none by default)\n"
            "4. redeemaddress        (string, optional) an address that can spent the transaction dust (sender by default)\n"
            "5. referenceamount      (string, optional) a bitcoin amount that is sent to the receiver (minimal by default)\n"
            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"
            "\nExamples:\n"
            + HelpExampleCli("whc_sendrawtx", "\"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\" \"000000000000000100000000017d7840\" \"1EqTta1Rt8ixAA32DuC29oukbsSWU62qAV\"")
            + HelpExampleRpc("whc_sendrawtx", "\"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\", \"000000000000000100000000017d7840\", \"1EqTta1Rt8ixAA32DuC29oukbsSWU62qAV\"")
        );

    std::string fromAddress = ParseAddress(request.params[0]);
    std::vector<unsigned char> data = ParseHexV(request.params[1], "raw transaction");
    std::string toAddress = (request.params.size() > 2) ? ParseAddressOrEmpty(request.params[2]): "";
    std::string redeemAddress = (request.params.size() > 3) ? ParseAddressOrEmpty(request.params[3]): "";
    int64_t referenceAmount = (request.params.size() > 4) ? ParseAmount(request.params[4], PRICE_PRECISION): 0;

    //some sanity checking of the data supplied?
    uint256 newTX;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, redeemAddress, referenceAmount, data, newTX, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return newTX.GetHex();
        }
    }
}

UniValue whc_particrowsale(Config const&, JSONRPCRequest const& request)
{
    if (request.fHelp || request.params.size() < 3 || request.params.size() > 5)
        throw runtime_error(
            "whc_particrowsale \"fromaddress\" \"toaddress\" \"amount\" ( \"redeemaddress\" \"referenceamount\" )\n"

            "\nCreate and broadcast a participate crowsale transaction.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. toaddress            (string, required) the address of the receiver\n"
            "3. amount               (string, required) the amount of WHC to participate crowsale\n"
            "4. redeemaddress        (string, optional) an address that can spend the transaction dust (sender by default)\n"
            "5. referenceamount      (string, optional) a bitcoin amount that is sent to the receiver (minimal by default)\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_particrowsale", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\"  \"100.0\"")
            + HelpExampleRpc("whc_particrowsale", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\",  \"100.0\"")
        );
    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    std::string toAddress = ParseAddress(request.params[1]);
    int64_t amount = ParseAmount(request.params[2], PRICE_PRECISION);
    std::string redeemAddress = (request.params.size() > 3 && !ParseText(request.params[3]).empty()) ? ParseAddress(request.params[3]): "";
    int64_t referenceAmount = (request.params.size() > 4) ? ParseAmount(request.params[4], PRICE_PRECISION): 0;

    // perform checks
    RequireBalance(fromAddress, OMNI_PROPERTY_WHC, amount);
    RequireSaneReferenceAmount(referenceAmount);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_PartiCrowsale(OMNI_PROPERTY_WHC, amount);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, redeemAddress, referenceAmount, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            PendingAdd(txid, fromAddress, MSC_TYPE_BUY_TOKEN, OMNI_PROPERTY_WHC, amount);
            return txid.GetHex();
        }
    }
}
UniValue whc_send(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 4 || request.params.size() > 6)
        throw runtime_error(
            "whc_send \"fromaddress\" \"toaddress\" propertyid \"amount\" ( \"redeemaddress\" \"referenceamount\" )\n"

            "\nCreate and broadcast a simple send transaction.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. toaddress            (string, required) the address of the receiver\n"
            "3. propertyid           (number, required) the identifier of the tokens to send\n"
            "4. amount               (string, required) the amount to send\n"
            "5. redeemaddress        (string, optional) an address that can spend the transaction dust (sender by default)\n"
            "6. referenceamount      (string, optional) a bitcoin amount that is sent to the receiver (minimal by default)\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_send", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\" 1 \"100.0\"")
            + HelpExampleRpc("whc_send", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\", 1, \"100.0\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    std::string toAddress = ParseAddress(request.params[1]);
    uint32_t propertyId = ParsePropertyId(request.params[2]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[3], getPropertyType(propertyId));
    std::string redeemAddress = (request.params.size() > 4 && !ParseText(request.params[4]).empty()) ? ParseAddress(request.params[4]): "";
    int64_t referenceAmount = (request.params.size() > 5) ? ParseAmount(request.params[5], PRICE_PRECISION): 0;

    // perform checks
    RequireBalance(fromAddress, propertyId, amount);
    /*
    if (isAddressFrozen(fromAddress, propertyId))
    {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Sender has been frozen");
    }*/
    RequireSaneReferenceAmount(referenceAmount);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_SimpleSend(propertyId, amount);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, redeemAddress, referenceAmount, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            PendingAdd(txid, fromAddress, MSC_TYPE_SIMPLE_SEND, propertyId, amount);
            return txid.GetHex();
        }
    }
}

UniValue whc_sendall(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 3 || request.params.size() > 5)
        throw runtime_error(
            "whc_sendall \"fromaddress\" \"toaddress\" ecosystem ( \"redeemaddress\" \"referenceamount\" )\n"

            "\nTransfers all available tokens in the given ecosystem to the recipient.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. toaddress            (string, required) the address of the receiver\n"
            "3. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"
            "4. redeemaddress        (string, optional) an address that can spend the transaction dust (sender by default)\n"
            "5. referenceamount      (string, optional) a bitcoin amount that is sent to the receiver (minimal by default)\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendall", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\" 2")
            + HelpExampleRpc("whc_sendall", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\" 2")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    std::string toAddress = ParseAddress(request.params[1]);
    uint8_t ecosystem = ParseEcosystem(request.params[2]);
    std::string redeemAddress = (request.params.size() > 3 && !ParseText(request.params[3]).empty()) ? ParseAddress(request.params[3]): "";
    int64_t referenceAmount = (request.params.size() > 4) ? ParseAmount(request.params[4], PRICE_PRECISION): 0;

    // perform checks
    RequirePropertyEcosystem(ecosystem);
    RequireSaneReferenceAmount(referenceAmount);
    /*
    if (isAddressFrozen(fromAddress, propertyId))
    {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Sender has been frozen");
    }*/
    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_SendAll(ecosystem);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, redeemAddress, referenceAmount, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            // TODO: pending
            return txid.GetHex();
        }
    }
}

UniValue whc_sendissuancecrowdsale(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 15)
        throw runtime_error(
            "whc_sendissuancecrowdsale \"fromaddress\" ecosystem precision previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\" propertyiddesired tokensperunit deadline earlybonus undefine totalNumber \n"

            "Create new tokens as crowdsale."

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"
            "3. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "4. previousid           (number, required) an identifier of a predecessor token (0 for new crowdsales)\n"
            "5. category             (string, required) a category for the new tokens (can be \"\")\n"
            "6. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "7. name                 (string, required) the name of the new tokens to create\n"
            "8. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "9. data                 (string, required) a description for the new tokens (can be \"\")\n"
            "10. propertyiddesired   (number, required) the identifier of a token eligible to participate in the crowdsale\n"
            "11. tokensperunit       (string, required) the amount of tokens granted per unit invested in the crowdsale\n"
            "12. deadline            (number, required) the deadline of the crowdsale as Unix timestamp\n"
            "13. earlybonus          (number, required) an early bird bonus for participants in percent per week\n"
            "14. Undefine            (number, required) the value must be 0\n"
		    "15. totalNumber         (string, required) the number of tokens to create\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendissuancecrowdsale", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" 1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\" 1 \"100\" 1483228800 30 2 77868698")
            + HelpExampleRpc("whc_sendissuancecrowdsale", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", 1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\", 1, \"100\", 1483228800, 30, 2, 77868698")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint8_t ecosystem = ParseEcosystem(request.params[1]);
    uint16_t type = ParsePropertyType(request.params[2]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[3]);
    std::string category = ParseText(request.params[4]);
    std::string subcategory = ParseText(request.params[5]);
    std::string name = ParseText(request.params[6]);
    std::string url = ParseText(request.params[7]);
    std::string data = ParseText(request.params[8]);
    uint32_t propertyIdDesired = ParsePropertyId(request.params[9]);
    int64_t numTokens = ParseAmount(request.params[10], PRICE_PRECISION);
    int64_t deadline = ParseDeadline(request.params[11]);
    uint8_t earlyBonus = ParseEarlyBirdBonus(request.params[12]);
    uint8_t issuerPercentage = ParseIssuerBonus(request.params[13]);
    
	// perform checks
    RequirePropertyType(type);
    RequireTokenPrice(numTokens);
    RequireIssuerPercentage(issuerPercentage);
    RequireCrowsDesireProperty(propertyIdDesired);
    RequirePropertyName(name);
    RequireExistingProperty(propertyIdDesired);
    RequireSameEcosystem(ecosystem, propertyIdDesired);
    RequirePropertyEcosystem(ecosystem);
    int64_t amount = ParseAmount(request.params[14], type);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_IssuanceVariable(ecosystem, type, previousId, category, subcategory, name, url, data, propertyIdDesired, numTokens, deadline, earlyBonus, issuerPercentage, amount);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendissuancefixed(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 10)
        throw runtime_error(
            "whc_sendissuancefixed \"fromaddress\" ecosystem precision previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\" \"totalNumber\"\n"

            "\nCreate new tokens with fixed supply.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. ecosystem            (string, required) the ecosystem to create the tokens in, must be 1\n"
            "3. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "4. previousid           (number, required) an identifier of a predecessor token (use 0 for new tokens)\n"
            "5. category             (string, required) a category for the new tokens (can be \"\")\n"
            "6. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "7. name                 (string, required) the name of the new tokens to create\n"
            "8. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "9. data                 (string, required) a description for the new tokens (can be \"\")\n"
            "10. totalNumber              (string, required) the number of tokens to create\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendissuancefixed", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" 1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\" \"1000000\"")
            + HelpExampleRpc("whc_sendissuancefixed", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", 1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\", \"1000000\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint8_t ecosystem = ParseEcosystem(request.params[1]);
    uint16_t type = ParsePropertyType(request.params[2]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[3]);
    std::string category = ParseText(request.params[4]);
    std::string subcategory = ParseText(request.params[5]);
    std::string name = ParseText(request.params[6]);
    std::string url = ParseText(request.params[7]);
    std::string data = ParseText(request.params[8]);

    // perform checks
    RequirePropertyName(name);
    RequirePropertyEcosystem(ecosystem);
    RequirePropertyType(type);
    int64_t amount = ParseAmount(request.params[9], type);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_IssuanceFixed(ecosystem, type, previousId, category, subcategory, name, url, data, amount);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendissuancemanaged(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 9)
        throw runtime_error(
            "whc_sendissuancemanaged \"fromaddress\" ecosystem precision previousid \"category\" \"subcategory\" \"name\" \"url\" \"data\"\n"

            "\nCreate new tokens with manageable supply.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. ecosystem            (number, required) the ecosystem to create the tokens in, must be 1\n"
            "3. property precision   (number, required) the precision of the tokens to create:[0, 8]\n"
            "4. previousid           (number, required) an identifier of a predecessor token (use 0 for new tokens)\n"
            "5. category             (string, required) a category for the new tokens (can be \"\")\n"
            "6. subcategory          (string, required) a subcategory for the new tokens  (can be \"\")\n"
            "7. name                 (string, required) the name of the new tokens to create\n"
            "8. url                  (string, required) an URL for further information about the new tokens (can be \"\")\n"
            "9. data                 (string, required) a description for the new tokens (can be \"\")\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendissuancemanaged", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" 1 1 0 \"Companies\" \"Bitcoin Mining\" \"Quantum Miner\" \"\" \"\"")
            + HelpExampleRpc("whc_sendissuancemanaged", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", 1, 1, 0, \"Companies\", \"Bitcoin Mining\", \"Quantum Miner\", \"\", \"\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint8_t ecosystem = ParseEcosystem(request.params[1]);
    uint16_t type = ParsePropertyType(request.params[2]);
    uint32_t previousId = ParsePreviousPropertyId(request.params[3]);
    std::string category = ParseText(request.params[4]);
    std::string subcategory = ParseText(request.params[5]);
    std::string name = ParseText(request.params[6]);
    std::string url = ParseText(request.params[7]);
    std::string data = ParseText(request.params[8]);

    // perform checks
    RequirePropertyName(name);
    RequirePropertyEcosystem(ecosystem);
	RequirePropertyType(type);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_IssuanceManaged(ecosystem, type, previousId, category, subcategory, name, url, data);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendsto(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 3 || request.params.size() > 5)
        throw runtime_error(
            "whc_sendsto \"fromaddress\" propertyid \"amount\" ( \"redeemaddress\" distributionproperty )\n"

            "\nCreate and broadcast a send-to-owners transaction.\n"

            "\nArguments:\n"
            "1. fromaddress            (string, required) the address to send from\n"
            "2. propertyid             (number, required) the identifier of the tokens to distribute\n"
            "3. amount                 (string, required) the amount to distribute\n"
            "4. redeemaddress          (string, optional) an address that can spend the transaction dust (sender by default)\n"
            "5. distributionproperty   (number, optional) the identifier of the property holders to distribute to\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendsto", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\",  3 \"5000\"")
            + HelpExampleRpc("whc_sendsto", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\",  3, \"5000\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));
    std::string redeemAddress = (request.params.size() > 3 && !ParseText(request.params[3]).empty()) ? ParseAddress(request.params[3]): "";
    uint32_t distributionPropertyId = (request.params.size() > 4) ? ParsePropertyId(request.params[4]) : propertyId;

    // perform checks
    RequireBalance(fromAddress, propertyId, amount);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_SendToOwners(propertyId, amount, distributionPropertyId);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", redeemAddress, 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            PendingAdd(txid, fromAddress, MSC_TYPE_SEND_TO_OWNERS, propertyId, amount);
            return txid.GetHex();
        }
    }
}

UniValue whc_sendgrant(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 4 || request.params.size() > 5)
        throw runtime_error(
            "whc_sendgrant \"fromaddress\" \"toaddress\" propertyid \"amount\" ( \"memo\" )\n"

            "\nIssue or grant new units of managed tokens.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to send from\n"
            "2. toaddress            (string, required) the receiver of the tokens (sender by default, can be \"\")\n"
            "3. propertyid           (number, required) the identifier of the tokens to grant\n"
            "4. amount               (string, required) the amount of tokens to create\n"
            "5. memo                 (string, optional) a text note attached to this transaction (none by default)\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendgrant", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\" \"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\" 51 \"7000\"")
            + HelpExampleRpc("whc_sendgrant", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\", \"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 51, \"7000\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    std::string toAddress = !ParseText(request.params[1]).empty() ? ParseAddress(request.params[1]): "";
    uint32_t propertyId = ParsePropertyId(request.params[2]);
    // perform checks
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);
    int64_t amount = ParseAmount(request.params[3], getPropertyType(propertyId));
    std::string memo = (request.params.size() > 4) ? ParseText(request.params[4]): "";

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_Grant(propertyId, amount, memo);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendrevoke(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 3 || request.params.size() > 4)
        throw runtime_error(
            "whc_sendrevoke \"fromaddress\" propertyid \"amount\" ( \"memo\" )\n"

            "\nRevoke units of managed tokens.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address to revoke the tokens from\n"
            "2. propertyid           (number, required) the identifier of the tokens to revoke\n"
            "3. amount               (string, required) the amount of tokens to revoke\n"
            "4. memo                 (string, optional) a text note attached to this transaction (none by default)\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendrevoke", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 51 \"100\"")
            + HelpExampleRpc("whc_sendrevoke", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 51, \"100\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));
    std::string memo = (request.params.size() > 3) ? ParseText(request.params[3]): "";

    // perform checks
    RequireManagedProperty(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);
    RequireBalance(fromAddress, propertyId, amount);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_Revoke(propertyId, amount, memo);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendclosecrowdsale(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 2)
        throw runtime_error(
            "whc_sendclosecrowdsale \"fromaddress\" propertyid\n"

            "\nManually close a crowdsale.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address associated with the crowdsale to close\n"
            "2. propertyid           (number, required) the identifier of the crowdsale to close\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendclosecrowdsale", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\" 70")
            + HelpExampleRpc("whc_sendclosecrowdsale", "\"qrutdtt3mwcutj8dusjkt9y75x0m07mukvs8v8g4tn\", 70")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);

    // perform checks
    RequireExistingProperty(propertyId);
    RequireCrowdsale(propertyId);
    RequireActiveCrowdsale(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_CloseCrowdsale(propertyId);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_sendchangeissuer(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() != 3)
        throw runtime_error(
            "whc_sendchangeissuer \"fromaddress\" \"toaddress\" propertyid\n"

            "\nChange the issuer on record of the given tokens.\n"

            "\nArguments:\n"
            "1. fromaddress          (string, required) the address associated with the tokens\n"
            "2. toaddress            (string, required) the address to transfer administrative control to\n"
            "3. propertyid           (number, required) the identifier of the tokens\n"

            "\nResult:\n"
            "\"hash\"                  (string) the hex-encoded transaction hash\n"

            "\nExamples:\n"
            + HelpExampleCli("whc_sendchangeissuer", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\" \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\" 3")
            + HelpExampleRpc("whc_sendchangeissuer", "\"qqxyplcfuxnm9z4usma2wmnu4kw9mexeug580mc3lx\", \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\", 3")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    std::string toAddress = ParseAddress(request.params[1]);
    uint32_t propertyId = ParsePropertyId(request.params[2]);

    // perform checks
    RequireExistingProperty(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_ChangeIssuer(propertyId);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, toAddress, "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

UniValue whc_burnbchgetwhc(const Config &config,const JSONRPCRequest &request)
{
    if (request.fHelp || request.params.size() < 1 || request.params.size() > 2)
        throw runtime_error(
                "whc_burnbchgetwhc \"amount\" redeemaddress\n"
                        "\nburn BCH to get WHC"
                        "\nArguments:\n"
                        "1. amount          	(numeric or string, required) The burn bch amount, required minimum amount is 1BCH\n"
                        "2. redeemaddress       (string, optional) the redeem bitcoin address \n"
                        "\nResult:\n"
                        "\"hash\"                  (string) the hex-encoded transaction hash\n"
                        "\nExamples:\n"
                + HelpExampleCli("whc_burnbchgetwhc", "1, \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\"")
                + HelpExampleRpc("whc_burnbchgetwhc", "1, \"qqzy3s0ueaxkf8hcffhtgkgew8c7f7g85um9a2g74r\"")
        );

    // obtain parameters & info
    Amount nAmount = AmountFromValue(request.params[0]);
    if (nAmount < COIN) {
        throw JSONRPCError(RPC_TYPE_ERROR, "burn amount less 1BCH ");
    }
    std::string redeemaddress = ""; 
	if (request.params.size() > 1){
	    redeemaddress = ParseAddress(request.params[1]);
	}

    CWalletRef pwalletMain = NULL;
    CWalletTx wtx;
    if (vpwallets.size() > 0) {
        pwalletMain = vpwallets[0];
    }

    bool result = createNewtransaction(pwalletMain, redeemaddress, nAmount, wtx );
    // check error and return the txid (or raw hex depending on autocommit)
    if (result != true) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, error_str(RPC_INVALID_PARAMETER));
    } else {
        return wtx.GetId().GetHex();
    }
}

UniValue whc_sendfreeze(const Config &config,const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 4 )
        throw runtime_error(
                "whc_sendfreeze \"fromaddress\" propertyid \"amount\"  \"frozenaddress\" \n"

                "\nRevoke units of managed tokens.\n"

                "\nArguments:\n"
                "1. fromaddress          (string, required) the address to send from\n"
                "2. propertyid           (number, required) the identifier of the tokens to freeze\n"
                "3. amount               (string, required) the amount of tokens to freeze (not used for now)\n"
                "4. frozenaddress        (string, required) the address to be frozen\n"

                "\nResult:\n"
                "\"hash\"                  (string) the hex-encoded transaction hash\n"

                "\nExamples:\n"
                + HelpExampleCli("whc_sendfreeze", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 51 \"100\", \"kq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\"")
                + HelpExampleRpc("whc_sendfreeze", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 52, \"100\", \"kq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));
    std::string freezedAddress = ParseAddress(request.params[3]);

    // perform checks

    RequireManagedProperty(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);

    if (fromAddress == freezedAddress) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Sender cannot be same with the address will be freezed");
    }

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_FreezeTokens(propertyId, amount, freezedAddress);

    payload.push_back(0xff);
    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0,payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();

        }
    }
}

UniValue whc_sendunfreeze(const Config &config,const JSONRPCRequest &request) {
    if (request.fHelp || request.params.size() != 4 )
        throw runtime_error(
                "whc_sendunfreeze \"fromaddress\" propertyid \"amount\" \"frozenaddress\" \n"

                "\nRevoke units of managed tokens.\n"

                "\nArguments:\n"
                "1. fromaddress          (string, required) the address to send from\n"
                "2. propertyid           (number, required) the identifier of the tokens to unfreeze\n"
                "3. amount               (string, required) the amount of tokens to unfreeze\n"
                "4. frozenaddress        (string, required) the address has been frozen\n"

                "\nResult:\n"
                "\"hash\"                  (string) the hex-encoded transaction hash\n"

                "\nExamples:\n"
                + HelpExampleCli("whc_sendunfreeze", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 51 \"100\", \"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\"")
                + HelpExampleRpc("whc_sendunfreeze", "\"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\", 52, \"100\", \"qq6tftuhukdagy5tthhnnx7xk9awhyc49us2h08xj4\"")
        );

    // obtain parameters & info
    std::string fromAddress = ParseAddress(request.params[0]);
    uint32_t propertyId = ParsePropertyId(request.params[1]);
    RequireExistingProperty(propertyId);
    int64_t amount = ParseAmount(request.params[2], getPropertyType(propertyId));
    std::string unfreezedAddress = ParseAddress(request.params[3]);

    // perform checks
    RequireExistingProperty(propertyId);
    RequireManagedProperty(propertyId);
    RequireTokenIssuer(fromAddress, propertyId);
    if (fromAddress == unfreezedAddress) {
        throw JSONRPCError(RPC_TYPE_ERROR, "Sender cannot be same with the address will be unfreezed");
    }

    // create a payload for the transaction
    std::vector<unsigned char> payload = CreatePayload_UnfreezeTokens(propertyId, amount, unfreezedAddress);

    // request the wallet build the transaction (and if needed commit it)
    uint256 txid;
    std::string rawHex;
    int result = WalletTxBuilder(fromAddress, "", "", 0, payload, txid, rawHex, autoCommit);

    // check error and return the txid (or raw hex depending on autocommit)
    if (result != 0) {
        throw JSONRPCError(result, error_str(result));
    } else {
        if (!autoCommit) {
            return rawHex;
        } else {
            return txid.GetHex();
        }
    }
}

bool createNewtransaction(CWallet *const pwallet, const std::string &address,
                          Amount nValue, CWalletTx &wtxNew){
    // Check amount
    if (nValue <= Amount(0)) {
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid amount");
    }

    if (pwallet == NULL){
        return false;
    }

    Amount curBalance = pwallet->GetBalance();
    bool fSubtractFeeFromAmount = false;

    if (nValue > curBalance) {
        throw JSONRPCError(RPC_WALLET_INSUFFICIENT_FUNDS, "Insufficient funds");
    }

    if (pwallet->GetBroadcastTransactions() && !g_connman) {
        throw JSONRPCError(
                RPC_CLIENT_P2P_DISABLED,
                "Error: Peer-to-peer functionality missing or disabled");
    }

    // Parse Bitcoin address
	const CChainParams& params = GetConfig().GetChainParams();
    CTxDestination dest = DecodeCashAddr(burnwhc_address, params);
    CScript scriptPubKey = GetScriptForDestination(dest);
    CTxDestination no = CNoDestination{};
    if (no == dest){
        throw JSONRPCError(
                MP_ENCODING_ERROR, "Error: address decode error : " + burnwhc_address);
    }
    std::vector<unsigned char> payload = CreatePayload_BurnBch();

    // Create and send the transaction
    CReserveKey reservekey(pwallet);
    Amount nFeeRequired;
    std::string strError;
    std::vector<CRecipient> vecSend;
    int nChangePosRet = 2;
    CRecipient recipient = {scriptPubKey, nValue, fSubtractFeeFromAmount};
    vecSend.push_back(recipient);
    CRecipient ret;
    if(!OmniCore_Encode_ClassC(payload, ret)) {
        throw JSONRPCError(
                MP_ENCODING_ERROR, "Error: encoding omni data failed ");
    }
    vecSend.push_back(ret);

    CCoinControl coinControl;
    if(!address.empty()){
        coinControl.destChange = DecodeCashAddr(address, params);
        if (!pwallet->CreateTransaction(vecSend, wtxNew, reservekey, nFeeRequired,
                                        nChangePosRet, strError, &coinControl )) {
            if (!fSubtractFeeFromAmount && nValue + nFeeRequired > curBalance) {
                strError = strprintf("Error: This transaction requires a "
                                             "transaction fee of at least %s",
                                     FormatMoney(nFeeRequired));
            }
            throw JSONRPCError(RPC_WALLET_ERROR, strError);
        }
    }else{
        if (!pwallet->CreateTransaction(vecSend, wtxNew, reservekey, nFeeRequired,
                                        nChangePosRet, strError)) {
            if (!fSubtractFeeFromAmount && nValue + nFeeRequired > curBalance) {
                strError = strprintf("Error: This transaction requires a "
                                             "transaction fee of at least %s",
                                     FormatMoney(nFeeRequired));
            }
            throw JSONRPCError(RPC_WALLET_ERROR, strError);
        }
    }


    CValidationState retstate;
    if (!pwallet->CommitTransaction(wtxNew, reservekey, g_connman.get(), retstate)) {
        strError = strprintf("Error: The transaction was rejected! Reason given: %s",
                          retstate.GetRejectReason());
        throw JSONRPCError(RPC_WALLET_ERROR, strError);
    }

    return true;
}

static const CRPCCommand commands[] =
{ //  category                             name                            actor (function)               okSafeMode
  //  ------------------------------------ ------------------------------- ------------------------------ ----------
#ifdef ENABLE_WALLET
    //change_003
    { "omni layer (transaction creation)", "whc_sendrawtx",               &whc_sendrawtx,               false, {} },
    { "omni layer (transaction creation)", "whc_send",                    &whc_send,                    false, {} },
    { "omni layer (transaction creation)", "whc_sendissuancecrowdsale",   &whc_sendissuancecrowdsale,   false, {} },
    { "omni layer (transaction creation)", "whc_sendissuancefixed",       &whc_sendissuancefixed,       false, {} },
    { "omni layer (transaction creation)", "whc_sendissuancemanaged",     &whc_sendissuancemanaged,     false, {} },
    { "omni layer (transaction creation)", "whc_sendsto",                 &whc_sendsto,                 false, {} },
    { "omni layer (transaction creation)", "whc_burnbchgetwhc",           &whc_burnbchgetwhc,           false, {} },
    { "omni layer (transaction creation)", "whc_sendgrant",               &whc_sendgrant,               false, {} },
    { "omni layer (transaction creation)", "whc_sendrevoke",              &whc_sendrevoke,              false, {} },
    { "omni layer (transaction creation)", "whc_sendclosecrowdsale",      &whc_sendclosecrowdsale,      false, {} },
    { "omni layer (transaction creation)", "whc_sendchangeissuer",        &whc_sendchangeissuer,        false, {} },
    { "omni layer (transaction creation)", "whc_sendall",                 &whc_sendall,                 false, {} },
    { "omni layer (transaction creation)", "whc_particrowsale",           &whc_particrowsale,           false, {} },
    { "omni layer (transaction creation)", "whc_sendfreeze",              &whc_sendfreeze,              false, {} },
    { "omni layer (transaction creation)", "whc_sendunfreeze",            &whc_sendunfreeze,            false, {} },

    /* depreciated: */
    { "hidden",                            "sendrawtx_MP",                 &whc_sendrawtx,               false, {} },
    { "hidden",                            "send_MP",                      &whc_send,                    false, {} },
    { "hidden",                            "sendtoowners_MP",              &whc_sendsto,                 false, {} },

#endif
};

void RegisterOmniTransactionCreationRPCCommands(CRPCTable &tableRPC)
{
    for (unsigned int vcidx = 0; vcidx < ARRAYLEN(commands); vcidx++)
        tableRPC.appendCommand(commands[vcidx].name, &commands[vcidx]);
}
