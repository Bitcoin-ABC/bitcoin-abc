// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2019 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_H
#define BITCOIN_NET_H

#include <avalanche/proofid.h>
#include <avalanche/proofradixtreeadapter.h>
#include <chainparams.h>
#include <common/bloom.h>
#include <compat.h>
#include <consensus/amount.h>
#include <crypto/siphash.h>
#include <hash.h>
#include <i2p.h>
#include <kernel/cs_main.h>
#include <logging.h>
#include <net_permissions.h>
#include <netaddress.h>
#include <nodeid.h>
#include <protocol.h>
#include <pubkey.h>
#include <radix.h>
#include <random.h>
#include <span.h>
#include <streams.h>
#include <sync.h>
#include <threadinterrupt.h>
#include <uint256.h>
#include <util/check.h>
#include <util/time.h>

#include <atomic>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <functional>
#include <list>
#include <map>
#include <memory>
#include <thread>
#include <vector>

class AddrMan;
class BanMan;
class Config;
class CNode;
class CScheduler;
struct bilingual_str;

/** Default for -whitelistrelay. */
static const bool DEFAULT_WHITELISTRELAY = true;
/** Default for -whitelistforcerelay. */
static const bool DEFAULT_WHITELISTFORCERELAY = false;

/**
 * Time after which to disconnect, after waiting for a ping response (or
 * inactivity).
 */
static constexpr std::chrono::minutes TIMEOUT_INTERVAL{20};
/** Run the feeler connection loop once every 2 minutes. **/
static constexpr auto FEELER_INTERVAL = 2min;
/** Run the extra block-relay-only connection loop once every 5 minutes. **/
static constexpr auto EXTRA_BLOCK_RELAY_ONLY_PEER_INTERVAL = 5min;
/** Maximum length of the user agent string in `version` message */
static const unsigned int MAX_SUBVERSION_LENGTH = 256;
/**
 * Maximum number of automatic outgoing nodes over which we'll relay everything
 * (blocks, tx, addrs, etc)
 */
static const int MAX_OUTBOUND_FULL_RELAY_CONNECTIONS = 16;
/** Maximum number of addnode outgoing nodes */
static const int MAX_ADDNODE_CONNECTIONS = 8;
/** Maximum number of block-relay-only outgoing connections */
static const int MAX_BLOCK_RELAY_ONLY_CONNECTIONS = 2;
/**
 * Maximum number of avalanche enabled outgoing connections by default.
 * Can be overridden with the -maxavalancheoutbound option.
 */
static const int DEFAULT_MAX_AVALANCHE_OUTBOUND_CONNECTIONS = 300;
/** Maximum number of feeler connections */
static const int MAX_FEELER_CONNECTIONS = 1;
/** -listen default */
static const bool DEFAULT_LISTEN = true;
/**
 * The maximum number of peer connections to maintain.
 * This quantity might not be reachable on some systems, especially on platforms
 * that do not provide a working poll() interface.
 */
static const unsigned int DEFAULT_MAX_PEER_CONNECTIONS = 4096;
/** The default for -maxuploadtarget. 0 = Unlimited */
static constexpr uint64_t DEFAULT_MAX_UPLOAD_TARGET = 0;
/** Default for blocks only*/
static const bool DEFAULT_BLOCKSONLY = false;
/** -peertimeout default */
static const int64_t DEFAULT_PEER_CONNECT_TIMEOUT = 60;
/** Number of file descriptors required for message capture **/
static const int NUM_FDS_MESSAGE_CAPTURE = 1;

static const bool DEFAULT_FORCEDNSSEED = false;
static const bool DEFAULT_DNSSEED = true;
static const bool DEFAULT_FIXEDSEEDS = true;
static const size_t DEFAULT_MAXRECEIVEBUFFER = 5 * 1000;
static const size_t DEFAULT_MAXSENDBUFFER = 1 * 1000;

struct AddedNodeInfo {
    std::string strAddedNode;
    CService resolvedAddress;
    bool fConnected;
    bool fInbound;
};

struct CNodeStats;
class CClientUIInterface;

struct CSerializedNetMsg {
    CSerializedNetMsg() = default;
    CSerializedNetMsg(CSerializedNetMsg &&) = default;
    CSerializedNetMsg &operator=(CSerializedNetMsg &&) = default;
    // No copying, only moves.
    CSerializedNetMsg(const CSerializedNetMsg &msg) = delete;
    CSerializedNetMsg &operator=(const CSerializedNetMsg &) = delete;

    CSerializedNetMsg Copy() const {
        CSerializedNetMsg copy;
        copy.data = data;
        copy.m_type = m_type;
        return copy;
    }

    std::vector<uint8_t> data;
    std::string m_type;
};

const std::vector<std::string> CONNECTION_TYPE_DOC{
    "outbound-full-relay (default automatic connections)",
    "block-relay-only (does not relay transactions or addresses)",
    "inbound (initiated by the peer)",
    "manual (added via addnode RPC or -addnode/-connect configuration options)",
    "addr-fetch (short-lived automatic connection for soliciting addresses)",
    "feeler (short-lived automatic connection for testing addresses)"};

/**
 * Different types of connections to a peer. This enum encapsulates the
 * information we have available at the time of opening or accepting the
 * connection. Aside from INBOUND, all types are initiated by us.
 */
enum class ConnectionType {
    /**
     * Inbound connections are those initiated by a peer. This is the only
     * property we know at the time of connection, until P2P messages are
     * exchanged.
     */
    INBOUND,

    /**
     * These are the default connections that we use to connect with the
     * network. There is no restriction on what is relayed- by default we relay
     * blocks, addresses & transactions. We automatically attempt to open
     * MAX_OUTBOUND_FULL_RELAY_CONNECTIONS using addresses from our AddrMan.
     */
    OUTBOUND_FULL_RELAY,

    /**
     * We open manual connections to addresses that users explicitly inputted
     * via the addnode RPC, or the -connect command line argument. Even if a
     * manual connection is misbehaving, we do not automatically disconnect or
     * add it to our discouragement filter.
     */
    MANUAL,

    /**
     * Feeler connections are short-lived connections made to check that a node
     * is alive. They can be useful for:
     * - test-before-evict: if one of the peers is considered for eviction from
     *   our AddrMan because another peer is mapped to the same slot in the
     *   tried table, evict only if this longer-known peer is offline.
     * - move node addresses from New to Tried table, so that we have more
     *   connectable addresses in our AddrMan.
     * Note that in the literature ("Eclipse Attacks on Bitcoin’s Peer-to-Peer
     * Network") only the latter feature is referred to as "feeler connections",
     * although in our codebase feeler connections encompass test-before-evict
     * as well.
     * We make these connections approximately every FEELER_INTERVAL:
     * first we resolve previously found collisions if they exist
     * (test-before-evict), otherwise connect to a node from the new table.
     */
    FEELER,

