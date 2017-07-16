// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_WALLET_H
#define BITCOIN_WALLET_WALLET_H

#include "amount.h"
#include "script/ismine.h"
#include "script/sign.h"
#include "streams.h"
#include "tinyformat.h"
#include "ui_interface.h"
#include "utilstrencodings.h"
#include "validationinterface.h"
#include "wallet/crypter.h"
#include "wallet/rpcwallet.h"
#include "wallet/walletdb.h"

#include <boost/thread.hpp>

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <map>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

typedef CWallet *CWalletRef;
extern std::vector<CWalletRef> vpwallets;

/**
 * Settings
 */
extern CFeeRate payTxFee;
extern unsigned int nTxConfirmTarget;
extern bool bSpendZeroConfChange;

static const unsigned int DEFAULT_KEYPOOL_SIZE = 1000;
//! -paytxfee default
static const Amount DEFAULT_TRANSACTION_FEE = Amount::zero();
//! -fallbackfee default
static const Amount DEFAULT_FALLBACK_FEE(20000 * SATOSHI);
//! minimum recommended increment for BIP 125 replacement txs
static const Amount WALLET_INCREMENTAL_RELAY_FEE(5000 * SATOSHI);
//! target minimum change amount
static const Amount MIN_CHANGE = CENT;
//! final minimum change amount after paying for fees
static const Amount MIN_FINAL_CHANGE = MIN_CHANGE / 2;
//! Default for -spendzeroconfchange
static const bool DEFAULT_SPEND_ZEROCONF_CHANGE = true;
//! Default for -walletrejectlongchains
static const bool DEFAULT_WALLET_REJECT_LONG_CHAINS = false;
//! -txconfirmtarget default
static const unsigned int DEFAULT_TX_CONFIRM_TARGET = 6;
//! Largest (in bytes) free transaction we're willing to create
static const unsigned int MAX_FREE_TRANSACTION_CREATE_SIZE = 1000;
static const bool DEFAULT_WALLETBROADCAST = true;
static const bool DEFAULT_DISABLE_WALLET = false;
//! if set, all keys will be derived by using BIP32
static const bool DEFAULT_USE_HD_WALLET = true;

extern const char *DEFAULT_WALLET_DAT;

static const int64_t TIMESTAMP_MIN = 0;

class CBlockIndex;
class CChainParams;
class CCoinControl;
class COutput;
class CReserveKey;
class CScript;
class CScheduler;
class CTxMemPool;
class CWalletTx;

/** (client) version numbers for particular wallet features */
enum WalletFeature {
    // the earliest version new wallets supports (only useful for getinfo's
    // clientversion output)
    FEATURE_BASE = 10500,

    // wallet encryption
    FEATURE_WALLETCRYPT = 40000,
    // compressed public keys
    FEATURE_COMPRPUBKEY = 60000,

    // Hierarchical key derivation after BIP32 (HD Wallet)
    FEATURE_HD = 130000,

    // Wallet with HD chain split (change outputs will use m/0'/1'/k)
    FEATURE_HD_SPLIT = 160300,

    // HD is optional, use FEATURE_COMPRPUBKEY as latest version
    FEATURE_LATEST = FEATURE_COMPRPUBKEY,
};

/** A key pool entry */
class CKeyPool {
public:
    int64_t nTime;
    CPubKey vchPubKey;
    bool fInternal; // for change outputs

    CKeyPool();
    CKeyPool(const CPubKey &vchPubKeyIn, bool internalIn);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) {
            READWRITE(nVersion);
        }

        READWRITE(nTime);
        READWRITE(vchPubKey);
        if (ser_action.ForRead()) {
            try {
                READWRITE(fInternal);
            } catch (std::ios_base::failure &) {
                /**
                 * flag as external address if we can't read the internal
                 * boolean
                 * (this will be the case for any wallet before the HD chain
                 * split version)
                 */
                fInternal = false;
            }
        } else {
            READWRITE(fInternal);
        }
    }
};

/** Address book data */
class CAddressBookData {
public:
    std::string name;
    std::string purpose;

    CAddressBookData() : purpose("unknown") {}

    typedef std::map<std::string, std::string> StringMap;
    StringMap destdata;
};

struct CRecipient {
    CScript scriptPubKey;
    Amount nAmount;
    bool fSubtractFeeFromAmount;
};

typedef std::map<std::string, std::string> mapValue_t;

static inline void ReadOrderPos(int64_t &nOrderPos, mapValue_t &mapValue) {
    if (!mapValue.count("n")) {
        // TODO: calculate elsewhere
        nOrderPos = -1;
        return;
    }

    nOrderPos = atoi64(mapValue["n"].c_str());
}

static inline void WriteOrderPos(const int64_t &nOrderPos,
                                 mapValue_t &mapValue) {
    if (nOrderPos == -1) return;
    mapValue["n"] = i64tostr(nOrderPos);
}

struct COutputEntry {
    CTxDestination destination;
    Amount amount;
    int vout;
};

/** A transaction with a merkle branch linking it to the block chain. */
class CMerkleTx {
private:
    /** Constant used in hashBlock to indicate tx has been abandoned */
    static const uint256 ABANDON_HASH;

public:
    CTransactionRef tx;
    uint256 hashBlock;

    /**
     * An nIndex == -1 means that hashBlock (in nonzero) refers to the earliest
     * block in the chain we know this or any in-wallet dependency conflicts
     * with. Older clients interpret nIndex == -1 as unconfirmed for backward
     * compatibility.
     */
    int nIndex;

