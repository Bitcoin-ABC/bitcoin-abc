// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
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

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <map>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include <boost/thread.hpp>

extern CWallet *pwalletMain;

/**
 * Settings
 */
extern CFeeRate payTxFee;
extern unsigned int nTxConfirmTarget;
extern bool bSpendZeroConfChange;
extern bool fSendFreeTransactions;

static const unsigned int DEFAULT_KEYPOOL_SIZE = 100;
//! -paytxfee default
static const CAmount DEFAULT_TRANSACTION_FEE = 0;
//! -fallbackfee default
static const CAmount DEFAULT_FALLBACK_FEE = 20000;
//! -mintxfee default
static const CAmount DEFAULT_TRANSACTION_MINFEE = 1000;
//! minimum recommended increment for BIP 125 replacement txs
static const CAmount WALLET_INCREMENTAL_RELAY_FEE = 5000;
//! target minimum change amount
static const CAmount MIN_CHANGE = CENT.GetSatoshis();
//! final minimum change amount after paying for fees
static const CAmount MIN_FINAL_CHANGE = MIN_CHANGE / 2;
//! Default for -spendzeroconfchange
static const bool DEFAULT_SPEND_ZEROCONF_CHANGE = true;
//! Default for -sendfreetransactions
static const bool DEFAULT_SEND_FREE_TRANSACTIONS = false;
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

class CBlockIndex;
class CCoinControl;
class COutput;
class CReserveKey;
class CScript;
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

    // HD is optional, use FEATURE_COMPRPUBKEY as latest version
    FEATURE_LATEST = FEATURE_COMPRPUBKEY,
};

/** A key pool entry */
class CKeyPool {
public:
    int64_t nTime;
    CPubKey vchPubKey;

    CKeyPool();
    CKeyPool(const CPubKey &vchPubKeyIn);

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        int nVersion = s.GetVersion();
        if (!(s.GetType() & SER_GETHASH)) {
            READWRITE(nVersion);
        }

        READWRITE(nTime);
        READWRITE(vchPubKey);
    }
};

/** Address book data */
class CAddressBookData {
public:
    std::string name;
    std::string purpose;

    CAddressBookData() { purpose = "unknown"; }

    typedef std::map<std::string, std::string> StringMap;
    StringMap destdata;
};

struct CRecipient {
    CScript scriptPubKey;
    CAmount nAmount;
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
    CAmount amount;
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

