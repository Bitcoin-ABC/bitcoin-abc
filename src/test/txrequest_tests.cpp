// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <invrequest.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <functional>
#include <vector>

namespace {

class Scenario;

struct TxRequestTest : BasicTestingSetup {
    std::chrono::microseconds RandomTime8s();
    std::chrono::microseconds RandomTime1y();
    void BuildSingleTest(Scenario &scenario, int config);
    void BuildPriorityTest(Scenario &scenario, int config);
    void BuildBigPriorityTest(Scenario &scenario, int peers);
    void BuildRequestOrderTest(Scenario &scenario, int config);
    void BuildTimeBackwardsTest(Scenario &scenario);
    void BuildWeirdRequestsTest(Scenario &scenario);
    void TestInterleavedScenarios();
};

constexpr std::chrono::microseconds MIN_TIME = std::chrono::microseconds::min();
constexpr std::chrono::microseconds MAX_TIME = std::chrono::microseconds::max();
constexpr std::chrono::microseconds MICROSECOND = std::chrono::microseconds{1};
constexpr std::chrono::microseconds NO_TIME = std::chrono::microseconds{0};

/** An Action is a function to call at a particular (simulated) timestamp. */
using Action = std::pair<std::chrono::microseconds, std::function<void()>>;

/**
 * Object that stores actions from multiple interleaved scenarios, and data
 * shared across them.
 *
 * The Scenario below is used to fill this.
 */
struct Runner {
    /** The InvRequestTracker being tested. */
    InvRequestTracker<TxId> txrequest;

    /** List of actions to be executed (in order of increasing timestamp). */
    std::vector<Action> actions;

    /** Which node ids have been assigned already (to prevent reuse). */
    std::set<NodeId> peerset;

    /** Which txids have been assigned already (to prevent reuse). */
    std::set<TxId> txidset;

    /**
     * Which (peer, txid) combinations are known to be expired. These need to be
     * accumulated here instead of checked directly in the GetRequestable return
     * value to avoid introducing a dependency between the various parallel
     * tests.
     */
    std::multiset<std::pair<NodeId, TxId>> expired;
};

std::chrono::microseconds TxRequestTest::RandomTime8s() {
    return std::chrono::microseconds{1 + m_rng.randbits(23)};
}
std::chrono::microseconds TxRequestTest::RandomTime1y() {
    return std::chrono::microseconds{1 + m_rng.randbits(45)};
}

/**
 * A proxy for a Runner that helps build a sequence of consecutive test actions
 * on a InvRequestTracker.
 *
 * Each Scenario is a proxy through which actions for the (sequential) execution
 * of various tests are added to a Runner. The actions from multiple scenarios
 * are then run concurrently, resulting in these tests being performed against a
 * InvRequestTracker in parallel. Every test has its own unique txids and
 * NodeIds which are not reused in other tests, and thus they should be
 * independent from each other. Running them in parallel however means that we
 * verify the behavior (w.r.t. one test's txids and NodeIds) even when the
 * state of the data structure is more complicated due to the presence of other
 * tests.
 */
class Scenario {
    FastRandomContext &m_rng;
    Runner &m_runner;
    std::chrono::microseconds m_now;
    std::string m_testname;

public:
    Scenario(FastRandomContext &rng, Runner &runner,
             std::chrono::microseconds starttime)
        : m_rng(rng), m_runner(runner), m_now(starttime) {}

    /** Set a name for the current test, to give more clear error messages. */
    void SetTestName(std::string testname) { m_testname = std::move(testname); }

    /**
     * Advance this Scenario's time; this affects the timestamps newly
     * scheduled events get.
     */
    void AdvanceTime(std::chrono::microseconds amount) {
        assert(amount.count() >= 0);
        m_now += amount;
    }

