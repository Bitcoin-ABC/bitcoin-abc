// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <coins.h>
#include <config.h>
#include <index/txindex.h>
#include <merkleblock.h>
#include <node/blockstorage.h>
#include <primitives/transaction.h>
#include <rpc/server.h>
#include <rpc/server_util.h>
#include <rpc/util.h>
#include <univalue.h>
#include <util/strencodings.h>
#include <validation.h>

using node::GetTransaction;

static RPCHelpMan gettxoutproof() {
    return RPCHelpMan{
        "gettxoutproof",
        "Returns a hex-encoded proof that \"txid\" was included in a block.\n"
        "\nNOTE: By default this function only works sometimes. "
        "This is when there is an\n"
        "unspent output in the utxo for this transaction. To make it always "
        "work,\n"
        "you need to maintain a transaction index, using the -txindex command "
        "line option or\n"
        "specify the block in which the transaction is included manually (by "
        "blockhash).\n",
        {
            {
                "txids",
                RPCArg::Type::ARR,
                RPCArg::Optional::NO,
                "The txids to filter",
                {
                    {"txid", RPCArg::Type::STR_HEX, RPCArg::Optional::OMITTED,
                     "A transaction hash"},
                },
            },
            {"blockhash", RPCArg::Type::STR_HEX,
             RPCArg::Optional::OMITTED_NAMED_ARG,
             "If specified, looks for txid in the block with this hash"},
        },
        RPCResult{
            RPCResult::Type::STR, "data",
            "A string that is a serialized, hex-encoded data for the proof."},
        RPCExamples{""},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            std::set<TxId> setTxIds;
            TxId oneTxId;
            UniValue txids = request.params[0].get_array();
            for (unsigned int idx = 0; idx < txids.size(); idx++) {
                const UniValue &utxid = txids[idx];
                TxId txid(ParseHashV(utxid, "txid"));
                if (setTxIds.count(txid)) {
                    throw JSONRPCError(
                        RPC_INVALID_PARAMETER,
                        std::string("Invalid parameter, duplicated txid: ") +
                            utxid.get_str());
                }

                setTxIds.insert(txid);
                oneTxId = txid;
            }

            const CBlockIndex *pblockindex = nullptr;

            BlockHash hashBlock;
            ChainstateManager &chainman = EnsureAnyChainman(request.context);
            if (!request.params[1].isNull()) {
                LOCK(cs_main);
                hashBlock =
                    BlockHash(ParseHashV(request.params[1], "blockhash"));
                pblockindex = chainman.m_blockman.LookupBlockIndex(hashBlock);
                if (!pblockindex) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Block not found");
                }
            } else {
                LOCK(cs_main);
                Chainstate &active_chainstate = chainman.ActiveChainstate();
                // Loop through txids and try to find which block they're in.
                // Exit loop once a block is found.
                for (const auto &txid : setTxIds) {
                    const Coin &coin =
                        AccessByTxid(active_chainstate.CoinsTip(), txid);
                    if (!coin.IsSpent()) {
                        pblockindex =
                            active_chainstate.m_chain[coin.GetHeight()];
                        break;
                    }
                }
            }

            // Allow txindex to catch up if we need to query it and before we
            // acquire cs_main.
            if (g_txindex && !pblockindex) {
                g_txindex->BlockUntilSyncedToCurrentChain();
            }

            if (pblockindex == nullptr) {
                const CTransactionRef tx = GetTransaction(
                    /* block_index */ nullptr,
                    /* mempool */ nullptr, oneTxId, hashBlock,
                    chainman.m_blockman);
                if (!tx || hashBlock.IsNull()) {
                    throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                       "Transaction not yet in block");
                }

                LOCK(cs_main);
                pblockindex = chainman.m_blockman.LookupBlockIndex(hashBlock);
                if (!pblockindex) {
                    throw JSONRPCError(RPC_INTERNAL_ERROR,
                                       "Transaction index corrupt");
                }
            }

            CBlock block;
            if (!chainman.m_blockman.ReadBlockFromDisk(block, *pblockindex)) {
                throw JSONRPCError(RPC_INTERNAL_ERROR,
                                   "Can't read block from disk");
            }

            unsigned int ntxFound = 0;
            for (const auto &tx : block.vtx) {
                if (setTxIds.count(tx->GetId())) {
                    ntxFound++;
                }
            }

            if (ntxFound != setTxIds.size()) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Not all transactions found in specified or "
                                   "retrieved block");
            }

            CDataStream ssMB(SER_NETWORK, PROTOCOL_VERSION);
            CMerkleBlock mb(block, setTxIds);
            ssMB << mb;
            std::string strHex = HexStr(ssMB);
            return strHex;
        },
    };
}

static RPCHelpMan verifytxoutproof() {
    return RPCHelpMan{
        "verifytxoutproof",
        "Verifies that a proof points to a transaction in a block, returning "
        "the transaction it commits to\n"
        "and throwing an RPC error if the block is not in our best chain\n",
        {
            {"proof", RPCArg::Type::STR_HEX, RPCArg::Optional::NO,
             "The hex-encoded proof generated by gettxoutproof"},
        },
        RPCResult{RPCResult::Type::ARR,
                  "",
                  "",
                  {
                      {RPCResult::Type::STR_HEX, "txid",
                       "The txid(s) which the proof commits to, or empty array "
                       "if the proof can not be validated."},
                  }},
        RPCExamples{""},
        [&](const RPCHelpMan &self, const Config &config,
            const JSONRPCRequest &request) -> UniValue {
            CDataStream ssMB(ParseHexV(request.params[0], "proof"), SER_NETWORK,
                             PROTOCOL_VERSION);
            CMerkleBlock merkleBlock;
            ssMB >> merkleBlock;

            UniValue res(UniValue::VARR);

            std::vector<uint256> vMatch;
            std::vector<size_t> vIndex;
            if (merkleBlock.txn.ExtractMatches(vMatch, vIndex) !=
                merkleBlock.header.hashMerkleRoot) {
                return res;
            }

            ChainstateManager &chainman = EnsureAnyChainman(request.context);
            LOCK(cs_main);

            const CBlockIndex *pindex = chainman.m_blockman.LookupBlockIndex(
                merkleBlock.header.GetHash());
            if (!pindex || !chainman.ActiveChain().Contains(pindex) ||
                pindex->nTx == 0) {
                throw JSONRPCError(RPC_INVALID_ADDRESS_OR_KEY,
                                   "Block not found in chain");
            }

            // Check if proof is valid, only add results if so
            if (pindex->nTx == merkleBlock.txn.GetNumTransactions()) {
                for (const uint256 &hash : vMatch) {
                    res.push_back(hash.GetHex());
                }
            }

            return res;
        },
    };
}

void RegisterTxoutProofRPCCommands(CRPCTable &t) {
    static const CRPCCommand commands[]{
        // category     actor (function)
        // --------     ----------------
        {"blockchain", gettxoutproof},
        {"blockchain", verifytxoutproof},
    };
    for (const auto &c : commands) {
        t.appendCommand(c.name, &c);
    }
}