    CMerkleTx() {
        SetTx(MakeTransactionRef());
        Init();
    }

    explicit CMerkleTx(CTransactionRef arg) {
        SetTx(std::move(arg));
        Init();
    }

    /**
     * Helper conversion operator to allow passing CMerkleTx where CTransaction
     * is expected.
     * TODO: adapt callers and remove this operator.
     */
    operator const CTransaction &() const { return *tx; }

    void Init() {
        hashBlock = uint256();
        nIndex = -1;
    }

    void SetTx(CTransactionRef arg) { tx = std::move(arg); }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        // For compatibility with older versions.
        std::vector<uint256> vMerkleBranch;
        READWRITE(tx);
        READWRITE(hashBlock);
        READWRITE(vMerkleBranch);
        READWRITE(nIndex);
    }

    void SetMerkleBranch(const CBlockIndex *pIndex, int posInBlock);

    /**
     * Return depth of transaction in blockchain:
     * <0  : conflicts with a transaction this deep in the blockchain
     *  0  : in memory pool, waiting to be included in a block
     * >=1 : this many blocks deep in the main chain
     */
    int GetDepthInMainChain(const CBlockIndex *&pindexRet) const;
    int GetDepthInMainChain() const {
        const CBlockIndex *pindexRet;
        return GetDepthInMainChain(pindexRet);
    }
    bool IsInMainChain() const {
        const CBlockIndex *pindexRet;
        return GetDepthInMainChain(pindexRet) > 0;
    }
    /**
     * @return number of blocks to maturity for this transaction:
     *  0 : is not a coinbase transaction, or is a mature coinbase transaction
     * >0 : is a coinbase transaction which matures in this many blocks
     */
    int GetBlocksToMaturity() const;
    bool hashUnset() const {
        return (hashBlock.IsNull() || hashBlock == ABANDON_HASH);
    }
    bool isAbandoned() const { return (hashBlock == ABANDON_HASH); }
    void setAbandoned() { hashBlock = ABANDON_HASH; }

    TxId GetId() const { return tx->GetId(); }
    bool IsCoinBase() const { return tx->IsCoinBase(); }
    bool IsImmatureCoinBase() const;
};

/**
 * A transaction with a bunch of additional info that only the owner cares
 * about. It includes any unrecorded transactions needed to link it back to the
 * block chain.
 */
class CWalletTx : public CMerkleTx {
private:
    const CWallet *pwallet;

public:
    mapValue_t mapValue;
    std::vector<std::pair<std::string, std::string>> vOrderForm;
    unsigned int fTimeReceivedIsTxTime;
    //!< time received by this node
    unsigned int nTimeReceived;
    /**
     * Stable timestamp that never changes, and reflects the order a transaction
     * was added to the wallet. Timestamp is based on the block time for a
     * transaction added as part of a block, or else the time when the
     * transaction was received if it wasn't part of a block, with the timestamp
     * adjusted in both cases so timestamp order matches the order transactions
     * were added to the wallet. More details can be found in
     * CWallet::ComputeTimeSmart().
     */
    unsigned int nTimeSmart;
    /**
     * From me flag is set to 1 for transactions that were created by the wallet
     * on this bitcoin node, and set to 0 for transactions that were created
     * externally and came in through the network or sendrawtransaction RPC.
     */
    char fFromMe;
    std::string strFromAccount;
    //!< position in ordered transaction list
    int64_t nOrderPos;

    // memory only
    mutable bool fDebitCached;
    mutable bool fCreditCached;
    mutable bool fImmatureCreditCached;
    mutable bool fAvailableCreditCached;
    mutable bool fWatchDebitCached;
    mutable bool fWatchCreditCached;
    mutable bool fImmatureWatchCreditCached;
    mutable bool fAvailableWatchCreditCached;
    mutable bool fChangeCached;
    mutable bool fInMempool;
    mutable Amount nDebitCached;
    mutable Amount nCreditCached;
    mutable Amount nImmatureCreditCached;
    mutable Amount nAvailableCreditCached;
    mutable Amount nWatchDebitCached;
    mutable Amount nWatchCreditCached;
    mutable Amount nImmatureWatchCreditCached;
    mutable Amount nAvailableWatchCreditCached;
    mutable Amount nChangeCached;

    CWalletTx() { Init(nullptr); }

    CWalletTx(const CWallet *pwalletIn, CTransactionRef arg)
        : CMerkleTx(std::move(arg)) {
        Init(pwalletIn);
    }

