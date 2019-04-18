// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/sigencoding.h>

#include <pubkey.h>
#include <script/script_flags.h>

#include <boost/range/adaptor/sliced.hpp>

typedef boost::sliced_range<const valtype> slicedvaltype;

/**
 * A canonical signature exists of: <30> <total len> <02> <len R> <R> <02> <len
 * S> <S>, where R and S are not negative (their first byte has its highest bit
 * not set), and not excessively padded (do not start with a 0 byte, unless an
 * otherwise negative number follows, in which case a single 0 byte is
 * necessary and even required).
 *
 * See https://bitcointalk.org/index.php?topic=8392.msg127623#msg127623
 *
 * This function is consensus-critical since BIP66.
 */
static bool IsValidDERSignatureEncoding(const slicedvaltype &sig) {
    // Format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
    // * total-length: 1-byte length descriptor of everything that follows,
    // excluding the sighash byte.
    // * R-length: 1-byte length descriptor of the R value that follows.
    // * R: arbitrary-length big-endian encoded R value. It must use the
    // shortest possible encoding for a positive integers (which means no null
    // bytes at the start, except a single one when the next byte has its
    // highest bit set).
    // * S-length: 1-byte length descriptor of the S value that follows.
    // * S: arbitrary-length big-endian encoded S value. The same rules apply.

    // Minimum and maximum size constraints.
    if (sig.size() < 8 || sig.size() > 72) {
        return false;
    }

    //
    // Check that the signature is a compound structure of proper size.
    //

    // A signature is of type 0x30 (compound).
    if (sig[0] != 0x30) {
        return false;
    }

    // Make sure the length covers the entire signature.
    // Remove:
    // * 1 byte for the coupound type.
    // * 1 byte for the length of the signature.
    if (sig[1] != sig.size() - 2) {
        return false;
    }

    //
    // Check that R is an positive integer of sensible size.
    //

    // Check whether the R element is an integer.
    if (sig[2] != 0x02) {
        return false;
    }

    // Extract the length of the R element.
    const uint32_t lenR = sig[3];

    // Zero-length integers are not allowed for R.
    if (lenR == 0) {
        return false;
    }

    // Negative numbers are not allowed for R.
    if (sig[4] & 0x80) {
        return false;
    }

    // Make sure the length of the R element is consistent with the signature
    // size.
    // Remove:
    // * 1 byte for the coumpound type.
    // * 1 byte for the length of the signature.
    // * 2 bytes for the integer type of R and S.
    // * 2 bytes for the size of R and S.
    // * 1 byte for S itself.
    if (lenR > (sig.size() - 7)) {
        return false;
    }

    // Null bytes at the start of R are not allowed, unless R would otherwise be
    // interpreted as a negative number.
    //
    // /!\ This check can only be performed after we checked that lenR is
    //     consistent with the size of the signature or we risk to access out of
    //     bound elements.
    if (lenR > 1 && (sig[4] == 0x00) && !(sig[5] & 0x80)) {
        return false;
    }

    //
    // Check that S is an positive integer of sensible size.
    //

    // S's definition starts after R's definition:
    // * 1 byte for the coumpound type.
    // * 1 byte for the length of the signature.
    // * 1 byte for the size of R.
    // * lenR bytes for R itself.
    // * 1 byte to get to S.
    const uint32_t startS = lenR + 4;

    // Check whether the S element is an integer.
    if (sig[startS] != 0x02) {
        return false;
    }

    // Extract the length of the S element.
    const uint32_t lenS = sig[startS + 1];

    // Zero-length integers are not allowed for S.
    if (lenS == 0) {
        return false;
    }

    // Negative numbers are not allowed for S.
    if (sig[startS + 2] & 0x80) {
        return false;
    }

    // Verify that the length of S is consistent with the size of the signature
    // including metadatas:
    // * 1 byte for the integer type of S.
    // * 1 byte for the size of S.
    if (size_t(startS + lenS + 2) != sig.size()) {
        return false;
    }

    // Null bytes at the start of S are not allowed, unless S would otherwise be
    // interpreted as a negative number.
    //
    // /!\ This check can only be performed after we checked that lenR and lenS
    //     are consistent with the size of the signature or we risk to access
    //     out of bound elements.
    if (lenS > 1 && (sig[startS + 2] == 0x00) && !(sig[startS + 3] & 0x80)) {
        return false;
    }

    return true;
}

static bool CheckRawECDSASignatureEncoding(const slicedvaltype &sig,
                                           uint32_t flags,
                                           ScriptError *serror) {
    if ((flags & SCRIPT_ENABLE_SCHNORR) && (sig.size() == 64)) {
        // In an ECDSA-only context, 64-byte signatures are banned when
        // Schnorr flag set.
        return set_error(serror, SCRIPT_ERR_SIG_BADLENGTH);
    }
    if ((flags & (SCRIPT_VERIFY_DERSIG | SCRIPT_VERIFY_LOW_S |
                  SCRIPT_VERIFY_STRICTENC)) &&
        !IsValidDERSignatureEncoding(sig)) {
        return set_error(serror, SCRIPT_ERR_SIG_DER);
    }

    if ((flags & SCRIPT_VERIFY_LOW_S) && !CPubKey::CheckLowS(sig)) {
        return set_error(serror, SCRIPT_ERR_SIG_HIGH_S);
    }

    return true;
}

