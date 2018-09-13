#!/usr/bin/env python3
# Copyright (c) 2016-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the dumpwallet RPC."""

import os

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


def read_dump(file_name, addrs, script_addrs, hd_master_addr_old):
    """
    Read the given dump, count the addrs that match, count change and reserve.
    Also check that the old hd_master is inactive
    """
    with open(file_name, encoding='utf8') as inputfile:
        found_addr = 0
        found_script_addr = 0
        found_addr_chg = 0
        found_addr_rsv = 0
        hd_master_addr_ret = None
        for line in inputfile:
            # only read non comment lines
            if line[0] != "#" and len(line) > 10:
                # split out some data
                key_date_label, comment = line.split("#")
                key_date_label = key_date_label.split(" ")
                # key = key_date_label[0]
                date = key_date_label[1]
                keytype = key_date_label[2]

                imported_key = date == '1970-01-01T00:00:01Z'
                if imported_key:
                    # Imported keys have multiple addresses, no label (keypath) and timestamp
                    # Skip them
                    continue

                addr_keypath = comment.split(" addr=")[1]
                addr = addr_keypath.split(" ")[0]
                keypath = None
                if keytype == "inactivehdseed=1":
                    # ensure the old master is still available
                    assert hd_master_addr_old == addr
                elif keytype == "hdseed=1":
                    # ensure we have generated a new hd master key
                    assert hd_master_addr_old != addr
                    hd_master_addr_ret = addr
                elif keytype == "script=1":
                    # scripts don't have keypaths
                    keypath = None
                else:
                    keypath = addr_keypath.rstrip().split("hdkeypath=")[1]

                # count key types
                for addrObj in addrs:
                    if addrObj['address'] == addr and addrObj['hdkeypath'] == keypath and keytype == "label=":
                        found_addr += 1
                        break
                    elif keytype == "change=1":
                        found_addr_chg += 1
                        break
                    elif keytype == "reserve=1":
                        found_addr_rsv += 1
                        break

                # count scripts
                for script_addr in script_addrs:
                    if script_addr == addr.rstrip() and keytype == "script=1":
                        found_script_addr += 1
                        break

        return found_addr, found_script_addr, found_addr_chg, found_addr_rsv, hd_master_addr_ret


class WalletDumpTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-keypool=90"]]
        self.rpc_timeout = 120

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def setup_network(self):
        self.add_nodes(self.num_nodes, extra_args=self.extra_args)
        self.start_nodes()

    def run_test(self):
        tmpdir = self.options.tmpdir

        # generate 20 addresses to compare against the dump
        test_addr_count = 20
        addrs = []
        for i in range(0, test_addr_count):
            addr = self.nodes[0].getnewaddress()
            vaddr = self.nodes[0].getaddressinfo(
                addr)  # required to get hd keypath
            addrs.append(vaddr)
        # Should be a no-op:
        self.nodes[0].keypoolrefill()

        # Test scripts dump by adding a 1-of-1 multisig address
        multisig_addr = self.nodes[0].addmultisigaddress(
            1, [addrs[0]["address"]])["address"]

        # dump unencrypted wallet
        result = self.nodes[0].dumpwallet(
            tmpdir + "/node0/wallet.unencrypted.dump")
        assert_equal(result['filename'], os.path.abspath(
            tmpdir + "/node0/wallet.unencrypted.dump"))

        found_addr, found_script_addr, found_addr_chg, found_addr_rsv, hd_master_addr_unenc = \
            read_dump(tmpdir + "/node0/wallet.unencrypted.dump",
                      addrs, [multisig_addr], None)
        # all keys must be in the dump
        assert_equal(found_addr, test_addr_count)
        # all scripts must be in the dump
        assert_equal(found_script_addr, 1)
        # 0 blocks where mined
        assert_equal(found_addr_chg, 0)
        # 90 keys plus 100% internal keys
        assert_equal(found_addr_rsv, 90 * 2)

        # encrypt wallet, restart, unlock and dump
        self.nodes[0].encryptwallet('test')
        self.nodes[0].walletpassphrase('test', 10)
        # Should be a no-op:
        self.nodes[0].keypoolrefill()
        self.nodes[0].dumpwallet(tmpdir + "/node0/wallet.encrypted.dump")

        found_addr, found_script_addr, found_addr_chg, found_addr_rsv, _ = \
            read_dump(tmpdir + "/node0/wallet.encrypted.dump",
                      addrs, [multisig_addr], hd_master_addr_unenc)
        assert_equal(found_addr, test_addr_count)
        assert_equal(found_script_addr, 1)
        # old reserve keys are marked as change now
        assert_equal(found_addr_chg, 90 * 2)
        assert_equal(found_addr_rsv, 90 * 2)

        # Overwriting should fail
        assert_raises_rpc_error(-8, "already exists",
                                self.nodes[0].dumpwallet, tmpdir + "/node0/wallet.unencrypted.dump")

        # Restart node with new wallet, and test importwallet
        self.stop_node(0)
        self.start_node(0, ['-wallet=w2'])

        # Make sure the address is not IsMine before import
        result = self.nodes[0].getaddressinfo(multisig_addr)
        assert result['ismine'] is False

        self.nodes[0].importwallet(os.path.abspath(
            tmpdir + "/node0/wallet.unencrypted.dump"))

        # Now check IsMine is true
        result = self.nodes[0].getaddressinfo(multisig_addr)
        assert result['ismine'] is True


if __name__ == '__main__':
    WalletDumpTest().main()
