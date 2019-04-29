// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/sign.h>

#include <key.h>
#include <keystore.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <script/standard.h>
#include <uint256.h>

typedef std::vector<uint8_t> valtype;

TransactionSignatureCreator::TransactionSignatureCreator(
    const CKeyStore *keystoreIn, const CTransaction *txToIn, unsigned int nInIn,
    const Amount amountIn, SigHashType sigHashTypeIn)
    : BaseSignatureCreator(keystoreIn), txTo(txToIn), nIn(nInIn),
      amount(amountIn), sigHashType(sigHashTypeIn),
      checker(txTo, nIn, amountIn) {}

bool TransactionSignatureCreator::CreateSig(std::vector<uint8_t> &vchSig,
                                            const CKeyID &address,
                                            const CScript &scriptCode) const {
    CKey key;
    if (!keystore->GetKey(address, key)) {
        return false;
    }

    uint256 hash = SignatureHash(scriptCode, *txTo, nIn, sigHashType, amount);
    if (!key.SignECDSA(hash, vchSig)) {
        return false;
    }

    vchSig.push_back(uint8_t(sigHashType.getRawSigHashType()));
    return true;
}

static bool Sign1(const CKeyID &address, const BaseSignatureCreator &creator,
                  const CScript &scriptCode, std::vector<valtype> &ret) {
    std::vector<uint8_t> vchSig;
    if (!creator.CreateSig(vchSig, address, scriptCode)) {
        return false;
    }

    ret.push_back(vchSig);
    return true;
}

static bool SignN(const std::vector<valtype> &multisigdata,
                  const BaseSignatureCreator &creator,
                  const CScript &scriptCode, std::vector<valtype> &ret) {
    int nSigned = 0;
    int nRequired = multisigdata.front()[0];
    for (size_t i = 1; i < multisigdata.size() - 1 && nSigned < nRequired;
         i++) {
        const valtype &pubkey = multisigdata[i];
        CKeyID keyID = CPubKey(pubkey).GetID();
        if (Sign1(keyID, creator, scriptCode, ret)) {
            ++nSigned;
        }
    }

    return nSigned == nRequired;
}

/**
 * Sign scriptPubKey using signature made with creator.
 * Signatures are returned in scriptSigRet (or returns false if scriptPubKey
 * can't be signed), unless whichTypeRet is TX_SCRIPTHASH, in which case
 * scriptSigRet is the redemption script.
 * Returns false if scriptPubKey could not be completely satisfied.
 */
static bool SignStep(const BaseSignatureCreator &creator,
                     const CScript &scriptPubKey, std::vector<valtype> &ret,
                     txnouttype &whichTypeRet) {
    CScript scriptRet;
    uint160 h160;
    ret.clear();

    std::vector<valtype> vSolutions;
    if (!Solver(scriptPubKey, whichTypeRet, vSolutions)) {
        return false;
    }

    CKeyID keyID;
    switch (whichTypeRet) {
        case TX_NONSTANDARD:
        case TX_NULL_DATA:
            return false;
        case TX_PUBKEY:
            keyID = CPubKey(vSolutions[0]).GetID();
            return Sign1(keyID, creator, scriptPubKey, ret);
        case TX_PUBKEYHASH: {
            keyID = CKeyID(uint160(vSolutions[0]));
            if (!Sign1(keyID, creator, scriptPubKey, ret)) {
                return false;
            }

            CPubKey vch;
            creator.KeyStore().GetPubKey(keyID, vch);
            ret.push_back(ToByteVector(vch));
            return true;
        }
        case TX_SCRIPTHASH:
            if (creator.KeyStore().GetCScript(uint160(vSolutions[0]),
                                              scriptRet)) {
                ret.push_back(
                    std::vector<uint8_t>(scriptRet.begin(), scriptRet.end()));
                return true;
            }

            return false;

        case TX_MULTISIG:
            // workaround CHECKMULTISIG bug
            ret.push_back(valtype());
            return (SignN(vSolutions, creator, scriptPubKey, ret));

        default:
            return false;
    }
}

static CScript PushAll(const std::vector<valtype> &values) {
    CScript result;
    for (const valtype &v : values) {
        if (v.size() == 0) {
            result << OP_0;
        } else if (v.size() == 1 && v[0] >= 1 && v[0] <= 16) {
            result << CScript::EncodeOP_N(v[0]);
        } else {
            result << v;
        }
    }

    return result;
}

