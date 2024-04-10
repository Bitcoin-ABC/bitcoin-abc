// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/walletdb.h>

#include <chainparams.h>
#include <fs.h>
#include <key_io.h>
#include <protocol.h>
#include <serialize.h>
#include <sync.h>
#include <util/bip32.h>
#include <util/system.h>
#include <util/time.h>
#include <util/translation.h>
#include <wallet/bdb.h>
#include <wallet/wallet.h>

#include <atomic>

namespace DBKeys {
const std::string ACENTRY{"acentry"};
const std::string ACTIVEEXTERNALSPK{"activeexternalspk"};
const std::string ACTIVEINTERNALSPK{"activeinternalspk"};
const std::string BESTBLOCK_NOMERKLE{"bestblock_nomerkle"};
const std::string BESTBLOCK{"bestblock"};
const std::string CRYPTED_KEY{"ckey"};
const std::string CSCRIPT{"cscript"};
const std::string DEFAULTKEY{"defaultkey"};
const std::string DESTDATA{"destdata"};
const std::string FLAGS{"flags"};
const std::string HDCHAIN{"hdchain"};
const std::string KEYMETA{"keymeta"};
const std::string KEY{"key"};
const std::string MASTER_KEY{"mkey"};
const std::string MINVERSION{"minversion"};
const std::string NAME{"name"};
const std::string OLD_KEY{"wkey"};
const std::string ORDERPOSNEXT{"orderposnext"};
const std::string POOL{"pool"};
const std::string PURPOSE{"purpose"};
const std::string SETTINGS{"settings"};
const std::string TX{"tx"};
const std::string VERSION{"version"};
const std::string WALLETDESCRIPTOR{"walletdescriptor"};
const std::string WALLETDESCRIPTORCACHE{"walletdescriptorcache"};
const std::string WALLETDESCRIPTORCKEY{"walletdescriptorckey"};
const std::string WALLETDESCRIPTORKEY{"walletdescriptorkey"};
const std::string WATCHMETA{"watchmeta"};
const std::string WATCHS{"watchs"};
} // namespace DBKeys

//
// WalletBatch
//

bool WalletBatch::WriteName(const CTxDestination &address,
                            const std::string &strName) {
    if (!IsValidDestination(address)) {
        return false;
    }
    return WriteIC(
        std::make_pair(DBKeys::NAME, EncodeLegacyAddr(address, Params())),
        strName);
}

bool WalletBatch::EraseName(const CTxDestination &address) {
    // This should only be used for sending addresses, never for receiving
    // addresses, receiving addresses must always have an address book entry if
    // they're not change return.
    if (!IsValidDestination(address)) {
        return false;
    }
    return EraseIC(
        std::make_pair(DBKeys::NAME, EncodeLegacyAddr(address, Params())));
}

bool WalletBatch::WritePurpose(const CTxDestination &address,
                               const std::string &strPurpose) {
    if (!IsValidDestination(address)) {
        return false;
    }
    return WriteIC(
        std::make_pair(DBKeys::PURPOSE, EncodeLegacyAddr(address, Params())),
        strPurpose);
}

bool WalletBatch::ErasePurpose(const CTxDestination &address) {
    if (!IsValidDestination(address)) {
        return false;
    }
    return EraseIC(
        std::make_pair(DBKeys::PURPOSE, EncodeLegacyAddr(address, Params())));
}

bool WalletBatch::WriteTx(const CWalletTx &wtx) {
    return WriteIC(std::make_pair(DBKeys::TX, wtx.GetId()), wtx);
}

bool WalletBatch::EraseTx(uint256 hash) {
    return EraseIC(std::make_pair(DBKeys::TX, hash));
}

bool WalletBatch::WriteKeyMetadata(const CKeyMetadata &meta,
                                   const CPubKey &pubkey,
                                   const bool overwrite) {
    return WriteIC(std::make_pair(DBKeys::KEYMETA, pubkey), meta, overwrite);
}

bool WalletBatch::WriteKey(const CPubKey &vchPubKey, const CPrivKey &vchPrivKey,
                           const CKeyMetadata &keyMeta) {
    if (!WriteKeyMetadata(keyMeta, vchPubKey, false)) {
        return false;
    }

    // hash pubkey/privkey to accelerate wallet load
    std::vector<uint8_t> vchKey;
    vchKey.reserve(vchPubKey.size() + vchPrivKey.size());
    vchKey.insert(vchKey.end(), vchPubKey.begin(), vchPubKey.end());
    vchKey.insert(vchKey.end(), vchPrivKey.begin(), vchPrivKey.end());

    return WriteIC(std::make_pair(DBKeys::KEY, vchPubKey),
                   std::make_pair(vchPrivKey, Hash(vchKey)), false);
}

bool WalletBatch::WriteCryptedKey(const CPubKey &vchPubKey,
                                  const std::vector<uint8_t> &vchCryptedSecret,
                                  const CKeyMetadata &keyMeta) {
    if (!WriteKeyMetadata(keyMeta, vchPubKey, true)) {
        return false;
    }

    // Compute a checksum of the encrypted key
    uint256 checksum = Hash(vchCryptedSecret);

    const auto key = std::make_pair(DBKeys::CRYPTED_KEY, vchPubKey);
    if (!WriteIC(key, std::make_pair(vchCryptedSecret, checksum), false)) {
        // It may already exist, so try writing just the checksum
        std::vector<uint8_t> val;
        if (!m_batch->Read(key, val)) {
            return false;
        }
        if (!WriteIC(key, std::make_pair(val, checksum), true)) {
            return false;
        }
    }
    EraseIC(std::make_pair(DBKeys::KEY, vchPubKey));
    return true;
}

