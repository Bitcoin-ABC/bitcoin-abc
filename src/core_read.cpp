// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "core_io.h"

#include "primitives/block.h"
#include "primitives/transaction.h"
#include "script/script.h"
#include "serialize.h"
#include "streams.h"
#include "util.h"
#include "utilstrencodings.h"
#include "version.h"

#include <univalue.h>

#include <boost/algorithm/string/classification.hpp>
#include <boost/algorithm/string/predicate.hpp>
#include <boost/algorithm/string/replace.hpp>
#include <boost/algorithm/string/split.hpp>

CScript ParseScript(const std::string &s) {
    CScript result;

    static std::map<std::string, opcodetype> mapOpNames;

    if (mapOpNames.empty()) {
        for (int op = 0; op < FIRST_UNDEFINED_OP_VALUE; op++) {
            if (op < OP_PUSHDATA1) {
                continue;
            }

            const char *name = GetOpName((opcodetype)op);
            if (strcmp(name, "OP_UNKNOWN") == 0) {
                continue;
            }

            std::string strName(name);
            mapOpNames[strName] = (opcodetype)op;
            // Convenience: OP_ADD and just ADD are both recognized:
            boost::algorithm::replace_first(strName, "OP_", "");
            mapOpNames[strName] = (opcodetype)op;
        }
    }

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
        if (all(w, boost::algorithm::is_digit()) ||
            (boost::algorithm::starts_with(w, "-") &&
             all(std::string(w.begin() + 1, w.end()),
                 boost::algorithm::is_digit()))) {
            // Number
            int64_t n = atoi64(w);
            result << n;
            goto next;
        }

        // Hex Data
        if (boost::algorithm::starts_with(w, "0x") &&
            (w.begin() + 2 != w.end())) {
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

        if (w.size() >= 2 && boost::algorithm::starts_with(w, "'") &&
            boost::algorithm::ends_with(w, "'")) {
            // Single-quoted string, pushed as data. NOTE: this is poor-man's
            // parsing, spaces/tabs/newlines in single-quoted strings won't
            // work.
            std::vector<uint8_t> value(w.begin() + 1, w.end() - 1);
            result << value;
            goto next;
        }

        if (mapOpNames.count(w)) {
            // opcode, e.g. OP_ADD or ADD:
            opcodetype op = mapOpNames[w];

            result << op;
            goto next;
        }

        throw std::runtime_error("Error parsing script: " + s);

    next:
        size_t size_change = result.size() - script_size;

        // If push_size is set, ensure have added the right amount of stuff.
        if (push_size != 0 && size_change != push_size) {
            throw std::runtime_error(
                "Wrong number of bytes being pushed. Expected:" +
                std::to_string(push_size) +
                " Pushed:" + std::to_string(size_change));
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
        if (!ssData.empty()) {
            return false;
        }
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

uint256 ParseHashUV(const UniValue &v, const std::string &strName) {
    std::string strHex;
    if (v.isStr()) {
        strHex = v.getValStr();
    }

    // Note: ParseHashStr("") throws a runtime_error
    return ParseHashStr(strHex, strName);
}

uint256 ParseHashStr(const std::string &strHex, const std::string &strName) {
    if (!IsHex(strHex)) {
        // Note: IsHex("") is false
        throw std::runtime_error(
            strName + " must be hexadecimal string (not '" + strHex + "')");
    }

    uint256 result;
    result.SetHex(strHex);
    return result;
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
