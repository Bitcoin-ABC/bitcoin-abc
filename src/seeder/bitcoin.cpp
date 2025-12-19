// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/bitcoin.h>

#include <chainparams.h>
#include <clientversion.h>
#include <common/args.h>
#include <hash.h>
#include <net_processing.h>
#include <netbase.h>
#include <primitives/blockhash.h>
#include <seeder/db.h>
#include <seeder/messagewriter.h>
#include <serialize.h>
#include <uint256.h>
#include <util/sock.h>
#include <util/time.h>
#include <validation.h>

#include <algorithm>

#define BITCOIN_SEED_NONCE 0x0539a019ca550825ULL

void CSeederNode::Send() {
    if (!sock) {
        return;
    }
    if (vSend.empty()) {
        return;
    }
    int nBytes = sock->Send(&vSend[0], vSend.size(), 0);
    if (nBytes > 0) {
        vSend.erase(vSend.begin(), vSend.begin() + nBytes);
    } else {
        sock.reset();
    }
}

PeerMessagingState CSeederNode::ProcessMessage(std::string strCommand,
                                               DataStream &recv) {
    // tfm::format(std::cout, "%s: RECV %s\n", ToString(you),
    // strCommand);
    if (strCommand == NetMsgType::VERSION) {
        int64_t nTime;
        CService addrMe;
        uint64_t nNonce = 1;
        uint64_t nServiceInt;
        recv >> nVersion >> nServiceInt >> nTime;
        yourServices = ServiceFlags(nServiceInt);
        // Ignore the addrMe service bits sent by the peer
        recv.ignore(8);
        recv >> WithParams(CNetAddr::V1, addrMe);

        // The version message includes information about the sending node
        // which we don't use:
        //   - 8 bytes (service bits)
        //   - 16 bytes (ipv6 address)
        //   - 2 bytes (port)
        recv.ignore(26);
        recv >> nNonce;
        recv >> strSubVer;
        recv >> nStartingHeight;

        MessageWriter::WriteMessage(vSend, NetMsgType::VERACK);
        return PeerMessagingState::AwaitingMessages;
    }

    if (strCommand == NetMsgType::VERACK) {
        // tfm::format(std::cout, "\n%s: version %i\n", ToString(you),
        // nVersion);
        auto doneAfterDelta{1s};
        // Note in the current codebase: vAddr is non-nullptr only once per day
        // for each node we check
        if (vAddr) {
            MessageWriter::WriteMessage(vSend, NetMsgType::GETADDR);
            doneAfterDelta = GetTimeout();
            needAddrReply = true;
        }

        // request headers starting after last checkpoint (only if we have
        // checkpoints for this network)
        if (HasCheckpoint()) {
            std::vector<BlockHash> locatorHash(
                1, Params().Checkpoints().mapCheckpoints.rbegin()->second);
            MessageWriter::WriteMessage(vSend, NetMsgType::GETHEADERS,
                                        CBlockLocator(std::move(locatorHash)),
                                        uint256());
        }
        doneAfter = Now<NodeSeconds>() + doneAfterDelta;
        return PeerMessagingState::AwaitingMessages;
    }

    if (strCommand == NetMsgType::ADDR && vAddr) {
        needAddrReply = false;
        std::vector<CAddress> vAddrNew;
        recv >> WithParams(CAddress::V1_NETWORK, vAddrNew);
        // tfm::format(std::cout, "%s: got %i addresses\n",
        // ToString(you),
        //        (int)vAddrNew.size());
        auto now = Now<NodeSeconds>();
        std::vector<CAddress>::iterator it = vAddrNew.begin();
        if (vAddrNew.size() > 1) {
            if (checkpointVerified &&
                (TicksSinceEpoch<std::chrono::seconds>(doneAfter) == 0 ||
                 doneAfter > now + 1s)) {
                doneAfter = now + 1s;
            }
        }
        while (it != vAddrNew.end()) {
            CAddress &addr = *it;
            // tfm::format(std::cout, "%s: got address %s\n",
            // ToString(you),
            //        addr.ToString(), (int)(vAddr->size()));
            it++;
            if (addr.nTime <= NodeSeconds{100000000s} ||
                addr.nTime > now + 10min) {
                addr.nTime = now - 5 * 24h;
            }
            if (addr.nTime > now - 7 * 24h) {
                vAddr->push_back(addr);
            }
            // tfm::format(std::cout, "%s: added address %s (#%i)\n",
            // ToString(you),
            //        addr.ToString(), (int)(vAddr->size()));
            if (vAddr->size() > ADDR_SOFT_CAP) {
                if (!checkpointVerified) {
                    // stop processing addresses now since we hit the soft cap,
                    // but we will continue to await headers
                    break;
                }
                // stop processing addresses and since we aren't waiting for
                // headers, stop processing immediately
                doneAfter = now;
                return PeerMessagingState::Finished;
            }
        }
        return PeerMessagingState::AwaitingMessages;
    }

    if (strCommand == NetMsgType::HEADERS) {
        uint64_t nCount = ReadCompactSize(recv);
        if (nCount == 0) {
            // Empty HEADERS messages can be sent when the peer does not have
            // enough chainwork.
            return PeerMessagingState::AwaitingMessages;
        }
        if (nCount > MAX_HEADERS_RESULTS) {
            ban = 100000;
            return PeerMessagingState::Finished;
        }

        CBlockHeader header;
        recv >> header;

        // If the peer has a chain longer than our last checkpoint, we expect
        // that the first header it will send will be the one just after
        // that checkpoint, as we claim to have the checkpoint as our starting
        // height in the version message.
        if (HasCheckpoint() && nStartingHeight > GetRequireHeight()) {
            if (header.hashPrevBlock !=
                Params().Checkpoints().mapCheckpoints.rbegin()->second) {
                // This node is synced higher than the last checkpoint height
                // but does not have the checkpoint block in its chain.
                // This means it must be on the wrong chain. We treat these
                // nodes the same as nodes with the wrong net magic.
                // std::fprintf(stdout, "%s: BAD \"%s\" (wrong chain)\n",
                //              ToString(you).c_str(), strSubVer.c_str());
                ban = 100000;
                return PeerMessagingState::Finished;
            }
            checkpointVerified = true;
            if (!needAddrReply) {
                // we are no longer waiting for headers or addr, so we can
                // stop processing this node
                doneAfter = Now<NodeSeconds>();
            }
        }
    }

    return PeerMessagingState::AwaitingMessages;
}

