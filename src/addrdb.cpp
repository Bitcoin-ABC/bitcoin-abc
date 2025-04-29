// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <addrdb.h>

#include <addrman.h>
#include <chainparams.h>
#include <clientversion.h>
#include <common/args.h>
#include <hash.h>
#include <logging.h>
#include <logging/timer.h>
#include <random.h>
#include <streams.h>
#include <tinyformat.h>
#include <util/fs.h>
#include <util/fs_helpers.h>
#include <util/translation.h>

#include <cstdint>

namespace {

class DbNotFoundError : public std::exception {
    using std::exception::exception;
};

template <typename Stream, typename Data>
bool SerializeDB(const CChainParams &chainParams, Stream &stream,
                 const Data &data) {
    // Write and commit header, data
    try {
        HashedSourceWriter hashwriter{stream};
        hashwriter << chainParams.DiskMagic() << data;
        stream << hashwriter.GetHash();
    } catch (const std::exception &e) {
        return error("%s: Serialize or I/O error - %s", __func__, e.what());
    }

    return true;
}

template <typename Data>
bool SerializeFileDB(const CChainParams &chainParams, const std::string &prefix,
                     const fs::path &path, const Data &data, int version) {
    // Generate random temporary filename
    const uint16_t randv{GetRand<uint16_t>()};
    std::string tmpfn = strprintf("%s.%04x", prefix, randv);

    // open temp output file, and associate with CAutoFile
    fs::path pathTmp = gArgs.GetDataDirNet() / tmpfn;
    FILE *file = fsbridge::fopen(pathTmp, "wb");
    CAutoFile fileout(file, SER_DISK, version);
    if (fileout.IsNull()) {
        fileout.fclose();
        remove(pathTmp);
        return error("%s: Failed to open file %s", __func__,
                     fs::PathToString(pathTmp));
    }

    // Serialize
    if (!SerializeDB(chainParams, fileout, data)) {
        fileout.fclose();
        remove(pathTmp);
        return false;
    }
    if (!FileCommit(fileout.Get())) {
        fileout.fclose();
        remove(pathTmp);
        return error("%s: Failed to flush file %s", __func__,
                     fs::PathToString(pathTmp));
    }
    fileout.fclose();

    // replace existing file, if any, with new file
    if (!RenameOver(pathTmp, path)) {
        remove(pathTmp);
        return error("%s: Rename-into-place failed", __func__);
    }

    return true;
}

template <typename Stream, typename Data>
void DeserializeDB(const CChainParams &chainParams, Stream &stream, Data &data,
                   bool fCheckSum = true) {
    CHashVerifier<Stream> verifier(&stream);
    // de-serialize file header (network specific magic number) and ..
    uint8_t pchMsgTmp[4];
    verifier >> pchMsgTmp;
    // ... verify the network matches ours
    if (memcmp(pchMsgTmp, std::begin(chainParams.DiskMagic()),
               sizeof(pchMsgTmp))) {
        throw std::runtime_error{"Invalid network magic number"};
    }

    // de-serialize data
    verifier >> data;

    // verify checksum
    if (fCheckSum) {
        uint256 hashTmp;
        stream >> hashTmp;
        if (hashTmp != verifier.GetHash()) {
            throw std::runtime_error{"Checksum mismatch, data corrupted"};
        }
    }
}

template <typename Data>
void DeserializeFileDB(const CChainParams &chainParams, const fs::path &path,
                       Data &data, int version) {
    // open input file, and associate with CAutoFile
    FILE *file = fsbridge::fopen(path, "rb");
    CAutoFile filein(file, SER_DISK, version);
    if (filein.IsNull()) {
        throw DbNotFoundError{};
    }

    DeserializeDB(chainParams, filein, data);
}

} // namespace

CBanDB::CBanDB(fs::path ban_list_path, const CChainParams &_chainParams)
    : m_ban_list_path(std::move(ban_list_path)), chainParams(_chainParams) {}

bool CBanDB::Write(const banmap_t &banSet) {
    return SerializeFileDB(chainParams, "banlist", m_ban_list_path, banSet,
                           CLIENT_VERSION);
}

bool CBanDB::Read(banmap_t &banSet) {
    // TODO: this needs to be reworked after banlist.dat is deprecated (in
    // favor of banlist.json). See:
    //  - https://github.com/bitcoin/bitcoin/pull/20966
    //  - https://github.com/bitcoin/bitcoin/pull/22570
    try {
        DeserializeFileDB(chainParams, m_ban_list_path, banSet, CLIENT_VERSION);
    } catch (const std::exception &) {
        LogPrintf("Missing or invalid file %s\n",
                  fs::quoted(fs::PathToString(m_ban_list_path)));
        return false;
    }

    return true;
}

