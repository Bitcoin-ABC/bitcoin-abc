// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <txrequest.h>

#include <crypto/siphash.h>
#include <net.h>
#include <primitives/transaction.h>
#include <random.h>

#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <cassert>
#include <chrono>
#include <unordered_map>
#include <utility>

namespace {

/**
 * The various states a (txid, peer) pair can be in.
 *
 * Note that CANDIDATE is split up into 3 substates (DELAYED, BEST, READY),
 * allowing more efficient implementation. Also note that the sorting order of
 * ByTxIdView relies on the specific order of values in this enum.
 *
 * Expected behaviour is:
 *   - When first announced by a peer, the state is CANDIDATE_DELAYED until
 *     reqtime is reached.
 *   - Announcements that have reached their reqtime but not been requested will
 *     be either CANDIDATE_READY or CANDIDATE_BEST. Neither of those has an
 *     expiration time; they remain in that state until they're requested or no
 *     longer needed. CANDIDATE_READY announcements are promoted to
 *     CANDIDATE_BEST when they're the best one left.
 *   - When requested, an announcement will be in state REQUESTED until expiry
 *     is reached.
 *   - If expiry is reached, or the peer replies to the request (either with
 *     NOTFOUND or the tx), the state becomes COMPLETED.
 */
enum class State : uint8_t {
    /** A CANDIDATE announcement whose reqtime is in the future. */
    CANDIDATE_DELAYED,
    /**
     * A CANDIDATE announcement that's not CANDIDATE_DELAYED or CANDIDATE_BEST.
     */
    CANDIDATE_READY,
    /**
     * The best CANDIDATE for a given txid; only if there is no REQUESTED
     * announcement already for that txid. The CANDIDATE_BEST is the
     * highest-priority announcement among all CANDIDATE_READY (and _BEST) ones
     * for that txid.
     */
    CANDIDATE_BEST,
    /** A REQUESTED announcement. */
    REQUESTED,
    /** A COMPLETED announcement. */
    COMPLETED,
};

//! Type alias for sequence numbers.
using SequenceNumber = uint64_t;

/**
 * An announcement. This is the data we track for each txid that is announced
 * to us by each peer.
 */
struct Announcement {
    /** TxId that was announced. */
    const TxId m_txid;
    /**
     * For CANDIDATE_{DELAYED,BEST,READY} the reqtime; for REQUESTED the
     * expiry.
     */
    std::chrono::microseconds m_time;
    /** What peer the request was from. */
    const NodeId m_peer;
    /** What sequence number this announcement has. */
    const SequenceNumber m_sequence : 60;
    /** Whether the request is preferred. */
    const bool m_preferred : 1;

    /**
     * What state this announcement is in.
     * This is a uint8_t instead of a State to silence a GCC warning in versions
     * prior to 8.4 and 9.3. See
     * https://gcc.gnu.org/bugzilla/show_bug.cgi?id=61414
     */
    uint8_t m_state : 3;

    /** Convert m_state to a State enum. */
    State GetState() const { return static_cast<State>(m_state); }

    /** Convert a State enum to a uint8_t and store it in m_state. */
    void SetState(State state) { m_state = static_cast<uint8_t>(state); }

    /**
     * Whether this announcement is selected. There can be at most 1 selected
     * peer per txid.
     */
    bool IsSelected() const {
        return GetState() == State::CANDIDATE_BEST ||
               GetState() == State::REQUESTED;
    }

    /** Whether this announcement is waiting for a certain time to pass. */
    bool IsWaiting() const {
        return GetState() == State::REQUESTED ||
               GetState() == State::CANDIDATE_DELAYED;
    }

    /**
     * Whether this announcement can feasibly be selected if the current
     * IsSelected() one disappears.
     */
    bool IsSelectable() const {
        return GetState() == State::CANDIDATE_READY ||
               GetState() == State::CANDIDATE_BEST;
    }