bool CSeederNode::ProcessMessages() {
    if (vRecv.empty()) {
        return false;
    }

    const CMessageHeader::MessageMagic netMagic = Params().NetMagic();

    do {
        DataStream::iterator pstart = std::search(
            vRecv.begin(), vRecv.end(), BEGIN(netMagic), END(netMagic));
        uint32_t nHeaderSize = GetSerializeSize(CMessageHeader(netMagic));
        if (vRecv.end() - pstart < nHeaderSize) {
            if (vRecv.size() > nHeaderSize) {
                vRecv.erase(vRecv.begin(), vRecv.end() - nHeaderSize);
            }
            break;
        }
        vRecv.erase(vRecv.begin(), pstart);
        std::vector<std::byte> vHeaderSave(vRecv.begin(),
                                           vRecv.begin() + nHeaderSize);
        CMessageHeader hdr(netMagic);
        vRecv >> hdr;
        if (!hdr.IsValidWithoutConfig(netMagic)) {
            // tfm::format(std::cout, "%s: BAD (invalid header)\n",
            // ToString(you));
            ban = 100000;
            return true;
        }
        std::string strCommand = hdr.GetMessageType();
        unsigned int nMessageSize = hdr.nMessageSize;
        if (nMessageSize > MAX_SIZE) {
            // tfm::format(std::cout, "%s: BAD (message too large)\n",
            // ToString(you));
            ban = 100000;
            return true;
        }
        if (nMessageSize > vRecv.size()) {
            vRecv.insert(vRecv.begin(), vHeaderSave.begin(), vHeaderSave.end());
            break;
        }
        uint256 hash = Hash(Span{vRecv}.first(nMessageSize));
        if (memcmp(hash.begin(), hdr.pchChecksum,
                   CMessageHeader::CHECKSUM_SIZE) != 0) {
            continue;
        }
        std::vector<std::byte> vec{vRecv.begin(), vRecv.begin() + nMessageSize};
        DataStream vMsg{MakeUCharSpan(vec)};
        vRecv.ignore(nMessageSize);
        if (ProcessMessage(strCommand, vMsg) == PeerMessagingState::Finished) {
            return true;
        }
        // tfm::format(std::cout, "%s: done processing %s\n",
        // ToString(you),
        //        strCommand);
    } while (1);
    return false;
}

