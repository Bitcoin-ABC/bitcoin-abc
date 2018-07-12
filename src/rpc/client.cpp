// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpc/client.h"
#include "rpc/protocol.h"
#include "util.h"

#include <cstdint>
#include <set>

#include <boost/algorithm/string/case_conv.hpp> // for to_lower()
#include <univalue.h>

class CRPCConvertParam {
public:
    std::string methodName; //!< method whose params want conversion
    int paramIdx;           //!< 0-based idx of param to convert
    std::string paramName;  //!< parameter name
};

/**
 * Specifiy a (method, idx, name) here if the argument is a non-string RPC
 * argument and needs to be converted from JSON.
 *
 * @note Parameter indexes start from 0.
 */
static const CRPCConvertParam vRPCConvertParams[] = {
    {"setmocktime", 0, "timestamp"},
    {"generate", 0, "nblocks"},
    {"generate", 1, "maxtries"},
    {"generatetoaddress", 0, "nblocks"},
    {"generatetoaddress", 2, "maxtries"},
    {"getnetworkhashps", 0, "nblocks"},
    {"getnetworkhashps", 1, "height"},
    {"sendtoaddress", 1, "amount"},
    {"sendtoaddress", 4, "subtractfeefromamount"},
    {"settxfee", 0, "amount"},
    {"getreceivedbyaddress", 1, "minconf"},
    {"getreceivedbyaccount", 1, "minconf"},
    {"listreceivedbyaddress", 0, "minconf"},
    {"listreceivedbyaddress", 1, "include_empty"},
    {"listreceivedbyaddress", 2, "include_watchonly"},
    {"listreceivedbyaccount", 0, "minconf"},
    {"listreceivedbyaccount", 1, "include_empty"},
    {"listreceivedbyaccount", 2, "include_watchonly"},
    {"getbalance", 1, "minconf"},
    {"getbalance", 2, "include_watchonly"},
    {"getblockhash", 0, "height"},
    {"waitforblockheight", 0, "height"},
    {"waitforblockheight", 1, "timeout"},
    {"waitforblock", 1, "timeout"},
    {"waitfornewblock", 0, "timeout"},
    {"move", 2, "amount"},
    {"move", 3, "minconf"},
    {"sendfrom", 2, "amount"},
    {"sendfrom", 3, "minconf"},
    {"listtransactions", 1, "count"},
    {"listtransactions", 2, "skip"},
    {"listtransactions", 3, "include_watchonly"},
    {"listaccounts", 0, "minconf"},
    {"listaccounts", 1, "include_watchonly"},
    {"walletpassphrase", 1, "timeout"},
    {"getblocktemplate", 0, "template_request"},
    {"listsinceblock", 1, "target_confirmations"},
    {"listsinceblock", 2, "include_watchonly"},
    {"sendmany", 1, "amounts"},
    {"sendmany", 2, "minconf"},
    {"sendmany", 4, "subtractfeefrom"},
    {"addmultisigaddress", 0, "nrequired"},
    {"addmultisigaddress", 1, "keys"},
    {"createmultisig", 0, "nrequired"},
    {"createmultisig", 1, "keys"},
    {"listunspent", 0, "minconf"},
    {"listunspent", 1, "maxconf"},
    {"listunspent", 2, "addresses"},
    {"getblock", 1, "verbose"},
    {"getblockheader", 1, "verbose"},
    {"getchaintxstats", 0, "nblocks"},
    {"gettransaction", 1, "include_watchonly"},
    {"getrawtransaction", 1, "verbose"},
    {"createrawtransaction", 0, "inputs"},
    {"createrawtransaction", 1, "outputs"},
    {"createrawtransaction", 2, "locktime"},
    {"signrawtransaction", 1, "prevtxs"},
    {"signrawtransaction", 2, "privkeys"},
    {"sendrawtransaction", 1, "allowhighfees"},
    {"fundrawtransaction", 1, "options"},
    {"gettxout", 1, "n"},
    {"gettxout", 2, "include_mempool"},
    {"gettxoutproof", 0, "txids"},
    {"lockunspent", 0, "unlock"},
    {"lockunspent", 1, "transactions"},
    {"importprivkey", 2, "rescan"},
    {"importaddress", 2, "rescan"},
    {"importaddress", 3, "p2sh"},
    {"importpubkey", 2, "rescan"},
    {"importmulti", 0, "requests"},
    {"importmulti", 1, "options"},
    {"verifychain", 0, "checklevel"},
    {"verifychain", 1, "nblocks"},
    {"pruneblockchain", 0, "height"},
    {"keypoolrefill", 0, "newsize"},
    {"getrawmempool", 0, "verbose"},
    {"estimatefee", 0, "nblocks"},
    {"prioritisetransaction", 1, "priority_delta"},
    {"prioritisetransaction", 2, "fee_delta"},
    {"setban", 2, "bantime"},
    {"setban", 3, "absolute"},
    {"setnetworkactive", 0, "state"},
    {"getmempoolancestors", 1, "verbose"},
    {"getmempooldescendants", 1, "verbose"},
    {"disconnectnode", 1, "nodeid"},
    // Echo with conversion (For testing only)
    {"echojson", 0, "arg0"},
    {"echojson", 1, "arg1"},
    {"echojson", 2, "arg2"},
    {"echojson", 3, "arg3"},
    {"echojson", 4, "arg4"},
    {"echojson", 5, "arg5"},
    {"echojson", 6, "arg6"},
    {"echojson", 7, "arg7"},
    {"echojson", 8, "arg8"},
    {"echojson", 9, "arg9"},

	/* Omni Core - data retrieval calls */
    { "omni_gettradehistoryforaddress", 1, "" },
    { "omni_gettradehistoryforaddress", 2, ""},
    { "omni_gettradehistoryforpair", 0, "" },
    { "omni_gettradehistoryforpair", 1, "" },
    { "omni_gettradehistoryforpair", 2, "" },
    { "omni_setautocommit", 0, "" },
    { "omni_getcrowdsale", 0, "" },
    { "omni_getcrowdsale", 1, "" },
    { "omni_getgrants", 0, "" },
    { "omni_getbalance", 1, "" },
    { "omni_getproperty", 0, "" },
    { "omni_listtransactions", 1, "" },
    { "omni_listtransactions", 2, "" },
    { "omni_listtransactions", 3, "" },
    { "omni_listtransactions", 4, "" },
    { "omni_getallbalancesforid", 0, "" },
    { "omni_listblocktransactions", 0, "" },
    { "omni_getorderbook", 0, "" },
    { "omni_getorderbook", 1, "" },
    { "omni_getseedblocks", 0, "" },
    { "omni_getseedblocks", 1, "" },
    { "omni_getmetadexhash", 0, "" },
    { "omni_getfeecache", 0, "" },
    { "omni_getfeeshare", 1, "" },
    { "omni_getfeetrigger", 0, "" },
    { "omni_getfeedistribution", 0, "" },
    { "omni_getfeedistributions", 0, "" },
    { "omni_getbalanceshash", 0, "" },

    /* Omni Core - transaction calls */
    { "omni_send", 2, "" },
    { "omni_sendsto", 1, "" },
    { "omni_sendsto", 4, "" },
    { "omni_sendall", 2, "" },
    { "omni_sendtrade", 1, "" },
    { "omni_sendtrade", 3, "" },
    { "omni_sendcanceltradesbyprice", 1, "" },
    { "omni_sendcanceltradesbyprice", 3, "" },
    { "omni_sendcanceltradesbypair", 1, "" },
    { "omni_sendcanceltradesbypair", 2, "" },
    { "omni_sendcancelalltrades", 1, ""},
    { "omni_sendissuancefixed", 1, "" },
    { "omni_sendissuancefixed", 2, "" },
    { "omni_sendissuancefixed", 3, "" },
    { "omni_sendissuancemanaged", 1, "" },
    { "omni_sendissuancemanaged", 2, "" },
    { "omni_sendissuancemanaged", 3, "" },
    { "omni_sendissuancecrowdsale", 1, "" },
    { "omni_sendissuancecrowdsale", 2, "" },
    { "omni_sendissuancecrowdsale", 3, "" },
    { "omni_sendissuancecrowdsale", 9, "" },
    { "omni_sendissuancecrowdsale", 11, "" },
    { "omni_sendissuancecrowdsale", 12, "" },
    { "omni_sendissuancecrowdsale", 13, "" },
    { "omni_senddexsell", 1, "" },
    { "omni_senddexsell", 4, "" },
    { "omni_senddexsell", 6, "" },
    { "omni_senddexaccept", 2, "" },
    { "omni_senddexaccept", 4, "" },
    { "omni_sendclosecrowdsale", 1, "" },
    { "omni_sendgrant", 2, "" },
    { "omni_sendrevoke", 1, "" },
    { "omni_sendchangeissuer", 2, "" },
    { "omni_sendenablefreezing", 1, "" },
    { "omni_senddisablefreezing", 1, "" },
    { "omni_sendfreeze", 2, "" },
    { "omni_sendunfreeze", 2, "" },
    { "omni_senddeactivation", 1, "" },
    { "omni_sendactivation", 1, "" },
    { "omni_sendactivation", 2, "" },
    { "omni_sendactivation", 3, "" },
    { "omni_sendalert", 1 , ""},
    { "omni_sendalert", 2 , ""},

    /* Omni Core - raw transaction calls */
    { "omni_decodetransaction", 1, "" },
    { "omni_decodetransaction", 2, "" },
    { "omni_createrawtx_reference", 2, "" },
    { "omni_createrawtx_input", 2, "" },
    { "omni_createrawtx_change", 1, "" },
    { "omni_createrawtx_change", 3, "" },
    { "omni_createrawtx_change", 4, "" },

    /* Omni Core - payload creation */
    { "omni_createpayload_simplesend", 0, "" },
    { "omni_createpayload_sendall", 0, "" },
    { "omni_createpayload_dexsell", 0, "" },
    { "omni_createpayload_dexsell", 3, "" },
    { "omni_createpayload_dexsell", 5, "" },
    { "omni_createpayload_dexaccept", 0, "" },
    { "omni_createpayload_sto", 0, "" },
    { "omni_createpayload_sto", 2, "" },
    { "omni_createpayload_issuancefixed", 0, "" },
    { "omni_createpayload_issuancefixed", 1, "" },
    { "omni_createpayload_issuancefixed", 2, "" },
    { "omni_createpayload_issuancemanaged", 0, "" },
    { "omni_createpayload_issuancemanaged", 1, "" },
    { "omni_createpayload_issuancemanaged", 2, "" },
    { "omni_createpayload_issuancecrowdsale", 0, "" },
    { "omni_createpayload_issuancecrowdsale", 1, "" },
    { "omni_createpayload_issuancecrowdsale", 2, "" },
    { "omni_createpayload_issuancecrowdsale", 8, "" },
    { "omni_createpayload_issuancecrowdsale", 10, "" },
    { "omni_createpayload_issuancecrowdsale", 11, "" },
    { "omni_createpayload_issuancecrowdsale", 12, "" },
    { "omni_createpayload_closecrowdsale", 0, "" },
    { "omni_createpayload_grant", 0, "" },
    { "omni_createpayload_revoke", 0, "" },
    { "omni_createpayload_changeissuer", 0, "" },
    { "omni_createpayload_trade", 0, "" },
    { "omni_createpayload_trade", 2, "" },
    { "omni_createpayload_canceltradesbyprice", 0, "" },
    { "omni_createpayload_canceltradesbyprice", 2, "" },
    { "omni_createpayload_canceltradesbypair", 0, "" },
    { "omni_createpayload_canceltradesbypair", 1, "" },
    { "omni_createpayload_cancelalltrades", 0, ""},

    /* Omni Core - backwards compatibility */
    { "getcrowdsale_MP", 0, "" },
    { "getcrowdsale_MP", 1, "" },
    { "getgrants_MP", 0, "" },
    { "send_MP", 2, "" },
    { "getbalance_MP", 1, "" },
    { "sendtoowners_MP", 1, "" },
    { "getproperty_MP", 0, "" },
    { "listtransactions_MP", 1, "" },
    { "listtransactions_MP", 2, "" },
    { "listtransactions_MP", 3, "" },
    { "listtransactions_MP", 4, "" },
    { "getallbalancesforid_MP", 0, "" },
    { "listblocktransactions_MP", 0, "" },
    { "getorderbook_MP", 0, "" },
    { "getorderbook_MP", 1, "" },
    { "trade_MP", 1, "" }, // depreciated
    { "trade_MP", 3, "" }, // depreciated
    { "trade_MP", 5, "" }, // depreciated

};

