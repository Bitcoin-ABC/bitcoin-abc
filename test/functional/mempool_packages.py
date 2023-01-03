# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test descendant package tracking code."""

from test_framework.p2p import P2PTxInvStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, satoshi_round
from test_framework.wallet import MiniWallet

MAX_ANCESTORS = 50


class MempoolPackagesTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [["-maxorphantx=1000"]] * self.num_nodes

    def run_test(self):
        self.wallet = MiniWallet(self.nodes[0])
        self.wallet.rescan_utxos()

        peer_inv_store = self.nodes[0].add_p2p_connection(P2PTxInvStore())

        # MAX_ANCESTORS transactions off a confirmed tx should be fine
        chain = self.wallet.send_self_transfer_chain(
            from_node=self.nodes[0], chain_length=MAX_ANCESTORS
        )

        # Wait until mempool transactions have passed initial broadcast
        # (sent inv and received getdata)
        # Otherwise, getrawmempool may be inconsistent with getmempoolentry if
        # unbroadcast changes in between
        peer_inv_store.wait_for_broadcast([t["txid"] for t in chain])

        # Check mempool has MAX_ANCESTORS transactions in it
        mempool = self.nodes[0].getrawmempool(True)
        assert_equal(len(mempool), MAX_ANCESTORS)
        descendant_count = 1
        descendant_fees = 0
        descendant_size = 0

        ancestor_size = sum([mempool[tx]["size"] for tx in mempool])
        ancestor_count = MAX_ANCESTORS
        ancestor_fees = sum([mempool[tx]["fees"]["base"] for tx in mempool])

        descendants = []
        ancestors = [t["txid"] for t in chain]
        chain = [t["txid"] for t in chain]
        for x in reversed(chain):
            # Check that getmempoolentry is consistent with getrawmempool
            entry = self.nodes[0].getmempoolentry(x)
            assert_equal(entry, mempool[x])
            descendant_fees += mempool[x]["fees"]["base"]
            assert_equal(mempool[x]["fees"]["modified"], mempool[x]["fees"]["base"])
            descendant_size += mempool[x]["size"]
            descendant_count += 1

            ancestor_size -= mempool[x]["size"]
            ancestor_fees -= mempool[x]["fees"]["base"]
            ancestor_count -= 1

            # Check that parent/child list is correct
            assert_equal(mempool[x]["spentby"], descendants[-1:])
            assert_equal(mempool[x]["depends"], ancestors[-2:-1])

            # Check that getmempooldescendants is correct
            assert_equal(
                sorted(descendants), sorted(self.nodes[0].getmempooldescendants(x))
            )

            # Check getmempooldescendants verbose output is correct
            for descendant, dinfo in (
                self.nodes[0].getmempooldescendants(x, True).items()
            ):
                assert_equal(dinfo["depends"], [chain[chain.index(descendant) - 1]])
            descendants.append(x)

            # Check that getmempoolancestors is correct
            ancestors.remove(x)
            assert_equal(
                sorted(ancestors), sorted(self.nodes[0].getmempoolancestors(x))
            )

            # Check that getmempoolancestors verbose output is correct
            for ancestor, ainfo in self.nodes[0].getmempoolancestors(x, True).items():
                assert_equal(ainfo["spentby"], [chain[chain.index(ancestor) + 1]])

        # Check we covered all the ancestors
        assert_equal(ancestor_size, 0)
        assert_equal(ancestor_fees, 0)

        # Check that getmempoolancestors/getmempooldescendants correctly handle
        # verbose=true
        v_ancestors = self.nodes[0].getmempoolancestors(chain[-1], True)
        assert_equal(len(v_ancestors), len(chain) - 1)
        for x in v_ancestors.keys():
            assert_equal(mempool[x], v_ancestors[x])
        assert chain[-1] not in v_ancestors.keys()

        v_descendants = self.nodes[0].getmempooldescendants(chain[0], True)
        assert_equal(len(v_descendants), len(chain) - 1)
        for x in v_descendants.keys():
            assert_equal(mempool[x], v_descendants[x])
        assert chain[0] not in v_descendants.keys()

        # Check that prioritising a tx before it's added to the mempool works
        # First clear the mempool by mining a block.
        self.generate(self.nodes[0], 1)
        assert_equal(len(self.nodes[0].getrawmempool()), 0)
        # Prioritise a transaction that has been mined, then add it back to the
        # mempool by using invalidateblock.
        self.nodes[0].prioritisetransaction(txid=chain[-1], fee_delta=2000)
        self.nodes[0].invalidateblock(self.nodes[0].getbestblockhash())
        # Keep node1's tip synced with node0
        self.nodes[1].invalidateblock(self.nodes[1].getbestblockhash())

        # Now check that the transaction is in the mempool, with the right
        # modified fee
        mempool = self.nodes[0].getrawmempool(True)

        for x in reversed(chain):
            if x == chain[-1]:
                assert_equal(
                    mempool[x]["fees"]["modified"],
                    mempool[x]["fees"]["base"] + satoshi_round(20.00),
                )

        # Check that node1's mempool is as expected
        mempool0 = self.nodes[0].getrawmempool(False)
        mempool1 = self.nodes[1].getrawmempool(False)
        assert_equal(mempool0, mempool1)
        # TODO: more detailed check of node1's mempool (fees etc.)
        # check transaction unbroadcast info (should be false if in both
        # mempools)
        mempool = self.nodes[0].getrawmempool(True)
        for tx in mempool:
            assert_equal(mempool[tx]["unbroadcast"], False)


if __name__ == "__main__":
    MempoolPackagesTest().main()
