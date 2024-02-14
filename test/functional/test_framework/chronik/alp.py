# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from typing import List

from test_framework.messages import CTxOut
from test_framework.script import OP_RESERVED, OP_RETURN, CScript

# ALP integers are encoded as 48-bit little-endian integers
ALP_INT_SIZE = 6


def alp_opreturn(*sections: bytes) -> CTxOut:
    return CTxOut(0, CScript([OP_RETURN, OP_RESERVED] + list(sections)))


def extend_var_bytes(target: bytearray, b: bytes):
    target.append(len(b))
    target.extend(b)


def alp_genesis(
    *,
    token_ticker: bytes = b"",
    token_name: bytes = b"",
    url: bytes = b"",
    data: bytes = b"",
    auth_pubkey: bytes = b"",
    decimals: int = 0,
    mint_amounts: List[int],
    num_batons: int,
) -> bytes:
    result = bytearray()
    result.extend(b"SLP2")
    result.append(0)

    extend_var_bytes(result, b"GENESIS")
    extend_var_bytes(result, token_ticker)
    extend_var_bytes(result, token_name)
    extend_var_bytes(result, url)
    extend_var_bytes(result, data)
    extend_var_bytes(result, auth_pubkey)

    result.append(decimals)

    result.append(len(mint_amounts))
    for amount in mint_amounts:
        result.extend(amount.to_bytes(ALP_INT_SIZE, "little"))

    result.append(num_batons)
    return result


def alp_mint(
    token_id: str,
    mint_amounts: List[int],
    num_batons: int,
) -> bytes:
    result = bytearray()
    result.extend(b"SLP2")
    result.append(0)

    extend_var_bytes(result, b"MINT")

    result.extend(bytes.fromhex(token_id)[::-1])

    result.append(len(mint_amounts))
    for amount in mint_amounts:
        result.extend(amount.to_bytes(ALP_INT_SIZE, "little"))

    result.append(num_batons)

    return result


def alp_send(
    token_id: str,
    output_amounts: List[int],
) -> bytes:
    result = bytearray()
    result.extend(b"SLP2")
    result.append(0)

    extend_var_bytes(result, b"SEND")

    result.extend(bytes.fromhex(token_id)[::-1])

    result.append(len(output_amounts))
    for amount in output_amounts:
        result.extend(amount.to_bytes(ALP_INT_SIZE, "little"))

    return result


def alp_burn(
    token_id: str,
    burn_amount: int,
) -> bytes:
    result = bytearray()
    result.extend(b"SLP2")
    result.append(0)

    extend_var_bytes(result, b"BURN")

    result.extend(bytes.fromhex(token_id)[::-1])
    result.extend(burn_amount.to_bytes(ALP_INT_SIZE, "little"))

    return result
