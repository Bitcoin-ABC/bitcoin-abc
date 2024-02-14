# Copyright (c) 2017 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test that the wallet can send and receive using all combinations of address types.

There are 4 nodes-under-test:
    - node0 uses legacy addresses
    - node1 uses legacy addresses
    - node2 uses legacy addresses
    - node3 uses legacy addresses

node4 exists to generate new blocks.

## Multisig address test

Test that adding a multisig address with:
    - an uncompressed pubkey always gives a legacy address
    - only compressed pubkeys gives the an `-addresstype` address

## Sending to address types test

A series of tests, iterating over node0-node3. In each iteration of the test, one node sends:
    - 10/101th of its balance to itself (using getrawchangeaddress for single key addresses)
    - 20/101th to the next node
    - 30/101th to the node after that
    - 40/101th to the remaining node
    - 1/101th remains as fee+change

Iterate over each node for single key addresses, and then over each node for
multisig addresses. Repeat test. As every node sends coins after receiving,
this also verifies that spending coins sent to all these address types works.
"""

import itertools
from decimal import Decimal

from test_framework.descriptors import descsum_check, descsum_create
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than


class AddressTypeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 5
        # whitelist all peers to speed up tx relay / mempool sync
        self.extra_args = [["-whitelist=noban@127.0.0.1"]] * self.num_nodes

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def setup_network(self):
        self.setup_nodes()

        # Fully mesh-connect nodes for faster mempool sync
        for i, j in itertools.product(range(self.num_nodes), repeat=2):
            if i > j:
                self.connect_nodes(i, j)
        self.sync_all()

    def get_balances(self, key="trusted"):
        """Return a list of balances."""
        return [self.nodes[i].getbalances()["mine"][key] for i in range(4)]

    def test_address(self, node, address, multisig, typ):
        """Run sanity checks on an address."""
        self.log.info(address)
        info = self.nodes[node].getaddressinfo(address)
        assert self.nodes[node].validateaddress(address)["isvalid"]
        assert_equal(info.get("solvable"), True)

        if not multisig and typ == "legacy":
            # P2PKH
            assert not info["isscript"]
            assert "pubkey" in info
        elif typ == "legacy":
            # P2SH-multisig
            assert info["isscript"]
            assert_equal(info["script"], "multisig")
            assert "pubkeys" in info
        else:
            # Unknown type
            assert False

    def test_desc(self, node, address, multisig, typ, utxo):
        """Run sanity checks on a descriptor reported by getaddressinfo."""
        info = self.nodes[node].getaddressinfo(address)
        assert "desc" in info

        assert_equal(info["desc"], utxo["desc"])
        assert self.nodes[node].validateaddress(address)["isvalid"]

        # Use a ridiculously roundabout way to find the key origin info through
        # the PSBT logic. However, this does test consistency between the PSBT reported
        # fingerprints/paths and the descriptor logic.
        psbt = self.nodes[node].createpsbt(
            [{"txid": utxo["txid"], "vout": utxo["vout"]}], [{address: 100.00}]
        )
        psbt = self.nodes[node].walletprocesspsbt(psbt, False, "ALL|FORKID", True)
        decode = self.nodes[node].decodepsbt(psbt["psbt"])
        key_descs = {}
        for deriv in decode["inputs"][0]["bip32_derivs"]:
            assert_equal(len(deriv["master_fingerprint"]), 8)
            assert_equal(deriv["path"][0], "m")
            key_descs[deriv["pubkey"]] = (
                "["
                + deriv["master_fingerprint"]
                + deriv["path"][1:]
                + "]"
                + deriv["pubkey"]
            )

        # Verify the descriptor checksum against the Python implementation
        assert descsum_check(info["desc"])
        # Verify that stripping the checksum and recreating it using Python
        # roundtrips
        assert info["desc"] == descsum_create(info["desc"][:-9])
        # Verify that stripping the checksum and feeding it to
        # getdescriptorinfo roundtrips
        assert (
            info["desc"]
            == self.nodes[0].getdescriptorinfo(info["desc"][:-9])["descriptor"]
        )
        assert_equal(
            info["desc"][-8:],
            self.nodes[0].getdescriptorinfo(info["desc"][:-9])["checksum"],
        )
        # Verify that keeping the checksum and feeding it to getdescriptorinfo
        # roundtrips
        assert (
            info["desc"] == self.nodes[0].getdescriptorinfo(info["desc"])["descriptor"]
        )
        assert_equal(
            info["desc"][-8:], self.nodes[0].getdescriptorinfo(info["desc"])["checksum"]
        )

        if not multisig and typ == "legacy":
            # P2PKH
            assert_equal(
                info["desc"], descsum_create(f"pkh({key_descs[info['pubkey']]})")
            )
        elif typ == "legacy":
            # P2SH-multisig
            assert_equal(
                info["desc"],
                descsum_create(
                    f"sh(multi(2,{key_descs[info['pubkeys'][0]]},"
                    f"{key_descs[info['pubkeys'][1]]}))"
                ),
            )
        else:
            # Unknown type
            assert False

    def test_change_output_type(self, node_sender, destinations, expected_type):
        txid = self.nodes[node_sender].sendmany(
            dummy="", amounts=dict.fromkeys(destinations, 1000.00)
        )
        tx = self.nodes[node_sender].gettransaction(txid=txid, verbose=True)["decoded"]

        # Make sure the transaction has change:
        assert_equal(len(tx["vout"]), len(destinations) + 1)

        # Make sure the destinations are included, and remove them:
        output_addresses = [vout["scriptPubKey"]["addresses"][0] for vout in tx["vout"]]
        change_addresses = [d for d in output_addresses if d not in destinations]
        assert_equal(len(change_addresses), 1)

        self.log.debug(
            f"Check if change address {change_addresses[0]} is {expected_type}"
        )
        self.test_address(
            node_sender, change_addresses[0], multisig=False, typ=expected_type
        )

    def run_test(self):
        # Mine 101 blocks on node4 to bring nodes out of IBD and make sure that
        # no coinbases are maturing for the nodes-under-test during the test
        self.generate(self.nodes[4], 101)

        uncompressed_1 = "0496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858ee"
        uncompressed_2 = "047211a824f55b505228e4c3d5194c1fcfaa15a456abdf37f9b9d97a4040afc073dee6c89064984f03385237d92167c13e236446b417ab79a0fcae412ae3316b77"
        compressed_1 = (
            "0296b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52"
        )
        compressed_2 = (
            "037211a824f55b505228e4c3d5194c1fcfaa15a456abdf37f9b9d97a4040afc073"
        )

        if not self.options.descriptors:
            # Tests for addmultisigaddress's address type behavior is only for
            # legacy wallets. Descriptor wallets do not have addmultsigaddress
            # so these tests are not needed for those.
            # addmultisigaddress with at least 1 uncompressed key should return
            # a legacy address.
            for node in range(4):
                self.test_address(
                    node,
                    self.nodes[node].addmultisigaddress(
                        2, [uncompressed_1, uncompressed_2]
                    )["address"],
                    True,
                    "legacy",
                )
                self.test_address(
                    node,
                    self.nodes[node].addmultisigaddress(
                        2, [compressed_1, uncompressed_2]
                    )["address"],
                    True,
                    "legacy",
                )
                self.test_address(
                    node,
                    self.nodes[node].addmultisigaddress(
                        2, [uncompressed_1, compressed_2]
                    )["address"],
                    True,
                    "legacy",
                )
            # addmultisigaddress with all compressed keys should return the
            # appropriate address type (even when the keys are not ours).
            self.test_address(
                0,
                self.nodes[0].addmultisigaddress(2, [compressed_1, compressed_2])[
                    "address"
                ],
                True,
                "legacy",
            )

        do_multisigs = [False]
        if not self.options.descriptors:
            do_multisigs.append(True)

        for multisig, from_node in itertools.product(do_multisigs, range(4)):
            self.log.info(
                "Sending from node"
                f" {from_node} with{'' if multisig else 'out'} multisig"
            )
            old_balances = self.get_balances()
            self.log.debug(f"Old balances are {old_balances}")
            to_send = (old_balances[from_node] / 101).quantize(Decimal("0.01"))
            sends = {}
            addresses = {}

            self.log.debug("Prepare sends")
            for n, to_node in enumerate(range(from_node, from_node + 4)):
                to_node %= 4
                if not multisig:
                    if from_node == to_node:
                        # When sending non-multisig to self, use
                        # getrawchangeaddress
                        address = self.nodes[to_node].getrawchangeaddress()
                    else:
                        address = self.nodes[to_node].getnewaddress()
                else:
                    addr1 = self.nodes[to_node].getnewaddress()
                    addr2 = self.nodes[to_node].getnewaddress()
                    address = self.nodes[to_node].addmultisigaddress(2, [addr1, addr2])[
                        "address"
                    ]

                # Do some sanity checking on the created address
                typ = "legacy"
                self.test_address(to_node, address, multisig, typ)

                # Output entry
                sends[address] = to_send * 10 * (1 + n)
                addresses[to_node] = (address, typ)

            self.log.debug(f"Sending: {sends}")
            self.nodes[from_node].sendmany("", sends)
            self.sync_mempools()

            unconf_balances = self.get_balances("untrusted_pending")
            self.log.debug(f"Check unconfirmed balances: {unconf_balances}")
            assert_equal(unconf_balances[from_node], 0)
            for n, to_node in enumerate(range(from_node + 1, from_node + 4)):
                to_node %= 4
                assert_equal(unconf_balances[to_node], to_send * 10 * (2 + n))

            # node4 collects fee and block subsidy to keep accounting simple
            self.generate(self.nodes[4], 1)

            # Verify that the receiving wallet contains a UTXO with the
            # expected address, and expected descriptor
            for n, to_node in enumerate(range(from_node, from_node + 4)):
                to_node %= 4
                found = False
                for utxo in self.nodes[to_node].listunspent():
                    if utxo["address"] == addresses[to_node][0]:
                        found = True
                        self.test_desc(
                            to_node,
                            addresses[to_node][0],
                            multisig,
                            addresses[to_node][1],
                            utxo,
                        )
                        break
                assert found

            new_balances = self.get_balances()
            self.log.debug(f"Check new balances: {new_balances}")
            # We don't know what fee was set, so we can only check bounds on
            # the balance of the sending node
            assert_greater_than(new_balances[from_node], to_send * 10)
            assert_greater_than(to_send * 11, new_balances[from_node])
            for n, to_node in enumerate(range(from_node + 1, from_node + 4)):
                to_node %= 4
                assert_equal(
                    new_balances[to_node],
                    old_balances[to_node] + to_send * 10 * (2 + n),
                )

        # Get addresses from node2 and  node3:
        to_address_2 = self.nodes[2].getnewaddress()
        to_address_3_1 = self.nodes[3].getnewaddress()
        to_address_3_2 = self.nodes[3].getnewaddress()

        self.log.info("Various change output tests")
        self.test_change_output_type(0, [to_address_3_1], "legacy")
        self.test_change_output_type(1, [to_address_2], "legacy")
        self.test_change_output_type(1, [to_address_3_1], "legacy")
        self.test_change_output_type(1, [to_address_2, to_address_3_1], "legacy")
        self.test_change_output_type(1, [to_address_3_1, to_address_3_2], "legacy")
        self.test_change_output_type(2, [to_address_3_1], "legacy")

        self.log.info("Test getrawchangeaddress")
        self.test_address(
            3, self.nodes[3].getrawchangeaddress(), multisig=False, typ="legacy"
        )


if __name__ == "__main__":
    AddressTypeTest().main()
