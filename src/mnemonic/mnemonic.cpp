// Copyright 2018 The Beam Team
// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
//
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "mnemonic.h"
#include "pkcs5_pbkdf2.h"
#include "sha256.h"
#include "utilstrencodings.h"
#include <iostream>
#include <random>

using namespace std;

namespace mnemonic {
namespace {
const size_t wordCount = 12;
const size_t bitsPerWord = 11;
const uint8_t byteBits = 8;
const string passphrasePrefix = "mnemonic";
const size_t hmacIterations = 2048;
const size_t sizeHash = 512 >> 3;

uint8_t shiftBits(size_t bit) { return (1 << (byteBits - (bit % byteBits) - 1)); }
}

WordList mapBitsToMnemonic(vector<uint8_t> &data, const Dictionary &dict) {
  // entropy should be 16 bytes or 128 bits for 12 words
  assert(data.size() == 128 >> 3);

  uint8_t checksum[32];
  CSHA256 chasher;
  chasher.Write(&data[0], data.size());
  chasher.Finalize(checksum);

  vector<string> words;
  assert(data.size() == 128 >> 3); // ???
  size_t bit = 0;

  data.push_back(checksum[0]);

  for (size_t word = 0; word < wordCount; word++) {
    size_t position = 0;
    for (size_t loop = 0; loop < bitsPerWord; loop++) {
      bit = (word * bitsPerWord + loop);
      position <<= 1;

      const auto byte = bit / byteBits;

      if ((data[byte] & shiftBits(bit)) > 0) position++;
    }

    words.push_back(dict[position]);
  }

  return words;
}
// Matches bip39 seed on https://iancoleman.io/bip39/
vector<uint8_t> decodeMnemonic(const WordList &words) {
  const string sentence = join(words, " ");
  vector<uint8_t> passphrase(sentence.begin(), sentence.end());
  vector<uint8_t> salt(passphrasePrefix.begin(), passphrasePrefix.end());
  vector<uint8_t> hash(sizeHash);

  const auto result = pkcs5_pbkdf2(passphrase.data(), passphrase.size(), salt.data(), salt.size(), hash.data(),
                                   hash.size(), hmacIterations);

  if (result != 0) throw MnemonicException("pbkdf2 returned bad result");

  return hash;
}

bool isAllowedWord(const string &word, const Dictionary &dict) {
  assert(is_sorted(dict.begin(), dict.end()));
  return binary_search(dict.begin(), dict.end(), word);
}

bool isValidMnemonic(const WordList &words, const Dictionary &dict) {
  return words.size() == 12 &&
         all_of(words.begin(), words.end(), [&dict](const string &w) { return isAllowedWord(w, dict); });
}
}