    void Init(const CWallet *pwalletIn) {
        pwallet = pwalletIn;
        mapValue.clear();
        vOrderForm.clear();
        fTimeReceivedIsTxTime = false;
        nTimeReceived = 0;
        nTimeSmart = 0;
        fFromMe = false;
        strFromAccount.clear();
        fDebitCached = false;
        fCreditCached = false;
        fImmatureCreditCached = false;
        fAvailableCreditCached = false;
        fWatchDebitCached = false;
        fWatchCreditCached = false;
        fImmatureWatchCreditCached = false;
        fAvailableWatchCreditCached = false;
        fChangeCached = false;
        fInMempool = false;
        nDebitCached = Amount::zero();
        nCreditCached = Amount::zero();
        nImmatureCreditCached = Amount::zero();
        nAvailableCreditCached = Amount::zero();
        nWatchDebitCached = Amount::zero();
        nWatchCreditCached = Amount::zero();
        nAvailableWatchCreditCached = Amount::zero();
        nImmatureWatchCreditCached = Amount::zero();
        nChangeCached = Amount::zero();
        nOrderPos = -1;
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        if (ser_action.ForRead()) {
            Init(nullptr);
        }

        char fSpent = false;

        if (!ser_action.ForRead()) {
            mapValue["fromaccount"] = strFromAccount;
            WriteOrderPos(nOrderPos, mapValue);
            if (nTimeSmart) {
                mapValue["timesmart"] = strprintf("%u", nTimeSmart);
            }
        }

        READWRITE(*(CMerkleTx *)this);
        //!< Used to be vtxPrev
        std::vector<CMerkleTx> vUnused;
        READWRITE(vUnused);
        READWRITE(mapValue);
        READWRITE(vOrderForm);
        READWRITE(fTimeReceivedIsTxTime);
        READWRITE(nTimeReceived);
        READWRITE(fFromMe);
        READWRITE(fSpent);

        if (ser_action.ForRead()) {
            strFromAccount = mapValue["fromaccount"];
            ReadOrderPos(nOrderPos, mapValue);
            nTimeSmart = mapValue.count("timesmart")
                             ? (unsigned int)atoi64(mapValue["timesmart"])
                             : 0;
        }

        mapValue.erase("fromaccount");
        mapValue.erase("version");
        mapValue.erase("spent");
        mapValue.erase("n");
        mapValue.erase("timesmart");
    }

    //! make sure balances are recalculated
    void MarkDirty() {
        fCreditCached = false;
        fAvailableCreditCached = false;
        fImmatureCreditCached = false;
        fWatchDebitCached = false;
        fWatchCreditCached = false;
        fAvailableWatchCreditCached = false;
        fImmatureWatchCreditCached = false;
        fDebitCached = false;
        fChangeCached = false;
    }

    void BindWallet(CWallet *pwalletIn) {
        pwallet = pwalletIn;
        MarkDirty();
    }

    //! filter decides which addresses will count towards the debit
    Amount GetDebit(const isminefilter &filter) const;
    Amount GetCredit(const isminefilter &filter) const;
    Amount GetImmatureCredit(bool fUseCache = true) const;
    Amount GetAvailableCredit(bool fUseCache = true) const;
    Amount GetImmatureWatchOnlyCredit(const bool fUseCache = true) const;
    Amount GetAvailableWatchOnlyCredit(const bool fUseCache = true) const;
    Amount GetChange() const;

    void GetAmounts(std::list<COutputEntry> &listReceived,
                    std::list<COutputEntry> &listSent, Amount &nFee,
                    std::string &strSentAccount,
                    const isminefilter &filter) const;

    bool IsFromMe(const isminefilter &filter) const {
        return GetDebit(filter) > Amount::zero();
    }

    // True if only scriptSigs are different
    bool IsEquivalentTo(const CWalletTx &tx) const;

    bool InMempool() const;
    bool IsTrusted() const;

    int64_t GetTxTime() const;
    int GetRequestCount() const;

    // RelayWalletTransaction may only be called if fBroadcastTransactions!
    bool RelayWalletTransaction(CConnman *connman);

    /**
     * Pass this transaction to the mempool. Fails if absolute fee exceeds
     * absurd fee.
     */
    bool AcceptToMemoryPool(const Amount nAbsurdFee, CValidationState &state);

    std::set<TxId> GetConflicts() const;
};

class CInputCoin {
public:
    CInputCoin(const CWalletTx *walletTx, unsigned int i) : wtx(walletTx) {
        if (!walletTx) {
            throw std::invalid_argument("walletTx should not be null");
        }
        if (i >= walletTx->tx->vout.size()) {
            throw std::out_of_range("The output index is out of range");
        }

        outpoint = COutPoint(walletTx->GetId(), i);
        txout = walletTx->tx->vout[i];
    }

    COutPoint outpoint;
    CTxOut txout;
    const CWalletTx *wtx;

    bool operator<(const CInputCoin &rhs) const {
        return outpoint < rhs.outpoint;
    }

    bool operator!=(const CInputCoin &rhs) const {
        return outpoint != rhs.outpoint;
    }

    bool operator==(const CInputCoin &rhs) const {
        return outpoint == rhs.outpoint;
    }
};

class COutput {
public:
    const CWalletTx *tx;
    int i;
    int nDepth;

    /** Whether we have the private keys to spend this output */
    bool fSpendable;

    /** Whether we know how to spend this output, ignoring the lack of keys */
    bool fSolvable;

    /**
     * Whether this output is considered safe to spend. Unconfirmed transactions
     * from outside keys are considered unsafe and will not be used to fund new
     * spending transactions.
     */
    bool fSafe;

    COutput(const CWalletTx *txIn, int iIn, int nDepthIn, bool fSpendableIn,
            bool fSolvableIn, bool fSafeIn) {
        tx = txIn;
        i = iIn;
        nDepth = nDepthIn;
        fSpendable = fSpendableIn;
        fSolvable = fSolvableIn;
        fSafe = fSafeIn;
    }

    std::string ToString() const;
};

/** Private key that includes an expiration date in case it never gets used. */
class CWalletKey {
public:
    CPrivKey vchPrivKey;
    int64_t nTimeCreated;
    int64_t nTimeExpires;
    std::string strComment;
    //! todo: add something to note what created it (user, getnewaddress,
    //! change) maybe should have a map<string, string> property map

