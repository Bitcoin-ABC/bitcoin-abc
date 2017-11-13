// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "primitives/transaction.h"

#include "hash.h"
#include "tinyformat.h"
#include "utilstrencodings.h"

std::string COutPoint::ToString() const {
    return strprintf("COutPoint(%s, %u)", hash.ToString().substr(0, 10), n);
}

CTxIn::CTxIn(COutPoint prevoutIn, CScript scriptSigIn, uint32_t nSequenceIn) {
    prevout = prevoutIn;
    scriptSig = scriptSigIn;
    nSequence = nSequenceIn;
}

CTxIn::CTxIn(uint256 hashPrevTx, uint32_t nOut, CScript scriptSigIn,
             uint32_t nSequenceIn) {
    prevout = COutPoint(hashPrevTx, nOut);
    scriptSig = scriptSigIn;
    nSequence = nSequenceIn;
}

std::string CTxIn::ToString() const {
    std::string str;
    str += "CTxIn(";
    str += prevout.ToString();
    if (prevout.IsNull())
        str += strprintf(", coinbase %s", HexStr(scriptSig));
    else
        str += strprintf(", scriptSig=%s", HexStr(scriptSig).substr(0, 24));
    if (nSequence != SEQUENCE_FINAL)
        str += strprintf(", nSequence=%u", nSequence);
    str += ")";
    return str;
}

CTxOut::CTxOut(const Amount &nValueIn, CScript scriptPubKeyIn) {
    nValue = nValueIn;
    scriptPubKey = scriptPubKeyIn;
}

std::string CTxOut::ToString() const {
    return strprintf("CTxOut(nValue=%d.%08d, scriptPubKey=%s)",
                     nValue.GetSatoshis() / COIN.GetSatoshis(),
                     nValue.GetSatoshis() % COIN.GetSatoshis(),
                     HexStr(scriptPubKey).substr(0, 30));
}

CMutableTransaction::CMutableTransaction()
    : nVersion(CTransaction::CURRENT_VERSION), nLockTime(0) {}
CMutableTransaction::CMutableTransaction(const CTransaction &tx)
    : nVersion(tx.nVersion), vin(tx.vin), vout(tx.vout),
      nLockTime(tx.nLockTime) {}

uint256 CMutableTransaction::GetId() const {
    return SerializeHash(*this, SER_GETHASH, 0);
}

uint256 CTransaction::ComputeHash() const {
    return SerializeHash(*this, SER_GETHASH, 0);
}

uint256 CTransaction::GetHash() const {
    return GetId();
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
    Amount nValueOut = 0;
    for (std::vector<CTxOut>::const_iterator it(vout.begin()); it != vout.end();
         ++it) {
        nValueOut += it->nValue;
        if (!MoneyRange(it->nValue) || !MoneyRange(nValueOut))
            throw std::runtime_error(std::string(__func__) +
                                     ": value out of range");
    }
    return nValueOut;
}

double CTransaction::ComputePriority(double dPriorityInputs,
                                     unsigned int nTxSize) const {
    nTxSize = CalculateModifiedSize(nTxSize);
    if (nTxSize == 0) return 0.0;

    return dPriorityInputs / nTxSize;
}

unsigned int CTransaction::CalculateModifiedSize(unsigned int nTxSize) const {
    // In order to avoid disincentivizing cleaning up the UTXO set we don't
    // count the constant overhead for each txin and up to 110 bytes of
    // scriptSig (which is enough to cover a compressed pubkey p2sh redemption)
    // for priority. Providing any more cleanup incentive than making additional
    // inputs free would risk encouraging people to create junk outputs to
    // redeem later.
    if (nTxSize == 0) nTxSize = GetTransactionSize(*this);
    for (std::vector<CTxIn>::const_iterator it(vin.begin()); it != vin.end();
         ++it) {
        unsigned int offset =
            41U + std::min(110U, (unsigned int)it->scriptSig.size());
        if (nTxSize > offset) nTxSize -= offset;
    }
    return nTxSize;
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
    for (unsigned int i = 0; i < vin.size(); i++)
        str += "    " + vin[i].ToString() + "\n";
    for (unsigned int i = 0; i < vout.size(); i++)
        str += "    " + vout[i].ToString() + "\n";
    return str;
}

int64_t GetTransactionSize(const CTransaction &tx) {
    return ::GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION);
}
