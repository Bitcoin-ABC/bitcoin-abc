// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_ADDRDB_H
#define BITCOIN_ADDRDB_H

#include <net_types.h>
#include <serialize.h>
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
};

/** Access to the banlist database (banlist.dat) */
class CBanDB {
private:
    const fs::path m_ban_list_path;
    const CChainParams &chainParams;

public:
    CBanDB(fs::path ban_list_path, const CChainParams &_chainParams);
    bool Write(const banmap_t &banSet);
    bool Read(banmap_t &banSet);
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
