#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import unittest

from make_chainparams import main as GenerateChainParams


class MockRPC:
    def __init__(
        self,
        test,
        chain,
        numBlocks,
        expectedBlock,
        blockHash,
        chainWork,
        blockchainSize,
        chainstateSize,
    ):
        self.test = test
        self.chain = chain
        self.numBlocks = numBlocks
        self.expectedBlock = expectedBlock
        self.blockchainSize = blockchainSize
        self.blockHash = blockHash
        self.chainstateSize = chainstateSize
        self.chainWork = chainWork

    def getblockchaininfo(self):
        return {
            "chain": self.chain,
            "blocks": self.numBlocks,
            "headers": self.numBlocks,
            "bestblockhash": (
                "0000000000000000039c96605d7fca74a5e185ea5634198346e9e07fd235b666"
            ),
            "difficulty": 274412074285.6605,
            "mediantime": 1562168718,
            "verificationprogress": 0.9999958005632363,
            "initialblockdownload": False,
            "chainwork": self.chainWork,
            "size_on_disk": self.blockchainSize,
            "pruned": True,
            "pruneheight": 582974,
            "automatic_pruning": True,
            "prune_target_size": 1048576000,
        }

    def getblockhash(self, block):
        # Tests should always request the right block height. Even though a
        # real node will rarely raise an exception for this call, we are
        # more strict during testing.
        self.test.assertEqual(
            block,
            self.expectedBlock,
            f"Called 'getblockhash {block}' when expected was 'getblockhash {self.expectedBlock}'",
        )
        return self.blockHash

    def getblockheader(self, blockHash):
        # Make sure to raise an exception in the same way a real node would
        # when calling 'getblockheader' on a block hash that is not part of
        # the chain.
        self.test.assertEqual(
            blockHash,
            self.blockHash,
            f"Called 'getblockheader {blockHash}' when expected was 'getblockheader {self.blockHash}'",
        )
        return {
            "hash": blockHash,
            "confirmations": 1,
            "height": 591463,
            "version": 536870912,
            "versionHex": "20000000",
            "merkleroot": (
                "51c898f034b6c5a5513a7c35912e86d009188311e550bb3096e04afb11f40aba"
            ),
            "time": 1563212034,
            "mediantime": 1563208994,
            "nonce": 3501699724,
            "bits": "18040cd6",
            "difficulty": 271470800310.0635,
            "chainwork": (
                "000000000000000000000000000000000000000000f4c5e639fa012518a48a57"
            ),
            "previousblockhash": (
                "00000000000000000307b45e4a6cf8d49e70b9012ea1d72a5ce334a4213f66bd"
            ),
        }

    def gettxoutsetinfo(self):
        return {
            "height": 636013,
            "bestblock": (
                "00000000000000000250a6ab6c6c4778086807f5b39910a8c108efa511282280"
            ),
            "transactions": 19360831,
            "txouts": 42145889,
            "bogosize": 3187119531,
            "hash_serialized": (
                "1b1cc457771e8b6f849ac21c4da43ebe5c614df9e61a943252978437ad774ce5"
            ),
            "disk_size": self.chainstateSize,
            "total_amount": 18412423.42452419,
        }


class MockFailRPC(MockRPC):
    # Provides a fail counter to fail after the Nth RPC command

    def __init__(
        self,
        test,
        chain,
        numBlocks,
        expectedBlock,
        blockHash,
        chainWork,
        blockchainSize,
        chainstateSize,
        failCounter,
    ):
        super().__init__(
            test,
            chain,
            numBlocks,
            expectedBlock,
            blockHash,
            chainWork,
            blockchainSize,
            chainstateSize,
        )
        self.failCounter = failCounter

    def checkFailCounter(self):
        self.failCounter -= 1
        if self.failCounter < 0:
            raise Exception(
                """error code: -99
                error message:
                mock error"""
            )

    def getblockchaininfo(self):
        self.checkFailCounter()
        return super().getblockchaininfo()

    def getblockhash(self, block):
        self.checkFailCounter()
        return super().getblockhash(block)

    def getblockheader(self, blockHash):
        self.checkFailCounter()
        return super().getblockheader(blockHash)

    def gettxoutsetinfo(self):
        self.checkFailCounter()
        return super().gettxoutsetinfo()


