// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_ISMINE_H
#define BITCOIN_SCRIPT_ISMINE_H

#include <script/standard.h>

#include <bitset>
#include <cstdint>

class CKeyStore;
class CScript;

/** IsMine() return codes */
enum isminetype {
    ISMINE_NO = 0,
    ISMINE_WATCH_ONLY = 1 << 0,
    ISMINE_SPENDABLE = 1 << 1,
    ISMINE_ALL = ISMINE_WATCH_ONLY | ISMINE_SPENDABLE,
    ISMINE_ENUM_ELEMENTS,
};

/** used for bitflags of isminetype */
typedef uint8_t isminefilter;

/**
 * isInvalid becomes true when the script is found invalid by consensus or
 * policy. This will terminate the recursion and return ISMINE_NO immediately,
 * as an invalid script should never be considered as "mine". Currently the only
 * use of isInvalid is for P2SH-inside-P2SH scripts (as a technicality, to
 * prevent infinite recursion).
 */
isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey,
                  bool &isInvalid);
isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey);
isminetype IsMine(const CKeyStore &keystore, const CTxDestination &dest);

/**
 * Cachable amount subdivided into watchonly and spendable parts.
 */
struct CachableAmount {
    // NO and ALL are never (supposed to be) cached
    std::bitset<ISMINE_ENUM_ELEMENTS> m_cached;
    Amount m_value[ISMINE_ENUM_ELEMENTS];
    inline void Reset() { m_cached.reset(); }
    void Set(isminefilter filter, Amount value) {
        m_cached.set(filter);
        m_value[filter] = value;
    }
};

#endif // BITCOIN_SCRIPT_ISMINE_H
