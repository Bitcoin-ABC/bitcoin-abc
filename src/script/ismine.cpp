// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/ismine.h>

#include <key.h>
#include <keystore.h>
#include <script/script.h>
#include <script/sign.h>
#include <script/standard.h>

typedef std::vector<uint8_t> valtype;

unsigned int HaveKeys(const std::vector<valtype> &pubkeys,
                      const CKeyStore &keystore) {
    unsigned int nResult = 0;
    for (const valtype &pubkey : pubkeys) {
        CKeyID keyID = CPubKey(pubkey).GetID();
        if (keystore.HaveKey(keyID)) ++nResult;
    }
    return nResult;
}

isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey) {
    bool isInvalid = false;
    return IsMine(keystore, scriptPubKey, isInvalid);
}

isminetype IsMine(const CKeyStore &keystore, const CTxDestination &dest) {
    bool isInvalid = false;
    return IsMine(keystore, dest, isInvalid);
}

isminetype IsMine(const CKeyStore &keystore, const CTxDestination &dest,
                  bool &isInvalid) {
    CScript script = GetScriptForDestination(dest);
    return IsMine(keystore, script, isInvalid);
}

isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey,
                  bool &isInvalid) {
    std::vector<valtype> vSolutions;
    txnouttype whichType;
    if (!Solver(scriptPubKey, whichType, vSolutions)) {
        if (keystore.HaveWatchOnly(scriptPubKey))
            return ISMINE_WATCH_UNSOLVABLE;
        return ISMINE_NO;
    }

    CKeyID keyID;
    switch (whichType) {
        case TX_NONSTANDARD:
        case TX_NULL_DATA:
            break;
        case TX_PUBKEY:
            keyID = CPubKey(vSolutions[0]).GetID();
            if (keystore.HaveKey(keyID)) return ISMINE_SPENDABLE;
            break;
        case TX_PUBKEYHASH:
            keyID = CKeyID(uint160(vSolutions[0]));
            if (keystore.HaveKey(keyID)) return ISMINE_SPENDABLE;
            break;
        case TX_SCRIPTHASH: {
            CScriptID scriptID = CScriptID(uint160(vSolutions[0]));
            CScript subscript;
            if (keystore.GetCScript(scriptID, subscript)) {
                isminetype ret = IsMine(keystore, subscript, isInvalid);
                if (ret == ISMINE_SPENDABLE || ret == ISMINE_WATCH_SOLVABLE ||
                    (ret == ISMINE_NO && isInvalid))
                    return ret;
            }
            break;
        }
        case TX_MULTISIG: {
            // Only consider transactions "mine" if we own ALL the keys
            // involved. Multi-signature transactions that are partially owned
            // (somebody else has a key that can spend them) enable
            // spend-out-from-under-you attacks, especially in shared-wallet
            // situations.
            std::vector<valtype> keys(vSolutions.begin() + 1,
                                      vSolutions.begin() + vSolutions.size() -
                                          1);
            if (HaveKeys(keys, keystore) == keys.size())
                return ISMINE_SPENDABLE;
            break;
        }
    }

    if (keystore.HaveWatchOnly(scriptPubKey)) {
        // TODO: This could be optimized some by doing some work after the above
        // solver
        SignatureData sigs;
        return ProduceSignature(DummySignatureCreator(&keystore), scriptPubKey,
                                sigs)
                   ? ISMINE_WATCH_SOLVABLE
                   : ISMINE_WATCH_UNSOLVABLE;
    }
    return ISMINE_NO;
}
