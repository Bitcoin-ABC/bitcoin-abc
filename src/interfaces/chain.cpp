// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <interfaces/chain.h>

#include <sync.h>
#include <util/system.h>
#include <validation.h>

#include <memory>
#include <utility>

namespace interfaces {
namespace {

    class LockImpl : public Chain::Lock {};

    class LockingStateImpl : public LockImpl,
                             public UniqueLock<CCriticalSection> {
        using UniqueLock::UniqueLock;
    };

    class ChainImpl : public Chain {
    public:
        std::unique_ptr<Chain::Lock> lock(bool try_lock) override {
            auto result = std::make_unique<LockingStateImpl>(
                ::cs_main, "cs_main", __FILE__, __LINE__, try_lock);
            if (try_lock && result && !*result) {
                return {};
            }
            return result;
        }
        std::unique_ptr<Chain::Lock> assumeLocked() override {
            return std::make_unique<LockImpl>();
        }
    };

} // namespace

std::unique_ptr<Chain> MakeChain() {
    return std::make_unique<ChainImpl>();
}

} // namespace interfaces