    /** Schedule a ForgetTxId call at the Scheduler's current time. */
    void ForgetTxId(const TxId &txid) {
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            runner.txrequest.ForgetInvId(txid);
            runner.txrequest.SanityCheck();
        });
    }

    /** Schedule a ReceivedInv call at the Scheduler's current time. */
    void ReceivedInv(NodeId peer, const TxId &txid, bool pref,
                     std::chrono::microseconds reqtime) {
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            runner.txrequest.ReceivedInv(peer, txid, pref, reqtime);
            runner.txrequest.SanityCheck();
        });
    }

    /** Schedule a DisconnectedPeer call at the Scheduler's current time. */
    void DisconnectedPeer(NodeId peer) {
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            runner.txrequest.DisconnectedPeer(peer);
            runner.txrequest.SanityCheck();
        });
    }

    /** Schedule a RequestedTx call at the Scheduler's current time. */
    void RequestedTx(NodeId peer, const TxId &txid,
                     std::chrono::microseconds exptime) {
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            runner.txrequest.RequestedData(peer, txid, exptime);
            runner.txrequest.SanityCheck();
        });
    }

    /** Schedule a ReceivedResponse call at the Scheduler's current time. */
    void ReceivedResponse(NodeId peer, const TxId &txid) {
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            runner.txrequest.ReceivedResponse(peer, txid);
            runner.txrequest.SanityCheck();
        });
    }

    /**
     * Schedule calls to verify the InvRequestTracker's state at the Scheduler's
     * current time.
     *
     * @param peer       The peer whose state will be inspected.
     * @param expected   The expected return value for GetRequestable(peer)
     * @param candidates The expected return value CountCandidates(peer)
     * @param inflight   The expected return value CountInFlight(peer)
     * @param completed  The expected return value of Count(peer), minus
     * candidates and inflight.
     * @param checkname  An arbitrary string to include in error messages, for
     * test identificatrion.
     * @param offset     Offset with the current time to use (must be <= 0).
     * This allows simulations of time going backwards (but note that the
     * ordering of this event only follows the scenario's m_now.
     */
    void
    Check(NodeId peer, const std::vector<TxId> &expected, size_t candidates,
          size_t inflight, size_t completed, const std::string &checkname,
          std::chrono::microseconds offset = std::chrono::microseconds{0}) {
        const auto comment = m_testname + " " + checkname;
        auto &runner = m_runner;
        const auto now = m_now;
        assert(offset.count() <= 0);
        runner.actions.emplace_back(m_now, [=, &runner]() {
            std::vector<std::pair<NodeId, TxId>> expired_now;
            auto ret = runner.txrequest.GetRequestable(peer, now + offset,
                                                       &expired_now);
            for (const auto &entry : expired_now) {
                runner.expired.insert(entry);
            }
            runner.txrequest.SanityCheck();
            runner.txrequest.PostGetRequestableSanityCheck(now + offset);
            size_t total = candidates + inflight + completed;
            size_t real_total = runner.txrequest.Count(peer);
            size_t real_candidates = runner.txrequest.CountCandidates(peer);
            size_t real_inflight = runner.txrequest.CountInFlight(peer);
            BOOST_CHECK_MESSAGE(
                real_total == total,
                strprintf("[" + comment + "] total %i (%i expected)",
                          real_total, total));
            BOOST_CHECK_MESSAGE(
                real_inflight == inflight,
                strprintf("[" + comment + "] inflight %i (%i expected)",
                          real_inflight, inflight));
            BOOST_CHECK_MESSAGE(
                real_candidates == candidates,
                strprintf("[" + comment + "] candidates %i (%i expected)",
                          real_candidates, candidates));
            BOOST_CHECK_MESSAGE(ret == expected,
                                "[" + comment + "] mismatching requestables");
        });
    }

    /**
     * Verify that an announcement for txid by peer has expired some time before
     * this check is scheduled.
     *
     * Every expected expiration should be accounted for through exactly one
     * call to this function.
     */
    void CheckExpired(NodeId peer, TxId txid) {
        const auto &testname = m_testname;
        auto &runner = m_runner;
        runner.actions.emplace_back(m_now, [=, &runner]() {
            auto it = runner.expired.find(std::pair<NodeId, TxId>{peer, txid});
            BOOST_CHECK_MESSAGE(it != runner.expired.end(),
                                "[" + testname + "] missing expiration");
            if (it != runner.expired.end()) {
                runner.expired.erase(it);
            }
        });
    }

    /**
     * Generate a random txid, whose priorities for certain peers are
     * constrained.
     *
     * For example, NewTxId({{p1,p2,p3},{p2,p4,p5}}) will generate a txid T
     * such that both:
     *  - priority(p1,T) > priority(p2,T) > priority(p3,T)
     *  - priority(p2,T) > priority(p4,T) > priority(p5,T)
     * where priority is the predicted internal InvRequestTracker's priority,
     * assuming all announcements are within the same preferredness class.
     */
    TxId NewTxId(const std::vector<std::vector<NodeId>> &orders = {}) {
        TxId ret;
        bool ok;
        do {
            ret = TxId(m_rng.rand256());
            ok = true;
            for (const auto &order : orders) {
                for (size_t pos = 1; pos < order.size(); ++pos) {
                    uint64_t prio_prev = m_runner.txrequest.ComputePriority(
                        ret, order[pos - 1], true);
                    uint64_t prio_cur = m_runner.txrequest.ComputePriority(
                        ret, order[pos], true);
                    if (prio_prev <= prio_cur) {
                        ok = false;
                        break;
                    }
                }
                if (!ok) {
                    break;
                }
            }
            if (ok) {
                ok = m_runner.txidset.insert(ret).second;
            }
        } while (!ok);
        return ret;
    }

    /**
     * Generate a new random NodeId to use as peer. The same NodeId is never
     * returned twice (across all Scenarios combined).
     */
    NodeId NewPeer() {
        bool ok;
        NodeId ret;
        do {
            ret = m_rng.randbits(63);
            ok = m_runner.peerset.insert(ret).second;
        } while (!ok);
        return ret;
    }

    std::chrono::microseconds Now() const { return m_now; }
};