class CRPCConvertTable {
private:
    std::set<std::pair<std::string, int>> members;
    std::set<std::pair<std::string, std::string>> membersByName;

public:
    CRPCConvertTable();

    bool convert(const std::string &method, int idx) {
        return (members.count(std::make_pair(method, idx)) > 0);
    }
    bool convert(const std::string &method, const std::string &name) {
        return (membersByName.count(std::make_pair(method, name)) > 0);
    }
};

CRPCConvertTable::CRPCConvertTable() {
    const unsigned int n_elem =
        (sizeof(vRPCConvertParams) / sizeof(vRPCConvertParams[0]));

    for (unsigned int i = 0; i < n_elem; i++) {
        members.insert(std::make_pair(vRPCConvertParams[i].methodName,
                                      vRPCConvertParams[i].paramIdx));
        membersByName.insert(std::make_pair(vRPCConvertParams[i].methodName,
                                            vRPCConvertParams[i].paramName));
    }
}

static CRPCConvertTable rpcCvtTable;

/**
 * Non-RFC4627 JSON parser, accepts internal values (such as numbers, true,
 * false, null) as well as objects and arrays.
 */
UniValue ParseNonRFCJSONValue(const std::string &strVal) {
    UniValue jVal;
    if (!jVal.read(std::string("[") + strVal + std::string("]")) ||
        !jVal.isArray() || jVal.size() != 1)
        throw std::runtime_error(std::string("Error parsing JSON:") + strVal);
    return jVal[0];
}