    /**
     * We use block-relay-only connections to help prevent against partition
     * attacks. By not relaying transactions or addresses, these connections
     * are harder to detect by a third party, thus helping obfuscate the
     * network topology. We automatically attempt to open
     * MAX_BLOCK_RELAY_ONLY_ANCHORS using addresses from our anchors.dat. Then
     * addresses from our AddrMan if MAX_BLOCK_RELAY_ONLY_CONNECTIONS
     * isn't reached yet.
     */
    BLOCK_RELAY,

    /**
     * AddrFetch connections are short lived connections used to solicit
     * addresses from peers. These are initiated to addresses submitted via the
     * -seednode command line argument, or under certain conditions when the
     * AddrMan is empty.
     */
    ADDR_FETCH,

    /**
     * Special case of connection to a full relay outbound with avalanche
     * service enabled.
     */
    AVALANCHE_OUTBOUND,
};

/** Convert ConnectionType enum to a string value */
std::string ConnectionTypeAsString(ConnectionType conn_type);

/**
 * Look up IP addresses from all interfaces on the machine and add them to the
 * list of local addresses to self-advertise.
 * The loopback interface is skipped and only the first address from each
 * interface is used.
 */
void Discover();

uint16_t GetListenPort();

enum {
    // unknown
    LOCAL_NONE,
    // address a local interface listens on
    LOCAL_IF,
    // address explicit bound to
    LOCAL_BIND,
    // address reported by UPnP or NAT-PMP
    LOCAL_MAPPED,
    // address explicitly specified (-externalip=)
    LOCAL_MANUAL,

    LOCAL_MAX
};

bool IsPeerAddrLocalGood(CNode *pnode);
/** Returns a local address that we should advertise to this peer. */
std::optional<CService> GetLocalAddrForPeer(CNode &node);

/**
 * Mark a network as reachable or unreachable (no automatic connects to it)
 * @note Networks are reachable by default
 */
void SetReachable(enum Network net, bool reachable);
/** @returns true if the network is reachable, false otherwise */
bool IsReachable(enum Network net);
/** @returns true if the address is in a reachable network, false otherwise */
bool IsReachable(const CNetAddr &addr);

bool AddLocal(const CService &addr, int nScore = LOCAL_NONE);
bool AddLocal(const CNetAddr &addr, int nScore = LOCAL_NONE);
void RemoveLocal(const CService &addr);
bool SeenLocal(const CService &addr);
bool IsLocal(const CService &addr);
bool GetLocal(CService &addr, const CNetAddr *paddrPeer = nullptr);
CService GetLocalAddress(const CNetAddr &addrPeer);

extern bool fDiscover;
extern bool fListen;

struct LocalServiceInfo {
    int nScore;
    uint16_t nPort;
};

extern GlobalMutex g_maplocalhost_mutex;
extern std::map<CNetAddr, LocalServiceInfo>
    mapLocalHost GUARDED_BY(g_maplocalhost_mutex);

extern const std::string NET_MESSAGE_COMMAND_OTHER;
// Command, total bytes
typedef std::map<std::string, uint64_t> mapMsgCmdSize;

/**
 * POD that contains various stats about a node.
 * Usually constructed from CConman::GetNodeStats. Stats are filled from the
 * node using CNode::copyStats.
 */
struct CNodeStats {
    NodeId nodeid;
    std::chrono::seconds m_last_send;
    std::chrono::seconds m_last_recv;
    std::chrono::seconds m_last_tx_time;
    std::chrono::seconds m_last_proof_time;
    std::chrono::seconds m_last_block_time;
    std::chrono::seconds m_connected;
    int64_t nTimeOffset;
    std::string m_addr_name;
    int nVersion;
    std::string cleanSubVer;
    bool fInbound;
    bool m_bip152_highbandwidth_to;
    bool m_bip152_highbandwidth_from;
    int m_starting_height;
    uint64_t nSendBytes;
    mapMsgCmdSize mapSendBytesPerMsgCmd;
    uint64_t nRecvBytes;
    mapMsgCmdSize mapRecvBytesPerMsgCmd;
    NetPermissionFlags m_permissionFlags;
    std::chrono::microseconds m_last_ping_time;
    std::chrono::microseconds m_min_ping_time;
    // Our address, as reported by the peer
    std::string addrLocal;
    // Address of this peer
    CAddress addr;
    // Bind address of our side of the connection
    CAddress addrBind;
    // Network the peer connected through
    Network m_network;
    uint32_t m_mapped_as;
    ConnectionType m_conn_type;
    std::optional<double> m_availabilityScore;
};

/**
 * Transport protocol agnostic message container.
 * Ideally it should only contain receive time, payload,
 * type and size.
 */
class CNetMessage {
public:
    //! received message data
    CDataStream m_recv;
    //! time of message receipt
    std::chrono::microseconds m_time{0};
    bool m_valid_netmagic = false;
    bool m_valid_header = false;
    bool m_valid_checksum = false;
    //! size of the payload
    uint32_t m_message_size{0};
    //! used wire size of the message (including header/checksum)
    uint32_t m_raw_message_size{0};
    std::string m_type;

    CNetMessage(CDataStream &&recv_in) : m_recv(std::move(recv_in)) {}

    void SetVersion(int nVersionIn) { m_recv.SetVersion(nVersionIn); }
};

/**
 * The TransportDeserializer takes care of holding and deserializing the
 * network receive buffer. It can deserialize the network buffer into a
 * transport protocol agnostic CNetMessage (command & payload)
 */
class TransportDeserializer {
public:
    // returns true if the current deserialization is complete
    virtual bool Complete() const = 0;
    // set the serialization context version
    virtual void SetVersion(int version) = 0;
    /** read and deserialize data, advances msg_bytes data pointer */
    virtual int Read(const Config &config, Span<const uint8_t> &msg_bytes) = 0;
    // decomposes a message from the context
    virtual CNetMessage GetMessage(const Config &config,
                                   std::chrono::microseconds time) = 0;
    virtual ~TransportDeserializer() {}
};

class V1TransportDeserializer final : public TransportDeserializer {
private:
    mutable CHash256 hasher;
    mutable uint256 data_hash;

    // Parsing header (false) or data (true)
    bool in_data;
    // Partially received header.
    CDataStream hdrbuf;
    // Complete header.
    CMessageHeader hdr;
    // Received message data.
    CDataStream vRecv;
    uint32_t nHdrPos;
    uint32_t nDataPos;

