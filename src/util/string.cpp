// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <util/string.h>

#include <string>
#include <string_view>

namespace util {
void ReplaceAll(std::string &in_out, std::string_view search,
                std::string_view substitute) {
    if (search.empty()) {
        return;
    }
    auto pos{in_out.find(search)};
    if (pos == std::string::npos) {
        return;
    }

    // Build separately because repeated std::string::replace() calls move the
    // remaining suffix when sizes differ
    std::string result;
    result.reserve(in_out.size());
    std::string::size_type start{0};
    for (; pos != std::string::npos; pos = in_out.find(search, start)) {
        result.append(in_out, start, pos - start).append(substitute);
        start = pos + search.size();
    }
    result.append(in_out, start);
    in_out.swap(result);
}
} // namespace util
