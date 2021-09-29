// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGN_H
#define BITCOIN_SCRIPT_SIGN_H

#include <coins.h>
#include <hash.h>
#include <pubkey.h>
#include <script/interpreter.h>
#include <script/keyorigin.h>
#include <script/sighashtype.h>
#include <streams.h>

class CKey;
class CKeyID;
class CMutableTransaction;
class CScript;
class CScriptID;
class CTransaction;
class SigningProvider;

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

/** A signature creator that just produces 71-byte empty signatures. */
extern const BaseSignatureCreator &DUMMY_SIGNATURE_CREATOR;
/** A signature creator that just produces 72-byte empty signatures. */
extern const BaseSignatureCreator &DUMMY_MAXIMUM_SIGNATURE_CREATOR;

typedef std::pair<CPubKey, std::vector<uint8_t>> SigPair;

// This struct contains information from a transaction input and also contains
// signatures for that input. The information contained here can be used to
// create a signature and is also filled by ProduceSignature in order to
// construct final scriptSigs.
struct SignatureData {
    /// Stores whether the scriptSig are complete.
    bool complete = false;
    /// The scriptSig of an input. Contains complete signatures or the
    /// traditional partial signatures format.
    CScript scriptSig;
    /// The redeemScript (if any) for the input.
    CScript redeem_script;
    /// BIP 174 style partial signatures for the input. May contain all
    /// signatures necessary for producing a final scriptSig.
    std::map<CKeyID, SigPair> signatures;
    std::map<CKeyID, std::pair<CPubKey, KeyOriginInfo>> misc_pubkeys;
    /// KeyIDs of pubkeys which could not be found
    std::vector<CKeyID> missing_pubkeys;
    /// KeyIDs of pubkeys for signatures which could not be found
    std::vector<CKeyID> missing_sigs;
    /// ScriptID of the missing redeemScript (if any)
    uint160 missing_redeem_script;

    SignatureData() {}
    explicit SignatureData(const CScript &script) : scriptSig(script) {}
    void MergeSignatureData(SignatureData sigdata);
};

// Takes a stream and multiple arguments and serializes them as if first
// serialized into a vector and then into the stream. The resulting output into
// the stream has the total serialized length of all of the objects followed by
// all objects concatenated with each other.
template <typename Stream, typename... X>
void SerializeToVector(Stream &s, const X &... args) {
    WriteCompactSize(s, GetSerializeSizeMany(s.GetVersion(), args...));
    SerializeMany(s, args...);
}

// Takes a stream and multiple arguments and unserializes them first as a vector
// then each object individually in the order provided in the arguments.
template <typename Stream, typename... X>
void UnserializeFromVector(Stream &s, X &... args) {
    size_t expected_size = ReadCompactSize(s);
    size_t remaining_before = s.size();
    UnserializeMany(s, args...);
    size_t remaining_after = s.size();
    if (remaining_after + expected_size != remaining_before) {
        throw std::ios_base::failure("Size of value was not the stated size");
    }
}

// Deserialize HD keypaths into a map
template <typename Stream>
void DeserializeHDKeypaths(Stream &s, const std::vector<uint8_t> &key,
                           std::map<CPubKey, KeyOriginInfo> &hd_keypaths) {
    // Make sure that the key is the size of pubkey + 1
    if (key.size() != CPubKey::SIZE + 1 &&
        key.size() != CPubKey::COMPRESSED_SIZE + 1) {
        throw std::ios_base::failure(
            "Size of key was not the expected size for the type BIP32 keypath");
    }
    // Read in the pubkey from key
    CPubKey pubkey(key.begin() + 1, key.end());
    if (!pubkey.IsFullyValid()) {
        throw std::ios_base::failure("Invalid pubkey");
    }
    if (hd_keypaths.count(pubkey) > 0) {
        throw std::ios_base::failure(
            "Duplicate Key, pubkey derivation path already provided");
    }

    // Read in key path
    uint64_t value_len = ReadCompactSize(s);
    if (value_len % 4 || value_len == 0) {
        throw std::ios_base::failure("Invalid length for HD key path");
    }

    KeyOriginInfo keypath;
    s >> keypath.fingerprint;
    for (unsigned int i = 4; i < value_len; i += sizeof(uint32_t)) {
        uint32_t index;
        s >> index;
        keypath.path.push_back(index);
    }

    // Add to map
    hd_keypaths.emplace(pubkey, std::move(keypath));
}

// Serialize HD keypaths to a stream from a map
template <typename Stream>
void SerializeHDKeypaths(Stream &s,
                         const std::map<CPubKey, KeyOriginInfo> &hd_keypaths,
                         uint8_t type) {
    for (auto keypath_pair : hd_keypaths) {
        if (!keypath_pair.first.IsValid()) {
            throw std::ios_base::failure("Invalid CPubKey being serialized");
        }
        SerializeToVector(s, type, MakeSpan(keypath_pair.first));
        WriteCompactSize(s, (keypath_pair.second.path.size() + 1) *
                                sizeof(uint32_t));
        s << keypath_pair.second.fingerprint;
        for (const auto &path : keypath_pair.second.path) {
            s << path;
        }
    }
}

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

/**
 * Check whether we know how to sign for an output like this, assuming we have
 * all private keys. While this function does not need private keys, the passed
 * keystore is used to look up public keys and redeemscripts by hash.
 * Solvability is unrelated to whether we consider this output to be ours.
 */
bool IsSolvable(const SigningProvider &provider, const CScript &script);

/** Sign the CMutableTransaction */
bool SignTransaction(CMutableTransaction &mtx, const SigningProvider *provider,
                     const std::map<COutPoint, Coin> &coins,
                     SigHashType sigHashType,
                     std::map<int, std::string> &input_errors);

#endif // BITCOIN_SCRIPT_SIGN_H