bool ProduceSignature(const BaseSignatureCreator &creator,
                      const CScript &fromPubKey, SignatureData &sigdata) {
    CScript script = fromPubKey;
    bool solved = true;
    std::vector<valtype> result;
    txnouttype whichType;
    solved = SignStep(creator, script, result, whichType);
    CScript subscript;

    if (solved && whichType == TX_SCRIPTHASH) {
        // Solver returns the subscript that needs to be evaluated; the final
        // scriptSig is the signatures from that and then the serialized
        // subscript:
        script = subscript = CScript(result[0].begin(), result[0].end());
        solved = solved && SignStep(creator, script, result, whichType) &&
                 whichType != TX_SCRIPTHASH;
        result.push_back(
            std::vector<uint8_t>(subscript.begin(), subscript.end()));
    }

    sigdata.scriptSig = PushAll(result);

    // Test solution
    return solved &&
           VerifyScript(sigdata.scriptSig, fromPubKey,
                        STANDARD_SCRIPT_VERIFY_FLAGS, creator.Checker());
}

SignatureData DataFromTransaction(const CMutableTransaction &tx,
                                  unsigned int nIn) {
    SignatureData data;
    assert(tx.vin.size() > nIn);
    data.scriptSig = tx.vin[nIn].scriptSig;
    return data;
}

void UpdateTransaction(CMutableTransaction &tx, unsigned int nIn,
                       const SignatureData &data) {
    assert(tx.vin.size() > nIn);
    tx.vin[nIn].scriptSig = data.scriptSig;
}

bool SignSignature(const CKeyStore &keystore, const CScript &fromPubKey,
                   CMutableTransaction &txTo, unsigned int nIn,
                   const Amount amount, SigHashType sigHashType) {
    assert(nIn < txTo.vin.size());

    CTransaction txToConst(txTo);
    TransactionSignatureCreator creator(&keystore, &txToConst, nIn, amount,
                                        sigHashType);

    SignatureData sigdata;
    bool ret = ProduceSignature(creator, fromPubKey, sigdata);
    UpdateTransaction(txTo, nIn, sigdata);
    return ret;
}

bool SignSignature(const CKeyStore &keystore, const CTransaction &txFrom,
                   CMutableTransaction &txTo, unsigned int nIn,
                   SigHashType sigHashType) {
    assert(nIn < txTo.vin.size());
    CTxIn &txin = txTo.vin[nIn];
    assert(txin.prevout.GetN() < txFrom.vout.size());
    const CTxOut &txout = txFrom.vout[txin.prevout.GetN()];

    return SignSignature(keystore, txout.scriptPubKey, txTo, nIn, txout.nValue,
                         sigHashType);
}

static std::vector<valtype> CombineMultisig(
    const CScript &scriptPubKey, const BaseSignatureChecker &checker,
    const std::vector<valtype> &vSolutions, const std::vector<valtype> &sigs1,
    const std::vector<valtype> &sigs2) {
    // Combine all the signatures we've got:
    std::set<valtype> allsigs;
    for (const valtype &v : sigs1) {
        if (!v.empty()) {
            allsigs.insert(v);
        }
    }

    for (const valtype &v : sigs2) {
        if (!v.empty()) {
            allsigs.insert(v);
        }
    }

    // Build a map of pubkey -> signature by matching sigs to pubkeys:
    assert(vSolutions.size() > 1);
    unsigned int nSigsRequired = vSolutions.front()[0];
    unsigned int nPubKeys = vSolutions.size() - 2;
    std::map<valtype, valtype> sigs;
    for (const valtype &sig : allsigs) {
        for (unsigned int i = 0; i < nPubKeys; i++) {
            const valtype &pubkey = vSolutions[i + 1];
            // Already got a sig for this pubkey
            if (sigs.count(pubkey)) {
                continue;
            }

            if (checker.CheckSig(sig, pubkey, scriptPubKey,
                                 STANDARD_SCRIPT_VERIFY_FLAGS)) {
                sigs[pubkey] = sig;
                break;
            }
        }
    }
    // Now build a merged CScript:
    unsigned int nSigsHave = 0;
    // pop-one-too-many workaround
    std::vector<valtype> result;
    result.push_back(valtype());
    for (unsigned int i = 0; i < nPubKeys && nSigsHave < nSigsRequired; i++) {
        if (sigs.count(vSolutions[i + 1])) {
            result.push_back(sigs[vSolutions[i + 1]]);
            ++nSigsHave;
        }
    }

    // Fill any missing with OP_0:
    for (unsigned int i = nSigsHave; i < nSigsRequired; i++) {
        result.push_back(valtype());
    }

    return result;
}