    /**
     * Construct a new announcement from scratch, initially in
     * CANDIDATE_DELAYED state.
     */
    Announcement(const TxId &txid, NodeId peer, bool preferred,
                 std::chrono::microseconds reqtime, SequenceNumber sequence)
        : m_txid(txid), m_time(reqtime), m_peer(peer), m_sequence(sequence),
          m_preferred(preferred),
          m_state(static_cast<uint8_t>(State::CANDIDATE_DELAYED)) {}
};

//! Type alias for priorities.
using Priority = uint64_t;

/**
 * A functor with embedded salt that computes priority of an announcement.
 *
 * Higher priorities are selected first.
 */
class PriorityComputer {
    const uint64_t m_k0, m_k1;

public:
    explicit PriorityComputer(bool deterministic)
        : m_k0{deterministic ? 0 : GetRand(0xFFFFFFFFFFFFFFFF)},
          m_k1{deterministic ? 0 : GetRand(0xFFFFFFFFFFFFFFFF)} {}

    Priority operator()(const TxId &txid, NodeId peer, bool preferred) const {
        uint64_t low_bits = CSipHasher(m_k0, m_k1)
                                .Write(txid.begin(), txid.size())
                                .Write(peer)
                                .Finalize() >>
                            1;
        return low_bits | uint64_t{preferred} << 63;
    }

    Priority operator()(const Announcement &ann) const {
        return operator()(ann.m_txid, ann.m_peer, ann.m_preferred);
    }
};

// Definitions for the 3 indexes used in the main data structure.
//
// Each index has a By* type to identify it, a By*View data type to represent
// the view of announcement it is sorted by, and an By*ViewExtractor type to
// convert an announcement into the By*View type. See
// https://www.boost.org/doc/libs/1_58_0/libs/multi_index/doc/reference/key_extraction.html#key_extractors
// for more information about the key extraction concept.

// The ByPeer index is sorted by (peer, state == CANDIDATE_BEST, txid)
//
// Uses:
// * Looking up existing announcements by peer/txid, by checking both (peer,
//   false, txid) and (peer, true, txid).
// * Finding all CANDIDATE_BEST announcements for a given peer in
//   GetRequestable.
struct ByPeer {};
using ByPeerView = std::tuple<NodeId, bool, const TxId &>;
struct ByPeerViewExtractor {
    using result_type = ByPeerView;
    result_type operator()(const Announcement &ann) const {
        return ByPeerView{ann.m_peer, ann.GetState() == State::CANDIDATE_BEST,
                          ann.m_txid};
    }
};

// The ByTxId index is sorted by (txid, state, priority).
//
// Note: priority == 0 whenever state != CANDIDATE_READY.
//
// Uses:
// * Deleting all announcements with a given txid in ForgetTxId.
// * Finding the best CANDIDATE_READY to convert to CANDIDATE_BEST, when no
//   other CANDIDATE_READY or REQUESTED announcement exists for that txid.
// * Determining when no more non-COMPLETED announcements for a given txid
//   exist, so the COMPLETED ones can be deleted.
struct ByTxId {};
using ByTxIdView = std::tuple<const TxId &, State, Priority>;
class ByTxIdViewExtractor {
    const PriorityComputer &m_computer;

public:
    ByTxIdViewExtractor(const PriorityComputer &computer)
        : m_computer(computer) {}
    using result_type = ByTxIdView;
    result_type operator()(const Announcement &ann) const {
        const Priority prio =
            (ann.GetState() == State::CANDIDATE_READY) ? m_computer(ann) : 0;
        return ByTxIdView{ann.m_txid, ann.GetState(), prio};
    }
};

enum class WaitState {
    //! Used for announcements that need efficient testing of "is their
    //! timestamp in the future?".
    FUTURE_EVENT,
    //! Used for announcements whose timestamp is not relevant.
    NO_EVENT,
    //! Used for announcements that need efficient testing of "is their
    //! timestamp in the past?".
    PAST_EVENT,
};

WaitState GetWaitState(const Announcement &ann) {
    if (ann.IsWaiting()) {
        return WaitState::FUTURE_EVENT;
    }
    if (ann.IsSelectable()) {
        return WaitState::PAST_EVENT;
    }
    return WaitState::NO_EVENT;
}

// The ByTime index is sorted by (wait_state, time).
//
// All announcements with a timestamp in the future can be found by iterating
// the index forward from the beginning. All announcements with a timestamp in
// the past can be found by iterating the index backwards from the end.
//
// Uses:
// * Finding CANDIDATE_DELAYED announcements whose reqtime has passed, and
//   REQUESTED announcements whose expiry has passed.
// * Finding CANDIDATE_READY/BEST announcements whose reqtime is in the future
//   (when the clock time went backwards).
struct ByTime {};
using ByTimeView = std::pair<WaitState, std::chrono::microseconds>;
struct ByTimeViewExtractor {
    using result_type = ByTimeView;
    result_type operator()(const Announcement &ann) const {
        return ByTimeView{GetWaitState(ann), ann.m_time};
    }
};

/**
 * Data type for the main data structure (Announcement objects with
 * ByPeer/ByTxId/ByTime indexes).
 */
using Index = boost::multi_index_container<
    Announcement,
    boost::multi_index::indexed_by<
        boost::multi_index::ordered_unique<boost::multi_index::tag<ByPeer>,
                                           ByPeerViewExtractor>,
        boost::multi_index::ordered_non_unique<boost::multi_index::tag<ByTxId>,
                                               ByTxIdViewExtractor>,
        boost::multi_index::ordered_non_unique<boost::multi_index::tag<ByTime>,
                                               ByTimeViewExtractor>>>;

/** Helper type to simplify syntax of iterator types. */
template <typename Tag> using Iter = typename Index::index<Tag>::type::iterator;

/** Per-peer statistics object. */
struct PeerInfo {
    //! Total number of announcements for this peer.
    size_t m_total = 0;
    //! Number of COMPLETED announcements for this peer.
    size_t m_completed = 0;
    //! Number of REQUESTED announcements for this peer.
    size_t m_requested = 0;
};

} // namespace

