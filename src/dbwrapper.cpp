// Copyright (c) 2012-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "dbwrapper.h"

#include "random.h"
#include "util.h"

#include "fs.h"

#include <algorithm>
#include <cstdint>

#ifdef USE_ROCKSDB
#include <rocksdb/cache.h>
#include <rocksdb/env.h>
#include <rocksdb/filter_policy.h>
#include <rocksdb/utilities/leveldb_options.h>
#else
#include <leveldb/cache.h>
#include <leveldb/env.h>
#include <leveldb/filter_policy.h>
#include <memenv.h>
#endif

class CBitcoinLevelDBLogger : public datadb::Logger {
public:
    // This code is adapted from posix_logger.h, which is why it is using
    // vsprintf.
    // Please do not do this in normal code
    void Logv(const char *format, va_list ap) override {
        if (!LogAcceptCategory(BCLog::LEVELDB)) {
            return;
        }
        char buffer[500];
        for (int iter = 0; iter < 2; iter++) {
            char *base;
            int bufsize;
            if (iter == 0) {
                bufsize = sizeof(buffer);
                base = buffer;
            } else {
                bufsize = 30000;
                base = new char[bufsize];
            }
            char *p = base;
            char *limit = base + bufsize;

            // Print the message
            if (p < limit) {
                va_list backup_ap;
                va_copy(backup_ap, ap);
                // Do not use vsnprintf elsewhere in bitcoin source code, see
                // above.
                p += vsnprintf(p, limit - p, format, backup_ap);
                va_end(backup_ap);
            }

            // Truncate to available space if necessary
            if (p >= limit) {
                if (iter == 0) {
                    continue; // Try again with larger buffer
                } else {
                    p = limit - 1;
                }
            }

            // Add newline if necessary
            if (p == base || p[-1] != '\n') {
                *p++ = '\n';
            }

            assert(p <= limit);
            base[std::min(bufsize - 1, (int)(p - base))] = '\0';
            LogPrintf("leveldb: %s", base);
            if (base != buffer) {
                delete[] base;
            }
            break;
        }
    }
};

static datadb::Options GetOptions(size_t nCacheSize) {
#ifdef USE_ROCKSDB
  datadb::LevelDBOptions opt;
  // opt.block_cache = datadb::NewLRUCache(nCacheSize / 2);
  opt.write_buffer_size = nCacheSize / 4;  // up to two write buffers may be held in memory simultaneously
  opt.filter_policy = datadb::NewBloomFilterPolicy(10);
  opt.compression = datadb::kNoCompression;
  opt.max_open_files = 64;
  datadb::Options datadb_options = ConvertOptions(opt);
  datadb_options.avoid_flush_during_shutdown = true;
  datadb_options.enable_thread_tracking = true;
  datadb_options.IncreaseParallelism();
  datadb_options.OptimizeLevelStyleCompaction();
  return datadb_options;
#else
  datadb::Options options;
  options.block_cache = datadb::NewLRUCache(nCacheSize / 2);
  // up to two write buffers may be held in memory simultaneously
  options.write_buffer_size = nCacheSize / 4;
  options.filter_policy = datadb::NewBloomFilterPolicy(10);
  options.compression = datadb::kNoCompression;
  options.max_open_files = 64;
  options.info_log = new CBitcoinLevelDBLogger();
  if (datadb::kMajorVersion > 1 ||
      (datadb::kMajorVersion == 1 && datadb::kMinorVersion >= 16)) {
    // LevelDB versions before 1.16 consider short writes to be corruption.
    // Only trigger error on corruption in later versions.
    options.paranoid_checks = true;
  }
  return options;
#endif
}

