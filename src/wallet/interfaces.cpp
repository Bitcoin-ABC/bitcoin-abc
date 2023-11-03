// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/wallet.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/amount.h>
#include <consensus/validation.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <primitives/transaction.h>
#include <rpc/server.h>
#include <script/standard.h>
#include <support/allocators/secure.h>
#include <sync.h>
#include <util/check.h>
#include <util/system.h>
#include <util/ui_change_type.h>
#include <wallet/context.h>
#include <wallet/fees.h>
#include <wallet/ismine.h>
#include <wallet/load.h>
#include <wallet/receive.h>
#include <wallet/rpc/backup.h>
#include <wallet/rpc/encrypt.h>
#include <wallet/spend.h>
#include <wallet/wallet.h>

using interfaces::Chain;
using interfaces::FoundBlock;
using interfaces::Handler;
using interfaces::MakeHandler;
using interfaces::Wallet;
using interfaces::WalletAddress;
using interfaces::WalletBalances;
using interfaces::WalletClient;
using interfaces::WalletOrderForm;
using interfaces::WalletTx;
using interfaces::WalletTxOut;
using interfaces::WalletTxStatus;
using interfaces::WalletValueMap;

namespace wallet {
namespace {

    //! Construct wallet tx struct.
    WalletTx MakeWalletTx(CWallet &wallet, const CWalletTx &wtx) {
        LOCK(wallet.cs_wallet);
        WalletTx result;
        result.tx = wtx.tx;
        result.txin_is_mine.reserve(wtx.tx->vin.size());
        for (const auto &txin : wtx.tx->vin) {
            result.txin_is_mine.emplace_back(InputIsMine(wallet, txin));
        }
        result.txout_is_mine.reserve(wtx.tx->vout.size());
        result.txout_address.reserve(wtx.tx->vout.size());
        result.txout_address_is_mine.reserve(wtx.tx->vout.size());
        for (const auto &txout : wtx.tx->vout) {
            result.txout_is_mine.emplace_back(wallet.IsMine(txout));
            result.txout_address.emplace_back();
            result.txout_address_is_mine.emplace_back(
                ExtractDestination(txout.scriptPubKey,
                                   result.txout_address.back())
                    ? wallet.IsMine(result.txout_address.back())
                    : ISMINE_NO);
        }
        result.credit = CachedTxGetCredit(wallet, wtx, ISMINE_ALL);
        result.debit = CachedTxGetDebit(wallet, wtx, ISMINE_ALL);
        result.change = CachedTxGetChange(wallet, wtx);
        result.time = wtx.GetTxTime();
        result.value_map = wtx.mapValue;
        result.is_coinbase = wtx.IsCoinBase();
        return result;
    }

    //! Construct wallet tx status struct.
    WalletTxStatus MakeWalletTxStatus(const CWallet &wallet,
                                      const CWalletTx &wtx)
        EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet) {
        AssertLockHeld(wallet.cs_wallet);

        WalletTxStatus result;
        result.block_height = wtx.m_confirm.block_height > 0
                                  ? wtx.m_confirm.block_height
                                  : std::numeric_limits<int>::max();
        result.blocks_to_maturity = wallet.GetTxBlocksToMaturity(wtx);
        result.depth_in_main_chain = wallet.GetTxDepthInMainChain(wtx);
        result.time_received = wtx.nTimeReceived;
        result.lock_time = wtx.tx->nLockTime;
        result.is_trusted = CachedTxIsTrusted(wallet, wtx);
        result.is_abandoned = wtx.isAbandoned();
        result.is_coinbase = wtx.IsCoinBase();
        result.is_in_main_chain = wallet.IsTxInMainChain(wtx);
        return result;
    }

    //! Construct wallet TxOut struct.
    WalletTxOut MakeWalletTxOut(const CWallet &wallet, const CWalletTx &wtx,
                                int n, int depth)
        EXCLUSIVE_LOCKS_REQUIRED(wallet.cs_wallet) {
        AssertLockHeld(wallet.cs_wallet);

        WalletTxOut result;
        result.txout = wtx.tx->vout[n];
        result.time = wtx.GetTxTime();
        result.depth_in_main_chain = depth;
        result.is_spent = wallet.IsSpent(COutPoint(wtx.GetId(), n));
        return result;
    }

    class WalletImpl : public Wallet {
    public:
        explicit WalletImpl(const std::shared_ptr<CWallet> &wallet)
            : m_wallet(wallet) {}