    explicit CWalletKey(int64_t nExpires = 0);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) READWRITE(nVersion);
        READWRITE(vchPrivKey);
        READWRITE(nTimeCreated);
        READWRITE(nTimeExpires);
        READWRITE(LIMITED_STRING(strComment, 65536));
    }
};

/**
 * Internal transfers.
 * Database key is acentry<account><counter>.
 */
class CAccountingEntry {
public:
    std::string strAccount;
    Amount nCreditDebit;
    int64_t nTime;
    std::string strOtherAccount;
    std::string strComment;
    mapValue_t mapValue;
    //!< position in ordered transaction list
    int64_t nOrderPos;
    uint64_t nEntryNo;

    CAccountingEntry() { SetNull(); }

    void SetNull() {
        nCreditDebit = Amount::zero();
        nTime = 0;
        strAccount.clear();
        strOtherAccount.clear();
        strComment.clear();
        nOrderPos = -1;
        nEntryNo = 0;
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) READWRITE(nVersion);
        //! Note: strAccount is serialized as part of the key, not here.
        READWRITE(nCreditDebit);
        READWRITE(nTime);
        READWRITE(LIMITED_STRING(strOtherAccount, 65536));

        if (!ser_action.ForRead()) {
            WriteOrderPos(nOrderPos, mapValue);

            if (!(mapValue.empty() && _ssExtra.empty())) {
                CDataStream ss(s.GetType(), s.GetVersion());
                ss.insert(ss.begin(), '\0');
                ss << mapValue;
                ss.insert(ss.end(), _ssExtra.begin(), _ssExtra.end());
                strComment.append(ss.str());
            }
        }

        READWRITE(LIMITED_STRING(strComment, 65536));

        size_t nSepPos = strComment.find("\0", 0, 1);
        if (ser_action.ForRead()) {
            mapValue.clear();
            if (std::string::npos != nSepPos) {
                CDataStream ss(
                    std::vector<char>(strComment.begin() + nSepPos + 1,
                                      strComment.end()),
                    s.GetType(), s.GetVersion());
                ss >> mapValue;
                _ssExtra = std::vector<char>(ss.begin(), ss.end());
            }
            ReadOrderPos(nOrderPos, mapValue);
        }
        if (std::string::npos != nSepPos) strComment.erase(nSepPos);

        mapValue.erase("n");
    }

private:
    std::vector<char> _ssExtra;
};

/**
 * A CWallet is an extension of a keystore, which also maintains a set of
 * transactions and balances, and provides the ability to create new
 * transactions.
 */
class CWallet final : public CCryptoKeyStore, public CValidationInterface {
private:
    static std::atomic<bool> fFlushScheduled;
    std::atomic<bool> fAbortRescan;
    std::atomic<bool> fScanningWallet;

    /**
     * Select a set of coins such that nValueRet >= nTargetValue and at least
     * all coins from coinControl are selected; Never select unconfirmed coins
     * if they are not ours.
     */
    bool SelectCoins(const std::vector<COutput> &vAvailableCoins,
                     const Amount nTargetValue,
                     std::set<CInputCoin> &setCoinsRet, Amount &nValueRet,
                     const CCoinControl *coinControl = nullptr) const;

    CWalletDB *pwalletdbEncryption;

    //! the current wallet version: clients below this version are not able to
    //! load the wallet
    int nWalletVersion;

    //! the maximum wallet format version: memory-only variable that specifies
    //! to what version this wallet may be upgraded
    int nWalletMaxVersion;

    int64_t nNextResend;
    int64_t nLastResend;
    bool fBroadcastTransactions;

    /**
     * Used to keep track of spent outpoints, and detect and report conflicts
     * (double-spends or mutated transactions where the mutant gets mined).
     */
    typedef std::multimap<COutPoint, TxId> TxSpends;
    TxSpends mapTxSpends;
    void AddToSpends(const COutPoint &outpoint, const TxId &wtxid);
    void AddToSpends(const TxId &wtxid);

    /**
     * Mark a transaction (and its in-wallet descendants) as conflicting with a
     * particular block.
     */
    void MarkConflicted(const uint256 &hashBlock, const TxId &txid);

    void SyncMetaData(std::pair<TxSpends::iterator, TxSpends::iterator>);

    /**
     * Used by TransactionAddedToMemorypool/BlockConnected/Disconnected.
     * Should be called with pindexBlock and posInBlock if this is for a
     * transaction that is included in a block.
     */
    void SyncTransaction(const CTransactionRef &tx,
                         const CBlockIndex *pindex = nullptr,
                         int posInBlock = 0);

    /* the HD chain data model (external chain counters) */
    CHDChain hdChain;

    /* HD derive new child key (on internal or external chain) */
    void DeriveNewChildKey(CWalletDB &walletdb, CKeyMetadata &metadata,
                           CKey &secret, bool internal = false);

    std::set<int64_t> setInternalKeyPool;
    std::set<int64_t> setExternalKeyPool;
    int64_t m_max_keypool_index;
    std::map<CKeyID, int64_t> m_pool_key_to_index;

    int64_t nTimeFirstKey;

    /**
     * Private version of AddWatchOnly method which does not accept a timestamp,
     * and which will reset the wallet's nTimeFirstKey value to 1 if the watch
     * key did not previously have a timestamp associated with it. Because this
     * is an inherited virtual method, it is accessible despite being marked
     * private, but it is marked private anyway to encourage use of the other
     * AddWatchOnly which accepts a timestamp and sets nTimeFirstKey more
     * intelligently for more efficient rescans.
     */
    bool AddWatchOnly(const CScript &dest) override;

