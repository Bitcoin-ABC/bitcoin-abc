// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/fs_helpers.h>

#if defined(HAVE_CONFIG_H)
#include <config/bitcoin-config.h>
#endif

#include <fs.h>
#include <logging.h>
#include <sync.h>
#include <tinyformat.h>
#include <util/getuniquepath.h>

#include <cerrno>
#include <filesystem>
#include <fstream>
#include <map>
#include <memory>
#include <string>
#include <system_error>
#include <utility>

#ifndef WIN32
// for posix_fallocate, in config/CMakeLists.txt we check if it is present after
// this
#ifdef __linux__

#ifdef _POSIX_C_SOURCE
#undef _POSIX_C_SOURCE
#endif

#define _POSIX_C_SOURCE 200112L

#endif // __linux__

#include <fcntl.h>
#include <sys/resource.h>
#include <unistd.h>
#else
#include <io.h>     /* For _get_osfhandle, _chsize */
#include <shlobj.h> /* For SHGetSpecialFolderPathW */
#endif              // WIN32

/** Mutex to protect dir_locks. */
static GlobalMutex cs_dir_locks;
/**
 * A map that contains all the currently held directory locks. After successful
 * locking, these will be held here until the global destructor cleans them up
 * and thus automatically unlocks them, or ReleaseDirectoryLocks is called.
 */
static std::map<std::string, std::unique_ptr<fsbridge::FileLock>>
    dir_locks GUARDED_BY(cs_dir_locks);

bool LockDirectory(const fs::path &directory, const std::string lockfile_name,
                   bool probe_only) {
    LOCK(cs_dir_locks);
    fs::path pathLockFile = directory / lockfile_name;

    // If a lock for this directory already exists in the map, don't try to
    // re-lock it
    if (dir_locks.count(fs::PathToString(pathLockFile))) {
        return true;
    }

    // Create empty lock file if it doesn't exist.
    FILE *file = fsbridge::fopen(pathLockFile, "a");
    if (file) {
        fclose(file);
    }
    auto lock = std::make_unique<fsbridge::FileLock>(pathLockFile);
    if (!lock->TryLock()) {
        return error("Error while attempting to lock directory %s: %s",
                     fs::PathToString(directory), lock->GetReason());
    }
    if (!probe_only) {
        // Lock successful and we're not just probing, put it into the map
        dir_locks.emplace(fs::PathToString(pathLockFile), std::move(lock));
    }
    return true;
}

void UnlockDirectory(const fs::path &directory,
                     const std::string &lockfile_name) {
    LOCK(cs_dir_locks);
    dir_locks.erase(fs::PathToString(directory / lockfile_name));
}

void ReleaseDirectoryLocks() {
    LOCK(cs_dir_locks);
    dir_locks.clear();
}

bool DirIsWritable(const fs::path &directory) {
    fs::path tmpFile = GetUniquePath(directory);

    FILE *file = fsbridge::fopen(tmpFile, "a");
    if (!file) {
        return false;
    }

    fclose(file);
    remove(tmpFile);

    return true;
}

bool CheckDiskSpace(const fs::path &dir, uint64_t additional_bytes) {
    // 50 MiB
    constexpr uint64_t min_disk_space = 52428800;

    uint64_t free_bytes_available = fs::space(dir).available;
    return free_bytes_available >= min_disk_space + additional_bytes;
}

std::streampos GetFileSize(const char *path, std::streamsize max) {
    std::ifstream file{path, std::ios::binary};
    file.ignore(max);
    return file.gcount();
}

bool FileCommit(FILE *file) {
    // harmless if redundantly called
    if (fflush(file) != 0) {
        LogPrintf("%s: fflush failed: %d\n", __func__, errno);
        return false;
    }
#ifdef WIN32
    HANDLE hFile = (HANDLE)_get_osfhandle(_fileno(file));
    if (FlushFileBuffers(hFile) == 0) {
        LogPrintf("%s: FlushFileBuffers failed: %d\n", __func__,
                  GetLastError());
        return false;
    }
#else
#if defined(HAVE_FDATASYNC)
    // Ignore EINVAL for filesystems that don't support sync
    if (fdatasync(fileno(file)) != 0 && errno != EINVAL) {
        LogPrintf("%s: fdatasync failed: %d\n", __func__, errno);
        return false;
    }
#elif defined(MAC_OSX) && defined(F_FULLFSYNC)
    // Manpage says "value other than -1" is returned on success
    if (fcntl(fileno(file), F_FULLFSYNC, 0) == -1) {
        LogPrintf("%s: fcntl F_FULLFSYNC failed: %d\n", __func__, errno);
        return false;
    }
#else
    if (fsync(fileno(file)) != 0 && errno != EINVAL) {
        LogPrintf("%s: fsync failed: %d\n", __func__, errno);
        return false;
    }
#endif
#endif
    return true;
}