namespace {
struct Stacks {
    std::vector<valtype> script;

    Stacks() {}
    explicit Stacks(const std::vector<valtype> &scriptSigStack_)
        : script(scriptSigStack_) {}
    explicit Stacks(const SignatureData &data) {
        EvalScript(script, data.scriptSig, MANDATORY_SCRIPT_VERIFY_FLAGS,
                   BaseSignatureChecker());
    }

    SignatureData Output() const {
        SignatureData result;
        result.scriptSig = PushAll(script);
        return result;
    }
};
} // namespace

static Stacks CombineSignatures(const CScript &scriptPubKey,
                                const BaseSignatureChecker &checker,
                                const txnouttype txType,
                                const std::vector<valtype> &vSolutions,
                                Stacks sigs1, Stacks sigs2) {
    switch (txType) {
        case TX_NONSTANDARD:
        case TX_NULL_DATA:
            // Don't know anything about this, assume bigger one is correct:
            if (sigs1.script.size() >= sigs2.script.size()) {
                return sigs1;
            }

            return sigs2;
        case TX_PUBKEY:
        case TX_PUBKEYHASH:
            // Signatures are bigger than placeholders or empty scripts:
            if (sigs1.script.empty() || sigs1.script[0].empty()) {
                return sigs2;
            }

            return sigs1;
        case TX_SCRIPTHASH: {
            if (sigs1.script.empty() || sigs1.script.back().empty()) {
                return sigs2;
            }

            if (sigs2.script.empty() || sigs2.script.back().empty()) {
                return sigs1;
            }

            // Recur to combine:
            valtype spk = sigs1.script.back();
            CScript pubKey2(spk.begin(), spk.end());

            txnouttype txType2;
            std::vector<std::vector<uint8_t>> vSolutions2;
            Solver(pubKey2, txType2, vSolutions2);
            sigs1.script.pop_back();
            sigs2.script.pop_back();
            Stacks result = CombineSignatures(pubKey2, checker, txType2,
                                              vSolutions2, sigs1, sigs2);
            result.script.push_back(spk);
            return result;
        }
        case TX_MULTISIG:
            return Stacks(CombineMultisig(scriptPubKey, checker, vSolutions,
                                          sigs1.script, sigs2.script));
        default:
            return Stacks();
    }
}

SignatureData CombineSignatures(const CScript &scriptPubKey,
                                const BaseSignatureChecker &checker,
                                const SignatureData &scriptSig1,
                                const SignatureData &scriptSig2) {
    txnouttype txType;
    std::vector<std::vector<uint8_t>> vSolutions;
    Solver(scriptPubKey, txType, vSolutions);

    return CombineSignatures(scriptPubKey, checker, txType, vSolutions,
                             Stacks(scriptSig1), Stacks(scriptSig2))
        .Output();
}

namespace {
/** Dummy signature checker which accepts all signatures. */
class DummySignatureChecker : public BaseSignatureChecker {
public:
    DummySignatureChecker() {}

    bool CheckSig(const std::vector<uint8_t> &scriptSig,
                  const std::vector<uint8_t> &vchPubKey,
                  const CScript &scriptCode, uint32_t flags) const override {
        return true;
    }
};
const DummySignatureChecker dummyChecker;
} // namespace

const BaseSignatureChecker &DummySignatureCreator::Checker() const {
    return dummyChecker;
}

bool DummySignatureCreator::CreateSig(std::vector<uint8_t> &vchSig,
                                      const CKeyID &keyid,
                                      const CScript &scriptCode) const {
    // Create a dummy signature that is a valid DER-encoding
    vchSig.assign(72, '\000');
    vchSig[0] = 0x30;
    vchSig[1] = 69;
    vchSig[2] = 0x02;
    vchSig[3] = 33;
    vchSig[4] = 0x01;
    vchSig[4 + 33] = 0x02;
    vchSig[5 + 33] = 32;
    vchSig[6 + 33] = 0x01;
    vchSig[6 + 33 + 32] = SIGHASH_ALL | SIGHASH_FORKID;
    return true;
}
