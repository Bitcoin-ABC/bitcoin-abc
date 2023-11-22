// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <crypto/siphash.h>
#include <random.h>
#include <util/bytevectorhash.h>

ByteVectorHash::ByteVectorHash()
    : m_k0(GetRand<uint64_t>()), m_k1(GetRand<uint64_t>()) {}

size_t ByteVectorHash::operator()(const std::vector<uint8_t> &input) const {
    return CSipHasher(m_k0, m_k1).Write(input.data(), input.size()).Finalize();
}
