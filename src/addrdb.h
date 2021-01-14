// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ADDRDB_H
#define BITCOIN_ADDRDB_H

#include <net_types.h>
#include <serialize.h>
#include <univalue.h>
#include <util/fs.h>
#include <util/result.h>

#include <memory>
#include <string>
#include <vector>

class ArgsManager;
class AddrMan;
class CAddress;
class CDataStream;
class CChainParams;

bool DumpPeerAddresses(const CChainParams &chainParams, const ArgsManager &args,
                       const AddrMan &addr);
/** Only used by tests. */
void ReadFromStream(const CChainParams &chainParams, AddrMan &addr,
                    CDataStream &ssPeers);

class CBanEntry {
public:
    static const int CURRENT_VERSION = 1;
    int nVersion;
    int64_t nCreateTime;
    int64_t nBanUntil;

    CBanEntry() { SetNull(); }

    explicit CBanEntry(int64_t nCreateTimeIn) {
        SetNull();
        nCreateTime = nCreateTimeIn;
    }

    /**
     * Create a ban entry from JSON.
     * @param[in] json A JSON representation of a ban entry, as created by
     * `ToJson()`.
     * @throw std::runtime_error if the JSON does not have the expected fields.
     */
    explicit CBanEntry(const UniValue &json);

    SERIALIZE_METHODS(CBanEntry, obj) {
        //! For backward compatibility
        uint8_t ban_reason = 2;
        READWRITE(obj.nVersion, obj.nCreateTime, obj.nBanUntil, ban_reason);
    }

    void SetNull() {
        nVersion = CBanEntry::CURRENT_VERSION;
        nCreateTime = 0;
        nBanUntil = 0;
    }

    /**
     * Generate a JSON representation of this ban entry.
     * @return JSON suitable for passing to the `CBanEntry(const UniValue&)`
     * constructor.
     */
    UniValue ToJson() const;
};

/** Access to the banlist databases (banlist.json and banlist.dat) */
class CBanDB {
private:
    /**
     * JSON key under which the data is stored in the json database.
     */
    static constexpr const char *JSON_KEY = "banned_nets";

    const fs::path m_banlist_dat;
    const fs::path m_banlist_json;
    const CChainParams &chainParams;

public:
    CBanDB(fs::path ban_list_path, const CChainParams &_chainParams);
    bool Write(const banmap_t &banSet);

    /**
     * Read the banlist from disk.
     * @param[out] banSet The loaded list. Set if `true` is returned, otherwise
     *     it is left in an undefined state.
     * @param[out] dirty Indicates whether the loaded list needs flushing to
     *     disk. Set if `true` is returned, otherwise it is left in an
     *     undefined state.
     * @return true on success
     */
    bool Read(banmap_t &banSet, bool &dirty);
};

/** Returns an error string on failure */
util::Result<std::unique_ptr<AddrMan>>
LoadAddrman(const CChainParams &chainparams, const std::vector<bool> &asmap,
            const ArgsManager &args);

/**
 * Dump the anchor IP address database (anchors.dat)
 *
 * Anchors are last known outgoing block-relay-only peers that are
 * tried to re-connect to on startup.
 */
void DumpAnchors(const CChainParams &chainParams,
                 const fs::path &anchors_db_path,
                 const std::vector<CAddress> &anchors);

/**
 * Read the anchor IP address database (anchors.dat)
 *
 * Deleting anchors.dat is intentional as it avoids renewed peering to anchors
 * after an unclean shutdown and thus potential exploitation of the anchor peer
 * policy.
 */
std::vector<CAddress> ReadAnchors(const CChainParams &chainParams,
                                  const fs::path &anchors_db_path);

#endif // BITCOIN_ADDRDB_H