/**
 * Add to scenario a test with a single tx announced by a single peer.
 *
 * config is an integer in [0, 32), which controls which variant of the test is
 * used.
 */
void TxRequestTest::BuildSingleTest(Scenario &scenario, int config) {
    auto peer = scenario.NewPeer();
    auto txid = scenario.NewTxId();
    bool immediate = config & 1;
    bool preferred = config & 2;
    auto delay = immediate ? NO_TIME : RandomTime8s();

    scenario.SetTestName(strprintf("Single(config=%i)", config));

    // Receive an announcement, either immediately requestable or delayed.
    scenario.ReceivedInv(peer, txid, preferred,
                         immediate ? MIN_TIME : scenario.Now() + delay);
    if (immediate) {
        scenario.Check(peer, {txid}, 1, 0, 0, "s1");
    } else {
        scenario.Check(peer, {}, 1, 0, 0, "s2");
        scenario.AdvanceTime(delay - MICROSECOND);
        scenario.Check(peer, {}, 1, 0, 0, "s3");
        scenario.AdvanceTime(MICROSECOND);
        scenario.Check(peer, {txid}, 1, 0, 0, "s4");
    }

    if (config >> 3) { // We'll request the transaction
        scenario.AdvanceTime(RandomTime8s());
        auto expiry = RandomTime8s();
        scenario.Check(peer, {txid}, 1, 0, 0, "s5");
        scenario.RequestedTx(peer, txid, scenario.Now() + expiry);
        scenario.Check(peer, {}, 0, 1, 0, "s6");

        if ((config >> 3) == 1) { // The request will time out
            scenario.AdvanceTime(expiry - MICROSECOND);
            scenario.Check(peer, {}, 0, 1, 0, "s7");
            scenario.AdvanceTime(MICROSECOND);
            scenario.Check(peer, {}, 0, 0, 0, "s8");
            scenario.CheckExpired(peer, txid);
            return;
        } else {
            scenario.AdvanceTime(
                std::chrono::microseconds{m_rng.randrange(expiry.count())});
            scenario.Check(peer, {}, 0, 1, 0, "s9");
            if ((config >> 3) ==
                3) { // A response will arrive for the transaction
                scenario.ReceivedResponse(peer, txid);
                scenario.Check(peer, {}, 0, 0, 0, "s10");
                return;
            }
        }
    }

    if (config & 4) {
        // The peer will go offline
        scenario.DisconnectedPeer(peer);
    } else {
        // The transaction is no longer needed
        scenario.ForgetTxId(txid);
    }
    scenario.Check(peer, {}, 0, 0, 0, "s11");
}

/**
 * Add to scenario a test with a single tx announced by two peers, to verify
 * the right peer is selected for requests.
 *
 * config is an integer in [0, 32), which controls which variant of the test is
 * used.
 */
