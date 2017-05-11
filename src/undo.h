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

/** Undo information for a CTxIn
 *
 *  Contains the prevout's CTxOut being spent, and if this was the
 *  last output of the affected transaction, its metadata as well
 *  (coinbase or not, height, transaction version)
 */
class CTxInUndo {
public:
    // The txout data before being spent
    CTxOut txout;
    // If the outpoint was the last unspent: whether it belonged to a coinbase
    bool fCoinBase;
    // If the outpoint was the last unspent: its height
    unsigned int nHeight;
    // If the outpoint was the last unspent: its version
    int nVersion;

    CTxInUndo() : txout(), fCoinBase(false), nHeight(0), nVersion(0) {}
    CTxInUndo(const CTxOut &txoutIn, bool fCoinBaseIn = false,
              unsigned int nHeightIn = 0, int nVersionIn = 0)
        : txout(txoutIn), fCoinBase(fCoinBaseIn), nHeight(nHeightIn),
          nVersion(nVersionIn) {}

    template <typename Stream> void Serialize(Stream &s) const {
        ::Serialize(s, VARINT(nHeight * 2 + (fCoinBase ? 1 : 0)));
        if (nHeight > 0) ::Serialize(s, VARINT(this->nVersion));
        ::Serialize(s, CTxOutCompressor(REF(txout)));
    }

    template <typename Stream> void Unserialize(Stream &s) {
        unsigned int nCode = 0;
        ::Unserialize(s, VARINT(nCode));
        nHeight = nCode / 2;
        fCoinBase = nCode & 1;
        if (nHeight > 0) ::Unserialize(s, VARINT(this->nVersion));
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

/** Apply the undo operation of a CTxInUndo to the given chain state. */
bool ApplyTxInUndo(const CTxInUndo &undo, CCoinsViewCache &view,
                   const COutPoint &out);

/** Undo a block from the block and the undoblock data.
 * See DisconnectBlock for more details. */
bool ApplyBlockUndo(const CBlock &block, CValidationState &state,
                    const CBlockIndex *pindex, CCoinsViewCache &coins,
                    const CBlockUndo &blockUndo, bool *pfClean = nullptr);

#endif // BITCOIN_UNDO_H