bool DumpPeerAddresses(const CChainParams &chainParams, const ArgsManager &args,
                       const AddrMan &addr) {
    const auto pathAddr = args.GetDataDirNet() / "peers.dat";
    return SerializeFileDB(chainParams, "peers", pathAddr, addr,
                           CLIENT_VERSION);
}

void ReadFromStream(const CChainParams &chainParams, AddrMan &addr,
                    CDataStream &ssPeers) {
    DeserializeDB(chainParams, ssPeers, addr, false);
}

util::Result<std::unique_ptr<AddrMan>>
LoadAddrman(const CChainParams &chainparams, const std::vector<bool> &asmap,
            const ArgsManager &args) {
    auto check_addrman = std::clamp<int32_t>(
        args.GetIntArg("-checkaddrman", DEFAULT_ADDRMAN_CONSISTENCY_CHECKS), 0,
        1000000);
    auto addrman{
        std::make_unique<AddrMan>(asmap, /*deterministic=*/false,
                                  /*consistency_check_ratio=*/check_addrman)};

    int64_t nStart = GetTimeMillis();
    const auto path_addr{args.GetDataDirNet() / "peers.dat"};
    try {
        DeserializeFileDB(chainparams, path_addr, *addrman, CLIENT_VERSION);
        LogPrintf("Loaded %i addresses from peers.dat  %dms\n", addrman->size(),
                  GetTimeMillis() - nStart);
    } catch (const DbNotFoundError &) {
        // Addrman can be in an inconsistent state after failure, reset it
        addrman = std::make_unique<AddrMan>(
            asmap, /*deterministic=*/false,
            /*consistency_check_ratio=*/check_addrman);
        LogPrintf("Creating peers.dat because the file was not found (%s)\n",
                  fs::quoted(fs::PathToString(path_addr)));
        DumpPeerAddresses(chainparams, args, *addrman);
    } catch (const InvalidAddrManVersionError &) {
        if (!RenameOver(path_addr, fs::path(path_addr) + ".bak")) {
            return util::Error{
                strprintf(_("Failed to rename invalid peers.dat file. "
                            "Please move or delete it and try again."))};
        }
        // Addrman can be in an inconsistent state after failure, reset it
        addrman = std::make_unique<AddrMan>(
            asmap, /*deterministic=*/false,
            /*consistency_check_ratio=*/check_addrman);
        LogPrintf("Creating new peers.dat because the file version was not "
                  "compatible (%s). Original backed up to peers.dat.bak\n",
                  fs::quoted(fs::PathToString(path_addr)));
        DumpPeerAddresses(chainparams, args, *addrman);
    } catch (const std::exception &e) {
        return util::Error{strprintf(
            _("Invalid or corrupt peers.dat (%s). If you believe this is a "
              "bug, please report it to %s. As a workaround, you can move the "
              "file (%s) out of the way (rename, move, or delete) to have a "
              "new one created on the next start."),
            e.what(), PACKAGE_BUGREPORT,
            fs::quoted(fs::PathToString(path_addr)))};
    }

    // std::move should be unneccessary but is temporarily needed to work
    // around clang bug
    // (https://github.com/bitcoin/bitcoin/pull/25977#issuecomment-1564350880)
    return {std::move(addrman)};
}

void DumpAnchors(const CChainParams &chainParams,
                 const fs::path &anchors_db_path,
                 const std::vector<CAddress> &anchors) {
    LOG_TIME_SECONDS(strprintf(
        "Flush %d outbound block-relay-only peer addresses to anchors.dat",
        anchors.size()));
    SerializeFileDB(chainParams, "anchors", anchors_db_path, anchors,
                    CLIENT_VERSION | ADDRV2_FORMAT);
}

std::vector<CAddress> ReadAnchors(const CChainParams &chainParams,
                                  const fs::path &anchors_db_path) {
    std::vector<CAddress> anchors;
    try {
        DeserializeFileDB(chainParams, anchors_db_path, anchors,
                          CLIENT_VERSION | ADDRV2_FORMAT);
        LogPrintf("Loaded %i addresses from %s\n", anchors.size(),
                  fs::quoted(fs::PathToString(anchors_db_path.filename())));
    } catch (const std::exception &) {
        anchors.clear();
    }

    fs::remove(anchors_db_path);
    return anchors;
}
