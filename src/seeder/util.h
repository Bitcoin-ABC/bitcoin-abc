// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_UTIL_H
#define BITCOIN_SEEDER_UTIL_H

#include <span.h>

#define BEGIN(a) BytePtr(&(a))
#define END(a) BytePtr(&((&(a))[1]))

#endif // BITCOIN_SEEDER_UTIL_H