CSeederNode::CSeederNode(const CService &ip, std::vector<CAddress> *vAddrIn)
    : vAddr(vAddrIn), you(ip), checkpointVerified(!HasCheckpoint()) {}

bool CSeederNode::Run() {
    // FIXME: This logic is duplicated with CConnman::ConnectNode for no
    // good reason.
    bool connected = false;
    proxyType proxy;

    if (you.IsValid()) {
        bool proxyConnectionFailed = false;

        if (GetProxy(you.GetNetwork(), proxy)) {
            sock = CreateSock(proxy.proxy);
            if (!sock) {
                return false;
            }
            connected = ConnectThroughProxy(
                proxy, you.ToStringIP(), you.GetPort(), *sock, nConnectTimeout,
                proxyConnectionFailed);
        } else {
            // no proxy needed (none set for target network)
            sock = CreateSock(you);
            if (!sock) {
                return false;
            }
            // no proxy needed (none set for target network)
            connected =
                ConnectSocketDirectly(you, *sock, nConnectTimeout, false);
        }
    }

    if (!connected) {
        // tfm::format(std::cout, "Cannot connect to %s\n",
        // ToString(you));
        sock.reset();
        return false;
    }

    // Write version message
    // Don't include the time in CAddress serialization. See D14753.
    uint64_t nLocalServices = 0;
    uint64_t nLocalNonce = BITCOIN_SEED_NONCE;
    uint64_t your_services{yourServices};
    uint64_t my_services{ServiceFlags(NODE_NETWORK)};
    uint8_t fRelayTxs = 0;

    const std::string clientName = gArgs.GetArg("-uaclientname", CLIENT_NAME);
    const std::string clientVersion =
        gArgs.GetArg("-uaclientversion", FormatVersion(CLIENT_VERSION));
    const std::string userAgent =
        FormatUserAgent(clientName, clientVersion, {"seeder"});

    MessageWriter::WriteMessage(
        vSend, NetMsgType::VERSION, PROTOCOL_VERSION, nLocalServices, GetTime(),
        your_services, WithParams(CNetAddr::V1, you), my_services,
        WithParams(CNetAddr::V1, CService{}), nLocalNonce, userAgent,
        GetRequireHeight(), fRelayTxs);
    Send();

    bool res = true;
    NodeSeconds now;
    while (now = Now<NodeSeconds>(),
           ban == 0 &&
               (TicksSinceEpoch<std::chrono::seconds>(doneAfter) == 0 ||
                doneAfter > now) &&
               sock) {
        char pchBuf[0x10000];
        fd_set fdsetRecv;
        fd_set fdsetError;
        FD_ZERO(&fdsetRecv);
        FD_ZERO(&fdsetError);
        FD_SET(sock->Get(), &fdsetRecv);
        FD_SET(sock->Get(), &fdsetError);
        struct timeval wa;
        if (TicksSinceEpoch<std::chrono::seconds>(doneAfter) != 0) {
            wa.tv_sec = (doneAfter - now).count();
            wa.tv_usec = 0;
        } else {
            wa.tv_sec = GetTimeout().count();
            wa.tv_usec = 0;
        }
        int ret =
            select(sock->Get() + 1, &fdsetRecv, nullptr, &fdsetError, &wa);
        if (ret != 1) {
            if (TicksSinceEpoch<std::chrono::seconds>(doneAfter) == 0) {
                res = false;
            }
            break;
        }
        int nBytes = sock->Recv(pchBuf, sizeof(pchBuf), 0);
        int nPos = vRecv.size();
        if (nBytes > 0) {
            vRecv.resize(nPos + nBytes);
            memcpy(&vRecv[nPos], pchBuf, nBytes);
        } else if (nBytes == 0) {
            // tfm::format(std::cout, "%s: BAD (connection closed
            // prematurely)\n",
            //        ToString(you));
            res = false;
            break;
        } else {
            // tfm::format(std::cout, "%s: BAD (connection error)\n",
            // ToString(you));
            res = false;
            break;
        }
        ProcessMessages();
        Send();
    }
    if (!sock) {
        res = false;
    }
    sock.reset();
    return (ban == 0) && res;
}
