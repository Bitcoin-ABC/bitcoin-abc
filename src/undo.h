// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UNDO_H
#define BITCOIN_UNDO_H

#include <coins.h>
#include <compressor.h>
#include <consensus/consensus.h>
#include <disconnectresult.h>
#include <serialize.h>

class CBlock;
class CBlockIndex;
class CCoinsViewCache;
class BlockValidationState;

/**
 * Formatter for undo information for a CTxIn
 *
 * Contains the prevout's CTxOut being spent, and its metadata as well (coinbase
 * or not, height). The serialization contains a dummy value of zero. This is
 * compatible with older versions which expect to see the transaction version
 * there.
 */
struct TxInUndoFormatter {
    template <typename Stream> void Ser(Stream &s, const Coin &txout) {
        ::Serialize(
            s, VARINT(txout.GetHeight() * 2 + (txout.IsCoinBase() ? 1 : 0)));
        if (txout.GetHeight() > 0) {
            // Required to maintain compatibility with older undo format.
            ::Serialize(s, uint8_t(0));
        }
        ::Serialize(s, Using<TxOutCompression>(txout.GetTxOut()));
    }

    template <typename Stream> void Unser(Stream &s, Coin &txout) {
        uint32_t nCode = 0;
        ::Unserialize(s, VARINT(nCode));
        uint32_t nHeight = nCode / 2;
        bool fCoinBase = nCode & 1;
        if (nHeight > 0) {
            // Old versions stored the version number for the last spend of a
            // transaction's outputs. Non-final spends were indicated with
            // height = 0.
            unsigned int nVersionDummy = 0;
            ::Unserialize(s, VARINT(nVersionDummy));
        }

        CTxOut out;
        ::Unserialize(s, Using<TxOutCompression>(out));

        txout = Coin(std::move(out), nHeight, fCoinBase);
    }
};

/** Restore the UTXO in a Coin at a given COutPoint */
class CTxUndo {
public:
    // Undo information for all txins
    std::vector<Coin> vprevout;

    SERIALIZE_METHODS(CTxUndo, obj) {
        READWRITE(Using<VectorFormatter<TxInUndoFormatter>>(obj.vprevout));
    }
};

/** Undo information for a CBlock */
class CBlockUndo {
public:
    // For all but the coinbase
    std::vector<CTxUndo> vtxundo;

    SERIALIZE_METHODS(CBlockUndo, obj) { READWRITE(obj.vtxundo); }
};

/**
 * Restore the UTXO in a Coin at a given COutPoint.
 * @param undo The Coin to be restored.
 * @param view The coins view to which to apply the changes.
 * @param out The out point that corresponds to the tx input.
 * @return A DisconnectResult
 */
DisconnectResult UndoCoinSpend(Coin &&undo, CCoinsViewCache &view,
                               const COutPoint &out);

/**
 * Undo a block from the block and the undoblock data.
 * See DisconnectBlock for more details.
 */
DisconnectResult ApplyBlockUndo(CBlockUndo &&blockUndo, const CBlock &block,
                                const CBlockIndex *pindex,
                                CCoinsViewCache &coins);

#endif // BITCOIN_UNDO_H
