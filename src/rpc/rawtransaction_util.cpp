// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rpc/rawtransaction_util.h>

#include <coins.h>
#include <core_io.h>
#include <key_io.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <rpc/request.h>
#include <rpc/util.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <tinyformat.h>
#include <univalue.h>
#include <util/strencodings.h>

CMutableTransaction ConstructTransaction(const CChainParams &params,
                                         const UniValue &inputs_in,
                                         const UniValue &outputs_in,
                                         const UniValue &locktime) {
    if (inputs_in.isNull() || outputs_in.isNull()) {
        throw JSONRPCError(
            RPC_INVALID_PARAMETER,
            "Invalid parameter, arguments 1 and 2 must be non-null");
    }

    UniValue inputs = inputs_in.get_array();
    const bool outputs_is_obj = outputs_in.isObject();
    UniValue outputs =
        outputs_is_obj ? outputs_in.get_obj() : outputs_in.get_array();

    CMutableTransaction rawTx;

    if (!locktime.isNull()) {
        int64_t nLockTime = locktime.get_int64();
        if (nLockTime < 0 || nLockTime > std::numeric_limits<uint32_t>::max()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, locktime out of range");
        }

        rawTx.nLockTime = nLockTime;
    }

    for (size_t idx = 0; idx < inputs.size(); idx++) {
        const UniValue &input = inputs[idx];
        const UniValue &o = input.get_obj();

        TxId txid(ParseHashO(o, "txid"));

        const UniValue &vout_v = find_value(o, "vout");
        if (vout_v.isNull()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, missing vout key");
        }

        if (!vout_v.isNum()) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, vout must be a number");
        }

        int nOutput = vout_v.get_int();
        if (nOutput < 0) {
            throw JSONRPCError(RPC_INVALID_PARAMETER,
                               "Invalid parameter, vout must be positive");
        }

        uint32_t nSequence =
            (rawTx.nLockTime ? std::numeric_limits<uint32_t>::max() - 1
                             : std::numeric_limits<uint32_t>::max());

        // Set the sequence number if passed in the parameters object.
        const UniValue &sequenceObj = find_value(o, "sequence");
        if (sequenceObj.isNum()) {
            int64_t seqNr64 = sequenceObj.get_int64();
            if (seqNr64 < 0 || seqNr64 > std::numeric_limits<uint32_t>::max()) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    "Invalid parameter, sequence number is out of range");
            }

            nSequence = uint32_t(seqNr64);
        }

        CTxIn in(COutPoint(txid, nOutput), CScript(), nSequence);
        rawTx.vin.push_back(in);
    }

    if (!outputs_is_obj) {
        // Translate array of key-value pairs into dict
        UniValue outputs_dict = UniValue(UniValue::VOBJ);
        for (size_t i = 0; i < outputs.size(); ++i) {
            const UniValue &output = outputs[i];
            if (!output.isObject()) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid parameter, key-value pair not an "
                                   "object as expected");
            }
            if (output.size() != 1) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid parameter, key-value pair must "
                                   "contain exactly one key");
            }
            outputs_dict.pushKVs(output);
        }
        outputs = std::move(outputs_dict);
    }

    // Duplicate checking
    std::set<CTxDestination> destinations;
    bool has_data{false};

    for (const std::string &name_ : outputs.getKeys()) {
        if (name_ == "data") {
            if (has_data) {
                throw JSONRPCError(RPC_INVALID_PARAMETER,
                                   "Invalid parameter, duplicate key: data");
            }
            has_data = true;
            std::vector<uint8_t> data =
                ParseHexV(outputs[name_].getValStr(), "Data");

            CTxOut out(Amount::zero(), CScript() << OP_RETURN << data);
            rawTx.vout.push_back(out);
        } else {
            CTxDestination destination = DecodeDestination(name_, params);
            if (!IsValidDestination(destination)) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   std::string("Invalid Bitcoin address: ") +
                                       name_);
            }

            if (!destinations.insert(destination).second) {
                throw JSONRPCError(
                    RPC_INVALID_PARAMETER,
                    std::string("Invalid parameter, duplicated address: ") +
                        name_);
            }

            CScript scriptPubKey = GetScriptForDestination(destination);
            Amount nAmount = AmountFromValue(outputs[name_]);

            CTxOut out(nAmount, scriptPubKey);
            rawTx.vout.push_back(out);
        }
    }

    return rawTx;
}

/**
 * Pushes a JSON object for script verification or signing errors to vErrorsRet.
 */
static void TxInErrorToJSON(const CTxIn &txin, UniValue &vErrorsRet,
                            const std::string &strMessage) {
    UniValue entry(UniValue::VOBJ);
    entry.pushKV("txid", txin.prevout.GetTxId().ToString());
    entry.pushKV("vout", uint64_t(txin.prevout.GetN()));
    entry.pushKV("scriptSig", HexStr(txin.scriptSig));
    entry.pushKV("sequence", uint64_t(txin.nSequence));
    entry.pushKV("error", strMessage);
    vErrorsRet.push_back(entry);
}