        bool encryptWallet(const SecureString &wallet_passphrase) override {
            return m_wallet->EncryptWallet(wallet_passphrase);
        }
        bool isCrypted() override { return m_wallet->IsCrypted(); }
        bool lock() override { return m_wallet->Lock(); }
        bool unlock(const SecureString &wallet_passphrase) override {
            return m_wallet->Unlock(wallet_passphrase);
        }
        bool isLocked() override { return m_wallet->IsLocked(); }
        bool changeWalletPassphrase(
            const SecureString &old_wallet_passphrase,
            const SecureString &new_wallet_passphrase) override {
            return m_wallet->ChangeWalletPassphrase(old_wallet_passphrase,
                                                    new_wallet_passphrase);
        }
        void abortRescan() override { m_wallet->AbortRescan(); }
        bool backupWallet(const std::string &filename) override {
            return m_wallet->BackupWallet(filename);
        }
        std::string getWalletName() override { return m_wallet->GetName(); }
        bool getNewDestination(const OutputType type, const std::string label,
                               CTxDestination &dest) override {
            LOCK(m_wallet->cs_wallet);
            std::string error;
            return m_wallet->GetNewDestination(type, label, dest, error);
        }
        const CChainParams &getChainParams() override {
            return m_wallet->GetChainParams();
        }
        bool getPubKey(const CScript &script, const CKeyID &address,
                       CPubKey &pub_key) override {
            std::unique_ptr<SigningProvider> provider =
                m_wallet->GetSolvingProvider(script);
            if (provider) {
                return provider->GetPubKey(address, pub_key);
            }
            return false;
        }
        SigningResult signMessage(const std::string &message,
                                  const PKHash &pkhash,
                                  std::string &str_sig) override {
            return m_wallet->SignMessage(message, pkhash, str_sig);
        }
        bool isSpendable(const CTxDestination &dest) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->IsMine(dest) & ISMINE_SPENDABLE;
        }
        bool haveWatchOnly() override {
            auto spk_man = m_wallet->GetLegacyScriptPubKeyMan();
            if (spk_man) {
                return spk_man->HaveWatchOnly();
            }
            return false;
        };
        bool setAddressBook(const CTxDestination &dest, const std::string &name,
                            const std::string &purpose) override {
            return m_wallet->SetAddressBook(dest, name, purpose);
        }
        bool delAddressBook(const CTxDestination &dest) override {
            return m_wallet->DelAddressBook(dest);
        }
        bool getAddress(const CTxDestination &dest, std::string *name,
                        isminetype *is_mine, std::string *purpose) override {
            LOCK(m_wallet->cs_wallet);
            auto it = m_wallet->m_address_book.find(dest);
            if (it == m_wallet->m_address_book.end() || it->second.IsChange()) {
                return false;
            }
            if (name) {
                *name = it->second.GetLabel();
            }
            if (is_mine) {
                *is_mine = m_wallet->IsMine(dest);
            }
            if (purpose) {
                *purpose = it->second.purpose;
            }
            return true;
        }
        std::vector<WalletAddress> getAddresses() override {
            LOCK(m_wallet->cs_wallet);
            std::vector<WalletAddress> result;
            for (const auto &item : m_wallet->m_address_book) {
                if (item.second.IsChange()) {
                    continue;
                }
                result.emplace_back(item.first, m_wallet->IsMine(item.first),
                                    item.second.GetLabel(),
                                    item.second.purpose);
            }
            return result;
        }
        bool addDestData(const CTxDestination &dest, const std::string &key,
                         const std::string &value) override {
            LOCK(m_wallet->cs_wallet);
            WalletBatch batch{m_wallet->GetDatabase()};
            return m_wallet->AddDestData(batch, dest, key, value);
        }
        bool eraseDestData(const CTxDestination &dest,
                           const std::string &key) override {
            LOCK(m_wallet->cs_wallet);
            WalletBatch batch{m_wallet->GetDatabase()};
            return m_wallet->EraseDestData(batch, dest, key);
        }
        std::vector<std::string>
        getDestValues(const std::string &prefix) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->GetDestValues(prefix);
        }
        void lockCoin(const COutPoint &output) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->LockCoin(output);
        }
        void unlockCoin(const COutPoint &output) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->UnlockCoin(output);
        }
        bool isLockedCoin(const COutPoint &output) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->IsLockedCoin(output);
        }
        void listLockedCoins(std::vector<COutPoint> &outputs) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->ListLockedCoins(outputs);
        }
        CTransactionRef
        createTransaction(const std::vector<CRecipient> &recipients,
                          const CCoinControl &coin_control, bool sign,
                          int &change_pos, Amount &fee,
                          bilingual_str &fail_reason) override {
            LOCK(m_wallet->cs_wallet);
            CTransactionRef tx;
            if (!CreateTransaction(*m_wallet, recipients, tx, fee, change_pos,
                                   fail_reason, coin_control, sign)) {
                return {};
            }
            return tx;
        }
        void commitTransaction(CTransactionRef tx, WalletValueMap value_map,
                               WalletOrderForm order_form) override {
            LOCK(m_wallet->cs_wallet);
            m_wallet->CommitTransaction(std::move(tx), std::move(value_map),
                                        std::move(order_form));
        }
        bool transactionCanBeAbandoned(const TxId &txid) override {
            return m_wallet->TransactionCanBeAbandoned(txid);
        }
        bool abandonTransaction(const TxId &txid) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->AbandonTransaction(txid);
        }
        CTransactionRef getTx(const TxId &txid) override {
            LOCK(m_wallet->cs_wallet);
            auto mi = m_wallet->mapWallet.find(txid);
            if (mi != m_wallet->mapWallet.end()) {
                return mi->second.tx;
            }
            return {};
        }
        WalletTx getWalletTx(const TxId &txid) override {
            LOCK(m_wallet->cs_wallet);
            auto mi = m_wallet->mapWallet.find(txid);
            if (mi != m_wallet->mapWallet.end()) {
                return MakeWalletTx(*m_wallet, mi->second);
            }
            return {};
        }
        std::vector<WalletTx> getWalletTxs() override {
            LOCK(m_wallet->cs_wallet);
            std::vector<WalletTx> result;
            result.reserve(m_wallet->mapWallet.size());
            for (const auto &entry : m_wallet->mapWallet) {
                result.emplace_back(MakeWalletTx(*m_wallet, entry.second));
            }
            return result;
        }
        bool tryGetTxStatus(const TxId &txid,
                            interfaces::WalletTxStatus &tx_status,
                            int &num_blocks, int64_t &block_time) override {
            TRY_LOCK(m_wallet->cs_wallet, locked_wallet);
            if (!locked_wallet) {
                return false;
            }
            auto mi = m_wallet->mapWallet.find(txid);
            if (mi == m_wallet->mapWallet.end()) {
                return false;
            }
            num_blocks = m_wallet->GetLastBlockHeight();
            block_time = -1;
            CHECK_NONFATAL(m_wallet->chain().findBlock(
                m_wallet->GetLastBlockHash(), FoundBlock().time(block_time)));
            tx_status = MakeWalletTxStatus(*m_wallet, mi->second);
            return true;
        }
        WalletTx getWalletTxDetails(const TxId &txid, WalletTxStatus &tx_status,
                                    WalletOrderForm &order_form,
                                    bool &in_mempool,
                                    int &num_blocks) override {
            LOCK(m_wallet->cs_wallet);
            auto mi = m_wallet->mapWallet.find(txid);
            if (mi != m_wallet->mapWallet.end()) {
                num_blocks = m_wallet->GetLastBlockHeight();
                in_mempool = mi->second.InMempool();
                order_form = mi->second.vOrderForm;
                tx_status = MakeWalletTxStatus(*m_wallet, mi->second);
                return MakeWalletTx(*m_wallet, mi->second);
            }
            return {};
        }
        TransactionError fillPSBT(SigHashType sighash_type, bool sign,
                                  bool bip32derivs,
                                  PartiallySignedTransaction &psbtx,
                                  bool &complete) const override {
            return m_wallet->FillPSBT(psbtx, complete, sighash_type, sign,
                                      bip32derivs);
        }
        WalletBalances getBalances() override {
            const auto bal = GetBalance(*m_wallet);
            WalletBalances result;
            result.balance = bal.m_mine_trusted;
            result.unconfirmed_balance = bal.m_mine_untrusted_pending;
            result.immature_balance = bal.m_mine_immature;
            result.have_watch_only = haveWatchOnly();
            if (result.have_watch_only) {
                result.watch_only_balance = bal.m_watchonly_trusted;
                result.unconfirmed_watch_only_balance =
                    bal.m_watchonly_untrusted_pending;
                result.immature_watch_only_balance = bal.m_watchonly_immature;
            }
            return result;
        }
        bool tryGetBalances(WalletBalances &balances,
                            BlockHash &block_hash) override {
            TRY_LOCK(m_wallet->cs_wallet, locked_wallet);
            if (!locked_wallet) {
                return false;
            }
            block_hash = m_wallet->GetLastBlockHash();
            balances = getBalances();
            return true;
        }
        Amount getBalance() override {
            return GetBalance(*m_wallet).m_mine_trusted;
        }
        Amount getAvailableBalance(const CCoinControl &coin_control) override {
            return GetAvailableBalance(*m_wallet, &coin_control);
        }
        isminetype txinIsMine(const CTxIn &txin) override {
            LOCK(m_wallet->cs_wallet);
            return InputIsMine(*m_wallet, txin);
        }
        isminetype txoutIsMine(const CTxOut &txout) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->IsMine(txout);
        }
        Amount getDebit(const CTxIn &txin, isminefilter filter) override {
            LOCK(m_wallet->cs_wallet);
            return m_wallet->GetDebit(txin, filter);
        }
        Amount getCredit(const CTxOut &txout, isminefilter filter) override {
            LOCK(m_wallet->cs_wallet);
            return OutputGetCredit(*m_wallet, txout, filter);
        }
        CoinsList listCoins() override {
            LOCK(m_wallet->cs_wallet);
            CoinsList result;
            for (const auto &entry : ListCoins(*m_wallet)) {
                auto &group = result[entry.first];
                for (const auto &coin : entry.second) {
                    group.emplace_back(COutPoint(coin.tx->GetId(), coin.i),
                                       MakeWalletTxOut(*m_wallet, *coin.tx,
                                                       coin.i, coin.nDepth));
                }
            }
            return result;
        }
        std::vector<WalletTxOut>
        getCoins(const std::vector<COutPoint> &outputs) override {
            LOCK(m_wallet->cs_wallet);
            std::vector<WalletTxOut> result;
            result.reserve(outputs.size());
            for (const auto &output : outputs) {
                result.emplace_back();
                auto it = m_wallet->mapWallet.find(output.GetTxId());
                if (it != m_wallet->mapWallet.end()) {
                    int depth = m_wallet->GetTxDepthInMainChain(it->second);
                    if (depth >= 0) {
                        result.back() = MakeWalletTxOut(*m_wallet, it->second,
                                                        output.GetN(), depth);
                    }
                }
            }
            return result;
        }
        bool hdEnabled() override { return m_wallet->IsHDEnabled(); }
        OutputType getDefaultAddressType() override {
            return m_wallet->m_default_address_type;
        }
        bool canGetAddresses() const override {
            return m_wallet->CanGetAddresses();
        }
        bool privateKeysDisabled() override {
            return m_wallet->IsWalletFlagSet(WALLET_FLAG_DISABLE_PRIVATE_KEYS);
        }
        Amount getDefaultMaxTxFee() override {
            return m_wallet->m_default_max_tx_fee;
        }
        void remove() override {
            RemoveWallet(m_wallet, false /* load_on_start */);
        }
        bool isLegacy() override { return m_wallet->IsLegacy(); }
        std::unique_ptr<Handler> handleUnload(UnloadFn fn) override {
            return MakeHandler(m_wallet->NotifyUnload.connect(fn));
        }
        std::unique_ptr<Handler>
        handleShowProgress(ShowProgressFn fn) override {
            return MakeHandler(m_wallet->ShowProgress.connect(fn));
        }
        std::unique_ptr<Handler>
        handleStatusChanged(StatusChangedFn fn) override {
            return MakeHandler(m_wallet->NotifyStatusChanged.connect(
                [fn](CWallet *) { fn(); }));
        }
        std::unique_ptr<Handler>
        handleAddressBookChanged(AddressBookChangedFn fn) override {
            return MakeHandler(m_wallet->NotifyAddressBookChanged.connect(
                [fn](CWallet *, const CTxDestination &address,
                     const std::string &label, bool is_mine,
                     const std::string &purpose, ChangeType status) {
                    fn(address, label, is_mine, purpose, status);
                }));
        }
        std::unique_ptr<Handler>
        handleTransactionChanged(TransactionChangedFn fn) override {
            return MakeHandler(m_wallet->NotifyTransactionChanged.connect(
                [fn](CWallet *, const TxId &txid, ChangeType status) {
                    fn(txid, status);
                }));
        }
        std::unique_ptr<Handler>
        handleWatchOnlyChanged(WatchOnlyChangedFn fn) override {
            return MakeHandler(m_wallet->NotifyWatchonlyChanged.connect(fn));
        }
        std::unique_ptr<Handler>
        handleCanGetAddressesChanged(CanGetAddressesChangedFn fn) override {
            return MakeHandler(
                m_wallet->NotifyCanGetAddressesChanged.connect(fn));
        }
        Amount getRequiredFee(unsigned int tx_bytes) override {
            return GetRequiredFee(*m_wallet, tx_bytes);
        }
        Amount getMinimumFee(unsigned int tx_bytes,
                             const CCoinControl &coin_control) override {
            return GetMinimumFee(*m_wallet, tx_bytes, coin_control);
        }
        CWallet *wallet() override { return m_wallet.get(); }

        std::shared_ptr<CWallet> m_wallet;
    };

    class WalletClientImpl : public WalletClient {
    public:
        WalletClientImpl(Chain &chain, ArgsManager &args) {
            m_context.chain = &chain;
            m_context.args = &args;
        }
        ~WalletClientImpl() override { UnloadWallets(); }

        //! ChainClient methods
        void registerRpcs(const Span<const CRPCCommand> &commands) {
            for (const CRPCCommand &command : commands) {
                m_rpc_commands.emplace_back(
                    command.category, command.name,
                    [this, &command](const Config &config,
                                     const JSONRPCRequest &request,
                                     UniValue &result, bool last_handler) {
                        JSONRPCRequest wallet_request = request;
                        wallet_request.context = &m_context;
                        return command.actor(config, wallet_request, result,
                                             last_handler);
                    },
                    command.argNames, command.unique_id);
                m_rpc_handlers.emplace_back(
                    m_context.chain->handleRpc(m_rpc_commands.back()));
            }
        }

        void registerRpcs() override {
            registerRpcs(GetWalletRPCCommands());
            registerRpcs(GetWalletDumpRPCCommands());
            registerRpcs(GetWalletEncryptRPCCommands());
        }
        bool verify() override { return VerifyWallets(*m_context.chain); }
        bool load() override { return LoadWallets(*m_context.chain); }
        void start(CScheduler &scheduler) override {
            return StartWallets(scheduler, *Assert(m_context.args));
        }
        void flush() override { return FlushWallets(); }
        void stop() override { return StopWallets(); }
        void setMockTime(int64_t time) override { return SetMockTime(time); }

        //! WalletClient methods
        std::unique_ptr<Wallet>
        createWallet(const std::string &name, const SecureString &passphrase,
                     uint64_t wallet_creation_flags, bilingual_str &error,
                     std::vector<bilingual_str> &warnings) override {
            std::shared_ptr<CWallet> wallet;
            DatabaseOptions options;
            DatabaseStatus status;
            options.require_create = true;
            options.create_flags = wallet_creation_flags;
            options.create_passphrase = passphrase;

            return MakeWallet(CreateWallet(*m_context.chain, name,
                                           true /* load_on_start */, options,
                                           status, error, warnings));
        }
        std::unique_ptr<Wallet>
        loadWallet(const std::string &name, bilingual_str &error,
                   std::vector<bilingual_str> &warnings) override {
            DatabaseOptions options;
            DatabaseStatus status;
            options.require_existing = true;
            return MakeWallet(LoadWallet(*m_context.chain, name,
                                         true /* load_on_start */, options,
                                         status, error, warnings));
        }
        std::string getWalletDir() override {
            return fs::PathToString(GetWalletDir());
        }
        std::vector<std::string> listWalletDir() override {
            std::vector<std::string> paths;
            for (auto &path : ListWalletDir()) {
                paths.push_back(fs::PathToString(path));
            }
            return paths;
        }

        std::vector<std::unique_ptr<Wallet>> getWallets() override {
            std::vector<std::unique_ptr<Wallet>> wallets;
            for (const auto &wallet : GetWallets()) {
                wallets.emplace_back(MakeWallet(wallet));
            }
            return wallets;
        }

        std::unique_ptr<Handler> handleLoadWallet(LoadWalletFn fn) override {
            return HandleLoadWallet(std::move(fn));
        }

        WalletContext m_context;
        const std::vector<std::string> m_wallet_filenames;
        std::vector<std::unique_ptr<Handler>> m_rpc_handlers;
        std::list<CRPCCommand> m_rpc_commands;
    };
} // namespace
} // namespace wallet

namespace interfaces {
std::unique_ptr<Wallet> MakeWallet(const std::shared_ptr<CWallet> &wallet) {
    return wallet ? std::make_unique<wallet::WalletImpl>(wallet) : nullptr;
}

std::unique_ptr<WalletClient> MakeWalletClient(Chain &chain,
                                               ArgsManager &args) {
    return std::make_unique<wallet::WalletClientImpl>(chain, args);
}
} // namespace interfaces
