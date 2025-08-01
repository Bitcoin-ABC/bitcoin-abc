// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <core_io.h>

#include <common/system.h>
#include <config.h>
#include <consensus/amount.h>
#include <key_io.h>
#include <primitives/blockhash.h>
#include <primitives/transaction.h>
#include <script/script.h>
#include <script/sigencoding.h>
#include <script/standard.h>
#include <serialize.h>
#include <streams.h>
#include <undo.h>
#include <util/check.h>
#include <util/strencodings.h>

#include <univalue.h>

std::string FormatScript(const CScript &script) {
    std::string ret;
    CScript::const_iterator it = script.begin();
    opcodetype op;
    while (it != script.end()) {
        CScript::const_iterator it2 = it;
        std::vector<uint8_t> vch;
        if (script.GetOp(it, op, vch)) {
            if (op == OP_0) {
                ret += "0 ";
                continue;
            }

            if ((op >= OP_1 && op <= OP_16) || op == OP_1NEGATE) {
                ret += strprintf("%i ", op - OP_1NEGATE - 1);
                continue;
            }

            if (op >= OP_NOP && op < FIRST_UNDEFINED_OP_VALUE) {
                std::string str(GetOpName(op));
                if (str.substr(0, 3) == std::string("OP_")) {
                    ret += str.substr(3, std::string::npos) + " ";
                    continue;
                }
            }

            if (vch.size() > 0) {
                ret += strprintf(
                    "0x%x 0x%x ",
                    HexStr(std::vector<uint8_t>(it2, it - vch.size())),
                    HexStr(std::vector<uint8_t>(it - vch.size(), it)));
            } else {
                ret +=
                    strprintf("0x%x ", HexStr(std::vector<uint8_t>(it2, it)));
            }

            continue;
        }

        ret +=
            strprintf("0x%x ", HexStr(std::vector<uint8_t>(it2, script.end())));
        break;
    }

    return ret.substr(0, ret.size() - 1);
}

const std::map<uint8_t, std::string> mapSigHashTypes = {
    {SIGHASH_ALL, "ALL"},
    {SIGHASH_ALL | SIGHASH_ANYONECANPAY, "ALL|ANYONECANPAY"},
    {SIGHASH_ALL | SIGHASH_FORKID, "ALL|FORKID"},
    {SIGHASH_ALL | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
     "ALL|FORKID|ANYONECANPAY"},
    {SIGHASH_NONE, "NONE"},
    {SIGHASH_NONE | SIGHASH_ANYONECANPAY, "NONE|ANYONECANPAY"},
    {SIGHASH_NONE | SIGHASH_FORKID, "NONE|FORKID"},
    {SIGHASH_NONE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
     "NONE|FORKID|ANYONECANPAY"},
    {SIGHASH_SINGLE, "SINGLE"},
    {SIGHASH_SINGLE | SIGHASH_ANYONECANPAY, "SINGLE|ANYONECANPAY"},
    {SIGHASH_SINGLE | SIGHASH_FORKID, "SINGLE|FORKID"},
    {SIGHASH_SINGLE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY,
     "SINGLE|FORKID|ANYONECANPAY"},
};

std::string SighashToStr(uint8_t sighash_type) {
    const auto &it = mapSigHashTypes.find(sighash_type);
    if (it == mapSigHashTypes.end()) {
        return "";
    }
    return it->second;
}

/**
 * Create the assembly string representation of a CScript object.
 * @param[in] script    CScript object to convert into the asm string
 * representation.
 * @param[in] fAttemptSighashDecode    Whether to attempt to decode sighash
 * types on data within the script that matches the format of a signature. Only
 * pass true for scripts you believe could contain signatures. For example, pass
 * false, or omit the this argument (defaults to false), for scriptPubKeys.
 */
std::string ScriptToAsmStr(const CScript &script,
                           const bool fAttemptSighashDecode) {
    std::string str;
    opcodetype opcode;
    std::vector<uint8_t> vch;
    CScript::const_iterator pc = script.begin();
    while (pc < script.end()) {
        if (!str.empty()) {
            str += " ";
        }

        if (!script.GetOp(pc, opcode, vch)) {
            str += "[error]";
            return str;
        }

        if (0 <= opcode && opcode <= OP_PUSHDATA4) {
            if (vch.size() <= static_cast<std::vector<uint8_t>::size_type>(4)) {
                str += strprintf(
                    "%d",
                    CScriptNum(vch, false, MAX_SCRIPTNUM_BYTE_SIZE).getint());
            } else {
                // the IsUnspendable check makes sure not to try to decode
                // OP_RETURN data that may match the format of a signature
                if (fAttemptSighashDecode && !script.IsUnspendable()) {
                    std::string strSigHashDecode;
                    // goal: only attempt to decode a defined sighash type from
                    // data that looks like a signature within a scriptSig. This
                    // won't decode correctly formatted public keys in Pubkey or
                    // Multisig scripts due to the restrictions on the pubkey
                    // formats (see IsCompressedOrUncompressedPubKey) being
                    // incongruous with the checks in
                    // CheckTransactionSignatureEncoding.
                    uint32_t flags = SCRIPT_VERIFY_STRICTENC;
                    if (vch.back() & SIGHASH_FORKID) {
                        // If the transaction is using SIGHASH_FORKID, we need
                        // to set the appropriate flag.
                        // TODO: Remove after the Hard Fork.
                        flags |= SCRIPT_ENABLE_SIGHASH_FORKID;
                    }
                    if (CheckTransactionSignatureEncoding(vch, flags,
                                                          nullptr)) {
                        const uint8_t chSigHashType = vch.back();
                        const auto it = mapSigHashTypes.find(chSigHashType);
                        if (it != mapSigHashTypes.end()) {
                            strSigHashDecode = "[" + it->second + "]";
                            // remove the sighash type byte. it will be replaced
                            // by the decode.
                            vch.pop_back();
                        }
                    }

                    str += HexStr(vch) + strSigHashDecode;
                } else {
                    str += HexStr(vch);
                }
            }
        } else {
            str += GetOpName(opcode);
        }
    }

    return str;
}

