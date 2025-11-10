# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the wallet."""

from decimal import Decimal

from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import CTransaction, FromHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_array_result,
    assert_equal,
    assert_fee_amount,
    assert_raises_rpc_error,
    count_bytes,
)
from test_framework.wallet_util import test_address


class WalletTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 4
        self.noban_tx_relay = True
        self.setup_clean_chain = True
        self.extra_args = [
            ["-acceptnonstdtxn=1"],
        ] * self.num_nodes
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def setup_network(self):
        self.setup_nodes()
        # Only need nodes 0-2 running at start of test
        self.stop_node(3)
        self.connect_nodes(0, 1)
        self.connect_nodes(1, 2)
        self.connect_nodes(0, 2)
        self.sync_all(self.nodes[0:3])

    def check_fee_amount(self, curr_balance, balance_with_fee, fee_per_byte, tx_size):
        """Return curr_balance after asserting the fee was in range"""
        fee = balance_with_fee - curr_balance
        assert_fee_amount(fee, tx_size, fee_per_byte * 1000)
        return curr_balance

    def run_test(self):
        # Check that there's no UTXO on none of the nodes
        assert_equal(len(self.nodes[0].listunspent()), 0)
        assert_equal(len(self.nodes[1].listunspent()), 0)
        assert_equal(len(self.nodes[2].listunspent()), 0)

        self.log.info("Mining blocks...")

        self.generate(self.nodes[0], 1, sync_fun=self.no_op)

        walletinfo = self.nodes[0].getwalletinfo()
        assert_equal(walletinfo["immature_balance"], 50000000)
        assert_equal(walletinfo["balance"], 0)

        self.sync_all(self.nodes[0:3])
        self.generate(
            self.nodes[1],
            COINBASE_MATURITY + 1,
            sync_fun=lambda: self.sync_all(self.nodes[0:3]),
        )

        assert_equal(self.nodes[0].getbalance(), 50000000)
        assert_equal(self.nodes[1].getbalance(), 50000000)
        assert_equal(self.nodes[2].getbalance(), 0)

        # Check that only first and second nodes have UTXOs
        utxos = self.nodes[0].listunspent()
        assert_equal(len(utxos), 1)
        assert_equal(len(self.nodes[1].listunspent()), 1)
        assert_equal(len(self.nodes[2].listunspent()), 0)

        self.log.info("test gettxout")
        confirmed_txid, confirmed_index = utxos[0]["txid"], utxos[0]["vout"]
        # First, outputs that are unspent both in the chain and in the
        # mempool should appear with or without include_mempool
        txout = self.nodes[0].gettxout(
            txid=confirmed_txid, n=confirmed_index, include_mempool=False
        )
        assert_equal(txout["value"], 50000000)
        txout = self.nodes[0].gettxout(
            txid=confirmed_txid, n=confirmed_index, include_mempool=True
        )
        assert_equal(txout["value"], 50000000)

        # Send 21,000,000 XEC from 0 to 2 using sendtoaddress call.
        self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), 11000000)
        mempool_txid = self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 10000000
        )

        self.log.info("test gettxout (second part)")
        # utxo spent in mempool should be visible if you exclude mempool
        # but invisible if you include mempool
        txout = self.nodes[0].gettxout(confirmed_txid, confirmed_index, False)
        assert_equal(txout["value"], 50000000)
        txout = self.nodes[0].gettxout(confirmed_txid, confirmed_index, True)
        assert txout is None
        # new utxo from mempool should be invisible if you exclude mempool
        # but visible if you include mempool
        txout = self.nodes[0].gettxout(mempool_txid, 0, False)
        assert txout is None
        txout1 = self.nodes[0].gettxout(mempool_txid, 0, True)
        txout2 = self.nodes[0].gettxout(mempool_txid, 1, True)
        # note the mempool tx will have randomly assigned indices
        # but 10 will go to node2 and the rest will go to node0
        balance = self.nodes[0].getbalance()
        assert_equal({txout1["value"], txout2["value"]}, {10000000, balance})
        walletinfo = self.nodes[0].getwalletinfo()
        assert_equal(walletinfo["immature_balance"], 0)

        # Have node0 mine a block, thus it will collect its own fee.
        self.generate(self.nodes[0], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))

        # Exercise locking of unspent outputs
        unspent_0 = self.nodes[2].listunspent()[0]
        unspent_0 = {"txid": unspent_0["txid"], "vout": unspent_0["vout"]}
        assert_raises_rpc_error(
            -8,
            "Invalid parameter, expected locked output",
            self.nodes[2].lockunspent,
            True,
            [unspent_0],
        )
        self.nodes[2].lockunspent(False, [unspent_0])
        assert_raises_rpc_error(
            -8,
            "Invalid parameter, output already locked",
            self.nodes[2].lockunspent,
            False,
            [unspent_0],
        )
        assert_raises_rpc_error(
            -6,
            "Insufficient funds",
            self.nodes[2].sendtoaddress,
            self.nodes[2].getnewaddress(),
            20000000,
        )
        assert_equal([unspent_0], self.nodes[2].listlockunspent())
        self.nodes[2].lockunspent(True, [unspent_0])
        assert_equal(len(self.nodes[2].listlockunspent()), 0)
        assert_raises_rpc_error(
            -8,
            "txid must be of length 64 (not 34, for"
            " '0000000000000000000000000000000000')",
            self.nodes[2].lockunspent,
            False,
            [{"txid": "0000000000000000000000000000000000", "vout": 0}],
        )
        assert_raises_rpc_error(
            -8,
            "txid must be hexadecimal string (not"
            " 'ZZZ0000000000000000000000000000000000000000000000000000000000000')",
            self.nodes[2].lockunspent,
            False,
            [
                {
                    "txid": "ZZZ0000000000000000000000000000000000000000000000000000000000000",
                    "vout": 0,
                }
            ],
        )
        assert_raises_rpc_error(
            -8,
            "Invalid parameter, unknown transaction",
            self.nodes[2].lockunspent,
            False,
            [
                {
                    "txid": "0000000000000000000000000000000000000000000000000000000000000000",
                    "vout": 0,
                }
            ],
        )
        assert_raises_rpc_error(
            -8,
            "Invalid parameter, vout index out of bounds",
            self.nodes[2].lockunspent,
            False,
            [{"txid": unspent_0["txid"], "vout": 999}],
        )

        # The lock on a manually selected output is ignored
        unspent_0 = self.nodes[1].listunspent()[0]
        self.nodes[1].lockunspent(False, [unspent_0])
        tx = self.nodes[1].createrawtransaction(
            [unspent_0], {self.nodes[1].getnewaddress(): 1000000}
        )
        tx = self.nodes[1].fundrawtransaction(tx)["hex"]
        self.nodes[1].fundrawtransaction(tx, {"lockUnspents": True})

        # fundrawtransaction can lock an input
        self.nodes[1].lockunspent(True, [unspent_0])
        assert_equal(len(self.nodes[1].listlockunspent()), 0)
        tx = self.nodes[1].fundrawtransaction(tx, {"lockUnspents": True})["hex"]
        assert_equal(len(self.nodes[1].listlockunspent()), 1)

        # Send transaction
        tx = self.nodes[1].signrawtransactionwithwallet(tx)["hex"]
        self.nodes[1].sendrawtransaction(tx)
        assert_equal(len(self.nodes[1].listlockunspent()), 0)

        # Have node1 generate 100 blocks (so node0 can recover the fee)
        self.generate(
            self.nodes[1],
            COINBASE_MATURITY,
            sync_fun=lambda: self.sync_all(self.nodes[0:3]),
        )

        # node0 should end up with 100 btc in block rewards plus fees, but
        # minus the 21 plus fees sent to node2
        assert_equal(self.nodes[0].getbalance(), 100000000 - 21000000)
        assert_equal(self.nodes[2].getbalance(), 21000000)

        # Node0 should have two unspent outputs.
        # Create a couple of transactions to send them to node2, submit them through
        # node1, and make sure both node0 and node2 pick them up properly:
        node0utxos = self.nodes[0].listunspent(1)
        assert_equal(len(node0utxos), 2)

        # create both transactions
        txns_to_send = []
        for utxo in node0utxos:
            inputs = []
            outputs = {}
            inputs.append({"txid": utxo["txid"], "vout": utxo["vout"]})
            outputs[self.nodes[2].getnewaddress()] = utxo["amount"] - 3000000
            raw_tx = self.nodes[0].createrawtransaction(inputs, outputs)
            txns_to_send.append(self.nodes[0].signrawtransactionwithwallet(raw_tx))

        # Have node 1 (miner) send the transactions
        self.nodes[1].sendrawtransaction(hexstring=txns_to_send[0]["hex"], maxfeerate=0)
        self.nodes[1].sendrawtransaction(hexstring=txns_to_send[1]["hex"], maxfeerate=0)

        # Have node1 mine a block to confirm transactions:
        self.generate(self.nodes[1], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))

        assert_equal(self.nodes[0].getbalance(), 0)
        assert_equal(self.nodes[2].getbalance(), 94000000)

        # Verify that a spent output cannot be locked anymore
        spent_0 = {"txid": node0utxos[0]["txid"], "vout": node0utxos[0]["vout"]}
        assert_raises_rpc_error(
            -8,
            "Invalid parameter, expected unspent output",
            self.nodes[0].lockunspent,
            False,
            [spent_0],
        )

        # Send 10,000,000 XEC normal
        old_balance = self.nodes[2].getbalance()
        address = self.nodes[0].getnewaddress("test")
        fee_per_byte = Decimal("1000") / 1000
        self.nodes[2].settxfee(fee_per_byte * 1000)
        txid = self.nodes[2].sendtoaddress(address, 10000000, "", "", False)
        self.generate(self.nodes[2], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        ctx = FromHex(CTransaction(), self.nodes[2].gettransaction(txid)["hex"])

        node_2_bal = self.check_fee_amount(
            self.nodes[2].getbalance(),
            old_balance - Decimal("10000000"),
            fee_per_byte,
            ctx.billable_size(),
        )
        assert_equal(self.nodes[0].getbalance(), Decimal("10000000"))

        # Send 10,000,000 XEC with subtract fee from amount
        txid = self.nodes[2].sendtoaddress(address, 10000000, "", "", True)
        self.generate(self.nodes[2], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        node_2_bal -= Decimal("10000000")
        assert_equal(self.nodes[2].getbalance(), node_2_bal)
        node_0_bal = self.check_fee_amount(
            self.nodes[0].getbalance(),
            Decimal("20000000"),
            fee_per_byte,
            count_bytes(self.nodes[2].gettransaction(txid)["hex"]),
        )

        self.log.info("Test sendmany")

        # Sendmany 10,000,000 XEC
        txid = self.nodes[2].sendmany("", {address: 10000000}, 0, "", [])
        self.generate(self.nodes[2], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        node_0_bal += Decimal("10000000")
        ctx = FromHex(CTransaction(), self.nodes[2].gettransaction(txid)["hex"])
        node_2_bal = self.check_fee_amount(
            self.nodes[2].getbalance(),
            node_2_bal - Decimal("10000000"),
            fee_per_byte,
            ctx.billable_size(),
        )
        assert_equal(self.nodes[0].getbalance(), node_0_bal)

        # Sendmany 10,000,000 XEC with subtract fee from amount
        txid = self.nodes[2].sendmany("", {address: 10000000}, 0, "", [address])
        self.generate(self.nodes[2], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        node_2_bal -= Decimal("10000000")
        assert_equal(self.nodes[2].getbalance(), node_2_bal)
        ctx = FromHex(CTransaction(), self.nodes[2].gettransaction(txid)["hex"])
        node_0_bal = self.check_fee_amount(
            self.nodes[0].getbalance(),
            node_0_bal + Decimal("10000000"),
            fee_per_byte,
            ctx.billable_size(),
        )

        self.start_node(3, self.extra_args[3])
        self.connect_nodes(0, 3)
        self.sync_all()

        # check if we can list zero value tx as available coins
        # 1. create raw_tx
        # 2. hex-changed one output to 0.0
        # 3. sign and send
        # 4. check if recipient (node0) can list the zero value tx
        usp = self.nodes[1].listunspent(query_options={"minimumAmount": "49998000"})[0]
        inputs = [{"txid": usp["txid"], "vout": usp["vout"]}]
        outputs = {
            self.nodes[1].getnewaddress(): 49998000,
            self.nodes[0].getnewaddress(): 11110000,
        }

        rawTx = (
            self.nodes[1]
            .createrawtransaction(inputs, outputs)
            .replace("c0833842", "00000000")
        )  # replace 11.11 with 0.0 (int32)
        signed_raw_tx = self.nodes[1].signrawtransactionwithwallet(rawTx)
        decoded_raw_tx = self.nodes[1].decoderawtransaction(signed_raw_tx["hex"])
        zero_value_txid = decoded_raw_tx["txid"]
        self.nodes[1].sendrawtransaction(signed_raw_tx["hex"])

        self.sync_all()
        self.generate(self.nodes[1], 1)  # mine a block

        # zero value tx must be in listunspents output
        unspent_txs = self.nodes[0].listunspent()
        found = False
        for uTx in unspent_txs:
            if uTx["txid"] == zero_value_txid:
                found = True
                assert_equal(uTx["amount"], Decimal("0"))
        assert found

        # do some -walletbroadcast tests
        self.stop_nodes()
        self.start_node(0, self.extra_args[0] + ["-walletbroadcast=0"])
        self.start_node(1, self.extra_args[1] + ["-walletbroadcast=0"])
        self.start_node(2, self.extra_args[2] + ["-walletbroadcast=0"])
        self.connect_nodes(0, 1)
        self.connect_nodes(1, 2)
        self.connect_nodes(0, 2)
        self.sync_all(self.nodes[0:3])

        txid_not_broadcast = self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 2000000
        )
        tx_obj_not_broadcast = self.nodes[0].gettransaction(txid_not_broadcast)
        # mine a block, tx should not be in there
        self.generate(self.nodes[1], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        # should not be changed because tx was not broadcasted
        assert_equal(self.nodes[2].getbalance(), node_2_bal)

        # now broadcast from another node, mine a block, sync, and check the
        # balance
        self.nodes[1].sendrawtransaction(tx_obj_not_broadcast["hex"])
        self.generate(self.nodes[1], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))
        node_2_bal += 2000000
        tx_obj_not_broadcast = self.nodes[0].gettransaction(txid_not_broadcast)
        assert_equal(self.nodes[2].getbalance(), node_2_bal)

        # create another tx
        txid_not_broadcast = self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 2000000
        )

        # restart the nodes with -walletbroadcast=1
        self.stop_nodes()
        self.start_node(0, self.extra_args[0])
        self.start_node(1, self.extra_args[1])
        self.start_node(2, self.extra_args[2])
        self.connect_nodes(0, 1)
        self.connect_nodes(1, 2)
        self.connect_nodes(0, 2)
        self.sync_blocks(self.nodes[0:3])

        self.generate(
            self.nodes[0], 1, sync_fun=lambda: self.sync_blocks(self.nodes[0:3])
        )
        node_2_bal += 2000000

        # tx should be added to balance because after restarting the nodes tx
        # should be broadcasted
        assert_equal(self.nodes[2].getbalance(), node_2_bal)

        # send a tx with value in a string (PR#6380 +)
        txid = self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), "2000000")
        tx_obj = self.nodes[0].gettransaction(txid)
        assert_equal(tx_obj["amount"], Decimal("-2000000"))

        txid = self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), "10000")
        tx_obj = self.nodes[0].gettransaction(txid)
        assert_equal(tx_obj["amount"], Decimal("-10000"))

        # check if JSON parser can handle scientific notation in strings
        txid = self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), "1e3")
        tx_obj = self.nodes[0].gettransaction(txid)
        assert_equal(tx_obj["amount"], Decimal("-1000"))

        # General checks for errors from incorrect inputs
        # This will raise an exception because the amount is negative
        assert_raises_rpc_error(
            -3,
            "Amount out of range",
            self.nodes[0].sendtoaddress,
            self.nodes[2].getnewaddress(),
            "-1",
        )

        # This will raise an exception because the amount type is wrong
        assert_raises_rpc_error(
            -3,
            "Invalid amount",
            self.nodes[0].sendtoaddress,
            self.nodes[2].getnewaddress(),
            "1f-4",
        )

        # This will raise an exception since generate does not accept a string
        assert_raises_rpc_error(
            -3, "not of expected type number", self.generate, self.nodes[0], "2"
        )

        # This will raise an exception for the invalid private key format
        assert_raises_rpc_error(
            -5, "Invalid private key encoding", self.nodes[0].importprivkey, "invalid"
        )

        # This will raise an exception for importing an address with the PS2H
        # flag
        temp_address = self.nodes[1].getnewaddress()
        assert_raises_rpc_error(
            -5,
            "Cannot use the p2sh flag with an address - use a script instead",
            self.nodes[0].importaddress,
            temp_address,
            "label",
            False,
            True,
        )

        # This will raise an exception for attempting to dump the private key
        # of an address you do not own
        assert_raises_rpc_error(
            -4, "Private key for address", self.nodes[0].dumpprivkey, temp_address
        )

        # This will raise an exception for attempting to get the private key of
        # an invalid Bitcoin address
        assert_raises_rpc_error(
            -5, "Invalid Bitcoin address", self.nodes[0].dumpprivkey, "invalid"
        )

        # This will raise an exception for attempting to set a label for an
        # invalid Bitcoin address
        assert_raises_rpc_error(
            -5,
            "Invalid Bitcoin address",
            self.nodes[0].setlabel,
            "invalid address",
            "label",
        )

        # This will raise an exception for importing an invalid address
        assert_raises_rpc_error(
            -5,
            "Invalid Bitcoin address or script",
            self.nodes[0].importaddress,
            "invalid",
        )

        # This will raise an exception for attempting to import a pubkey that
        # isn't in hex
        assert_raises_rpc_error(
            -5, "Pubkey must be a hex string", self.nodes[0].importpubkey, "not hex"
        )

        # This will raise an exception for importing an invalid pubkey
        assert_raises_rpc_error(
            -5,
            "Pubkey is not a valid public key",
            self.nodes[0].importpubkey,
            "5361746f736869204e616b616d6f746f",
        )

        # Import address and private key to check correct behavior of spendable unspents
        # 1. Send some coins to generate new UTXO
        address_to_import = self.nodes[2].getnewaddress()
        txid = self.nodes[0].sendtoaddress(address_to_import, 1000000)
        self.generate(self.nodes[0], 1, sync_fun=lambda: self.sync_all(self.nodes[0:3]))

        # 2. Import address from node2 to node1
        self.nodes[1].importaddress(address_to_import)

        # 3. Validate that the imported address is watch-only on node1
        assert self.nodes[1].getaddressinfo(address_to_import)["iswatchonly"]

        # 4. Check that the unspents after import are not spendable
        assert_array_result(
            self.nodes[1].listunspent(),
            {"address": address_to_import},
            {"spendable": False},
        )

        # 5. Import private key of the previously imported address on node1
        priv_key = self.nodes[2].dumpprivkey(address_to_import)
        self.nodes[1].importprivkey(priv_key)

        # 6. Check that the unspents are now spendable on node1
        assert_array_result(
            self.nodes[1].listunspent(),
            {"address": address_to_import},
            {"spendable": True},
        )

        # Mine a block from node0 to an address from node1
        coinbase_addr = self.nodes[1].getnewaddress()
        block_hash = self.generatetoaddress(
            self.nodes[0],
            1,
            coinbase_addr,
            sync_fun=lambda: self.sync_all(self.nodes[0:3]),
        )[0]
        coinbase_txid = self.nodes[0].getblock(block_hash)["tx"][0]

        # Check that the txid and balance is found by node1
        self.nodes[1].gettransaction(coinbase_txid)

        # check if wallet or blockchain maintenance changes the balance
        self.sync_all(self.nodes[0:3])
        blocks = self.generate(
            self.nodes[0], 2, sync_fun=lambda: self.sync_all(self.nodes[0:3])
        )
        balance_nodes = [self.nodes[i].getbalance() for i in range(3)]
        block_count = self.nodes[0].getblockcount()

        # Check modes:
        #   - True: unicode escaped as \u....
        #   - False: unicode directly as UTF-8
        for mode in [True, False]:
            self.nodes[0].rpc.ensure_ascii = mode
            # unicode check: Basic Multilingual Plane, Supplementary Plane
            # respectively
            for label in ["рыба", "𝅘𝅥𝅯"]:
                addr = self.nodes[0].getnewaddress()
                self.nodes[0].setlabel(addr, label)
                test_address(self.nodes[0], addr, labels=[label])
                assert label in self.nodes[0].listlabels()
        # restore to default
        self.nodes[0].rpc.ensure_ascii = True

        # maintenance tests
        maintenance = [
            "-rescan",
            "-reindex",
        ]
        for m in maintenance:
            self.log.info(f"check {m}")
            self.stop_nodes()
            # set lower ancestor limit for later
            self.start_node(0, self.extra_args[0] + [m])
            self.start_node(1, self.extra_args[1] + [m])
            self.start_node(2, self.extra_args[2] + [m])
            if m == "-reindex":
                # reindex will leave rpc warm up "early"; Wait for it to finish
                self.wait_until(
                    lambda: [block_count] * 3
                    == [self.nodes[i].getblockcount() for i in range(3)]
                )
            assert_equal(balance_nodes, [self.nodes[i].getbalance() for i in range(3)])

        # Exercise listsinceblock with the last two blocks
        coinbase_tx_1 = self.nodes[0].listsinceblock(blocks[0])
        assert_equal(coinbase_tx_1["lastblock"], blocks[1])
        assert_equal(len(coinbase_tx_1["transactions"]), 1)
        assert_equal(coinbase_tx_1["transactions"][0]["blockhash"], blocks[1])
        assert_equal(len(self.nodes[0].listsinceblock(blocks[1])["transactions"]), 0)

        # Test getaddressinfo on external address. Note that these addresses
        # are taken from disablewallet.py
        assert_raises_rpc_error(
            -5,
            "Invalid address",
            self.nodes[0].getaddressinfo,
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
        )
        address_info = self.nodes[0].getaddressinfo(
            "mneYUmWYsuk7kySiURxCi3AGxrAqZxLgPZ"
        )
        assert_equal(
            address_info["address"],
            "ecregtest:qp8rs4qyd3aazk22eyzwg7fmdfzmxm02pyprkfhvm4",
        )
        assert_equal(
            address_info["scriptPubKey"],
            "76a9144e3854046c7bd1594ac904e4793b6a45b36dea0988ac",
        )
        assert not address_info["ismine"]
        assert not address_info["iswatchonly"]
        assert not address_info["isscript"]
        assert not address_info["ischange"]

        # Test getaddressinfo 'ischange' field on change address.
        self.generate(self.nodes[0], 1, sync_fun=self.no_op)
        destination = self.nodes[1].getnewaddress()
        txid = self.nodes[0].sendtoaddress(destination, 123000)
        tx = self.nodes[0].gettransaction(txid=txid, verbose=True)["decoded"]
        output_addresses = [vout["scriptPubKey"]["addresses"][0] for vout in tx["vout"]]
        assert len(output_addresses) > 1
        for address in output_addresses:
            ischange = self.nodes[0].getaddressinfo(address)["ischange"]
            assert_equal(ischange, address != destination)
            if ischange:
                change = address
        self.nodes[0].setlabel(change, "foobar")
        assert_equal(self.nodes[0].getaddressinfo(change)["ischange"], False)

        # Test gettransaction response with different arguments.
        self.log.info("Testing gettransaction response with different arguments...")
        self.nodes[0].setlabel(change, "baz")
        baz = self.nodes[0].listtransactions(label="baz", count=1)[0]
        expected_receive_vout = {
            "label": "baz",
            "address": baz["address"],
            "amount": baz["amount"],
            "category": baz["category"],
            "vout": baz["vout"],
        }
        expected_fields = frozenset(
            {
                "amount",
                "confirmations",
                "details",
                "fee",
                "hex",
                "time",
                "timereceived",
                "trusted",
                "txid",
                "walletconflicts",
            }
        )
        verbose_field = "decoded"
        expected_verbose_fields = expected_fields | {verbose_field}

        self.log.debug("Testing gettransaction response without verbose")
        tx = self.nodes[0].gettransaction(txid=txid)
        assert_equal(set(tx), expected_fields)
        assert_array_result(
            tx["details"], {"category": "receive"}, expected_receive_vout
        )

        self.log.debug("Testing gettransaction response with verbose set to False")
        tx = self.nodes[0].gettransaction(txid=txid, verbose=False)
        assert_equal(set(tx), expected_fields)
        assert_array_result(
            tx["details"], {"category": "receive"}, expected_receive_vout
        )

        self.log.debug("Testing gettransaction response with verbose set to True")
        tx = self.nodes[0].gettransaction(txid=txid, verbose=True)
        assert_equal(set(tx), expected_verbose_fields)
        assert_array_result(
            tx["details"], {"category": "receive"}, expected_receive_vout
        )
        assert_equal(tx[verbose_field], self.nodes[0].decoderawtransaction(tx["hex"]))


if __name__ == "__main__":
    WalletTest().main()
