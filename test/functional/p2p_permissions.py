# Copyright (c) 2015-2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test p2p permission message.

Test that permissions are correctly calculated and applied
"""

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, SCRIPTSIG_OP_TRUE
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import CTransaction, FromHex
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.txtools import pad_tx
from test_framework.util import append_config, assert_equal, p2p_port, tor_port


class P2PPermissionsTests(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def run_test(self):
        self.check_tx_relay()

        self.checkpermission(
            # default permissions (no specific permissions)
            ["-whitelist=127.0.0.1"],
            # Make sure the default values in the command line documentation
            # match the ones here
            ["relay", "noban", "mempool", "download"],
        )

        self.checkpermission(
            # no permission (even with forcerelay)
            ["-whitelist=@127.0.0.1", "-whitelistforcerelay=1"],
            [],
        )

        self.checkpermission(
            # relay permission removed (no specific permissions)
            ["-whitelist=127.0.0.1", "-whitelistrelay=0"],
            ["noban", "mempool", "download"],
        )

        self.checkpermission(
            # forcerelay and relay permission added
            # Legacy parameter interaction which set whitelistrelay to true
            # if whitelistforcerelay is true
            ["-whitelist=127.0.0.1", "-whitelistforcerelay"],
            ["forcerelay", "relay", "noban", "mempool", "download"],
        )

        # Let's make sure permissions are merged correctly
        # For this, we need to use whitebind instead of bind
        # by modifying the configuration file.
        ip_port = f"127.0.0.1:{p2p_port(1)}"
        self.replaceinconfig(
            1, "bind=127.0.0.1", f"whitebind=bloomfilter,forcerelay@{ip_port}"
        )
        # Explicitly bind the tor port to prevent collisions with the default tor port
        append_config(
            self.nodes[1].datadir,
            [f"bind=127.0.0.1:{tor_port(self.nodes[1].index)}=onion"],
        )
        self.checkpermission(
            ["-whitelist=noban@127.0.0.1"],
            # Check parameter interaction forcerelay should activate relay
            ["noban", "bloomfilter", "forcerelay", "relay", "download"],
        )
        self.replaceinconfig(
            1, f"whitebind=bloomfilter,forcerelay@{ip_port}", "bind=127.0.0.1"
        )
        self.replaceinconfig(
            1, f"bind=127.0.0.1:{tor_port(self.nodes[1].index)}=onion", ""
        )

        self.checkpermission(
            # legacy whitelistrelay should be ignored
            ["-whitelist=noban,mempool@127.0.0.1", "-whitelistrelay"],
            ["noban", "mempool", "download"],
        )

        self.checkpermission(
            # legacy whitelistforcerelay should be ignored
            ["-whitelist=noban,mempool@127.0.0.1", "-whitelistforcerelay"],
            ["noban", "mempool", "download"],
        )

        self.checkpermission(
            # missing mempool permission to be considered legacy whitelisted
            ["-whitelist=noban@127.0.0.1"],
            ["noban", "download"],
        )

        self.checkpermission(
            # all permission added
            ["-whitelist=all@127.0.0.1"],
            [
                "forcerelay",
                "noban",
                "mempool",
                "bloomfilter",
                "relay",
                "download",
                "bypass_proof_request_limits",
                "addr",
            ],
        )

        self.checkpermission(
            # bypass_proof_request_limits permission
            ["-whitelist=bypass_proof_request_limits@127.0.0.1"],
            ["bypass_proof_request_limits"],
        )

        for flag, permissions in [
            (["-whitelist=noban,out@127.0.0.1"], ["noban", "download"]),
            (["-whitelist=noban@127.0.0.1"], []),
        ]:
            self.restart_node(0, flag)
            self.connect_nodes(0, 1)
            peerinfo = self.nodes[0].getpeerinfo()[0]
            assert_equal(peerinfo["permissions"], permissions)

        self.stop_node(1)
        self.nodes[1].assert_start_raises_init_error(
            ["-whitelist=in,out@127.0.0.1"],
            "Only direction was set, no permissions",
            match=ErrorMatch.PARTIAL_REGEX,
        )
        self.nodes[1].assert_start_raises_init_error(
            ["-whitelist=oopsie@127.0.0.1"],
            "Invalid P2P permission",
            match=ErrorMatch.PARTIAL_REGEX,
        )
        self.nodes[1].assert_start_raises_init_error(
            ["-whitelist=noban@127.0.0.1:230"],
            "Invalid netmask specified in",
            match=ErrorMatch.PARTIAL_REGEX,
        )
        self.nodes[1].assert_start_raises_init_error(
            ["-whitebind=noban@127.0.0.1/10"],
            "Cannot resolve -whitebind address",
            match=ErrorMatch.PARTIAL_REGEX,
        )

    def check_tx_relay(self):
        block_op_true = self.nodes[0].getblock(
            self.generatetoaddress(
                self.nodes[0], COINBASE_MATURITY, ADDRESS_ECREG_P2SH_OP_TRUE
            )[0]
        )

        self.log.debug(
            "Create a connection from a forcerelay peer that rebroadcasts raw txs"
        )
        # A python mininode is needed to send the raw transaction directly.
        # If a full node was used, it could only rebroadcast via the inv-getdata
        # mechanism. However, even for forcerelay connections, a full node would
        # currently not request a txid that is already in the mempool.
        self.restart_node(1, extra_args=["-whitelist=forcerelay@127.0.0.1"])
        p2p_rebroadcast_wallet = self.nodes[1].add_p2p_connection(P2PDataStore())

        self.log.debug("Send a tx from the wallet initially")
        tx = FromHex(
            CTransaction(),
            self.nodes[0].createrawtransaction(
                inputs=[{"txid": block_op_true["tx"][0], "vout": 0}],
                outputs=[{ADDRESS_ECREG_P2SH_OP_TRUE: 50}],
            ),
        )
        # push the one byte script to the stack
        tx.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx)
        txid = tx.txid_hex

        self.log.debug("Wait until tx is in node[1]'s mempool")
        p2p_rebroadcast_wallet.send_txs_and_test([tx], self.nodes[1])

        self.log.debug(
            "Check that node[1] will send the tx to node[0] even though it"
            " is already in the mempool"
        )
        self.connect_nodes(1, 0)
        with self.nodes[1].assert_debug_log([f"Force relaying tx {txid} from peer=0"]):
            p2p_rebroadcast_wallet.send_txs_and_test([tx], self.nodes[1])
            self.wait_until(lambda: txid in self.nodes[0].getrawmempool())

        self.log.debug("Check that node[1] will not send an invalid tx to node[0]")
        tx.vout[0].nValue += 1
        txid = tx.txid_hex
        # Send the transaction twice. The first time, it'll be rejected by ATMP
        # because it conflicts with a mempool transaction. The second time,
        # it'll be in the m_recent_rejects filter.
        p2p_rebroadcast_wallet.send_txs_and_test(
            [tx],
            self.nodes[1],
            success=False,
            reject_reason=f"{txid} from peer=0 was not accepted: txn-mempool-conflict",
        )
        p2p_rebroadcast_wallet.send_txs_and_test(
            [tx],
            self.nodes[1],
            success=False,
            reject_reason=(
                f"Not relaying non-mempool transaction {txid} from forcerelay peer=0"
            ),
        )

    def checkpermission(self, args, expectedPermissions):
        self.restart_node(1, args)
        self.connect_nodes(0, 1)
        peerinfo = self.nodes[1].getpeerinfo()[0]
        assert_equal(len(expectedPermissions), len(peerinfo["permissions"]))
        for p in expectedPermissions:
            if p not in peerinfo["permissions"]:
                raise AssertionError(f"Expected permissions {p!r} is not granted.")

    def replaceinconfig(self, nodeid, old, new):
        with open(self.nodes[nodeid].bitcoinconf, encoding="utf8") as f:
            newText = f.read().replace(old, new)
        with open(self.nodes[nodeid].bitcoinconf, "w", encoding="utf8") as f:
            f.write(newText)


if __name__ == "__main__":
    P2PPermissionsTests().main()
