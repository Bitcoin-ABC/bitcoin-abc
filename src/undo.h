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
#include <serialize.h>
#include <version.h>

class CBlock;
class CBlockIndex;
class CCoinsViewCache;
class CValidationState;

/**
 * Undo information for a CTxIn
 *
 * Contains the prevout's CTxOut being spent, and its metadata as well (coinbase
 * or not, height). The serialization contains a dummy value of zero. This is
 * compatible with older versions which expect to see the transaction version
 * there.
 */
class TxInUndoSerializer {
    const Coin *pcoin;

public:
    explicit TxInUndoSerializer(const Coin *pcoinIn) : pcoin(pcoinIn) {}

    template <typename Stream> void Serialize(Stream &s) const {
        ::Serialize(
            s, VARINT(pcoin->GetHeight() * 2 + (pcoin->IsCoinBase() ? 1 : 0)));
        if (pcoin->GetHeight() > 0) {
            // Required to maintain compatibility with older undo format.
            ::Serialize(s, uint8_t(0));
        }
        ::Serialize(s, CTxOutCompressor(REF(pcoin->GetTxOut())));
    }
};

class TxInUndoDeserializer {
    Coin *pcoin;

public:
    explicit TxInUndoDeserializer(Coin *pcoinIn) : pcoin(pcoinIn) {}

    template <typename Stream> void Unserialize(Stream &s) {
        uint32_t nCode = 0;
        ::Unserialize(s, VARINT(nCode));
        uint32_t nHeight = nCode / 2;
        bool fCoinBase = nCode & 1;
        if (nHeight > 0) {
            // Old versions stored the version number for the last spend of a
            // transaction's outputs. Non-final spends were indicated with
            // height = 0.
            unsigned int nVersionDummy;
            ::Unserialize(s, VARINT(nVersionDummy));
        }

        CTxOut txout;
        ::Unserialize(s, CTxOutCompressor(REF(txout)));

        *pcoin = Coin(std::move(txout), nHeight, fCoinBase);
    }
};

static const size_t MAX_INPUTS_PER_TX =
    MAX_TX_SIZE / ::GetSerializeSize(CTxIn(), PROTOCOL_VERSION);

/** Restore the UTXO in a Coin at a given COutPoint */
class CTxUndo {
public:
    // Undo information for all txins
    std::vector<Coin> vprevout;

    template <typename Stream> void Serialize(Stream &s) const {
        // TODO: avoid reimplementing vector serializer.
        uint64_t count = vprevout.size();
        ::Serialize(s, COMPACTSIZE(REF(count)));
        for (const auto &prevout : vprevout) {
            ::Serialize(s, TxInUndoSerializer(&prevout));
        }
    }

    template <typename Stream> void Unserialize(Stream &s) {
        // TODO: avoid reimplementing vector deserializer.
        uint64_t count = 0;
        ::Unserialize(s, COMPACTSIZE(count));
        if (count > MAX_INPUTS_PER_TX) {
            throw std::ios_base::failure("Too many input undo records");
        }
        vprevout.resize(count);
        for (auto &prevout : vprevout) {
            ::Unserialize(s, TxInUndoDeserializer(&prevout));
        }
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
 * Restore the UTXO in a Coin at a given COutPoint.
 * @param undo The Coin to be restored.
 * @param view The coins view to which to apply the changes.
 * @param out The out point that corresponds to the tx input.
 * @return A DisconnectResult
 */
DisconnectResult UndoCoinSpend(const Coin &undo, CCoinsViewCache &view,
                               const COutPoint &out);

/**
 * Undo a block from the block and the undoblock data.
 * See DisconnectBlock for more details.
 */
DisconnectResult ApplyBlockUndo(const CBlockUndo &blockUndo,
                                const CBlock &block, const CBlockIndex *pindex,
                                CCoinsViewCache &coins);

#endif // BITCOIN_UNDO_H
