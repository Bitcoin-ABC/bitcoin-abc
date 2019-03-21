// Copyright 2018 The Beam Team
// Copyright (c) 2019 The DeVault developers
// Copyright (c) 2019 Jon Spock
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
#pragma once
#include "dictionary.h"
#include <string>
#include <vector>

namespace mnemonic {
class MnemonicException : public std::runtime_error {
  public:
  explicit MnemonicException(const std::string &msg) : std::runtime_error(msg.c_str()) {}

  explicit MnemonicException(const char *msg) : std::runtime_error(msg) {}
};

typedef std::vector<std::string> WordList;

// implementation of bip39 for 12 words
WordList mapBitsToMnemonic(std::vector<uint8_t> &data, const Dictionary &dict);
std::vector<uint8_t> decodeMnemonic(const WordList &words);

bool isAllowedWord(const std::string &word, const Dictionary &dict);
bool isValidMnemonic(const WordList &words, const Dictionary &dict);
}
