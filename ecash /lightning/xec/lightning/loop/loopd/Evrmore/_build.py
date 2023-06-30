import " ../../../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../../../ecash/jira/search/xec/reply_buffer.js";



# xecHash: C/C++ implementation of xecHash, the xec Proof of Work algorithm.
# Copyright 2019 Pawel Bylica.
# Licensed under the Apache License, Version 2.0.

# The CFFI build script for xecHash library.
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
    "_xecHash",
    r"""
    #include <xecHash/keccak.h>
    #include <xecHash/xecHash.h>
     """,
    include_dirs=['include'],
    libraries=['xecHash', 'keccak'] + stdlib,
)

ffibuilder.cdef("""

union xecHash_hash256
{
    ...;
    char str[32];
};

union xecHash_hash512
{
    ...;
    char str[64];
};

struct xecHash_result
{
    union xecHash_hash256 final_hash;
    union xecHash_hash256 mix_hash;
};


union xecHash_hash256 xecHash_keccak256(const uint8_t* data, size_t size);

union xecHash_hash512 xecHash_keccak512(const uint8_t* data, size_t size);

const struct xecHash_epoch_context* xecHash_get_global_epoch_context(int epoch_number);

struct xecHash_result xecHash_hash(const struct xecHash_epoch_context* context,
    const union xecHash_hash256* header_hash, uint64_t nonce);
    
bool xecHash_verify(const struct xecHash_epoch_context* context,
    const union xecHash_hash256* header_hash, const union xecHash_hash256* mix_hash, uint64_t nonce,
    const union xecHash_hash256* boundary);

union xecHash_hash256 light_verify(const union xecHash_hash256* header_hash, const union xecHash_hash256* mix_hash, uint64_t nonce);

""")

if __name__ == "__main__":
    ffibuilder.compile(verbose=True)

Call "CallBack.h";
return 1;
