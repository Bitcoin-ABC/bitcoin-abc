// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "primitives/transaction.h"

#include "hash.h"
#include "tinyformat.h"
#include "utilstrencodings.h"

std::string COutPoint::ToString() const {
    return strprintf("COutPoint(%s, %u)", txid.ToString().substr(0, 10), n);
}

std::string CTxIn::ToString() const {
    std::string str;
    str += "CTxIn(";
    str += prevout.ToString();
    if (prevout.IsNull()) {
        str += strprintf(", coinbase %s", HexStr(scriptSig));
    } else {
        str += strprintf(", scriptSig=%s", HexStr(scriptSig).substr(0, 24));
    }
    if (nSequence != SEQUENCE_FINAL) {
        str += strprintf(", nSequence=%u", nSequence);
    }
    str += ")";
    return str;
}

std::string CTxOut::ToString() const {
    return strprintf("CTxOut(nValue=%d.%08d, scriptPubKey=%s)", nValue / COIN,
                     (nValue % COIN) / SATOSHI,
                     HexStr(scriptPubKey).substr(0, 30));
}

CMutableTransaction::CMutableTransaction()
    : nVersion(CTransaction::CURRENT_VERSION), nLockTime(0) {}
CMutableTransaction::CMutableTransaction(const CTransaction &tx)
    : nVersion(tx.nVersion), vin(tx.vin), vout(tx.vout),
      nLockTime(tx.nLockTime) {}

static uint256 ComputeCMutableTransactionHash(const CMutableTransaction &tx) {
    return SerializeHash(tx, SER_GETHASH, 0);
}

TxId CMutableTransaction::GetId() const {
    return TxId(ComputeCMutableTransactionHash(*this));
}

TxHash CMutableTransaction::GetHash() const {
    return TxHash(ComputeCMutableTransactionHash(*this));
}

uint256 CTransaction::ComputeHash() const {
    return SerializeHash(*this, SER_GETHASH, 0);
}

/**
 * For backward compatibility, the hash is initialized to 0.
 * TODO: remove the need for this default constructor entirely.
 */
CTransaction::CTransaction()
    : nVersion(CTransaction::CURRENT_VERSION), vin(), vout(), nLockTime(0),
      hash() {}
CTransaction::CTransaction(const CMutableTransaction &tx)
    : nVersion(tx.nVersion), vin(tx.vin), vout(tx.vout),
      nLockTime(tx.nLockTime), hash(ComputeHash()) {}
CTransaction::CTransaction(CMutableTransaction &&tx)
    : nVersion(tx.nVersion), vin(std::move(tx.vin)), vout(std::move(tx.vout)),
      nLockTime(tx.nLockTime), hash(ComputeHash()) {}

Amount CTransaction::GetValueOut() const {
    Amount nValueOut = Amount::zero();
    for (const auto &tx_out : vout) {
        nValueOut += tx_out.nValue;
        if (!MoneyRange(tx_out.nValue) || !MoneyRange(nValueOut)) {
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
        }
    }
    return nValueOut;
}

double CTransaction::ComputePriority(double dPriorityInputs,
                                     unsigned int nTxSize) const {
    nTxSize = CalculateModifiedSize(nTxSize);
    if (nTxSize == 0) {
        return 0.0;
    }

    return dPriorityInputs / nTxSize;
}

unsigned int CTransaction::CalculateModifiedSize(unsigned int nTxSize) const {
    // In order to avoid disincentivizing cleaning up the UTXO set we don't
    // count the constant overhead for each txin and up to 110 bytes of
    // scriptSig (which is enough to cover a compressed pubkey p2sh redemption)
    // for priority. Providing any more cleanup incentive than making additional
    // inputs free would risk encouraging people to create junk outputs to
    // redeem later.
    if (nTxSize == 0) {
        nTxSize = GetTotalSize();
    }
    for (const auto &nVin : vin) {
        unsigned int offset =
            41U + std::min(110U, (unsigned int)nVin.scriptSig.size());
        if (nTxSize > offset) {
            nTxSize -= offset;
        }
    }
    return nTxSize;
}

size_t CTransaction::GetBillableSize() const {
    return ::GetSerializeSize(*this, SER_NETWORK, PROTOCOL_VERSION);
}

unsigned int CTransaction::GetTotalSize() const {
    return ::GetSerializeSize(*this, SER_NETWORK, PROTOCOL_VERSION);
}

std::string CTransaction::ToString() const {
    std::string str;
    str += strprintf("CTransaction(txid=%s, ver=%d, vin.size=%u, vout.size=%u, "
                     "nLockTime=%u)\n",
                     GetId().ToString().substr(0, 10), nVersion, vin.size(),
                     vout.size(), nLockTime);
    for (const auto &nVin : vin) {
        str += "    " + nVin.ToString() + "\n";
    }
    for (const auto &nVout : vout) {
        str += "    " + nVout.ToString() + "\n";
    }
    return str;
}