bool TruncateFile(FILE *file, unsigned int length) {
#if defined(WIN32)
    return _chsize(_fileno(file), length) == 0;
#else
    return ftruncate(fileno(file), length) == 0;
#endif
}

/**
 * This function tries to raise the file descriptor limit to the requested
 * number. It returns the actual file descriptor limit (which may be more or
 * less than nMinFD)
 */
int RaiseFileDescriptorLimit(int nMinFD) {
#if defined(WIN32)
    return 8192;
#else
    struct rlimit limitFD;
    if (getrlimit(RLIMIT_NOFILE, &limitFD) != -1) {
        if (limitFD.rlim_cur < (rlim_t)nMinFD) {
            limitFD.rlim_cur = nMinFD;
            if (limitFD.rlim_cur > limitFD.rlim_max) {
                limitFD.rlim_cur = limitFD.rlim_max;
            }
            setrlimit(RLIMIT_NOFILE, &limitFD);
            getrlimit(RLIMIT_NOFILE, &limitFD);
        }
        return limitFD.rlim_cur;
    }
    // getrlimit failed, assume it's fine.
    return nMinFD;
#endif
}

/**
 * This function tries to make a particular range of a file allocated
 * (corresponding to disk space) it is advisory, and the range specified in the
 * arguments will never contain live data.
 */
void AllocateFileRange(FILE *file, unsigned int offset, unsigned int length) {
#if defined(WIN32)
    // Windows-specific version.
    HANDLE hFile = (HANDLE)_get_osfhandle(_fileno(file));
    LARGE_INTEGER nFileSize;
    int64_t nEndPos = (int64_t)offset + length;
    nFileSize.u.LowPart = nEndPos & 0xFFFFFFFF;
    nFileSize.u.HighPart = nEndPos >> 32;
    SetFilePointerEx(hFile, nFileSize, 0, FILE_BEGIN);
    SetEndOfFile(hFile);
#elif defined(MAC_OSX)
    // OSX specific version
    // NOTE: Contrary to other OS versions, the OSX version assumes that
    // NOTE: offset is the size of the file.
    fstore_t fst;
    fst.fst_flags = F_ALLOCATECONTIG;
    fst.fst_posmode = F_PEOFPOSMODE;
    fst.fst_offset = 0;
    // mac os fst_length takes the number of free bytes to allocate,
    // not the desired file size
    fst.fst_length = length;
    fst.fst_bytesalloc = 0;
    if (fcntl(fileno(file), F_PREALLOCATE, &fst) == -1) {
        fst.fst_flags = F_ALLOCATEALL;
        fcntl(fileno(file), F_PREALLOCATE, &fst);
    }
    ftruncate(fileno(file), static_cast<off_t>(offset) + length);
#elif defined(HAVE_POSIX_FALLOCATE)
    // Version using posix_fallocate
    off_t nEndPos = (off_t)offset + length;
    posix_fallocate(fileno(file), 0, nEndPos);
#else
    // Fallback version
    // TODO: just write one byte per block
    static const char buf[65536] = {};
    if (fseek(file, offset, SEEK_SET)) {
        return;
    }
    while (length > 0) {
        unsigned int now = 65536;
        if (length < now) {
            now = length;
        }
        // Allowed to fail; this function is advisory anyway.
        fwrite(buf, 1, now, file);
        length -= now;
    }
#endif
}

#ifdef WIN32
fs::path GetSpecialFolderPath(int nFolder, bool fCreate) {
    WCHAR pszPath[MAX_PATH] = L"";

    if (SHGetSpecialFolderPathW(nullptr, pszPath, nFolder, fCreate)) {
        return fs::path(pszPath);
    }

    LogPrintf(
        "SHGetSpecialFolderPathW() failed, could not obtain requested path.\n");
    return fs::path("");
}
#endif

bool RenameOver(fs::path src, fs::path dest) {
#ifdef WIN32
    return MoveFileExW(src.wstring().c_str(), dest.wstring().c_str(),
                       MOVEFILE_REPLACE_EXISTING) != 0;
#else
    int rc = std::rename(src.c_str(), dest.c_str());
    return (rc == 0);
#endif /* WIN32 */
}

/**
 * Ignores exceptions thrown by create_directories if the requested
 * directory exists. Specifically handles case where path p exists, but it
 * wasn't possible for the user to write to the parent directory.
 */
bool TryCreateDirectories(const fs::path &p) {
    try {
        return fs::create_directories(p);
    } catch (const fs::filesystem_error &) {
        if (!fs::exists(p) || !fs::is_directory(p)) {
            throw;
        }
    }

    // create_directory didn't create the directory, it had to have existed
    // already.
    return false;
}
