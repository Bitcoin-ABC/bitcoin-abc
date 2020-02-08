#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import unittest

from make_chainparams import main as GenerateChainParams


class MockRPC:
    def __init__(self, test, chain, numBlocks,
                 expectedBlock, blockHash, chainWork):
        self.test = test
        self.chain = chain
        self.numBlocks = numBlocks
        self.expectedBlock = expectedBlock
        self.blockHash = blockHash
        self.chainWork = chainWork

    def getblockchaininfo(self):
        return {
            "chain": self.chain,
            "blocks": self.numBlocks,
            "headers": self.numBlocks,
            "bestblockhash": "0000000000000000039c96605d7fca74a5e185ea5634198346e9e07fd235b666",
            "difficulty": 274412074285.6605,
            "mediantime": 1562168718,
            "verificationprogress": 0.9999958005632363,
            "initialblockdownload": False,
            "chainwork": self.chainWork,
            "size_on_disk": 952031444,
            "pruned": True,
            "pruneheight": 582974,
            "automatic_pruning": True,
            "prune_target_size": 1048576000,
        }

    def getblockhash(self, block):
        # Tests should always request the right block height. Even though a
        # real node will rarely raise an exception for this call, we are
        # more strict during testing.
        self.test.assertEqual(block, self.expectedBlock, "Called 'getblockhash {}' when expected was 'getblockhash {}'".format(
            block, self.expectedBlock))
        return self.blockHash

    def getblockheader(self, blockHash):
        # Make sure to raise an exception in the same way a real node would
        # when calling 'getblockheader' on a block hash that is not part of
        # the chain.
        self.test.assertEqual(blockHash, self.blockHash, "Called 'getblockheader {}' when expected was 'getblockheader {}'".format(
            blockHash, self.blockHash))
        return {
            "hash": blockHash,
            "confirmations": 1,
            "height": 591463,
            "version": 536870912,
            "versionHex": "20000000",
            "merkleroot": "51c898f034b6c5a5513a7c35912e86d009188311e550bb3096e04afb11f40aba",
            "time": 1563212034,
            "mediantime": 1563208994,
            "nonce": 3501699724,
            "bits": "18040cd6",
            "difficulty": 271470800310.0635,
            "chainwork": "000000000000000000000000000000000000000000f4c5e639fa012518a48a57",
            "previousblockhash": "00000000000000000307b45e4a6cf8d49e70b9012ea1d72a5ce334a4213f66bd",
        }


class MockFailRPC(MockRPC):
    # Provides a fail counter to fail after the Nth RPC command

    def __init__(self, test, chain, numBlocks, expectedBlock,
                 blockHash, chainWork, failCounter):
        super().__init__(test, chain, numBlocks, expectedBlock, blockHash, chainWork)
        self.failCounter = failCounter

    def checkFailCounter(self):
        self.failCounter -= 1
        if self.failCounter < 0:
            raise Exception("""error code: -99
                error message:
                mock error""")

    def getblockchaininfo(self):
        self.checkFailCounter()
        return super().getblockchaininfo()

    def getblockhash(self, block):
        self.checkFailCounter()
        return super().getblockhash(block)

    def getblockheader(self, blockHash):
        self.checkFailCounter()
        return super().getblockheader(blockHash)


def CheckMockFailure(test, args, errorMessage='error code: -99'):
    with test.assertRaises(Exception) as context:
        GenerateChainParams(args)
    test.assertIn(errorMessage, str(context.exception))


class GenerateChainParamsTests(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        self.blockHash1 = '0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8'
        self.chainWork1 = '000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1'
        self.blockHash2 = '0000000000000298a9fa227f0ec32f2b7585f3e64c8b3369e7f8b4fd8ea3d836'
        self.chainWork2 = '00000000000000000000000000000000000000000000004fdb4795a837f19671'

    def test_happy_path_mainnet(self):
        mockRPC = MockRPC(test=self, chain='main', numBlocks=123000,
                          expectedBlock=122990, blockHash=self.blockHash1, chainWork=self.chainWork1)
        args = {
            'rpc': mockRPC,
            'block': None,
        }
        self.assertEqual(GenerateChainParams(args), "{}\n{}".format(
                         "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8",
                         "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1"))

    def test_happy_path_testnet(self):
        mockRPC = MockRPC(test=self, chain='test', numBlocks=234000,
                          expectedBlock=232000, blockHash=self.blockHash1, chainWork=self.chainWork1)
        args = {
            'rpc': mockRPC,
            'block': None,
        }
        self.assertEqual(GenerateChainParams(args), "{}\n{}".format(
                         "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8",
                         "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1"))

    def test_specific_block(self):
        mockRPC = MockRPC(test=self, chain='main', numBlocks=123000,
                          expectedBlock=122990, blockHash=self.blockHash1, chainWork=self.chainWork1)
        args = {
            'rpc': mockRPC,
            'block': self.blockHash1,
        }
        self.assertEqual(GenerateChainParams(args), "{}\n{}".format(
                         "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8",
                         "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1"))

    def test_wrong_chain(self):
        mockRPC = MockRPC(test=self, chain='main', numBlocks=123000,
                          expectedBlock=122990, blockHash=self.blockHash1, chainWork=self.chainWork1)
        args = {
            'rpc': mockRPC,
            'block': self.blockHash2,
        }
        CheckMockFailure(
            self, args, "expected was 'getblockheader 0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8'")

    def test_bitcoin_cli_failures_testnet(self):
        for chain in ['main', 'test']:
            expectedBlock = 133990
            if chain == 'test':
                expectedBlock = 132000

            for failCounter in range(3):
                mockFailRPC = MockFailRPC(test=self, chain=chain, numBlocks=134000, expectedBlock=expectedBlock,
                                          blockHash=self.blockHash1, chainWork=self.chainWork1, failCounter=failCounter)
                argsFail = {
                    'rpc': mockFailRPC,
                    'block': None,
                }
                CheckMockFailure(self, argsFail)


unittest.main()
