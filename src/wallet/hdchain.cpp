// Copyright (c) 2014-2017 The Dash Core developers
// Copyright (c) 2019 DeVault developers
// Distributed under the MIT software license, see the accompanying

#include "hdchain.h"
#include "chainparams.h"
#include "util.h"
#include "utilstrencodings.h"
#include <iostream>

void CHDChain::Setup(const mnemonic::WordList& words, const std::vector<uint8_t>& hashWords) {
    SecureString securewords(join(words," "));
    vchMnemonic = SecureVector(securewords.begin(), securewords.end());
    vchSeed = SecureVector(hashWords.begin(), hashWords.end());
    id = GetSeedHash();
}
void CHDChain::Setup(const SecureString& securewords, const std::vector<uint8_t>& hashWords) {
    vchMnemonic = SecureVector(securewords.begin(), securewords.end());
    vchSeed = SecureVector(hashWords.begin(), hashWords.end());
    id = GetSeedHash();
}
void CHDChain::SetupCrypted(const SecureVector& securewords, const SecureVector& secureseed) {
    vchMnemonic = securewords;
    vchSeed = secureseed;
    // Seed/ID should be already set
    //id = GetSeedHash();
}
    
bool CHDChain::GetMnemonic(SecureVector &vchMnemonicRet) const {
  // mnemonic was not set, fail
  if (vchMnemonic.empty()) return false;
  vchMnemonicRet = vchMnemonic;
  return true;
}

bool CHDChain::GetMnemonic(SecureString &ssMnemonicRet) const {
  // mnemonic was not set, fail
  if (vchMnemonic.empty()) return false;
  ssMnemonicRet = SecureString(vchMnemonic.begin(), vchMnemonic.end());
  return true;
}

bool CHDChain::SetSeed(const SecureVector &vchSeedIn, bool fUpdateID) {
  vchSeed = vchSeedIn;
  if (fUpdateID) { id = GetSeedHash(); }
  return !IsNull();
}

void CHDChain::DeriveChildExtKey(uint32_t nAccountIndex, bool fInternal, uint32_t nChildIndex, CExtKey &extKeyRet) {
  // Use BIP44 keypath scheme i.e. m / purpose' / coin_type' / account' /
  // change / address_index
  CExtKey masterKey;   // hd master key
  CExtKey purposeKey;  // key at m/purpose'
  CExtKey cointypeKey; // key at m/purpose'/coin_type'
  CExtKey accountKey;  // key at m/purpose'/coin_type'/account'
  CExtKey changeKey;   // key at m/purpose'/coin_type'/account'/change
  CExtKey childKey;    // key at m/purpose'/coin_type'/account'/change/address_index

  masterKey.SetMaster(&vchSeed[0], vchSeed.size());

  const uint32_t BIP32_HARDENED_KEY_LIMIT = 0x80000000;
  // Use hardened derivation for purpose, coin_type and account
  // (keys >= 0x80000000 are hardened after bip32)

  // derive m/purpose'
  masterKey.Derive(purposeKey, 44 | BIP32_HARDENED_KEY_LIMIT);
  // derive m/purpose'/coin_type'
  purposeKey.Derive(cointypeKey, Params().ExtCoinType() | BIP32_HARDENED_KEY_LIMIT);
  // derive m/purpose'/coin_type'/account'
  cointypeKey.Derive(accountKey, nAccountIndex | BIP32_HARDENED_KEY_LIMIT);
  // derive m/purpose'/coin_type'/account'/change
  accountKey.Derive(changeKey, fInternal ? 1 : 0);
  // derive m/purpose'/coin_type'/account'/change/address_index
  changeKey.Derive(extKeyRet, nChildIndex);
}

void CHDChain::AddAccount() {
  LOCK(cs_accounts);
  mapAccounts.insert(std::pair<uint32_t, CHDAccount>(mapAccounts.size(), CHDAccount()));
}

bool CHDChain::GetAccount(uint32_t nAccountIndex, CHDAccount &hdAccountRet) {
  LOCK(cs_accounts);
  if (nAccountIndex > mapAccounts.size() - 1) return false;
  hdAccountRet = mapAccounts[nAccountIndex];
  return true;
}

bool CHDChain::SetAccount(uint32_t nAccountIndex, const CHDAccount &hdAccount) {
  LOCK(cs_accounts);
  // can only replace existing accounts
  if (nAccountIndex > mapAccounts.size() - 1) return false;
  mapAccounts[nAccountIndex] = hdAccount;
  return true;
}

size_t CHDChain::CountAccounts() {
  LOCK(cs_accounts);
  return mapAccounts.size();
}

std::string CHDPubKey::GetKeyPath() const {
  return strprintf("m/44'/%d'/%d'/%d/%d", Params().ExtCoinType(), nAccountIndex, nChangeIndex, extPubKey.nChild);
}
