// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockfilter.h>
#include <crypto/siphash.h>
#include <serialize.h>
#include <streams.h>
#include <util/bytevectorhash.h>
#include <util/golombrice.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <iosfwd>
#include <unordered_set>
#include <vector>

namespace {
uint64_t MapIntoRange(const uint64_t x, const uint64_t n) {
    const uint64_t x_hi = x >> 32;
    const uint64_t x_lo = x & 0xFFFFFFFF;
    const uint64_t n_hi = n >> 32;
    const uint64_t n_lo = n & 0xFFFFFFFF;
    const uint64_t ac = x_hi * n_hi;
    const uint64_t ad = x_hi * n_lo;
    const uint64_t bc = x_lo * n_hi;
    const uint64_t bd = x_lo * n_lo;
    const uint64_t mid34 = (bd >> 32) + (bc & 0xFFFFFFFF) + (ad & 0xFFFFFFFF);
    const uint64_t upper64 = ac + (bc >> 32) + (ad >> 32) + (mid34 >> 32);
    return upper64;
}

uint64_t HashToRange(const std::vector<uint8_t> &element, const uint64_t f) {
    const uint64_t hash =
        CSipHasher(0x0706050403020100ULL, 0x0F0E0D0C0B0A0908ULL)
            .Write(element.data(), element.size())
            .Finalize();
    return MapIntoRange(hash, f);
}

std::vector<uint64_t> BuildHashedSet(
    const std::unordered_set<std::vector<uint8_t>, ByteVectorHash> &elements,
    const uint64_t f) {
    std::vector<uint64_t> hashed_elements;
    hashed_elements.reserve(elements.size());
    for (const std::vector<uint8_t> &element : elements) {
        hashed_elements.push_back(HashToRange(element, f));
    }
    std::sort(hashed_elements.begin(), hashed_elements.end());
    return hashed_elements;
}
} // namespace

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    std::vector<uint8_t> golomb_rice_data;
    std::vector<uint64_t> encoded_deltas;
    {
        std::unordered_set<std::vector<uint8_t>, ByteVectorHash> elements;
        const int n = fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 512);
        for (int i = 0; i < n; ++i) {
            elements.insert(
                ConsumeRandomLengthByteVector(fuzzed_data_provider, 16));
        }
        CVectorWriter stream(SER_NETWORK, 0, golomb_rice_data, 0);
        WriteCompactSize(stream, static_cast<uint32_t>(elements.size()));
        BitStreamWriter<CVectorWriter> bitwriter(stream);
        if (!elements.empty()) {
            uint64_t last_value = 0;
            for (const uint64_t value : BuildHashedSet(
                     elements, static_cast<uint64_t>(elements.size()) *
                                   static_cast<uint64_t>(BASIC_FILTER_M))) {
                const uint64_t delta = value - last_value;
                encoded_deltas.push_back(delta);
                GolombRiceEncode(bitwriter, BASIC_FILTER_P, delta);
                last_value = value;
            }
        }
        bitwriter.Flush();
    }

    std::vector<uint64_t> decoded_deltas;
    {
        VectorReader stream{SER_NETWORK, 0, golomb_rice_data, 0};
        BitStreamReader<VectorReader> bitreader(stream);
        const uint32_t n = static_cast<uint32_t>(ReadCompactSize(stream));
        for (uint32_t i = 0; i < n; ++i) {
            decoded_deltas.push_back(
                GolombRiceDecode(bitreader, BASIC_FILTER_P));
        }
    }

    assert(encoded_deltas == decoded_deltas);

    {
        const std::vector<uint8_t> random_bytes =
            ConsumeRandomLengthByteVector(fuzzed_data_provider, 1024);
        VectorReader stream{SER_NETWORK, 0, random_bytes, 0};
        uint32_t n;
        try {
            n = static_cast<uint32_t>(ReadCompactSize(stream));
        } catch (const std::ios_base::failure &) {
            return;
        }
        BitStreamReader<VectorReader> bitreader(stream);
        for (uint32_t i = 0; i < std::min<uint32_t>(n, 1024); ++i) {
            try {
                (void)GolombRiceDecode(bitreader, BASIC_FILTER_P);
            } catch (const std::ios_base::failure &) {
            }
        }
    }
}
