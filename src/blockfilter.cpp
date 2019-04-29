// Copyright (c) 2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockfilter.h>
#include <hash.h>
#include <streams.h>

/// SerType used to serialize parameters in GCS filter encoding.
static constexpr int GCS_SER_TYPE = SER_NETWORK;

/// Protocol version used to serialize parameters in GCS filter encoding.
static constexpr int GCS_SER_VERSION = 0;

template <typename OStream>
static void GolombRiceEncode(BitStreamWriter<OStream> &bitwriter, uint8_t P,
                             uint64_t x) {
    // Write quotient as unary-encoded: q 1's followed by one 0.
    uint64_t q = x >> P;
    while (q > 0) {
        int nbits = q <= 64 ? static_cast<int>(q) : 64;
        bitwriter.Write(~0ULL, nbits);
        q -= nbits;
    }
    bitwriter.Write(0, 1);

    // Write the remainder in P bits. Since the remainder is just the bottom
    // P bits of x, there is no need to mask first.
    bitwriter.Write(x, P);
}

template <typename IStream>
static uint64_t GolombRiceDecode(BitStreamReader<IStream> &bitreader,
                                 uint8_t P) {
    // Read unary-encoded quotient: q 1's followed by one 0.
    uint64_t q = 0;
    while (bitreader.Read(1) == 1) {
        ++q;
    }

    uint64_t r = bitreader.Read(P);

    return (q << P) + r;
}

// Map a value x that is uniformly distributed in the range [0, 2^64) to a
// value uniformly distributed in [0, n) by returning the upper 64 bits of
// x * n.
//
// See:
// https://lemire.me/blog/2016/06/27/a-fast-alternative-to-the-modulo-reduction/
static uint64_t MapIntoRange(uint64_t x, uint64_t n) {
#ifdef __SIZEOF_INT128__
    return (static_cast<unsigned __int128>(x) *
            static_cast<unsigned __int128>(n)) >>
           64;
#else
    // To perform the calculation on 64-bit numbers without losing the
    // result to overflow, split the numbers into the most significant and
    // least significant 32 bits and perform multiplication piece-wise.
    //
    // See: https://stackoverflow.com/a/26855440
    uint64_t x_hi = x >> 32;
    uint64_t x_lo = x & 0xFFFFFFFF;
    uint64_t n_hi = n >> 32;
    uint64_t n_lo = n & 0xFFFFFFFF;

    uint64_t ac = x_hi * n_hi;
    uint64_t ad = x_hi * n_lo;
    uint64_t bc = x_lo * n_hi;
    uint64_t bd = x_lo * n_lo;

    uint64_t mid34 = (bd >> 32) + (bc & 0xFFFFFFFF) + (ad & 0xFFFFFFFF);
    uint64_t upper64 = ac + (bc >> 32) + (ad >> 32) + (mid34 >> 32);
    return upper64;
#endif
}

uint64_t GCSFilter::HashToRange(const Element &element) const {
    uint64_t hash = CSipHasher(m_siphash_k0, m_siphash_k1)
                        .Write(element.data(), element.size())
                        .Finalize();
    return MapIntoRange(hash, m_F);
}

std::vector<uint64_t>
GCSFilter::BuildHashedSet(const ElementSet &elements) const {
    std::vector<uint64_t> hashed_elements;
    hashed_elements.reserve(elements.size());
    for (const Element &element : elements) {
        hashed_elements.push_back(HashToRange(element));
    }
    std::sort(hashed_elements.begin(), hashed_elements.end());
    return hashed_elements;
}

GCSFilter::GCSFilter(uint64_t siphash_k0, uint64_t siphash_k1, uint8_t P,
                     uint32_t M)
    : m_siphash_k0(siphash_k0), m_siphash_k1(siphash_k1), m_P(P), m_M(M),
      m_N(0), m_F(0) {}

GCSFilter::GCSFilter(uint64_t siphash_k0, uint64_t siphash_k1, uint8_t P,
                     uint32_t M, std::vector<uint8_t> encoded_filter)
    : GCSFilter(siphash_k0, siphash_k1, P, M) {
    m_encoded = std::move(encoded_filter);

    VectorReader stream(GCS_SER_TYPE, GCS_SER_VERSION, m_encoded, 0);

    uint64_t N = ReadCompactSize(stream);
    m_N = static_cast<uint32_t>(N);
    if (m_N != N) {
        throw std::ios_base::failure("N must be <2^32");
    }
    m_F = static_cast<uint64_t>(m_N) * static_cast<uint64_t>(m_M);

    // Verify that the encoded filter contains exactly N elements. If it has too
    // much or too little data, a std::ios_base::failure exception will be
    // raised.
    BitStreamReader<VectorReader> bitreader(stream);
    for (uint64_t i = 0; i < m_N; ++i) {
        GolombRiceDecode(bitreader, m_P);
    }
    if (!stream.empty()) {
        throw std::ios_base::failure("encoded_filter contains excess data");
    }
}

GCSFilter::GCSFilter(uint64_t siphash_k0, uint64_t siphash_k1, uint8_t P,
                     uint32_t M, const ElementSet &elements)
    : GCSFilter(siphash_k0, siphash_k1, P, M) {
    size_t N = elements.size();
    m_N = static_cast<uint32_t>(N);
    if (m_N != N) {
        throw std::invalid_argument("N must be <2^32");
    }
    m_F = static_cast<uint64_t>(m_N) * static_cast<uint64_t>(m_M);

    CVectorWriter stream(GCS_SER_TYPE, GCS_SER_VERSION, m_encoded, 0);

    WriteCompactSize(stream, m_N);

    if (elements.empty()) {
        return;
    }

    BitStreamWriter<CVectorWriter> bitwriter(stream);

    uint64_t last_value = 0;
    for (uint64_t value : BuildHashedSet(elements)) {
        uint64_t delta = value - last_value;
        GolombRiceEncode(bitwriter, m_P, delta);
        last_value = value;
    }

    bitwriter.Flush();
}

bool GCSFilter::MatchInternal(const uint64_t *element_hashes,
                              size_t size) const {
    VectorReader stream(GCS_SER_TYPE, GCS_SER_VERSION, m_encoded, 0);

    // Seek forward by size of N
    uint64_t N = ReadCompactSize(stream);
    assert(N == m_N);

    BitStreamReader<VectorReader> bitreader(stream);

    uint64_t value = 0;
    size_t hashes_index = 0;
    for (uint32_t i = 0; i < m_N; ++i) {
        uint64_t delta = GolombRiceDecode(bitreader, m_P);
        value += delta;

        while (true) {
            if (hashes_index == size) {
                return false;
            } else if (element_hashes[hashes_index] == value) {
                return true;
            } else if (element_hashes[hashes_index] > value) {
                break;
            }

            hashes_index++;
        }
    }

    return false;
}

bool GCSFilter::Match(const Element &element) const {
    uint64_t query = HashToRange(element);
    return MatchInternal(&query, 1);
}

bool GCSFilter::MatchAny(const ElementSet &elements) const {
    const std::vector<uint64_t> queries = BuildHashedSet(elements);
    return MatchInternal(queries.data(), queries.size());
}