static bool CheckRawSignatureEncoding(const slicedvaltype &sig, uint32_t flags,
                                      ScriptError *serror) {
    if ((flags & SCRIPT_ENABLE_SCHNORR) && (sig.size() == 64)) {
        // In a generic-signature context, 64-byte signatures are interpreted
        // as Schnorr signatures (always correctly encoded) when flag set.
        return true;
    }
    return CheckRawECDSASignatureEncoding(sig, flags, serror);
}

bool CheckDataSignatureEncoding(const valtype &vchSig, uint32_t flags,
                                ScriptError *serror) {
    // Empty signature. Not strictly DER encoded, but allowed to provide a
    // compact way to provide an invalid signature for use with CHECK(MULTI)SIG
    if (vchSig.size() == 0) {
        return true;
    }

    return CheckRawSignatureEncoding(
        vchSig | boost::adaptors::sliced(0, vchSig.size()), flags, serror);
}

static bool CheckSighashEncoding(const valtype &vchSig, uint32_t flags,
                                 ScriptError *serror) {
    if (flags & SCRIPT_VERIFY_STRICTENC) {
        if (!GetHashType(vchSig).isDefined()) {
            return set_error(serror, SCRIPT_ERR_SIG_HASHTYPE);
        }

        bool usesForkId = GetHashType(vchSig).hasForkId();
        bool forkIdEnabled = flags & SCRIPT_ENABLE_SIGHASH_FORKID;
        if (!forkIdEnabled && usesForkId) {
            return set_error(serror, SCRIPT_ERR_ILLEGAL_FORKID);
        }

        if (forkIdEnabled && !usesForkId) {
            return set_error(serror, SCRIPT_ERR_MUST_USE_FORKID);
        }
    }

    return true;
}

template <typename F>
static bool CheckTransactionSignatureEncodingImpl(const valtype &vchSig,
                                                  uint32_t flags,
                                                  ScriptError *serror, F fun) {
    // Empty signature. Not strictly DER encoded, but allowed to provide a
    // compact way to provide an invalid signature for use with CHECK(MULTI)SIG
    if (vchSig.size() == 0) {
        return true;
    }

    if (!fun(vchSig | boost::adaptors::sliced(0, vchSig.size() - 1), flags,
             serror)) {
        // serror is set
        return false;
    }

    return CheckSighashEncoding(vchSig, flags, serror);
}

bool CheckTransactionSignatureEncoding(const valtype &vchSig, uint32_t flags,
                                       ScriptError *serror) {
    return CheckTransactionSignatureEncodingImpl(
        vchSig, flags, serror,
        [](const slicedvaltype &templateSig, uint32_t templateFlags,
           ScriptError *templateSerror) {
            return CheckRawSignatureEncoding(templateSig, templateFlags,
                                             templateSerror);
        });
}

bool CheckTransactionECDSASignatureEncoding(const valtype &vchSig,
                                            uint32_t flags,
                                            ScriptError *serror) {
    return CheckTransactionSignatureEncodingImpl(
        vchSig, flags, serror,
        [](const slicedvaltype &templateSig, uint32_t templateFlags,
           ScriptError *templateSerror) {
            return CheckRawECDSASignatureEncoding(templateSig, templateFlags,
                                                  templateSerror);
        });
}

static bool IsCompressedOrUncompressedPubKey(const valtype &vchPubKey) {
    switch (vchPubKey.size()) {
        case 33:
            // Compressed public key: must start with 0x02 or 0x03.
            return vchPubKey[0] == 0x02 || vchPubKey[0] == 0x03;

        case 65:
            // Non-compressed public key: must start with 0x04.
            return vchPubKey[0] == 0x04;

        default:
            // Non-canonical public key: invalid size.
            return false;
    }
}

static bool IsCompressedPubKey(const valtype &vchPubKey) {
    if (vchPubKey.size() != 33) {
        // Non-canonical public key: invalid length for compressed key
        return false;
    }
    if (vchPubKey[0] != 0x02 && vchPubKey[0] != 0x03) {
        // Non-canonical public key: invalid prefix for compressed key
        return false;
    }
    return true;
}

bool CheckPubKeyEncoding(const valtype &vchPubKey, uint32_t flags,
                         ScriptError *serror) {
    if ((flags & SCRIPT_VERIFY_STRICTENC) &&
        !IsCompressedOrUncompressedPubKey(vchPubKey)) {
        return set_error(serror, SCRIPT_ERR_PUBKEYTYPE);
    }
    // Only compressed keys are accepted when
    // SCRIPT_VERIFY_COMPRESSED_PUBKEYTYPE is enabled.
    if ((flags & SCRIPT_VERIFY_COMPRESSED_PUBKEYTYPE) &&
        !IsCompressedPubKey(vchPubKey)) {
        return set_error(serror, SCRIPT_ERR_NONCOMPRESSED_PUBKEY);
    }
    return true;
}
