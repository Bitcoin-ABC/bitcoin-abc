// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_FUZZ_UTIL_H
#define BITCOIN_TEST_FUZZ_UTIL_H

#include <arith_uint256.h>
#include <chainparamsbase.h>
#include <coins.h>
#include <consensus/amount.h>
#include <net.h>
#include <netbase.h>
#include <script/script.h>
#include <script/standard.h>
#include <serialize.h>
#include <streams.h>
#include <uint256.h>
#include <util/vector.h>
#include <version.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/util/setup_common.h>

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <optional>
#include <string>
#include <vector>

namespace fuzzer {
// FIXME find a better way to avoid duplicating the MAX_MONEY definition
constexpr int64_t MAX_MONEY_AS_INT = int64_t(21000000) * int64_t(100000000);
} // end namespace fuzzer

using namespace fuzzer;

[[nodiscard]] inline std::vector<uint8_t>
ConsumeRandomLengthByteVector(FuzzedDataProvider &fuzzed_data_provider,
                              const size_t max_length = 4096) noexcept {
    const std::string s =
        fuzzed_data_provider.ConsumeRandomLengthString(max_length);
    return {s.begin(), s.end()};
}

[[nodiscard]] inline CDataStream
ConsumeDataStream(FuzzedDataProvider &fuzzed_data_provider,
                  const size_t max_length = 4096) noexcept {
    return CDataStream{
        ConsumeRandomLengthByteVector(fuzzed_data_provider, max_length),
        SER_NETWORK, INIT_PROTO_VERSION};
}

[[nodiscard]] inline std::vector<std::string>
ConsumeRandomLengthStringVector(FuzzedDataProvider &fuzzed_data_provider,
                                const size_t max_vector_size = 16,
                                const size_t max_string_length = 16) noexcept {
    const size_t n_elements =
        fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, max_vector_size);
    std::vector<std::string> r;
    for (size_t i = 0; i < n_elements; ++i) {
        r.push_back(
            fuzzed_data_provider.ConsumeRandomLengthString(max_string_length));
    }
    return r;
}

template <typename T>
[[nodiscard]] inline std::vector<T>
ConsumeRandomLengthIntegralVector(FuzzedDataProvider &fuzzed_data_provider,
                                  const size_t max_vector_size = 16) noexcept {
    const size_t n_elements =
        fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, max_vector_size);
    std::vector<T> r;
    for (size_t i = 0; i < n_elements; ++i) {
        r.push_back(fuzzed_data_provider.ConsumeIntegral<T>());
    }
    return r;
}

template <typename T>
[[nodiscard]] inline std::optional<T>
ConsumeDeserializable(FuzzedDataProvider &fuzzed_data_provider,
                      const size_t max_length = 4096) noexcept {
    const std::vector<uint8_t> buffer =
        ConsumeRandomLengthByteVector(fuzzed_data_provider, max_length);
    CDataStream ds{buffer, SER_NETWORK, INIT_PROTO_VERSION};
    T obj;
    try {
        ds >> obj;
    } catch (const std::ios_base::failure &) {
        return std::nullopt;
    }
    return obj;
}

[[nodiscard]] inline opcodetype
ConsumeOpcodeType(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return static_cast<opcodetype>(
        fuzzed_data_provider.ConsumeIntegralInRange<uint32_t>(0, MAX_OPCODE));
}

[[nodiscard]] inline Amount
ConsumeMoney(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(
               0, MAX_MONEY_AS_INT) *
           SATOSHI;
}

[[nodiscard]] inline CScript
ConsumeScript(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> b =
        ConsumeRandomLengthByteVector(fuzzed_data_provider);
    return {b.begin(), b.end()};
}

[[nodiscard]] inline CScriptNum
ConsumeScriptNum(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return CScriptNum{fuzzed_data_provider.ConsumeIntegral<int64_t>()};
}

[[nodiscard]] inline uint160
ConsumeUInt160(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> v160 =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(160 / 8);
    if (v160.size() != 160 / 8) {
        return {};
    }
    return uint160{v160};
}

[[nodiscard]] inline uint256
ConsumeUInt256(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> v256 =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(256 / 8);
    if (v256.size() != 256 / 8) {
        return {};
    }
    return uint256{v256};
}

[[nodiscard]] inline arith_uint256
ConsumeArithUInt256(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return UintToArith256(ConsumeUInt256(fuzzed_data_provider));
}

