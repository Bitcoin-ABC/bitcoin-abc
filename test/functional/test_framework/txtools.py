#!/usr/bin/env python3
import random
import sys
import unittest

from .cdefs import MIN_TX_SIZE
from .messages import CTransaction, CTxOut, FromHex, ToHex
from .script import OP_RETURN, CScript

MAX_OP_RETURN_PAYLOAD = 220
VOUT_VALUE_SIZE = 8


def get_random_bytes(size: int) -> bytes:
    if sys.version_info >= (3, 9, 0):
        return random.randbytes(size)
    # slower workaround
    if not size:
        return b''
    return bytes.fromhex(f"{random.randrange(2**(8*size)):0{2*size}x}")


def pad_tx(tx: CTransaction, pad_to_size: int = MIN_TX_SIZE):
    """
    Pad a transaction with op_return junk data until it is at least pad_to_size,
    or leave it alone if it's already bigger than that.

    This function attempts to make the tx to be exactly of size pad_to_size.

    There is one case in which this is not possible: when the requested size
    is less than the current size plus the minimum vout overhead of 10 bytes.
    To get an exact size, make you sure you pad to a size of at least 10 more
    bytes than the input transaction.
    """
    curr_size = len(tx.serialize())
    required_padding = pad_to_size - curr_size

    while required_padding > 0:
        if required_padding <= 10:
            # Smallest possible padding with an empty OP_RETURN vout:
            #     vout.value (8 bytes) + script length (1) + OP_RETURN (1)
            tx.vout.append(CTxOut(0, CScript([OP_RETURN])))
            break

        # The total padding size, for a payload < 0x4c, is:
        #     vout.value (8 bytes) + script_length (1) + OP_RETURN (1) +
        #     + data length (1) + data
        data_size = required_padding - VOUT_VALUE_SIZE - 3
        was_op_pushdata1_used = True

        script_operations = []
        if data_size <= 0x4c:
            was_op_pushdata1_used = False
            if data_size == 0x4c:
                # Adding one more byte to the data causes two more bytes to be
                # added to the tx size, because of the need for OP_PUSHDATA1.
                # So remove 10 bytes to add an empty OP_RETURN vout instead in
                # the next iteration.
                data_size -= 10
        elif MAX_OP_RETURN_PAYLOAD < data_size <= MAX_OP_RETURN_PAYLOAD + 10:
            # We require more than one VOUT, but the extra space needed is
            # less than the VOUT footprint. Remove 10 bytes from the current
            # data to avoid overpadding in next iteration.
            data_size -= 10
        elif data_size > MAX_OP_RETURN_PAYLOAD + 10:
            # Use a full OP_RETURN.
            data_size = MAX_OP_RETURN_PAYLOAD + 1

        if was_op_pushdata1_used:
            # OP_PUSHDATA1 adds 1 extra byte to the transaction size.
            data_size -= 1
            required_padding -= 1

        required_padding -= data_size + VOUT_VALUE_SIZE + 3

        script_operations += [
            OP_RETURN,
            get_random_bytes(data_size)
        ]
        tx.vout.append(CTxOut(0, CScript(script_operations)))

    tx.rehash()


def pad_raw_tx(rawtx_hex, min_size=MIN_TX_SIZE):
    """
    Pad a raw transaction with OP_RETURN data until it reaches at least min_size
    """
    tx = CTransaction()
    FromHex(tx, rawtx_hex)
    pad_tx(tx, min_size)
    return ToHex(tx)


class TestFrameworkScript(unittest.TestCase):
    def test_pad_raw_tx(self):
        raw_tx = (
            "0100000001dd22777f85ab958c065cabced6115c4a2604abb9a2273f0eedce14a"
            "55c7b1201000000000201510000000001ebf802950000000017a914da1745e9b5"
            "49bd0bfa1a569971c77eba30cd5a4b8700000000"
        )

        # Helper functions
        def rawtx_length(rawtx):
            return len(bytes.fromhex(rawtx))

        def test_size(requested_size, expected_size):
            self.assertEqual(
                rawtx_length(pad_raw_tx(raw_tx, requested_size)),
                expected_size)

        self.assertEqual(rawtx_length(raw_tx), 85)

        # The tx size is never reduced.
        for size in [-1, 0, 1, 83, 84, 85]:
            test_size(size, expected_size=85)

        # The first new VOUT is added as soon as the requested size is more
        # than the initial size. The next 9 sizes are overpadded to 95 bytes,
        # because a VOUT with an empty OP_RETURN is the minimum data we can
        # add.
        for size in [86, 87, 88, 89, 90, 91, 92, 93, 94]:
            test_size(requested_size=size,
                      expected_size=95)

        # After that, the size is exactly as expected.
        for size in range(95, 1000):
            test_size(requested_size=size,
                      expected_size=size)