void ParsePrevouts(const UniValue &prevTxsUnival,
                   FillableSigningProvider *keystore,
                   std::map<COutPoint, Coin> &coins) {
    if (!prevTxsUnival.isNull()) {
        UniValue prevTxs = prevTxsUnival.get_array();
        for (size_t idx = 0; idx < prevTxs.size(); ++idx) {
            const UniValue &p = prevTxs[idx];
            if (!p.isObject()) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "expected object with "
                                   "{\"txid'\",\"vout\",\"scriptPubKey\"}");
            }

            UniValue prevOut = p.get_obj();

            RPCTypeCheckObj(prevOut,
                            {
                                {"txid", UniValueType(UniValue::VSTR)},
                                {"vout", UniValueType(UniValue::VNUM)},
                                {"scriptPubKey", UniValueType(UniValue::VSTR)},
                                // "amount" is also required but check is done
                                // below due to UniValue::VNUM erroneously
                                // not accepting quoted numerics
                                // (which are valid JSON)
                            });

            TxId txid(ParseHashO(prevOut, "txid"));

            int nOut = find_value(prevOut, "vout").get_int();
            if (nOut < 0) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR,
                                   "vout must be positive");
            }

            COutPoint out(txid, nOut);
            std::vector<uint8_t> pkData(ParseHexO(prevOut, "scriptPubKey"));
            CScript scriptPubKey(pkData.begin(), pkData.end());

            {
                auto coin = coins.find(out);
                if (coin != coins.end() && !coin->second.IsSpent() &&
                    coin->second.GetTxOut().scriptPubKey != scriptPubKey) {
                    std::string err("Previous output scriptPubKey mismatch:\n");
                    err = err +
                          ScriptToAsmStr(coin->second.GetTxOut().scriptPubKey) +
                          "\nvs:\n" + ScriptToAsmStr(scriptPubKey);
                    throw JSONRPCError(RPC_DESERIALIZATION_ERROR, err);
                }

                CTxOut txout;
                txout.scriptPubKey = scriptPubKey;
                txout.nValue = MAX_MONEY;
                if (prevOut.exists("amount")) {
                    txout.nValue =
                        AmountFromValue(find_value(prevOut, "amount"));
                } else {
                    // amount param is required in replay-protected txs.
                    // Note that we must check for its presence here rather
                    // than use RPCTypeCheckObj() above, since UniValue::VNUM
                    // parser incorrectly parses numerics with quotes, eg
                    // "3.12" as a string when JSON allows it to also parse
                    // as numeric. And we have to accept numerics with quotes
                    // because our own dogfood (our rpc results) always
                    // produces decimal numbers that are quoted
                    // eg getbalance returns "3.14152" rather than 3.14152
                    throw JSONRPCError(RPC_INVALID_PARAMETER, "Missing amount");
                }
                coins[out] = Coin(txout, 1, false);
            }

            // If redeemScript and private keys were given, add redeemScript to
            // the keystore so it can be signed
            if (keystore && scriptPubKey.IsPayToScriptHash()) {
                RPCTypeCheckObj(
                    prevOut, {
                                 {"redeemScript", UniValueType(UniValue::VSTR)},
                             });
                UniValue v = find_value(prevOut, "redeemScript");
                if (!v.isNull()) {
                    std::vector<uint8_t> rsData(ParseHexV(v, "redeemScript"));
                    CScript redeemScript(rsData.begin(), rsData.end());
                    keystore->AddCScript(redeemScript);
                }
            }
        }
    }
}

void SignTransaction(CMutableTransaction &mtx, const SigningProvider *keystore,
                     const std::map<COutPoint, Coin> &coins,
                     const UniValue &hashType, UniValue &result) {
    SigHashType sigHashType = ParseSighashString(hashType);
    if (!sigHashType.hasForkId()) {
        throw JSONRPCError(RPC_INVALID_PARAMETER,
                           "Signature must use SIGHASH_FORKID");
    }

    // Script verification errors
    std::map<int, std::string> input_errors;

    bool complete =
        SignTransaction(mtx, keystore, coins, sigHashType, input_errors);
    SignTransactionResultToJSON(mtx, complete, coins, input_errors, result);
}

void SignTransactionResultToJSON(CMutableTransaction &mtx, bool complete,
                                 const std::map<COutPoint, Coin> &coins,
                                 std::map<int, std::string> &input_errors,
                                 UniValue &result) {
    // Make errors UniValue
    UniValue vErrors(UniValue::VARR);
    for (const auto &err_pair : input_errors) {
        if (err_pair.second == "Missing amount") {
            // This particular error needs to be an exception for some reason
            throw JSONRPCError(
                RPC_TYPE_ERROR,
                strprintf("Missing amount for %s",
                          coins.at(mtx.vin.at(err_pair.first).prevout)
                              .GetTxOut()
                              .ToString()));
        }
        TxInErrorToJSON(mtx.vin.at(err_pair.first), vErrors, err_pair.second);
    }

    result.pushKV("hex", EncodeHexTx(CTransaction(mtx)));
    result.pushKV("complete", complete);
    if (!vErrors.empty()) {
        if (result.exists("errors")) {
            vErrors.push_backV(result["errors"].getValues());
        }
        result.pushKV("errors", vErrors);
    }
}