void TxRequestTest::BuildPriorityTest(Scenario &scenario, int config) {
    scenario.SetTestName(strprintf("Priority(config=%i)", config));

    // Two peers. They will announce in order {peer1, peer2}.
    auto peer1 = scenario.NewPeer(), peer2 = scenario.NewPeer();
    // Construct a transaction that under random rules would be preferred by
    // peer2 or peer1, depending on configuration.
    bool prio1 = config & 1;
    auto txid = prio1 ? scenario.NewTxId({{peer1, peer2}})
                      : scenario.NewTxId({{peer2, peer1}});
    bool pref1 = config & 2, pref2 = config & 4;

    scenario.ReceivedInv(peer1, txid, pref1, MIN_TIME);
    scenario.Check(peer1, {txid}, 1, 0, 0, "p1");
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
        scenario.Check(peer1, {txid}, 1, 0, 0, "p2");
    }

    scenario.ReceivedInv(peer2, txid, pref2, MIN_TIME);
    bool stage2_prio =
        // At this point, peer2 will be given priority if:
        // - It is preferred and peer1 is not
        (pref2 && !pref1) ||
        // - They're in the same preference class,
        //   and the randomized priority favors peer2 over peer1.
        (pref1 == pref2 && !prio1);
    NodeId priopeer = stage2_prio ? peer2 : peer1,
           otherpeer = stage2_prio ? peer1 : peer2;
    scenario.Check(otherpeer, {}, 1, 0, 0, "p3");
    scenario.Check(priopeer, {txid}, 1, 0, 0, "p4");
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.Check(otherpeer, {}, 1, 0, 0, "p5");
    scenario.Check(priopeer, {txid}, 1, 0, 0, "p6");

    // We possibly request from the selected peer.
    if (config & 8) {
        scenario.RequestedTx(priopeer, txid, MAX_TIME);
        scenario.Check(priopeer, {}, 0, 1, 0, "p7");
        scenario.Check(otherpeer, {}, 1, 0, 0, "p8");
        if (m_rng.randbool()) {
            scenario.AdvanceTime(RandomTime8s());
        }
    }

    // The peer which was selected (or requested from) now goes offline, or a
    // NOTFOUND is received from them.
    if (config & 16) {
        scenario.DisconnectedPeer(priopeer);
    } else {
        scenario.ReceivedResponse(priopeer, txid);
    }
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.Check(priopeer, {}, 0, 0, !(config & 16), "p8");
    scenario.Check(otherpeer, {txid}, 1, 0, 0, "p9");
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }

    // Now the other peer goes offline.
    scenario.DisconnectedPeer(otherpeer);
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.Check(peer1, {}, 0, 0, 0, "p10");
    scenario.Check(peer2, {}, 0, 0, 0, "p11");
}

/**
 * Add to scenario a randomized test in which N peers announce the same
 * transaction, to verify the order in which they are requested.
 */