    const uint256 &GetMessageHash() const;
    int readHeader(const Config &config, Span<const uint8_t> msg_bytes);
    int readData(Span<const uint8_t> msg_bytes);

    void Reset() {
        vRecv.clear();
        hdrbuf.clear();
        hdrbuf.resize(24);
        in_data = false;
        nHdrPos = 0;
        nDataPos = 0;
        data_hash.SetNull();
        hasher.Reset();
    }

public:
    V1TransportDeserializer(
        const CMessageHeader::MessageMagic &pchMessageStartIn, int nTypeIn,
        int nVersionIn)
        : hdrbuf(nTypeIn, nVersionIn), hdr(pchMessageStartIn),
          vRecv(nTypeIn, nVersionIn) {
        Reset();
    }

    bool Complete() const override {
        if (!in_data) {
            return false;
        }

        return (hdr.nMessageSize == nDataPos);
    }

    void SetVersion(int nVersionIn) override {
        hdrbuf.SetVersion(nVersionIn);
        vRecv.SetVersion(nVersionIn);
    }
    int Read(const Config &config, Span<const uint8_t> &msg_bytes) override {
        int ret = in_data ? readData(msg_bytes) : readHeader(config, msg_bytes);
        if (ret < 0) {
            Reset();
        } else {
            msg_bytes = msg_bytes.subspan(ret);
        }
        return ret;
    }

    CNetMessage GetMessage(const Config &config,
                           std::chrono::microseconds time) override;
};

/**
 * The TransportSerializer prepares messages for the network transport
 */
class TransportSerializer {
public:
    // prepare message for transport (header construction, error-correction
    // computation, payload encryption, etc.)
    virtual void prepareForTransport(const Config &config,
                                     CSerializedNetMsg &msg,
                                     std::vector<uint8_t> &header) = 0;
    virtual ~TransportSerializer() {}
};

class V1TransportSerializer : public TransportSerializer {
public:
    void prepareForTransport(const Config &config, CSerializedNetMsg &msg,
                             std::vector<uint8_t> &header) override;
};

/** Information about a peer */
class CNode {
    friend class CConnman;
    friend struct ConnmanTestMsg;

public:
    std::unique_ptr<TransportDeserializer> m_deserializer;
    std::unique_ptr<TransportSerializer> m_serializer;

    // socket
    SOCKET hSocket GUARDED_BY(cs_hSocket);
    /** Total size of all vSendMsg entries. */
    size_t nSendSize GUARDED_BY(cs_vSend){0};
    /** Offset inside the first vSendMsg already sent */
    size_t nSendOffset GUARDED_BY(cs_vSend){0};
    uint64_t nSendBytes GUARDED_BY(cs_vSend){0};
    std::deque<std::vector<uint8_t>> vSendMsg GUARDED_BY(cs_vSend);
    Mutex cs_vSend;
    Mutex cs_hSocket;
    Mutex cs_vRecv;

    RecursiveMutex cs_vProcessMsg;
    std::list<CNetMessage> vProcessMsg GUARDED_BY(cs_vProcessMsg);
    size_t nProcessQueueSize{0};

    uint64_t nRecvBytes GUARDED_BY(cs_vRecv){0};

    std::atomic<std::chrono::seconds> m_last_send{0s};
    std::atomic<std::chrono::seconds> m_last_recv{0s};
    //! Unix epoch time at peer connection
    const std::chrono::seconds m_connected;
    std::atomic<int64_t> nTimeOffset{0};
    // Address of this peer
    const CAddress addr;
    // Bind address of our side of the connection
    const CAddress addrBind;
    const std::string m_addr_name;
    //! Whether this peer is an inbound onion, i.e. connected via our Tor onion
    //! service.
    const bool m_inbound_onion;
    std::atomic<int> nVersion{0};
    // The nonce provided by the remote host.
    uint64_t nRemoteHostNonce{0};
    // The extra entropy provided by the remote host.
    uint64_t nRemoteExtraEntropy{0};
    /**
     * cleanSubVer is a sanitized string of the user agent byte array we read
     * from the wire. This cleaned string can safely be logged or displayed.
     */
    Mutex m_subver_mutex;
    std::string cleanSubVer GUARDED_BY(m_subver_mutex){};
    // This peer is preferred for eviction.
    bool m_prefer_evict{false};
    bool HasPermission(NetPermissionFlags permission) const {
        return NetPermissions::HasFlag(m_permissionFlags, permission);
    }
    std::atomic_bool fSuccessfullyConnected{false};
    // Setting fDisconnect to true will cause the node to be disconnected the
    // next time DisconnectNodes() runs
    std::atomic_bool fDisconnect{false};
    CSemaphoreGrant grantOutbound;
    std::atomic<int> nRefCount{0};

    const uint64_t nKeyedNetGroup;
    std::atomic_bool fPauseRecv{false};
    std::atomic_bool fPauseSend{false};

    bool IsOutboundOrBlockRelayConn() const {
        switch (m_conn_type) {
            case ConnectionType::OUTBOUND_FULL_RELAY:
            case ConnectionType::BLOCK_RELAY:
            case ConnectionType::AVALANCHE_OUTBOUND:
                return true;
            case ConnectionType::INBOUND:
            case ConnectionType::MANUAL:
            case ConnectionType::ADDR_FETCH:
            case ConnectionType::FEELER:
                return false;
        } // no default case, so the compiler can warn about missing cases

        assert(false);
    }

    bool IsFullOutboundConn() const {
        return m_conn_type == ConnectionType::OUTBOUND_FULL_RELAY ||
               m_conn_type == ConnectionType::AVALANCHE_OUTBOUND;
    }

    bool IsManualConn() const { return m_conn_type == ConnectionType::MANUAL; }

    bool IsBlockOnlyConn() const {
        return m_conn_type == ConnectionType::BLOCK_RELAY;
    }

    bool IsFeelerConn() const { return m_conn_type == ConnectionType::FEELER; }

    bool IsAddrFetchConn() const {
        return m_conn_type == ConnectionType::ADDR_FETCH;
    }

    bool IsInboundConn() const {
        return m_conn_type == ConnectionType::INBOUND;
    }

    bool IsAvalancheOutboundConnection() const {
        return m_conn_type == ConnectionType::AVALANCHE_OUTBOUND;
    }