    std::unique_ptr<CWalletDBWrapper> dbw;

    /**
     * The following is used to keep track of how far behind the wallet is
     * from the chain sync, and to allow clients to block on us being caught up.
     *
     * Note that this is *not* how far we've processed, we may need some rescan
     * to have seen all transactions in the chain, but is only used to track
     * live BlockConnected callbacks.
     *
     * Protected by cs_main (see BlockUntilSyncedToCurrentChain)
     */
    const CBlockIndex *m_last_block_processed;

public:
    const CChainParams &chainParams;
    /*
     * Main wallet lock.
     * This lock protects all the fields added by CWallet.
     */
    mutable CCriticalSection cs_wallet;

    /**
     * Get database handle used by this wallet. Ideally this function would not
     * be necessary.
     */
    CWalletDBWrapper &GetDBHandle() { return *dbw; }

    /**
     * Get a name for this wallet for logging/debugging purposes.
     */
    std::string GetName() const {
        if (dbw) {
            return dbw->GetName();
        } else {
            return "dummy";
        }
    }

    void LoadKeyPool(int64_t nIndex, const CKeyPool &keypool);

    // Map from Key ID to key metadata.
    std::map<CKeyID, CKeyMetadata> mapKeyMetadata;

    // Map from Script ID to key metadata (for watch-only keys).
    std::map<CScriptID, CKeyMetadata> m_script_metadata;

    typedef std::map<unsigned int, CMasterKey> MasterKeyMap;
    MasterKeyMap mapMasterKeys;
    unsigned int nMasterKeyMaxID;

    // Create wallet with dummy database handle
    explicit CWallet(const CChainParams &chainParamsIn)
        : dbw(new CWalletDBWrapper()), chainParams(chainParamsIn) {
        SetNull();
    }

    // Create wallet with passed-in database handle
    CWallet(const CChainParams &chainParamsIn,
            std::unique_ptr<CWalletDBWrapper> dbw_in)
        : dbw(std::move(dbw_in)), chainParams(chainParamsIn) {
        SetNull();
    }

    ~CWallet() {
        delete pwalletdbEncryption;
        pwalletdbEncryption = nullptr;
    }

    void SetNull() {
        nWalletVersion = FEATURE_BASE;
        nWalletMaxVersion = FEATURE_BASE;
        nMasterKeyMaxID = 0;
        pwalletdbEncryption = nullptr;
        nOrderPosNext = 0;
        nAccountingEntryNumber = 0;
        nNextResend = 0;
        nLastResend = 0;
        m_max_keypool_index = 0;
        nTimeFirstKey = 0;
        fBroadcastTransactions = false;
        fAbortRescan = false;
        fScanningWallet = false;
    }

    std::map<TxId, CWalletTx> mapWallet;
    std::list<CAccountingEntry> laccentries;

    typedef std::pair<CWalletTx *, CAccountingEntry *> TxPair;
    typedef std::multimap<int64_t, TxPair> TxItems;
    TxItems wtxOrdered;

    int64_t nOrderPosNext;
    uint64_t nAccountingEntryNumber;
    std::map<uint256, int> mapRequestCount;

    std::map<CTxDestination, CAddressBookData> mapAddressBook;

    std::set<COutPoint> setLockedCoins;

    const CWalletTx *GetWalletTx(const TxId &txid) const;

    //! check whether we are allowed to upgrade (or already support) to the
    //! named feature
    bool CanSupportFeature(enum WalletFeature wf) const {
        AssertLockHeld(cs_wallet);
        return nWalletMaxVersion >= wf;
    }

    /**
     * populate vCoins with vector of available COutputs.
     */
    void AvailableCoins(std::vector<COutput> &vCoins, bool fOnlySafe = true,
                        const CCoinControl *coinControl = nullptr,
                        const Amount nMinimumAmount = SATOSHI,
                        const Amount nMaximumAmount = MAX_MONEY,
                        const Amount nMinimumSumAmount = MAX_MONEY,
                        const uint64_t nMaximumCount = 0,
                        const int nMinDepth = 0,
                        const int nMaxDepth = 9999999) const;

    /**
     * Return list of available coins and locked coins grouped by non-change
     * output address.
     */
    std::map<CTxDestination, std::vector<COutput>> ListCoins() const;

    /**
     * Find non-change parent output.
     */
    const CTxOut &FindNonChangeParentOutput(const CTransaction &tx,
                                            int output) const;

    /**
     * Shuffle and select coins until nTargetValue is reached while avoiding
     * small change; This method is stochastic for some inputs and upon
     * completion the coin set and corresponding actual target value is
     * assembled.
     */
    bool SelectCoinsMinConf(const Amount nTargetValue, int nConfMine,
                            int nConfTheirs, uint64_t nMaxAncestors,
                            std::vector<COutput> vCoins,
                            std::set<CInputCoin> &setCoinsRet,
                            Amount &nValueRet) const;

    bool IsSpent(const TxId &txid, uint32_t n) const;

    bool IsLockedCoin(const TxId &txid, uint32_t n) const;
    void LockCoin(const COutPoint &output);
    void UnlockCoin(const COutPoint &output);
    void UnlockAllCoins();
    void ListLockedCoins(std::vector<COutPoint> &vOutpts) const;

    /*
     * Rescan abort properties
     */
    void AbortRescan() { fAbortRescan = true; }
    bool IsAbortingRescan() { return fAbortRescan; }
    bool IsScanning() { return fScanningWallet; }

