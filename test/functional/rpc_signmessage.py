#!/usr/bin/env python3
# Copyright (c) 2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.test_framework import BitcoinTestFramework


class SignMessagesTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def run_test(self):
        message = 'This is just a test message'

        # Test the signing with a privkey
        privKey = 'cUeKHd5orzT3mz8P9pxyREHfsWtVfgsfDjiZZBcjUBAaGk1BTj7N'
        address = 'mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB'
        signature = self.nodes[0].signmessagewithprivkey(privKey, message)

        # Verify the message
        assert(self.nodes[0].verifymessage(address, signature, message))

        # Test the signing with an address with wallet
        address = self.nodes[0].getnewaddress()
        signature = self.nodes[0].signmessage(address, message)

        # Verify the message
        assert(self.nodes[0].verifymessage(address, signature, message))


if __name__ == '__main__':
    SignMessagesTest().main()