void TxRequestTest::BuildBigPriorityTest(Scenario &scenario, int peers) {
    scenario.SetTestName(strprintf("BigPriority(peers=%i)", peers));

    // We will have N peers announce the same transaction.
    std::map<NodeId, bool> preferred;
    std::vector<NodeId> pref_peers, npref_peers;
    // Some preferred, ...
    int num_pref = m_rng.randrange(peers + 1);
    // some not preferred.
    int num_npref = peers - num_pref;
    for (int i = 0; i < num_pref; ++i) {
        pref_peers.push_back(scenario.NewPeer());
        preferred[pref_peers.back()] = true;
    }
    for (int i = 0; i < num_npref; ++i) {
        npref_peers.push_back(scenario.NewPeer());
        preferred[npref_peers.back()] = false;
    }
    // Make a list of all peers, in order of intended request order
    // (concatenation of pref_peers and npref_peers).
    std::vector<NodeId> request_order;
    request_order.reserve(num_pref + num_npref);
    for (int i = 0; i < num_pref; ++i) {
        request_order.push_back(pref_peers[i]);
    }
    for (int i = 0; i < num_npref; ++i) {
        request_order.push_back(npref_peers[i]);
    }

    // Determine the announcement order randomly.
    std::vector<NodeId> announce_order = request_order;
    Shuffle(announce_order.begin(), announce_order.end(), m_rng);

    // Find a txid whose prioritization is consistent with the required
    // ordering within pref_peers and within npref_peers.
    auto txid = scenario.NewTxId({pref_peers, npref_peers});

    // Decide reqtimes in opposite order of the expected request order. This
    // means that as time passes we expect the to-be-requested-from-peer will
    // change every time a subsequent reqtime is passed.
    std::map<NodeId, std::chrono::microseconds> reqtimes;
    auto reqtime = scenario.Now();
    for (int i = peers - 1; i >= 0; --i) {
        reqtime += RandomTime8s();
        reqtimes[request_order[i]] = reqtime;
    }

    // Actually announce from all peers simultaneously (but in announce_order).
    for (const auto peer : announce_order) {
        scenario.ReceivedInv(peer, txid, preferred[peer], reqtimes[peer]);
    }
    for (const auto peer : announce_order) {
        scenario.Check(peer, {}, 1, 0, 0, "b1");
    }

    // Let time pass and observe the to-be-requested-from peer change, from
    // nonpreferred to preferred, and from high priority to low priority within
    // each class.
    for (int i = peers - 1; i >= 0; --i) {
        scenario.AdvanceTime(reqtimes[request_order[i]] - scenario.Now() -
                             MICROSECOND);
        scenario.Check(request_order[i], {}, 1, 0, 0, "b2");
        scenario.AdvanceTime(MICROSECOND);
        scenario.Check(request_order[i], {txid}, 1, 0, 0, "b3");
    }

    // Peers now in random order go offline, or send NOTFOUNDs. At every point
    // in time the new to-be-requested-from peer should be the best remaining
    // one, so verify this after every response.
    for (int i = 0; i < peers; ++i) {
        if (m_rng.randbool()) {
            scenario.AdvanceTime(RandomTime8s());
        }
        const int pos = m_rng.randrange(request_order.size());
        const auto peer = request_order[pos];
        request_order.erase(request_order.begin() + pos);
        if (m_rng.randbool()) {
            scenario.DisconnectedPeer(peer);
            scenario.Check(peer, {}, 0, 0, 0, "b4");
        } else {
            scenario.ReceivedResponse(peer, txid);
            scenario.Check(peer, {}, 0, 0, request_order.size() > 0, "b5");
        }
        if (request_order.size()) {
            scenario.Check(request_order[0], {txid}, 1, 0, 0, "b6");
        }
    }

    // Everything is gone in the end.
    for (const auto peer : announce_order) {
        scenario.Check(peer, {}, 0, 0, 0, "b7");
    }
}

/**
 * Add to scenario a test with one peer announcing two transactions, to verify
 * they are fetched in announcement order.
 *
 *  config is an integer in [0, 4) inclusive, and selects the variant of the
 * test.
 */
void TxRequestTest::BuildRequestOrderTest(Scenario &scenario, int config) {
    scenario.SetTestName(strprintf("RequestOrder(config=%i)", config));

    auto peer = scenario.NewPeer();
    auto txid1 = scenario.NewTxId();
    auto txid2 = scenario.NewTxId();

    auto reqtime2 = scenario.Now() + RandomTime8s();
    auto reqtime1 = reqtime2 + RandomTime8s();

    scenario.ReceivedInv(peer, txid1, config & 1, reqtime1);
    // Simulate time going backwards by giving the second announcement an
    // earlier reqtime.
    scenario.ReceivedInv(peer, txid2, config & 2, reqtime2);

    scenario.AdvanceTime(reqtime2 - MICROSECOND - scenario.Now());
    scenario.Check(peer, {}, 2, 0, 0, "o1");
    scenario.AdvanceTime(MICROSECOND);
    scenario.Check(peer, {txid2}, 2, 0, 0, "o2");
    scenario.AdvanceTime(reqtime1 - MICROSECOND - scenario.Now());
    scenario.Check(peer, {txid2}, 2, 0, 0, "o3");
    scenario.AdvanceTime(MICROSECOND);
    // Even with time going backwards in between announcements, the return value
    // of GetRequestable is in announcement order.
    scenario.Check(peer, {txid1, txid2}, 2, 0, 0, "o4");

    scenario.DisconnectedPeer(peer);
    scenario.Check(peer, {}, 0, 0, 0, "o5");
}

