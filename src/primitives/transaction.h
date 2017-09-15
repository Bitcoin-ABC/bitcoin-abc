// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_PRIMITIVES_TRANSACTION_H
#define BITCOIN_PRIMITIVES_TRANSACTION_H

#include "amount.h"
#include "script/script.h"
#include "serialize.h"
#include "uint256.h"

#include "boost/serialization/strong_typedef.hpp"

static const int SERIALIZE_TRANSACTION = 0x00;

/** A utxid is either:
 * The txid of a v1 or v2 transaction or
 * The double sha256 of all transaction data *except the input scripts*
 *
 * It is used as reference to a transaction in an Outpoint. */
class utxid_t : public uint256 {
public:
    utxid_t() {}
    explicit utxid_t(const uint256 &b) : uint256(b) {}
};

/** A txid is the double sha256 hash of the full transaction data */
class txid_t : public uint256 {
public:
    txid_t() {}
    explicit txid_t(const uint256 &b) : uint256(b) {}
};


/** Temporary setting to track MalFix activation, as
 * it determines the calculation of the utxid */
typedef enum MalfixMode_t {
    MALFIX_MODE_INACTIVE,
    MALFIX_MODE_ACTIVE,

    /* We only need to care about activation during block validation
     * In other places, assume activation as v3 transaction are non-standard
     * anyway*/
    MALFIX_MODE_LEGACY=1
} MalFixMode;

/** An outpoint - a combination of a transaction hash and an index n into its
 * vout */
class COutPoint {
public:
    utxid_t utxid;
    uint32_t n;

    COutPoint() { SetNull(); }
    COutPoint(utxid_t utxidIn, uint32_t nIn) {
        utxid = utxidIn;
        n = nIn;
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(utxid);
        READWRITE(n);
    }

    void SetNull() {
        utxid.SetNull();
        n = (uint32_t)-1;
    }
    bool IsNull() const { return (utxid.IsNull() && n == (uint32_t)-1); }

    friend bool operator<(const COutPoint &a, const COutPoint &b) {
        int cmp = a.utxid.Compare(b.utxid);
        return cmp < 0 || (cmp == 0 && a.n < b.n);
    }

    friend bool operator==(const COutPoint &a, const COutPoint &b) {
        return (a.utxid == b.utxid && a.n == b.n);
    }

    friend bool operator!=(const COutPoint &a, const COutPoint &b) {
        return !(a == b);
    }

    std::string ToString() const;
};

/** An input of a transaction.  It contains the location of the previous
 * transaction's output that it claims and a signature that matches the
 * output's public key.
 */
class CTxIn {
public:
    COutPoint prevout;
    CScript scriptSig;
    uint32_t nSequence;

    /* Setting nSequence to this value for every input in a transaction
     * disables nLockTime. */
    static const uint32_t SEQUENCE_FINAL = 0xffffffff;

    /* Below flags apply in the context of BIP 68*/
    /* If this flag set, CTxIn::nSequence is NOT interpreted as a
     * relative lock-time. */
    static const uint32_t SEQUENCE_LOCKTIME_DISABLE_FLAG = (1 << 31);

    /* If CTxIn::nSequence encodes a relative lock-time and this flag
     * is set, the relative lock-time has units of 512 seconds,
     * otherwise it specifies blocks with a granularity of 1. */
    static const uint32_t SEQUENCE_LOCKTIME_TYPE_FLAG = (1 << 22);

    /* If CTxIn::nSequence encodes a relative lock-time, this mask is
     * applied to extract that lock-time from the sequence field. */
    static const uint32_t SEQUENCE_LOCKTIME_MASK = 0x0000ffff;

    /* In order to use the same number of bits to encode roughly the
     * same wall-clock duration, and because blocks are naturally
     * limited to occur every 600s on average, the minimum granularity
     * for time-based relative lock-time is fixed at 512 seconds.
     * Converting from CTxIn::nSequence to seconds is performed by
     * multiplying by 512 = 2^9, or equivalently shifting up by
     * 9 bits. */
    static const int SEQUENCE_LOCKTIME_GRANULARITY = 9;

    CTxIn() { nSequence = SEQUENCE_FINAL; }