    /**
     * keystore implementation
     * Generate a new key
     */
    CPubKey GenerateNewKey(CWalletDB &walletdb, bool internal = false);
    //! Adds a key to the store, and saves it to disk.
    bool AddKeyPubKey(const CKey &key, const CPubKey &pubkey) override;
    bool AddKeyPubKeyWithDB(CWalletDB &walletdb, const CKey &key,
                            const CPubKey &pubkey);
    //! Adds a key to the store, without saving it to disk (used by LoadWallet)
    bool LoadKey(const CKey &key, const CPubKey &pubkey) {
        return CCryptoKeyStore::AddKeyPubKey(key, pubkey);
    }

    //! Load metadata (used by LoadWallet)
    bool LoadKeyMetadata(const CKeyID &keyID, const CKeyMetadata &metadata);
    bool LoadScriptMetadata(const CScriptID &script_id,
                            const CKeyMetadata &metadata);

    bool LoadMinVersion(int nVersion) {
        AssertLockHeld(cs_wallet);
        nWalletVersion = nVersion;
        nWalletMaxVersion = std::max(nWalletMaxVersion, nVersion);
        return true;
    }
    void UpdateTimeFirstKey(int64_t nCreateTime);

    //! Adds an encrypted key to the store, and saves it to disk.
    bool AddCryptedKey(const CPubKey &vchPubKey,
                       const std::vector<uint8_t> &vchCryptedSecret) override;
    //! Adds an encrypted key to the store, without saving it to disk (used by
    //! LoadWallet)
    bool LoadCryptedKey(const CPubKey &vchPubKey,
                        const std::vector<uint8_t> &vchCryptedSecret);
    bool AddCScript(const CScript &redeemScript) override;
    bool LoadCScript(const CScript &redeemScript);

    //! Adds a destination data tuple to the store, and saves it to disk
    bool AddDestData(const CTxDestination &dest, const std::string &key,
                     const std::string &value);
    //! Erases a destination data tuple in the store and on disk
    bool EraseDestData(const CTxDestination &dest, const std::string &key);
    //! Adds a destination data tuple to the store, without saving it to disk
    bool LoadDestData(const CTxDestination &dest, const std::string &key,
                      const std::string &value);
    //! Look up a destination data tuple in the store, return true if found
    //! false otherwise
    bool GetDestData(const CTxDestination &dest, const std::string &key,
                     std::string *value) const;
    //! Get all destination values matching a prefix.
    std::vector<std::string> GetDestValues(const std::string &prefix) const;

    //! Adds a watch-only address to the store, and saves it to disk.
    bool AddWatchOnly(const CScript &dest, int64_t nCreateTime);
    bool RemoveWatchOnly(const CScript &dest) override;
    //! Adds a watch-only address to the store, without saving it to disk (used
    //! by LoadWallet)
    bool LoadWatchOnly(const CScript &dest);

    //! Holds a timestamp at which point the wallet is scheduled (externally) to
    //! be relocked. Caller must arrange for actual relocking to occur via
    //! Lock().
    int64_t nRelockTime;

    bool Unlock(const SecureString &strWalletPassphrase);
    bool ChangeWalletPassphrase(const SecureString &strOldWalletPassphrase,
                                const SecureString &strNewWalletPassphrase);
    bool EncryptWallet(const SecureString &strWalletPassphrase);

    void GetKeyBirthTimes(std::map<CTxDestination, int64_t> &mapKeyBirth) const;
    unsigned int ComputeTimeSmart(const CWalletTx &wtx) const;

    /**
     * Increment the next transaction order id
     * @return next transaction order id
     */
    int64_t IncOrderPosNext(CWalletDB *pwalletdb = nullptr);
    DBErrors ReorderTransactions();
    bool AccountMove(std::string strFrom, std::string strTo,
                     const Amount nAmount, std::string strComment = "");
    bool GetLabelAddress(CPubKey &pubKey, const std::string &label,
                         bool bForceNew = false);

    void MarkDirty();
    bool AddToWallet(const CWalletTx &wtxIn, bool fFlushOnClose = true);
    bool LoadToWallet(const CWalletTx &wtxIn);
    void TransactionAddedToMempool(const CTransactionRef &tx) override;
    void
    BlockConnected(const std::shared_ptr<const CBlock> &pblock,
                   const CBlockIndex *pindex,
                   const std::vector<CTransactionRef> &vtxConflicted) override;
    void
    BlockDisconnected(const std::shared_ptr<const CBlock> &pblock) override;
    bool AddToWalletIfInvolvingMe(const CTransactionRef &tx,
                                  const CBlockIndex *pIndex, int posInBlock,
                                  bool fUpdate);
    int64_t RescanFromTime(int64_t startTime, bool update);
    CBlockIndex *ScanForWalletTransactions(CBlockIndex *pindexStart,
                                           CBlockIndex *pindexStop,
                                           bool fUpdate = false);
    void TransactionRemovedFromMempool(const CTransactionRef &ptx) override;
    void ReacceptWalletTransactions();
    void ResendWalletTransactions(int64_t nBestBlockTime,
                                  CConnman *connman) override;
    // ResendWalletTransactionsBefore may only be called if
    // fBroadcastTransactions!
    std::vector<uint256> ResendWalletTransactionsBefore(int64_t nTime,
                                                        CConnman *connman);
    Amount GetBalance() const;
    Amount GetUnconfirmedBalance() const;
    Amount GetImmatureBalance() const;
    Amount GetWatchOnlyBalance() const;
    Amount GetUnconfirmedWatchOnlyBalance() const;
    Amount GetImmatureWatchOnlyBalance() const;
    Amount GetLegacyBalance(const isminefilter &filter, int minDepth,
                            const std::string *account) const;
    Amount GetAvailableBalance(const CCoinControl *coinControl = nullptr) const;

