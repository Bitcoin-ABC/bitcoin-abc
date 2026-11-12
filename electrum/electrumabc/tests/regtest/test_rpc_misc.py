# Electrum ABC - lightweight eCash client
# Copyright (C) 2023-present The Electrum ABC developers
# Copyright (C) 2023 The Electron Cash Developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import unittest
from decimal import Decimal

from jsonrpcclient import request

from ...constants import XEC
from .framework import ElectrumABCTestCase

# See https://docs.pytest.org/en/7.1.x/how-to/fixtures.html
from .util import (  # noqa: F401
    EC_DAEMON_RPC_URL,
    get_block_subsidy,
    poll_for_answer,
    rpc,
    wait_for_len,
    wait_until,
)


class TestRPCMisc(ElectrumABCTestCase):
    def test_getunusedaddress(self):
        """Verify the `getunusedaddress` RPC"""
        result = rpc("getunusedaddress")

        # The daemon returns an address with a prefix.
        prefix = "ecregtest:"
        # Check that the length is 42 and starts with 'q'
        assert len(result) == len(prefix) + 42
        assert result.startswith(prefix + "q")

    def test_getservers(self):
        """Verify the `getservers` RPC"""
        result = rpc("getservers")

        # Only one server in this setup
        assert len(result) == 1

    def test_balance(self):
        """Verify the `getbalance` RPC"""
        addr = rpc("getunusedaddress")

        tip_height = self.node.getblockchaininfo()["blocks"]
        coinbase_amount = XEC.satoshis_to_unit(get_block_subsidy(tip_height + 1))

        self.generatetoaddress(1, addr)

        def wallet_has_expected_amount(amount_status: str, amount: Decimal) -> bool:
            """Check the wallet balance for a specific amount.
            The amount is in XEC.
            amount_status can be one of "unmatured", "unconfirmed" or "confirmed"
            """
            result = rpc("getbalance")
            return amount_status in result and Decimal(result[amount_status]) == amount

        wait_until(lambda: wallet_has_expected_amount("unmatured", coinbase_amount))

        self.node.sendtoaddress(addr, 10_000_000)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("unconfirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["unconfirmed"] == "10000000"
        )

        self.generatetoaddress(1, self.node.getnewaddress())
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("confirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["confirmed"] == "10000000"
        )

        self.generatetoaddress(97, self.node.getnewaddress())
        self.node.sendtoaddress(addr, 10_000_000)
        result = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("getbalance"),
            expected_answer=("unconfirmed", "10000000"),
        )
        assert (
            Decimal(result["unmatured"]) == coinbase_amount
            and result["confirmed"] == "10000000"
            and result["unconfirmed"] == "10000000"
        )

        self.generatetoaddress(1, self.node.getnewaddress())
        wait_until(
            lambda: wallet_has_expected_amount(
                "confirmed", coinbase_amount + 20_000_000
            )
        )

    def test_payto_broadcast_getaddresshistory(self):
        """Use the payto and broadcast commands and check the resulting  wallet UTXOs
        with getaddresshistory"""
        addr = rpc("getunusedaddress")

        self.node.sendtoaddress(addr, 10_000_000)

        hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 1)
        txid0 = hist[0]["tx_hash"]

        tx_hex = rpc(
            "payto",
            destination=addr,
            amount=1_000,
            addtransaction=True,
        )["hex"]
        success, txid1 = rpc("broadcast", tx=tx_hex)
        assert success

        tx_hex = rpc(
            "payto",
            destination=addr,
            amount=2_000,
            addtransaction=True,
        )["hex"]
        success, txid2 = rpc("broadcast", tx=tx_hex)
        assert success

        hist = wait_for_len(request("getaddresshistory", params={"address": addr}), 3)
        assert {txid0, txid1, txid2} == {h["tx_hash"] for h in hist}

        total_fee = sum(XEC.satoshis_to_unit(tx["fee"]) for tx in hist[1:])
        coins = rpc("listunspent")
        assert {Decimal(coin["value"]) for coin in coins} == {
            Decimal(1000),
            Decimal(2000),
            Decimal(9_997_000) - total_fee,
        }

    def test_deserialize_p2pkh(self):
        # txid f8c9d5fea8bda2ba3514c5d316a68d7439c04de29b0404eaa197e2da871712f6
        tx = rpc(
            "deserialize",
            tx=(
                "0100000001f184f3128dc56f6575cf876c77657af21888fab6e602d1e3df7aa24"
                "d1d36c632010000006a47304402207f0066e8c48bc73fbd58045b9ce7272d5cd7"
                "1fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392"
                "c2dfa8e24b7673546b5ed02050639a8412103562731a08eb23e6260b516c4564f"
                "746033e9080bc9f61ad2158a63927500b8b1ffffffff02a6ca360c00000000197"
                "6a9142560d750b51eebd180cef831b4a5c7aafc487bbd88acc2b64d0300000000"
                "1976a914231f7087937684790d1049294f3aef9cfb7b05dd88ac00000000"
            ),
        )
        assert tx == {
            "version": 1,
            "lockTime": 0,
            "inputs": [
                {
                    "prevout_hash": "32c6361d4da27adfe3d102e6b6fa8818f27a65776c87cf75656fc58d12f384f1",
                    "prevout_n": 1,
                    "sequence": 4294967295,
                    "address": "ecregtest:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5nf563x23",
                    "scriptSig": "47304402207f0066e8c48bc73fbd58045b9ce7272d5cd71fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392c2dfa8e24b7673546b5ed02050639a8412103562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1",
                    "x_pubkeys": [
                        "03562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1"
                    ],
                    "pubkeys": [
                        "03562731a08eb23e6260b516c4564f746033e9080bc9f61ad2158a63927500b8b1"
                    ],
                    "signatures": [
                        "304402207f0066e8c48bc73fbd58045b9ce7272d5cd71fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392c2dfa8e24b7673546b5ed02050639a841"
                    ],
                    "num_sig": 1,
                    "type": "p2pkh",
                }
            ],
            "outputs": [
                {
                    "value": 204917414,
                    "type": 0,
                    "address": "ecregtest:qqjkp46sk50wh5vqemurrd99c740cjrmh52e6vmeq9",
                    "scriptPubKey": "76a9142560d750b51eebd180cef831b4a5c7aafc487bbd88ac",
                    "prevout_n": 0,
                },
                {
                    "value": 55424706,
                    "type": 0,
                    "address": "ecregtest:qq337uy8jdmgg7gdzpyjjne6a7w0k7c9m5nf563x23",
                    "scriptPubKey": "76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac",
                    "prevout_n": 1,
                },
            ],
        }, f"actual tx: {tx}"

    def test_deserialize_p2pk(self):
        # txid f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16
        # (first non-coinbase p2pk transaction)
        tx = rpc(
            "deserialize",
            tx=(
                "0100000001c997a5e56e104102fa209c6a852dd90660a20b2d9c352423ed"
                "ce25857fcd3704000000004847304402204e45e16932b8af514961a1d3a1"
                "a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de48"
                "60a4acdd12909d831cc56cbbac4622082221a8768d1d0901ffffffff0200"
                "ca9a3b00000000434104ae1a62fe09c5f51b13905f07f06b99a2f7159b22"
                "25f374cd378d71302fa28414e7aab37397f554a7df5f142c21c1b7303b8a"
                "0626f1baded5c72a704f7e6cd84cac00286bee0000000043410411db93e1"
                "dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0"
                "eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3"
                "ac00000000"
            ),
        )
        assert tx == {
            "version": 1,
            "lockTime": 0,
            "inputs": [
                {
                    "prevout_hash": "0437cd7f8525ceed2324359c2d0ba26006d92d856a9c20fa0241106ee5a597c9",
                    "prevout_n": 0,
                    "sequence": 4294967295,
                    "address": None,
                    "scriptSig": "47304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d0901",
                    "x_pubkeys": ["(pubkey)"],
                    "pubkeys": ["(pubkey)"],
                    "signatures": [
                        "304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d0901"
                    ],
                    "num_sig": 1,
                    "type": "p2pk",
                }
            ],
            "outputs": [
                {
                    "value": 1000000000,
                    "type": 1,
                    "address": "04ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d71302fa28414e7aab37397f554a7df5f142c21c1b7303b8a0626f1baded5c72a704f7e6cd84c",
                    "scriptPubKey": "4104ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d71302fa28414e7aab37397f554a7df5f142c21c1b7303b8a0626f1baded5c72a704f7e6cd84cac",
                    "prevout_n": 0,
                },
                {
                    "value": 4000000000,
                    "type": 1,
                    "address": "0411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3",
                    "scriptPubKey": "410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3ac",
                    "prevout_n": 1,
                },
            ],
        }, f"actual tx: {tx}"

    def test_deserialize_p2sh(self):
        # txid a0f1aaa2fb4582c89e0511df0374a5a2833bf95f7314f4a51b55b7b71e90ce0f
        # (first p2sh transaction to also be spent later)
        tx = rpc(
            "deserialize",
            tx=(
                "01000000014ce7153d92e3b24d9eea31f8cf391c3fb4c39f7742b341b2d3"
                "6c6367e7546474000000006c493046022100c554360535b2ad3b1cb1b966"
                "a87807f7a7e45fa485348d662a1e7413dced8471022100d6bcfc4385b7ac"
                "41ca3968a73c4a28e38879192c3db1286b36e59ec9fce52bbd012103c96e"
                "3a9e63986801269d5f278246ed7cdc2d392595d0a25b102e04598f4b4fa9"
                "ffffffff02cb871a00000000001976a914c02ebae82202119f23f330781f"
                "f26b303edb7dbd88ac809698000000000017a914748284390f9e263a4b76"
                "6a75d0633c50426eb8758700000000"
            ),
        )
        assert tx == {
            "version": 1,
            "lockTime": 0,
            "inputs": [
                {
                    "address": "ecregtest:qq3pts8up8hhct2fwdsw6pdcufsczzuh5gwr9ylz00",
                    "num_sig": 1,
                    "prevout_hash": "746454e767636cd3b241b342779fc3b43f1c39cff831ea9e4db2e3923d15e74c",
                    "prevout_n": 0,
                    "pubkeys": [
                        "03c96e3a9e63986801269d5f278246ed7cdc2d392595d0a25b102e04598f4b4fa9"
                    ],
                    "scriptSig": "493046022100c554360535b2ad3b1cb1b966a87807f7a7e45fa485348d662a1e7413dced8471022100d6bcfc4385b7ac41ca3968a73c4a28e38879192c3db1286b36e59ec9fce52bbd012103c96e3a9e63986801269d5f278246ed7cdc2d392595d0a25b102e04598f4b4fa9",
                    "sequence": 4294967295,
                    "signatures": [
                        "3046022100c554360535b2ad3b1cb1b966a87807f7a7e45fa485348d662a1e7413dced8471022100d6bcfc4385b7ac41ca3968a73c4a28e38879192c3db1286b36e59ec9fce52bbd01"
                    ],
                    "type": "p2pkh",
                    "x_pubkeys": [
                        "03c96e3a9e63986801269d5f278246ed7cdc2d392595d0a25b102e04598f4b4fa9"
                    ],
                }
            ],
            "outputs": [
                {
                    "address": "ecregtest:qrqzawhgygppr8er7vc8s8ljdvcrakmah5lz5u9kcr",
                    "prevout_n": 0,
                    "scriptPubKey": "76a914c02ebae82202119f23f330781ff26b303edb7dbd88ac",
                    "type": 0,
                    "value": 1738699,
                },
                {
                    "address": "ecregtest:pp6g9ppep70zvwjtwe48t5rr83gyym4cw5w95evcen",
                    "prevout_n": 1,
                    "scriptPubKey": "a914748284390f9e263a4b766a75d0633c50426eb87587",
                    "type": 0,
                    "value": 10000000,
                },
            ],
        }, f"actual tx: {tx}"

        # txid 4d8eabfc8e6c266fb0ccd815d37dd69246da634df0effd5a5c922e4ec37880f6
        # spends the above p2sh output,  1-of-2 multisig
        tx = rpc(
            "deserialize",
            tx=(
                "0100000003a5ee1a0fd80dfbc3142df136ab56e082b799c13aa977c048bd"
                "f8f61bd158652c000000006b48304502203b0160de302cded63589a88214"
                "fe499a25aa1d86a2ea09129945cd632476a12c022100c77727daf0718307"
                "e184d55df620510cf96d4b5814ae3258519c0482c1ca82fa0121024f4102"
                "c1f1cf662bf99f2b034eb03edd4e6c96793cb9445ff519aab580649120ff"
                "ffffff0fce901eb7b7551ba5f414735ff93b83a2a57403df11059ec88245"
                "fba2aaf1a0000000006a47304402204089adb8a1de1a9e22aa43b94d54f1"
                "e54dc9bea745d57df1a633e03dd9ede3c2022037d1e53e911ed721218602"
                "8f2e085f70524930e22eb6184af090ba4ab779a5b90121030644cb394bf3"
                "81dbec91680bdf1be1986ad93cfb35603697353199fb285a119effffffff"
                "0fce901eb7b7551ba5f414735ff93b83a2a57403df11059ec88245fba2aa"
                "f1a0010000009300493046022100a07b2821f96658c938fa9c68950af0e6"
                "9f3b2ce5f8258b3a6ad254d4bc73e11e022100e82fab8df3f7e7a28e91b3"
                "609f91e8ebf663af3a4dc2fd2abd954301a5da67e701475121022afc20bf"
                "379bc96a2f4e9e63ffceb8652b2b6a097f63fbee6ecec2a49a48010e2103"
                "a767c7221e9f15f870f1ad9311f5ab937d79fcaeee15bb2c722bca515581"
                "b4c052aeffffffff02a3b81b00000000001976a914ea00917f128f569cbd"
                "f79da5efcd9001671ab52c88ac80969800000000001976a9143dec0ead28"
                "9be1afa8da127a7dbdd425a05e25f688ac00000000"
            ),
        )

        redeem_script = (
            "00493046022100a07b2821f96658c938fa9c68950af0e69f3b2ce5f8258b3a6ad254d4bc"
            "73e11e022100e82fab8df3f7e7a28e91b3609f91e8ebf663af3a4dc2fd2abd954301a5da"
            "67e701475121022afc20bf379bc96a2f4e9e63ffceb8652b2b6a097f63fbee6ecec2a49a"
            "48010e2103a767c7221e9f15f870f1ad9311f5ab937d79fcaeee15bb2c722bca515581b4"
            "c052ae"
        )

        assert tx == {
            "version": 1,
            "lockTime": 0,
            "inputs": [
                {
                    "prevout_hash": "2c6558d11bf6f8bd48c077a93ac199b782e056ab36f12d14c3fb0dd80f1aeea5",
                    "prevout_n": 0,
                    "sequence": 4294967295,
                    "address": "ecregtest:qraqg5axnqmf9zzkjhcgayqhulv8g4ltvypndhwkpn",
                    "scriptSig": "48304502203b0160de302cded63589a88214fe499a25aa1d86a2ea09129945cd632476a12c022100c77727daf0718307e184d55df620510cf96d4b5814ae3258519c0482c1ca82fa0121024f4102c1f1cf662bf99f2b034eb03edd4e6c96793cb9445ff519aab580649120",
                    "x_pubkeys": [
                        "024f4102c1f1cf662bf99f2b034eb03edd4e6c96793cb9445ff519aab580649120"
                    ],
                    "pubkeys": [
                        "024f4102c1f1cf662bf99f2b034eb03edd4e6c96793cb9445ff519aab580649120"
                    ],
                    "signatures": [
                        "304502203b0160de302cded63589a88214fe499a25aa1d86a2ea09129945cd632476a12c022100c77727daf0718307e184d55df620510cf96d4b5814ae3258519c0482c1ca82fa01"
                    ],
                    "num_sig": 1,
                    "type": "p2pkh",
                },
                {
                    "prevout_hash": "a0f1aaa2fb4582c89e0511df0374a5a2833bf95f7314f4a51b55b7b71e90ce0f",
                    "prevout_n": 0,
                    "sequence": 4294967295,
                    "address": "ecregtest:qrqzawhgygppr8er7vc8s8ljdvcrakmah5lz5u9kcr",
                    "scriptSig": "47304402204089adb8a1de1a9e22aa43b94d54f1e54dc9bea745d57df1a633e03dd9ede3c2022037d1e53e911ed7212186028f2e085f70524930e22eb6184af090ba4ab779a5b90121030644cb394bf381dbec91680bdf1be1986ad93cfb35603697353199fb285a119e",
                    "x_pubkeys": [
                        "030644cb394bf381dbec91680bdf1be1986ad93cfb35603697353199fb285a119e"
                    ],
                    "pubkeys": [
                        "030644cb394bf381dbec91680bdf1be1986ad93cfb35603697353199fb285a119e"
                    ],
                    "signatures": [
                        "304402204089adb8a1de1a9e22aa43b94d54f1e54dc9bea745d57df1a633e03dd9ede3c2022037d1e53e911ed7212186028f2e085f70524930e22eb6184af090ba4ab779a5b901"
                    ],
                    "num_sig": 1,
                    "type": "p2pkh",
                },
                {
                    "prevout_hash": "a0f1aaa2fb4582c89e0511df0374a5a2833bf95f7314f4a51b55b7b71e90ce0f",
                    "prevout_n": 1,
                    "sequence": 4294967295,
                    "address": "ecregtest:pp6g9ppep70zvwjtwe48t5rr83gyym4cw5w95evcen",
                    "scriptSig": redeem_script,
                    "x_pubkeys": [
                        "022afc20bf379bc96a2f4e9e63ffceb8652b2b6a097f63fbee6ecec2a49a48010e",
                        "03a767c7221e9f15f870f1ad9311f5ab937d79fcaeee15bb2c722bca515581b4c0",
                    ],
                    "pubkeys": [
                        "022afc20bf379bc96a2f4e9e63ffceb8652b2b6a097f63fbee6ecec2a49a48010e",
                        "03a767c7221e9f15f870f1ad9311f5ab937d79fcaeee15bb2c722bca515581b4c0",
                    ],
                    "signatures": [
                        "3046022100a07b2821f96658c938fa9c68950af0e69f3b2ce5f8258b3a6ad254d4bc73e11e022100e82fab8df3f7e7a28e91b3609f91e8ebf663af3a4dc2fd2abd954301a5da67e701"
                    ],
                    "num_sig": 1,
                    "type": "p2sh",
                    "redeemScript": redeem_script,
                },
            ],
            "outputs": [
                {
                    "value": 1816739,
                    "type": 0,
                    "address": "ecregtest:qr4qpytlz284d89a77w6tm7djqqkwx449s3fzaq0gs",
                    "scriptPubKey": "76a914ea00917f128f569cbdf79da5efcd9001671ab52c88ac",
                    "prevout_n": 0,
                },
                {
                    "value": 10000000,
                    "type": 0,
                    "address": "ecregtest:qq77cr4d9zd7rtagmgf85lda6sj6qh397cdjlrp6my",
                    "scriptPubKey": "76a9143dec0ead289be1afa8da127a7dbdd425a05e25f688ac",
                    "prevout_n": 1,
                },
            ],
        }, f"actual tx: {tx}"

    def test_signtransaction(self):
        """Create an unsigned transaction, sign and broadcast it"""
        addr = rpc("getunusedaddress")

        self.node.sendtoaddress(addr, 1_100)

        wait_for_len(request("history"), 1)

        unsigned_tx_hex = rpc(
            "payto",
            destination=addr,
            amount=1_000,
            unsigned=True,
        )["hex"]

        signed_tx_hex = rpc("signtransaction", tx=unsigned_tx_hex)["hex"]

        success, _ = rpc("broadcast", tx=signed_tx_hex)
        assert success

    def test_addressconvert(self):
        cashaddr_no_prefix = "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt"
        cashaddr = "ecregtest:" + cashaddr_no_prefix
        cashaddr_bch = "bchreg:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqha9s37tt"
        legacy_addr = "mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8"
        for addr_str in (cashaddr, cashaddr_no_prefix, cashaddr_bch, legacy_addr):
            res = rpc("addressconvert", address=addr_str)
            assert res == {
                "cashaddr": cashaddr,
                "bitcoincashaddr": cashaddr_bch,
                "legacy": legacy_addr,
            }


if __name__ == "__main__":
    unittest.main()
