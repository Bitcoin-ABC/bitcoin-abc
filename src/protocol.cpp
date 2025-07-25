// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <protocol.h>

#include <chainparams.h>
#include <common/system.h>
#include <config.h>
#include <logging.h>

#include <atomic>

static std::atomic<bool> g_initial_block_download_completed(false);

namespace NetMsgType {
const char *VERSION = "version";
const char *VERACK = "verack";
const char *ADDR = "addr";
const char *ADDRV2 = "addrv2";
const char *SENDADDRV2 = "sendaddrv2";
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
const char *SENDHEADERS = "sendheaders";
const char *FEEFILTER = "feefilter";
const char *SENDCMPCT = "sendcmpct";
const char *CMPCTBLOCK = "cmpctblock";
const char *GETBLOCKTXN = "getblocktxn";
const char *BLOCKTXN = "blocktxn";
const char *GETCFILTERS = "getcfilters";
const char *CFILTER = "cfilter";
const char *GETCFHEADERS = "getcfheaders";
const char *CFHEADERS = "cfheaders";
const char *GETCFCHECKPT = "getcfcheckpt";
const char *CFCHECKPT = "cfcheckpt";
const char *AVAHELLO = "avahello";
const char *AVAPOLL = "avapoll";
const char *AVARESPONSE = "avaresponse";
const char *AVAPROOF = "avaproof";
const char *GETAVAADDR = "getavaaddr";
const char *GETAVAPROOFS = "getavaproofs";
const char *AVAPROOFS = "avaproofs";
const char *AVAPROOFSREQ = "avaproofsreq";

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
    NetMsgType::VERSION,     NetMsgType::VERACK,       NetMsgType::ADDR,
    NetMsgType::ADDRV2,      NetMsgType::SENDADDRV2,   NetMsgType::INV,
    NetMsgType::GETDATA,     NetMsgType::MERKLEBLOCK,  NetMsgType::GETBLOCKS,
    NetMsgType::GETHEADERS,  NetMsgType::TX,           NetMsgType::HEADERS,
    NetMsgType::BLOCK,       NetMsgType::GETADDR,      NetMsgType::MEMPOOL,
    NetMsgType::PING,        NetMsgType::PONG,         NetMsgType::NOTFOUND,
    NetMsgType::FILTERLOAD,  NetMsgType::FILTERADD,    NetMsgType::FILTERCLEAR,
    NetMsgType::SENDHEADERS, NetMsgType::FEEFILTER,    NetMsgType::SENDCMPCT,
    NetMsgType::CMPCTBLOCK,  NetMsgType::GETBLOCKTXN,  NetMsgType::BLOCKTXN,
    NetMsgType::GETCFILTERS, NetMsgType::CFILTER,      NetMsgType::GETCFHEADERS,
    NetMsgType::CFHEADERS,   NetMsgType::GETCFCHECKPT, NetMsgType::CFCHECKPT,
    NetMsgType::AVAHELLO,    NetMsgType::AVAPOLL,      NetMsgType::AVARESPONSE,
    NetMsgType::AVAPROOF,    NetMsgType::GETAVAADDR,   NetMsgType::GETAVAPROOFS,
    NetMsgType::AVAPROOFS,   NetMsgType::AVAPROOFSREQ,
};
static const std::vector<std::string>
    allNetMessageTypesVec(std::begin(allNetMessageTypes),
                          std::end(allNetMessageTypes));

CMessageHeader::CMessageHeader(const MessageMagic &pchMessageStartIn) {
    memcpy(std::begin(pchMessageStart), std::begin(pchMessageStartIn),
           MESSAGE_START_SIZE);
    memset(m_msg_type.data(), 0, sizeof(m_msg_type));
    nMessageSize = -1;
    memset(pchChecksum, 0, CHECKSUM_SIZE);
}