[[nodiscard]] inline CTxDestination
ConsumeTxDestination(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    CTxDestination tx_destination;
    switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 3)) {
        case 0: {
            tx_destination = CNoDestination{};
            break;
        }
        case 1: {
            tx_destination = PKHash{ConsumeUInt160(fuzzed_data_provider)};
            break;
        }
        case 2: {
            tx_destination = ScriptHash{ConsumeUInt160(fuzzed_data_provider)};
            break;
        }
    }
    return tx_destination;
}

template <typename T>
[[nodiscard]] bool MultiplicationOverflow(const T i, const T j) noexcept {
    static_assert(std::is_integral<T>::value, "Integral required.");
    if (std::numeric_limits<T>::is_signed) {
        if (i > 0) {
            if (j > 0) {
                return i > (std::numeric_limits<T>::max() / j);
            } else {
                return j < (std::numeric_limits<T>::min() / i);
            }
        } else {
            if (j > 0) {
                return i < (std::numeric_limits<T>::min() / j);
            } else {
                return i != 0 && (j < (std::numeric_limits<T>::max() / i));
            }
        }
    } else {
        return j != 0 && i > std::numeric_limits<T>::max() / j;
    }
}

template <class T>
[[nodiscard]] bool AdditionOverflow(const T i, const T j) noexcept {
    static_assert(std::is_integral<T>::value, "Integral required.");
    if (std::numeric_limits<T>::is_signed) {
        return (i > 0 && j > std::numeric_limits<T>::max() - i) ||
               (i < 0 && j < std::numeric_limits<T>::min() - i);
    }
    return std::numeric_limits<T>::max() - i < j;
}

[[nodiscard]] inline bool
ContainsSpentInput(const CTransaction &tx,
                   const CCoinsViewCache &inputs) noexcept {
    for (const CTxIn &tx_in : tx.vin) {
        const Coin &coin = inputs.AccessCoin(tx_in.prevout);
        if (coin.IsSpent()) {
            return true;
        }
    }
    return false;
}

/**
 * Returns a byte vector of specified size regardless of the number of remaining
 * bytes available from the fuzzer. Pads with zero value bytes if needed to
 * achieve the specified size.
 */
[[nodiscard]] inline std::vector<uint8_t>
ConsumeFixedLengthByteVector(FuzzedDataProvider &fuzzed_data_provider,
                             const size_t length) noexcept {
    std::vector<uint8_t> result(length);
    const std::vector<uint8_t> random_bytes =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(length);
    if (!random_bytes.empty()) {
        std::memcpy(result.data(), random_bytes.data(), random_bytes.size());
    }
    return result;
}

CNetAddr ConsumeNetAddr(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const Network network = fuzzed_data_provider.PickValueInArray(
        {Network::NET_IPV4, Network::NET_IPV6, Network::NET_INTERNAL,
         Network::NET_ONION});
    CNetAddr net_addr;
    if (network == Network::NET_IPV4) {
        const in_addr v4_addr = {
            .s_addr = fuzzed_data_provider.ConsumeIntegral<uint32_t>()};
        net_addr = CNetAddr{v4_addr};
    } else if (network == Network::NET_IPV6) {
        if (fuzzed_data_provider.remaining_bytes() >= 16) {
            in6_addr v6_addr = {};
            memcpy(v6_addr.s6_addr,
                   fuzzed_data_provider.ConsumeBytes<uint8_t>(16).data(), 16);
            net_addr = CNetAddr{
                v6_addr, fuzzed_data_provider.ConsumeIntegral<uint32_t>()};
        }
    } else if (network == Network::NET_INTERNAL) {
        net_addr.SetInternal(fuzzed_data_provider.ConsumeBytesAsString(32));
    } else if (network == Network::NET_ONION) {
        net_addr.SetSpecial(fuzzed_data_provider.ConsumeBytesAsString(32));
    }
    return net_addr;
}

CSubNet ConsumeSubNet(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeNetAddr(fuzzed_data_provider),
            fuzzed_data_provider.ConsumeIntegral<uint8_t>()};
}

CService ConsumeService(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeNetAddr(fuzzed_data_provider),
            fuzzed_data_provider.ConsumeIntegral<uint16_t>()};
}

CAddress ConsumeAddress(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeService(fuzzed_data_provider),
            static_cast<ServiceFlags>(
                fuzzed_data_provider.ConsumeIntegral<uint64_t>()),
            fuzzed_data_provider.ConsumeIntegral<uint32_t>()};
}