/** Actual implementation for TxRequestTracker's data structure. */
class TxRequestTracker::Impl {
    //! The current sequence number. Increases for every announcement. This is
    //! used to sort txid returned by GetRequestable in announcement order.
    SequenceNumber m_current_sequence{0};

    //! This tracker's priority computer.
    const PriorityComputer m_computer;

    //! This tracker's main data structure.
    Index m_index;

    //! Map with this tracker's per-peer statistics.
    std::unordered_map<NodeId, PeerInfo> m_peerinfo;

    //! Wrapper around Index::...::erase that keeps m_peerinfo up to date.
    template <typename Tag> Iter<Tag> Erase(Iter<Tag> it) {
        auto peerit = m_peerinfo.find(it->m_peer);
        peerit->second.m_completed -= it->GetState() == State::COMPLETED;
        peerit->second.m_requested -= it->GetState() == State::REQUESTED;
        if (--peerit->second.m_total == 0) {
            m_peerinfo.erase(peerit);
        }
        return m_index.get<Tag>().erase(it);
    }

    //! Wrapper around Index::...::modify that keeps m_peerinfo up to date.
    template <typename Tag, typename Modifier>
    void Modify(Iter<Tag> it, Modifier modifier) {
        auto peerit = m_peerinfo.find(it->m_peer);
        peerit->second.m_completed -= it->GetState() == State::COMPLETED;
        peerit->second.m_requested -= it->GetState() == State::REQUESTED;
        m_index.get<Tag>().modify(it, std::move(modifier));
        peerit->second.m_completed += it->GetState() == State::COMPLETED;
        peerit->second.m_requested += it->GetState() == State::REQUESTED;
    }

    //! Convert a CANDIDATE_DELAYED announcement into a CANDIDATE_READY. If this
    //! makes it the new best CANDIDATE_READY (and no REQUESTED exists) and
    //! better than the CANDIDATE_BEST (if any), it becomes the new
    //! CANDIDATE_BEST.
    void PromoteCandidateReady(Iter<ByTxId> it) {
        assert(it != m_index.get<ByTxId>().end());
        assert(it->GetState() == State::CANDIDATE_DELAYED);
        // Convert CANDIDATE_DELAYED to CANDIDATE_READY first.
        Modify<ByTxId>(it, [](Announcement &ann) {
            ann.SetState(State::CANDIDATE_READY);
        });
        // The following code relies on the fact that the ByTxId is sorted by
        // txid, and then by state (first _DELAYED, then _READY, then
        // _BEST/REQUESTED). Within the _READY announcements, the best one
        // (highest priority) comes last. Thus, if an existing _BEST exists for
        // the same txid that this announcement may be preferred over, it must
        // immediately follow the newly created _READY.
        auto it_next = std::next(it);
        if (it_next == m_index.get<ByTxId>().end() ||
            it_next->m_txid != it->m_txid ||
            it_next->GetState() == State::COMPLETED) {
            // This is the new best CANDIDATE_READY, and there is no
            // IsSelected() announcement for this txid already.
            Modify<ByTxId>(it, [](Announcement &ann) {
                ann.SetState(State::CANDIDATE_BEST);
            });
        } else if (it_next->GetState() == State::CANDIDATE_BEST) {
            Priority priority_old = m_computer(*it_next);
            Priority priority_new = m_computer(*it);
            if (priority_new > priority_old) {
                // There is a CANDIDATE_BEST announcement already, but this one
                // is better.
                Modify<ByTxId>(it_next, [](Announcement &ann) {
                    ann.SetState(State::CANDIDATE_READY);
                });
                Modify<ByTxId>(it, [](Announcement &ann) {
                    ann.SetState(State::CANDIDATE_BEST);
                });
            }
        }
    }