bool WalletBatch::WriteMasterKey(unsigned int nID,
                                 const CMasterKey &kMasterKey) {
    return WriteIC(std::make_pair(DBKeys::MASTER_KEY, nID), kMasterKey, true);
}

bool WalletBatch::WriteCScript(const uint160 &hash,
                               const CScript &redeemScript) {
    return WriteIC(std::make_pair(DBKeys::CSCRIPT, hash), redeemScript, false);
}

bool WalletBatch::WriteWatchOnly(const CScript &dest,
                                 const CKeyMetadata &keyMeta) {
    if (!WriteIC(std::make_pair(DBKeys::WATCHMETA, dest), keyMeta)) {
        return false;
    }
    return WriteIC(std::make_pair(DBKeys::WATCHS, dest), uint8_t{'1'});
}

bool WalletBatch::EraseWatchOnly(const CScript &dest) {
    if (!EraseIC(std::make_pair(DBKeys::WATCHMETA, dest))) {
        return false;
    }
    return EraseIC(std::make_pair(DBKeys::WATCHS, dest));
}

bool WalletBatch::WriteBestBlock(const CBlockLocator &locator) {
    // Write empty block locator so versions that require a merkle branch
    // automatically rescan
    WriteIC(DBKeys::BESTBLOCK, CBlockLocator());
    return WriteIC(DBKeys::BESTBLOCK_NOMERKLE, locator);
}

bool WalletBatch::ReadBestBlock(CBlockLocator &locator) {
    if (m_batch->Read(DBKeys::BESTBLOCK, locator) && !locator.vHave.empty()) {
        return true;
    }
    return m_batch->Read(DBKeys::BESTBLOCK_NOMERKLE, locator);
}

bool WalletBatch::WriteOrderPosNext(int64_t nOrderPosNext) {
    return WriteIC(DBKeys::ORDERPOSNEXT, nOrderPosNext);
}

bool WalletBatch::ReadPool(int64_t nPool, CKeyPool &keypool) {
    return m_batch->Read(std::make_pair(DBKeys::POOL, nPool), keypool);
}

bool WalletBatch::WritePool(int64_t nPool, const CKeyPool &keypool) {
    return WriteIC(std::make_pair(DBKeys::POOL, nPool), keypool);
}

bool WalletBatch::ErasePool(int64_t nPool) {
    return EraseIC(std::make_pair(DBKeys::POOL, nPool));
}

bool WalletBatch::WriteMinVersion(int nVersion) {
    return WriteIC(DBKeys::MINVERSION, nVersion);
}

bool WalletBatch::WriteActiveScriptPubKeyMan(uint8_t type, const uint256 &id,
                                             bool internal) {
    std::string key =
        internal ? DBKeys::ACTIVEINTERNALSPK : DBKeys::ACTIVEEXTERNALSPK;
    return WriteIC(make_pair(key, type), id);
}

bool WalletBatch::EraseActiveScriptPubKeyMan(uint8_t type, bool internal) {
    const std::string key{internal ? DBKeys::ACTIVEINTERNALSPK
                                   : DBKeys::ACTIVEEXTERNALSPK};
    return EraseIC(make_pair(key, type));
}

bool WalletBatch::WriteDescriptorKey(const uint256 &desc_id,
                                     const CPubKey &pubkey,
                                     const CPrivKey &privkey) {
    // hash pubkey/privkey to accelerate wallet load
    std::vector<uint8_t> key;
    key.reserve(pubkey.size() + privkey.size());
    key.insert(key.end(), pubkey.begin(), pubkey.end());
    key.insert(key.end(), privkey.begin(), privkey.end());

    return WriteIC(std::make_pair(DBKeys::WALLETDESCRIPTORKEY,
                                  std::make_pair(desc_id, pubkey)),
                   std::make_pair(privkey, Hash(key)), false);
}

bool WalletBatch::WriteCryptedDescriptorKey(
    const uint256 &desc_id, const CPubKey &pubkey,
    const std::vector<uint8_t> &secret) {
    if (!WriteIC(std::make_pair(DBKeys::WALLETDESCRIPTORCKEY,
                                std::make_pair(desc_id, pubkey)),
                 secret, false)) {
        return false;
    }
    EraseIC(std::make_pair(DBKeys::WALLETDESCRIPTORKEY,
                           std::make_pair(desc_id, pubkey)));
    return true;
}

bool WalletBatch::WriteDescriptor(const uint256 &desc_id,
                                  const WalletDescriptor &descriptor) {
    return WriteIC(make_pair(DBKeys::WALLETDESCRIPTOR, desc_id), descriptor);
}

bool WalletBatch::WriteDescriptorDerivedCache(const CExtPubKey &xpub,
                                              const uint256 &desc_id,
                                              uint32_t key_exp_index,
                                              uint32_t der_index) {
    std::vector<uint8_t> ser_xpub(BIP32_EXTKEY_SIZE);
    xpub.Encode(ser_xpub.data());
    return WriteIC(
        std::make_pair(std::make_pair(DBKeys::WALLETDESCRIPTORCACHE, desc_id),
                       std::make_pair(key_exp_index, der_index)),
        ser_xpub);
}

