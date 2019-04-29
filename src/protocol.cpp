// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "protocol.h"

#include "chainparams.h"
#include "config.h"
#include "util.h"
#include "utilstrencodings.h"

#ifndef WIN32
#include <arpa/inet.h>
#endif
#include <atomic>

static std::atomic<bool> g_initial_block_download_completed(false);

namespace NetMsgType {
const char *VERSION = "version";
const char *VERACK = "verack";
const char *ADDR = "addr";
const char *INV = "inv";
const char *GETDATA = "getdata";
const char *MERKLEBLOCK = "merkleblock";
const char *GETBLOCKS = "getblocks";
const char *GETHEADERS = "getheaders";
const char *TX = "tx";
const char *HEADERS = "headers";
const char *BLOCK = "block";
const char *GETADDR = "getaddr";
const char *MEMPOOL = "mempool";
const char *PING = "ping";
const char *PONG = "pong";
const char *NOTFOUND = "notfound";
const char *FILTERLOAD = "filterload";
const char *FILTERADD = "filteradd";
const char *FILTERCLEAR = "filterclear";
const char *REJECT = "reject";
const char *SENDHEADERS = "sendheaders";
const char *FEEFILTER = "feefilter";
const char *SENDCMPCT = "sendcmpct";
const char *CMPCTBLOCK = "cmpctblock";
const char *GETBLOCKTXN = "getblocktxn";
const char *BLOCKTXN = "blocktxn";
const char *AVAPOLL = "avapoll";
const char *AVARESPONSE = "avaresponse";

bool IsBlockLike(const std::string &strCommand) {
    return strCommand == NetMsgType::BLOCK ||
           strCommand == NetMsgType::CMPCTBLOCK ||
           strCommand == NetMsgType::BLOCKTXN;
}
}; // namespace NetMsgType

/**
 * All known message types. Keep this in the same order as the list of messages
 * above and in protocol.h.
 */
static const std::string allNetMessageTypes[] = {
    NetMsgType::VERSION,     NetMsgType::VERACK,     NetMsgType::ADDR,
    NetMsgType::INV,         NetMsgType::GETDATA,    NetMsgType::MERKLEBLOCK,
    NetMsgType::GETBLOCKS,   NetMsgType::GETHEADERS, NetMsgType::TX,
    NetMsgType::HEADERS,     NetMsgType::BLOCK,      NetMsgType::GETADDR,
    NetMsgType::MEMPOOL,     NetMsgType::PING,       NetMsgType::PONG,
    NetMsgType::NOTFOUND,    NetMsgType::FILTERLOAD, NetMsgType::FILTERADD,
    NetMsgType::FILTERCLEAR, NetMsgType::REJECT,     NetMsgType::SENDHEADERS,
    NetMsgType::FEEFILTER,   NetMsgType::SENDCMPCT,  NetMsgType::CMPCTBLOCK,
    NetMsgType::GETBLOCKTXN, NetMsgType::BLOCKTXN,
};
static const std::vector<std::string>
    allNetMessageTypesVec(allNetMessageTypes,
                          allNetMessageTypes + ARRAYLEN(allNetMessageTypes));

CMessageHeader::CMessageHeader(const MessageMagic &pchMessageStartIn) {
    memcpy(std::begin(pchMessageStart), std::begin(pchMessageStartIn),
           MESSAGE_START_SIZE);
    memset(pchCommand.data(), 0, sizeof(pchCommand));
    nMessageSize = -1;
    memset(pchChecksum, 0, CHECKSUM_SIZE);
}

CMessageHeader::CMessageHeader(const MessageMagic &pchMessageStartIn,
                               const char *pszCommand,
                               unsigned int nMessageSizeIn) {
    memcpy(std::begin(pchMessageStart), std::begin(pchMessageStartIn),
           MESSAGE_START_SIZE);
    memset(pchCommand.data(), 0, sizeof(pchCommand));
    strncpy(pchCommand.data(), pszCommand, COMMAND_SIZE);
    nMessageSize = nMessageSizeIn;
    memset(pchChecksum, 0, CHECKSUM_SIZE);
}

std::string CMessageHeader::GetCommand() const {
    // return std::string(pchCommand.begin(), pchCommand.end());
    return std::string(pchCommand.data(),
                       pchCommand.data() +
                           strnlen(pchCommand.data(), COMMAND_SIZE));
}