    bool ExpectServicesFromConn() const {
        switch (m_conn_type) {
            case ConnectionType::INBOUND:
            case ConnectionType::MANUAL:
            case ConnectionType::FEELER:
                return false;
            case ConnectionType::OUTBOUND_FULL_RELAY:
            case ConnectionType::BLOCK_RELAY:
            case ConnectionType::ADDR_FETCH:
            case ConnectionType::AVALANCHE_OUTBOUND:
                return true;
        } // no default case, so the compiler can warn about missing cases

        assert(false);
    }

    /**
     * Get network the peer connected through.
     *
     * Returns Network::NET_ONION for *inbound* onion connections,
     * and CNetAddr::GetNetClass() otherwise. The latter cannot be used directly
     * because it doesn't detect the former, and it's not the responsibility of
     * the CNetAddr class to know the actual network a peer is connected
     * through.
     *
     * @return network the peer connected through.
     */
    Network ConnectedThroughNetwork() const;

    // We selected peer as (compact blocks) high-bandwidth peer (BIP152)
    std::atomic<bool> m_bip152_highbandwidth_to{false};
    // Peer selected us as (compact blocks) high-bandwidth peer (BIP152)
    std::atomic<bool> m_bip152_highbandwidth_from{false};

    /**
     * Whether this peer provides all services that we want.
     * Used for eviction decisions
     */
    std::atomic_bool m_has_all_wanted_services{false};

    /**
     * Whether we should relay transactions to this peer (their version
     * message did not include fRelay=false and this is not a block-relay-only
     * connection). This only changes from false to true. It will never change
     * back to false. Used only in inbound eviction logic.
     */
    std::atomic_bool m_relays_txs{false};

    /**
     * Whether this peer has loaded a bloom filter. Used only in inbound
     * eviction logic.
     */
    std::atomic_bool m_bloom_filter_loaded{false};

    // True if we know this peer is using Avalanche (at least polling)
    std::atomic<bool> m_avalanche_enabled{false};

    mutable Mutex cs_avalanche_pubkey;
    // Pubkey used to verify signatures on Avalanche messages from this peer
    std::optional<CPubKey> m_avalanche_pubkey GUARDED_BY(cs_avalanche_pubkey);

    /** The node was polled for count invs */
    void invsPolled(uint32_t count);

    /** The node voted for count invs */
    void invsVoted(uint32_t count);

    /**
     * The availability score is calculated using an exponentially weighted
     * average.
     * This has several interesting properties:
     *  - The most recent polls/responses have more weight than the previous
     * ones. A node that recently stopped answering will see its ratio
     * decrease quickly.
     *  - This is a low-pass filter, so it causes delay. This means that a
     * node needs to have a track record for the ratio to be high. A node
     * that has been little requested will have a lower ratio than a node
     * that failed to answer a few polls but answered a lot of them.
     *  - It is cheap to compute.
     *
     * This is expected to be called at a fixed interval of
     * AVALANCHE_STATISTICS_REFRESH_PERIOD.
     */
    void updateAvailabilityScore(double decayFactor);
    double getAvailabilityScore() const;

    // Store the next time we will consider a getavaaddr message from this peer
    std::chrono::seconds m_nextGetAvaAddr{0};

    // The last time the node sent us a faulty message
    std::atomic<std::chrono::seconds> m_avalanche_last_message_fault{0s};
    // How much faulty messages did this node accumulate
    std::atomic<int> m_avalanche_message_fault_counter{0};

    SteadyMilliseconds m_last_poll{};

    /**
     * UNIX epoch time of the last block received from this peer that we had
     * not yet seen (e.g. not already received from another peer), that passed
     * preliminary validity checks and was saved to disk, even if we don't
     * connect the block or it eventually fails connection. Used as an inbound
     * peer eviction criterium in CConnman::AttemptToEvictConnection.
     */
    std::atomic<std::chrono::seconds> m_last_block_time{0s};

    /**
     * UNIX epoch time of the last transaction received from this peer that we
     * had not yet seen (e.g. not already received from another peer) and that
     * was accepted into our mempool. Used as an inbound peer eviction criterium
     * in CConnman::AttemptToEvictConnection.
     */
    std::atomic<std::chrono::seconds> m_last_tx_time{0s};

    /**
     * UNIX epoch time of the last proof received from this peer that we
     * had not yet seen (e.g. not already received from another peer) and that
     * was accepted into our proof pool. Used as an inbound peer eviction
     * criterium in CConnman::AttemptToEvictConnection.
     */
    std::atomic<std::chrono::seconds> m_last_proof_time{0s};

    /** Last measured round-trip time. Used only for RPC/GUI stats/debugging.*/
    std::atomic<std::chrono::microseconds> m_last_ping_time{0us};

    /**
     * Lowest measured round-trip time. Used as an inbound peer eviction
     * criterium in CConnman::AttemptToEvictConnection.
     */
    std::atomic<std::chrono::microseconds> m_min_ping_time{
        std::chrono::microseconds::max()};

    CNode(NodeId id, SOCKET hSocketIn, const CAddress &addrIn,
          uint64_t nKeyedNetGroupIn, uint64_t nLocalHostNonceIn,
          uint64_t nLocalExtraEntropyIn, const CAddress &addrBindIn,
          const std::string &addrNameIn, ConnectionType conn_type_in,
          bool inbound_onion);
    ~CNode();
    CNode(const CNode &) = delete;
    CNode &operator=(const CNode &) = delete;

    /**
     * A ping-pong round trip has completed successfully. Update latest and
     * minimum ping times.
     */
    void PongReceived(std::chrono::microseconds ping_time) {
        m_last_ping_time = ping_time;
        m_min_ping_time = std::min(m_min_ping_time.load(), ping_time);
    }

    NodeId GetId() const { return id; }

    uint64_t GetLocalNonce() const { return nLocalHostNonce; }
    uint64_t GetLocalExtraEntropy() const { return nLocalExtraEntropy; }

    int GetRefCount() const {
        assert(nRefCount >= 0);
        return nRefCount;
    }

    /**
     * Receive bytes from the buffer and deserialize them into messages.
     *
     * @param[in]   msg_bytes   The raw data
     * @param[out]  complete    Set True if at least one message has been
     *                          deserialized and is ready to be processed
     * @return  True if the peer should stay connected,
     *          False if the peer should be disconnected from.
     */
    bool ReceiveMsgBytes(const Config &config, Span<const uint8_t> msg_bytes,
                         bool &complete) EXCLUSIVE_LOCKS_REQUIRED(!cs_vRecv);

    void SetCommonVersion(int greatest_common_version) {
        Assume(m_greatest_common_version == INIT_PROTO_VERSION);
        m_greatest_common_version = greatest_common_version;
    }
    int GetCommonVersion() const { return m_greatest_common_version; }