bool WalletBatch::WriteDescriptorParentCache(const CExtPubKey &xpub,
                                             const uint256 &desc_id,
                                             uint32_t key_exp_index) {
    std::vector<uint8_t> ser_xpub(BIP32_EXTKEY_SIZE);
    xpub.Encode(ser_xpub.data());
    return WriteIC(
        std::make_pair(std::make_pair(DBKeys::WALLETDESCRIPTORCACHE, desc_id),
                       key_exp_index),
        ser_xpub);
}

class CWalletScanState {
public:
    unsigned int nKeys{0};
    unsigned int nCKeys{0};
    unsigned int nWatchKeys{0};
    unsigned int nKeyMeta{0};
    unsigned int m_unknown_records{0};
    bool fIsEncrypted{false};
    bool fAnyUnordered{false};
    std::vector<TxId> vWalletUpgrade;
    std::map<OutputType, uint256> m_active_external_spks;
    std::map<OutputType, uint256> m_active_internal_spks;
    std::map<uint256, DescriptorCache> m_descriptor_caches;
    std::map<std::pair<uint256, CKeyID>, CKey> m_descriptor_keys;
    std::map<std::pair<uint256, CKeyID>,
             std::pair<CPubKey, std::vector<uint8_t>>>
        m_descriptor_crypt_keys;
    std::map<uint160, CHDChain> m_hd_chains;

    CWalletScanState() {}
};

