# -*- coding: utf-8 -*-
# -*- mode: python3 -*-
"""
secp256k1 - Maintain a single global secp256k1 context. ecc_fast.py and
schnorr.py make use of this context to do fast ECDSA signing or Schnorr signing,
respectively.
"""
import ctypes
import os
import sys
from ctypes import POINTER, c_char_p, c_int, c_size_t, c_uint, c_void_p

from .printerror import print_stderr

SECP256K1_FLAGS_TYPE_MASK = (1 << 8) - 1
SECP256K1_FLAGS_TYPE_CONTEXT = 1 << 0
SECP256K1_FLAGS_TYPE_COMPRESSION = 1 << 1
# /** The higher bits contain the actual data. Do not use directly. */
SECP256K1_FLAGS_BIT_CONTEXT_VERIFY = 1 << 8
SECP256K1_FLAGS_BIT_CONTEXT_SIGN = 1 << 9
SECP256K1_FLAGS_BIT_COMPRESSION = 1 << 8

# /** Flags to pass to secp256k1_context_create. */
SECP256K1_CONTEXT_VERIFY = (
    SECP256K1_FLAGS_TYPE_CONTEXT | SECP256K1_FLAGS_BIT_CONTEXT_VERIFY
)
SECP256K1_CONTEXT_SIGN = SECP256K1_FLAGS_TYPE_CONTEXT | SECP256K1_FLAGS_BIT_CONTEXT_SIGN
SECP256K1_CONTEXT_NONE = SECP256K1_FLAGS_TYPE_CONTEXT

SECP256K1_EC_COMPRESSED = (
    SECP256K1_FLAGS_TYPE_COMPRESSION | SECP256K1_FLAGS_BIT_COMPRESSION
)
SECP256K1_EC_UNCOMPRESSED = SECP256K1_FLAGS_TYPE_COMPRESSION


def _load_library():
    if sys.platform == "darwin":
        # on Mac it's in the pyinstaller top level folder, which is in libpath
        library_paths = (
            "libsecp256k1.0.dylib",
            # fall back to "running from source" mode
            os.path.join(os.path.dirname(__file__), "libsecp256k1.0.dylib"),
        )
    elif sys.platform in ("windows", "win32"):
        # on Windows it's in the pyinstaller top level folder, which is in the path
        library_paths = (
            "libsecp256k1-0.dll",
            # fall back to "running from source" mode
            os.path.join(os.path.dirname(__file__), "libsecp256k1-0.dll"),
        )
    else:
        # on linux we install it alongside the python scripts.
        library_paths = (
            os.path.join(os.path.dirname(__file__), "libsecp256k1.so.0"),
            # fall back to system lib, if any
            "libsecp256k1.so.0",
        )

    secp256k1 = None
    secp256k1_exceptions = {}
    for lp in library_paths:
        try:
            secp256k1 = ctypes.cdll.LoadLibrary(lp)
        except Exception as e:
            secp256k1_exceptions[lp] = e
            continue
        if secp256k1:
            break
    if not secp256k1:
        print_stderr("[secp256k1] warning: libsecp256k1 library failed to load")
        for path, exception in secp256k1_exceptions.items():
            print_stderr(
                f"[secp256k1] warning: loading from {path} failed with: {exception}"
            )
        return None

    try:
        secp256k1.secp256k1_context_create.argtypes = [c_uint]
        secp256k1.secp256k1_context_create.restype = c_void_p

        secp256k1.secp256k1_context_randomize.argtypes = [c_void_p, c_char_p]
        secp256k1.secp256k1_context_randomize.restype = c_int

        secp256k1.secp256k1_ec_pubkey_create.argtypes = [c_void_p, c_void_p, c_char_p]
        secp256k1.secp256k1_ec_pubkey_create.restype = c_int

        secp256k1.secp256k1_ecdsa_sign.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
            c_char_p,
            c_void_p,
            c_void_p,
        ]
        secp256k1.secp256k1_ecdsa_sign.restype = c_int

        secp256k1.secp256k1_ecdsa_verify.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
            c_char_p,
        ]
        secp256k1.secp256k1_ecdsa_verify.restype = c_int

        secp256k1.secp256k1_ec_pubkey_parse.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
            c_size_t,
        ]
        secp256k1.secp256k1_ec_pubkey_parse.restype = c_int

        secp256k1.secp256k1_ec_pubkey_serialize.argtypes = [
            c_void_p,
            c_char_p,
            c_void_p,
            c_char_p,
            c_uint,
        ]
        secp256k1.secp256k1_ec_pubkey_serialize.restype = c_int

        secp256k1.secp256k1_ecdsa_signature_parse_compact.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
        ]
        secp256k1.secp256k1_ecdsa_signature_parse_compact.restype = c_int

        secp256k1.secp256k1_ecdsa_signature_normalize.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
        ]
        secp256k1.secp256k1_ecdsa_signature_normalize.restype = c_int

        secp256k1.secp256k1_ecdsa_signature_serialize_compact.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
        ]
        secp256k1.secp256k1_ecdsa_signature_serialize_compact.restype = c_int

        secp256k1.secp256k1_ec_pubkey_tweak_mul.argtypes = [
            c_void_p,
            c_char_p,
            c_char_p,
        ]
        secp256k1.secp256k1_ec_pubkey_tweak_mul.restype = c_int

        secp256k1.secp256k1_ec_pubkey_combine.argtypes = [
            c_void_p,
            c_void_p,
            POINTER(c_void_p),
            c_size_t,
        ]
        secp256k1.secp256k1_ec_pubkey_combine.restype = c_int

        secp256k1.ctx = secp256k1.secp256k1_context_create(
            SECP256K1_CONTEXT_SIGN | SECP256K1_CONTEXT_VERIFY
        )
        r = secp256k1.secp256k1_context_randomize(secp256k1.ctx, os.urandom(32))
        if r:
            return secp256k1
        else:
            print_stderr("[secp256k1] warning: secp256k1_context_randomize failed")
            return None
    except (OSError, AttributeError):
        print_stderr(
            "[secp256k1] warning: libsecp256k1 library was found and loaded but there"
            " was an error when using it"
        )
        return None


try:
    secp256k1 = _load_library()
except Exception:
    secp256k1 = None