/** Add to scenario a test that exercises clocks that go backwards. */
void TxRequestTest::BuildTimeBackwardsTest(Scenario &scenario) {
    auto peer1 = scenario.NewPeer();
    auto peer2 = scenario.NewPeer();
    auto txid = scenario.NewTxId({{peer1, peer2}});

    // Announce from peer2.
    auto reqtime = scenario.Now() + RandomTime8s();
    scenario.ReceivedInv(peer2, txid, true, reqtime);
    scenario.Check(peer2, {}, 1, 0, 0, "r1");
    scenario.AdvanceTime(reqtime - scenario.Now());
    scenario.Check(peer2, {txid}, 1, 0, 0, "r2");
    // Check that if the clock goes backwards by 1us, the transaction would stop
    // being requested.
    scenario.Check(peer2, {}, 1, 0, 0, "r3", -MICROSECOND);
    // But it reverts to being requested if time goes forward again.
    scenario.Check(peer2, {txid}, 1, 0, 0, "r4");

    // Announce from peer1.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.ReceivedInv(peer1, txid, true, MAX_TIME);
    scenario.Check(peer2, {txid}, 1, 0, 0, "r5");
    scenario.Check(peer1, {}, 1, 0, 0, "r6");

    // Request from peer1.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    auto expiry = scenario.Now() + RandomTime8s();
    scenario.RequestedTx(peer1, txid, expiry);
    scenario.Check(peer1, {}, 0, 1, 0, "r7");
    scenario.Check(peer2, {}, 1, 0, 0, "r8");

    // Expiration passes.
    scenario.AdvanceTime(expiry - scenario.Now());
    scenario.Check(peer1, {}, 0, 0, 1, "r9");
    // Request goes back to peer2.
    scenario.Check(peer2, {txid}, 1, 0, 0, "r10");
    scenario.CheckExpired(peer1, txid);
    // Going back does not unexpire.
    scenario.Check(peer1, {}, 0, 0, 1, "r11", -MICROSECOND);
    scenario.Check(peer2, {txid}, 1, 0, 0, "r12", -MICROSECOND);

    // Peer2 goes offline, meaning no viable announcements remain.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.DisconnectedPeer(peer2);
    scenario.Check(peer1, {}, 0, 0, 0, "r13");
    scenario.Check(peer2, {}, 0, 0, 0, "r14");
}

/**
 * Add to scenario a test that involves RequestedTx() calls for txids not
 * returned by GetRequestable.
 */
void TxRequestTest::BuildWeirdRequestsTest(Scenario &scenario) {
    auto peer1 = scenario.NewPeer();
    auto peer2 = scenario.NewPeer();
    auto txid1 = scenario.NewTxId({{peer1, peer2}});
    auto txid2 = scenario.NewTxId({{peer2, peer1}});

    // Announce txid1 by peer1.
    scenario.ReceivedInv(peer1, txid1, true, MIN_TIME);
    scenario.Check(peer1, {txid1}, 1, 0, 0, "q1");

    // Announce txid2 by peer2.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.ReceivedInv(peer2, txid2, true, MIN_TIME);
    scenario.Check(peer1, {txid1}, 1, 0, 0, "q2");
    scenario.Check(peer2, {txid2}, 1, 0, 0, "q3");

    // We request txid2 from *peer1* - no effect.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.RequestedTx(peer1, txid2, MAX_TIME);
    scenario.Check(peer1, {txid1}, 1, 0, 0, "q4");
    scenario.Check(peer2, {txid2}, 1, 0, 0, "q5");

    // Now request txid1 from peer1 - marks it as REQUESTED.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    auto expiryA = scenario.Now() + RandomTime8s();
    scenario.RequestedTx(peer1, txid1, expiryA);
    scenario.Check(peer1, {}, 0, 1, 0, "q6");
    scenario.Check(peer2, {txid2}, 1, 0, 0, "q7");

    // Request it a second time - nothing happens, as it's already REQUESTED.
    auto expiryB = expiryA + RandomTime8s();
    scenario.RequestedTx(peer1, txid1, expiryB);
    scenario.Check(peer1, {}, 0, 1, 0, "q8");
    scenario.Check(peer2, {txid2}, 1, 0, 0, "q9");

    // Also announce txid1 from peer2 now, so that the txid isn't forgotten
    // when the peer1 request expires.
    scenario.ReceivedInv(peer2, txid1, true, MIN_TIME);
    scenario.Check(peer1, {}, 0, 1, 0, "q10");
    scenario.Check(peer2, {txid2}, 2, 0, 0, "q11");

    // When reaching expiryA, it expires (not expiryB, which is later).
    scenario.AdvanceTime(expiryA - scenario.Now());
    scenario.Check(peer1, {}, 0, 0, 1, "q12");
    scenario.Check(peer2, {txid2, txid1}, 2, 0, 0, "q13");
    scenario.CheckExpired(peer1, txid1);

    // Requesting it yet again from peer1 doesn't do anything, as it's already
    // COMPLETED.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.RequestedTx(peer1, txid1, MAX_TIME);
    scenario.Check(peer1, {}, 0, 0, 1, "q14");
    scenario.Check(peer2, {txid2, txid1}, 2, 0, 0, "q15");

    // Now announce txid2 from peer1.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.ReceivedInv(peer1, txid2, true, MIN_TIME);
    scenario.Check(peer1, {}, 1, 0, 1, "q16");
    scenario.Check(peer2, {txid2, txid1}, 2, 0, 0, "q17");

    // And request it from peer1 (weird as peer2 has the preference).
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.RequestedTx(peer1, txid2, MAX_TIME);
    scenario.Check(peer1, {}, 0, 1, 1, "q18");
    scenario.Check(peer2, {txid1}, 2, 0, 0, "q19");

    // If peer2 now (normally) requests txid2, the existing request by peer1
    // becomes COMPLETED.
    if (m_rng.randbool()) {
        scenario.AdvanceTime(RandomTime8s());
    }
    scenario.RequestedTx(peer2, txid2, MAX_TIME);
    scenario.Check(peer1, {}, 0, 0, 2, "q20");
    scenario.Check(peer2, {txid1}, 1, 1, 0, "q21");

    // If peer2 goes offline, no viable announcements remain.
    scenario.DisconnectedPeer(peer2);
    scenario.Check(peer1, {}, 0, 0, 0, "q22");
    scenario.Check(peer2, {}, 0, 0, 0, "q23");
}