static bool ReadKeyValue(CWallet *pwallet, CDataStream &ssKey,
                         CDataStream &ssValue, CWalletScanState &wss,
                         std::string &strType, std::string &strErr,
                         const KeyFilterFn &filter_fn = nullptr)
    EXCLUSIVE_LOCKS_REQUIRED(pwallet->cs_wallet) {
    try {
        // Unserialize
        // Taking advantage of the fact that pair serialization is just the two
        // items serialized one after the other.
        ssKey >> strType;
        // If we have a filter, check if this matches the filter
        if (filter_fn && !filter_fn(strType)) {
            return true;
        }
        if (strType == DBKeys::NAME) {
            std::string strAddress;
            ssKey >> strAddress;
            std::string label;
            ssValue >> label;
            pwallet
                ->m_address_book[DecodeDestination(strAddress,
                                                   pwallet->GetChainParams())]
                .SetLabel(label);
        } else if (strType == DBKeys::PURPOSE) {
            std::string strAddress;
            ssKey >> strAddress;
            ssValue >> pwallet
                           ->m_address_book[DecodeDestination(
                               strAddress, pwallet->GetChainParams())]
                           .purpose;
        } else if (strType == DBKeys::TX) {
            TxId txid;
            ssKey >> txid;
            // LoadToWallet call below creates a new CWalletTx that fill_wtx
            // callback fills with transaction metadata.
            auto fill_wtx = [&](CWalletTx &wtx, bool new_tx) {
                assert(new_tx);
                ssValue >> wtx;
                if (wtx.GetId() != txid) {
                    return false;
                }

                // Undo serialize changes in 31600
                if (31404 <= wtx.fTimeReceivedIsTxTime &&
                    wtx.fTimeReceivedIsTxTime <= 31703) {
                    if (!ssValue.empty()) {
                        uint8_t fTmp;
                        uint8_t fUnused;
                        std::string unused_string;
                        ssValue >> fTmp >> fUnused >> unused_string;
                        strErr = strprintf(
                            "LoadWallet() upgrading tx ver=%d %d %s",
                            wtx.fTimeReceivedIsTxTime, fTmp, txid.ToString());
                        wtx.fTimeReceivedIsTxTime = fTmp;
                    } else {
                        strErr = strprintf(
                            "LoadWallet() repairing tx ver=%d %s",
                            wtx.fTimeReceivedIsTxTime, txid.ToString());
                        wtx.fTimeReceivedIsTxTime = 0;
                    }
                    wss.vWalletUpgrade.push_back(txid);
                }

                if (wtx.nOrderPos == -1) {
                    wss.fAnyUnordered = true;
                }

                return true;
            };
            if (!pwallet->LoadToWallet(txid, fill_wtx)) {
                return false;
            }
        } else if (strType == DBKeys::WATCHS) {
            wss.nWatchKeys++;
            CScript script;
            ssKey >> script;
            uint8_t fYes;
            ssValue >> fYes;
            if (fYes == '1') {
                pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadWatchOnly(
                    script);
            }
        } else if (strType == DBKeys::KEY) {
            CPubKey vchPubKey;
            ssKey >> vchPubKey;
            if (!vchPubKey.IsValid()) {
                strErr = "Error reading wallet database: CPubKey corrupt";
                return false;
            }
            CKey key;
            CPrivKey pkey;
            uint256 hash;

            wss.nKeys++;
            ssValue >> pkey;

            // Old wallets store keys as DBKeys::KEY [pubkey] => [privkey] ...
            // which was slow for wallets with lots of keys, because the public
            // key is re-derived from the private key using EC operations as a
            // checksum. Newer wallets store keys as DBKeys::KEY [pubkey] =>
            // [privkey][hash(pubkey,privkey)], which is much faster while
            // remaining backwards-compatible.
            try {
                ssValue >> hash;
            } catch (...) {
            }

            bool fSkipCheck = false;

            if (!hash.IsNull()) {
                // hash pubkey/privkey to accelerate wallet load
                std::vector<uint8_t> vchKey;
                vchKey.reserve(vchPubKey.size() + pkey.size());
                vchKey.insert(vchKey.end(), vchPubKey.begin(), vchPubKey.end());
                vchKey.insert(vchKey.end(), pkey.begin(), pkey.end());

                if (Hash(vchKey) != hash) {
                    strErr = "Error reading wallet database: CPubKey/CPrivKey "
                             "corrupt";
                    return false;
                }

                fSkipCheck = true;
            }

            if (!key.Load(pkey, vchPubKey, fSkipCheck)) {
                strErr = "Error reading wallet database: CPrivKey corrupt";
                return false;
            }
            if (!pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadKey(
                    key, vchPubKey)) {
                strErr = "Error reading wallet database: "
                         "LegacyScriptPubKeyMan::LoadKey failed";
                return false;
            }
        } else if (strType == DBKeys::MASTER_KEY) {
            // Master encryption key is loaded into only the wallet and not any
            // of the ScriptPubKeyMans.
            unsigned int nID;
            ssKey >> nID;
            CMasterKey kMasterKey;
            ssValue >> kMasterKey;
            if (pwallet->mapMasterKeys.count(nID) != 0) {
                strErr = strprintf(
                    "Error reading wallet database: duplicate CMasterKey id %u",
                    nID);
                return false;
            }
            pwallet->mapMasterKeys[nID] = kMasterKey;
            if (pwallet->nMasterKeyMaxID < nID) {
                pwallet->nMasterKeyMaxID = nID;
            }
        } else if (strType == DBKeys::CRYPTED_KEY) {
            CPubKey vchPubKey;
            ssKey >> vchPubKey;
            if (!vchPubKey.IsValid()) {
                strErr = "Error reading wallet database: CPubKey corrupt";
                return false;
            }
            std::vector<uint8_t> vchPrivKey;
            ssValue >> vchPrivKey;

            // Get the checksum and check it
            bool checksum_valid = false;
            if (!ssValue.eof()) {
                uint256 checksum;
                ssValue >> checksum;
                if ((checksum_valid = Hash(vchPrivKey) != checksum)) {
                    strErr =
                        "Error reading wallet database: Crypted key corrupt";
                    return false;
                }
            }

            wss.nCKeys++;

            if (!pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadCryptedKey(
                    vchPubKey, vchPrivKey, checksum_valid)) {
                strErr = "Error reading wallet database: "
                         "LegacyScriptPubKeyMan::LoadCryptedKey failed";
                return false;
            }
            wss.fIsEncrypted = true;
        } else if (strType == DBKeys::KEYMETA) {
            CPubKey vchPubKey;
            ssKey >> vchPubKey;
            CKeyMetadata keyMeta;
            ssValue >> keyMeta;
            wss.nKeyMeta++;
            pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadKeyMetadata(
                vchPubKey.GetID(), keyMeta);

            // Extract some CHDChain info from this metadata if it has any
            if (keyMeta.nVersion >= CKeyMetadata::VERSION_WITH_HDDATA &&
                !keyMeta.hd_seed_id.IsNull() && keyMeta.hdKeypath.size() > 0) {
                // Get the path from the key origin or from the path string
                // Not applicable when path is "s" or "m" as those indicate a
                // seed.
                // See https://reviews.bitcoinabc.org/D4175
                bool internal = false;
                uint32_t index = 0;
                if (keyMeta.hdKeypath != "s" && keyMeta.hdKeypath != "m") {
                    std::vector<uint32_t> path;
                    if (keyMeta.has_key_origin) {
                        // We have a key origin, so pull it from its path vector
                        path = keyMeta.key_origin.path;
                    } else {
                        // No key origin, have to parse the string
                        if (!ParseHDKeypath(keyMeta.hdKeypath, path)) {
                            strErr = "Error reading wallet database: keymeta "
                                     "with invalid HD keypath";
                            return false;
                        }
                    }

                    // Extract the index and internal from the path
                    // Path string is m/0'/k'/i'
                    // Path vector is [0', k', i'] (but as ints OR'd with the
                    // hardened bit k == 0 for external, 1 for internal. i is
                    // the index
                    if (path.size() != 3) {
                        strErr = "Error reading wallet database: keymeta found "
                                 "with unexpected path";
                        return false;
                    }
                    if (path[0] != 0x80000000) {
                        strErr = strprintf(
                            "Unexpected path index of 0x%08x (expected "
                            "0x80000000) for the element at index 0",
                            path[0]);
                        return false;
                    }
                    if (path[1] != 0x80000000 && path[1] != (1 | 0x80000000)) {
                        strErr =
                            strprintf("Unexpected path index of 0x%08x "
                                      "(expected 0x80000000 or 0x80000001) for "
                                      "the element at index 1",
                                      path[1]);
                        return false;
                    }
                    if ((path[2] & 0x80000000) == 0) {
                        strErr = strprintf(
                            "Unexpected path index of 0x%08x (expected to be "
                            "greater than or equal to 0x80000000)",
                            path[2]);
                        return false;
                    }
                    internal = path[1] == (1 | 0x80000000);
                    index = path[2] & ~0x80000000;
                }

                // Insert a new CHDChain, or get the one that already exists
                auto ins =
                    wss.m_hd_chains.emplace(keyMeta.hd_seed_id, CHDChain());
                CHDChain &chain = ins.first->second;
                if (ins.second) {
                    // For new chains, we want to default to VERSION_HD_BASE
                    // until we see an internal
                    chain.nVersion = CHDChain::VERSION_HD_BASE;
                    chain.seed_id = keyMeta.hd_seed_id;
                }
                if (internal) {
                    chain.nVersion = CHDChain::VERSION_HD_CHAIN_SPLIT;
                    chain.nInternalChainCounter =
                        std::max(chain.nInternalChainCounter, index);
                } else {
                    chain.nExternalChainCounter =
                        std::max(chain.nExternalChainCounter, index);
                }
            }
        } else if (strType == DBKeys::WATCHMETA) {
            CScript script;
            ssKey >> script;
            CKeyMetadata keyMeta;
            ssValue >> keyMeta;
            wss.nKeyMeta++;
            pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadScriptMetadata(
                CScriptID(script), keyMeta);
        } else if (strType == DBKeys::DEFAULTKEY) {
            // We don't want or need the default key, but if there is one set,
            // we want to make sure that it is valid so that we can detect
            // corruption
            CPubKey vchPubKey;
            ssValue >> vchPubKey;
            if (!vchPubKey.IsValid()) {
                strErr = "Error reading wallet database: Default Key corrupt";
                return false;
            }
        } else if (strType == DBKeys::POOL) {
            int64_t nIndex;
            ssKey >> nIndex;
            CKeyPool keypool;
            ssValue >> keypool;

            pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadKeyPool(nIndex,
                                                                     keypool);
        } else if (strType == DBKeys::CSCRIPT) {
            uint160 hash;
            ssKey >> hash;
            CScript script;
            ssValue >> script;
            if (!pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadCScript(
                    script)) {
                strErr = "Error reading wallet database: "
                         "LegacyScriptPubKeyMan::LoadCScript failed";
                return false;
            }
        } else if (strType == DBKeys::ORDERPOSNEXT) {
            ssValue >> pwallet->nOrderPosNext;
        } else if (strType == DBKeys::DESTDATA) {
            std::string strAddress, strKey, strValue;
            ssKey >> strAddress;
            ssKey >> strKey;
            ssValue >> strValue;
            pwallet->LoadDestData(
                DecodeDestination(strAddress, pwallet->GetChainParams()),
                strKey, strValue);
        } else if (strType == DBKeys::HDCHAIN) {
            CHDChain chain;
            ssValue >> chain;
            pwallet->GetOrCreateLegacyScriptPubKeyMan()->LoadHDChain(chain);
        } else if (strType == DBKeys::FLAGS) {
            uint64_t flags;
            ssValue >> flags;
            if (!pwallet->LoadWalletFlags(flags)) {
                strErr = "Error reading wallet database: Unknown non-tolerable "
                         "wallet flags found";
                return false;
            }
        } else if (strType == DBKeys::OLD_KEY) {
            strErr = "Found unsupported 'wkey' record, try loading with "
                     "version 0.20";
            return false;
        } else if (strType == DBKeys::ACTIVEEXTERNALSPK ||
                   strType == DBKeys::ACTIVEINTERNALSPK) {
            uint8_t type;
            ssKey >> type;
            uint256 id;
            ssValue >> id;

            bool internal = strType == DBKeys::ACTIVEINTERNALSPK;
            auto &spk_mans = internal ? wss.m_active_internal_spks
                                      : wss.m_active_external_spks;
            if (spk_mans.count(static_cast<OutputType>(type)) > 0) {
                strErr =
                    "Multiple ScriptPubKeyMans specified for a single type";
                return false;
            }
            spk_mans[static_cast<OutputType>(type)] = id;
        } else if (strType == DBKeys::WALLETDESCRIPTOR) {
            uint256 id;
            ssKey >> id;
            WalletDescriptor desc;
            ssValue >> desc;
            if (wss.m_descriptor_caches.count(id) == 0) {
                wss.m_descriptor_caches[id] = DescriptorCache();
            }
            pwallet->LoadDescriptorScriptPubKeyMan(id, desc);
        } else if (strType == DBKeys::WALLETDESCRIPTORCACHE) {
            bool parent = true;
            uint256 desc_id;
            uint32_t key_exp_index;
            uint32_t der_index;
            ssKey >> desc_id;
            ssKey >> key_exp_index;

            // if the der_index exists, it's a derived xpub
            try {
                ssKey >> der_index;
                parent = false;
            } catch (...) {
            }

            std::vector<uint8_t> ser_xpub(BIP32_EXTKEY_SIZE);
            ssValue >> ser_xpub;
            CExtPubKey xpub;
            xpub.Decode(ser_xpub.data());
            if (parent) {
                wss.m_descriptor_caches[desc_id].CacheParentExtPubKey(
                    key_exp_index, xpub);
            } else {
                wss.m_descriptor_caches[desc_id].CacheDerivedExtPubKey(
                    key_exp_index, der_index, xpub);
            }
        } else if (strType == DBKeys::WALLETDESCRIPTORKEY) {
            uint256 desc_id;
            CPubKey pubkey;
            ssKey >> desc_id;
            ssKey >> pubkey;
            if (!pubkey.IsValid()) {
                strErr = "Error reading wallet database: CPubKey corrupt";
                return false;
            }
            CKey key;
            CPrivKey pkey;
            uint256 hash;

            wss.nKeys++;
            ssValue >> pkey;
            ssValue >> hash;

            // hash pubkey/privkey to accelerate wallet load
            std::vector<uint8_t> to_hash;
            to_hash.reserve(pubkey.size() + pkey.size());
            to_hash.insert(to_hash.end(), pubkey.begin(), pubkey.end());
            to_hash.insert(to_hash.end(), pkey.begin(), pkey.end());

            if (Hash(to_hash) != hash) {
                strErr =
                    "Error reading wallet database: CPubKey/CPrivKey corrupt";
                return false;
            }

            if (!key.Load(pkey, pubkey, true)) {
                strErr = "Error reading wallet database: CPrivKey corrupt";
                return false;
            }
            wss.m_descriptor_keys.insert(
                std::make_pair(std::make_pair(desc_id, pubkey.GetID()), key));
        } else if (strType == DBKeys::WALLETDESCRIPTORCKEY) {
            uint256 desc_id;
            CPubKey pubkey;
            ssKey >> desc_id;
            ssKey >> pubkey;
            if (!pubkey.IsValid()) {
                strErr = "Error reading wallet database: CPubKey corrupt";
                return false;
            }
            std::vector<uint8_t> privkey;
            ssValue >> privkey;
            wss.nCKeys++;

            wss.m_descriptor_crypt_keys.insert(
                std::make_pair(std::make_pair(desc_id, pubkey.GetID()),
                               std::make_pair(pubkey, privkey)));
            wss.fIsEncrypted = true;
        } else if (strType != DBKeys::BESTBLOCK &&
                   strType != DBKeys::BESTBLOCK_NOMERKLE &&
                   strType != DBKeys::MINVERSION &&
                   strType != DBKeys::ACENTRY && strType != DBKeys::VERSION &&
                   strType != DBKeys::SETTINGS) {
            wss.m_unknown_records++;
        }
    } catch (const std::exception &e) {
        if (strErr.empty()) {
            strErr = e.what();
        }
        return false;
    } catch (...) {
        if (strErr.empty()) {
            strErr = "Caught unknown exception in ReadKeyValue";
        }
        return false;
    }
    return true;
}

