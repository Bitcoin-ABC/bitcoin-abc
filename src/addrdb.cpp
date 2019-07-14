// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <addrdb.h>

#include <addrman.h>
#include <chainparams.h>
#include <clientversion.h>
#include <fs.h>
#include <hash.h>
#include <random.h>
#include <streams.h>
#include <tinyformat.h>
#include <util.h>

namespace {

template <typename Stream, typename Data>
bool SerializeDB(const CChainParams &chainParams, Stream &stream,
                 const Data &data) {
    // Write and commit header, data
    try {
        CHashWriter hasher(SER_DISK, CLIENT_VERSION);
        stream << FLATDATA(chainParams.DiskMagic()) << data;
        hasher << FLATDATA(chainParams.DiskMagic()) << data;
        stream << hasher.GetHash();
    } catch (const std::exception &e) {
        return error("%s: Serialize or I/O error - %s", __func__, e.what());
    }

    return true;
}

template <typename Data>
bool SerializeFileDB(const CChainParams &chainParams, const std::string &prefix,
                     const fs::path &path, const Data &data) {
    // Generate random temporary filename
    unsigned short randv = 0;
    GetRandBytes((uint8_t *)&randv, sizeof(randv));
    std::string tmpfn = strprintf("%s.%04x", prefix, randv);

    // open temp output file, and associate with CAutoFile
    fs::path pathTmp = GetDataDir() / tmpfn;
    FILE *file = fsbridge::fopen(pathTmp, "wb");
    CAutoFile fileout(file, SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull()) {
        return error("%s: Failed to open file %s", __func__, pathTmp.string());
    }

    // Serialize
    if (!SerializeDB(chainParams, fileout, data)) {
        return false;
    }
    if (!FileCommit(fileout.Get())) {
        return error("%s: Failed to flush file %s", __func__, pathTmp.string());
    }
    fileout.fclose();

    // replace existing file, if any, with new file
    if (!RenameOver(pathTmp, path)) {
        return error("%s: Rename-into-place failed", __func__);
    }

    return true;
}

template <typename Stream, typename Data>
bool DeserializeDB(const CChainParams &chainParams, Stream &stream, Data &data,
                   bool fCheckSum = true) {
    try {
        CHashVerifier<Stream> verifier(&stream);
        // de-serialize file header (network specific magic number) and ..
        uint8_t pchMsgTmp[4];
        verifier >> FLATDATA(pchMsgTmp);
        // ... verify the network matches ours
        if (memcmp(pchMsgTmp, std::begin(chainParams.DiskMagic()),
                   sizeof(pchMsgTmp))) {
            return error("%s: Invalid network magic number", __func__);
        }

        // de-serialize data
        verifier >> data;

        // verify checksum
        if (fCheckSum) {
            uint256 hashTmp;
            stream >> hashTmp;
            if (hashTmp != verifier.GetHash()) {
                return error("%s: Checksum mismatch, data corrupted", __func__);
            }
        }
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }

    return true;
}

template <typename Data>
bool DeserializeFileDB(const CChainParams &chainParams, const fs::path &path,
                       Data &data) {
    // open input file, and associate with CAutoFile
    FILE *file = fsbridge::fopen(path, "rb");
    CAutoFile filein(file, SER_DISK, CLIENT_VERSION);
    if (filein.IsNull()) {
        return error("%s: Failed to open file %s", __func__, path.string());
    }

    return DeserializeDB(chainParams, filein, data);
}

} // namespace

CBanDB::CBanDB(const CChainParams &chainParamsIn) : chainParams(chainParamsIn) {
    pathBanlist = GetDataDir() / "banlist.dat";
}

bool CBanDB::Write(const banmap_t &banSet) {
    return SerializeFileDB(chainParams, "banlist", pathBanlist, banSet);
}

bool CBanDB::Read(banmap_t &banSet) {
    return DeserializeFileDB(chainParams, pathBanlist, banSet);
}

CAddrDB::CAddrDB(const CChainParams &chainParamsIn)
    : chainParams(chainParamsIn) {
    pathAddr = GetDataDir() / "peers.dat";
}

bool CAddrDB::Write(const CAddrMan &addr) {
    return SerializeFileDB(chainParams, "peers", pathAddr, addr);
}

bool CAddrDB::Read(CAddrMan &addr) {
    return DeserializeFileDB(chainParams, pathAddr, addr);
}

bool CAddrDB::Read(CAddrMan &addr, CDataStream &ssPeers) {
    bool ret = DeserializeDB(chainParams, ssPeers, addr, false);
    if (!ret) {
        // Ensure addrman is left in a clean state
        addr.Clear();
    }
    return ret;
}