    explicit CTxIn(COutPoint prevoutIn, CScript scriptSigIn = CScript(),
                   uint32_t nSequenceIn = SEQUENCE_FINAL);
    CTxIn(utxid_t utxid, uint32_t nOut, CScript scriptSigIn = CScript(),
          uint32_t nSequenceIn = SEQUENCE_FINAL);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(prevout);
        READWRITE(*(CScriptBase *)(&scriptSig));
        READWRITE(nSequence);
    }

    friend bool operator==(const CTxIn &a, const CTxIn &b) {
        return (a.prevout == b.prevout && a.scriptSig == b.scriptSig &&
                a.nSequence == b.nSequence);
    }

    friend bool operator!=(const CTxIn &a, const CTxIn &b) { return !(a == b); }

    std::string ToString() const;
};

/**
 * An output of a transaction.  It contains the public key that the next input
 * must be able to sign with to claim it.
 */
class CTxOut {
public:
    CAmount nValue;
    CScript scriptPubKey;

    CTxOut() { SetNull(); }

    CTxOut(const CAmount &nValueIn, CScript scriptPubKeyIn);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(nValue);
        READWRITE(*(CScriptBase *)(&scriptPubKey));
    }

    void SetNull() {
        nValue = -1;
        scriptPubKey.clear();
    }

    bool IsNull() const { return (nValue == -1); }

    CAmount GetDustThreshold(const CFeeRate &minRelayTxFee) const {
        // "Dust" is defined in terms of CTransaction::minRelayTxFee, which has
        // units satoshis-per-kilobyte. If you'd pay more than 1/3 in fees to
        // spend something, then we consider it dust. A typical spendable
        // non-segwit txout is 34 bytes big, and will need a CTxIn of at least
        // 148 bytes to spend: so dust is a spendable txout less than
        // 546*minRelayTxFee/1000 (in satoshis). A typical spendable segwit
        // txout is 31 bytes big, and will need a CTxIn of at least 67 bytes to
        // spend: so dust is a spendable txout less than 294*minRelayTxFee/1000
        // (in satoshis).
        if (scriptPubKey.IsUnspendable()) return 0;

        size_t nSize = GetSerializeSize(*this, SER_DISK, 0);

        // the 148 mentioned above
        nSize += (32 + 4 + 1 + 107 + 4);

        return 3 * minRelayTxFee.GetFee(nSize);
    }

    bool IsDust(const CFeeRate &minRelayTxFee) const {
        return (nValue < GetDustThreshold(minRelayTxFee));
    }

    friend bool operator==(const CTxOut &a, const CTxOut &b) {
        return (a.nValue == b.nValue && a.scriptPubKey == b.scriptPubKey);
    }

    friend bool operator!=(const CTxOut &a, const CTxOut &b) {
        return !(a == b);
    }

    std::string ToString() const;
};

struct CMutableTransaction;

/**
 * Basic transaction serialization format:
 * - int32_t nVersion
 * - std::vector<CTxIn> vin
 * - std::vector<CTxOut> vout
 * - uint32_t nLockTime
 */
template <typename Stream, typename TxType>
inline void UnserializeTransaction(TxType &tx, Stream &s) {
    s >> tx.nVersion;
    tx.vin.clear();
    tx.vout.clear();
    /* Try to read the vin. In case the dummy is there, this will be read as an
     * empty vector. */
    s >> tx.vin;
    /* We read a non-empty vin. Assume a normal vout follows. */
    s >> tx.vout;
    s >> tx.nLockTime;
}

template <typename Stream, typename TxType>
inline void SerializeTransaction(const TxType &tx, Stream &s) {
    s << tx.nVersion;
    s << tx.vin;
    s << tx.vout;
    s << tx.nLockTime;
}

/** The basic transaction that is broadcasted on the network and contained in
 * blocks.  A transaction can contain multiple inputs and outputs.
 */
class CTransaction {
public:
    // Default transaction version.
    static const int32_t CURRENT_VERSION = 2;

    // Changing the default transaction version requires a two step process:
    // first adapting relay policy by bumping MAX_STANDARD_VERSION, and then
    // later date bumping the default CURRENT_VERSION at which point both
    // CURRENT_VERSION and MAX_STANDARD_VERSION will be equal.
    static const int32_t MAX_STANDARD_VERSION = 2;

    // The local variables are made const to prevent unintended modification
    // without updating the cached hash value. However, CTransaction is not
    // actually immutable; deserialization and assignment are implemented,
    // and bypass the constness. This is safe, as they update the entire
    // structure, including the hash.
    const int32_t nVersion;
    const std::vector<CTxIn> vin;
    const std::vector<CTxOut> vout;
    const uint32_t nLockTime;

private:
    /** Memory only. */
    const txid_t hash;
    const uint256 immutableId;

    txid_t ComputeHash() const;
    uint256 ComputeImmutableId() const;

public:
    /** Construct a CTransaction that qualifies as IsNull() */
    CTransaction();