bool ReadKeyValue(CWallet *pwallet, CDataStream &ssKey, CDataStream &ssValue,
                  std::string &strType, std::string &strErr,
                  const KeyFilterFn &filter_fn) {
    CWalletScanState dummy_wss;
    LOCK(pwallet->cs_wallet);
    return ReadKeyValue(pwallet, ssKey, ssValue, dummy_wss, strType, strErr,
                        filter_fn);
}

bool WalletBatch::IsKeyType(const std::string &strType) {
    return (strType == DBKeys::KEY || strType == DBKeys::MASTER_KEY ||
            strType == DBKeys::CRYPTED_KEY);
}

DBErrors WalletBatch::LoadWallet(CWallet *pwallet) {
    CWalletScanState wss;
    bool fNoncriticalErrors = false;
    DBErrors result = DBErrors::LOAD_OK;

    LOCK(pwallet->cs_wallet);
    try {
        int nMinVersion = 0;
        if (m_batch->Read(DBKeys::MINVERSION, nMinVersion)) {
            if (nMinVersion > FEATURE_LATEST) {
                return DBErrors::TOO_NEW;
            }
            pwallet->LoadMinVersion(nMinVersion);
        }

        // Get cursor
        if (!m_batch->StartCursor()) {
            pwallet->WalletLogPrintf("Error getting wallet database cursor\n");
            return DBErrors::CORRUPT;
        }

        while (true) {
            // Read next record
            CDataStream ssKey(SER_DISK, CLIENT_VERSION);
            CDataStream ssValue(SER_DISK, CLIENT_VERSION);
            bool complete;
            bool ret = m_batch->ReadAtCursor(ssKey, ssValue, complete);
            if (complete) {
                break;
            }
            if (!ret) {
                m_batch->CloseCursor();
                pwallet->WalletLogPrintf(
                    "Error reading next record from wallet database\n");
                return DBErrors::CORRUPT;
            }

            // Try to be tolerant of single corrupt records:
            std::string strType, strErr;
            if (!ReadKeyValue(pwallet, ssKey, ssValue, wss, strType, strErr)) {
                // losing keys is considered a catastrophic error, anything else
                // we assume the user can live with:
                if (IsKeyType(strType) || strType == DBKeys::DEFAULTKEY) {
                    result = DBErrors::CORRUPT;
                } else if (strType == DBKeys::FLAGS) {
                    // Reading the wallet flags can only fail if unknown flags
                    // are present.
                    result = DBErrors::TOO_NEW;
                } else {
                    // Leave other errors alone, if we try to fix them we might
                    // make things worse. But do warn the user there is
                    // something wrong.
                    fNoncriticalErrors = true;
                    if (strType == DBKeys::TX) {
                        // Rescan if there is a bad transaction record:
                        gArgs.SoftSetBoolArg("-rescan", true);
                    }
                }
            }
            if (!strErr.empty()) {
                pwallet->WalletLogPrintf("%s\n", strErr);
            }
        }
    } catch (...) {
        result = DBErrors::CORRUPT;
    }
    m_batch->CloseCursor();

    // Set the active ScriptPubKeyMans
    for (auto spk_man_pair : wss.m_active_external_spks) {
        pwallet->LoadActiveScriptPubKeyMan(
            spk_man_pair.second, spk_man_pair.first, /* internal */ false);
    }
    for (auto spk_man_pair : wss.m_active_internal_spks) {
        pwallet->LoadActiveScriptPubKeyMan(
            spk_man_pair.second, spk_man_pair.first, /* internal */ true);
    }

    // Set the descriptor caches
    for (auto desc_cache_pair : wss.m_descriptor_caches) {
        auto spk_man = pwallet->GetScriptPubKeyMan(desc_cache_pair.first);
        assert(spk_man);
        ((DescriptorScriptPubKeyMan *)spk_man)
            ->SetCache(desc_cache_pair.second);
    }

    // Set the descriptor keys
    for (auto desc_key_pair : wss.m_descriptor_keys) {
        auto spk_man = pwallet->GetScriptPubKeyMan(desc_key_pair.first.first);
        ((DescriptorScriptPubKeyMan *)spk_man)
            ->AddKey(desc_key_pair.first.second, desc_key_pair.second);
    }
    for (auto desc_key_pair : wss.m_descriptor_crypt_keys) {
        auto spk_man = pwallet->GetScriptPubKeyMan(desc_key_pair.first.first);
        ((DescriptorScriptPubKeyMan *)spk_man)
            ->AddCryptedKey(desc_key_pair.first.second,
                            desc_key_pair.second.first,
                            desc_key_pair.second.second);
    }

    if (fNoncriticalErrors && result == DBErrors::LOAD_OK) {
        result = DBErrors::NONCRITICAL_ERROR;
    }

    // Any wallet corruption at all: skip any rewriting or upgrading, we don't
    // want to make it worse.
    if (result != DBErrors::LOAD_OK) {
        return result;
    }

    // Last client version to open this wallet, was previously the file version
    // number
    int last_client = CLIENT_VERSION;
    m_batch->Read(DBKeys::VERSION, last_client);

    int wallet_version = pwallet->GetVersion();
    pwallet->WalletLogPrintf("Wallet File Version = %d\n",
                             wallet_version > 0 ? wallet_version : last_client);

    pwallet->WalletLogPrintf("Keys: %u plaintext, %u encrypted, %u w/ "
                             "metadata, %u total. Unknown wallet records: %u\n",
                             wss.nKeys, wss.nCKeys, wss.nKeyMeta,
                             wss.nKeys + wss.nCKeys, wss.m_unknown_records);

    // nTimeFirstKey is only reliable if all keys have metadata
    if (pwallet->IsLegacy() &&
        (wss.nKeys + wss.nCKeys + wss.nWatchKeys) != wss.nKeyMeta) {
        auto spk_man = pwallet->GetOrCreateLegacyScriptPubKeyMan();
        if (spk_man) {
            LOCK(spk_man->cs_KeyStore);
            spk_man->UpdateTimeFirstKey(1);
        }
    }

    for (const TxId &txid : wss.vWalletUpgrade) {
        WriteTx(pwallet->mapWallet.at(txid));
    }

    // Rewrite encrypted wallets of versions 0.4.0 and 0.5.0rc:
    if (wss.fIsEncrypted && (last_client == 40000 || last_client == 50000)) {
        return DBErrors::NEED_REWRITE;
    }

    if (last_client < CLIENT_VERSION) {
        // Update
        m_batch->Write(DBKeys::VERSION, CLIENT_VERSION);
    }

    if (wss.fAnyUnordered) {
        result = pwallet->ReorderTransactions();
    }

    // Upgrade all of the wallet keymetadata to have the hd master key id
    // This operation is not atomic, but if it fails, updated entries are still
    // backwards compatible with older software
    try {
        pwallet->UpgradeKeyMetadata();
    } catch (...) {
        result = DBErrors::CORRUPT;
    }

    // Set the inactive chain
    if (wss.m_hd_chains.size() > 0) {
        LegacyScriptPubKeyMan *legacy_spkm =
            pwallet->GetLegacyScriptPubKeyMan();
        if (!legacy_spkm) {
            pwallet->WalletLogPrintf(
                "Inactive HD Chains found but no Legacy ScriptPubKeyMan\n");
            return DBErrors::CORRUPT;
        }
        for (const auto &chain_pair : wss.m_hd_chains) {
            if (chain_pair.first !=
                pwallet->GetLegacyScriptPubKeyMan()->GetHDChain().seed_id) {
                pwallet->GetLegacyScriptPubKeyMan()->AddInactiveHDChain(
                    chain_pair.second);
            }
        }
    }

    return result;
}

