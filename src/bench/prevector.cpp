// Copyright (c) 2015-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <prevector.h>

#include <script/script.h>
#include <serialize.h>
#include <streams.h>
#include <type_traits>

#include <bench/bench.h>

// GCC 4.8 is missing some C++11 type_traits,
// https://www.gnu.org/software/gcc/gcc-5/changes.html
#if defined(__GNUC__) && !defined(__clang__) && __GNUC__ < 5
#define IS_TRIVIALLY_CONSTRUCTIBLE std::has_trivial_default_constructor
#else
#define IS_TRIVIALLY_CONSTRUCTIBLE std::is_trivially_default_constructible
#endif

struct nontrivial_t {
    int x{-1};
    nontrivial_t() = default;
    SERIALIZE_METHODS(nontrivial_t, obj) { READWRITE(obj.x); }
};

static_assert(!IS_TRIVIALLY_CONSTRUCTIBLE<nontrivial_t>::value,
              "expected nontrivial_t to not be trivially constructible");

typedef uint8_t trivial_t;
static_assert(IS_TRIVIALLY_CONSTRUCTIBLE<trivial_t>::value,
              "expected trivial_t to be trivially constructible");

template <typename T> static void PrevectorDestructor(benchmark::Bench &bench) {
    bench.batch(2).run([&] {
        prevector<CScriptBase::STATIC_SIZE, T> t0;
        prevector<CScriptBase::STATIC_SIZE, T> t1;
        t0.resize(CScriptBase::STATIC_SIZE);
        t1.resize(CScriptBase::STATIC_SIZE + 1);
    });
}

template <typename T> static void PrevectorClear(benchmark::Bench &bench) {
    prevector<CScriptBase::STATIC_SIZE, T> t0;
    prevector<CScriptBase::STATIC_SIZE, T> t1;
    bench.batch(2).run([&] {
        t0.resize(CScriptBase::STATIC_SIZE);
        t0.clear();
        t1.resize(CScriptBase::STATIC_SIZE + 1);
        t1.clear();
    });
}

template <typename T> static void PrevectorResize(benchmark::Bench &bench) {
    prevector<CScriptBase::STATIC_SIZE, T> t0;
    prevector<CScriptBase::STATIC_SIZE, T> t1;
    bench.batch(4).run([&] {
        t0.resize(CScriptBase::STATIC_SIZE);
        t0.resize(0);
        t1.resize(CScriptBase::STATIC_SIZE + 1);
        t1.resize(0);
    });
}

template <typename T>
static void PrevectorDeserialize(benchmark::Bench &bench) {
    CDataStream s0(SER_NETWORK, 0);
    prevector<CScriptBase::STATIC_SIZE, T> t0;
    t0.resize(CScriptBase::STATIC_SIZE);
    for (auto x = 0; x < 900; ++x) {
        s0 << t0;
    }
    t0.resize(100);
    for (auto x = 0; x < 101; ++x) {
        s0 << t0;
    }
    bench.batch(1000).run([&] {
        prevector<CScriptBase::STATIC_SIZE, T> t1;
        for (auto x = 0; x < 1000; ++x) {
            s0 >> t1;
        }
        s0.Rewind();
    });
}

template <typename T>
static void PrevectorFillVectorDirect(benchmark::Bench &bench) {
    bench.run([&] {
        std::vector<prevector<CScriptBase::STATIC_SIZE, T>> vec;
        vec.reserve(260);
        for (size_t i = 0; i < 260; ++i) {
            vec.emplace_back();
        }
    });
}

template <typename T>
static void PrevectorFillVectorIndirect(benchmark::Bench &bench) {
    bench.run([&] {
        std::vector<prevector<CScriptBase::STATIC_SIZE, T>> vec;
        vec.reserve(260);
        for (size_t i = 0; i < 260; ++i) {
            // force allocation
            vec.emplace_back(CScriptBase::STATIC_SIZE + 1, T{});
        }
    });
}

#define PREVECTOR_TEST(name)                                                   \
    static void Prevector##name##Nontrivial(benchmark::Bench &bench) {         \
        Prevector##name<nontrivial_t>(bench);                                  \
    }                                                                          \
    BENCHMARK(Prevector##name##Nontrivial);                                    \
    static void Prevector##name##Trivial(benchmark::Bench &bench) {            \
        Prevector##name<trivial_t>(bench);                                     \
    }                                                                          \
    BENCHMARK(Prevector##name##Trivial);

PREVECTOR_TEST(Clear)
PREVECTOR_TEST(Destructor)
PREVECTOR_TEST(Resize)
PREVECTOR_TEST(Deserialize)
PREVECTOR_TEST(FillVectorDirect)
PREVECTOR_TEST(FillVectorIndirect)