    /**
     * Insert additional inputs into the transaction by calling
     * CreateTransaction();
     */
    bool FundTransaction(CMutableTransaction &tx, Amount &nFeeRet,
                         bool overrideEstimatedFeeRate,
                         const CFeeRate &specificFeeRate, int &nChangePosInOut,
                         std::string &strFailReason, bool includeWatching,
                         bool lockUnspents,
                         const std::set<int> &setSubtractFeeFromOutputs,
                         bool keepReserveKey = true,
                         const CTxDestination &destChange = CNoDestination());

    /**
     * Create a new transaction paying the recipients with a set of coins
     * selected by SelectCoins(); Also create the change output, when needed
     * @note passing nChangePosInOut as -1 will result in setting a random
     * position
     */
    bool CreateTransaction(const std::vector<CRecipient> &vecSend,
                           CWalletTx &wtxNew, CReserveKey &reservekey,
                           Amount &nFeeRet, int &nChangePosInOut,
                           std::string &strFailReason,
                           const CCoinControl *coinControl = nullptr,
                           bool sign = true);
    bool CommitTransaction(CWalletTx &wtxNew, CReserveKey &reservekey,
                           CConnman *connman, CValidationState &state);

    void ListAccountCreditDebit(const std::string &strAccount,
                                std::list<CAccountingEntry> &entries);
    bool AddAccountingEntry(const CAccountingEntry &);
    bool AddAccountingEntry(const CAccountingEntry &, CWalletDB *pwalletdb);
    template <typename ContainerType>
    bool DummySignTx(CMutableTransaction &txNew, const ContainerType &coins);

    static CFeeRate fallbackFee;

    bool NewKeyPool();
    size_t KeypoolCountExternalKeys();
    bool TopUpKeyPool(unsigned int kpSize = 0);
    void ReserveKeyFromKeyPool(int64_t &nIndex, CKeyPool &keypool,
                               bool fRequestedInternal);
    void KeepKey(int64_t nIndex);
    void ReturnKey(int64_t nIndex, bool fInternal, const CPubKey &pubkey);
    bool GetKeyFromPool(CPubKey &key, bool internal = false);
    int64_t GetOldestKeyPoolTime();
    /**
     * Marks all keys in the keypool up to and including reserve_key as used.
     */
    void MarkReserveKeysAsUsed(int64_t keypool_id);
    const std::map<CKeyID, int64_t> &GetAllReserveKeys() const {
        return m_pool_key_to_index;
    }
    /** Does the wallet have at least min_keys in the keypool? */
    bool HasUnusedKeys(size_t min_keys) const;

    std::set<std::set<CTxDestination>> GetAddressGroupings();
    std::map<CTxDestination, Amount> GetAddressBalances();

    std::set<CTxDestination> GetLabelAddresses(const std::string &label) const;

    isminetype IsMine(const CTxIn &txin) const;
    /**
     * Returns amount of debit if the input matches the filter, otherwise
     * returns 0
     */
    Amount GetDebit(const CTxIn &txin, const isminefilter &filter) const;
    isminetype IsMine(const CTxOut &txout) const;
    Amount GetCredit(const CTxOut &txout, const isminefilter &filter) const;
    bool IsChange(const CTxOut &txout) const;
    Amount GetChange(const CTxOut &txout) const;
    bool IsMine(const CTransaction &tx) const;
    /** should probably be renamed to IsRelevantToMe */
    bool IsFromMe(const CTransaction &tx) const;
    Amount GetDebit(const CTransaction &tx, const isminefilter &filter) const;
    /** Returns whether all of the inputs match the filter */
    bool IsAllFromMe(const CTransaction &tx, const isminefilter &filter) const;
    Amount GetCredit(const CTransaction &tx, const isminefilter &filter) const;
    Amount GetChange(const CTransaction &tx) const;
    void SetBestChain(const CBlockLocator &loc) override;

    DBErrors LoadWallet(bool &fFirstRunRet);
    DBErrors ZapWalletTx(std::vector<CWalletTx> &vWtx);
    DBErrors ZapSelectTx(std::vector<TxId> &txIdsIn,
                         std::vector<TxId> &txIdsOut);

    bool SetAddressBook(const CTxDestination &address,
                        const std::string &strName, const std::string &purpose);

    bool DelAddressBook(const CTxDestination &address);

    const std::string &GetLabelName(const CScript &scriptPubKey) const;

    void Inventory(const uint256 &hash) override {
        LOCK(cs_wallet);
        std::map<uint256, int>::iterator mi = mapRequestCount.find(hash);
        if (mi != mapRequestCount.end()) {
            (*mi).second++;
        }
    }

    void GetScriptForMining(std::shared_ptr<CReserveScript> &script);

    unsigned int GetKeyPoolSize() {
        // set{Ex,In}ternalKeyPool
        AssertLockHeld(cs_wallet);
        return setInternalKeyPool.size() + setExternalKeyPool.size();
    }

