// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGN_H
#define BITCOIN_SCRIPT_SIGN_H

#include <script/interpreter.h>
#include <script/sighashtype.h>

class CKeyID;
class CKeyStore;
class CMutableTransaction;
class CScript;
class CTransaction;

/** Virtual base class for signature creators. */
class BaseSignatureCreator {
protected:
    const CKeyStore *keystore;

public:
    explicit BaseSignatureCreator(const CKeyStore *keystoreIn)
        : keystore(keystoreIn) {}
    const CKeyStore &KeyStore() const { return *keystore; };
    virtual ~BaseSignatureCreator() {}
    virtual const BaseSignatureChecker &Checker() const = 0;

    /** Create a singular (non-script) signature. */
    virtual bool CreateSig(std::vector<uint8_t> &vchSig, const CKeyID &keyid,
                           const CScript &scriptCode) const = 0;
};

/** A signature creator for transactions. */
class TransactionSignatureCreator : public BaseSignatureCreator {
    const CTransaction *txTo;
    unsigned int nIn;
    Amount amount;
    SigHashType sigHashType;
    const TransactionSignatureChecker checker;

public:
    TransactionSignatureCreator(const CKeyStore *keystoreIn,
                                const CTransaction *txToIn, unsigned int nInIn,
                                const Amount amountIn,
                                SigHashType sigHashTypeIn = SigHashType());
    const BaseSignatureChecker &Checker() const override { return checker; }
    bool CreateSig(std::vector<uint8_t> &vchSig, const CKeyID &keyid,
                   const CScript &scriptCode) const override;
};

class MutableTransactionSignatureCreator : public TransactionSignatureCreator {
    CTransaction tx;

public:
    MutableTransactionSignatureCreator(const CKeyStore *keystoreIn,
                                       const CMutableTransaction *txToIn,
                                       unsigned int nInIn,
                                       const Amount amountIn,
                                       SigHashType sigHashTypeIn)
        : TransactionSignatureCreator(keystoreIn, &tx, nInIn, amountIn,
                                      sigHashTypeIn),
          tx(*txToIn) {}
};

/** A signature creator that just produces 72-byte empty signatures. */
class DummySignatureCreator : public BaseSignatureCreator {
public:
    explicit DummySignatureCreator(const CKeyStore *keystoreIn)
        : BaseSignatureCreator(keystoreIn) {}
    const BaseSignatureChecker &Checker() const override;
    bool CreateSig(std::vector<uint8_t> &vchSig, const CKeyID &keyid,
                   const CScript &scriptCode) const override;
};

struct SignatureData {
    CScript scriptSig;

    SignatureData() {}
    explicit SignatureData(const CScript &script) : scriptSig(script) {}
};

/** Produce a script signature using a generic signature creator. */
bool ProduceSignature(const BaseSignatureCreator &creator,
                      const CScript &scriptPubKey, SignatureData &sigdata);

/** Produce a script signature for a transaction. */
bool SignSignature(const CKeyStore &keystore, const CScript &fromPubKey,
                   CMutableTransaction &txTo, unsigned int nIn,
                   const Amount amount, SigHashType sigHashType);
bool SignSignature(const CKeyStore &keystore, const CTransaction &txFrom,
                   CMutableTransaction &txTo, unsigned int nIn,
                   SigHashType sigHashType);

/** Combine two script signatures using a generic signature checker,
 * intelligently, possibly with OP_0 placeholders. */
SignatureData CombineSignatures(const CScript &scriptPubKey,
                                const BaseSignatureChecker &checker,
                                const SignatureData &scriptSig1,
                                const SignatureData &scriptSig2);

/** Extract signature data from a transaction, and insert it. */
SignatureData DataFromTransaction(const CMutableTransaction &tx,
                                  unsigned int nIn);
void UpdateTransaction(CMutableTransaction &tx, unsigned int nIn,
                       const SignatureData &data);

#endif // BITCOIN_SCRIPT_SIGN_H
