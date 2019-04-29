// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SCRIPT_ISMINE_H
#define BITCOIN_SCRIPT_ISMINE_H

#include <script/standard.h>

#include <cstdint>

class CKeyStore;
class CScript;

/** IsMine() return codes */
enum isminetype {
    ISMINE_NO = 0,
    //! Indicates that we don't know how to create a scriptSig that would solve
    //! this if we were given the appropriate private keys
    ISMINE_WATCH_UNSOLVABLE = 1,
    //! Indicates that we know how to create a scriptSig that would solve this
    //! if we were given the appropriate private keys
    ISMINE_WATCH_SOLVABLE = 2,
    ISMINE_WATCH_ONLY = ISMINE_WATCH_SOLVABLE | ISMINE_WATCH_UNSOLVABLE,
    ISMINE_SPENDABLE = 4,
    ISMINE_ALL = ISMINE_WATCH_ONLY | ISMINE_SPENDABLE
};

/** used for bitflags of isminetype */
typedef uint8_t isminefilter;

/**
 * isInvalid becomes true when the script is found invalid by consensus or
 * policy. This will terminate the recursion and return a ISMINE_NO immediately,
 * as an invalid script should never be considered as "mine". Currently the only
 * use of isInvalid is indicate uncompressed keys when
 * SCRIPT_VERIFY_COMPRESSED_PUBKEYTYPE is specified, but could also be used in
 * similar cases in the future.
 */
isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey,
                  bool &isInvalid);
isminetype IsMine(const CKeyStore &keystore, const CScript &scriptPubKey);
isminetype IsMine(const CKeyStore &keystore, const CTxDestination &dest,
                  bool &isInvalid);
isminetype IsMine(const CKeyStore &keystore, const CTxDestination &dest);

#endif // BITCOIN_SCRIPT_ISMINE_H
