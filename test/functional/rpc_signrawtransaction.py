#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *


class SignRawTransactionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def successful_signing_test(self):
        """Creates and signs a valid raw transaction with one input.

        Expected results:

        1) The transaction has a complete set of signatures
        2) No script verification error occurred"""
        privKeys = ['cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N',
                    'cVKpPfVKSJxKqVpE9awvXNWuLHCa5j5tiE7K6zbUSptFpTEtiFrA']

        inputs = [
            # Valid pay-to-pubkey scripts
            {'txid': '9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71',
             'vout': 0, 'amount': 3.14159,
             'scriptPubKey': '76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac'},
            {'txid': '83a4f6a6b73660e13ee6cb3c6063fa3759c50c9b7521d0536022961898f4fb02',
             'vout': 0, 'amount': '123.456',
             'scriptPubKey': '76a914669b857c03a5ed269d5d85a1ffac9ed5d663072788ac'},
        ]

        outputs = {'mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB': 0.1}

        rawTx = self.nodes[0].createrawtransaction(inputs, outputs)
        rawTxSigned = self.nodes[0].signrawtransaction(rawTx, inputs, privKeys)

        # 1) The transaction has a complete set of signatures
        assert 'complete' in rawTxSigned
        assert_equal(rawTxSigned['complete'], True)

        # 2) No script verification error occurred
        assert 'errors' not in rawTxSigned

    def script_verification_error_test(self):
        """Creates and signs a raw transaction with valid (vin 0), invalid (vin 1) and one missing (vin 2) input script.

        Expected results:

        3) The transaction has no complete set of signatures
        4) Two script verification errors occurred
        5) Script verification errors have certain properties ("txid", "vout", "scriptSig", "sequence", "error")
        6) The verification errors refer to the invalid (vin 1) and missing input (vin 2)"""
        privKeys = ['cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N']

        inputs = [
            # Valid pay-to-pubkey script
            {'txid': '9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71',
             'vout': 0, 'amount': 0},
            # Invalid script
            {'txid': '5b8673686910442c644b1f4993d8f7753c7c8fcb5c87ee40d56eaeef25204547',
             'vout': 7, 'amount': '1.1'},
            # Missing scriptPubKey
            {'txid': '9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71',
             'vout': 1, 'amount': 2.0},
        ]

        scripts = [
            # Valid pay-to-pubkey script
            {'txid': '9b907ef1e3c26fc71fe4a4b3580bc75264112f95050014157059c736f0202e71',
             'vout': 0, 'amount': 0,
             'scriptPubKey': '76a91460baa0f494b38ce3c940dea67f3804dc52d1fb9488ac'},
            # Invalid script
            {'txid': '5b8673686910442c644b1f4993d8f7753c7c8fcb5c87ee40d56eaeef25204547',
             'vout': 7, 'amount': '1.1',
             'scriptPubKey': 'badbadbadbad'}
        ]

        outputs = {'mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB': 0.1}

        rawTx = self.nodes[0].createrawtransaction(inputs, outputs)

        # Make sure decoderawtransaction is at least marginally sane
        decodedRawTx = self.nodes[0].decoderawtransaction(rawTx)
        for i, inp in enumerate(inputs):
            assert_equal(decodedRawTx["vin"][i]["txid"], inp["txid"])
            assert_equal(decodedRawTx["vin"][i]["vout"], inp["vout"])

        # Make sure decoderawtransaction throws if there is extra data
        assert_raises_rpc_error(-22, "TX decode failed",
                                self.nodes[0].decoderawtransaction, rawTx + "00")

        rawTxSigned = self.nodes[0].signrawtransaction(
            rawTx, scripts, privKeys)

        # 3) The transaction has no complete set of signatures
        assert 'complete' in rawTxSigned
        assert_equal(rawTxSigned['complete'], False)

        # 4) Two script verification errors occurred
        assert 'errors' in rawTxSigned
        assert_equal(len(rawTxSigned['errors']), 2)

        # 5) Script verification errors have certain properties
        assert 'txid' in rawTxSigned['errors'][0]
        assert 'vout' in rawTxSigned['errors'][0]
        assert 'scriptSig' in rawTxSigned['errors'][0]
        assert 'sequence' in rawTxSigned['errors'][0]
        assert 'error' in rawTxSigned['errors'][0]

        # 6) The verification errors refer to the invalid (vin 1) and missing
        # input (vin 2)
        assert_equal(rawTxSigned['errors'][0]['txid'], inputs[1]['txid'])
        assert_equal(rawTxSigned['errors'][0]['vout'], inputs[1]['vout'])
        assert_equal(rawTxSigned['errors'][1]['txid'], inputs[2]['txid'])
        assert_equal(rawTxSigned['errors'][1]['vout'], inputs[2]['vout'])

    def run_test(self):
        self.successful_signing_test()
        self.script_verification_error_test()


if __name__ == '__main__':
    SignRawTransactionsTest().main()