    CService GetAddrLocal() const EXCLUSIVE_LOCKS_REQUIRED(!m_addr_local_mutex);
    //! May not be called more than once
    void SetAddrLocal(const CService &addrLocalIn)
        EXCLUSIVE_LOCKS_REQUIRED(!m_addr_local_mutex);

    CNode *AddRef() {
        nRefCount++;
        return this;
    }

    void Release() { nRefCount--; }

    void CloseSocketDisconnect() EXCLUSIVE_LOCKS_REQUIRED(!cs_hSocket);

    void copyStats(CNodeStats &stats)
        EXCLUSIVE_LOCKS_REQUIRED(!m_subver_mutex, !m_addr_local_mutex,
                                 !cs_vSend, !cs_vRecv);

    std::string ConnectionTypeAsString() const {
        return ::ConnectionTypeAsString(m_conn_type);
    }

private:
    const NodeId id;
    const uint64_t nLocalHostNonce;
    const uint64_t nLocalExtraEntropy;
    const ConnectionType m_conn_type;
    std::atomic<int> m_greatest_common_version{INIT_PROTO_VERSION};

    NetPermissionFlags m_permissionFlags{NetPermissionFlags::None};
    // Used only by SocketHandler thread
    std::list<CNetMessage> vRecvMsg;

    // Our address, as reported by the peer
    mutable Mutex m_addr_local_mutex;
    CService addrLocal GUARDED_BY(m_addr_local_mutex);

    /**
     * The inventories polled and voted counters since last score
     * computation, stored as a pair of uint32_t with the poll counter
     * being the 32 lowest bits and the vote counter the 32 highest bits.
     */
    std::atomic<uint64_t> invCounters{0};

    /** The last computed score */
    std::atomic<double> availabilityScore{0.};

    mapMsgCmdSize mapSendBytesPerMsgCmd GUARDED_BY(cs_vSend);
    mapMsgCmdSize mapRecvBytesPerMsgCmd GUARDED_BY(cs_vRecv);
};

/**
 * Interface for message handling
 */
class NetEventsInterface {
public:
    /**
     * Mutex for anything that is only accessed via the msg processing thread
     */
    static Mutex g_msgproc_mutex;

    /** Initialize a peer (setup state, queue any initial messages) */
    virtual void InitializeNode(const Config &config, CNode &node,
                                ServiceFlags our_services) = 0;

    /** Handle removal of a peer (clear state) */
    virtual void FinalizeNode(const Config &config, const CNode &node) = 0;

    /**
     * Process protocol messages received from a given node
     *
     * @param[in]   config          The applicable configuration object.
     * @param[in]   pnode           The node which we have received messages
     * from.
     * @param[in]   interrupt       Interrupt condition for processing threads
     * @return                      True if there is more work to be done
     */
    virtual bool ProcessMessages(const Config &config, CNode *pnode,
                                 std::atomic<bool> &interrupt)
        EXCLUSIVE_LOCKS_REQUIRED(g_msgproc_mutex) = 0;

    /**
     * Send queued protocol messages to a given node.
     *
     * @param[in]   config          The applicable configuration object.
     * @param[in]   pnode           The node which we are sending messages to.
     * @return                      True if there is more work to be done
     */
    virtual bool SendMessages(const Config &config, CNode *pnode)
        EXCLUSIVE_LOCKS_REQUIRED(g_msgproc_mutex) = 0;

protected:
    /**
     * Protected destructor so that instances can only be deleted by derived
     * classes. If that restriction is no longer desired, this should be made
     * public and virtual.
     */
    ~NetEventsInterface() = default;
};

namespace {
struct CConnmanTest;
}

class NetEventsInterface;
class CConnman {
public:
    enum NumConnections {
        CONNECTIONS_NONE = 0,
        CONNECTIONS_IN = (1U << 0),
        CONNECTIONS_OUT = (1U << 1),
        CONNECTIONS_ALL = (CONNECTIONS_IN | CONNECTIONS_OUT),
    };

    struct Options {
        ServiceFlags nLocalServices = NODE_NONE;
        int nMaxConnections = 0;
        int m_max_outbound_full_relay = 0;
        int m_max_outbound_block_relay = 0;
        int m_max_avalanche_outbound = 0;
        int nMaxAddnode = 0;
        int nMaxFeeler = 0;
        CClientUIInterface *uiInterface = nullptr;
        std::vector<NetEventsInterface *> m_msgproc;
        BanMan *m_banman = nullptr;
        unsigned int nSendBufferMaxSize = 0;
        unsigned int nReceiveFloodSize = 0;
        uint64_t nMaxOutboundLimit = 0;
        int64_t m_peer_connect_timeout = DEFAULT_PEER_CONNECT_TIMEOUT;
        std::vector<std::string> vSeedNodes;
        std::vector<NetWhitelistPermissions> vWhitelistedRange;
        std::vector<NetWhitebindPermissions> vWhiteBinds;
        std::vector<CService> vBinds;
        std::vector<CService> onion_binds;
        /// True if the user did not specify -bind= or -whitebind= and thus
        /// we should bind on `0.0.0.0` (IPv4) and `::` (IPv6).
        bool bind_on_any;
        bool m_use_addrman_outgoing = true;
        std::vector<std::string> m_specified_outgoing;
        std::vector<std::string> m_added_nodes;
        bool m_i2p_accept_incoming = true;
    };

