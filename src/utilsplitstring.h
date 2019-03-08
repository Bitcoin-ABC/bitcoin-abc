// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <iterator>
#include <set>
#include <string>
#include <type_traits>
#include <vector>

#pragma once
/**
 * Tokenizes a string by any of the given separators.
 * @param[in] tokens            The container (either an instance of std::vector<std::string>
 *                              or std::set<std::string>) to add tokenized string parts to.
 * @param[in] str               The string to tokenize.
 * @param[in] anyOfSeparator    A string with valid separators.
 * @param[in] mergeEmpty        Set to true to merge adjacent separators (empty tokens); otherwise false (default).
 */
template <typename ContainerT>
void Split(ContainerT& tokens, const std::string& str, const std::string& anyOfSeparator, bool mergeEmpty = false) {
  static_assert(std::is_same<std::vector<std::string>, ContainerT>::value ||
                    std::is_same<std::set<std::string>, ContainerT>::value,
                "ContainerT must be of type std::vector<std::string> or std::set<std::string>");
  auto insertIt = std::inserter(tokens, tokens.end());
  if (str.empty()) {
    *insertIt = "";
    return;
  }
  const auto begin = str.cbegin();
  const auto end = str.cend();
  for (auto it = begin; it < end;) {
    bool foundSeparator = false;
    auto tokenIt = it;
    while (tokenIt < end && !(foundSeparator = anyOfSeparator.find(*tokenIt) != std::string::npos)) { ++tokenIt; }
    if (tokenIt != begin && (!mergeEmpty || tokenIt != it)) { *insertIt = std::string(it, tokenIt); }
    if (foundSeparator) {
      if (tokenIt == begin) { *insertIt = ""; }
      if (tokenIt == end - 1) { *insertIt = ""; }
    }
    it = tokenIt + 1;
  }
}