DBErrors WalletBatch::FindWalletTx(std::vector<TxId> &txIds,
                                   std::list<CWalletTx> &vWtx) {
    DBErrors result = DBErrors::LOAD_OK;

    try {
        int nMinVersion = 0;
        if (m_batch->Read(DBKeys::MINVERSION, nMinVersion)) {
            if (nMinVersion > FEATURE_LATEST) {
                return DBErrors::TOO_NEW;
            }
        }

        // Get cursor
        if (!m_batch->StartCursor()) {
            LogPrintf("Error getting wallet database cursor\n");
            return DBErrors::CORRUPT;
        }

        while (true) {
            // Read next record
            CDataStream ssKey(SER_DISK, CLIENT_VERSION);
            CDataStream ssValue(SER_DISK, CLIENT_VERSION);
            bool complete;
            bool ret = m_batch->ReadAtCursor(ssKey, ssValue, complete);
            if (complete) {
                break;
            }

            if (!ret) {
                m_batch->CloseCursor();
                LogPrintf("Error reading next record from wallet database\n");
                return DBErrors::CORRUPT;
            }

            std::string strType;
            ssKey >> strType;
            if (strType == DBKeys::TX) {
                TxId txid;
                ssKey >> txid;
                txIds.push_back(txid);
                vWtx.emplace_back(nullptr /* tx */);
                ssValue >> vWtx.back();
            }
        }
    } catch (...) {
        result = DBErrors::CORRUPT;
    }
    m_batch->CloseCursor();

    return result;
}