static bool
CheckHeaderMagicAndCommand(const CMessageHeader &header,
                           const CMessageHeader::MessageMagic &magic) {
    // Check start string
    if (memcmp(std::begin(header.pchMessageStart), std::begin(magic),
               CMessageHeader::MESSAGE_START_SIZE) != 0) {
        return false;
    }

    // Check the command string for errors
    for (const char *p1 = header.pchCommand.data();
         p1 < header.pchCommand.data() + CMessageHeader::COMMAND_SIZE; p1++) {
        if (*p1 == 0) {
            // Must be all zeros after the first zero
            for (; p1 < header.pchCommand.data() + CMessageHeader::COMMAND_SIZE;
                 p1++) {
                if (*p1 != 0) {
                    return false;
                }
            }
        } else if (*p1 < ' ' || *p1 > 0x7E) {
            return false;
        }
    }

    return true;
}

bool CMessageHeader::IsValid(const Config &config) const {
    // Check start string
    if (!CheckHeaderMagicAndCommand(*this,
                                    config.GetChainParams().NetMagic())) {
        return false;
    }

    // Message size
    if (IsOversized(config)) {
        LogPrintf("CMessageHeader::IsValid(): (%s, %u bytes) is oversized\n",
                  GetCommand(), nMessageSize);
        return false;
    }

    return true;
}

/**
 * This is a transition method in order to stay compatible with older code that
 * do not use the config. It assumes message will not get too large. This cannot
 * be used for any piece of code that will download blocks as blocks may be
 * bigger than the permitted size. Idealy, code that uses this function should
 * be migrated toward using the config.
 */
bool CMessageHeader::IsValidWithoutConfig(const MessageMagic &magic) const {
    // Check start string
    if (!CheckHeaderMagicAndCommand(*this, magic)) {
        return false;
    }

    // Message size
    if (nMessageSize > MAX_PROTOCOL_MESSAGE_LENGTH) {
        LogPrintf(
            "CMessageHeader::IsValidForSeeder(): (%s, %u bytes) is oversized\n",
            GetCommand(), nMessageSize);
        return false;
    }

    return true;
}

bool CMessageHeader::IsOversized(const Config &config) const {
    // If the message doesn't not contain a block content, check against
    // MAX_PROTOCOL_MESSAGE_LENGTH.
    if (nMessageSize > MAX_PROTOCOL_MESSAGE_LENGTH &&
        !NetMsgType::IsBlockLike(GetCommand())) {
        return true;
    }

    // Scale the maximum accepted size with the block size.
    if (nMessageSize > 2 * config.GetMaxBlockSize()) {
        return true;
    }

    return false;
}

ServiceFlags GetDesirableServiceFlags(ServiceFlags services) {
    if ((services & NODE_NETWORK_LIMITED) &&
        g_initial_block_download_completed) {
        return ServiceFlags(NODE_NETWORK_LIMITED);
    }
    return ServiceFlags(NODE_NETWORK);
}

void SetServiceFlagsIBDCache(bool state) {
    g_initial_block_download_completed = state;
}

CAddress::CAddress() : CService() {
    Init();
}

CAddress::CAddress(CService ipIn, ServiceFlags nServicesIn) : CService(ipIn) {
    Init();
    nServices = nServicesIn;
}

void CAddress::Init() {
    nServices = NODE_NONE;
    nTime = 100000000;
}

std::string CInv::GetCommand() const {
    std::string cmd;
    switch (GetKind()) {
        case MSG_TX:
            return cmd.append(NetMsgType::TX);
        case MSG_BLOCK:
            return cmd.append(NetMsgType::BLOCK);
        case MSG_FILTERED_BLOCK:
            return cmd.append(NetMsgType::MERKLEBLOCK);
        case MSG_CMPCT_BLOCK:
            return cmd.append(NetMsgType::CMPCTBLOCK);
        default:
            throw std::out_of_range(
                strprintf("CInv::GetCommand(): type=%d unknown type", type));
    }
}

std::string CInv::ToString() const {
    try {
        return strprintf("%s %s", GetCommand(), hash.ToString());
    } catch (const std::out_of_range &) {
        return strprintf("0x%08x %s", type, hash.ToString());
    }
}

const std::vector<std::string> &getAllNetMessageTypes() {
    return allNetMessageTypesVec;
}
