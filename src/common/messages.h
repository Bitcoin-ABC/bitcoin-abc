// Copyright (c) 2010-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_COMMON_MESSAGES_H
#define BITCOIN_COMMON_MESSAGES_H

#include <string>

struct bilingual_str;

namespace node {
enum class TransactionError;
} // namespace node

namespace common {
enum class PSBTError;
bilingual_str PSBTErrorString(PSBTError err);

bilingual_str TransactionErrorString(node::TransactionError error);

bilingual_str ResolveErrMsg(const std::string &optname,
                            const std::string &strBind);

bilingual_str InvalidPortErrMsg(const std::string &optname,
                                const std::string &strPort);

bilingual_str AmountHighWarn(const std::string &optname);

bilingual_str AmountErrMsg(const std::string &optname,
                           const std::string &strValue);
} // namespace common

#endif // BITCOIN_COMMON_MESSAGES_H
