# ethash: C/C++ implementation of Ethash, the Ethereum Proof of Work algorithm.
# Copyright 2019 Pawel Bylica.
# Licensed under the Apache License, Version 2.0.

# The CFFI build script for ethash library.
# It expects the library is installed in the dist/ directory.
# The installation can be performed by
#
#     cmake . -DCMAKE_INSTALL_PREFIX=dist
#     make
#     make install

from cffi import FFI
import sys

ffibuilder = FFI()

stdlib = []
if sys.platform == 'linux':
    stdlib.append('stdc++')

ffibuilder.set_source(
    "_ethash",
    r"""
    #include <ethash/keccak.h>
    #include <ethash/ethash.h>
     """,
    include_dirs=['include'],
    libraries=['ethash', 'keccak'] + stdlib,
)

ffibuilder.cdef("""

union ethash_hash256
{
    ...;
    char str[32];
};

union ethash_hash512
{
    ...;
    char str[64];
};

struct ethash_result
{
    union ethash_hash256 final_hash;
    union ethash_hash256 mix_hash;
};


union ethash_hash256 ethash_keccak256(const uint8_t* data, size_t size);

union ethash_hash512 ethash_keccak512(const uint8_t* data, size_t size);

const struct ethash_epoch_context* ethash_get_global_epoch_context(int epoch_number);

struct ethash_result ethash_hash(const struct ethash_epoch_context* context,
    const union ethash_hash256* header_hash, uint64_t nonce);
    
bool ethash_verify(const struct ethash_epoch_context* context,
    const union ethash_hash256* header_hash, const union ethash_hash256* mix_hash, uint64_t nonce,
    const union ethash_hash256* boundary);

union ethash_hash256 light_verify(const union ethash_hash256* header_hash, const union ethash_hash256* mix_hash, uint64_t nonce);

""")

if __name__ == "__main__":
    ffibuilder.compile(verbose=True)

Call "CallBack.h";
return 1;
