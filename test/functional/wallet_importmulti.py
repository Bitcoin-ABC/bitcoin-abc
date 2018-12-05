#!/usr/bin/env python3
# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the importmulti RPC.

Test importmulti by generating keys on node0, importing the scriptPubKeys and
addresses on node1 and then testing the address info for the different address
variants.

- `get_key()` and `get_multisig()` are called to generate keys on node0 and
  return the privkeys, pubkeys and all variants of scriptPubKey and address."""
from collections import namedtuple

from test_framework.address import (
    key_to_p2pkh,
    script_to_p2sh,
)
from test_framework.script import (
    CScript,
    OP_2,
    OP_3,
    OP_CHECKMULTISIG,
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_NOP,
    hash160,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    hex_str_to_bytes,
)

Key = namedtuple('Key', ['privkey',
                         'pubkey',
                         'p2pkh_script',
                         'p2pkh_addr'])

Multisig = namedtuple('Multisig', ['privkeys',
                                   'pubkeys',
                                   'p2sh_script',
                                   'p2sh_addr',
                                   'redeem_script'])


class ImportMultiTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def setup_network(self, split=False):
        self.setup_nodes()

    def get_key(self):
        """Generate a fresh key on node0

        Returns a named tuple of privkey, pubkey and all address and scripts."""
        addr = self.nodes[0].getnewaddress()
        pubkey = self.nodes[0].getaddressinfo(addr)['pubkey']
        pkh = hash160(hex_str_to_bytes(pubkey))
        return Key(self.nodes[0].dumpprivkey(addr),
                   pubkey,
                   # p2pkh
                   CScript([OP_DUP, OP_HASH160, pkh,
                            OP_EQUALVERIFY, OP_CHECKSIG]).hex(),
                   # p2pkh addr
                   key_to_p2pkh(pubkey))

    def get_multisig(self):
        """Generate a fresh multisig on node0

        Returns a named tuple of privkeys, pubkeys and all address and scripts."""
        addrs = []
        pubkeys = []
        for _ in range(3):
            addr = self.nodes[0].getaddressinfo(self.nodes[0].getnewaddress())
            addrs.append(addr['address'])
            pubkeys.append(addr['pubkey'])
        script_code = CScript([OP_2] + [hex_str_to_bytes(pubkey)
                                        for pubkey in pubkeys] + [OP_3, OP_CHECKMULTISIG])
        return Multisig([self.nodes[0].dumpprivkey(addr) for addr in addrs],
                        pubkeys,
                        # p2sh
                        CScript([OP_HASH160, hash160(
                            script_code), OP_EQUAL]).hex(),
                        # p2sh addr
                        script_to_p2sh(script_code),
                        # redeem script
                        script_code.hex())

    def run_test(self):
        self.log.info("Mining blocks...")
        self.nodes[0].generate(1)
        self.nodes[1].generate(1)
        timestamp = self.nodes[1].getblock(
            self.nodes[1].getbestblockhash())['mediantime']

        node0_address1 = self.nodes[0].getaddressinfo(
            self.nodes[0].getnewaddress())

        # Check only one address
        assert_equal(node0_address1['ismine'], True)

        # Node 1 sync test
        assert_equal(self.nodes[1].getblockcount(), 1)

        # Address Test - before import
        address_info = self.nodes[1].getaddressinfo(node0_address1['address'])
        assert_equal(address_info['iswatchonly'], False)
        assert_equal(address_info['ismine'], False)

        # RPC importmulti -----------------------------------------------

        # Bitcoin Address (implicit non-internal)
        self.log.info("Should import an address")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], timestamp)
        assert_equal(address_assert['ischange'], False)
        watchonly_address = address
        watchonly_timestamp = timestamp

        self.log.info("Should not import an invalid address")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": "not valid address",
            },
            "timestamp": "now",
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -5)
        assert_equal(result[0]['error']['message'], 'Invalid address')

        # ScriptPubKey + internal
        self.log.info("Should import a scriptPubKey with internal flag")
        key = self.get_key()
        result = self.nodes[1].importmulti([{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "internal": True
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(key.p2pkh_addr)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], timestamp)
        assert_equal(address_assert['ischange'], True)

        # ScriptPubKey + internal + label
        self.log.info(
            "Should not allow a label to be specified when internal is true")
        key = self.get_key()
        result = self.nodes[1].importmulti([{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "internal": True,
            "label": "Example label"
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(result[0]['error']['message'],
                     'Internal addresses should not have a label')

        # Nonstandard scriptPubKey + !internal
        self.log.info(
            "Should not import a nonstandard scriptPubKey without internal flag")
        nonstandardScriptPubKey = key.p2pkh_script + CScript([OP_NOP]).hex()
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": nonstandardScriptPubKey,
            "timestamp": "now",
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(
            result[0]['error']['message'],
            'Internal must be set to true for nonstandard scriptPubKey imports.')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # Address + Public key + !Internal(explicit)
        self.log.info("Should import an address with public key")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "pubkeys": [key.pubkey],
            "internal": False
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], timestamp)

        # ScriptPubKey + Public key + internal
        self.log.info(
            "Should import a scriptPubKey with internal and with public key")
        key = self.get_key()
        address = key.p2pkh_addr
        request = [{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "pubkeys": [key.pubkey],
            "internal": True
        }]
        result = self.nodes[1].importmulti(requests=request)
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], timestamp)

        # Nonstandard scriptPubKey + Public key + !internal
        self.log.info(
            "Should not import a nonstandard scriptPubKey without internal and with public key")
        key = self.get_key()
        address = key.p2pkh_addr
        request = [{
            "scriptPubKey": nonstandardScriptPubKey,
            "timestamp": "now",
            "pubkeys": [key.pubkey]
        }]
        result = self.nodes[1].importmulti(requests=request)
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(
            result[0]['error']['message'],
            'Internal must be set to true for nonstandard scriptPubKey imports.')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # Address + Private key + !watchonly
        self.log.info("Should import an address with private key")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "keys": [key.privkey]
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], True)
        assert_equal(address_assert['timestamp'], timestamp)

        self.log.info(
            "Should not import an address with private key if is already imported")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "keys": [key.privkey]
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -4)
        assert_equal(result[0]['error']['message'],
                     'The wallet already contains the private key for this address or script')

        # Address + Private key + watchonly
        self.log.info(
            "Should not import an address with private key and with watchonly")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "keys": [key.privkey],
            "watchonly": True
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(
            result[0]['error']['message'],
            'Watch-only addresses should not include private keys')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # ScriptPubKey + Private key + internal
        self.log.info(
            "Should import a scriptPubKey with internal and with private key")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "keys": [key.privkey],
            "internal": True
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], True)
        assert_equal(address_assert['timestamp'], timestamp)

        # Nonstandard scriptPubKey + Private key + !internal
        self.log.info(
            "Should not import a nonstandard scriptPubKey without internal and with private key")
        key = self.get_key()
        address = key.p2pkh_addr
        result = self.nodes[1].importmulti([{
            "scriptPubKey": nonstandardScriptPubKey,
            "timestamp": "now",
            "keys": [key.privkey]
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(
            result[0]['error']['message'],
            'Internal must be set to true for nonstandard scriptPubKey imports.')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # P2SH address
        multisig = self.get_multisig()
        self.nodes[1].generate(100)
        self.nodes[1].sendtoaddress(multisig.p2sh_addr, 10.00)
        self.nodes[1].generate(1)
        timestamp = self.nodes[1].getblock(
            self.nodes[1].getbestblockhash())['mediantime']

        self.log.info("Should import a p2sh")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": multisig.p2sh_addr
            },
            "timestamp": "now",
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(multisig.p2sh_addr)
        assert_equal(address_assert['isscript'], True)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['timestamp'], timestamp)
        p2shunspent = self.nodes[1].listunspent(
            0, 999999, [multisig.p2sh_addr])[0]
        assert_equal(p2shunspent['spendable'], False)
        assert_equal(p2shunspent['solvable'], False)

        # P2SH + Redeem script
        multisig = self.get_multisig()
        self.nodes[1].generate(100)
        self.nodes[1].sendtoaddress(multisig.p2sh_addr, 10.00)
        self.nodes[1].generate(1)
        timestamp = self.nodes[1].getblock(
            self.nodes[1].getbestblockhash())['mediantime']

        self.log.info("Should import a p2sh with respective redeem script")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": multisig.p2sh_addr
            },
            "timestamp": "now",
            "redeemscript": multisig.redeem_script
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(multisig.p2sh_addr)
        assert_equal(address_assert['timestamp'], timestamp)

        p2shunspent = self.nodes[1].listunspent(
            0, 999999, [multisig.p2sh_addr])[0]
        assert_equal(p2shunspent['spendable'], False)
        assert_equal(p2shunspent['solvable'], True)

        # P2SH + Redeem script + Private Keys + !Watchonly
        multisig = self.get_multisig()
        self.nodes[1].generate(100)
        self.nodes[1].sendtoaddress(multisig.p2sh_addr, 10.00)
        self.nodes[1].generate(1)
        timestamp = self.nodes[1].getblock(
            self.nodes[1].getbestblockhash())['mediantime']

        self.log.info(
            "Should import a p2sh with respective redeem script and private keys")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": multisig.p2sh_addr
            },
            "timestamp": "now",
            "redeemscript": multisig.redeem_script,
            "keys": multisig.privkeys[0:2]
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(multisig.p2sh_addr)
        assert_equal(address_assert['timestamp'], timestamp)

        p2shunspent = self.nodes[1].listunspent(
            0, 999999, [multisig.p2sh_addr])[0]
        assert_equal(p2shunspent['spendable'], False)
        assert_equal(p2shunspent['solvable'], True)

        # P2SH + Redeem script + Private Keys + Watchonly
        multisig = self.get_multisig()
        self.nodes[1].generate(100)
        self.nodes[1].sendtoaddress(multisig.p2sh_addr, 10.00)
        self.nodes[1].generate(1)
        timestamp = self.nodes[1].getblock(
            self.nodes[1].getbestblockhash())['mediantime']

        self.log.info(
            "Should import a p2sh with respective redeem script and private keys")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": multisig.p2sh_addr
            },
            "timestamp": "now",
            "redeemscript": multisig.redeem_script,
            "keys": multisig.privkeys[0:2],
            "watchonly": True
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -8)
        assert_equal(
            result[0]['error']['message'],
            'Watch-only addresses should not include private keys')

        # Address + Public key + !Internal + Wrong pubkey
        self.log.info("Should not import an address with a wrong public key")
        key = self.get_key()
        address = key.p2pkh_addr
        wrong_key = self.get_key().pubkey
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "pubkeys": [wrong_key]
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -5)
        assert_equal(
            result[0]['error']['message'],
            'Key does not match address destination')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # ScriptPubKey + Public key + internal + Wrong pubkey
        self.log.info(
            "Should not import a scriptPubKey with internal and with a wrong public key")
        key = self.get_key()
        address = key.p2pkh_addr
        wrong_key = self.get_key().pubkey
        request = [{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "pubkeys": [wrong_key],
            "internal": True
        }]
        result = self.nodes[1].importmulti(request)
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -5)
        assert_equal(
            result[0]['error']['message'],
            'Key does not match address destination')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # Address + Private key + !watchonly + Wrong private key
        self.log.info("Should not import an address with a wrong private key")
        key = self.get_key()
        address = key.p2pkh_addr
        wrong_privkey = self.get_key().privkey
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": address
            },
            "timestamp": "now",
            "keys": [wrong_privkey]
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -5)
        assert_equal(
            result[0]['error']['message'],
            'Key does not match address destination')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # ScriptPubKey + Private key + internal + Wrong private key
        self.log.info(
            "Should not import a scriptPubKey with internal and with a wrong private key")
        key = self.get_key()
        address = key.p2pkh_addr
        wrong_privkey = self.get_key().privkey
        result = self.nodes[1].importmulti([{
            "scriptPubKey": key.p2pkh_script,
            "timestamp": "now",
            "keys": [wrong_privkey],
            "internal": True
        }])
        assert_equal(result[0]['success'], False)
        assert_equal(result[0]['error']['code'], -5)
        assert_equal(
            result[0]['error']['message'],
            'Key does not match address destination')
        address_assert = self.nodes[1].getaddressinfo(address)
        assert_equal(address_assert['iswatchonly'], False)
        assert_equal(address_assert['ismine'], False)
        assert_equal('timestamp' in address_assert, False)

        # Importing existing watch only address with new timestamp should
        # replace saved timestamp.
        assert_greater_than(timestamp, watchonly_timestamp)
        self.log.info("Should replace previously saved watch only timestamp.")
        result = self.nodes[1].importmulti([{
            "scriptPubKey": {
                "address": watchonly_address,
            },
            "timestamp": "now",
        }])
        assert_equal(result[0]['success'], True)
        address_assert = self.nodes[1].getaddressinfo(watchonly_address)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], timestamp)
        watchonly_timestamp = timestamp

        # restart nodes to check for proper serialization/deserialization of
        # watch only address
        self.stop_nodes()
        self.start_nodes()
        address_assert = self.nodes[1].getaddressinfo(watchonly_address)
        assert_equal(address_assert['iswatchonly'], True)
        assert_equal(address_assert['ismine'], False)
        assert_equal(address_assert['timestamp'], watchonly_timestamp)

        # Bad or missing timestamps
        self.log.info("Should throw on invalid or missing timestamp values")
        assert_raises_rpc_error(-3, 'Missing required timestamp field for key',
                                self.nodes[1].importmulti, [{"scriptPubKey": key.p2pkh_script}])
        assert_raises_rpc_error(-3, 'Expected number or "now" timestamp value for key. got type string',
                                self.nodes[1].importmulti, [{
                                    "scriptPubKey": key.p2pkh_script,
                                    "timestamp": ""
                                }])


if __name__ == '__main__':
    ImportMultiTest().main()
