// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGN_H
#define BITCOIN_SCRIPT_SIGN_H

#include <script/interpreter.h>
#include <script/sighashtype.h>

class CKey;
class CKeyID;
class CMutableTransaction;
class CScript;
class CScriptID;
class CTransaction;

/** An interface to be implemented by keystores that support signing. */
class SigningProvider {
public:
    virtual ~SigningProvider() {}
    virtual bool GetCScript(const CScriptID &scriptid, CScript &script) const {
        return false;
    }
    virtual bool GetPubKey(const CKeyID &address, CPubKey &pubkey) const {
        return false;
    }
    virtual bool GetKey(const CKeyID &address, CKey &key) const {
        return false;
    }
};

extern const SigningProvider &DUMMY_SIGNING_PROVIDER;

/** Interface for signature creators. */
class BaseSignatureCreator {
public:
    virtual ~BaseSignatureCreator() {}
    virtual const BaseSignatureChecker &Checker() const = 0;

    /** Create a singular (non-script) signature. */
    virtual bool CreateSig(const SigningProvider &provider,
                           std::vector<uint8_t> &vchSig, const CKeyID &keyid,
                           const CScript &scriptCode) const = 0;
};

/** A signature creator for transactions. */
class MutableTransactionSignatureCreator : public BaseSignatureCreator {
    const CMutableTransaction *txTo;
    unsigned int nIn;
    Amount amount;
    SigHashType sigHashType;
    const MutableTransactionSignatureChecker checker;

public:
    MutableTransactionSignatureCreator(
        const CMutableTransaction *txToIn, unsigned int nInIn,
        const Amount &amountIn, SigHashType sigHashTypeIn = SigHashType());
    const BaseSignatureChecker &Checker() const override { return checker; }
    bool CreateSig(const SigningProvider &provider,
                   std::vector<uint8_t> &vchSig, const CKeyID &keyid,
                   const CScript &scriptCode) const override;
};

/** A signature creator that just produces 72-byte empty signatures. */
extern const BaseSignatureCreator &DUMMY_SIGNATURE_CREATOR;

typedef std::pair<CPubKey, std::vector<uint8_t>> SigPair;

// This struct contains information from a transaction input and also contains
// signatures for that input. The information contained here can be used to
// create a signature and is also filled by ProduceSignature in order to
// construct final scriptSigs.
struct SignatureData {
    /// Stores whether the scriptSig and scriptWitness are complete.
    bool complete = false;
    /// The scriptSig of an input. Contains complete signatures or the
    /// traditional partial signatures format.
    CScript scriptSig;
    /// The redeemScript (if any) for the input.
    CScript redeem_script;
    /// BIP 174 style partial signatures for the input. May contain all
    /// signatures necessary for producing a final scriptSig.
    std::map<CKeyID, SigPair> signatures;

    SignatureData() {}
    explicit SignatureData(const CScript &script) : scriptSig(script) {}
    void MergeSignatureData(SignatureData sigdata);
};

/** Produce a script signature using a generic signature creator. */
bool ProduceSignature(const SigningProvider &provider,
                      const BaseSignatureCreator &creator,
                      const CScript &scriptPubKey, SignatureData &sigdata);

/** Produce a script signature for a transaction. */
bool SignSignature(const SigningProvider &provider, const CScript &fromPubKey,
                   CMutableTransaction &txTo, unsigned int nIn,
                   const Amount amount, SigHashType sigHashType);
bool SignSignature(const SigningProvider &provider, const CTransaction &txFrom,
                   CMutableTransaction &txTo, unsigned int nIn,
                   SigHashType sigHashType);

/** Extract signature data from a transaction input, and insert it. */
SignatureData DataFromTransaction(const CMutableTransaction &tx,
                                  unsigned int nIn, const CTxOut &txout);
void UpdateInput(CTxIn &input, const SignatureData &data);

#endif // BITCOIN_SCRIPT_SIGN_H
