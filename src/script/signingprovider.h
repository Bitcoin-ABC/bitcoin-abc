// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_SIGNINGPROVIDER_H
#define BITCOIN_SCRIPT_SIGNINGPROVIDER_H

#include <key.h>
#include <pubkey.h>
#include <script/script.h>
#include <script/standard.h>
#include <sync.h>

struct KeyOriginInfo;

/**
 * An interface to be implemented by keystores that support signing.
 */
class SigningProvider {
public:
    virtual ~SigningProvider() {}
    virtual bool GetCScript(const CScriptID &scriptid, CScript &script) const {
        return false;
    }
    virtual bool HaveCScript(const CScriptID &scriptid) const { return false; }
    virtual bool GetPubKey(const CKeyID &address, CPubKey &pubkey) const {
        return false;
    }
    virtual bool GetKey(const CKeyID &address, CKey &key) const {
        return false;
    }
    virtual bool HaveKey(const CKeyID &address) const { return false; }
    virtual bool GetKeyOrigin(const CKeyID &keyid, KeyOriginInfo &info) const {
        return false;
    }
};

extern const SigningProvider &DUMMY_SIGNING_PROVIDER;

class HidingSigningProvider : public SigningProvider {
private:
    const bool m_hide_secret;
    const bool m_hide_origin;
    const SigningProvider *m_provider;

public:
    HidingSigningProvider(const SigningProvider *provider, bool hide_secret,
                          bool hide_origin)
        : m_hide_secret(hide_secret), m_hide_origin(hide_origin),
          m_provider(provider) {}
    bool GetCScript(const CScriptID &scriptid, CScript &script) const override;
    bool GetPubKey(const CKeyID &keyid, CPubKey &pubkey) const override;
    bool GetKey(const CKeyID &keyid, CKey &key) const override;
    bool GetKeyOrigin(const CKeyID &keyid, KeyOriginInfo &info) const override;
};

struct FlatSigningProvider final : public SigningProvider {
    std::map<CScriptID, CScript> scripts;
    std::map<CKeyID, CPubKey> pubkeys;
    std::map<CKeyID, std::pair<CPubKey, KeyOriginInfo>> origins;
    std::map<CKeyID, CKey> keys;

    bool GetCScript(const CScriptID &scriptid, CScript &script) const override;
    bool GetPubKey(const CKeyID &keyid, CPubKey &pubkey) const override;
    bool GetKeyOrigin(const CKeyID &keyid, KeyOriginInfo &info) const override;
    bool GetKey(const CKeyID &keyid, CKey &key) const override;
};

FlatSigningProvider Merge(const FlatSigningProvider &a,
                          const FlatSigningProvider &b);

/**
 * Fillable signing provider that keeps keys in an address->secret map
 */
class FillableSigningProvider : public SigningProvider {
protected:
    using KeyMap = std::map<CKeyID, CKey>;
    using ScriptMap = std::map<CScriptID, CScript>;

    /**
     * Map of key id to unencrypted private keys known by the signing provider.
     * Map may be empty if the provider has another source of keys, like an
     * encrypted store.
     */
    KeyMap mapKeys GUARDED_BY(cs_KeyStore);

    /**
     * (This comment has been elided for clarity since most of it detailed Core
     *  SegWit implementation details, see Core commit 005f8a9)
     *
     * The FillableSigningProvider::mapScripts script map should not be confused
     * with LegacyScriptPubKeyMan::setWatchOnly script set. The two collections
     * can hold the same scripts, but they serve different purposes. The
     * setWatchOnly script set is intended to expand the set of outputs the
     * wallet considers payments. Every output with a script it contains is
     * considered to belong to the wallet, regardless of whether the script is
     * solvable or signable. By contrast, the scripts in mapScripts are only
     * used for solving, and to restrict which outputs are considered payments
     * by the wallet. An output with a script in mapScripts, unlike
     * setWatchOnly, is not automatically considered to belong to the wallet if
     * it can't be solved and signed for.
     */
    ScriptMap mapScripts GUARDED_BY(cs_KeyStore);

public:
    mutable RecursiveMutex cs_KeyStore;

    virtual bool AddKeyPubKey(const CKey &key, const CPubKey &pubkey);
    virtual bool AddKey(const CKey &key) {
        return AddKeyPubKey(key, key.GetPubKey());
    }
    virtual bool GetPubKey(const CKeyID &address,
                           CPubKey &vchPubKeyOut) const override;
    virtual bool HaveKey(const CKeyID &address) const override;
    virtual std::set<CKeyID> GetKeys() const;
    virtual bool GetKey(const CKeyID &address, CKey &keyOut) const override;
    virtual bool AddCScript(const CScript &redeemScript);
    virtual bool HaveCScript(const CScriptID &hash) const override;
    virtual std::set<CScriptID> GetCScripts() const;
    virtual bool GetCScript(const CScriptID &hash,
                            CScript &redeemScriptOut) const override;
};

/**
 * Return the CKeyID of the key involved in a script (if there is a unique one).
 */
CKeyID GetKeyForDestination(const SigningProvider &store,
                            const CTxDestination &dest);

#endif // BITCOIN_SCRIPT_SIGNINGPROVIDER_H
