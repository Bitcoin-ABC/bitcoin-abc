// Copyright (c) 2019 DeVault Developers
// Copyright (c) 2019 Jon Spock
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once

class noncopyable {
public:
    noncopyable() = default;
    ~noncopyable() = default;

private:
    noncopyable(const noncopyable &) = delete;
    noncopyable &operator=(const noncopyable &) = delete;
};
