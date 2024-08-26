# -*- coding: utf-8 -*-
# -*- mode: python3 -*-
# This file (c) 2019 Mark Lundeberg
# Part of the Electron Cash SPV Wallet
# License: MIT
import unittest

from electrumabc.ecc import CURVE_ORDER

from .. import pedersen

assert CURVE_ORDER == 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


def fastslowcase(testmethod):
    """method -> class decorator to run with libsecp enabled/disabled in
    pedersen module"""

    class _TestClass(unittest.TestCase):
        def test_slow(self):
            saved = pedersen.seclib
            pedersen.seclib = None
            try:
                testmethod(self)
            finally:
                pedersen.seclib = saved

        def test_fast(self):
            if not pedersen.seclib:
                self.skipTest("accelerated ECC library not available")
            testmethod(self)

    _TestClass.__name__ = testmethod.__name__
    return _TestClass


@fastslowcase
def TestBadSetup(self):
    # a particularly bad choice: H = -G
    with self.assertRaises(pedersen.InsecureHPoint):
        pedersen.PedersenSetup(
            bytes.fromhex(
                "0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            )
        )
    with self.assertRaises(pedersen.InsecureHPoint):
        pedersen.PedersenSetup(
            bytes.fromhex(
                "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798b7c52588d95c3b9aa25b0403f1eef75702e84bb7597aabe663b82f6f04ef2777"
            )
        )

    # a non-point
    with self.assertRaises(ValueError):
        pedersen.PedersenSetup(
            bytes.fromhex(
                "030000000000000000000000000000000000000000000000000000000000000007"
            )
        )


@fastslowcase
def TestNormal(self):
    setup = pedersen.PedersenSetup(b"\x02The scalar for this x is unknown")
    commit0 = setup.commit(0)
    commit5 = pedersen.Commitment(setup, 5)
    commit10m = setup.commit(-10)

    sumnonce = (commit0.nonce + commit5.nonce + commit10m.nonce) % CURVE_ORDER

    sumA = pedersen.add_commitments([commit0, commit5, commit10m])
    sumB = pedersen.Commitment(setup, -5, nonce=sumnonce)  # manual

    self.assertEqual(sumA.nonce, sumB.nonce)
    self.assertEqual(sumA.amount_mod, sumB.amount_mod)
    self.assertEqual(sumA.P_uncompressed, sumB.P_uncompressed)
    self.assertEqual(sumA.P_compressed, sumB.P_compressed)
