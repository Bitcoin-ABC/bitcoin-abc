// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <core_io.h>

#include <primitives/block.h>
#include <primitives/transaction.h>
#include <psbt.h>
#include <script/script.h>
#include <script/sign.h>
#include <serialize.h>
#include <streams.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <version.h>

#include <univalue.h>

#include <boost/algorithm/string/classification.hpp>
#include <boost/algorithm/string/split.hpp>

#include <algorithm>
#include <string>

namespace {

opcodetype ParseOpCode(const std::string &s) {
    static std::map<std::string, opcodetype> mapOpNames;

    if (mapOpNames.empty()) {
        for (int op = 0; op < FIRST_UNDEFINED_OP_VALUE; op++) {
            if (op < OP_PUSHDATA1) {
                continue;
            }

            std::string strName = GetOpName(static_cast<opcodetype>(op));
            if (strName == "OP_UNKNOWN") {
                continue;
            }

            mapOpNames[strName] = static_cast<opcodetype>(op);
            // Convenience: OP_ADD and just ADD are both recognized:
            // strName starts with "OP_"
            if (strName.compare(0, 3, "OP_") == 0) {
                mapOpNames[strName.substr(3)] = static_cast<opcodetype>(op);
            }
        }
    }

    auto it = mapOpNames.find(s);
    if (it == mapOpNames.end()) {
        throw std::runtime_error("script parse error: unknown opcode " + s);
    }
    return it->second;
}

} // namespace

CScript ParseScript(const std::string &s) {
    CScript result;

    std::vector<std::string> words;
    boost::algorithm::split(words, s, boost::algorithm::is_any_of(" \t\n"),
                            boost::algorithm::token_compress_on);

    size_t push_size = 0, next_push_size = 0;
    size_t script_size = 0;
    // Deal with PUSHDATA1 operation with some more hacks.
    size_t push_data_size = 0;

    for (const auto &w : words) {
        if (w.empty()) {
            // Empty string, ignore. (boost::split given '' will return one
            // word)
            continue;
        }

        // Update script size.
        script_size = result.size();

        // Make sure we keep track of the size of push operations.
        push_size = next_push_size;
        next_push_size = 0;

        // Decimal numbers
        if (std::all_of(w.begin(), w.end(), ::IsDigit) ||
            (w.front() == '-' && w.size() > 1 &&
             std::all_of(w.begin() + 1, w.end(), ::IsDigit))) {
            // Number
            const auto num{ToIntegral<int64_t>(w)};

            // Limit the range of numbers ParseScript accepts in decimal
            // since numbers outside -0x7FFFFFFFFFFFFFFF...0x7FFFFFFFFFFFFFFF
            // are illegal in scripts.
            // This means, only the int64_t -0x8000000000000000 is illegal.
            if (!num.has_value() ||
                num == std::numeric_limits<int64_t>::min()) {
                throw std::runtime_error(
                    "script parse error: decimal numeric value only allowed in "
                    "the range -0x7FFFFFFFFFFFFFFF...0x7FFFFFFFFFFFFFFF");
            }

            result << num.value();
            goto next;
        }

        // Hex Data
        if (w.substr(0, 2) == "0x" && w.size() > 2) {
            if (!IsHex(std::string(w.begin() + 2, w.end()))) {
                // Should only arrive here for improperly formatted hex values
                throw std::runtime_error("Hex numbers expected to be formatted "
                                         "in full-byte chunks (ex: 0x00 "
                                         "instead of 0x0)");
            }

            // Raw hex data, inserted NOT pushed onto stack:
            std::vector<uint8_t> raw =
                ParseHex(std::string(w.begin() + 2, w.end()));

            result.insert(result.end(), raw.begin(), raw.end());
            goto next;
        }

        if (w.size() >= 2 && w.front() == '\'' && w.back() == '\'') {
            // Single-quoted string, pushed as data. NOTE: this is poor-man's
            // parsing, spaces/tabs/newlines in single-quoted strings won't
            // work.
            std::vector<uint8_t> value(w.begin() + 1, w.end() - 1);
            result << value;
            goto next;
        }

        // opcode, e.g. OP_ADD or ADD:
        result << ParseOpCode(w);

    next:
        size_t size_change = result.size() - script_size;

        // If push_size is set, ensure have added the right amount of stuff.
        if (push_size != 0 && size_change != push_size) {
            throw std::runtime_error(
                "Wrong number of bytes being pushed. Expected:" +
                ToString(push_size) + " Pushed:" + ToString(size_change));
        }

        // If push_size is set, and we have push_data_size set, then we have a
        // PUSHDATAX opcode.  We need to read it's push size as a LE value for
        // the next iteration of this loop.
        if (push_size != 0 && push_data_size != 0) {
            auto offset = &result[script_size];

            // Push data size is not a CScriptNum (Because it is
            // 2's-complement instead of 1's complement).  We need to use
            // ReadLE(N) instead of converting to a CScriptNum.
            if (push_data_size == 1) {
                next_push_size = *offset;
            } else if (push_data_size == 2) {
                next_push_size = ReadLE16(offset);
            } else if (push_data_size == 4) {
                next_push_size = ReadLE32(offset);
            }

            push_data_size = 0;
        }

        // If push_size is unset, but size_change is 1, that means we have an
        // opcode in the form of `0x00` or <opcodename>.  We will check to see
        // if it is a push operation and set state accordingly
        if (push_size == 0 && size_change == 1) {
            opcodetype op = opcodetype(*result.rbegin());

            // If we have what looks like an immediate push, figure out its
            // size.
            if (op < OP_PUSHDATA1) {
                next_push_size = op;
                continue;
            }

            switch (op) {
                case OP_PUSHDATA1:
                    push_data_size = next_push_size = 1;
                    break;
                case OP_PUSHDATA2:
                    push_data_size = next_push_size = 2;
                    break;
                case OP_PUSHDATA4:
                    push_data_size = next_push_size = 4;
                    break;
                default:
                    break;
            }
        }
    }

    return result;
}