    void Init(const Options &connOptions)
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex) {
        nLocalServices = connOptions.nLocalServices;
        nMaxConnections = connOptions.nMaxConnections;
        m_use_addrman_outgoing = connOptions.m_use_addrman_outgoing;
        nMaxAddnode = connOptions.nMaxAddnode;
        nMaxFeeler = connOptions.nMaxFeeler;
        {
            // Lock cs_main to prevent a potential race with the peer validation
            // logic thread.
            LOCK(::cs_main);
            m_max_outbound_full_relay =
                std::min(connOptions.m_max_outbound_full_relay,
                         connOptions.nMaxConnections);
            m_max_avalanche_outbound = connOptions.m_max_avalanche_outbound;
            m_max_outbound_block_relay = connOptions.m_max_outbound_block_relay;
            m_max_outbound = m_max_outbound_full_relay +
                             m_max_outbound_block_relay + nMaxFeeler +
                             m_max_avalanche_outbound;
        }
        m_client_interface = connOptions.uiInterface;
        m_banman = connOptions.m_banman;
        m_msgproc = connOptions.m_msgproc;
        nSendBufferMaxSize = connOptions.nSendBufferMaxSize;
        nReceiveFloodSize = connOptions.nReceiveFloodSize;
        m_peer_connect_timeout =
            std::chrono::seconds{connOptions.m_peer_connect_timeout};
        {
            LOCK(cs_totalBytesSent);
            nMaxOutboundLimit = connOptions.nMaxOutboundLimit;
        }
        vWhitelistedRange = connOptions.vWhitelistedRange;
        {
            LOCK(m_added_nodes_mutex);
            m_added_nodes = connOptions.m_added_nodes;
        }
        m_onion_binds = connOptions.onion_binds;
    }

    CConnman(const Config &configIn, uint64_t seed0, uint64_t seed1,
             AddrMan &addrmanIn, bool network_active = true);
    ~CConnman();

    bool Start(CScheduler &scheduler, const Options &options)
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex, !m_addr_fetches_mutex,
                                 !mutexMsgProc);

    void StopThreads();
    void StopNodes();
    void Stop() {
        StopThreads();
        StopNodes();
    };

    void Interrupt() EXCLUSIVE_LOCKS_REQUIRED(!mutexMsgProc);
    bool GetNetworkActive() const { return fNetworkActive; };
    bool GetUseAddrmanOutgoing() const { return m_use_addrman_outgoing; };
    void SetNetworkActive(bool active);
    void OpenNetworkConnection(const CAddress &addrConnect, bool fCountFailure,
                               CSemaphoreGrant *grantOutbound,
                               const char *strDest, ConnectionType conn_type);
    bool CheckIncomingNonce(uint64_t nonce);

    bool ForNode(NodeId id, std::function<bool(CNode *pnode)> func);

    void PushMessage(CNode *pnode, CSerializedNetMsg &&msg);

    using NodeFn = std::function<void(CNode *)>;
    void ForEachNode(const NodeFn &func) {
        LOCK(m_nodes_mutex);
        for (auto &&node : m_nodes) {
            if (NodeFullyConnected(node)) {
                func(node);
            }
        }
    };

    void ForEachNode(const NodeFn &func) const {
        LOCK(m_nodes_mutex);
        for (auto &&node : m_nodes) {
            if (NodeFullyConnected(node)) {
                func(node);
            }
        }
    };

    // Addrman functions
    /**
     * Return all or many randomly selected addresses, optionally by network.
     *
     * @param[in] max_addresses  Maximum number of addresses to return
     *                           (0 = all).
     * @param[in] max_pct        Maximum percentage of addresses to return
     *                           (0 = all).
     * @param[in] network        Select only addresses of this network
     *                           (nullopt = all).
     */
    std::vector<CAddress> GetAddresses(size_t max_addresses, size_t max_pct,
                                       std::optional<Network> network) const;
    /**
     * Cache is used to minimize topology leaks, so it should
     * be used for all non-trusted calls, for example, p2p.
     * A non-malicious call (from RPC or a peer with addr permission) should
     * call the function without a parameter to avoid using the cache.
     */
    std::vector<CAddress> GetAddresses(CNode &requestor, size_t max_addresses,
                                       size_t max_pct);

    // This allows temporarily exceeding m_max_outbound_full_relay, with the
    // goal of finding a peer that is better than all our current peers.
    void SetTryNewOutboundPeer(bool flag);
    bool GetTryNewOutboundPeer() const;

    void StartExtraBlockRelayPeers() {
        LogPrint(BCLog::NET, "net: enabling extra block-relay-only peers\n");
        m_start_extra_block_relay_peers = true;
    }

    // Return the number of outbound peers we have in excess of our target (eg,
    // if we previously called SetTryNewOutboundPeer(true), and have since set
    // to false, we may have extra peers that we wish to disconnect). This may
    // return a value less than (num_outbound_connections - num_outbound_slots)
    // in cases where some outbound connections are not yet fully connected, or
    // not yet fully disconnected.
    int GetExtraFullOutboundCount() const;
    // Count the number of block-relay-only peers we have over our limit.
    int GetExtraBlockRelayCount() const;

    bool AddNode(const std::string &node)
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex);
    bool RemoveAddedNode(const std::string &node)
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex);
    std::vector<AddedNodeInfo> GetAddedNodeInfo() const
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex);

    /**
     * Attempts to open a connection. Currently only used from tests.
     *
     * @param[in]   address     Address of node to try connecting to
     * @param[in]   conn_type   ConnectionType::OUTBOUND,
     *                          ConnectionType::BLOCK_RELAY,
     *                          ConnectionType::ADDR_FETCH, or
     *                          ConnectionType::FEELER
     * @return      bool        Returns false if there are no available
     *                          slots for this connection:
     *                          - conn_type not a supported ConnectionType
     *                          - Max total outbound connection capacity filled
     *                          - Max connection capacity for type is filled
     */
    bool AddConnection(const std::string &address, ConnectionType conn_type);

    size_t GetNodeCount(NumConnections num) const;
    void GetNodeStats(std::vector<CNodeStats> &vstats) const;
    bool DisconnectNode(const std::string &node);
    bool DisconnectNode(const CSubNet &subnet);
    bool DisconnectNode(const CNetAddr &addr);
    bool DisconnectNode(NodeId id);

    //! Used to convey which local services we are offering peers during node
    //! connection.
    //!
    //! The data returned by this is used in CNode construction,
    //! which is used to advertise which services we are offering
    //! that peer during `net_processing.cpp:PushNodeVersion()`.
    ServiceFlags GetLocalServices() const;

    uint64_t GetMaxOutboundTarget() const;
    std::chrono::seconds GetMaxOutboundTimeframe() const;

    //! check if the outbound target is reached. If param
    //! historicalBlockServingLimit is set true, the function will response true
    //! if the limit for serving historical blocks has been reached.
    bool OutboundTargetReached(bool historicalBlockServingLimit) const;

    //! response the bytes left in the current max outbound cycle in case of no
    //! limit, it will always response 0
    uint64_t GetOutboundTargetBytesLeft() const;

    //! returns the time in second left in the current max outbound cycle in
    //! case of no limit, it will always return 0
    std::chrono::seconds GetMaxOutboundTimeLeftInCycle() const;

    uint64_t GetTotalBytesRecv() const;
    uint64_t GetTotalBytesSent() const;

    /** Get a unique deterministic randomizer. */
    CSipHasher GetDeterministicRandomizer(uint64_t id) const;

    unsigned int GetReceiveFloodSize() const;

    void WakeMessageHandler() EXCLUSIVE_LOCKS_REQUIRED(!mutexMsgProc);

    /**
     * Return true if we should disconnect the peer for failing an inactivity
     * check.
     */
    bool ShouldRunInactivityChecks(const CNode &node,
                                   std::chrono::seconds now) const;