    //! signify that a particular wallet feature is now used. this may change
    //! nWalletVersion and nWalletMaxVersion if those are lower
    bool SetMinVersion(enum WalletFeature, CWalletDB *pwalletdbIn = nullptr,
                       bool fExplicit = false);

    //! change which version we're allowed to upgrade to (note that this does
    //! not immediately imply upgrading to that format)
    bool SetMaxVersion(int nVersion);

    //! get the current wallet format (the oldest client version guaranteed to
    //! understand this wallet)
    int GetVersion() {
        LOCK(cs_wallet);
        return nWalletVersion;
    }

    //! Get wallet transactions that conflict with given transaction (spend same
    //! outputs)
    std::set<TxId> GetConflicts(const TxId &txid) const;

    //! Check if a given transaction has any of its outputs spent by another
    //! transaction in the wallet
    bool HasWalletSpend(const TxId &txid) const;

    //! Flush wallet (bitdb flush)
    void Flush(bool shutdown = false);

    /**
     * Address book entry changed.
     * @note called with lock cs_wallet held.
     */
    boost::signals2::signal<void(CWallet *wallet, const CTxDestination &address,
                                 const std::string &label, bool isMine,
                                 const std::string &purpose, ChangeType status)>
        NotifyAddressBookChanged;

    /**
     * Wallet transaction added, removed or updated.
     * @note called with lock cs_wallet held.
     */
    boost::signals2::signal<void(CWallet *wallet, const TxId &txid,
                                 ChangeType status)>
        NotifyTransactionChanged;

    /** Show progress e.g. for rescan */
    boost::signals2::signal<void(const std::string &title, int nProgress)>
        ShowProgress;

    /** Watch-only address added */
    boost::signals2::signal<void(bool fHaveWatchOnly)> NotifyWatchonlyChanged;

    /** Inquire whether this wallet broadcasts transactions. */
    bool GetBroadcastTransactions() const { return fBroadcastTransactions; }
    /** Set whether this wallet broadcasts transactions. */
    void SetBroadcastTransactions(bool broadcast) {
        fBroadcastTransactions = broadcast;
    }

    /** Return whether transaction can be abandoned */
    bool TransactionCanBeAbandoned(const TxId &txid) const;

    /**
     * Mark a transaction (and it in-wallet descendants) as abandoned so its
     * inputs may be respent.
     */
    bool AbandonTransaction(const TxId &txid);

    /**
     * Initializes the wallet, returns a new CWallet instance or a null pointer
     * in case of an error.
     */
    static CWallet *CreateWalletFromFile(const CChainParams &chainParams,
                                         const std::string walletFile);

    /**
     * Wallet post-init setup
     * Gives the wallet a chance to register repetitive tasks and complete
     * post-init tasks
     */
    void postInitProcess(CScheduler &scheduler);

    bool BackupWallet(const std::string &strDest);

    /* Set the HD chain model (chain child index counters) */
    bool SetHDChain(const CHDChain &chain, bool memonly);
    const CHDChain &GetHDChain() { return hdChain; }

    /* Returns true if HD is enabled */
    bool IsHDEnabled();

    /* Generates a new HD master key (will not be activated) */
    CPubKey GenerateNewHDMasterKey();

    /**
     * Set the current HD master key (will reset the chain child index counters)
     * If possibleOldChain is provided, the parameters from the old chain
     * (version) will be preserved.
     */
    bool SetHDMasterKey(const CPubKey &key,
                        CHDChain *possibleOldChain = nullptr);

    /**
     * Blocks until the wallet state is up-to-date to /at least/ the current
     * chain at the time this function is entered.
     * Obviously holding cs_main/cs_wallet when going into this call may cause
     * deadlock
     */
    void BlockUntilSyncedToCurrentChain();
};

/** A key allocated from the key pool. */
class CReserveKey final : public CReserveScript {
protected:
    CWallet *pwallet;
    int64_t nIndex;
    CPubKey vchPubKey;
    bool fInternal;

public:
    explicit CReserveKey(CWallet *pwalletIn) {
        nIndex = -1;
        pwallet = pwalletIn;
        fInternal = false;
    }

    ~CReserveKey() { ReturnKey(); }

    void ReturnKey();
    bool GetReservedKey(CPubKey &pubkey, bool internal = false);
    void KeepKey();
    void KeepScript() override { KeepKey(); }
};

/**
 * Account information.
 * Stored in wallet with key "acc"+string account name.
 */
class CAccount {
public:
    CPubKey vchPubKey;

    CAccount() { SetNull(); }

    void SetNull() { vchPubKey = CPubKey(); }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) {
            READWRITE(nVersion);
        }

        READWRITE(vchPubKey);
    }
};

// Helper for producing a bunch of max-sized low-S signatures (eg 72 bytes)
// ContainerType is meant to hold pair<CWalletTx *, int>, and be iterable so
// that each entry corresponds to each vIn, in order.
template <typename ContainerType>
bool CWallet::DummySignTx(CMutableTransaction &txNew,
                          const ContainerType &coins) {
    // Fill in dummy signatures for fee calculation.
    int nIn = 0;
    for (const auto &coin : coins) {
        const CScript &scriptPubKey = coin.txout.scriptPubKey;
        SignatureData sigdata;

        if (!ProduceSignature(DummySignatureCreator(this), scriptPubKey,
                              sigdata)) {
            return false;
        } else {
            UpdateTransaction(txNew, nIn, sigdata);
        }

        nIn++;
    }

    return true;
}

#endif // BITCOIN_WALLET_WALLET_H
