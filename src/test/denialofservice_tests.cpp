// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Unit tests for denial-of-service detection/prevention code

#include <banman.h>
#include <chain.h>
#include <chainparams.h>
#include <common/args.h>
#include <config.h>
#include <net.h>
#include <net_processing.h>
#include <script/sign.h>
#include <script/signingprovider.h>
#include <script/standard.h>
#include <serialize.h>
#include <timedata.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/net.h>
#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>

static CService ip(uint32_t i) {
    struct in_addr s;
    s.s_addr = i;
    return CService(CNetAddr(s), Params().GetDefaultPort());
}

static NodeId id = 0;

BOOST_FIXTURE_TEST_SUITE(denialofservice_tests, TestingSetup)

// Test eviction of an outbound peer whose chain never advances
// Mock a node connection, and use mocktime to simulate a peer which never sends
// any headers messages. PeerLogic should decide to evict that outbound peer,
// after the appropriate timeouts.
// Note that we protect 4 outbound nodes from being subject to this logic; this
// test takes advantage of that protection only being applied to nodes which
// send headers with sufficient work.
BOOST_AUTO_TEST_CASE(outbound_slow_chain_eviction) {
    LOCK(NetEventsInterface::g_msgproc_mutex);

    const Config &config = m_node.chainman->GetConfig();

    ConnmanTestMsg &connman = static_cast<ConnmanTestMsg &>(*m_node.connman);
    // Disable inactivity checks for this test to avoid interference
    connman.SetPeerConnectTimeout(99999s);
    PeerManager &peerman = *m_node.peerman;

    // Mock an outbound peer
    CAddress addr1(ip(0xa0b0c001), NODE_NONE);
    CNode dummyNode1(id++, /*sock=*/nullptr, addr1,
                     /* nKeyedNetGroupIn */ 0, /* nLocalHostNonceIn */ 0,
                     /* nLocalExtraEntropyIn */ 0, CAddress(), /* pszDest */ "",
                     ConnectionType::OUTBOUND_FULL_RELAY,
                     /* inbound_onion */ false);

    connman.Handshake(
        /*node=*/dummyNode1,
        /*successfully_connected=*/true,
        /*remote_services=*/ServiceFlags(NODE_NETWORK),
        /*local_services=*/ServiceFlags(NODE_NETWORK),
        /*version=*/PROTOCOL_VERSION,
        /*relay_txs=*/true);
    TestOnlyResetTimeData();

    // This test requires that we have a chain with non-zero work.
    {
        LOCK(cs_main);
        BOOST_CHECK(m_node.chainman->ActiveTip() != nullptr);
        BOOST_CHECK(m_node.chainman->ActiveTip()->nChainWork > 0);
    }

    // Test starts here
    // should result in getheaders
    BOOST_CHECK(peerman.SendMessages(config, &dummyNode1));
    {
        LOCK(dummyNode1.cs_vSend);
        BOOST_CHECK(dummyNode1.vSendMsg.size() > 0);
        dummyNode1.vSendMsg.clear();
    }

    int64_t nStartTime = GetTime();
    // Wait 21 minutes
    SetMockTime(nStartTime + 21 * 60);
    // should result in getheaders
    BOOST_CHECK(peerman.SendMessages(config, &dummyNode1));

    {
        LOCK(dummyNode1.cs_vSend);
        BOOST_CHECK(dummyNode1.vSendMsg.size() > 0);
    }
    // Wait 3 more minutes
    SetMockTime(nStartTime + 24 * 60);
    // should result in disconnect
    BOOST_CHECK(peerman.SendMessages(config, &dummyNode1));
    BOOST_CHECK(dummyNode1.fDisconnect == true);
    SetMockTime(0);

    peerman.FinalizeNode(config, dummyNode1);
}

static void AddRandomOutboundPeer(const Config &config,
                                  std::vector<CNode *> &vNodes,
                                  PeerManager &peerLogic,
                                  ConnmanTestMsg *connman) {
    CAddress addr(ip(g_insecure_rand_ctx.randbits(32)), NODE_NONE);
    vNodes.emplace_back(new CNode(id++, /*sock=*/nullptr, addr,
                                  /* nKeyedNetGroupIn */ 0,
                                  /* nLocalHostNonceIn */ 0,
                                  /* nLocalExtraEntropyIn */ 0, CAddress(),
                                  /* pszDest */ "",
                                  ConnectionType::OUTBOUND_FULL_RELAY,
                                  /* inbound_onion */ false));
    CNode &node = *vNodes.back();
    node.SetCommonVersion(PROTOCOL_VERSION);

    peerLogic.InitializeNode(config, node, ServiceFlags(NODE_NETWORK));
    node.fSuccessfullyConnected = true;

    connman->AddTestNode(node);
}

