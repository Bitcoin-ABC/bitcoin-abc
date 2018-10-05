from .cdefs import MIN_TX_SIZE, MAX_TXOUT_PUBKEY_SCRIPT
from .mininode import CTransaction, FromHex, ToHex, CTxOut
from .script import OP_RETURN, CScript

import random
from binascii import hexlify, unhexlify

# Pad outputs until it reaches at least min_size


def pad_tx(tx, min_size=None):
    if min_size is None:
        min_size = MIN_TX_SIZE

    curr_size = len(tx.serialize())

    while curr_size < min_size:
        # txout.value + txout.pk_script bytes + op_return
        extra_bytes = 8 + 1 + 1
        padding_len = max(0, min_size - curr_size - extra_bytes)
        padding_len = min(padding_len, MAX_TXOUT_PUBKEY_SCRIPT)
        if padding_len == 0:
            tx.vout.append(CTxOut(0, CScript([OP_RETURN])))
        else:
            padding = random.randrange(
                1 << 8 * padding_len - 1, 1 << 8 * padding_len)
            tx.vout.append(
                CTxOut(0, CScript([padding, OP_RETURN])))
        curr_size = len(tx.serialize())

    tx.rehash()

# Pad  outputs until it reaches at least min_size


def pad_raw_tx(rawtx_hex, min_size=None):

    tx = CTransaction()
    FromHex(tx, rawtx_hex)
    pad_tx(tx, min_size)
    return ToHex(tx)