DBErrors WalletBatch::ZapSelectTx(std::vector<TxId> &txIdsIn,
                                  std::vector<TxId> &txIdsOut) {
    // Build list of wallet TXs and hashes.
    std::vector<TxId> txIds;
    std::list<CWalletTx> vWtx;
    DBErrors err = FindWalletTx(txIds, vWtx);
    if (err != DBErrors::LOAD_OK) {
        return err;
    }

    std::sort(txIds.begin(), txIds.end());
    std::sort(txIdsIn.begin(), txIdsIn.end());

    // Erase each matching wallet TX.
    bool delerror = false;
    std::vector<TxId>::iterator it = txIdsIn.begin();
    for (const TxId &txid : txIds) {
        while (it < txIdsIn.end() && (*it) < txid) {
            it++;
        }
        if (it == txIdsIn.end()) {
            break;
        }

        if ((*it) == txid) {
            if (!EraseTx(txid)) {
                LogPrint(BCLog::WALLETDB,
                         "Transaction was found for deletion but returned "
                         "database error: %s\n",
                         txid.GetHex());
                delerror = true;
            }
            txIdsOut.push_back(txid);
        }
    }

    if (delerror) {
        return DBErrors::CORRUPT;
    }
    return DBErrors::LOAD_OK;
}

void MaybeCompactWalletDB() {
    static std::atomic<bool> fOneThread;
    if (fOneThread.exchange(true)) {
        return;
    }

    for (const std::shared_ptr<CWallet> &pwallet : GetWallets()) {
        WalletDatabase &dbh = pwallet->GetDBHandle();

        unsigned int nUpdateCounter = dbh.nUpdateCounter;

        if (dbh.nLastSeen != nUpdateCounter) {
            dbh.nLastSeen = nUpdateCounter;
            dbh.nLastWalletUpdate = GetTime();
        }

        if (dbh.nLastFlushed != nUpdateCounter &&
            GetTime() - dbh.nLastWalletUpdate >= 2) {
            if (dbh.PeriodicFlush()) {
                dbh.nLastFlushed = nUpdateCounter;
            }
        }
    }

    fOneThread = false;
}

