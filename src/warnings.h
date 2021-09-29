// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WARNINGS_H
#define BITCOIN_WARNINGS_H

#include <string>

struct bilingual_str;

void SetMiscWarning(const bilingual_str &strWarning);

void SetfLargeWorkForkFound(bool flag);
bool GetfLargeWorkForkFound();
void SetfLargeWorkInvalidChainFound(bool flag);
/**
 * Format a string that describes several potential problems detected by the
 * core.
 * @param[in] verbose bool
 * - if true, get all warnings separated by <hr />
 * - if false, get the most important warning
 * @returns the warning string
 * This function only returns the highest priority warning of the set selected
 * by strFor.
 */
bilingual_str GetWarnings(bool verbose);

#endif // BITCOIN_WARNINGS_H