    //! Change the state of an announcement to something non-IsSelected(). If it
    //! was IsSelected(), the next best announcement will be marked
    //! CANDIDATE_BEST.
    void ChangeAndReselect(Iter<ByTxId> it, State new_state) {
        assert(new_state == State::COMPLETED ||
               new_state == State::CANDIDATE_DELAYED);
        assert(it != m_index.get<ByTxId>().end());
        if (it->IsSelected() && it != m_index.get<ByTxId>().begin()) {
            auto it_prev = std::prev(it);
            // The next best CANDIDATE_READY, if any, immediately precedes the
            // REQUESTED or CANDIDATE_BEST announcement in the ByTxId index.
            if (it_prev->m_txid == it->m_txid &&
                it_prev->GetState() == State::CANDIDATE_READY) {
                // If one such CANDIDATE_READY exists (for this txid), convert
                // it to CANDIDATE_BEST.
                Modify<ByTxId>(it_prev, [](Announcement &ann) {
                    ann.SetState(State::CANDIDATE_BEST);
                });
            }
        }
        Modify<ByTxId>(
            it, [new_state](Announcement &ann) { ann.SetState(new_state); });
    }

    //! Check if 'it' is the only announcement for a given txid that isn't
    //! COMPLETED.
    bool IsOnlyNonCompleted(Iter<ByTxId> it) {
        assert(it != m_index.get<ByTxId>().end());
        // Not allowed to call this on COMPLETED announcements.
        assert(it->GetState() != State::COMPLETED);

        // This announcement has a predecessor that belongs to the same txid.
        // Due to ordering, and the fact that 'it' is not COMPLETED, its
        // predecessor cannot be COMPLETED here.
        if (it != m_index.get<ByTxId>().begin() &&
            std::prev(it)->m_txid == it->m_txid) {
            return false;
        }

        // This announcement has a successor that belongs to the same txid,
        // and is not COMPLETED.
        if (std::next(it) != m_index.get<ByTxId>().end() &&
            std::next(it)->m_txid == it->m_txid &&
            std::next(it)->GetState() != State::COMPLETED) {
            return false;
        }

        return true;
    }

    /**
     * Convert any announcement to a COMPLETED one. If there are no
     * non-COMPLETED announcements left for this txid, they are deleted. If
     * this was a REQUESTED announcement, and there are other CANDIDATEs left,
     * the best one is made CANDIDATE_BEST. Returns whether the announcement
     * still exists.
     */
    bool MakeCompleted(Iter<ByTxId> it) {
        assert(it != m_index.get<ByTxId>().end());

        // Nothing to be done if it's already COMPLETED.
        if (it->GetState() == State::COMPLETED) {
            return true;
        }

        if (IsOnlyNonCompleted(it)) {
            // This is the last non-COMPLETED announcement for this txid.
            // Delete all.
            TxId txid = it->m_txid;
            do {
                it = Erase<ByTxId>(it);
            } while (it != m_index.get<ByTxId>().end() && it->m_txid == txid);
            return false;
        }

        // Mark the announcement COMPLETED, and select the next best
        // announcement (the first CANDIDATE_READY) if needed.
        ChangeAndReselect(it, State::COMPLETED);

        return true;
    }

