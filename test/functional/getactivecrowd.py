
"""Test bitcoin-cli"""
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_emptylist


class GetActiveCrowd (BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = False


    def activeCrowd(self):
        self.log.info("Testing whc_getactivecrowd")
        address = self.nodes[0].getnewaddress("")
        activeinfo = self.nodes[0].whc_getactivecrowd(address)
        assert_emptylist(activeinfo)


    def run_test(self):
        self.activeCrowd()



if __name__ == '__main__':
    GetActiveCrowd().main()