void TxRequestTest::TestInterleavedScenarios() {
    // Create a list of functions which add tests to scenarios.
    std::vector<std::function<void(Scenario &)>> builders;
    // Add instances of every test, for every configuration.
    for (int n = 0; n < 64; ++n) {
        builders.emplace_back([this, n](Scenario &scenario) {
            BuildRequestOrderTest(scenario, n & 3);
        });
        builders.emplace_back([this, n](Scenario &scenario) {
            BuildSingleTest(scenario, n & 31);
        });
        builders.emplace_back([this, n](Scenario &scenario) {
            BuildPriorityTest(scenario, n & 31);
        });
        builders.emplace_back([this, n](Scenario &scenario) {
            BuildBigPriorityTest(scenario, (n & 7) + 1);
        });
        builders.emplace_back(
            [this](Scenario &scenario) { BuildTimeBackwardsTest(scenario); });
        builders.emplace_back(
            [this](Scenario &scenario) { BuildWeirdRequestsTest(scenario); });
    }
    // Randomly shuffle all those functions.
    Shuffle(builders.begin(), builders.end(), m_rng);

    Runner runner;
    auto starttime = RandomTime1y();
    // Construct many scenarios, and run (up to) 10 randomly-chosen tests
    // consecutively in each.
    while (builders.size()) {
        // Introduce some variation in the start time of each scenario, so they
        // don't all start off concurrently, but get a more random interleaving.
        auto scenario_start =
            starttime + RandomTime8s() + RandomTime8s() + RandomTime8s();
        Scenario scenario(m_rng, runner, scenario_start);
        for (int j = 0; builders.size() && j < 10; ++j) {
            builders.back()(scenario);
            builders.pop_back();
        }
    }
    // Sort all the actions from all those scenarios chronologically, resulting
    // in the actions from distinct scenarios to become interleaved. Use
    // stable_sort so that actions from one scenario aren't reordered w.r.t.
    // each other.
    std::stable_sort(
        runner.actions.begin(), runner.actions.end(),
        [](const Action &a1, const Action &a2) { return a1.first < a2.first; });

    // Run all actions from all scenarios, in order.
    for (auto &action : runner.actions) {
        action.second();
    }

    BOOST_CHECK_EQUAL(runner.txrequest.Size(), 0U);
    BOOST_CHECK(runner.expired.empty());
}

} // namespace

BOOST_FIXTURE_TEST_SUITE(txrequest_tests, TxRequestTest)

BOOST_AUTO_TEST_CASE(TxRequestTest) {
    for (int i = 0; i < 5; ++i) {
        TestInterleavedScenarios();
    }
}

BOOST_AUTO_TEST_SUITE_END()
