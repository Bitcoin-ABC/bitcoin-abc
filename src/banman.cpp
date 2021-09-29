// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <banman.h>

#include <netaddress.h>
#include <node/ui_interface.h>
#include <util/system.h>
#include <util/time.h>
#include <util/translation.h>

BanMan::BanMan(fs::path ban_file, const CChainParams &chainparams,
               CClientUIInterface *client_interface, int64_t default_ban_time)
    : m_client_interface(client_interface),
      m_ban_db(std::move(ban_file), chainparams),
      m_default_ban_time(default_ban_time) {
    if (m_client_interface) {
        m_client_interface->InitMessage(_("Loading banlist...").translated);
    }

    int64_t n_start = GetTimeMillis();
    m_is_dirty = false;
    banmap_t banmap;
    if (m_ban_db.Read(banmap)) {
        // thread save setter
        SetBanned(banmap);
        // no need to write down, just read data
        SetBannedSetDirty(false);
        // sweep out unused entries
        SweepBanned();

        LogPrint(BCLog::NET,
                 "Loaded %d banned node ips/subnets from banlist.dat  %dms\n",
                 m_banned.size(), GetTimeMillis() - n_start);
    } else {
        LogPrintf("Invalid or missing banlist.dat; recreating\n");
        // force write
        SetBannedSetDirty(true);
        DumpBanlist();
    }
}

BanMan::~BanMan() {
    DumpBanlist();
}

void BanMan::DumpBanlist() {
    // clean unused entries (if bantime has expired)
    SweepBanned();

    if (!BannedSetIsDirty()) {
        return;
    }

    int64_t n_start = GetTimeMillis();

    banmap_t banmap;
    GetBanned(banmap);
    if (m_ban_db.Write(banmap)) {
        SetBannedSetDirty(false);
    }

    LogPrint(BCLog::NET,
             "Flushed %d banned node ips/subnets to banlist.dat  %dms\n",
             banmap.size(), GetTimeMillis() - n_start);
}

void BanMan::ClearBanned() {
    {
        LOCK(m_cs_banned);
        m_discouraged.reset();
        m_banned.clear();
        m_is_dirty = true;
    }
    // store banlist to disk
    DumpBanlist();
    if (m_client_interface) {
        m_client_interface->BannedListChanged();
    }
}

bool BanMan::IsDiscouraged(const CNetAddr &net_addr) {
    LOCK(m_cs_banned);
    return m_discouraged.contains(net_addr.GetAddrBytes());
}

bool BanMan::IsBanned(const CNetAddr &net_addr) {
    auto current_time = GetTime();
    LOCK(m_cs_banned);
    for (const auto &it : m_banned) {
        CSubNet sub_net = it.first;
        CBanEntry ban_entry = it.second;

        if (current_time < ban_entry.nBanUntil && sub_net.Match(net_addr)) {
            return true;
        }
    }
    return false;
}

bool BanMan::IsBanned(const CSubNet &sub_net) {
    auto current_time = GetTime();
    LOCK(m_cs_banned);
    banmap_t::iterator i = m_banned.find(sub_net);
    if (i != m_banned.end()) {
        CBanEntry ban_entry = (*i).second;
        if (current_time < ban_entry.nBanUntil) {
            return true;
        }
    }
    return false;
}

void BanMan::Ban(const CNetAddr &net_addr, int64_t ban_time_offset,
                 bool since_unix_epoch) {
    CSubNet sub_net(net_addr);
    Ban(sub_net, ban_time_offset, since_unix_epoch);
}

void BanMan::Discourage(const CNetAddr &net_addr) {
    LOCK(m_cs_banned);
    m_discouraged.insert(net_addr.GetAddrBytes());
}

void BanMan::Ban(const CSubNet &sub_net, int64_t ban_time_offset,
                 bool since_unix_epoch) {
    CBanEntry ban_entry(GetTime());

    int64_t normalized_ban_time_offset = ban_time_offset;
    bool normalized_since_unix_epoch = since_unix_epoch;
    if (ban_time_offset <= 0) {
        normalized_ban_time_offset = m_default_ban_time;
        normalized_since_unix_epoch = false;
    }
    ban_entry.nBanUntil = (normalized_since_unix_epoch ? 0 : GetTime()) +
                          normalized_ban_time_offset;

    {
        LOCK(m_cs_banned);
        if (m_banned[sub_net].nBanUntil < ban_entry.nBanUntil) {
            m_banned[sub_net] = ban_entry;
            m_is_dirty = true;
        } else {
            return;
        }
    }
    if (m_client_interface) {
        m_client_interface->BannedListChanged();
    }

    // store banlist to disk immediately
    DumpBanlist();
}

bool BanMan::Unban(const CNetAddr &net_addr) {
    CSubNet sub_net(net_addr);
    return Unban(sub_net);
}

bool BanMan::Unban(const CSubNet &sub_net) {
    {
        LOCK(m_cs_banned);
        if (m_banned.erase(sub_net) == 0) {
            return false;
        }
        m_is_dirty = true;
    }
    if (m_client_interface) {
        m_client_interface->BannedListChanged();
    }

    // store banlist to disk immediately
    DumpBanlist();
    return true;
}

void BanMan::GetBanned(banmap_t &banmap) {
    LOCK(m_cs_banned);
    // Sweep the banlist so expired bans are not returned
    SweepBanned();
    // create a thread safe copy
    banmap = m_banned;
}

void BanMan::SetBanned(const banmap_t &banmap) {
    LOCK(m_cs_banned);
    m_banned = banmap;
    m_is_dirty = true;
}

void BanMan::SweepBanned() {
    int64_t now = GetTime();
    bool notify_ui = false;
    {
        LOCK(m_cs_banned);
        banmap_t::iterator it = m_banned.begin();
        while (it != m_banned.end()) {
            CSubNet sub_net = (*it).first;
            CBanEntry ban_entry = (*it).second;
            if (!sub_net.IsValid() || now > ban_entry.nBanUntil) {
                m_banned.erase(it++);
                m_is_dirty = true;
                notify_ui = true;
                LogPrint(
                    BCLog::NET,
                    "%s: Removed banned node ip/subnet from banlist.dat: %s\n",
                    __func__, sub_net.ToString());
            } else {
                ++it;
            }
        }
    }
    // update UI
    if (notify_ui && m_client_interface) {
        m_client_interface->BannedListChanged();
    }
}

bool BanMan::BannedSetIsDirty() {
    LOCK(m_cs_banned);
    return m_is_dirty;
}

void BanMan::SetBannedSetDirty(bool dirty) {
    // reuse m_banned lock for the m_is_dirty flag
    LOCK(m_cs_banned);
    m_is_dirty = dirty;
}
