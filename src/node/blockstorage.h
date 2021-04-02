// Copyright (c) 2011-2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_BLOCKSTORAGE_H
#define BITCOIN_NODE_BLOCKSTORAGE_H

#include <vector>

#include <fs.h>

class ArgsManager;
class ChainstateManager;
class Config;

static constexpr bool DEFAULT_STOPAFTERBLOCKIMPORT{false};

void ThreadImport(const Config &config, ChainstateManager &chainman,
                  std::vector<fs::path> vImportFiles, const ArgsManager &args);

#endif // BITCOIN_NODE_BLOCKSTORAGE_H