std::string EncodeHexTx(const CTransaction &tx, const int serializeFlags) {
    CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION | serializeFlags);
    ssTx << tx;
    return HexStr(ssTx);
}

void ScriptToUniv(const CScript &script, UniValue &out, bool include_address) {
    out.pushKV("asm", ScriptToAsmStr(script));
    out.pushKV("hex", HexStr(script));

    std::vector<std::vector<uint8_t>> solns;
    TxoutType type = Solver(script, solns);
    out.pushKV("type", GetTxnOutputType(type));

    CTxDestination address;
    if (include_address && ExtractDestination(script, address) &&
        type != TxoutType::PUBKEY) {
        out.pushKV("address", EncodeDestination(address, GetConfig()));
    }
}

void ScriptPubKeyToUniv(const CScript &scriptPubKey, UniValue &out,
                        bool fIncludeHex) {
    TxoutType type;
    std::vector<CTxDestination> addresses;
    int nRequired;

    out.pushKV("asm", ScriptToAsmStr(scriptPubKey));
    if (fIncludeHex) {
        out.pushKV("hex", HexStr(scriptPubKey));
    }

    if (!ExtractDestinations(scriptPubKey, type, addresses, nRequired) ||
        type == TxoutType::PUBKEY) {
        out.pushKV("type", GetTxnOutputType(type));
        return;
    }

    out.pushKV("reqSigs", nRequired);
    out.pushKV("type", GetTxnOutputType(type));

    UniValue a(UniValue::VARR);
    for (const CTxDestination &addr : addresses) {
        a.push_back(EncodeDestination(addr, GetConfig()));
    }
    out.pushKV("addresses", a);
}

void TxToUniv(const CTransaction &tx, const BlockHash &hashBlock,
              UniValue &entry, bool include_hex, int serialize_flags,
              const CTxUndo *txundo) {
    entry.pushKV("txid", tx.GetId().GetHex());
    entry.pushKV("hash", tx.GetHash().GetHex());
    // Transaction version is actually unsigned in consensus checks, just
    // signed in memory, so cast to unsigned before giving it to the user.
    entry.pushKV("version",
                 static_cast<int64_t>(static_cast<uint32_t>(tx.nVersion)));
    entry.pushKV("size", (int)::GetSerializeSize(tx, PROTOCOL_VERSION));
    entry.pushKV("locktime", (int64_t)tx.nLockTime);

    UniValue vin{UniValue::VARR};

    // If available, use Undo data to calculate the fee. Note that
    // txundo == nullptr for coinbase transactions and for transactions where
    // undo data is unavailable.
    const bool calculate_fee = txundo != nullptr;
    Amount amt_total_in = Amount::zero();
    Amount amt_total_out = Amount::zero();

    for (unsigned int i = 0; i < tx.vin.size(); i++) {
        const CTxIn &txin = tx.vin[i];
        UniValue in(UniValue::VOBJ);
        if (tx.IsCoinBase()) {
            in.pushKV("coinbase", HexStr(txin.scriptSig));
        } else {
            in.pushKV("txid", txin.prevout.GetTxId().GetHex());
            in.pushKV("vout", int64_t(txin.prevout.GetN()));
            UniValue o(UniValue::VOBJ);
            o.pushKV("asm", ScriptToAsmStr(txin.scriptSig, true));
            o.pushKV("hex", HexStr(txin.scriptSig));
            in.pushKV("scriptSig", o);
        }
        if (calculate_fee) {
            const CTxOut &prev_txout = txundo->vprevout[i].GetTxOut();
            amt_total_in += prev_txout.nValue;
        }
        in.pushKV("sequence", (int64_t)txin.nSequence);
        vin.push_back(in);
    }

    entry.pushKV("vin", vin);

    UniValue vout(UniValue::VARR);
    for (unsigned int i = 0; i < tx.vout.size(); i++) {
        const CTxOut &txout = tx.vout[i];

        UniValue out(UniValue::VOBJ);

        out.pushKV("value", txout.nValue);
        out.pushKV("n", int64_t(i));

        UniValue o(UniValue::VOBJ);
        ScriptPubKeyToUniv(txout.scriptPubKey, o, true);
        out.pushKV("scriptPubKey", o);
        vout.push_back(out);

        if (calculate_fee) {
            amt_total_out += txout.nValue;
        }
    }

    entry.pushKV("vout", vout);

    if (calculate_fee) {
        const Amount fee = amt_total_in - amt_total_out;
        CHECK_NONFATAL(MoneyRange(fee));
        entry.pushKV("fee", fee);
    }

    if (!hashBlock.IsNull()) {
        entry.pushKV("blockhash", hashBlock.GetHex());
    }

    if (include_hex) {
        // The hex-encoded transaction. Used the name "hex" to be consistent
        // with the verbose output of "getrawtransaction".
        entry.pushKV("hex", EncodeHexTx(tx, serialize_flags));
    }
}