bool WalletBatch::WriteDestData(const CTxDestination &address,
                                const std::string &key,
                                const std::string &value) {
    if (!IsValidDestination(address)) {
        return false;
    }
    return WriteIC(
        std::make_pair(
            DBKeys::DESTDATA,
            std::make_pair(EncodeLegacyAddr(address, Params()), key)),
        value);
}

bool WalletBatch::EraseDestData(const CTxDestination &address,
                                const std::string &key) {
    if (!IsValidDestination(address)) {
        return false;
    }
    return EraseIC(std::make_pair(
        DBKeys::DESTDATA,
        std::make_pair(EncodeLegacyAddr(address, Params()), key)));
}

bool WalletBatch::WriteHDChain(const CHDChain &chain) {
    return WriteIC(DBKeys::HDCHAIN, chain);
}

bool WalletBatch::WriteWalletFlags(const uint64_t flags) {
    return WriteIC(DBKeys::FLAGS, flags);
}

bool WalletBatch::TxnBegin() {
    return m_batch->TxnBegin();
}

bool WalletBatch::TxnCommit() {
    return m_batch->TxnCommit();
}

bool WalletBatch::TxnAbort() {
    return m_batch->TxnAbort();
}

std::unique_ptr<WalletDatabase> MakeDatabase(const fs::path &path,
                                             const DatabaseOptions &options,
                                             DatabaseStatus &status,
                                             bilingual_str &error) {
    bool exists;
    try {
        exists = fs::symlink_status(path).type() != fs::file_type::not_found;
    } catch (const fs::filesystem_error &e) {
        error = Untranslated(strprintf(
            "Failed to access database path '%s': %s", fs::PathToString(path),
            fsbridge::get_filesystem_error_message(e)));
        status = DatabaseStatus::FAILED_BAD_PATH;
        return nullptr;
    }

    std::optional<DatabaseFormat> format;
    if (exists) {
        if (ExistsBerkeleyDatabase(path)) {
            format = DatabaseFormat::BERKELEY;
        }
    } else if (options.require_existing) {
        error = Untranslated(
            strprintf("Failed to load database path '%s'. Path does not exist.",
                      fs::PathToString(path)));
        status = DatabaseStatus::FAILED_NOT_FOUND;
        return nullptr;
    }

    if (!format && options.require_existing) {
        error = Untranslated(strprintf("Failed to load database path '%s'. "
                                       "Data is not in recognized format.",
                                       fs::PathToString(path)));
        status = DatabaseStatus::FAILED_BAD_FORMAT;
        return nullptr;
    }

    if (format && options.require_create) {
        error = Untranslated(strprintf(
            "Failed to create database path '%s'. Database already exists.",
            fs::PathToString(path)));
        status = DatabaseStatus::FAILED_ALREADY_EXISTS;
        return nullptr;
    }

    return MakeBerkeleyDatabase(path, options, status, error);
}

/**
 * Return object for accessing dummy database with no read/write capabilities.
 */
std::unique_ptr<WalletDatabase> CreateDummyWalletDatabase() {
    return std::make_unique<DummyDatabase>();
}

/** Return object for accessing temporary in-memory database. */
std::unique_ptr<WalletDatabase> CreateMockWalletDatabase() {
    return std::make_unique<BerkeleyDatabase>(
        std::make_shared<BerkeleyEnvironment>(), "");
}