private:
    struct ListenSocket {
    public:
        SOCKET socket;
        inline void AddSocketPermissionFlags(NetPermissionFlags &flags) const {
            NetPermissions::AddFlag(flags, m_permissions);
        }
        ListenSocket(SOCKET socket_, NetPermissionFlags permissions_)
            : socket(socket_), m_permissions(permissions_) {}

    private:
        NetPermissionFlags m_permissions;
    };

    bool BindListenPort(const CService &bindAddr, bilingual_str &strError,
                        NetPermissionFlags permissions);
    bool Bind(const CService &addr, unsigned int flags,
              NetPermissionFlags permissions);
    bool InitBinds(const Options &options);

    void ThreadOpenAddedConnections()
        EXCLUSIVE_LOCKS_REQUIRED(!m_added_nodes_mutex);
    void AddAddrFetch(const std::string &strDest)
        EXCLUSIVE_LOCKS_REQUIRED(!m_addr_fetches_mutex);
    void ProcessAddrFetch() EXCLUSIVE_LOCKS_REQUIRED(!m_addr_fetches_mutex);
    void
    ThreadOpenConnections(std::vector<std::string> connect,
                          std::function<void(const CAddress &, ConnectionType)>
                              mockOpenConnection)
        EXCLUSIVE_LOCKS_REQUIRED(!m_addr_fetches_mutex, !m_added_nodes_mutex,
                                 !m_nodes_mutex);
    void ThreadMessageHandler() EXCLUSIVE_LOCKS_REQUIRED(!mutexMsgProc);
    void ThreadI2PAcceptIncoming();
    void AcceptConnection(const ListenSocket &hListenSocket);

    /**
     * Create a `CNode` object from a socket that has just been accepted and add
     * the node to the `m_nodes` member.
     * @param[in] hSocket Connected socket to communicate with the peer.
     * @param[in] permissionFlags The peer's permissions.
     * @param[in] addr_bind The address and port at our side of the connection.
     * @param[in] addr The address and port at the peer's side of the connection
     */
    void CreateNodeFromAcceptedSocket(SOCKET hSocket,
                                      NetPermissionFlags permissionFlags,
                                      const CAddress &addr_bind,
                                      const CAddress &addr);

    void DisconnectNodes();
    void NotifyNumConnectionsChanged();
    /** Return true if the peer is inactive and should be disconnected. */
    bool InactivityCheck(const CNode &node) const;
    bool GenerateSelectSet(std::set<SOCKET> &recv_set,
                           std::set<SOCKET> &send_set,
                           std::set<SOCKET> &error_set);
    void SocketEvents(std::set<SOCKET> &recv_set, std::set<SOCKET> &send_set,
                      std::set<SOCKET> &error_set);
    void SocketHandler() EXCLUSIVE_LOCKS_REQUIRED(!mutexMsgProc);
    void ThreadSocketHandler() EXCLUSIVE_LOCKS_REQUIRED(!mutexMsgProc);
    void ThreadDNSAddressSeed()
        EXCLUSIVE_LOCKS_REQUIRED(!m_addr_fetches_mutex, !m_nodes_mutex);

    uint64_t CalculateKeyedNetGroup(const CAddress &ad) const;

    CNode *FindNode(const CNetAddr &ip);
    CNode *FindNode(const CSubNet &subNet);
    CNode *FindNode(const std::string &addrName);
    CNode *FindNode(const CService &addr);

    /**
     * Determine whether we're already connected to a given address, in order to
     * avoid initiating duplicate connections.
     */
    bool AlreadyConnectedToAddress(const CAddress &addr);

    bool AttemptToEvictConnection();
    CNode *ConnectNode(CAddress addrConnect, const char *pszDest,
                       bool fCountFailure, ConnectionType conn_type);
    void AddWhitelistPermissionFlags(NetPermissionFlags &flags,
                                     const CNetAddr &addr) const;

    void DeleteNode(CNode *pnode);

    NodeId GetNewNodeId();

    size_t SocketSendData(CNode &node) const
        EXCLUSIVE_LOCKS_REQUIRED(node.cs_vSend);
    void DumpAddresses();

    // Network stats
    void RecordBytesRecv(uint64_t bytes);
    void RecordBytesSent(uint64_t bytes);

    /**
     * Return vector of current BLOCK_RELAY peers.
     */
    std::vector<CAddress> GetCurrentBlockRelayOnlyConns() const;

    // Whether the node should be passed out in ForEach* callbacks
    static bool NodeFullyConnected(const CNode *pnode);

    const Config *config;

    // Network usage totals
    mutable RecursiveMutex cs_totalBytesSent;
    std::atomic<uint64_t> nTotalBytesRecv{0};
    uint64_t nTotalBytesSent GUARDED_BY(cs_totalBytesSent){0};

    // outbound limit & stats
    uint64_t nMaxOutboundTotalBytesSentInCycle GUARDED_BY(cs_totalBytesSent){0};
    std::chrono::seconds
        nMaxOutboundCycleStartTime GUARDED_BY(cs_totalBytesSent){0};
    uint64_t nMaxOutboundLimit GUARDED_BY(cs_totalBytesSent);

    // P2P timeout in seconds
    std::chrono::seconds m_peer_connect_timeout;

    // Whitelisted ranges. Any node connecting from these is automatically
    // whitelisted (as well as those connecting to whitelisted binds).
    std::vector<NetWhitelistPermissions> vWhitelistedRange;

    unsigned int nSendBufferMaxSize{0};
    unsigned int nReceiveFloodSize{0};

    std::vector<ListenSocket> vhListenSocket;
    std::atomic<bool> fNetworkActive{true};
    bool fAddressesInitialized{false};
    AddrMan &addrman;
    std::deque<std::string> m_addr_fetches GUARDED_BY(m_addr_fetches_mutex);
    Mutex m_addr_fetches_mutex;
    std::vector<std::string> m_added_nodes GUARDED_BY(m_added_nodes_mutex);
    mutable Mutex m_added_nodes_mutex;
    std::vector<CNode *> m_nodes GUARDED_BY(m_nodes_mutex);
    std::list<CNode *> m_nodes_disconnected;
    mutable RecursiveMutex m_nodes_mutex;
    std::atomic<NodeId> nLastNodeId{0};
    unsigned int nPrevNodeCount{0};

    /**
     * Cache responses to addr requests to minimize privacy leak.
     * Attack example: scraping addrs in real-time may allow an attacker
     * to infer new connections of the victim by detecting new records
     * with fresh timestamps (per self-announcement).
     */
    struct CachedAddrResponse {
        std::vector<CAddress> m_addrs_response_cache;
        std::chrono::microseconds m_cache_entry_expiration{0};
    };

    /**
     * Addr responses stored in different caches
     * per (network, local socket) prevent cross-network node identification.
     * If a node for example is multi-homed under Tor and IPv6,
     * a single cache (or no cache at all) would let an attacker
     * to easily detect that it is the same node by comparing responses.
     * Indexing by local socket prevents leakage when a node has multiple
     * listening addresses on the same network.
     *
     * The used memory equals to 1000 CAddress records (or around 40 bytes) per
     * distinct Network (up to 5) we have/had an inbound peer from,
     * resulting in at most ~196 KB. Every separate local socket may
     * add up to ~196 KB extra.
     */
    std::map<uint64_t, CachedAddrResponse> m_addr_response_caches;

    /**
     * Services this node offers.
     *
     * This data is replicated in each Peer instance we create.
     *
     * This data is not marked const, but after being set it should not
     * change.
     *
     * \sa Peer::m_our_services
     */
    ServiceFlags nLocalServices;

    std::unique_ptr<CSemaphore> semOutbound;
    std::unique_ptr<CSemaphore> semAddnode;
    int nMaxConnections;

    // How many full-relay (tx, block, addr) outbound peers we want
    int m_max_outbound_full_relay;

    // How many block-relay only outbound peers we want
    // We do not relay tx or addr messages with these peers
    int m_max_outbound_block_relay;

    // How many avalanche enabled outbound peers we want
    int m_max_avalanche_outbound;

    int nMaxAddnode;
    int nMaxFeeler;
    int m_max_outbound;
    bool m_use_addrman_outgoing;
    CClientUIInterface *m_client_interface;
    // FIXME m_msgproc is a terrible name
    std::vector<NetEventsInterface *> m_msgproc;
    /**
     * Pointer to this node's banman. May be nullptr - check existence before
     * dereferencing.
     */
    BanMan *m_banman;

    /**
     * Addresses that were saved during the previous clean shutdown. We'll
     * attempt to make block-relay-only connections to them.
     */
    std::vector<CAddress> m_anchors;

    /** SipHasher seeds for deterministic randomness */
    const uint64_t nSeed0, nSeed1;

    /** flag for waking the message processor. */
    bool fMsgProcWake GUARDED_BY(mutexMsgProc);

    std::condition_variable condMsgProc;
    Mutex mutexMsgProc;
    std::atomic<bool> flagInterruptMsgProc{false};

    /**
     * This is signaled when network activity should cease.
     * A pointer to it is saved in `m_i2p_sam_session`, so make sure that
     * the lifetime of `interruptNet` is not shorter than
     * the lifetime of `m_i2p_sam_session`.
     */
    CThreadInterrupt interruptNet;

    /**
     * I2P SAM session.
     * Used to accept incoming and make outgoing I2P connections.
     */
    std::unique_ptr<i2p::sam::Session> m_i2p_sam_session;

    std::thread threadDNSAddressSeed;
    std::thread threadSocketHandler;
    std::thread threadOpenAddedConnections;
    std::thread threadOpenConnections;
    std::thread threadMessageHandler;
    std::thread threadI2PAcceptIncoming;

    /**
     * flag for deciding to connect to an extra outbound peer, in excess of
     * m_max_outbound_full_relay. This takes the place of a feeler connection.
     */
    std::atomic_bool m_try_another_outbound_peer;

    /**
     * flag for initiating extra block-relay-only peer connections.
     * this should only be enabled after initial chain sync has occurred,
     * as these connections are intended to be short-lived and low-bandwidth.
     */
    std::atomic_bool m_start_extra_block_relay_peers{false};

    /**
     * A vector of -bind=<address>:<port>=onion arguments each of which is
     * an address and port that are designated for incoming Tor connections.
     */
    std::vector<CService> m_onion_binds;

    friend struct ::CConnmanTest;
    friend struct ConnmanTestMsg;
};

