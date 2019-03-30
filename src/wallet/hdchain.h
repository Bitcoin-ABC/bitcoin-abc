// Copyright (c) 2014-2017 The Dash Core developers
// Copyright (c) 2019 DeVault developers
// Distributed under the MIT software license, see the accompanying
#pragma once

#include "key.h"
#include "mnemonic.h"
#include "sync.h"
#include "support/allocators/secure.h"


/* hd account data model */
class CHDAccount {
  public:
  uint32_t nExternalChainCounter;
  uint32_t nInternalChainCounter;

  CHDAccount() : nExternalChainCounter(0), nInternalChainCounter(0) {}

  ADD_SERIALIZE_METHODS;
  template <typename Stream, typename Operation> inline void SerializationOp(Stream &s, Operation ser_action) {
    READWRITE(nExternalChainCounter);
    READWRITE(nInternalChainCounter);
  }
};

/* simple HD chain data model */
class CHDChain {
private:
  static const int CURRENT_VERSION = 1;
public:
  int nVersion;
  uint256 id;
  SecureVector vchSeed;
  SecureVector vchMnemonic;
  bool fCrypted;

  std::map<uint32_t, CHDAccount> mapAccounts;
  // critical section to protect mapAccounts
  mutable CCriticalSection cs_accounts;

  CHDChain() { SetNull(); }
  CHDChain(const CHDChain &other)
    : nVersion(other.nVersion),
      id(other.id), vchSeed(other.vchSeed), vchMnemonic(other.vchMnemonic), fCrypted(other.fCrypted),
        mapAccounts(other.mapAccounts) {}

  ADD_SERIALIZE_METHODS;
  template <typename Stream, typename Operation> inline void SerializationOp(Stream &s, Operation ser_action) {
    LOCK(cs_accounts);
    READWRITE(this->nVersion);
    READWRITE(id);
    READWRITE(vchSeed);
    READWRITE(vchMnemonic);
    READWRITE(fCrypted);
    READWRITE(mapAccounts);
  }

  void swap(CHDChain &first, CHDChain &second) // nothrow
  {
    // enable ADL (not necessary in our case, but good practice)
    using std::swap;

    // by swapping the members of two classes,
    // the two classes are effectively swapped
    swap(first.nVersion, second.nVersion);
    swap(first.id, second.id);
    swap(first.vchSeed, second.vchSeed);
    swap(first.vchMnemonic, second.vchMnemonic);
    swap(first.fCrypted, second.fCrypted);
    swap(first.mapAccounts, second.mapAccounts);
    

  }
  CHDChain &operator=(CHDChain from) {
    swap(*this, from);
    return *this;
  }

  bool SetNull() {
    LOCK(cs_accounts);
    nVersion = CURRENT_VERSION;
    id = uint256();
    vchSeed.clear();
    vchMnemonic.clear();
    mapAccounts.clear();
    fCrypted = false;
    // default blank account
    mapAccounts.insert(std::pair<uint32_t, CHDAccount>(0, CHDAccount()));
    return IsNull();
  }

  void Setup(const mnemonic::WordList& words, const std::vector<uint8_t>& hashWords);
  void Setup(const SecureString& strWords, const std::vector<uint8_t>& hashWords);
  void SetupCrypted(const SecureVector& words, const SecureVector& seed);
        
  bool IsNull() const { return vchSeed.empty() || id == uint256(); }

  void SetCrypted(bool fCryptedIn) { fCrypted = fCryptedIn; }
  bool IsCrypted() const { return fCrypted; }

  bool GetMnemonic(SecureVector &vchMnemonicRet) const;
  bool GetMnemonic(SecureString &ssMnemonicRet) const;

  void SetMnemonic(SecureVector &securewords) {  vchMnemonic = securewords;}
  bool SetSeed(const SecureVector &vchSeedIn, bool fUpdateID);
  SecureVector GetSeed() const { return vchSeed; }
  uint256 GetSeedHash() { return Hash(vchSeed.begin(), vchSeed.end()); }
    
  uint256 GetID() const { return id; }

  void DeriveChildExtKey(uint32_t nAccountIndex, bool fInternal, uint32_t nChildIndex, CExtKey &extKeyRet);

  void AddAccount();
  bool GetAccount(uint32_t nAccountIndex, CHDAccount &hdAccountRet);
  bool SetAccount(uint32_t nAccountIndex, const CHDAccount &hdAccount);
  size_t CountAccounts();
};

/* hd pubkey data model */
class CHDPubKey {
  private:
  static const int CURRENT_VERSION = 1;
  int nVersion;

  public:
  CExtPubKey extPubKey;
  uint256 hdchainID;
  uint32_t nAccountIndex;
  uint32_t nChangeIndex;

  CHDPubKey() : nVersion(CHDPubKey::CURRENT_VERSION), nAccountIndex(0), nChangeIndex(0) {}

  ADD_SERIALIZE_METHODS;
  template <typename Stream, typename Operation> inline void SerializationOp(Stream &s, Operation ser_action) {
    READWRITE(this->nVersion);
    READWRITE(extPubKey);
    READWRITE(hdchainID);
    READWRITE(nAccountIndex);
    READWRITE(nChangeIndex);
  }

  std::string GetKeyPath() const;
};

class CKeyMetadata {
  public:
  static const int CURRENT_VERSION = 1;
  int nVersion;
  // 0 means unknown.
  int64_t nCreateTime;

  CKeyMetadata() { SetNull(); }
  explicit CKeyMetadata(int64_t nCreateTime_) {
    SetNull();
    nCreateTime = nCreateTime_;
  }

  ADD_SERIALIZE_METHODS;

  template <typename Stream, typename Operation> inline void SerializationOp(Stream &s, Operation ser_action) {
    READWRITE(this->nVersion);
    READWRITE(nCreateTime);
  }

  void SetNull() {
    nVersion = CKeyMetadata::CURRENT_VERSION;
    nCreateTime = 0;
  }
};
