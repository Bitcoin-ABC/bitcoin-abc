#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

# Exercise the Bitcoin whc_listproperties RPC calls.

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error, assert_notemptylist)

class WHC_ListProperties_RPC_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True
        self.extra_args = [['-norelaypriority',
                            '-whitelist=127.0.0.1']]

    def run_test(self):
        self.log.info(
            "Compare responses from whc_listproperties RPC ")
        rpc_response = self.nodes[0].cli.whc_listproperties()
        assert_notemptylist(rpc_response)


if __name__ == '__main__':
    WHC_ListProperties_RPC_Test().main()