    //! Make the data structure consistent with a given point in time:
    //! - REQUESTED annoucements with expiry <= now are turned into COMPLETED.
    //! - CANDIDATE_DELAYED announcements with reqtime <= now are turned into
    //!   CANDIDATE_{READY,BEST}.
    //! - CANDIDATE_{READY,BEST} announcements with reqtime > now are turned
    //!   into CANDIDATE_DELAYED.
    void SetTimePoint(std::chrono::microseconds now) {
        // Iterate over all CANDIDATE_DELAYED and REQUESTED from old to new, as
        // long as they're in the past, and convert them to CANDIDATE_READY and
        // COMPLETED respectively.
        while (!m_index.empty()) {
            auto it = m_index.get<ByTime>().begin();
            if (it->GetState() == State::CANDIDATE_DELAYED &&
                it->m_time <= now) {
                PromoteCandidateReady(m_index.project<ByTxId>(it));
            } else if (it->GetState() == State::REQUESTED &&
                       it->m_time <= now) {
                MakeCompleted(m_index.project<ByTxId>(it));
            } else {
                break;
            }
        }

        while (!m_index.empty()) {
            // If time went backwards, we may need to demote CANDIDATE_BEST and
            // CANDIDATE_READY announcements back to CANDIDATE_DELAYED. This is
            // an unusual edge case, and unlikely to matter in production.
            // However, it makes it much easier to specify and test
            // TxRequestTracker::Impl's behaviour.
            auto it = std::prev(m_index.get<ByTime>().end());
            if (it->IsSelectable() && it->m_time > now) {
                ChangeAndReselect(m_index.project<ByTxId>(it),
                                  State::CANDIDATE_DELAYED);
            } else {
                break;
            }
        }
    }

public:
    Impl(bool deterministic)
        : m_computer(deterministic),
          // Explicitly initialize m_index as we need to pass a reference to
          // m_computer to ByTxHashViewExtractor.
          m_index(boost::make_tuple(
              boost::make_tuple(ByPeerViewExtractor(), std::less<ByPeerView>()),
              boost::make_tuple(ByTxIdViewExtractor(m_computer),
                                std::less<ByTxIdView>()),
              boost::make_tuple(ByTimeViewExtractor(),
                                std::less<ByTimeView>()))) {}

    // Disable copying and assigning (a default copy won't work due the stateful
    // ByTxIdViewExtractor).
    Impl(const Impl &) = delete;
    Impl &operator=(const Impl &) = delete;

    void DisconnectedPeer(NodeId peer) {
        auto &index = m_index.get<ByPeer>();
        auto it =
            index.lower_bound(ByPeerView{peer, false, TxId(uint256::ZERO)});
        while (it != index.end() && it->m_peer == peer) {
            // Check what to continue with after this iteration. 'it' will be
            // deleted in what follows, so we need to decide what to continue
            // with afterwards. There are a number of cases to consider:
            // - std::next(it) is end() or belongs to a different peer. In that
            //   case, this is the last iteration of the loop (denote this by
            //   setting it_next to end()).
            // - 'it' is not the only non-COMPLETED announcement for its txid.
            //   This means it will be deleted, but no other Announcement
            //   objects will be modified. Continue with std::next(it) if it
            //   belongs to the same peer, but decide this ahead of time (as
            //   'it' may change position in what follows).
            // - 'it' is the only non-COMPLETED announcement for its txid. This
            //   means it will be deleted along with all other announcements for
            //   the same txid - which may include std::next(it). However, other
            //   than 'it', no announcements for the same peer can be affected
            //   (due to (peer, txid) uniqueness). In other words, the situation
            //   where std::next(it) is deleted can only occur if std::next(it)
            //   belongs to a different peer but the same txid as 'it'. This is
            //   covered by the first bulletpoint already, and we'll have set
            //   it_next to end().
            auto it_next =
                (std::next(it) == index.end() || std::next(it)->m_peer != peer)
                    ? index.end()
                    : std::next(it);
            // If the announcement isn't already COMPLETED, first make it
            // COMPLETED (which will mark other CANDIDATEs as CANDIDATE_BEST, or
            // delete all of a txid's announcements if no non-COMPLETED ones are
            // left).
            if (MakeCompleted(m_index.project<ByTxId>(it))) {
                // Then actually delete the announcement (unless it was already
                // deleted by MakeCompleted).
                Erase<ByPeer>(it);
            }
            it = it_next;
        }
    }

