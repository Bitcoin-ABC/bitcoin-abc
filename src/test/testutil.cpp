// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "testutil.h"
#include "fs.h"

#ifdef WIN32
#include <shlobj.h>
#endif

fs::path GetTempPath() {
    return fs::temp_directory_path();
}
