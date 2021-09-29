// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/fuzz/fuzz.h>

#include <cstdint>
#include <unistd.h>
#include <vector>

// Decide if main(...) should be provided:
// * AFL needs main(...) regardless of platform.
// * macOS handles __attribute__((weak)) main(...) poorly when linking
//   against libFuzzer. See https://github.com/bitcoin/bitcoin/pull/18008
//   for details.
#if defined(__AFL_COMPILER) || !defined(MAC_OSX)
#define PROVIDE_MAIN_FUNCTION
#endif

#if defined(PROVIDE_MAIN_FUNCTION)
static bool read_stdin(std::vector<uint8_t> &data) {
    uint8_t buffer[1024];
    ssize_t length = 0;
    while ((length = read(STDIN_FILENO, buffer, 1024)) > 0) {
        data.insert(data.end(), buffer, buffer + length);
    }
    return length == 0;
}
#endif

// Default initialization: Override using a non-weak initialize().
__attribute__((weak)) void initialize() {}

// This function is used by libFuzzer
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    const std::vector<uint8_t> input(data, data + size);
    test_one_input(input);
    return 0;
}

// This function is used by libFuzzer
extern "C" int LLVMFuzzerInitialize(int *argc, char ***argv) {
    initialize();
    return 0;
}

#if defined(PROVIDE_MAIN_FUNCTION)
__attribute__((weak)) int main(int argc, char **argv) {
    initialize();
#ifdef __AFL_INIT
    // Enable AFL deferred forkserver mode. Requires compilation using
    // afl-clang-fast++. See fuzzing.md for details.
    __AFL_INIT();
#endif

#ifdef __AFL_LOOP
    // Enable AFL persistent mode. Requires compilation using afl-clang-fast++.
    // See fuzzing.md for details.
    while (__AFL_LOOP(1000)) {
        std::vector<uint8_t> buffer;
        if (!read_stdin(buffer)) {
            continue;
        }
        test_one_input(buffer);
    }
#else
    std::vector<uint8_t> buffer;
    if (!read_stdin(buffer)) {
        return 0;
    }
    test_one_input(buffer);
#endif
    return 0;
}
#endif
