// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * This file exist for the sole purpose of avoiding link error with the
 * translate module. For some obscure reason, the seeder tests do not use the
 * regular boost test framework and instead had various fixtures dumped into one
 * of its test.
 */
#include <util/translation.h>

#include <functional>

const std::function<std::string(const char *)> G_TRANSLATION_FUN = nullptr;