CDBWrapper::CDBWrapper(const fs::path &path, size_t nCacheSize, bool fMemory,
                       bool fWipe, bool obfuscate) {
    penv = nullptr;
    readoptions.verify_checksums = true;
    iteroptions.verify_checksums = true;
    iteroptions.fill_cache = false;
    syncoptions.sync = true;
    options = GetOptions(nCacheSize);
    options.create_if_missing = true;
    if (fMemory) {
        penv = datadb::NewMemEnv(datadb::Env::Default());
        options.env = penv;
    } else {
        if (fWipe) {
            LogPrintf("Wiping LevelDB in %s\n", path.string());
            datadb::Status result = datadb::DestroyDB(path.string(), options);
            dbwrapper_private::HandleError(result);
        }
        TryCreateDirectories(path);
        LogPrintf("Opening LevelDB in %s\n", path.string());
    }
    datadb::Status status = datadb::DB::Open(options, path.string(), &pdb);
    dbwrapper_private::HandleError(status);
    LogPrintf("Opened LevelDB successfully\n");

    if (gArgs.GetBoolArg("-forcecompactdb", false)) {
        LogPrintf("Starting database compaction of %s\n", path.string());
        pdb->CompactRange(nullptr, nullptr);
        LogPrintf("Finished database compaction of %s\n", path.string());
    }

    // The base-case obfuscation key, which is a noop.
    obfuscate_key = std::vector<uint8_t>(OBFUSCATE_KEY_NUM_BYTES, '\000');

    bool key_exists = Read(OBFUSCATE_KEY_KEY, obfuscate_key);

    if (!key_exists && obfuscate && IsEmpty()) {
        // Initialize non-degenerate obfuscation if it won't upset existing,
        // non-obfuscated data.
        std::vector<uint8_t> new_key = CreateObfuscateKey();

        // Write `new_key` so we don't obfuscate the key with itself
        Write(OBFUSCATE_KEY_KEY, new_key);
        obfuscate_key = new_key;

        LogPrintf("Wrote new obfuscate key for %s: %s\n", path.string(),
                  HexStr(obfuscate_key));
    }

    LogPrintf("Using obfuscation key for %s: %s\n", path.string(),
              HexStr(obfuscate_key));
}

CDBWrapper::~CDBWrapper() {
    delete pdb;
    pdb = nullptr;
#ifdef USE_ROCKSDB
#else
    delete options.filter_policy;
    options.filter_policy = nullptr;
    delete options.info_log;
    options.info_log = nullptr;
    delete options.block_cache;
    options.block_cache = nullptr;
#endif
    delete penv;
    options.env = nullptr;
}

bool CDBWrapper::WriteBatch(CDBBatch &batch, bool fSync) {
    datadb::Status status =
        pdb->Write(fSync ? syncoptions : writeoptions, &batch.batch);
    dbwrapper_private::HandleError(status);
    return true;
}

// Prefixed with null character to avoid collisions with other keys
//
// We must use a string constructor which specifies length so that we copy past
// the null-terminator.
const std::string CDBWrapper::OBFUSCATE_KEY_KEY("\000obfuscate_key", 14);

const unsigned int CDBWrapper::OBFUSCATE_KEY_NUM_BYTES = 8;

/**
 * Returns a string (consisting of 8 random bytes) suitable for use as an
 * obfuscating XOR key.
 */
std::vector<uint8_t> CDBWrapper::CreateObfuscateKey() const {
    uint8_t buff[OBFUSCATE_KEY_NUM_BYTES];
    GetRandBytes(buff, OBFUSCATE_KEY_NUM_BYTES);
    return std::vector<uint8_t>(&buff[0], &buff[OBFUSCATE_KEY_NUM_BYTES]);
}

bool CDBWrapper::IsEmpty() {
    std::unique_ptr<CDBIterator> it(NewIterator());
    it->SeekToFirst();
    return !(it->Valid());
}

CDBIterator::~CDBIterator() {
    delete piter;
}
bool CDBIterator::Valid() const {
    return piter->Valid();
}
void CDBIterator::SeekToFirst() {
    piter->SeekToFirst();
}
void CDBIterator::Next() {
    piter->Next();
}

namespace dbwrapper_private {

void HandleError(const datadb::Status &status) {
    if (status.ok()) {
        return;
    }
    LogPrintf("%s\n", status.ToString());
    if (status.IsCorruption()) {
        throw dbwrapper_error("Database corrupted");
    }
    if (status.IsIOError()) {
        throw dbwrapper_error("Database I/O error");
    }
    if (status.IsNotFound()) {
        throw dbwrapper_error("Database entry missing");
    }
    throw dbwrapper_error("Unknown database error");
}

const std::vector<uint8_t> &GetObfuscateKey(const CDBWrapper &w) {
    return w.obfuscate_key;
}
}; // namespace dbwrapper_private