CNode ConsumeNode(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const NodeId node_id = fuzzed_data_provider.ConsumeIntegral<NodeId>();
    const SOCKET socket = INVALID_SOCKET;
    const CAddress address = ConsumeAddress(fuzzed_data_provider);
    const uint64_t keyed_net_group =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const uint64_t local_host_nonce =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const uint64_t local_extra_entropy =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const CAddress addr_bind = ConsumeAddress(fuzzed_data_provider);
    const std::string addr_name =
        fuzzed_data_provider.ConsumeRandomLengthString(64);
    const ConnectionType conn_type = fuzzed_data_provider.PickValueInArray(
        {ConnectionType::INBOUND, ConnectionType::OUTBOUND_FULL_RELAY,
         ConnectionType::MANUAL, ConnectionType::FEELER,
         ConnectionType::BLOCK_RELAY, ConnectionType::ADDR_FETCH});
    const bool inbound_onion = fuzzed_data_provider.ConsumeBool();
    return {node_id,         socket,           address,
            keyed_net_group, local_host_nonce, local_extra_entropy,
            addr_bind,       addr_name,        conn_type,
            inbound_onion};
}

template <class T = const BasicTestingSetup>
std::unique_ptr<T>
MakeFuzzingContext(const std::string &chain_name = CBaseChainParams::REGTEST,
                   const std::vector<const char *> &extra_args = {}) {
    // Prepend default arguments for fuzzing
    const std::vector<const char *> arguments = Cat(
        {
            "-nodebuglogfile",
        },
        extra_args);

    return std::make_unique<T>(chain_name, arguments);
}

class FuzzedFileProvider {
    FuzzedDataProvider &m_fuzzed_data_provider;
    int64_t m_offset = 0;

public:
    FuzzedFileProvider(FuzzedDataProvider &fuzzed_data_provider)
        : m_fuzzed_data_provider{fuzzed_data_provider} {}

    FILE *open() {
        if (m_fuzzed_data_provider.ConsumeBool()) {
            return nullptr;
        }
        std::string mode;
        switch (m_fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 5)) {
            case 0: {
                mode = "r";
                break;
            }
            case 1: {
                mode = "r+";
                break;
            }
            case 2: {
                mode = "w";
                break;
            }
            case 3: {
                mode = "w+";
                break;
            }
            case 4: {
                mode = "a";
                break;
            }
            case 5: {
                mode = "a+";
                break;
            }
        }
#ifdef _GNU_SOURCE
        const cookie_io_functions_t io_hooks = {
            FuzzedFileProvider::read,
            FuzzedFileProvider::write,
            FuzzedFileProvider::seek,
            FuzzedFileProvider::close,
        };
        return fopencookie(this, mode.c_str(), io_hooks);
#else
        (void)mode;
        return nullptr;
#endif
    }

    static ssize_t read(void *cookie, char *buf, size_t size) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        if (buf == nullptr || size == 0 ||
            fuzzed_file->m_fuzzed_data_provider.ConsumeBool()) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        const std::vector<uint8_t> random_bytes =
            fuzzed_file->m_fuzzed_data_provider.ConsumeBytes<uint8_t>(size);
        if (random_bytes.empty()) {
            return 0;
        }
        std::memcpy(buf, random_bytes.data(), random_bytes.size());
        if (AdditionOverflow(fuzzed_file->m_offset,
                             int64_t(random_bytes.size()))) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        fuzzed_file->m_offset += random_bytes.size();
        return random_bytes.size();
    }

    static ssize_t write(void *cookie, const char *buf, size_t size) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        const ssize_t n =
            fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<ssize_t>(
                0, size);
        if (AdditionOverflow(fuzzed_file->m_offset, int64_t(n))) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        fuzzed_file->m_offset += n;
        return n;
    }

    static int seek(void *cookie, int64_t *offset, int whence) {
        // SEEK_END not implemented yet.
        assert(whence == SEEK_SET || whence == SEEK_CUR);
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        int64_t new_offset = 0;
        if (whence == SEEK_SET) {
            new_offset = *offset;
        } else if (whence == SEEK_CUR) {
            if (AdditionOverflow(fuzzed_file->m_offset, *offset)) {
                return -1;
            }
            new_offset = fuzzed_file->m_offset + *offset;
        }
        if (new_offset < 0) {
            return -1;
        }
        fuzzed_file->m_offset = new_offset;
        *offset = new_offset;
        return fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<int>(
            -1, 0);
    }

    static int close(void *cookie) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        return fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<int>(
            -1, 0);
    }
};

[[nodiscard]] inline FuzzedFileProvider
ConsumeFile(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {fuzzed_data_provider};
}

