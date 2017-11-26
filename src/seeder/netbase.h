// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_SEEDER_NETBASE_H
#define BITCOIN_SEEDER_NETBASE_H

#include "compat.h"
#include "netaddress.h"
#include "serialize.h"

#include <string>
#include <vector>

extern int nConnectTimeout;

#ifdef WIN32
// In MSVC, this is defined as a macro, undefine it to prevent a compile and
// link error
#undef SetPort
#endif

bool SetProxy(enum Network net, CService addrProxy, int nSocksVersion = 5);
bool LookupHost(const char *pszName, std::vector<CNetAddr> &vIP,
                unsigned int nMaxSolutions = 0, bool fAllowLookup = true);
CService LookupNumeric(const char *pszName, int portDefault = 0);
bool ConnectSocket(const CService &addr, SOCKET &hSocketRet,
                   int nTimeout = nConnectTimeout);

#endif