    CMerkleTx(CTransactionRef arg) {
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
    int GetBlocksToMaturity() const;
    /**
     * Pass this transaction to the mempool. Fails if absolute fee exceeds
     * absurd fee.
     */
    bool AcceptToMemoryPool(const CAmount &nAbsurdFee, CValidationState &state);
    bool hashUnset() const {
        return (hashBlock.IsNull() || hashBlock == ABANDON_HASH);
    }
    bool isAbandoned() const { return (hashBlock == ABANDON_HASH); }
    void setAbandoned() { hashBlock = ABANDON_HASH; }

    const uint256 &GetId() const { return tx->GetId(); }
    bool IsCoinBase() const { return tx->IsCoinBase(); }
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
    mutable CAmount nDebitCached;
    mutable CAmount nCreditCached;
    mutable CAmount nImmatureCreditCached;
    mutable CAmount nAvailableCreditCached;
    mutable CAmount nWatchDebitCached;
    mutable CAmount nWatchCreditCached;
    mutable CAmount nImmatureWatchCreditCached;
    mutable CAmount nAvailableWatchCreditCached;
    mutable CAmount nChangeCached;

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
        nDebitCached = 0;
        nCreditCached = 0;
        nImmatureCreditCached = 0;
        nAvailableCreditCached = 0;
        nWatchDebitCached = 0;
        nWatchCreditCached = 0;
        nAvailableWatchCreditCached = 0;
        nImmatureWatchCreditCached = 0;
        nChangeCached = 0;
        nOrderPos = -1;
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        if (ser_action.ForRead()) Init(nullptr);
        char fSpent = false;

        if (!ser_action.ForRead()) {
            mapValue["fromaccount"] = strFromAccount;

            WriteOrderPos(nOrderPos, mapValue);

            if (nTimeSmart) mapValue["timesmart"] = strprintf("%u", nTimeSmart);
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
    CAmount GetDebit(const isminefilter &filter) const;
    CAmount GetCredit(const isminefilter &filter) const;
    CAmount GetImmatureCredit(bool fUseCache = true) const;
    CAmount GetAvailableCredit(bool fUseCache = true) const;
    CAmount GetImmatureWatchOnlyCredit(const bool &fUseCache = true) const;
    CAmount GetAvailableWatchOnlyCredit(const bool &fUseCache = true) const;
    CAmount GetChange() const;

    void GetAmounts(std::list<COutputEntry> &listReceived,
                    std::list<COutputEntry> &listSent, CAmount &nFee,
                    std::string &strSentAccount,
                    const isminefilter &filter) const;

    void GetAccountAmounts(const std::string &strAccount, CAmount &nReceived,
                           CAmount &nSent, CAmount &nFee,
                           const isminefilter &filter) const;

    bool IsFromMe(const isminefilter &filter) const {
        return (GetDebit(filter) > 0);
    }

    // True if only scriptSigs are different
    bool IsEquivalentTo(const CWalletTx &tx) const;

    bool InMempool() const;
    bool IsTrusted() const;

    int64_t GetTxTime() const;
    int GetRequestCount() const;

    bool RelayWalletTransaction(CConnman *connman);

    std::set<uint256> GetConflicts() const;
};

class COutput {
public:
    const CWalletTx *tx;
    int i;
    int nDepth;
    bool fSpendable;
    bool fSolvable;

    COutput(const CWalletTx *txIn, int iIn, int nDepthIn, bool fSpendableIn,
            bool fSolvableIn) {
        tx = txIn;
        i = iIn;
        nDepth = nDepthIn;
        fSpendable = fSpendableIn;
        fSolvable = fSolvableIn;
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

    CWalletKey(int64_t nExpires = 0);

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
    CAmount nCreditDebit;
    int64_t nTime;
    std::string strOtherAccount;
    std::string strComment;
    mapValue_t mapValue;
    //!< position in ordered transaction list
    int64_t nOrderPos;
    uint64_t nEntryNo;

    CAccountingEntry() { SetNull(); }

    void SetNull() {
        nCreditDebit = 0;
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
class CWallet : public CCryptoKeyStore, public CValidationInterface {
private:
    static std::atomic<bool> fFlushThreadRunning;

    /**
     * Select a set of coins such that nValueRet >= nTargetValue and at least
     * all coins from coinControl are selected; Never select unconfirmed coins
     * if they are not ours.
     */
    bool SelectCoins(
        const std::vector<COutput> &vAvailableCoins,
        const CAmount &nTargetValue,
        std::set<std::pair<const CWalletTx *, unsigned int>> &setCoinsRet,
        CAmount &nValueRet, const CCoinControl *coinControl = nullptr) const;

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
    typedef std::multimap<COutPoint, uint256> TxSpends;
    TxSpends mapTxSpends;
    void AddToSpends(const COutPoint &outpoint, const uint256 &wtxid);
    void AddToSpends(const uint256 &wtxid);

    /* Mark a transaction (and its in-wallet descendants) as conflicting with a
     * particular block. */
    void MarkConflicted(const uint256 &hashBlock, const uint256 &hashTx);

    void SyncMetaData(std::pair<TxSpends::iterator, TxSpends::iterator>);

    /* the HD chain data model (external chain counters) */
    CHDChain hdChain;

    bool fFileBacked;

    std::set<int64_t> setKeyPool;

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

public:
    /*
     * Main wallet lock.
     * This lock protects all the fields added by CWallet
     *   except for:
     *      fFileBacked (immutable after instantiation)
     *      strWalletFile (immutable after instantiation)
     */
    mutable CCriticalSection cs_wallet;

    const std::string strWalletFile;

    void LoadKeyPool(int nIndex, const CKeyPool &keypool) {
        setKeyPool.insert(nIndex);

        // If no metadata exists yet, create a default with the pool key's
        // creation time. Note that this may be overwritten by actually stored
        // metadata for that key later, which is fine.
        CKeyID keyid = keypool.vchPubKey.GetID();
        if (mapKeyMetadata.count(keyid) == 0)
            mapKeyMetadata[keyid] = CKeyMetadata(keypool.nTime);
    }

    // Map from Key ID (for regular keys) or Script ID (for watch-only keys) to
    // key metadata.
    std::map<CTxDestination, CKeyMetadata> mapKeyMetadata;

    typedef std::map<unsigned int, CMasterKey> MasterKeyMap;
    MasterKeyMap mapMasterKeys;
    unsigned int nMasterKeyMaxID;

    CWallet() { SetNull(); }

    CWallet(const std::string &strWalletFileIn)
        : strWalletFile(strWalletFileIn) {
        SetNull();
        fFileBacked = true;
    }

    ~CWallet() {
        delete pwalletdbEncryption;
        pwalletdbEncryption = nullptr;
    }

    void SetNull() {
        nWalletVersion = FEATURE_BASE;
        nWalletMaxVersion = FEATURE_BASE;
        fFileBacked = false;
        nMasterKeyMaxID = 0;
        pwalletdbEncryption = nullptr;
        nOrderPosNext = 0;
        nNextResend = 0;
        nLastResend = 0;
        nTimeFirstKey = 0;
        fBroadcastTransactions = false;
    }

    std::map<uint256, CWalletTx> mapWallet;
    std::list<CAccountingEntry> laccentries;

    typedef std::pair<CWalletTx *, CAccountingEntry *> TxPair;
    typedef std::multimap<int64_t, TxPair> TxItems;
    TxItems wtxOrdered;

    int64_t nOrderPosNext;
    std::map<uint256, int> mapRequestCount;

    std::map<CTxDestination, CAddressBookData> mapAddressBook;

    CPubKey vchDefaultKey;

    std::set<COutPoint> setLockedCoins;

    const CWalletTx *GetWalletTx(const uint256 &hash) const;

    //! check whether we are allowed to upgrade (or already support) to the
    //! named feature
    bool CanSupportFeature(enum WalletFeature wf) {
        AssertLockHeld(cs_wallet);
        return nWalletMaxVersion >= wf;
    }

    /**
     * populate vCoins with vector of available COutputs.
     */
    void AvailableCoins(std::vector<COutput> &vCoins,
                        bool fOnlyConfirmed = true,
                        const CCoinControl *coinControl = nullptr,
                        bool fIncludeZeroValue = false) const;

    /**
     * Shuffle and select coins until nTargetValue is reached while avoiding
     * small change; This method is stochastic for some inputs and upon
     * completion the coin set and corresponding actual target value is
     * assembled.
     */
    bool SelectCoinsMinConf(
        const CAmount &nTargetValue, int nConfMine, int nConfTheirs,
        uint64_t nMaxAncestors, std::vector<COutput> vCoins,
        std::set<std::pair<const CWalletTx *, unsigned int>> &setCoinsRet,
        CAmount &nValueRet) const;

    bool IsSpent(const uint256 &hash, unsigned int n) const;

    bool IsLockedCoin(uint256 hash, unsigned int n) const;
    void LockCoin(const COutPoint &output);
    void UnlockCoin(const COutPoint &output);
    void UnlockAllCoins();
    void ListLockedCoins(std::vector<COutPoint> &vOutpts);

    /**
     * keystore implementation
     * Generate a new key
     */
    CPubKey GenerateNewKey();
    void DeriveNewChildKey(CKeyMetadata &metadata, CKey &secret);
    //! Adds a key to the store, and saves it to disk.
    bool AddKeyPubKey(const CKey &key, const CPubKey &pubkey) override;
    //! Adds a key to the store, without saving it to disk (used by LoadWallet)
    bool LoadKey(const CKey &key, const CPubKey &pubkey) {
        return CCryptoKeyStore::AddKeyPubKey(key, pubkey);
    }

    //! Load metadata (used by LoadWallet)
    bool LoadKeyMetadata(const CTxDestination &pubKey,
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

    //! Adds a watch-only address to the store, and saves it to disk.
    bool AddWatchOnly(const CScript &dest, int64_t nCreateTime);
    bool RemoveWatchOnly(const CScript &dest) override;
    //! Adds a watch-only address to the store, without saving it to disk (used
    //! by LoadWallet)
    bool LoadWatchOnly(const CScript &dest);

    bool Unlock(const SecureString &strWalletPassphrase);
    bool ChangeWalletPassphrase(const SecureString &strOldWalletPassphrase,
                                const SecureString &strNewWalletPassphrase);
    bool EncryptWallet(const SecureString &strWalletPassphrase);

    void GetKeyBirthTimes(std::map<CTxDestination, int64_t> &mapKeyBirth) const;

    /**
     * Increment the next transaction order id
     * @return next transaction order id
     */
    int64_t IncOrderPosNext(CWalletDB *pwalletdb = nullptr);
    DBErrors ReorderTransactions();
    bool AccountMove(std::string strFrom, std::string strTo, CAmount nAmount,
                     std::string strComment = "");
    bool GetAccountPubkey(CPubKey &pubKey, std::string strAccount,
                          bool bForceNew = false);

    void MarkDirty();
    bool AddToWallet(const CWalletTx &wtxIn, bool fFlushOnClose = true);
    bool LoadToWallet(const CWalletTx &wtxIn);
    void SyncTransaction(const CTransaction &tx, const CBlockIndex *pindex,
                         int posInBlock) override;
    bool AddToWalletIfInvolvingMe(const CTransaction &tx,
                                  const CBlockIndex *pIndex, int posInBlock,
                                  bool fUpdate);
    CBlockIndex *ScanForWalletTransactions(CBlockIndex *pindexStart,
                                           bool fUpdate = false);
    void ReacceptWalletTransactions();
    void ResendWalletTransactions(int64_t nBestBlockTime,
                                  CConnman *connman) override;
    std::vector<uint256> ResendWalletTransactionsBefore(int64_t nTime,
                                                        CConnman *connman);
    CAmount GetBalance() const;
    CAmount GetUnconfirmedBalance() const;
    CAmount GetImmatureBalance() const;
    CAmount GetWatchOnlyBalance() const;
    CAmount GetUnconfirmedWatchOnlyBalance() const;
    CAmount GetImmatureWatchOnlyBalance() const;

    /**
     * Insert additional inputs into the transaction by calling
     * CreateTransaction();
     */
    bool FundTransaction(CMutableTransaction &tx, CAmount &nFeeRet,
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
                           CAmount &nFeeRet, int &nChangePosInOut,
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

    static CFeeRate minTxFee;
    static CFeeRate fallbackFee;
    /**
     * Estimate the minimum fee considering user set parameters and the required
     * fee
     */
    static CAmount GetMinimumFee(unsigned int nTxBytes,
                                 unsigned int nConfirmTarget,
                                 const CTxMemPool &pool);
    /**
     * Estimate the minimum fee considering required fee and targetFee or if 0
     * then fee estimation for nConfirmTarget
     */
    static CAmount GetMinimumFee(unsigned int nTxBytes,
                                 unsigned int nConfirmTarget,
                                 const CTxMemPool &pool, CAmount targetFee);
    /**
     * Return the minimum required fee taking into account the floating relay
     * fee and user set minimum transaction fee
     */
    static CAmount GetRequiredFee(unsigned int nTxBytes);

    bool NewKeyPool();
    bool TopUpKeyPool(unsigned int kpSize = 0);
    void ReserveKeyFromKeyPool(int64_t &nIndex, CKeyPool &keypool);
    void KeepKey(int64_t nIndex);
    void ReturnKey(int64_t nIndex);
    bool GetKeyFromPool(CPubKey &key);
    int64_t GetOldestKeyPoolTime();
    void GetAllReserveKeys(std::set<CKeyID> &setAddress) const;

    std::set<std::set<CTxDestination>> GetAddressGroupings();
    std::map<CTxDestination, CAmount> GetAddressBalances();

    CAmount GetAccountBalance(const std::string &strAccount, int nMinDepth,
                              const isminefilter &filter);
    CAmount GetAccountBalance(CWalletDB &walletdb,
                              const std::string &strAccount, int nMinDepth,
                              const isminefilter &filter);
    std::set<CTxDestination>
    GetAccountAddresses(const std::string &strAccount) const;

    isminetype IsMine(const CTxIn &txin) const;
    /**
     * Returns amount of debit if the input matches the filter, otherwise
     * returns 0
     */
    CAmount GetDebit(const CTxIn &txin, const isminefilter &filter) const;
    isminetype IsMine(const CTxOut &txout) const;
    CAmount GetCredit(const CTxOut &txout, const isminefilter &filter) const;
    bool IsChange(const CTxOut &txout) const;
    CAmount GetChange(const CTxOut &txout) const;
    bool IsMine(const CTransaction &tx) const;
    /** should probably be renamed to IsRelevantToMe */
    bool IsFromMe(const CTransaction &tx) const;
    CAmount GetDebit(const CTransaction &tx, const isminefilter &filter) const;
    /** Returns whether all of the inputs match the filter */
    bool IsAllFromMe(const CTransaction &tx, const isminefilter &filter) const;
    CAmount GetCredit(const CTransaction &tx, const isminefilter &filter) const;
    CAmount GetChange(const CTransaction &tx) const;
    void SetBestChain(const CBlockLocator &loc) override;

    DBErrors LoadWallet(bool &fFirstRunRet);
    DBErrors ZapWalletTx(std::vector<CWalletTx> &vWtx);
    DBErrors ZapSelectTx(std::vector<uint256> &vHashIn,
                         std::vector<uint256> &vHashOut);

    bool SetAddressBook(const CTxDestination &address,
                        const std::string &strName, const std::string &purpose);

    bool DelAddressBook(const CTxDestination &address);

    void UpdatedTransaction(const uint256 &hashTx) override;

    void Inventory(const uint256 &hash) override {
        LOCK(cs_wallet);
        std::map<uint256, int>::iterator mi = mapRequestCount.find(hash);
        if (mi != mapRequestCount.end()) {
            (*mi).second++;
        }
    }

    void GetScriptForMining(std::shared_ptr<CReserveScript> &script) override;
    void ResetRequestCount(const uint256 &hash) override {
        LOCK(cs_wallet);
        mapRequestCount[hash] = 0;
    };

    unsigned int GetKeyPoolSize() {
        // setKeyPool
        AssertLockHeld(cs_wallet);
        return setKeyPool.size();
    }

    bool SetDefaultKey(const CPubKey &vchPubKey);

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
    std::set<uint256> GetConflicts(const uint256 &txid) const;

    //! Check if a given transaction has any of its outputs spent by another
    //! transaction in the wallet
    bool HasWalletSpend(const uint256 &txid) const;

    //! Flush wallet (bitdb flush)
    void Flush(bool shutdown = false);

    //! Verify the wallet database and perform salvage if required
    static bool Verify();

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
    boost::signals2::signal<void(CWallet *wallet, const uint256 &hashTx,
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

    /**
     * Mark a transaction (and it in-wallet descendants) as abandoned so its
     * inputs may be respent.
     */
    bool AbandonTransaction(const uint256 &hashTx);

    /**
     * Mark a transaction as replaced by another transaction (e.g., BIP 125).
     */
    bool MarkReplaced(const uint256 &originalHash, const uint256 &newHash);

    /* Returns the wallets help message */
    static std::string GetWalletHelpString(bool showDebug);

    /**
     * Initializes the wallet, returns a new CWallet instance or a null pointer
     * in case of an error.
     */
    static CWallet *CreateWalletFromFile(const std::string walletFile);
    static bool InitLoadWallet();

    /**
     * Wallet post-init setup
     * Gives the wallet a chance to register repetitive tasks and complete
     * post-init tasks
     */
    void postInitProcess(boost::thread_group &threadGroup);

    /* Wallets parameter interaction */
    static bool ParameterInteraction();

    bool BackupWallet(const std::string &strDest);

    /* Set the HD chain model (chain child index counters) */
    bool SetHDChain(const CHDChain &chain, bool memonly);
    const CHDChain &GetHDChain() { return hdChain; }

    /* Returns true if HD is enabled */
    bool IsHDEnabled();

    /* Generates a new HD master key (will not be activated) */
    CPubKey GenerateNewHDMasterKey();

    /* Set the current HD master key (will reset the chain child index counters)
     */
    bool SetHDMasterKey(const CPubKey &key);
};

/** A key allocated from the key pool. */
class CReserveKey : public CReserveScript {
protected:
    CWallet *pwallet;
    int64_t nIndex;
    CPubKey vchPubKey;

public:
    CReserveKey(CWallet *pwalletIn) {
        nIndex = -1;
        pwallet = pwalletIn;
    }

    ~CReserveKey() { ReturnKey(); }

    void ReturnKey();
    bool GetReservedKey(CPubKey &pubkey);
    void KeepKey();
    void KeepScript() { KeepKey(); }
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
        const CScript &scriptPubKey =
            coin.first->tx->vout[coin.second].scriptPubKey;
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