bool DecodeHexTx(CMutableTransaction &tx, const std::string &strHexTx) {
    if (!IsHex(strHexTx)) {
        return false;
    }

    std::vector<uint8_t> txData(ParseHex(strHexTx));

    CDataStream ssData(txData, SER_NETWORK, PROTOCOL_VERSION);
    try {
        ssData >> tx;
        if (ssData.eof()) {
            return true;
        }
    } catch (const std::exception &e) {
        // Fall through.
    }

    return false;
}

bool DecodeHexBlockHeader(CBlockHeader &header, const std::string &hex_header) {
    if (!IsHex(hex_header)) {
        return false;
    }

    const std::vector<uint8_t> header_data{ParseHex(hex_header)};
    CDataStream ser_header(header_data, SER_NETWORK, PROTOCOL_VERSION);
    try {
        ser_header >> header;
    } catch (const std::exception &) {
        return false;
    }
    return true;
}

bool DecodeHexBlk(CBlock &block, const std::string &strHexBlk) {
    if (!IsHex(strHexBlk)) {
        return false;
    }

    std::vector<uint8_t> blockData(ParseHex(strHexBlk));
    CDataStream ssBlock(blockData, SER_NETWORK, PROTOCOL_VERSION);
    try {
        ssBlock >> block;
    } catch (const std::exception &) {
        return false;
    }

    return true;
}

bool ParseHashStr(const std::string &strHex, uint256 &result) {
    if ((strHex.size() != 64) || !IsHex(strHex)) {
        return false;
    }

    result.SetHex(strHex);
    return true;
}

std::vector<uint8_t> ParseHexUV(const UniValue &v, const std::string &strName) {
    std::string strHex;
    if (v.isStr()) {
        strHex = v.getValStr();
    }

    if (!IsHex(strHex)) {
        throw std::runtime_error(
            strName + " must be hexadecimal string (not '" + strHex + "')");
    }

    return ParseHex(strHex);
}

SigHashType ParseSighashString(const UniValue &sighash) {
    SigHashType sigHashType = SigHashType().withForkId();
    if (!sighash.isNull()) {
        static std::map<std::string, int> map_sighash_values = {
            {"ALL", SIGHASH_ALL},
            {"ALL|ANYONECANPAY", SIGHASH_ALL | SIGHASH_ANYONECANPAY},
            {"ALL|FORKID", SIGHASH_ALL | SIGHASH_FORKID},
            {"ALL|FORKID|ANYONECANPAY",
             SIGHASH_ALL | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
            {"NONE", SIGHASH_NONE},
            {"NONE|ANYONECANPAY", SIGHASH_NONE | SIGHASH_ANYONECANPAY},
            {"NONE|FORKID", SIGHASH_NONE | SIGHASH_FORKID},
            {"NONE|FORKID|ANYONECANPAY",
             SIGHASH_NONE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
            {"SINGLE", SIGHASH_SINGLE},
            {"SINGLE|ANYONECANPAY", SIGHASH_SINGLE | SIGHASH_ANYONECANPAY},
            {"SINGLE|FORKID", SIGHASH_SINGLE | SIGHASH_FORKID},
            {"SINGLE|FORKID|ANYONECANPAY",
             SIGHASH_SINGLE | SIGHASH_FORKID | SIGHASH_ANYONECANPAY},
        };
        const std::string &strHashType = sighash.get_str();
        const auto &it = map_sighash_values.find(strHashType);
        if (it != map_sighash_values.end()) {
            sigHashType = SigHashType(it->second);
        } else {
            throw std::runtime_error(strHashType +
                                     " is not a valid sighash parameter.");
        }
    }
    return sigHashType;
}