BOOST_AUTO_TEST_CASE(stale_tip_peer_management) {
    const Config &config = m_node.chainman->GetConfig();

    auto connman = std::make_unique<ConnmanTestMsg>(config, 0x1337, 0x1337,
                                                    *m_node.addrman);
    auto peerLogic =
        PeerManager::make(*connman, *m_node.addrman, nullptr, *m_node.chainman,
                          *m_node.mempool, /*avalanche=*/nullptr, {});

    const Consensus::Params &consensusParams =
        config.GetChainParams().GetConsensus();
    constexpr int max_outbound_full_relay = MAX_OUTBOUND_FULL_RELAY_CONNECTIONS;
    CConnman::Options options;
    options.nMaxConnections = DEFAULT_MAX_PEER_CONNECTIONS;
    options.m_max_outbound_full_relay = max_outbound_full_relay;
    options.nMaxFeeler = MAX_FEELER_CONNECTIONS;

    const auto time_init{GetTime<std::chrono::seconds>()};
    SetMockTime(time_init.count());
    const auto time_later{
        time_init +
        3 * std::chrono::seconds{consensusParams.nPowTargetSpacing} + 1s};
    connman->Init(options);
    std::vector<CNode *> vNodes;

    // Mock some outbound peers
    for (int i = 0; i < max_outbound_full_relay; ++i) {
        AddRandomOutboundPeer(config, vNodes, *peerLogic, connman.get());
    }

    peerLogic->CheckForStaleTipAndEvictPeers();

    // No nodes should be marked for disconnection while we have no extra peers
    for (const CNode *node : vNodes) {
        BOOST_CHECK(node->fDisconnect == false);
    }

    SetMockTime(time_later.count());

    // Now tip should definitely be stale, and we should look for an extra
    // outbound peer
    peerLogic->CheckForStaleTipAndEvictPeers();
    BOOST_CHECK(connman->GetTryNewOutboundPeer());

    // Still no peers should be marked for disconnection
    for (const CNode *node : vNodes) {
        BOOST_CHECK(node->fDisconnect == false);
    }

    // If we add one more peer, something should get marked for eviction
    // on the next check (since we're mocking the time to be in the future, the
    // required time connected check should be satisfied).
    SetMockTime(time_init.count());
    AddRandomOutboundPeer(config, vNodes, *peerLogic, connman.get());
    SetMockTime(time_later.count());

    peerLogic->CheckForStaleTipAndEvictPeers();
    for (int i = 0; i < max_outbound_full_relay; ++i) {
        BOOST_CHECK(vNodes[i]->fDisconnect == false);
    }
    // Last added node should get marked for eviction
    BOOST_CHECK(vNodes.back()->fDisconnect == true);

    vNodes.back()->fDisconnect = false;

    // Update the last announced block time for the last
    // peer, and check that the next newest node gets evicted.
    peerLogic->UpdateLastBlockAnnounceTime(vNodes.back()->GetId(), GetTime());

    peerLogic->CheckForStaleTipAndEvictPeers();
    for (int i = 0; i < max_outbound_full_relay - 1; ++i) {
        BOOST_CHECK(vNodes[i]->fDisconnect == false);
    }
    BOOST_CHECK(vNodes[max_outbound_full_relay - 1]->fDisconnect == true);
    BOOST_CHECK(vNodes.back()->fDisconnect == false);

    for (const CNode *node : vNodes) {
        peerLogic->FinalizeNode(config, *node);
    }

    connman->ClearTestNodes();
}

