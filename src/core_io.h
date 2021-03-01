// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CORE_IO_H
#define BITCOIN_CORE_IO_H

#include <script/sighashtype.h>

#include <string>
#include <vector>

struct Amount;
struct BlockHash;
class CBlock;
class CBlockHeader;
class CMutableTransaction;
class CScript;
class CTransaction;
class uint256;
class UniValue;
class CTxUndo;

/**
 * Verbose level for block's transaction
 */
enum class TxVerbosity {
    /// Only TXID for each block's transaction
    SHOW_TXID,
    /// Include TXID, inputs, outputs, and other common block's transaction
    /// information
    SHOW_DETAILS,
    /// The same as previous option with information about prevouts if available
    SHOW_DETAILS_AND_PREVOUT,
};

// core_read.cpp
CScript ParseScript(const std::string &s);
std::string ScriptToAsmStr(const CScript &script,
                           const bool fAttemptSighashDecode = false);
[[nodiscard]] bool DecodeHexTx(CMutableTransaction &tx,
                               const std::string &strHexTx);
[[nodiscard]] bool DecodeHexBlk(CBlock &, const std::string &strHexBlk);
bool DecodeHexBlockHeader(CBlockHeader &, const std::string &hex_header);

/**
 * Parse a hex string into 256 bits
 * @param[in] strHex a hex-formatted, 64-character string
 * @param[out] result the result of the parasing
 * @returns true if successful, false if not
 *
 * @see ParseHashV for an RPC-oriented version of this
 */
bool ParseHashStr(const std::string &strHex, uint256 &result);
std::vector<uint8_t> ParseHexUV(const UniValue &v, const std::string &strName);
SigHashType ParseSighashString(const UniValue &sighash);

// core_write.cpp
std::string FormatScript(const CScript &script);
std::string EncodeHexTx(const CTransaction &tx);
std::string SighashToStr(uint8_t sighash_type);
void ScriptPubKeyToUniv(const CScript &scriptPubKey, UniValue &out,
                        bool fIncludeHex);
void ScriptToUniv(const CScript &script, UniValue &out, bool include_address);
void TxToUniv(const CTransaction &tx, const BlockHash &hashBlock,
              UniValue &entry, bool include_hex = true,
              const CTxUndo *txundo = nullptr,
              TxVerbosity verbosity = TxVerbosity::SHOW_DETAILS);

#endif // BITCOIN_CORE_IO_H
