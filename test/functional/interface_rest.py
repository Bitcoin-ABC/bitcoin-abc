# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the REST API."""

import http.client
import json
import urllib.parse
from decimal import Decimal
from enum import Enum
from io import BytesIO
from struct import pack, unpack

from test_framework.messages import BLOCK_HEADER_SIZE
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_greater_than_or_equal,
)


class ReqType(Enum):
    JSON = 1
    BIN = 2
    HEX = 3


class RetType(Enum):
    OBJ = 1
    BYTES = 2
    JSON = 3


def filter_output_indices_by_value(vouts, value):
    for vout in vouts:
        if vout["value"] == value:
            yield vout["n"]


class RESTTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [["-rest"], []]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def test_rest_request(
        self,
        uri,
        http_method="GET",
        req_type=ReqType.JSON,
        body="",
        status=200,
        ret_type=RetType.JSON,
    ):
        rest_uri = f"/rest{uri}"
        if req_type == ReqType.JSON:
            rest_uri += ".json"
        elif req_type == ReqType.BIN:
            rest_uri += ".bin"
        elif req_type == ReqType.HEX:
            rest_uri += ".hex"

        conn = http.client.HTTPConnection(self.url.hostname, self.url.port)
        self.log.debug(f"{http_method} {rest_uri} {body}")
        if http_method == "GET":
            conn.request("GET", rest_uri)
        elif http_method == "POST":
            conn.request("POST", rest_uri, body)
        resp = conn.getresponse()

        assert_equal(resp.status, status)

        if ret_type == RetType.OBJ:
            return resp
        elif ret_type == RetType.BYTES:
            return resp.read()
        elif ret_type == RetType.JSON:
            return json.loads(resp.read().decode("utf-8"), parse_float=Decimal)

    def run_test(self):
        self.url = urllib.parse.urlparse(self.nodes[0].url)
        self.log.info("Mine blocks and send Bitcoin Cash to node 1")

        # Random address so node1's balance doesn't increase
        not_related_address = "2MxqoHEdNQTyYeX1mHcbrrpzgojbosTpCvJ"

        self.generate(self.nodes[0], 1)
        self.generatetoaddress(self.nodes[1], 100, not_related_address)

        assert_equal(self.nodes[0].getbalance(), 50000000)

        txid = self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 100000)
        self.sync_all()

        self.log.info("Test the /tx URI")

        json_obj = self.test_rest_request(f"/tx/{txid}")
        assert_equal(json_obj["txid"], txid)

        # Check hex format response
        hex_response = self.test_rest_request(
            f"/tx/{txid}", req_type=ReqType.HEX, ret_type=RetType.OBJ
        )
        assert_greater_than_or_equal(
            int(hex_response.getheader("content-length")), json_obj["size"] * 2
        )

        # Get the vin to later check for utxo (should be spent by then)
        spent = (json_obj["vin"][0]["txid"], json_obj["vin"][0]["vout"])
        # Get n of 100_000 XEC outpoint
        (n,) = filter_output_indices_by_value(json_obj["vout"], Decimal("100000"))
        spending = (txid, n)

        self.log.info("Query an unspent TXO using the /getutxos URI")

        self.generatetoaddress(self.nodes[1], 1, not_related_address)
        bb_hash = self.nodes[0].getbestblockhash()

        assert_equal(self.nodes[1].getbalance(), Decimal("100000"))

        # Check chainTip response
        json_obj = self.test_rest_request(f"/getutxos/{txid}-{n}")
        assert_equal(json_obj["chaintipHash"], bb_hash)

        # Make sure there is one utxo
        assert_equal(len(json_obj["utxos"]), 1)
        assert_equal(json_obj["utxos"][0]["value"], Decimal("100000"))

        self.log.info("Query a spent TXO using the /getutxos URI")

        json_obj = self.test_rest_request(f"/getutxos/{spent[0]}-{spent[1]}")

        # Check chainTip response
        assert_equal(json_obj["chaintipHash"], bb_hash)

        # Make sure there is no utxo in the response because this outpoint has
        # been spent
        assert_equal(len(json_obj["utxos"]), 0)

        # Check bitmap
        assert_equal(json_obj["bitmap"], "0")

        self.log.info("Query two TXOs using the /getutxos URI")

        json_obj = self.test_rest_request(f"/getutxos/{txid}-{n}/{spent[0]}-{spent[1]}")

        assert_equal(len(json_obj["utxos"]), 1)
        assert_equal(json_obj["bitmap"], "10")

        self.log.info("Query the TXOs using the /getutxos URI with a binary response")

        bin_request = b"\x01\x02"
        for txid, n in [spending, spent]:
            bin_request += bytes.fromhex(txid)
            bin_request += pack("i", n)

        bin_response = self.test_rest_request(
            "/getutxos",
            http_method="POST",
            req_type=ReqType.BIN,
            body=bin_request,
            ret_type=RetType.BYTES,
        )
        output = BytesIO(bin_response)
        (chain_height,) = unpack("<i", output.read(4))
        response_hash = output.read(32)[::-1].hex()

        # Check if getutxo's chaintip during calculation was fine
        assert_equal(bb_hash, response_hash)
        # Chain height must be 102
        assert_equal(chain_height, 102)

        self.log.info("Test the /getutxos URI with and without /checkmempool")
        # Create a transaction, check that it's found with /checkmempool, but
        # not found without. Then confirm the transaction and check that it's
        # found with or without /checkmempool.

        # Do a tx and don't sync
        txid = self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 100000)
        json_obj = self.test_rest_request(f"/tx/{txid}")
        # Get the spent output to later check for utxo (should be spent by
        # then)
        spent = (json_obj["vin"][0]["txid"], json_obj["vin"][0]["vout"])
        # Get n of 100_000 XEC outpoint
        (n,) = filter_output_indices_by_value(json_obj["vout"], Decimal("100000"))

        json_obj = self.test_rest_request(f"/getutxos/{txid}-{n}")
        assert_equal(len(json_obj["utxos"]), 0)

        json_obj = self.test_rest_request(f"/getutxos/checkmempool/{txid}-{n}")
        assert_equal(len(json_obj["utxos"]), 1)

        json_obj = self.test_rest_request(f"/getutxos/{spent[0]}-{spent[1]}")
        assert_equal(len(json_obj["utxos"]), 1)

        json_obj = self.test_rest_request(
            f"/getutxos/checkmempool/{spent[0]}-{spent[1]}"
        )
        assert_equal(len(json_obj["utxos"]), 0)

        self.generate(self.nodes[0], 1)

        json_obj = self.test_rest_request(f"/getutxos/{txid}-{n}")
        assert_equal(len(json_obj["utxos"]), 1)

        json_obj = self.test_rest_request(f"/getutxos/checkmempool/{txid}-{n}")
        assert_equal(len(json_obj["utxos"]), 1)

        # Do some invalid requests
        self.test_rest_request(
            "/getutxos",
            http_method="POST",
            req_type=ReqType.JSON,
            body='{"checkmempool',
            status=400,
            ret_type=RetType.OBJ,
        )
        self.test_rest_request(
            "/getutxos",
            http_method="POST",
            req_type=ReqType.BIN,
            body='{"checkmempool',
            status=400,
            ret_type=RetType.OBJ,
        )
        self.test_rest_request(
            "/getutxos/checkmempool",
            http_method="POST",
            req_type=ReqType.JSON,
            status=400,
            ret_type=RetType.OBJ,
        )

        # Test limits
        long_uri = "/".join([f"{txid}-{n_}" for n_ in range(20)])
        self.test_rest_request(
            f"/getutxos/checkmempool/{long_uri}",
            http_method="POST",
            status=400,
            ret_type=RetType.OBJ,
        )

        long_uri = "/".join([f"{txid}-{n_}" for n_ in range(15)])
        self.test_rest_request(
            f"/getutxos/checkmempool/{long_uri}", http_method="POST", status=200
        )

        # Generate block to not affect upcoming tests
        self.generate(self.nodes[0], 1)

        self.log.info("Test the /block, /blockhashbyheight and /headers URIs")
        bb_hash = self.nodes[0].getbestblockhash()

        # Check result if block does not exists
        assert_equal(
            self.test_rest_request(
                "/headers/1/0000000000000000000000000000000000000000000000000000000000000000"
            ),
            [],
        )
        self.test_rest_request(
            "/block/0000000000000000000000000000000000000000000000000000000000000000",
            status=404,
            ret_type=RetType.OBJ,
        )

        # Check result if block is not in the active chain
        self.nodes[0].invalidateblock(bb_hash)
        assert_equal(self.test_rest_request(f"/headers/1/{bb_hash}"), [])
        self.test_rest_request(f"/block/{bb_hash}")
        self.nodes[0].reconsiderblock(bb_hash)

        # Check binary format
        response = self.test_rest_request(
            f"/block/{bb_hash}", req_type=ReqType.BIN, ret_type=RetType.OBJ
        )
        assert_greater_than(
            int(response.getheader("content-length")), BLOCK_HEADER_SIZE
        )
        response_bytes = response.read()

        # Compare with block header
        response_header = self.test_rest_request(
            f"/headers/1/{bb_hash}", req_type=ReqType.BIN, ret_type=RetType.OBJ
        )
        assert_equal(
            int(response_header.getheader("content-length")), BLOCK_HEADER_SIZE
        )
        response_header_bytes = response_header.read()
        assert_equal(response_bytes[0:BLOCK_HEADER_SIZE], response_header_bytes)

        # Check block hex format
        response_hex = self.test_rest_request(
            f"/block/{bb_hash}", req_type=ReqType.HEX, ret_type=RetType.OBJ
        )
        assert_greater_than(
            int(response_hex.getheader("content-length")), BLOCK_HEADER_SIZE * 2
        )
        response_hex_bytes = response_hex.read().strip(b"\n")
        assert_equal(response_bytes.hex().encode(), response_hex_bytes)

        # Compare with hex block header
        response_header_hex = self.test_rest_request(
            f"/headers/1/{bb_hash}", req_type=ReqType.HEX, ret_type=RetType.OBJ
        )
        assert_greater_than(
            int(response_header_hex.getheader("content-length")), BLOCK_HEADER_SIZE * 2
        )
        response_header_hex_bytes = response_header_hex.read(BLOCK_HEADER_SIZE * 2)
        assert_equal(
            response_bytes[:BLOCK_HEADER_SIZE].hex().encode(), response_header_hex_bytes
        )

        # Check json format
        block_json_obj = self.test_rest_request(f"/block/{bb_hash}")
        assert_equal(block_json_obj["hash"], bb_hash)
        assert_equal(
            self.test_rest_request(f"/blockhashbyheight/{block_json_obj['height']}")[
                "blockhash"
            ],
            bb_hash,
        )

        # Check hex/bin format
        resp_hex = self.test_rest_request(
            f"/blockhashbyheight/{block_json_obj['height']}",
            req_type=ReqType.HEX,
            ret_type=RetType.OBJ,
        )
        assert_equal(resp_hex.read().decode("utf-8").rstrip(), bb_hash)
        resp_bytes = self.test_rest_request(
            f"/blockhashbyheight/{block_json_obj['height']}",
            req_type=ReqType.BIN,
            ret_type=RetType.BYTES,
        )
        blockhash = resp_bytes[::-1].hex()
        assert_equal(blockhash, bb_hash)

        # Check invalid blockhashbyheight requests
        resp = self.test_rest_request(
            "/blockhashbyheight/abc", ret_type=RetType.OBJ, status=400
        )
        assert_equal(resp.read().decode("utf-8").rstrip(), "Invalid height: abc")
        resp = self.test_rest_request(
            "/blockhashbyheight/1000000", ret_type=RetType.OBJ, status=404
        )
        assert_equal(resp.read().decode("utf-8").rstrip(), "Block height out of range")
        resp = self.test_rest_request(
            "/blockhashbyheight/-1", ret_type=RetType.OBJ, status=400
        )
        assert_equal(resp.read().decode("utf-8").rstrip(), "Invalid height: -1")
        self.test_rest_request("/blockhashbyheight/", ret_type=RetType.OBJ, status=400)

        # Compare with json block header
        json_obj = self.test_rest_request(f"/headers/1/{bb_hash}")
        # Ensure that there is one header in the json response
        assert_equal(len(json_obj), 1)
        # Request/response hash should be the same
        assert_equal(json_obj[0]["hash"], bb_hash)

        # Compare with normal RPC block response
        rpc_block_json = self.nodes[0].getblock(bb_hash)
        for key in [
            "hash",
            "confirmations",
            "height",
            "version",
            "merkleroot",
            "time",
            "nonce",
            "bits",
            "difficulty",
            "chainwork",
            "previousblockhash",
        ]:
            assert_equal(json_obj[0][key], rpc_block_json[key])

        # See if we can get 5 headers in one response
        self.generate(self.nodes[1], 5)
        json_obj = self.test_rest_request(f"/headers/5/{bb_hash}")
        # Now we should have 5 header objects
        assert_equal(len(json_obj), 5)

        self.log.info("Test tx inclusion in the /mempool and /block URIs")

        # Make 3 tx and mine them on node 1
        txs = []
        txs.append(self.nodes[0].sendtoaddress(not_related_address, 11))
        txs.append(self.nodes[0].sendtoaddress(not_related_address, 11))
        txs.append(self.nodes[0].sendtoaddress(not_related_address, 11))
        self.sync_all()

        # Check that there are exactly 3 transactions in the TX memory pool
        # before generating the block
        json_obj = self.test_rest_request("/mempool/info")
        assert_equal(json_obj["size"], 3)
        # The size of the memory pool should be greater than 3x ~100 bytes
        assert_greater_than(json_obj["bytes"], 300)

        # Check that there are our submitted transactions in the TX memory pool
        json_obj = self.test_rest_request("/mempool/contents")
        for i, tx in enumerate(txs):
            assert tx in json_obj
            assert_equal(json_obj[tx]["spentby"], txs[i + 1 : i + 2])
            assert_equal(json_obj[tx]["depends"], txs[i - 1 : i])

        # Now mine the transactions
        newblockhash = self.generate(self.nodes[1], 1)

        # Check if the 3 tx show up in the new block
        json_obj = self.test_rest_request(f"/block/{newblockhash[0]}")
        non_coinbase_txs = {
            tx["txid"] for tx in json_obj["tx"] if "coinbase" not in tx["vin"][0]
        }
        assert_equal(non_coinbase_txs, set(txs))

        # Check the same but without tx details
        json_obj = self.test_rest_request(f"/block/notxdetails/{newblockhash[0]}")
        for tx in txs:
            assert tx in json_obj["tx"]

        self.log.info("Test the /chaininfo URI")

        bb_hash = self.nodes[0].getbestblockhash()

        json_obj = self.test_rest_request("/chaininfo")
        assert_equal(json_obj["bestblockhash"], bb_hash)


if __name__ == "__main__":
    RESTTest().main()