class FuzzedAutoFileProvider {
    FuzzedFileProvider m_fuzzed_file_provider;

public:
    FuzzedAutoFileProvider(FuzzedDataProvider &fuzzed_data_provider)
        : m_fuzzed_file_provider{fuzzed_data_provider} {}

    AutoFile open() { return AutoFile{m_fuzzed_file_provider.open()}; }
};

[[nodiscard]] inline FuzzedAutoFileProvider
ConsumeAutoFile(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {fuzzed_data_provider};
}

#define WRITE_TO_STREAM_CASE(id, type, consume)                                \
    case id: {                                                                 \
        type o = consume;                                                      \
        stream << o;                                                           \
        break;                                                                 \
    }
template <typename Stream>
void WriteToStream(FuzzedDataProvider &fuzzed_data_provider,
                   Stream &stream) noexcept {
    while (fuzzed_data_provider.ConsumeBool()) {
        try {
            switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 13)) {
                WRITE_TO_STREAM_CASE(0, bool,
                                     fuzzed_data_provider.ConsumeBool())
                WRITE_TO_STREAM_CASE(
                    1, char, fuzzed_data_provider.ConsumeIntegral<char>())
                WRITE_TO_STREAM_CASE(
                    2, int8_t, fuzzed_data_provider.ConsumeIntegral<int8_t>())
                WRITE_TO_STREAM_CASE(
                    3, uint8_t, fuzzed_data_provider.ConsumeIntegral<uint8_t>())
                WRITE_TO_STREAM_CASE(
                    4, int16_t, fuzzed_data_provider.ConsumeIntegral<int16_t>())
                WRITE_TO_STREAM_CASE(
                    5, uint16_t,
                    fuzzed_data_provider.ConsumeIntegral<uint16_t>())
                WRITE_TO_STREAM_CASE(
                    6, int32_t, fuzzed_data_provider.ConsumeIntegral<int32_t>())
                WRITE_TO_STREAM_CASE(
                    7, uint32_t,
                    fuzzed_data_provider.ConsumeIntegral<uint32_t>())
                WRITE_TO_STREAM_CASE(
                    8, int64_t, fuzzed_data_provider.ConsumeIntegral<int64_t>())
                WRITE_TO_STREAM_CASE(
                    9, uint64_t,
                    fuzzed_data_provider.ConsumeIntegral<uint64_t>())
                WRITE_TO_STREAM_CASE(
                    10, float,
                    fuzzed_data_provider.ConsumeFloatingPoint<float>())
                WRITE_TO_STREAM_CASE(
                    11, double,
                    fuzzed_data_provider.ConsumeFloatingPoint<double>())
                WRITE_TO_STREAM_CASE(
                    12, std::string,
                    fuzzed_data_provider.ConsumeRandomLengthString(32))
                WRITE_TO_STREAM_CASE(13, std::vector<char>,
                                     ConsumeRandomLengthIntegralVector<char>(
                                         fuzzed_data_provider))
            }
        } catch (const std::ios_base::failure &) {
            break;
        }
    }
}

#define READ_FROM_STREAM_CASE(id, type)                                        \
    case id: {                                                                 \
        type o;                                                                \
        stream >> o;                                                           \
        break;                                                                 \
    }
template <typename Stream>
void ReadFromStream(FuzzedDataProvider &fuzzed_data_provider,
                    Stream &stream) noexcept {
    while (fuzzed_data_provider.ConsumeBool()) {
        try {
            switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 13)) {
                READ_FROM_STREAM_CASE(0, bool)
                READ_FROM_STREAM_CASE(1, char)
                READ_FROM_STREAM_CASE(2, int8_t)
                READ_FROM_STREAM_CASE(3, uint8_t)
                READ_FROM_STREAM_CASE(4, int16_t)
                READ_FROM_STREAM_CASE(5, uint16_t)
                READ_FROM_STREAM_CASE(6, int32_t)
                READ_FROM_STREAM_CASE(7, uint32_t)
                READ_FROM_STREAM_CASE(8, int64_t)
                READ_FROM_STREAM_CASE(9, uint64_t)
                READ_FROM_STREAM_CASE(10, float)
                READ_FROM_STREAM_CASE(11, double)
                READ_FROM_STREAM_CASE(12, std::string)
                READ_FROM_STREAM_CASE(13, std::vector<char>)
            }
        } catch (const std::ios_base::failure &) {
            break;
        }
    }
}

#endif // BITCOIN_TEST_FUZZ_UTIL_H