    /** Convert a CMutableTransaction into a CTransaction. */
    CTransaction(const CMutableTransaction &tx);
    CTransaction(CMutableTransaction &&tx);

    template <typename Stream> inline void Serialize(Stream &s) const {
        SerializeTransaction(*this, s);
    }

    /** This deserializing constructor is provided instead of an Unserialize
     * method. Unserialize is not possible, since it would require overwriting
     * const fields. */
    template <typename Stream>
    CTransaction(deserialize_type, Stream &s)
        : CTransaction(CMutableTransaction(deserialize, s)) {}

    bool IsNull() const { return vin.empty() && vout.empty(); }

    const txid_t &GetId() const { return hash; }

    /**
     * Returns the identifier of the transaction used by outpoints.
     * For v3 transactions, this is the immutableId
     **/
    const utxid_t GetUtxid(MalFixMode mode) const {
        if (mode == MALFIX_MODE_INACTIVE || nVersion <= 2) {
            return utxid_t(hash);
        }
        else {
            return utxid_t(immutableId);
        }
    }

    // Compute a hash that includes both transaction and witness data
    txid_t GetHash() const;

    // Return sum of txouts.
    CAmount GetValueOut() const;
    // GetValueIn() is a method on CCoinsViewCache, because
    // inputs must be known to compute value in.

    // Compute priority, given priority of inputs and (optionally) tx size
    double ComputePriority(double dPriorityInputs,
                           unsigned int nTxSize = 0) const;

    // Compute modified tx size for priority calculation (optionally given tx
    // size)
    unsigned int CalculateModifiedSize(unsigned int nTxSize = 0) const;

    /**
     * Get the total transaction size in bytes.
     * @return Total transaction size in bytes
     */
    unsigned int GetTotalSize() const;

    bool IsCoinBase() const {
        return (vin.size() == 1 && vin[0].prevout.IsNull());
    }

    friend bool operator==(const CTransaction &a, const CTransaction &b) {
        return a.hash == b.hash;
    }

    friend bool operator!=(const CTransaction &a, const CTransaction &b) {
        return a.hash != b.hash;
    }

    std::string ToString() const;
};

/** A mutable version of CTransaction. */
struct CMutableTransaction {
    int32_t nVersion;
    std::vector<CTxIn> vin;
    std::vector<CTxOut> vout;
    uint32_t nLockTime;

    CMutableTransaction();
    CMutableTransaction(const CTransaction &tx);

    template <typename Stream> inline void Serialize(Stream &s) const {
        SerializeTransaction(*this, s);
    }

    template <typename Stream> inline void Unserialize(Stream &s) {
        UnserializeTransaction(*this, s);
    }

    template <typename Stream>
    CMutableTransaction(deserialize_type, Stream &s) {
        Unserialize(s);
    }

    /** Compute the hash of this CMutableTransaction. This is computed on the
     * fly, as opposed to GetId() in CTransaction, which uses a cached result.
     */
    txid_t GetId() const;

    /** Compute the UTXID of this CMutableTransaction. This is computed on the
     * fly, as opposed to GetUtxid() in CTransaction, which uses a cached result.
     */
    utxid_t GetUtxid(MalFixMode mode) const;

    friend bool operator==(const CMutableTransaction &a,
                           const CMutableTransaction &b) {
        return a.GetId() == b.GetId();
    }
};

typedef std::shared_ptr<const CTransaction> CTransactionRef;
static inline CTransactionRef MakeTransactionRef() {
    return std::make_shared<const CTransaction>();
}
template <typename Tx>
static inline CTransactionRef MakeTransactionRef(Tx &&txIn) {
    return std::make_shared<const CTransaction>(std::forward<Tx>(txIn));
}

/** Compute the size of a transaction */
int64_t GetTransactionSize(const CTransaction &tx);

/** Precompute sighash midstate to avoid quadratic hashing */
struct PrecomputedTransactionData {
    uint256 hashPrevouts, hashSequence, hashOutputs;

    PrecomputedTransactionData()
        : hashPrevouts(), hashSequence(), hashOutputs() {}

    PrecomputedTransactionData(const PrecomputedTransactionData &txdata)
        : hashPrevouts(txdata.hashPrevouts), hashSequence(txdata.hashSequence),
          hashOutputs(txdata.hashOutputs) {}

    PrecomputedTransactionData(const CTransaction &tx);
};

#endif // BITCOIN_PRIMITIVES_TRANSACTION_H