BOOST_AUTO_TEST_CASE(peer_discouragement) {
    LOCK(NetEventsInterface::g_msgproc_mutex);

    const Config &config = m_node.chainman->GetConfig();

    auto banman = std::make_unique<BanMan>(m_args.GetDataDirBase() / "banlist",
                                           config.GetChainParams(), nullptr,
                                           DEFAULT_MISBEHAVING_BANTIME);
    auto connman =
        std::make_unique<CConnman>(config, 0x1337, 0x1337, *m_node.addrman);
    auto peerLogic = PeerManager::make(*connman, *m_node.addrman, banman.get(),
                                       *m_node.chainman, *m_node.mempool,
                                       /*avalanche=*/nullptr, {});

    banman->ClearBanned();
    CAddress addr1(ip(0xa0b0c001), NODE_NONE);
    CNode dummyNode1(id++, /*sock=*/nullptr, addr1,
                     /* nKeyedNetGroupIn */ 0, /* nLocalHostNonceIn */ 0,
                     /* nLocalExtraEntropyIn */ 0, CAddress(), /* pszDest */ "",
                     ConnectionType::INBOUND, /* inbound_onion */ false);
    dummyNode1.SetCommonVersion(PROTOCOL_VERSION);
    peerLogic->InitializeNode(config, dummyNode1, NODE_NETWORK);
    dummyNode1.fSuccessfullyConnected = true;
    // Should be discouraged
    peerLogic->UnitTestMisbehaving(dummyNode1.GetId());
    BOOST_CHECK(peerLogic->SendMessages(config, &dummyNode1));
    BOOST_CHECK(banman->IsDiscouraged(addr1));
    // Different IP, not discouraged
    BOOST_CHECK(!banman->IsDiscouraged(ip(0xa0b0c001 | 0x0000ff00)));

    CAddress addr2(ip(0xa0b0c002), NODE_NONE);
    CNode dummyNode2(id++, /*sock=*/nullptr, addr2,
                     /* nKeyedNetGroupIn */ 1, /* nLocalHostNonceIn */ 1,
                     /* nLocalExtraEntropyIn */ 1, CAddress(),
                     /* pszDest */ "", ConnectionType::INBOUND,
                     /* inbound_onion */ false);
    dummyNode2.SetCommonVersion(PROTOCOL_VERSION);
    peerLogic->InitializeNode(config, dummyNode2, NODE_NETWORK);
    dummyNode2.fSuccessfullyConnected = true;
    BOOST_CHECK(peerLogic->SendMessages(config, &dummyNode2));
    // 2 not discouraged yet...
    BOOST_CHECK(!banman->IsDiscouraged(addr2));
    // ... but 1 still should be
    BOOST_CHECK(banman->IsDiscouraged(addr1));
    // 2 reaches discouragement threshold
    peerLogic->UnitTestMisbehaving(dummyNode2.GetId());
    BOOST_CHECK(peerLogic->SendMessages(config, &dummyNode2));
    BOOST_CHECK(banman->IsDiscouraged(addr1)); // Expect both 1 and 2
    BOOST_CHECK(banman->IsDiscouraged(addr2)); // to be discouraged now

    peerLogic->FinalizeNode(config, dummyNode1);
    peerLogic->FinalizeNode(config, dummyNode2);
}

BOOST_AUTO_TEST_CASE(DoS_bantime) {
    LOCK(NetEventsInterface::g_msgproc_mutex);

    const Config &config = m_node.chainman->GetConfig();

    auto banman = std::make_unique<BanMan>(m_args.GetDataDirBase() / "banlist",
                                           config.GetChainParams(), nullptr,
                                           DEFAULT_MISBEHAVING_BANTIME);
    auto connman =
        std::make_unique<CConnman>(config, 0x1337, 0x1337, *m_node.addrman);
    auto peerLogic = PeerManager::make(*connman, *m_node.addrman, banman.get(),
                                       *m_node.chainman, *m_node.mempool,
                                       /*avalanche=*/nullptr, {});

    banman->ClearBanned();
    int64_t nStartTime = GetTime();
    // Overrides future calls to GetTime()
    SetMockTime(nStartTime);

    CAddress addr(ip(0xa0b0c001), NODE_NONE);
    CNode dummyNode(id++, /*sock=*/nullptr, addr,
                    /* nKeyedNetGroupIn */ 4, /* nLocalHostNonceIn */ 4,
                    /* nLocalExtraEntropyIn */ 4, CAddress(), /* pszDest */ "",
                    ConnectionType::INBOUND, /* inbound_onion */ false);
    dummyNode.SetCommonVersion(PROTOCOL_VERSION);
    peerLogic->InitializeNode(config, dummyNode, NODE_NETWORK);
    dummyNode.fSuccessfullyConnected = true;

    peerLogic->UnitTestMisbehaving(dummyNode.GetId());
    BOOST_CHECK(peerLogic->SendMessages(config, &dummyNode));
    BOOST_CHECK(banman->IsDiscouraged(addr));

    peerLogic->FinalizeNode(config, dummyNode);
}

BOOST_AUTO_TEST_SUITE_END()
