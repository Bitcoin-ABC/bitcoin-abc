// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <policy/settings.h>

#include <feerate.h>

bool fIsBareMultisigStd = DEFAULT_PERMIT_BAREMULTISIG;
CFeeRate dustRelayFee = CFeeRate(DUST_RELAY_TX_FEE);
uint32_t nBytesPerSigCheck = DEFAULT_BYTES_PER_SIGCHECK;
