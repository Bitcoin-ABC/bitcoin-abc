// Copyright (c) 2017 The Bitcoin Core developers
// Copyright (c) 2019 The Devault developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// clang-format off
#pragma once

#include <stdio.h>
#include <string>

#if _cpp_lib_filesystem
#include <filesystem>
#define NO_BOOST_FILESYSTEM
#else
#include <boost/filesystem.hpp>
#include <boost/filesystem/detail/utf8_codecvt_facet.hpp>
#include <boost/filesystem/fstream.hpp>
#include <boost/filesystem/path.hpp>
#endif

#ifdef NO_BOOST_FILESYSTEM
namespace fs = std::filesystem;
#else
/** Filesystem operations and types */
namespace fs = boost::filesystem;
#endif

/** Bridge operations to C stdio */
namespace fsbridge {
FILE *fopen(const fs::path &p, const char *mode);
FILE *freopen(const fs::path &p, const char *mode, FILE *stream);
};

// clang-format on