    void ForgetTxId(const TxId &txid) {
        auto it = m_index.get<ByTxId>().lower_bound(
            ByTxIdView{txid, State::CANDIDATE_DELAYED, 0});
        while (it != m_index.get<ByTxId>().end() && it->m_txid == txid) {
            it = Erase<ByTxId>(it);
        }
    }

    void ReceivedInv(NodeId peer, const TxId &txid, bool preferred,
                     std::chrono::microseconds reqtime) {
        // Bail out if we already have a CANDIDATE_BEST announcement for this
        // (txid, peer) combination. The case where there is a
        // non-CANDIDATE_BEST announcement already will be caught by the
        // uniqueness property of the ByPeer index when we try to emplace the
        // new object below.
        if (m_index.get<ByPeer>().count(ByPeerView{peer, true, txid})) {
            return;
        }

        // Try creating the announcement with CANDIDATE_DELAYED state (which
        // will fail due to the uniqueness of the ByPeer index if a
        // non-CANDIDATE_BEST announcement already exists with the same txid
        // and peer). Bail out in that case.
        auto ret = m_index.get<ByPeer>().emplace(txid, peer, preferred, reqtime,
                                                 m_current_sequence);
        if (!ret.second) {
            return;
        }

        // Update accounting metadata.
        ++m_peerinfo[peer].m_total;
        ++m_current_sequence;
    }

    //! Find the TxIds to request now from peer.
    std::vector<TxId> GetRequestable(NodeId peer,
                                     std::chrono::microseconds now) {
        // Move time.
        SetTimePoint(now);

        // Find all CANDIDATE_BEST announcements for this peer.
        std::vector<const Announcement *> selected;
        auto it_peer = m_index.get<ByPeer>().lower_bound(
            ByPeerView{peer, true, TxId(uint256::ZERO)});
        while (it_peer != m_index.get<ByPeer>().end() &&
               it_peer->m_peer == peer &&
               it_peer->GetState() == State::CANDIDATE_BEST) {
            selected.emplace_back(&*it_peer);
            ++it_peer;
        }

        // Sort by sequence number.
        std::sort(selected.begin(), selected.end(),
                  [](const Announcement *a, const Announcement *b) {
                      return a->m_sequence < b->m_sequence;
                  });

        // Convert to TxId and return.
        std::vector<TxId> ret;
        ret.reserve(selected.size());
        std::transform(selected.begin(), selected.end(),
                       std::back_inserter(ret),
                       [](const Announcement *ann) { return ann->m_txid; });
        return ret;
    }

    void RequestedTx(NodeId peer, const TxId &txid,
                     std::chrono::microseconds expiry) {
        auto it = m_index.get<ByPeer>().find(ByPeerView{peer, true, txid});
        if (it == m_index.get<ByPeer>().end()) {
            // There is no CANDIDATE_BEST announcement, look for a _READY or
            // _DELAYED instead. If the caller only ever invokes RequestedTx
            // with the values returned by GetRequestable, and no other
            // non-const functions other than ForgetTxHash and GetRequestable in
            // between, this branch will never execute (as txids returned by
            // GetRequestable always correspond to CANDIDATE_BEST
            // announcements).

            it = m_index.get<ByPeer>().find(ByPeerView{peer, false, txid});
            if (it == m_index.get<ByPeer>().end() ||
                (it->GetState() != State::CANDIDATE_DELAYED &&
                 it->GetState() != State::CANDIDATE_READY)) {
                // There is no CANDIDATE announcement tracked for this peer, so
                // we have nothing to do. Either this txid wasn't tracked at
                // all (and the caller should have called ReceivedInv), or it
                // was already requested and/or completed for other reasons and
                // this is just a superfluous RequestedTx call.
                return;
            }

            // Look for an existing CANDIDATE_BEST or REQUESTED with the same
            // txid. We only need to do this if the found announcement had a
            // different state than CANDIDATE_BEST. If it did, invariants
            // guarantee that no other CANDIDATE_BEST or REQUESTED can exist.
            auto it_old = m_index.get<ByTxId>().lower_bound(
                ByTxIdView{txid, State::CANDIDATE_BEST, 0});
            if (it_old != m_index.get<ByTxId>().end() &&
                it_old->m_txid == txid) {
                if (it_old->GetState() == State::CANDIDATE_BEST) {
                    // The data structure's invariants require that there can be
                    // at most one CANDIDATE_BEST or one REQUESTED announcement
                    // per txid (but not both simultaneously), so we have to
                    // convert any existing CANDIDATE_BEST to another
                    // CANDIDATE_* when constructing another REQUESTED. It
                    // doesn't matter whether we pick CANDIDATE_READY or
                    // _DELAYED here, as SetTimePoint() will correct it at
                    // GetRequestable() time. If time only goes forward, it will
                    // always be _READY, so pick that to avoid extra work in
                    // SetTimePoint().
                    Modify<ByTxId>(it_old, [](Announcement &ann) {
                        ann.SetState(State::CANDIDATE_READY);
                    });
                } else if (it_old->GetState() == State::REQUESTED) {
                    // As we're no longer waiting for a response to the previous
                    // REQUESTED announcement, convert it to COMPLETED. This
                    // also helps guaranteeing progress.
                    Modify<ByTxId>(it_old, [](Announcement &ann) {
                        ann.SetState(State::COMPLETED);
                    });
                }
            }
        }

        Modify<ByPeer>(it, [expiry](Announcement &ann) {
            ann.SetState(State::REQUESTED);
            ann.m_time = expiry;
        });
    }

