#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the REST API."""

from codecs import encode
from decimal import Decimal
import http.client
from io import BytesIO
import json
from struct import pack, unpack
import urllib.parse

from test_framework.messages import deser_uint256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    connect_nodes_bi,
    hex_str_to_bytes,
)


def http_get_call(host, port, path, response_object=0):
    """Make a simple HTTP GET request."""
    conn = http.client.HTTPConnection(host, port)
    conn.request('GET', path)

    if response_object:
        return conn.getresponse()

    return conn.getresponse().read().decode('utf-8')


def http_post_call(host, port, path, requestdata='', response_object=0):
    """Make a simple HTTP POST request with a request body."""
    conn = http.client.HTTPConnection(host, port)
    conn.request('POST', path, requestdata)

    if response_object:
        return conn.getresponse()

    return conn.getresponse().read()


class RESTTest (BitcoinTestFramework):
    FORMAT_SEPARATOR = "."

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 3
        self.extra_args = [["-rest"]] * self.num_nodes

    def setup_network(self, split=False):
        super().setup_network()
        connect_nodes_bi(self.nodes[0], self.nodes[2])

    def run_test(self):
        url = urllib.parse.urlparse(self.nodes[0].url)
        self.log.info("Mining blocks...")

        self.nodes[0].generate(1)
        self.sync_all()
        self.nodes[2].generate(100)
        self.sync_all()

        assert_equal(self.nodes[0].getbalance(), 50)

        txid = self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 0.1)
        self.sync_all()
        self.nodes[2].generate(1)
        self.sync_all()
        bb_hash = self.nodes[0].getbestblockhash()

        # Balance now should be 0.1 on node 1
        assert_equal(self.nodes[1].getbalance(), Decimal("0.1"))

        # Load the latest 0.1 tx over the REST API
        json_string = http_get_call(
            url.hostname, url.port, '/rest/tx/' + txid + self.FORMAT_SEPARATOR + "json")
        json_obj = json.loads(json_string)
        # Get the vin to later check for utxo (should be spent by then)
        vintx = json_obj['vin'][0]['txid']
        # Get n of 0.1 outpoint
        n = 0
        for vout in json_obj['vout']:
            if vout['value'] == 0.1:
                n = vout['n']

        #
        # GETUTXOS: query an unspent outpoint #
        #
        json_request = '/' + txid + '-' + str(n)
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)

        # Check chainTip response
        assert_equal(json_obj['chaintipHash'], bb_hash)

        # Make sure there is one utxo
        assert_equal(len(json_obj['utxos']), 1)
        assert_equal(json_obj['utxos'][0]['value'], 0.1)

        #
        # GETUTXOS: now query an already spent outpoint #
        #
        json_request = '/' + vintx + '-0'
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)

        # Check chainTip response
        assert_equal(json_obj['chaintipHash'], bb_hash)

        # Make sure there is no utox in the response because this oupoint has
        # been spent
        assert_equal(len(json_obj['utxos']), 0)

        # Check bitmap
        assert_equal(json_obj['bitmap'], "0")

        #
        # GETUTXOS: now check both with the same request #
        #
        json_request = '/' + txid + '-' + str(n) + '/' + vintx + '-0'
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        assert_equal(len(json_obj['utxos']), 1)
        assert_equal(json_obj['bitmap'], "10")

        # Test binary response
        bb_hash = self.nodes[0].getbestblockhash()

        bin_request = b'\x01\x02'
        bin_request += hex_str_to_bytes(txid)
        bin_request += pack("i", n)
        bin_request += hex_str_to_bytes(vintx)
        bin_request += pack("i", 0)

        bin_response = http_post_call(
            url.hostname, url.port, '/rest/getutxos' + self.FORMAT_SEPARATOR + 'bin', bin_request)
        output = BytesIO()
        output.write(bin_response)
        output.seek(0)
        chain_height = unpack("i", output.read(4))[0]
        response_hash = hex(deser_uint256(output))[2:].zfill(64)

        # Check if getutxo's chaintip during calculation was fine
        assert_equal(bb_hash, response_hash)
        # Chain height must be 102
        assert_equal(chain_height, 102)

        #
        # GETUTXOS: mempool checks #
        #

        # Do a tx and don't sync
        txid = self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 0.1)
        json_string = http_get_call(
            url.hostname, url.port, '/rest/tx/' + txid + self.FORMAT_SEPARATOR + "json")
        json_obj = json.loads(json_string)
        # Get the spent output to later check for utxo (should be spent by then)
        spent = '{}-{}'.format(json_obj['vin'][0]
                               ['txid'], json_obj['vin'][0]['vout'])
        # Get n of 0.1 outpoint
        n = 0
        for vout in json_obj['vout']:
            if vout['value'] == 0.1:
                n = vout['n']
        spending = '{}-{}'.format(txid, n)

        json_request = '/' + spending
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be no outpoint because it has just added to
        # the mempool
        assert_equal(len(json_obj['utxos']), 0)

        json_request = '/checkmempool/' + spending
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be an outpoint because it has just added to
        # the mempool
        assert_equal(len(json_obj['utxos']), 1)

        json_request = '/' + spent
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be an outpoint because its spending tx is not confirmed
        assert_equal(len(json_obj['utxos']), 1)

        json_request = '/checkmempool/' + spent
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be no outpoint because it has just spent (by mempool tx)
        assert_equal(len(json_obj['utxos']), 0)

        self.nodes[0].generate(1)
        self.sync_all()

        json_request = '/' + spending
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be an outpoint because it was mined
        assert_equal(len(json_obj['utxos']), 1)

        json_request = '/checkmempool/' + spending
        json_string = http_get_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        # There should be an outpoint because it was mined
        assert_equal(len(json_obj['utxos']), 1)

        # Do some invalid requests
        json_request = '{"checkmempool'
        response = http_post_call(
            url.hostname, url.port, '/rest/getutxos' + self.FORMAT_SEPARATOR + 'json', json_request, True)
        # Must be a 400 because we send an invalid json request
        assert_equal(response.status, 400)

        json_request = '{"checkmempool'
        response = http_post_call(
            url.hostname, url.port, '/rest/getutxos' + self.FORMAT_SEPARATOR + 'bin', json_request, True)
        # Must be a 400 because we send an invalid bin request
        assert_equal(response.status, 400)

        response = http_post_call(
            url.hostname, url.port, '/rest/getutxos/checkmempool' + self.FORMAT_SEPARATOR + 'bin', '', True)
        # Must be a 400 because we send an invalid bin request
        assert_equal(response.status, 400)

        # Test limits
        json_request = '/checkmempool/'
        for x in range(0, 20):
            json_request += txid + '-' + str(n) + '/'
        json_request = json_request.rstrip("/")
        response = http_post_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json', '', True)
        # Must be a 400 because we exceeding the limits
        assert_equal(response.status, 400)

        json_request = '/checkmempool/'
        for x in range(0, 15):
            json_request += txid + '-' + str(n) + '/'
        json_request = json_request.rstrip("/")
        response = http_post_call(
            url.hostname, url.port, '/rest/getutxos' + json_request + self.FORMAT_SEPARATOR + 'json', '', True)
        # Must be a 200 because we are within the limits
        assert_equal(response.status, 200)

        # Generate block to not affect upcoming tests
        self.nodes[0].generate(
            1)
        self.sync_all()

        #
        # /rest/block/ #
        #

        # Check binary format
        response = http_get_call(
            url.hostname, url.port, '/rest/block/' + bb_hash + self.FORMAT_SEPARATOR + "bin", True)
        assert_equal(response.status, 200)
        assert_greater_than(int(response.getheader('content-length')), 80)
        response_str = response.read()

        # Compare with block header
        response_header = http_get_call(
            url.hostname, url.port, '/rest/headers/1/' + bb_hash + self.FORMAT_SEPARATOR + "bin", True)
        assert_equal(response_header.status, 200)
        assert_equal(int(response_header.getheader('content-length')), 80)
        response_header_str = response_header.read()
        assert_equal(response_str[0:80], response_header_str)

        # Check block hex format
        response_hex = http_get_call(
            url.hostname, url.port, '/rest/block/' + bb_hash + self.FORMAT_SEPARATOR + "hex", True)
        assert_equal(response_hex.status, 200)
        assert_greater_than(int(response_hex.getheader('content-length')), 160)
        response_hex_str = response_hex.read()
        assert_equal(
            encode(response_str, "hex_codec")[0:160], response_hex_str[0:160])

        # Compare with hex block header
        response_header_hex = http_get_call(
            url.hostname, url.port, '/rest/headers/1/' + bb_hash + self.FORMAT_SEPARATOR + "hex", True)
        assert_equal(response_header_hex.status, 200)
        assert_greater_than(
            int(response_header_hex.getheader('content-length')), 160)
        response_header_hex_str = response_header_hex.read()
        assert_equal(response_hex_str[0:160], response_header_hex_str[0:160])
        assert_equal(encode(response_header_str, "hex_codec")[
                     0:160], response_header_hex_str[0:160])

        # Check json format
        block_json_string = http_get_call(
            url.hostname, url.port, '/rest/block/' + bb_hash + self.FORMAT_SEPARATOR + 'json')
        block_json_obj = json.loads(block_json_string)
        assert_equal(block_json_obj['hash'], bb_hash)

        # Compare with json block header
        response_header_json = http_get_call(
            url.hostname, url.port, '/rest/headers/1/' + bb_hash + self.FORMAT_SEPARATOR + "json", True)
        assert_equal(response_header_json.status, 200)
        response_header_json_str = response_header_json.read().decode('utf-8')
        json_obj = json.loads(response_header_json_str, parse_float=Decimal)
        # Ensure that there is one header in the json response
        assert_equal(len(json_obj), 1)
        # Request/response hash should be the same
        assert_equal(json_obj[0]['hash'], bb_hash)

        # Compare with normal RPC block response
        rpc_block_json = self.nodes[0].getblock(bb_hash)
        for key in ['hash', 'confirmations', 'height', 'version', 'merkleroot', 'time', 'nonce', 'bits', 'difficulty', 'chainwork', 'previousblockhash']:
            assert_equal(json_obj[0][key], rpc_block_json[key])

        # See if we can get 5 headers in one response
        self.nodes[1].generate(5)
        self.sync_all()
        response_header_json = http_get_call(
            url.hostname, url.port, '/rest/headers/5/' + bb_hash + self.FORMAT_SEPARATOR + "json", True)
        assert_equal(response_header_json.status, 200)
        response_header_json_str = response_header_json.read().decode('utf-8')
        json_obj = json.loads(response_header_json_str)
        # Now we should have 5 header objects
        assert_equal(len(json_obj), 5)

        # Do tx test
        tx_hash = block_json_obj['tx'][0]['txid']
        json_string = http_get_call(
            url.hostname, url.port, '/rest/tx/' + tx_hash + self.FORMAT_SEPARATOR + "json")
        json_obj = json.loads(json_string)
        assert_equal(json_obj['txid'], tx_hash)

        # Check hex format response
        hex_string = http_get_call(
            url.hostname, url.port, '/rest/tx/' + tx_hash + self.FORMAT_SEPARATOR + "hex", True)
        assert_equal(hex_string.status, 200)
        assert_greater_than(int(response.getheader('content-length')), 10)

        # Check block tx details
        # Let's make 3 tx and mine them on node 1
        txs = []
        txs.append(self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 11))
        txs.append(self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 11))
        txs.append(self.nodes[0].sendtoaddress(
            self.nodes[2].getnewaddress(), 11))
        self.sync_all()

        # Check that there are exactly 3 transactions in the TX memory pool
        # before generating the block
        json_string = http_get_call(
            url.hostname, url.port, '/rest/mempool/info' + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        assert_equal(json_obj['size'], 3)
        # The size of the memory pool should be greater than 3x ~100 bytes
        assert_greater_than(json_obj['bytes'], 300)

        # Check that there are our submitted transactions in the TX memory pool
        json_string = http_get_call(
            url.hostname, url.port, '/rest/mempool/contents' + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        for i, tx in enumerate(txs):
            assert_equal(tx in json_obj, True)
            assert_equal(json_obj[tx]['spentby'], txs[i + 1:i + 2])
            assert_equal(json_obj[tx]['depends'], txs[i - 1:i])

        # Now mine the transactions
        newblockhash = self.nodes[1].generate(1)
        self.sync_all()

        # Check if the 3 tx show up in the new block
        json_string = http_get_call(
            url.hostname, url.port, '/rest/block/' + newblockhash[0] + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        for tx in json_obj['tx']:
            if not 'coinbase' in tx['vin'][0]:  # exclude coinbase
                assert_equal(tx['txid'] in txs, True)

        # Check the same but without tx details
        json_string = http_get_call(
            url.hostname, url.port, '/rest/block/notxdetails/' + newblockhash[0] + self.FORMAT_SEPARATOR + 'json')
        json_obj = json.loads(json_string)
        for tx in txs:
            assert_equal(tx in json_obj['tx'], True)

        # Test rest bestblock
        bb_hash = self.nodes[0].getbestblockhash()

        json_string = http_get_call(
            url.hostname, url.port, '/rest/chaininfo.json')
        json_obj = json.loads(json_string)
        assert_equal(json_obj['bestblockhash'], bb_hash)


if __name__ == '__main__':
    RESTTest().main()
