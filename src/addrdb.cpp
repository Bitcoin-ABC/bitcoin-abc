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

CBanDB::CBanDB(const CChainParams &chainParamsIn) : chainParams(chainParamsIn) {
    pathBanlist = GetDataDir() / "banlist.dat";
}

bool CBanDB::Write(const banmap_t &banSet) {
    // Generate random temporary filename
    unsigned short randv = 0;
    GetRandBytes((uint8_t *)&randv, sizeof(randv));
    std::string tmpfn = strprintf("banlist.dat.%04x", randv);

    // serialize banlist, checksum data up to that point, then append csum
    CDataStream ssBanlist(SER_DISK, CLIENT_VERSION);
    ssBanlist << FLATDATA(chainParams.DiskMagic());
    ssBanlist << banSet;
    uint256 hash = Hash(ssBanlist.begin(), ssBanlist.end());
    ssBanlist << hash;

    // open temp output file, and associate with CAutoFile
    fs::path pathTmp = GetDataDir() / tmpfn;
    FILE *file = fsbridge::fopen(pathTmp, "wb");
    CAutoFile fileout(file, SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull())
        return error("%s: Failed to open file %s", __func__, pathTmp.string());

    // Write and commit header, data
    try {
        fileout << ssBanlist;
    } catch (const std::exception &e) {
        return error("%s: Serialize or I/O error - %s", __func__, e.what());
    }
    FileCommit(fileout.Get());
    fileout.fclose();

    // replace existing banlist.dat, if any, with new banlist.dat.XXXX
    if (!RenameOver(pathTmp, pathBanlist))
        return error("%s: Rename-into-place failed", __func__);

    return true;
}

bool CBanDB::Read(banmap_t &banSet) {
    // open input file, and associate with CAutoFile
    FILE *file = fsbridge::fopen(pathBanlist, "rb");
    CAutoFile filein(file, SER_DISK, CLIENT_VERSION);
    if (filein.IsNull())
        return error("%s: Failed to open file %s", __func__,
                     pathBanlist.string());

    // use file size to size memory buffer
    uint64_t fileSize = fs::file_size(pathBanlist);
    uint64_t dataSize = 0;
    // Don't try to resize to a negative number if file is small
    if (fileSize >= sizeof(uint256)) dataSize = fileSize - sizeof(uint256);
    std::vector<uint8_t> vchData;
    vchData.resize(dataSize);
    uint256 hashIn;

    // read data and checksum from file
    try {
        filein.read((char *)&vchData[0], dataSize);
        filein >> hashIn;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }
    filein.fclose();

    CDataStream ssBanlist(vchData, SER_DISK, CLIENT_VERSION);

    // verify stored checksum matches input data
    uint256 hashTmp = Hash(ssBanlist.begin(), ssBanlist.end());
    if (hashIn != hashTmp)
        return error("%s: Checksum mismatch, data corrupted", __func__);

    uint8_t pchMsgTmp[4];
    try {
        // de-serialize file header (network specific magic number) and ..
        ssBanlist >> FLATDATA(pchMsgTmp);

        // ... verify the network matches ours
        if (memcmp(pchMsgTmp, std::begin(chainParams.DiskMagic()),
                   sizeof(pchMsgTmp))) {
            return error("%s: Invalid network magic number", __func__);
        }

        // de-serialize ban data
        ssBanlist >> banSet;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }

    return true;
}

CAddrDB::CAddrDB(const CChainParams &chainParamsIn)
    : chainParams(chainParamsIn) {
    pathAddr = GetDataDir() / "peers.dat";
}

bool CAddrDB::Write(const CAddrMan &addr) {
    // Generate random temporary filename
    unsigned short randv = 0;
    GetRandBytes((uint8_t *)&randv, sizeof(randv));
    std::string tmpfn = strprintf("peers.dat.%04x", randv);

    // serialize addresses, checksum data up to that point, then append csum
    CDataStream ssPeers(SER_DISK, CLIENT_VERSION);
    ssPeers << FLATDATA(chainParams.DiskMagic());
    ssPeers << addr;
    uint256 hash = Hash(ssPeers.begin(), ssPeers.end());
    ssPeers << hash;

    // open temp output file, and associate with CAutoFile
    fs::path pathTmp = GetDataDir() / tmpfn;
    FILE *file = fsbridge::fopen(pathTmp, "wb");
    CAutoFile fileout(file, SER_DISK, CLIENT_VERSION);
    if (fileout.IsNull())
        return error("%s: Failed to open file %s", __func__, pathTmp.string());

    // Write and commit header, data
    try {
        fileout << ssPeers;
    } catch (const std::exception &e) {
        return error("%s: Serialize or I/O error - %s", __func__, e.what());
    }
    FileCommit(fileout.Get());
    fileout.fclose();

    // replace existing peers.dat, if any, with new peers.dat.XXXX
    if (!RenameOver(pathTmp, pathAddr))
        return error("%s: Rename-into-place failed", __func__);

    return true;
}

bool CAddrDB::Read(CAddrMan &addr) {
    // open input file, and associate with CAutoFile
    FILE *file = fsbridge::fopen(pathAddr, "rb");
    CAutoFile filein(file, SER_DISK, CLIENT_VERSION);
    if (filein.IsNull())
        return error("%s: Failed to open file %s", __func__, pathAddr.string());

    // use file size to size memory buffer
    uint64_t fileSize = fs::file_size(pathAddr);
    uint64_t dataSize = 0;
    // Don't try to resize to a negative number if file is small
    if (fileSize >= sizeof(uint256)) dataSize = fileSize - sizeof(uint256);
    std::vector<uint8_t> vchData;
    vchData.resize(dataSize);
    uint256 hashIn;

    // read data and checksum from file
    try {
        filein.read((char *)&vchData[0], dataSize);
        filein >> hashIn;
    } catch (const std::exception &e) {
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }
    filein.fclose();

    CDataStream ssPeers(vchData, SER_DISK, CLIENT_VERSION);

    // verify stored checksum matches input data
    uint256 hashTmp = Hash(ssPeers.begin(), ssPeers.end());
    if (hashIn != hashTmp)
        return error("%s: Checksum mismatch, data corrupted", __func__);

    return Read(addr, ssPeers);
}

bool CAddrDB::Read(CAddrMan &addr, CDataStream &ssPeers) {
    uint8_t pchMsgTmp[4];
    try {
        // de-serialize file header (network specific magic number) and ..
        ssPeers >> FLATDATA(pchMsgTmp);

        // ... verify the network matches ours
        if (memcmp(pchMsgTmp, std::begin(chainParams.DiskMagic()),
                   sizeof(pchMsgTmp))) {
            return error("%s: Invalid network magic number", __func__);
        }

        // de-serialize address data into one CAddrMan object
        ssPeers >> addr;
    } catch (const std::exception &e) {
        // de-serialization has failed, ensure addrman is left in a clean state
        addr.Clear();
        return error("%s: Deserialize or I/O error - %s", __func__, e.what());
    }

    return true;
}