    void ReceivedResponse(NodeId peer, const TxId &txid) {
        // We need to search the ByPeer index for both (peer, false, txid) and
        // (peer, true, txid).
        auto it = m_index.get<ByPeer>().find(ByPeerView{peer, false, txid});
        if (it == m_index.get<ByPeer>().end()) {
            it = m_index.get<ByPeer>().find(ByPeerView{peer, true, txid});
        }
        if (it != m_index.get<ByPeer>().end()) {
            MakeCompleted(m_index.project<ByTxId>(it));
        }
    }

    size_t CountInFlight(NodeId peer) const {
        auto it = m_peerinfo.find(peer);
        if (it != m_peerinfo.end()) {
            return it->second.m_requested;
        }
        return 0;
    }

    size_t CountCandidates(NodeId peer) const {
        auto it = m_peerinfo.find(peer);
        if (it != m_peerinfo.end()) {
            return it->second.m_total - it->second.m_requested -
                   it->second.m_completed;
        }
        return 0;
    }

    size_t Count(NodeId peer) const {
        auto it = m_peerinfo.find(peer);
        if (it != m_peerinfo.end()) {
            return it->second.m_total;
        }
        return 0;
    }

    //! Count how many announcements are being tracked in total across all peers
    //! and transactions.
    size_t Size() const { return m_index.size(); }
};

TxRequestTracker::TxRequestTracker(bool deterministic)
    : m_impl{std::make_unique<TxRequestTracker::Impl>(deterministic)} {}

TxRequestTracker::~TxRequestTracker() = default;

void TxRequestTracker::ForgetTxId(const TxId &txid) {
    m_impl->ForgetTxId(txid);
}
void TxRequestTracker::DisconnectedPeer(NodeId peer) {
    m_impl->DisconnectedPeer(peer);
}
size_t TxRequestTracker::CountInFlight(NodeId peer) const {
    return m_impl->CountInFlight(peer);
}
size_t TxRequestTracker::CountCandidates(NodeId peer) const {
    return m_impl->CountCandidates(peer);
}
size_t TxRequestTracker::Count(NodeId peer) const {
    return m_impl->Count(peer);
}
size_t TxRequestTracker::Size() const {
    return m_impl->Size();
}

void TxRequestTracker::ReceivedInv(NodeId peer, const TxId &txid,
                                   bool preferred,
                                   std::chrono::microseconds reqtime) {
    m_impl->ReceivedInv(peer, txid, preferred, reqtime);
}

void TxRequestTracker::RequestedTx(NodeId peer, const TxId &txid,
                                   std::chrono::microseconds expiry) {
    m_impl->RequestedTx(peer, txid, expiry);
}

void TxRequestTracker::ReceivedResponse(NodeId peer, const TxId &txid) {
    m_impl->ReceivedResponse(peer, txid);
}

std::vector<TxId>
TxRequestTracker::GetRequestable(NodeId peer, std::chrono::microseconds now) {
    return m_impl->GetRequestable(peer, now);
}
