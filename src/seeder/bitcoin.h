// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SEEDER_BITCOIN_H
#define BITCOIN_SEEDER_BITCOIN_H

#include <chainparams.h>
#include <protocol.h>
#include <streams.h>
#include <util/time.h>

#include <chrono>
#include <cstdint>
#include <string>
#include <vector>

static inline uint16_t GetDefaultPort() {
    return Params().GetDefaultPort();
}

// After the 1000th addr, the seeder will only add one more address per addr
// message.
static const unsigned int ADDR_SOFT_CAP = 1000;

enum class PeerMessagingState {
    AwaitingMessages,
    Finished,
};

class Sock;

namespace {
class CSeederNodeTest;
}

class CSeederNode {
    friend class ::CSeederNodeTest;

private:
    std::unique_ptr<Sock> sock;
    CDataStream vSend;
    CDataStream vRecv;
    uint32_t nHeaderStart;
    uint32_t nMessageStart;
    int nVersion;
    std::string strSubVer;
    int nStartingHeight;
    std::vector<CAddress> *vAddr;
    int ban;
    NodeSeconds doneAfter;
    CService you;
    ServiceFlags yourServices;

    std::chrono::seconds GetTimeout() { return you.IsTor() ? 120s : 30s; }

    void BeginMessage(const char *pszCommand);

    void AbortMessage();

    void EndMessage();

    void Send();

    void PushVersion();

    bool ProcessMessages();

protected:
    PeerMessagingState ProcessMessage(std::string strCommand,
                                      CDataStream &recv);

public:
    CSeederNode(const CService &ip, std::vector<CAddress> *vAddrIn);

    bool Run();

    int GetBan() { return ban; }

    int GetClientVersion() { return nVersion; }

    std::string GetClientSubVersion() { return strSubVer; }

    int GetStartingHeight() { return nStartingHeight; }

    uint64_t GetServices() { return yourServices; }
};

#endif // BITCOIN_SEEDER_BITCOIN_H