std::string getSubVersionEB(uint64_t MaxBlockSize);
std::string userAgent(const Config &config);

/** Dump binary message to file, with timestamp */
void CaptureMessageToFile(const CAddress &addr, const std::string &msg_type,
                          Span<const uint8_t> data, bool is_incoming);

/**
 * Defaults to `CaptureMessageToFile()`, but can be overridden by unit tests.
 */
extern std::function<void(const CAddress &addr, const std::string &msg_type,
                          Span<const uint8_t> data, bool is_incoming)>
    CaptureMessage;

struct NodeEvictionCandidate {
    NodeId id;
    std::chrono::seconds m_connected;
    std::chrono::microseconds m_min_ping_time;
    std::chrono::seconds m_last_block_time;
    std::chrono::seconds m_last_proof_time;
    std::chrono::seconds m_last_tx_time;
    bool fRelevantServices;
    bool m_relay_txs;
    bool fBloomFilter;
    uint64_t nKeyedNetGroup;
    bool prefer_evict;
    bool m_is_local;
    Network m_network;
    double availabilityScore;
};

/**
 * Select an inbound peer to evict after filtering out (protecting) peers having
 * distinct, difficult-to-forge characteristics. The protection logic picks out
 * fixed numbers of desirable peers per various criteria, followed by (mostly)
 * ratios of desirable or disadvantaged peers. If any eviction candidates
 * remain, the selection logic chooses a peer to evict.
 */
[[nodiscard]] std::optional<NodeId>
SelectNodeToEvict(std::vector<NodeEvictionCandidate> &&vEvictionCandidates);

/**
 * Protect desirable or disadvantaged inbound peers from eviction by ratio.
 *
 * This function protects half of the peers which have been connected the
 * longest, to replicate the non-eviction implicit behavior and preclude attacks
 * that start later.
 *
 * Half of these protected spots (1/4 of the total) are reserved for the
 * following categories of peers, sorted by longest uptime, even if they're not
 * longest uptime overall:
 *
 * - onion peers connected via our tor control service
 *
 * - localhost peers, as manually configured hidden services not using
 *   `-bind=addr[:port]=onion` will not be detected as inbound onion connections
 *
 * - I2P peers
 *
 * This helps protect these privacy network peers, which tend to be otherwise
 * disadvantaged under our eviction criteria for their higher min ping times
 * relative to IPv4/IPv6 peers, and favorise the diversity of peer connections.
 */
void ProtectEvictionCandidatesByRatio(
    std::vector<NodeEvictionCandidate> &vEvictionCandidates);

#endif // BITCOIN_NET_H