def CheckMockFailure(test, args, errorMessage="error code: -99"):
    with test.assertRaises(Exception) as context:
        GenerateChainParams(args)
    test.assertIn(errorMessage, str(context.exception))


class GenerateChainParamsTests(unittest.TestCase):
    maxDiff = None

    def setUp(self):
        self.blockHash1 = (
            "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8"
        )
        self.chainWork1 = (
            "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1"
        )
        self.blockHash2 = (
            "0000000000000298a9fa227f0ec32f2b7585f3e64c8b3369e7f8b4fd8ea3d836"
        )
        self.chainWork2 = (
            "00000000000000000000000000000000000000000000004fdb4795a837f19671"
        )

    def test_happy_path_mainnet(self):
        mockRPC = MockRPC(
            test=self,
            chain="main",
            numBlocks=123000,
            expectedBlock=122990,
            blockHash=self.blockHash1,
            chainWork=self.chainWork1,
            blockchainSize=160111222333,
            chainstateSize=2000111222,
        )
        args = {
            "rpc": mockRPC,
            "block": None,
        }
        self.assertEqual(
            GenerateChainParams(args),
            "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8\n"
            "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1\n"
            "194\n"
            "3",
        )

    def test_happy_path_testnet(self):
        mockRPC = MockRPC(
            test=self,
            chain="test",
            numBlocks=234000,
            expectedBlock=232000,
            blockHash=self.blockHash1,
            chainWork=self.chainWork1,
            blockchainSize=50111222333,
            chainstateSize=1000111222,
        )
        args = {
            "rpc": mockRPC,
            "block": None,
        }
        self.assertEqual(
            GenerateChainParams(args),
            "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8\n"
            "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1\n"
            "61\n"
            "2",
        )

    def test_specific_block(self):
        mockRPC = MockRPC(
            test=self,
            chain="main",
            numBlocks=123000,
            expectedBlock=122990,
            blockHash=self.blockHash1,
            chainWork=self.chainWork1,
            blockchainSize=160111222333,
            chainstateSize=2000111222,
        )
        args = {
            "rpc": mockRPC,
            "block": self.blockHash1,
        }
        self.assertEqual(
            GenerateChainParams(args),
            "0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8\n"
            "000000000000000000000000000000000000000000f2537ccf2e07bbe15e70e1\n"
            "194\n"
            "3",
        )

    def test_wrong_chain(self):
        mockRPC = MockRPC(
            test=self,
            chain="main",
            numBlocks=123000,
            expectedBlock=122990,
            blockHash=self.blockHash1,
            chainWork=self.chainWork1,
            blockchainSize=160111222333,
            chainstateSize=2000111222,
        )
        args = {
            "rpc": mockRPC,
            "block": self.blockHash2,
        }
        CheckMockFailure(
            self,
            args,
            "expected was 'getblockheader"
            " 0000000000000000003ef673ae12bc6017481830d37b9c52ce1e79c080e812b8'",
        )

    def test_bitcoin_cli_failures_testnet(self):
        for chain in ["main", "test"]:
            expectedBlock = 133990
            if chain == "test":
                expectedBlock = 132000

            for failCounter in range(4):
                mockFailRPC = MockFailRPC(
                    test=self,
                    chain=chain,
                    numBlocks=134000,
                    expectedBlock=expectedBlock,
                    blockHash=self.blockHash1,
                    chainWork=self.chainWork1,
                    failCounter=failCounter,
                    blockchainSize=160111222333,
                    chainstateSize=2000111222,
                )
                argsFail = {
                    "rpc": mockFailRPC,
                    "block": None,
                }
                CheckMockFailure(self, argsFail)


unittest.main()
