// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UNDO_H
#define BITCOIN_UNDO_H

#include "compressor.h"
#include "primitives/transaction.h"
#include "serialize.h"

class CBlock;
class CBlockIndex;
class CCoinsViewCache;
class CValidationState;

/**
 * Undo information for a CTxIn
 *
 * Contains the prevout's CTxOut being spent, and its metadata as well (coinbase
 * or not, height). Earlier versions also stored the transaction version.
 */
class CTxInUndo {
public:
    // The txout data before being spent
    CTxOut txout;
    // If the outpoint was the last unspent: whether it belonged to a coinbase
    bool fCoinBase;
    // If the outpoint was the last unspent: its height
    uint32_t nHeight;

    CTxInUndo() : txout(), fCoinBase(false), nHeight(0) {}
    CTxInUndo(const CTxOut &txoutIn, bool fCoinBaseIn = false,
              uint32_t nHeightIn = 0)
        : txout(txoutIn), fCoinBase(fCoinBaseIn), nHeight(nHeightIn) {}

    template <typename Stream> void Serialize(Stream &s) const {
        ::Serialize(s, VARINT(nHeight * 2 + (fCoinBase ? 1 : 0)));
        if (nHeight > 0) {
            int nVersionDummy = 0;
            ::Serialize(s, VARINT(nVersionDummy));
        }
        ::Serialize(s, CTxOutCompressor(REF(txout)));
    }

    template <typename Stream> void Unserialize(Stream &s) {
        uint32_t nCode = 0;
        ::Unserialize(s, VARINT(nCode));
        nHeight = nCode / 2;
        fCoinBase = nCode & 1;
        if (nHeight > 0) {
            int nVersionDummy;
            ::Unserialize(s, VARINT(nVersionDummy));
        }
        ::Unserialize(s, REF(CTxOutCompressor(REF(txout))));
    }
};

/** Undo information for a CTransaction */
class CTxUndo {
public:
    // Undo information for all txins
    std::vector<CTxInUndo> vprevout;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(vprevout);
    }
};

/** Undo information for a CBlock */
class CBlockUndo {
public:
    // For all but the coinbase
    std::vector<CTxUndo> vtxundo;

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(vtxundo);
    }
};

enum DisconnectResult {
    // All good.
    DISCONNECT_OK,
    // Rolled back, but UTXO set was inconsistent with block.
    DISCONNECT_UNCLEAN,
    // Something else went wrong.
    DISCONNECT_FAILED,
};

/**
 * Apply the undo operation of a CTxInUndo to the given chain state.
 * @param undo The undo object.
 * @param view The coins view to which to apply the changes.
 * @param out The out point that corresponds to the tx input.
 * @return A DisconnectResult
 */
DisconnectResult ApplyTxInUndo(const CTxInUndo &undo, CCoinsViewCache &view,
                               const COutPoint &out);

/**
 * Undo a block from the block and the undoblock data.
 * See DisconnectBlock for more details.
 */
DisconnectResult ApplyBlockUndo(const CBlockUndo &blockUndo,
                                const CBlock &block, const CBlockIndex *pindex,
                                CCoinsViewCache &coins);

#endif // BITCOIN_UNDO_H