CMessageHeader::CMessageHeader(const MessageMagic &pchMessageStartIn,
                               const char *msg_type,
                               unsigned int nMessageSizeIn) {
    memcpy(std::begin(pchMessageStart), std::begin(pchMessageStartIn),
           MESSAGE_START_SIZE);
    // Copy the message type name, zero-padding to MESSAGE_TYPE_SIZE bytes
    size_t i = 0;
    for (; i < m_msg_type.size() && msg_type[i] != 0; ++i) {
        m_msg_type[i] = msg_type[i];
    }
    // Assert that the message type name passed in is not longer than
    // MESSAGE_TYPE_SIZE
    assert(msg_type[i] == 0);
    for (; i < m_msg_type.size(); ++i) {
        m_msg_type[i] = 0;
    }

    nMessageSize = nMessageSizeIn;
    memset(pchChecksum, 0, CHECKSUM_SIZE);
}

std::string CMessageHeader::GetMessageType() const {
    return std::string(m_msg_type.data(),
                       m_msg_type.data() +
                           strnlen(m_msg_type.data(), MESSAGE_TYPE_SIZE));
}

static bool
CheckHeaderMagicAndCommand(const CMessageHeader &header,
                           const CMessageHeader::MessageMagic &magic) {
    // Check start string
    if (memcmp(std::begin(header.pchMessageStart), std::begin(magic),
               CMessageHeader::MESSAGE_START_SIZE) != 0) {
        return false;
    }

    // Check the message type string for errors
    for (const char *p1 = header.m_msg_type.data();
         p1 < header.m_msg_type.data() + CMessageHeader::MESSAGE_TYPE_SIZE;
         p1++) {
        if (*p1 == 0) {
            // Must be all zeros after the first zero
            for (; p1 <
                   header.m_msg_type.data() + CMessageHeader::MESSAGE_TYPE_SIZE;
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
                  GetMessageType(), nMessageSize);
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
            GetMessageType(), nMessageSize);
        return false;
    }

    return true;
}

bool CMessageHeader::IsOversized(const Config &config) const {
    // Scale the maximum accepted size with the block size for messages with
    // block content
    if (NetMsgType::IsBlockLike(GetMessageType())) {
        return nMessageSize > 2 * config.GetMaxBlockSize();
    }

    return nMessageSize > MAX_PROTOCOL_MESSAGE_LENGTH;
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

std::string CInv::GetMessageType() const {
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
        case MSG_AVA_PROOF:
            return cmd.append(NetMsgType::AVAPROOF);
        case MSG_AVA_STAKE_CONTENDER:
            // Stake contender does not have a NetMsgType because there is no
            // contender-specific message, so we hard code the name here.
            return cmd.append("stakecontender");
        default:
            throw std::out_of_range(strprintf(
                "CInv::GetMessageType(): type=%d unknown type", type));
    }
}

std::string CInv::ToString() const {
    try {
        return strprintf("%s %s", GetMessageType(), hash.ToString());
    } catch (const std::out_of_range &) {
        return strprintf("0x%08x %s", type, hash.ToString());
    }
}

const std::vector<std::string> &getAllNetMessageTypes() {
    return allNetMessageTypesVec;
}

/**
 * Convert a service flag (NODE_*) to a human readable string.
 * It supports unknown service flags which will be returned as "UNKNOWN[...]".
 * @param[in] bit the service flag is calculated as (1 << bit)
 */
static std::string serviceFlagToStr(const size_t bit) {
    const uint64_t service_flag = 1ULL << bit;
    switch (ServiceFlags(service_flag)) {
        case NODE_NONE:
            // impossible
            abort();
        case NODE_NETWORK:
            return "NETWORK";
        case NODE_GETUTXO:
            return "GETUTXO";
        case NODE_BLOOM:
            return "BLOOM";
        case NODE_NETWORK_LIMITED:
            return "NETWORK_LIMITED";
        case NODE_COMPACT_FILTERS:
            return "COMPACT_FILTERS";
        case NODE_AVALANCHE:
            return "AVALANCHE";
        default:
            std::ostringstream stream;
            stream.imbue(std::locale::classic());
            stream << "UNKNOWN[";
            stream << "2^" << bit;
            stream << "]";
            return stream.str();
    }
}

std::vector<std::string> serviceFlagsToStr(const uint64_t flags) {
    std::vector<std::string> str_flags;

    for (size_t i = 0; i < sizeof(flags) * 8; ++i) {
        if (flags & (1ULL << i)) {
            str_flags.emplace_back(serviceFlagToStr(i));
        }
    }

    return str_flags;
}