UniValue RPCConvertValues(const std::string &strMethod,
                          const std::vector<std::string> &strParams) {
    UniValue params(UniValue::VARR);

    for (unsigned int idx = 0; idx < strParams.size(); idx++) {
        const std::string &strVal = strParams[idx];

        if (!rpcCvtTable.convert(strMethod, idx)) {
            // insert string value directly
            params.push_back(strVal);
        } else {
            // parse string as JSON, insert bool/number/object/etc. value
            params.push_back(ParseNonRFCJSONValue(strVal));
        }
    }

    return params;
}

UniValue RPCConvertNamedValues(const std::string &strMethod,
                               const std::vector<std::string> &strParams) {
    UniValue params(UniValue::VOBJ);

    for (const std::string &s : strParams) {
        size_t pos = s.find("=");
        if (pos == std::string::npos) {
            throw(std::runtime_error("No '=' in named argument '" + s +
                                     "', this needs to be present for every "
                                     "argument (even if it is empty)"));
        }

        std::string name = s.substr(0, pos);
        std::string value = s.substr(pos + 1);

        if (!rpcCvtTable.convert(strMethod, name)) {
            // insert string value directly
            params.pushKV(name, value);
        } else {
            // parse string as JSON, insert bool/number/object/etc. value
            params.pushKV(name, ParseNonRFCJSONValue(value));
        }
    }

    return params;
}
