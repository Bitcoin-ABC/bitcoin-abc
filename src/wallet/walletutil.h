// Copyright (c) 2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_WALLETUTIL_H
#define BITCOIN_WALLET_WALLETUTIL_H

#include <fs.h>
#include <script/descriptor.h>

#include <vector>

/** (client) version numbers for particular wallet features */
enum WalletFeature {
    // the earliest version new wallets supports (only useful for
    // getwalletinfo's clientversion output)
    FEATURE_BASE = 10500,

    // wallet encryption
    FEATURE_WALLETCRYPT = 40000,
    // compressed public keys
    FEATURE_COMPRPUBKEY = 60000,

    // Hierarchical key derivation after BIP32 (HD Wallet)
    FEATURE_HD = 130000,

    // Wallet with HD chain split (change outputs will use m/0'/1'/k)
    FEATURE_HD_SPLIT = 160300,

    // Wallet without a default key written
    FEATURE_NO_DEFAULT_KEY = 190700,

    // Upgraded to HD SPLIT and can have a pre-split keypool
    FEATURE_PRE_SPLIT_KEYPOOL = 200300,

    FEATURE_LATEST = FEATURE_PRE_SPLIT_KEYPOOL,
};

enum WalletFlags : uint64_t {
    // Wallet flags in the upper section (> 1 << 31) will lead to not opening
    // the wallet if flag is unknown.
    // Unknown wallet flags in the lower section <= (1 << 31) will be tolerated.

    // will categorize coins as clean (not reused) and dirty (reused), and
    // handle
    // them with privacy considerations in mind
    WALLET_FLAG_AVOID_REUSE = (1ULL << 0),

    // Indicates that the metadata has already been upgraded to contain key
    // origins
    WALLET_FLAG_KEY_ORIGIN_METADATA = (1ULL << 1),

    // Will enforce the rule that the wallet can't contain any private keys
    // (only watch-only/pubkeys).
    WALLET_FLAG_DISABLE_PRIVATE_KEYS = (1ULL << 32),

    //! Flag set when a wallet contains no HD seed and no private keys, scripts,
    //! addresses, and other watch only things, and is therefore "blank."
    //!
    //! The only function this flag serves is to distinguish a blank wallet from
    //! a newly created wallet when the wallet database is loaded, to avoid
    //! initialization that should only happen on first run.
    //!
    //! This flag is also a mandatory flag to prevent previous versions of
    //! bitcoin from opening the wallet, thinking it was newly created, and
    //! then improperly reinitializing it.
    WALLET_FLAG_BLANK_WALLET = (1ULL << 33),

    //! Indicate that this wallet supports DescriptorScriptPubKeyMan
    WALLET_FLAG_DESCRIPTORS = (1ULL << 34),
};

//! Get the path of the wallet directory.
fs::path GetWalletDir();

//! Get wallets in wallet directory.
std::vector<fs::path> ListWalletDir();

/** Descriptor with some wallet metadata */
class WalletDescriptor {
public:
    std::shared_ptr<Descriptor> descriptor;
    uint64_t creation_time = 0;
    // First item in range; start of range, inclusive, i.e.
    // [range_start, range_end). This never changes.
    int32_t range_start = 0;
    // Item after the last; end of range, exclusive, i.e.
    // [range_start, range_end). This will increment with each TopUp()
    int32_t range_end = 0;
    // Position of the next item to generate
    int32_t next_index = 0;
    DescriptorCache cache;

    void DeserializeDescriptor(const std::string &str) {
        std::string error;
        FlatSigningProvider keys;
        descriptor = Parse(str, keys, error, true);
        if (!descriptor) {
            throw std::ios_base::failure("Invalid descriptor: " + error);
        }
    }

    SERIALIZE_METHODS(WalletDescriptor, obj) {
        std::string descriptor_str;
        SER_WRITE(obj, descriptor_str = obj.descriptor->ToString());
        READWRITE(descriptor_str, obj.creation_time, obj.next_index,
                  obj.range_start, obj.range_end);
        SER_READ(obj, obj.DeserializeDescriptor(descriptor_str));
    }

    WalletDescriptor() {}
    WalletDescriptor(std::shared_ptr<Descriptor> descriptor_,
                     uint64_t creation_time_, int32_t range_start_,
                     int32_t range_end_, int32_t next_index_)
        : descriptor(descriptor_), creation_time(creation_time_),
          range_start(range_start_), range_end(range_end_),
          next_index(next_index_) {}
};

#endif // BITCOIN_WALLET_WALLETUTIL_H
