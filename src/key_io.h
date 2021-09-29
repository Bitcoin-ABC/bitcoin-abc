// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2015 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_KEY_IO_H
#define BITCOIN_KEY_IO_H

#include <key.h>
#include <pubkey.h>
#include <script/standard.h>

#include <string>

class Config;
class CChainParams;

CKey DecodeSecret(const std::string &str);
CKey DecodeSecret(const std::string &str, const CChainParams &params);
std::string EncodeSecret(const CKey &key);
std::string EncodeSecret(const CKey &key, const CChainParams &params);

CExtKey DecodeExtKey(const std::string &str);
std::string EncodeExtKey(const CExtKey &extkey);
CExtPubKey DecodeExtPubKey(const std::string &str);
std::string EncodeExtPubKey(const CExtPubKey &extpubkey);

std::string EncodeDestination(const CTxDestination &dest, const Config &config);
CTxDestination DecodeDestination(const std::string &addr, const CChainParams &);
bool IsValidDestinationString(const std::string &str,
                              const CChainParams &params);

std::string EncodeLegacyAddr(const CTxDestination &dest,
                             const CChainParams &params);
CTxDestination DecodeLegacyAddr(const std::string &str,
                                const CChainParams &params);

#endif // BITCOIN_KEY_IO_H
