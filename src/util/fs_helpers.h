// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_UTIL_FS_HELPERS_H
#define BITCOIN_UTIL_FS_HELPERS_H

#include <fs.h>

#include <cstdint>
#include <cstdio>
#include <iosfwd>
#include <limits>

bool FileCommit(FILE *file);
bool TruncateFile(FILE *file, unsigned int length);
int RaiseFileDescriptorLimit(int nMinFD);
void AllocateFileRange(FILE *file, unsigned int offset, unsigned int length);
[[nodiscard]] bool RenameOver(fs::path src, fs::path dest);
bool LockDirectory(const fs::path &directory, const std::string lockfile_name,
                   bool probe_only = false);
void UnlockDirectory(const fs::path &directory,
                     const std::string &lockfile_name);
bool DirIsWritable(const fs::path &directory);
bool CheckDiskSpace(const fs::path &dir, uint64_t additional_bytes = 0);

/**
 * Get the size of a file by scanning it.
 *
 * @param[in] path The file path
 * @param[in] max Stop seeking beyond this limit
 * @return The file size or max
 */
std::streampos
GetFileSize(const char *path,
            std::streamsize max = std::numeric_limits<std::streamsize>::max());

/**
 * Release all directory locks. This is used for unit testing only, at runtime
 * the global destructor will take care of the locks.
 */
void ReleaseDirectoryLocks();

bool TryCreateDirectories(const fs::path &p);
fs::path GetDefaultDataDir();

#ifdef WIN32
fs::path GetSpecialFolderPath(int nFolder, bool fCreate = true);
#endif

#endif // BITCOIN_UTIL_FS_HELPERS_H
