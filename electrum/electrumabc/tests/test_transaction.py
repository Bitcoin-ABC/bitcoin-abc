import unittest
from typing import Dict, List, Optional

from .. import transaction
from ..address import Address, PublicKey, Script, ScriptOutput, UnknownAddress
from ..bitcoin import TYPE_ADDRESS, TYPE_PUBKEY, TYPE_SCRIPT, OpCodes, ScriptType
from ..keystore import xpubkey_to_address
from ..uint256 import UInt256
from ..util import bh2u

unsigned_blob = "010000000149f35e43fefd22d8bb9e4b3ff294c6286154c25712baf6ab77b646e5074d6aed010000005701ff4c53ff0488b21e0000000000000000004f130d773e678a58366711837ec2e33ea601858262f8eaef246a7ebd19909c9a03c3b30e38ca7d797fee1223df1c9827b2a9f3379768f520910260220e0560014600002300feffffffd8e43201000000000118e43201000000001976a914e158fb15c888037fdc40fb9133b4c1c3c688706488ac5fbd0700"
signed_blob = "010000000149f35e43fefd22d8bb9e4b3ff294c6286154c25712baf6ab77b646e5074d6aed010000006a473044022025bdc804c6fe30966f6822dc25086bc6bb0366016e68e880cf6efd2468921f3202200e665db0404f6d6d9f86f73838306ac55bb0d0f6040ac6047d4e820f24f46885412103b5bbebceeb33c1b61f649596b9c3611c6b2853a1f6b48bce05dd54f667fa2166feffffff0118e43201000000001976a914e158fb15c888037fdc40fb9133b4c1c3c688706488ac5fbd0700"
v2_blob = "0200000001191601a44a81e061502b7bfbc6eaa1cef6d1e6af5308ef96c9342f71dbf4b9b5000000006b483045022100a6d44d0a651790a477e75334adfb8aae94d6612d01187b2c02526e340a7fd6c8022028bdf7a64a54906b13b145cd5dab21a26bd4b85d6044e9b97bceab5be44c2a9201210253e8e0254b0c95776786e40984c1aa32a7d03efa6bdacdea5f421b774917d346feffffff026b20fa04000000001976a914024db2e87dd7cfd0e5f266c5f212e21a31d805a588aca0860100000000001976a91421919b94ae5cefcdf0271191459157cdb41c4cbf88aca6240700"
nonmin_blob = "010000000142b88360bd83813139af3a251922b7f3d2ac88e45a2a703c28db8ee8580dc3a300000000654c41151dc44bece88c5933d737176499209a0b1688d5eb51eb6f1fd9fcf2fb32d138c94b96a4311673b75a31c054210b2058735ce6c12e529ddea4a6b91e4a3786d94121034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1feffffff012e030000000000001976a914480d1be8ab76f8cdd85ce4077f51d35b0baaa25a88ac4b521400"


SHORT_COMPACTSIZE_NBYTES = 1
UNCOMPRESSED_PUBKEY_NBYTES = 65
# OP_DUP OP_HASH160 20 <20 bytes hash> OP_EQUALVERIFY OP_CHECKSIG
P2PKH_NBYTES = 25
# OP_HASH160 20 <20 bytes hash> OP_EQUAL
P2SH_NBYTES = 23
# PUSH(33) <pubkey> OP_CHECKSIG
P2PK_NBYTES = transaction.COMPRESSED_PUBKEY_NBYTES + 2
# PUSH(65) <uncompressed pubkey> OP_CHECKSIG
UNCOMPRESSED_P2PK_NBYTES = UNCOMPRESSED_PUBKEY_NBYTES + 2
# Schnorr signature including the sighash type
SCHNORRSIG_NBYTES = 65
# PUSH(33) <pubkey> PUSH(65) <shnorr signature>
SCHNORR_P2PKH_SCRIPTSIG_NBYTES = (
    2 * SHORT_COMPACTSIZE_NBYTES
    + transaction.COMPRESSED_PUBKEY_NBYTES
    + SCHNORRSIG_NBYTES
)

DUMMY_TXINPUT = transaction.TxInput(
    transaction.OutPoint(UInt256(b"\x00" * 32), 0), b"", 0
)
# TXID (32 bytes) + prevout_n (4 bytes) + compact_s1ze (1 byte) + sequence (4 bytes)
DUMMY_TXINPUT_NBYTES = 41


class TestBCDataStream(unittest.TestCase):
    def test_compact_size(self):
        s = transaction.BCDataStream()
        values = [
            0,
            1,
            252,
            253,
            2**16 - 1,
            2**16,
            2**32 - 1,
            2**32,
            2**64 - 1,
        ]
        for v in values:
            s.write_compact_size(v)

        with self.assertRaises(transaction.SerializationError):
            s.write_compact_size(-1)

        self.assertEqual(
            bh2u(s.input),
            "0001fcfdfd00fdfffffe00000100feffffffffff0000000001000000ffffffffffffffffff",
        )
        for v in values:
            self.assertEqual(s.read_compact_size(), v)

        with self.assertRaises(transaction.SerializationError):
            s.read_compact_size()

    def test_string(self):
        s = transaction.BCDataStream()
        with self.assertRaises(transaction.SerializationError):
            s.read_string()

        msgs = ["Hello", " ", "World", "", "!"]
        for msg in msgs:
            s.write_string(msg)
        for msg in msgs:
            self.assertEqual(s.read_string(), msg)

        with self.assertRaises(transaction.SerializationError):
            s.read_string()

    def test_bytes(self):
        s = transaction.BCDataStream()
        s.write(b"foobar")
        self.assertEqual(s.read_bytes(3), b"foo")
        self.assertEqual(s.read_bytes(2), b"ba")
        self.assertEqual(s.read_bytes(4), b"r")
        self.assertEqual(s.read_bytes(1), b"")


class TestTransaction(unittest.TestCase):
    def assert_tx_size(self, tx: transaction.Transaction, expected_size: int):
        self.assertEqual(tx.estimated_size(), expected_size)
        self.assertEqual(len(tx.serialize()) // 2, expected_size)

    def assert_txid_and_size(
        self, tx_hex: str, expected_txid: str
    ) -> transaction.Transaction:
        tx = transaction.Transaction(tx_hex)
        self.assertEqual(tx.txid(), expected_txid)
        self.assert_tx_size(tx, len(tx_hex) // 2)
        return tx

    def _assert_expected_tx_dict(self, tx: transaction.Transaction, expected: Dict):
        self.assertEqual(tx.version, expected["version"])
        self.assertEqual(tx.locktime, expected["lockTime"])
        self.assertEqual(tx.inputs(), expected["inputs"])

        txinput = tx.txinputs()[0]
        expected_input = expected["inputs"][0]
        self.assertEqual(txinput.to_coin_dict(), expected_input)

        output = tx.outputs()[0]
        expected_output = expected["outputs"][0]
        self.assertEqual(
            output,
            transaction.TxOutput(
                expected_output["type"],
                expected_output["address"],
                expected_output["value"],
            ),
        )
        self.assertEqual(
            output.destination.to_script().hex(), expected_output["scriptPubKey"]
        )

    def test_tx_unsigned(self):
        expected = {
            "inputs": [
                {
                    "address": Address.from_string(
                        "13Vp8Y3hD5Cb6sERfpxePz5vGJizXbWciN"
                    ),
                    "num_sig": 1,
                    "prevout_hash": "ed6a4d07e546b677abf6ba1257c2546128c694f23f4b9ebbd822fdfe435ef349",
                    "prevout_n": 1,
                    "pubkeys": [
                        "03b5bbebceeb33c1b61f649596b9c3611c6b2853a1f6b48bce05dd54f667fa2166"
                    ],
                    "sequence": 4294967294,
                    "signatures": [None],
                    "type": "p2pkh",
                    "value": 20112600,
                    "x_pubkeys": [
                        "ff0488b21e0000000000000000004f130d773e678a58366711837ec2e33ea601858262f8eaef246a7ebd19909c9a03c3b30e38ca7d797fee1223df1c9827b2a9f3379768f520910260220e0560014600002300"
                    ],
                }
            ],
            "lockTime": 507231,
            "outputs": [
                {
                    "address": Address.from_string(
                        "1MYXdf4moacvaEKZ57ozerpJ3t9xSeN6LK"
                    ),
                    "scriptPubKey": (
                        "76a914e158fb15c888037fdc40fb9133b4c1c3c688706488ac"
                    ),
                    "type": 0,
                    "value": 20112408,
                }
            ],
            "version": 1,
        }
        tx = transaction.Transaction(unsigned_blob)
        tx.deserialize()
        self._assert_expected_tx_dict(tx, expected)

        self.assertEqual(
            tx.as_dict(), {"hex": unsigned_blob, "complete": False, "final": True}
        )
        self.assertEqual(
            [(o.destination, o.value) for o in tx.outputs()],
            [(Address.from_string("1MYXdf4moacvaEKZ57ozerpJ3t9xSeN6LK"), 20112408)],
        )
        self.assertEqual(
            [o.destination for o in tx.outputs()],
            [Address.from_string("1MYXdf4moacvaEKZ57ozerpJ3t9xSeN6LK")],
        )

        def tx_has_address(addr: Address) -> bool:
            return any(addr == o.destination for o in tx.outputs()) or (
                addr in (inp.get("address") for inp in tx.inputs())
            )

        self.assertTrue(
            tx_has_address(Address.from_string("1MYXdf4moacvaEKZ57ozerpJ3t9xSeN6LK"))
        )
        self.assertTrue(
            tx_has_address(Address.from_string("13Vp8Y3hD5Cb6sERfpxePz5vGJizXbWciN"))
        )
        self.assertFalse(
            tx_has_address(Address.from_string("1CQj15y1N7LDHp7wTt28eoD1QhHgFgxECH"))
        )

        self.assertEqual(tx.serialize(), unsigned_blob)
        # In this case we overestimate by 1 byte because the actual signature is
        # shorter than the maximum signature size.
        self.assertEqual(tx.estimated_size(), len(signed_blob) // 2 + 1)

        tx.update_signatures(
            [
                "3044022025bdc804c6fe30966f6822dc25086bc6bb0366016e68e880cf6efd2468921f3202200e665db0404f6d6d9f86f73838306ac55bb0d0f6040ac6047d4e820f24f46885"
            ]
        )
        self.assertEqual(tx.raw, signed_blob)
        self.assert_tx_size(tx, len(signed_blob) // 2)

        tx.update(unsigned_blob)
        tx.raw = None
        blob = str(tx)
        expected_txoutput = transaction.TxOutput(
            expected["outputs"][0]["type"],
            expected["outputs"][0]["address"],
            expected["outputs"][0]["value"],
        )
        expected_txinput = transaction.TxInput(
            transaction.OutPoint(
                UInt256.from_hex(expected["inputs"][0]["prevout_hash"]),
                expected["inputs"][0]["prevout_n"],
            ),
            bytes.fromhex(transaction.Transaction.input_script(expected["inputs"][0])),
            expected["inputs"][0]["sequence"],
            expected["inputs"][0]["value"],
        )
        self.assertEqual(
            transaction.deserialize(blob),
            (
                expected["version"],
                [expected_txinput],
                [expected_txoutput],
                expected["lockTime"],
            ),
        )

    def test_tx_signed(self):
        expected = {
            "inputs": [
                {
                    "address": Address.from_string(
                        "13Vp8Y3hD5Cb6sERfpxePz5vGJizXbWciN"
                    ),
                    "num_sig": 1,
                    "prevout_hash": "ed6a4d07e546b677abf6ba1257c2546128c694f23f4b9ebbd822fdfe435ef349",
                    "prevout_n": 1,
                    "pubkeys": [
                        "03b5bbebceeb33c1b61f649596b9c3611c6b2853a1f6b48bce05dd54f667fa2166"
                    ],
                    "scriptSig": "473044022025bdc804c6fe30966f6822dc25086bc6bb0366016e68e880cf6efd2468921f3202200e665db0404f6d6d9f86f73838306ac55bb0d0f6040ac6047d4e820f24f46885412103b5bbebceeb33c1b61f649596b9c3611c6b2853a1f6b48bce05dd54f667fa2166",
                    "sequence": 4294967294,
                    "signatures": [
                        "3044022025bdc804c6fe30966f6822dc25086bc6bb0366016e68e880cf6efd2468921f3202200e665db0404f6d6d9f86f73838306ac55bb0d0f6040ac6047d4e820f24f4688541"
                    ],
                    "type": "p2pkh",
                    "x_pubkeys": [
                        "03b5bbebceeb33c1b61f649596b9c3611c6b2853a1f6b48bce05dd54f667fa2166"
                    ],
                }
            ],
            "lockTime": 507231,
            "outputs": [
                {
                    "address": Address.from_string(
                        "1MYXdf4moacvaEKZ57ozerpJ3t9xSeN6LK"
                    ),
                    "scriptPubKey": (
                        "76a914e158fb15c888037fdc40fb9133b4c1c3c688706488ac"
                    ),
                    "type": 0,
                    "value": 20112408,
                }
            ],
            "version": 1,
        }
        tx = transaction.Transaction(signed_blob)
        tx.deserialize()
        self._assert_expected_tx_dict(tx, expected)
        self.assertEqual(
            tx.as_dict(), {"hex": signed_blob, "complete": True, "final": True}
        )

        self.assertEqual(tx.serialize(), signed_blob)

        tx.update_signatures([expected["inputs"][0]["signatures"][0][:-2]])

        self.assert_tx_size(tx, len(signed_blob) // 2)

    def test_tx_nonminimal_scriptSig(self):
        # The nonminimal push is the '4c41...' (PUSHDATA1 length=0x41 [...]) at
        # the start of the scriptSig. Minimal is '41...' (PUSH0x41 [...]).
        expected = {
            "inputs": [
                {
                    "address": Address.from_pubkey(
                        "034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1"
                    ),
                    "num_sig": 1,
                    "prevout_hash": "a3c30d58e88edb283c702a5ae488acd2f3b72219253aaf39318183bd6083b842",
                    "prevout_n": 0,
                    "pubkeys": [
                        "034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1"
                    ],
                    "scriptSig": "4c41151dc44bece88c5933d737176499209a0b1688d5eb51eb6f1fd9fcf2fb32d138c94b96a4311673b75a31c054210b2058735ce6c12e529ddea4a6b91e4a3786d94121034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1",
                    "sequence": 4294967294,
                    "signatures": [
                        "151dc44bece88c5933d737176499209a0b1688d5eb51eb6f1fd9fcf2fb32d138c94b96a4311673b75a31c054210b2058735ce6c12e529ddea4a6b91e4a3786d941"
                    ],
                    "type": "p2pkh",
                    "x_pubkeys": [
                        "034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1"
                    ],
                }
            ],
            "lockTime": 1331787,
            "outputs": [
                {
                    "address": Address.from_pubkey(
                        "034a29987f30ad5d23d79ed5215e034c51f6825bdb2aa595c2bdeb37902960b3d1"
                    ),
                    "scriptPubKey": (
                        "76a914480d1be8ab76f8cdd85ce4077f51d35b0baaa25a88ac"
                    ),
                    "type": 0,
                    "value": 814,
                }
            ],
            "version": 1,
        }
        tx = transaction.Transaction(nonmin_blob)
        tx.deserialize()
        self._assert_expected_tx_dict(tx, expected)

        self.assertEqual(
            tx.as_dict(), {"hex": nonmin_blob, "complete": True, "final": True}
        )

        self.assertEqual(tx.serialize(), nonmin_blob)

        # if original push is lost, will wrongly be e64808c1eb86e8cab68fcbd8b7f3b01f8cc8f39bd05722f1cf2d7cd9b35fb4e3
        self.assertEqual(
            tx.txid(),
            "66020177ae3273d874728667b6a24e0a1c0200079119f3d0c294da40f0e85d34",
        )

        # cause it to lose the original push, and reserialize with minimal
        del tx.inputs()[0]["scriptSig"]
        self.assertEqual(
            tx.txid(),
            "e64808c1eb86e8cab68fcbd8b7f3b01f8cc8f39bd05722f1cf2d7cd9b35fb4e3",
        )

    def test_errors(self):
        with self.assertRaises(Exception):
            xpubkey_to_address(b"")

    def test_parse_xpub(self):
        res = xpubkey_to_address(
            bytes.fromhex(
                "fe4e13b0f311a55b8a5db9a32e959da9f011b131019d4cebe6141b9e2c93edcbfc0954c358b062a9f94111548e50bde5847a3096b8b7872dcffadb0e9579b9017b01000200"
            )
        )
        self.assertEqual(
            res,
            (
                bytes.fromhex(
                    "04ee98d63800824486a1cf5b4376f2f574d86e0a3009a6448105703453f3368e8e1d8d090aaecdd626a45cc49876709a3bbb6dc96a4311b3cac03e225df5f63dfc"
                ),
                Address.from_string("19h943e4diLc68GXW7G75QNe2KWuMu7BaJ"),
            ),
        )

    def test_version_field(self):
        self.assert_txid_and_size(
            v2_blob,
            expected_txid="b97f9180173ab141b61b9f944d841e60feec691d6daab4d4d932b24dd36606fe",
        )

    def test_txid_coinbase_to_p2pk(self):
        self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4103400d0302ef02062f503253482f522cfabe6d6dd90d39663d10f8fd25ec88338295d4c6ce1c90d4aeb368d8bdbadcc1da3b635801000000000000000474073e03ffffffff013c25cf2d01000000434104b0bd634234abbb1ba1e986e884185c61cf43e001f9137f23c2c409273eb16e6537a576782eba668a7ef8bd3b3cfb1edb7117ab65129b8a2e681f3c1e0908ef7bac00000000",
            expected_txid="dbaf14e1c476e76ea05a8b71921a46d6b06f0a950f17c5f9f1a03b8fae467f10",
        )

    def test_txid_coinbase_to_p2pkh(self):
        self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff25033ca0030400001256124d696e656420627920425443204775696c640800000d41000007daffffffff01c00d1298000000001976a91427a1f12771de5cc3b73941664b2537c15316be4388ac00000000",
            expected_txid="4328f9311c6defd9ae1bd7f4516b62acf64b361eb39dfcf09d9925c5fd5c61e8",
        )

    def test_txid_p2pk_to_p2pkh(self):
        self.assert_txid_and_size(
            "010000000118231a31d2df84f884ced6af11dc24306319577d4d7c340124a7e2dd9c314077000000004847304402200b6c45891aed48937241907bc3e3868ee4c792819821fcde33311e5a3da4789a02205021b59692b652a01f5f009bd481acac2f647a7d9c076d71d85869763337882e01fdffffff016c95052a010000001976a9149c4891e7791da9e622532c97f43863768264faaf88ac00000000",
            expected_txid="90ba90a5b115106d26663fce6c6215b8699c5d4b2672dd30756115f3337dddf9",
        )

    def test_txid_p2pk_to_p2sh(self):
        self.assert_txid_and_size(
            "0100000001e4643183d6497823576d17ac2439fb97eba24be8137f312e10fcc16483bb2d070000000048473044022032bbf0394dfe3b004075e3cbb3ea7071b9184547e27f8f73f967c4b3f6a21fa4022073edd5ae8b7b638f25872a7a308bb53a848baa9b9cc70af45fcf3c683d36a55301fdffffff011821814a0000000017a9143c640bc28a346749c09615b50211cb051faff00f8700000000",
            expected_txid="172bdf5a690b874385b98d7ab6f6af807356f03a26033c6a65ab79b4ac2085b5",
        )

    def test_txid_p2pkh_to_p2pkh(self):
        self.assert_txid_and_size(
            "0100000001f9dd7d33f315617530dd72264b5d9c69b815626cce3f66266d1015b1a590ba90000000006a4730440220699bfee3d280a499daf4af5593e8750b54fef0557f3c9f717bfa909493a84f60022057718eec7985b7796bb8630bf6ea2e9bf2892ac21bd6ab8f741a008537139ffe012103b4289890b40590447b57f773b5843bf0400e9cead08be225fac587b3c2a8e973fdffffff01ec24052a010000001976a914ce9ff3d15ed5f3a3d94b583b12796d063879b11588ac00000000",
            expected_txid="24737c68f53d4b519939119ed83b2a8d44d716d7f3ca98bcecc0fbb92c2085ce",
        )

    def test_txid_p2pkh_to_p2sh(self):
        self.assert_txid_and_size(
            "010000000195232c30f6611b9f2f82ec63f5b443b132219c425e1824584411f3d16a7a54bc000000006b4830450221009f39ac457dc8ff316e5cc03161c9eff6212d8694ccb88d801dbb32e85d8ed100022074230bb05e99b85a6a50d2b71e7bf04d80be3f1d014ea038f93943abd79421d101210317be0f7e5478e087453b9b5111bdad586038720f16ac9658fd16217ffd7e5785fdffffff0200e40b540200000017a914d81df3751b9e7dca920678cc19cac8d7ec9010b08718dfd63c2c0000001976a914303c42b63569ff5b390a2016ff44651cd84c7c8988acc7010000",
            expected_txid="155e4740fa59f374abb4e133b87247dccc3afc233cb97c2bf2b46bba3094aedc",
        )

    def test_txid_p2sh_to_p2pkh(self):
        self.assert_txid_and_size(
            "0100000001b98d550fa331da21038952d6931ffd3607c440ab2985b75477181b577de118b10b000000fdfd0000483045022100a26ea637a6d39aa27ea7a0065e9691d477e23ad5970b5937a9b06754140cf27102201b00ed050b5c468ee66f9ef1ff41dfb3bd64451469efaab1d4b56fbf92f9df48014730440220080421482a37cc9a98a8dc3bf9d6b828092ad1a1357e3be34d9c5bbdca59bb5f02206fa88a389c4bf31fa062977606801f3ea87e86636da2625776c8c228bcd59f8a014c69522102420e820f71d17989ed73c0ff2ec1c1926cf989ad6909610614ee90cf7db3ef8721036eae8acbae031fdcaf74a824f3894bf54881b42911bd3ad056ea59a33ffb3d312103752669b75eb4dc0cca209af77a59d2c761cbb47acc4cf4b316ded35080d92e8253aeffffffff0101ac3a00000000001976a914a6b6bcc85975bf6a01a0eabb2ac97d5a418223ad88ac00000000",
            expected_txid="0ea982e8e601863e604ef6d9acf9317ae59d3eac9cafee6dd946abadafd35af8",
        )

    def test_txid_p2sh_to_p2sh(self):
        self.assert_txid_and_size(
            "01000000018695eef2250b3a3b6ef45fe065e601610e69dd7a56de742092d40e6276e6c9ec00000000fdfd000047304402203199bf8e49f7203e8bcbfd754aa356c6ba61643a3490f8aef3888e0aaa7c048c02201e7180bfd670f4404e513359b4020fbc85d6625e3e265e0c357e8611f11b83e401483045022100e60f897db114679f9a310a032a22e9a7c2b8080affe2036c480ff87bf6f45ada02202dbd27af38dd97d418e24d89c3bb7a97e359dd927c1094d8c9e5cac57df704fb014c69522103adc563b9f5e506f485978f4e913c10da208eac6d96d49df4beae469e81a4dd982102c52bc9643a021464a31a3bfa99cfa46afaa4b3acda31e025da204b4ee44cc07a2103a1c8edcc3310b3d7937e9e4179e7bd9cdf31c276f985f4eb356f21b874225eb153aeffffffff02b8ce05000000000017a9145c9c158430b7b79c3ad7ef9bdf981601eda2412d87b82400000000000017a9146bf3ff89019ecc5971a39cdd4f1cabd3b647ad5d8700000000",
            expected_txid="2caab5a11fa1ec0f5bb014b8858d00fecf2c001e15d22ad04379ad7b36fef305",
        )

    def test_parse_output_p2pkh(self):
        tx = self.assert_txid_and_size(
            "010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000001976a914aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa88ac00000000",
            expected_txid="7a0e3fcbdaa9ecc6ccce1ad325b6b661e774a57f2e8519c679964e2dd32e200f",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(DUMMY_TXINPUT.size(), DUMMY_TXINPUT_NBYTES)
        self.assertEqual(
            tx.outputs(), [(TYPE_ADDRESS, Address.from_P2PKH_hash(b"\xaa" * 20), 0)]
        )
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES + SHORT_COMPACTSIZE_NBYTES + P2PKH_NBYTES,
        )

    def test_parse_output_p2pkh_nonmin(self):
        tx = self.assert_txid_and_size(
            "010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000001a76a94c14aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa88ac00000000",
            expected_txid="69706667959fd2e6aa3385acdcd2c478e875344422e1f4c94eb06065268540d1",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(
                        bytes.fromhex(
                            "76a94c14aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa88ac"
                        )
                    ),
                    0,
                )
            ],
        )

    def test_parse_output_p2sh(self):
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000017a914aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8700000000",
            expected_txid="d33750908965d24a411d94371fdc64ebb06f13bf4d19e73372347e6b4eeca49f",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(), [(TYPE_ADDRESS, Address.from_P2SH_hash(b"\xaa" * 20), 0)]
        )
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES + SHORT_COMPACTSIZE_NBYTES + P2SH_NBYTES,
        )

    def test_parse_output_p2sh_nonmin(self):
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000018a94c14aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8700000000",
            expected_txid="dd4b174d7094c63c9f530703702a8d76c7b3fe5fc278ba2837dbd75bc5b0b296",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(
                        bytes.fromhex(
                            "a94c14aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa87"
                        )
                    ),
                    0,
                )
            ],
        )

    def test_parse_output_p2pk(self):
        tx = self.assert_txid_and_size(
            "010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000002321030000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="78afa0576a4ee6e7db663a58202f11bab8e860dd4a2226f856a2490187046b3d",
        )

        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [(TYPE_PUBKEY, PublicKey.from_pubkey(b"\x03" + b"\x00" * 32), 0)],
        )
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES + SHORT_COMPACTSIZE_NBYTES + P2PK_NBYTES,
        )

    def test_parse_output_p2pk_badpubkey(self):
        tx = self.assert_txid_and_size(
            "010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000002321040000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="8e57f026081b6589570dc5e6e339b706d2ac75e6cbd1896275dee176b8d35ba6",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(
                        bytes.fromhex(
                            "21040000000000000000000000000000000000000000000000000000000000000000ac"
                        )
                    ),
                    0,
                )
            ],
        )

    def test_parse_output_p2pk_nonmin(self):
        tx = self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000244c21030000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="730d77384d7bfc965caa338b501e7b071092474320af6ea19052859c93bfaf98",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(
                        bytes.fromhex(
                            "4c21030000000000000000000000000000000000000000000000000000000000000000ac"
                        )
                    ),
                    0,
                )
            ],
        )

    def test_parse_output_p2pk_uncomp(self):
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000043410400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="053626542393dd957a14bb2bcbfdcf3564a5f438e923799e1b9714c4a8e70a7c",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [(TYPE_PUBKEY, PublicKey.from_pubkey(b"\x04" + b"\x00" * 64), 0)],
        )
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES
            + SHORT_COMPACTSIZE_NBYTES
            + UNCOMPRESSED_P2PK_NBYTES,
        )

    def test_parse_output_p2pk_uncomp_badpubkey(self):
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000043410300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="a15a9f86f5a47ef7efc28ae701f5b2a353aff76a21cb22ff08b77759533fb59b",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [(TYPE_SCRIPT, ScriptOutput(b"\x41\x03" + b"\x00" * 64 + b"\xac"), 0)],
        )

    def test_parse_output_p2pk_uncomp_nonmin(self):
        tx = self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000444c410400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac00000000",
            expected_txid="bd8e0827c8bacd6bac10dd28d5fc6ad52f3fef3f91200c7c1d8698531c9325e9",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [(TYPE_SCRIPT, ScriptOutput(b"\x4c\x41\x04" + b"\x00" * 64 + b"\xac"), 0)],
        )

    def test_parse_output_baremultisig(self):
        # no special support for recognizing bare multisig outputs
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000025512103000000000000000000000000000000000000000000000000000000000000000051ae00000000",
            expected_txid="b1f66fde0aa3d5af03be3c69f599069aad217e939f36cacc2372ea4fece7d57b",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(b"\x51\x21\x03" + b"\x00" * 32 + b"\x51\xae"),
                    0,
                )
            ],
        )
        # PUSH(36) OP_1 <pubkey> OP_1 OP_CHECKMULTISIG
        n_opcodes = 4
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES
            + SHORT_COMPACTSIZE_NBYTES
            + transaction.COMPRESSED_PUBKEY_NBYTES
            + n_opcodes,
        )

    def test_parse_output_baremultisig_nonmin(self):
        # even if bare multisig support is added, note that this case should still remain unrecognized
        tx = self.assert_txid_and_size(
            "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000026514c2103000000000000000000000000000000000000000000000000000000000000000051ae00000000",
            expected_txid="eb0b69c86a05499cabc42b12d4706b18eab97ed6155fc966e488a433edf05932",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(),
            [
                (
                    TYPE_SCRIPT,
                    ScriptOutput(b"\x51\x4c\x21\x03" + b"\x00" * 32 + b"\x51\xae"),
                    0,
                )
            ],
        )

    def test_parse_output_truncated1(self):
        # truncated in middle of PUSHDATA2's first argument
        tx = self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000024d0100000000",
            expected_txid="72d8af8edcc603c6c64390ac5eb913b97a80efe0f5ae7c00ad5397eb5786cd33",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(tx.outputs(), [(TYPE_SCRIPT, ScriptOutput(b"\x4d\x01"), 0)])
        self.assertIn("Invalid script", tx.outputs()[0][1].to_ui_string())

    def test_parse_output_truncated2(self):
        # truncated in middle of PUSHDATA2's second argument
        tx = self.assert_txid_and_size(
            "01000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000044d0200ff00000000",
            expected_txid="976667816c4955189973cc56ac839844da4ed32a8bd22a8c6217c2c04e69e9d7",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(
            tx.outputs(), [(TYPE_SCRIPT, ScriptOutput(b"\x4d\x02\x00\xff"), 0)]
        )
        self.assertIn("Invalid script", tx.outputs()[0][1].to_ui_string())

    def test_parse_output_empty(self):
        # nothing wrong with empty output script
        tx = self.assert_txid_and_size(
            "010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000",
            expected_txid="50fa7bd4e5e2d3220fd2e84effec495b9845aba379d853408779d59a4b0b4f59",
        )
        self.assertEqual([tx.txinputs()[0]], [DUMMY_TXINPUT])
        self.assertEqual(tx.outputs(), [(TYPE_SCRIPT, ScriptOutput(b""), 0)])
        self.assertEqual(
            tx.outputs()[0].size(), transaction.AMOUNT_NBYTES + SHORT_COMPACTSIZE_NBYTES
        )
        self.assertEqual("", tx.outputs()[0][1].to_ui_string())

    def test_parse_output_p2pkh_and_op_return(self):
        tx = self.assert_txid_and_size(
            "02000000012367ad0da9fb8f8a7e574d55d4eb2dd0fd8ebd58b1c21cfddb9fe5426369082a000000006441761c8b702e06fcb8656cb205454f22efff174e3ae9552c1ee83f7d64e3b0d29fa466c48a82597713fd7a3c03e324855349a76660fa26dfec4922c51ea0f51cb6412102a42cd220e6099d5d678066b81813ae4fdd14b290479962ae5c0af1448113bcb4feffffff030000000000000000066a047370616d05b20100000000001976a9144fe822f96257d66eeb498394ce9a1fbca1323ba088ac10270000000000001976a914b97b77f0a2e0b3161354de723a76d58a974c601988ac00000000",
            expected_txid="a3e880d56fbfa03d250f0d28281f86388b8c7f38bf4d2c19f0033632907262df",
        )
        expected_txinput = transaction.TxInput(
            transaction.OutPoint(
                UInt256.from_hex(
                    "2a08696342e59fdbfd1cc2b158bd8efdd02debd4554d577e8a8ffba90dad6723"
                ),
                0,
            ),
            bytes.fromhex(
                "41761c8b702e06fcb8656cb205454f22efff174e3ae9552c1ee83f7d64e3b0d29fa466c48a82597713fd7a3c03e324855349a76660fa26dfec4922c51ea0f51cb6412102a42cd220e6099d5d678066b81813ae4fdd14b290479962ae5c0af1448113bcb4"
            ),
            4294967294,
        )
        self.assertEqual(
            tx.txinputs(),
            [expected_txinput],
            f"Mismatch between actual txinput\n\t{tx.txinputs()[0]}\nand expected\n\t{expected_txinput}",
        )
        self.assertEqual(
            tx.txinputs()[0].size(),
            transaction.OUTPOINT_NBYTES
            + SHORT_COMPACTSIZE_NBYTES
            + SCHNORR_P2PKH_SCRIPTSIG_NBYTES
            + transaction.SEQUENCE_NBYTES,
        )
        self.assertEqual(
            tx.outputs(),
            [
                (TYPE_SCRIPT, ScriptOutput(bytes((OpCodes.OP_RETURN, 4)) + b"spam"), 0),
                (
                    TYPE_ADDRESS,
                    Address.from_string(
                        "ecash:qp87sghevftavmhtfxpefn56r772zv3m5qv9pkqu8y"
                    ),
                    111109,
                ),
                (
                    TYPE_ADDRESS,
                    Address.from_string(
                        "ecash:qzuhkals5tstx9sn2n08ywnk6k9fwnrqry5c2hu7mn"
                    ),
                    10000,
                ),
            ],
        )
        # OP_RETURN PUSH(4) "spam"
        script_nbytes = 6
        self.assertEqual(
            tx.outputs()[0].size(),
            transaction.AMOUNT_NBYTES + SHORT_COMPACTSIZE_NBYTES + script_nbytes,
        )

    def test_tx_from_io(self):
        input0 = {
            "type": "p2pkh",
            "prevout_n": 1,
            "prevout_hash": "156a1db69477d5d2580425450263d8878b6f557c36e8649b0b56e735a99690a9",
            "scriptSig": "47304402201c67fdf3869df791c949fe430cfd3837ee2461244ebf13e27cc56c47d542937d0220645e58398c505af5052f90230135e09458a332b5e8c2a7e2932efdd03fd64cff4121026555319664a080ce6c0b1bc023b8435d530773b7e3a30a88c78a0d152dfc7da1",
            "sequence": transaction.DEFAULT_TXIN_SEQUENCE - 1,
        }
        input1 = {
            "type": "p2pkh",
            "prevout_n": 0,
            "prevout_hash": "dec23e57245393dd0caacd5bdb31eac8797faa6dc99de6cd459ecec1704f1f8c",
            "scriptSig": "47304402203da7ad56f4608a9c8509528074d61ac563ba5db904ad5a98fb64c0451509bc24022049c9d49f133c3f06701d21ca4a9d9e13fb73b155566f66de5cccdc0ff84672e741210241ac33058ef56b991d74ae7bf8a7552e191f36bc0adfddb2852816ee1da28dc0",
            "sequence": transaction.DEFAULT_TXIN_SEQUENCE - 2,
        }
        input2 = {
            "type": "p2pkh",
            "prevout_n": 1,
            "prevout_hash": "2371e4eaccdd599f0e433172f4d988c914bf4437a429f188903948566ed1cb9f",
            "scriptSig": "47304402207b61d9496e17777087d1e6098083eeefbcd9620624517e901317b3f7ddef82fc02207f45b318d821410b812ff4fd6d1ae848d061d17cb6fe6fe51502888075baa172412103140ca2c609b0dcea8f43edc300da2b6fcf94cc342abb8fc4da996486db4d2920",
            # default sequence
        }
        output0 = transaction.TxOutput(
            TYPE_ADDRESS,
            Address.from_string("ecash:qz4lnx9ad6ay4nz3hnujgtayhm0gmf4mr5jgamh830"),
            value=25872015,
        )

        tx = transaction.Transaction.from_io(
            [input0, input1, input2],
            [output0],
        )

        # Test default values
        self.assertEqual(tx.version, 2)
        self.assertEqual(tx.locktime, 0)
        self.assertEqual(tx._sign_schnorr, False)

        expected_txins = [
            transaction.TxInput(
                transaction.OutPoint(
                    UInt256.from_hex(inp["prevout_hash"]),
                    inp["prevout_n"],
                ),
                bytes.fromhex(inp["scriptSig"]),
                inp.get("sequence", transaction.DEFAULT_TXIN_SEQUENCE),
            )
            for inp in [input0, input1, input2]
        ]
        self.assertEqual(set(tx.txinputs()), set(expected_txins))


class TestCompactSize(unittest.TestCase):
    def test_compact_size_nbytes(self):
        for size, expected_nbytes in (
            (0, 1),
            (1, 1),
            (252, 1),
            (253, 3),
            (2**16 - 1, 3),
            (2**16, 5),
            (2**32 - 1, 5),
            (2**32, 9),
            (2**64 - 1, 9),
        ):
            self.assertEqual(transaction.compact_size_nbytes(size), expected_nbytes)

        with self.assertRaises(OverflowError):
            transaction.compact_size_nbytes(2**64)


class TestTxOutput(unittest.TestCase):
    def test_size(self):
        for script_size, expected_output_size in (
            # amount (8 bytes) + 1 byte compact size
            (0, 9),
            # amount + 1 byte compact size + script
            (1, 10),
            (252, 261),
            # amount + 3 bytes compact size + script
            (253, 264),
            # MAX_SCRIPT_SIZE
            (10000, 10011),
        ):
            locking_script = ScriptOutput(bytes((OpCodes.OP_NOP,)) * script_size)
            amount = 0
            self.assertEqual(
                transaction.TxOutput(TYPE_SCRIPT, locking_script, amount).size(),
                expected_output_size,
            )


class TestTxInput(unittest.TestCase):
    def test_size(self):
        sequence = 0
        txid = UInt256(b"\x00" * 32)
        outpoint = transaction.OutPoint(txid, 0)

        for script_size, expected_output_size in (
            # Base overhead (outpoint + sequence number) + 1 byte compact size
            (0, 41),
            # + 1 byte compact size + scriptSig
            (1, 42),
            (252, 293),
            # + 3 byte compact size + scriptSig
            (253, 296),
            # MAX_SCRIPT_SIZE
            (10000, 10043),
        ):
            txin = transaction.TxInput(outpoint, b"\x00" * script_size, sequence)
            self.assertEqual(txin.size(), expected_output_size)

    def _deser_test(
        self,
        tx_hex: str,
        expected_type: ScriptType,
        expected_sigs: List[str],
        num_required_sigs: int,
        expected_pubkeys: Optional[List[str]] = None,
        expected_address: Optional[Address] = None,
        expected_value: Optional[int] = None,
    ):
        tx = transaction.Transaction(tx_hex)
        input_dict = tx.inputs()[0]
        txinput = tx.txinputs()[0]
        expected_sigs_bytes = [
            (None if sig is None else bytes.fromhex(sig)) for sig in expected_sigs
        ]

        self.assertEqual(input_dict["type"], expected_type.name)
        self.assertEqual(txinput.type, expected_type)

        self.assertEqual(txinput.num_required_sigs, num_required_sigs)
        self.assertEqual(input_dict.get("num_sig", 0), num_required_sigs)

        if expected_type != ScriptType.coinbase:
            self.assertEqual(input_dict["signatures"], expected_sigs)
        else:
            self.assertFalse("signatures" in input_dict)
        self.assertEqual(txinput.signatures, expected_sigs_bytes)

        if expected_pubkeys is not None:
            self.assertEqual(input_dict["pubkeys"], expected_pubkeys)
            self.assertEqual([pub.hex() for pub in txinput.pubkeys], expected_pubkeys)

            # sanity check that bytes and str are sorted in the same order
            pubkeys_hex, xpubkeys_hex = tx.get_sorted_pubkeys(input_dict)
            self.assertEqual(
                txinput.get_sorted_pubkeys(),
                (
                    tuple(bytes.fromhex(pub) for pub in pubkeys_hex),
                    tuple(bytes.fromhex(xpub) for xpub in xpubkeys_hex),
                ),
            )

        # The coin dict is inconsistent on addresses, when an address is not applicable
        if expected_type == ScriptType.coinbase:
            self.assertIsInstance(input_dict["address"], UnknownAddress)
        else:
            # None for p2pk, an Address instance for p2pkh and p2sh
            self.assertEqual(input_dict["address"], expected_address)
        # None (p2pk and coinbase) or an address instance
        self.assertEqual(txinput.address, expected_address)

        self.assertEqual(txinput.is_complete(), tx.is_txin_complete(input_dict))
        if not txinput.is_complete():
            self.assertIsNotNone(txinput.get_value())
            self.assertEqual(txinput.get_value(), input_dict["value"])
            self.assertEqual(txinput.get_value(), expected_value)

            self.assertTrue(any(xpub[0] == 0xFF for xpub in txinput.x_pubkeys))
            self.assertNotEqual(txinput.pubkeys, txinput.x_pubkeys)

            self.assertEqual(
                txinput.num_valid_sigs, len(list(filter(None, expected_sigs)))
            )
        else:
            # Signed transactions don't bother storing the xpub and derivation path
            self.assertEqual(txinput.pubkeys, txinput.x_pubkeys)

            if expected_type != ScriptType.coinbase:
                self.assertEqual(input_dict["num_sig"], len(expected_sigs))
                self.assertEqual(txinput.num_required_sigs, len(expected_sigs))
                self.assertEqual(txinput.num_valid_sigs, len(expected_sigs))

    def test_multisig_p2sh_deserialization(self):
        self._deser_test(
            tx_hex="0100000001b98d550fa331da21038952d6931ffd3607c440ab2985b75477181b577de118b10b000000fdfd0000483045022100a26ea637a6d39aa27ea7a0065e9691d477e23ad5970b5937a9b06754140cf27102201b00ed050b5c468ee66f9ef1ff41dfb3bd64451469efaab1d4b56fbf92f9df48014730440220080421482a37cc9a98a8dc3bf9d6b828092ad1a1357e3be34d9c5bbdca59bb5f02206fa88a389c4bf31fa062977606801f3ea87e86636da2625776c8c228bcd59f8a014c69522102420e820f71d17989ed73c0ff2ec1c1926cf989ad6909610614ee90cf7db3ef8721036eae8acbae031fdcaf74a824f3894bf54881b42911bd3ad056ea59a33ffb3d312103752669b75eb4dc0cca209af77a59d2c761cbb47acc4cf4b316ded35080d92e8253aeffffffff0101ac3a00000000001976a914a6b6bcc85975bf6a01a0eabb2ac97d5a418223ad88ac00000000",
            expected_type=ScriptType.p2sh,
            expected_sigs=[
                "3045022100a26ea637a6d39aa27ea7a0065e9691d477e23ad5970b5937a9b06754140cf27102201b00ed050b5c468ee66f9ef1ff41dfb3bd64451469efaab1d4b56fbf92f9df4801",
                "30440220080421482a37cc9a98a8dc3bf9d6b828092ad1a1357e3be34d9c5bbdca59bb5f02206fa88a389c4bf31fa062977606801f3ea87e86636da2625776c8c228bcd59f8a01",
            ],
            num_required_sigs=2,
            expected_pubkeys=[
                "02420e820f71d17989ed73c0ff2ec1c1926cf989ad6909610614ee90cf7db3ef87",
                "036eae8acbae031fdcaf74a824f3894bf54881b42911bd3ad056ea59a33ffb3d31",
                "03752669b75eb4dc0cca209af77a59d2c761cbb47acc4cf4b316ded35080d92e82",
            ],
            expected_address=Address.from_string(
                "ecash:ppnk6mj995mdfz22mczsrq9sc4573kh32gpjgeunjw"
            ),
        )

    def test_p2pkh_deserialization(self):
        self._deser_test(
            tx_hex="02000000012367ad0da9fb8f8a7e574d55d4eb2dd0fd8ebd58b1c21cfddb9fe5426369082a000000006441761c8b702e06fcb8656cb205454f22efff174e3ae9552c1ee83f7d64e3b0d29fa466c48a82597713fd7a3c03e324855349a76660fa26dfec4922c51ea0f51cb6412102a42cd220e6099d5d678066b81813ae4fdd14b290479962ae5c0af1448113bcb4feffffff030000000000000000066a047370616d05b20100000000001976a9144fe822f96257d66eeb498394ce9a1fbca1323ba088ac10270000000000001976a914b97b77f0a2e0b3161354de723a76d58a974c601988ac00000000",
            expected_type=ScriptType.p2pkh,
            expected_sigs=[
                "761c8b702e06fcb8656cb205454f22efff174e3ae9552c1ee83f7d64e3b0d29fa466c48a82597713fd7a3c03e324855349a76660fa26dfec4922c51ea0f51cb641"
            ],
            num_required_sigs=1,
            expected_pubkeys=[
                "02a42cd220e6099d5d678066b81813ae4fdd14b290479962ae5c0af1448113bcb4"
            ],
            expected_address=Address.from_string(
                "ecash:qpqelnd6xqu2kn8vdm6c2qvwgsh7g50fdqt40qx9jg"
            ),
        )

    def test_p2pk_deserialization(self):
        self._deser_test(
            tx_hex="0100000001e4643183d6497823576d17ac2439fb97eba24be8137f312e10fcc16483bb2d070000000048473044022032bbf0394dfe3b004075e3cbb3ea7071b9184547e27f8f73f967c4b3f6a21fa4022073edd5ae8b7b638f25872a7a308bb53a848baa9b9cc70af45fcf3c683d36a55301fdffffff011821814a0000000017a9143c640bc28a346749c09615b50211cb051faff00f8700000000",
            expected_type=ScriptType.p2pk,
            expected_sigs=[
                "3044022032bbf0394dfe3b004075e3cbb3ea7071b9184547e27f8f73f967c4b3f6a21fa4022073edd5ae8b7b638f25872a7a308bb53a848baa9b9cc70af45fcf3c683d36a55301"
            ],
            num_required_sigs=1,
        )

    def test_coinbase_deserialization(self):
        self._deser_test(
            tx_hex="01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4103400d0302ef02062f503253482f522cfabe6d6dd90d39663d10f8fd25ec88338295d4c6ce1c90d4aeb368d8bdbadcc1da3b635801000000000000000474073e03ffffffff013c25cf2d01000000434104b0bd634234abbb1ba1e986e884185c61cf43e001f9137f23c2c409273eb16e6537a576782eba668a7ef8bd3b3cfb1edb7117ab65129b8a2e681f3c1e0908ef7bac00000000",
            expected_type=ScriptType.coinbase,
            expected_sigs=[],
            num_required_sigs=0,
        )

    def test_2of2_multisig_incomplete(self):
        self._deser_test(
            tx_hex="0200000001d9b830c4f60b839c512d00dfa08db658eae54ca849b81bca8798f250cb2e93c903000000fb0001ff483045022100fbc08cdbd62d7328496735d9cc66f1a7e978da1ea3de54f8a8344d0928606c8002205ec8c3adbe502e40e72a593de14248ba19b8098ed591803accd47338a73f8427414cad524c53ff0488b21e03f918d62980000000d14a70b732b0badca35b38671d321ddce735bfc9b1ab823140b288e308cf9007020fb77d2e3dab47533c29e7280725a20427c27a37545a1daa330e5d7146f66a39000006004c53ff0488b21e036ae03b288000000074514157090ae16af9dff0cb13666d75b59e4ac734099309de6c8dc0108c2c250303b19c01f4ab103e723ac060c3ab5a5de5b1773b77b63f286ebd2b88eee791d40000060052aefeffffff248a01000000000001f68801000000000017a9149ee12d650f43157a0a5c3b615d061bb5290b28248700000000",
            expected_type=ScriptType.p2sh,
            expected_sigs=[
                None,
                "3045022100fbc08cdbd62d7328496735d9cc66f1a7e978da1ea3de54f8a8344d0928606c8002205ec8c3adbe502e40e72a593de14248ba19b8098ed591803accd47338a73f842741",
            ],
            num_required_sigs=2,
            expected_pubkeys=[
                "02ce914e4644565afe48d5bc3b5ef304c7fcf41c0defd668f45196edbb1411f07f",
                "03dec2a5937425f5657083ef25022f66b6924e21519ddac5cbbc5c9212a04428da",
            ],
            expected_address=Address.from_string(
                "ecash:ppfhzqryfq5u9y3ccqw3j9qaa9rsyz746sar20zk99"
            ),
            expected_value=100_900,
        )

    def test_2of3_multisig_incomplete(self):
        self._deser_test(
            tx_hex="0200000001f5315ddddb23ec54b2ba6a67155c81cdbd8a98bca0fa6ebfebaeb4af415fb0a600000000fd53010001ff01ff483045022100dffbcb3902d92650b75fb5528d1d6816f4e775f92e44d9eda606a0e197d7ffb402204e787b0bd06aa7640e79279fde55f2c98b4f82348491ddf7c5a6be8d21cfca86414d0201524c53ff0488b21e035a37440380000000a412cfa165936158fd7f75d8b615805aa92cefb4aa4e295832f9811f7c1ed0c10290cddf66380e9e6eece36340f41a87a07fbbf329ddb51c1f14a3130c3485998e00000e004c53ff0488b21e0250161d8f0000000035ebe2e8adb327d4cb6c79b57245b010a7c235b23d0d10569226aac40076fcdb02857cce864e8560924496ce4f74df94d483ddd02031e6dc2db55a75e88c2a2b5c00000e004c53ff0488b21e0351b32e0c80000000ca0cff29d8c48ae7993841a188998639ff1e7b9bcefb3f800e9ca4924b5b857d03b0a87930c29eb53f05a2b0e9df56674b5ec0e9109790bbf20c420e4ea1a8371500000e0053aefeffffffa1dc010000000000014edb01000000000017a91451d3c1ef675df7f432b2cf68270e5c4b30187db78700000000",
            expected_type=ScriptType.p2sh,
            expected_sigs=[
                None,
                None,
                "3045022100dffbcb3902d92650b75fb5528d1d6816f4e775f92e44d9eda606a0e197d7ffb402204e787b0bd06aa7640e79279fde55f2c98b4f82348491ddf7c5a6be8d21cfca8641",
            ],
            num_required_sigs=2,
            expected_pubkeys=[
                "0206a2c2c875b34b2d52b4055ab62f6fa048a4f5317269937fe2133fbe7916237a",
                "0256c49b291e84eb49e6a0de7cd116c44d61ddfd531d2d4cc9194ef8ba2a01564c",
                "029fe778a1477a830016f44a661e98f09a9bcc43133fb716597a3bdfbfb98708e3",
            ],
            expected_address=Address.from_string(
                "ecash:pql2m9sh88h86lk8cvsf3ngvhcduyvmd0qx05dqrrw"
            ),
            expected_value=122_017,
        )


class TestScriptMatching(unittest.TestCase):
    ONE_SIGNATURE_PUSH = bytes([SCHNORRSIG_NBYTES]) + b"\x00" * SCHNORRSIG_NBYTES
    NO_SIGNATURE_PUSH = bytes([1]) + b"\xff"

    MULTISIG_REDEEM_SCRIPT = Script.multisig_script(
        m=2, pubkeys=[b"\x02" + b"\x00" * 32] * 3
    )
    MULTISIG_REDEEM_SCRIPT_MISSING_OP_CHECKMULTISIG = MULTISIG_REDEEM_SCRIPT[:-1]

    P2PK_SCRIPTSIG_COMPRESSED = bytes([33]) + b"\x00" * 33
    P2PK_SCRIPTSIG_UNCOMPRESSED = bytes([65]) + b"\x00" * 65
    P2PK_SCRIPTSIG_TOO_SHORT = bytes([32]) + b"\x00" * 32

    P2PKH_SCRIPTSIG_UNCOMPRESSED = ONE_SIGNATURE_PUSH + P2PK_SCRIPTSIG_UNCOMPRESSED
    P2PKH_SCRIPTSIG_COMPRESSED = ONE_SIGNATURE_PUSH + P2PK_SCRIPTSIG_COMPRESSED
    P2PKH_SCRIPTSIG_PUBKEY_TOO_SHORT = ONE_SIGNATURE_PUSH + P2PK_SCRIPTSIG_TOO_SHORT
    P2PKH_SCRIPTSIG_UNSIGNED = NO_SIGNATURE_PUSH + P2PK_SCRIPTSIG_COMPRESSED

    P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3 = (
        bytes([OpCodes.OP_0])
        + 2 * ONE_SIGNATURE_PUSH
        + 3 * P2PK_SCRIPTSIG_COMPRESSED
        + Script.push_data(MULTISIG_REDEEM_SCRIPT)
    )
    P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_PARTIAL = (
        bytes([OpCodes.OP_0])
        + ONE_SIGNATURE_PUSH
        + 2 * NO_SIGNATURE_PUSH
        + 3 * P2PK_SCRIPTSIG_COMPRESSED
        + Script.push_data(MULTISIG_REDEEM_SCRIPT)
    )
    P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_UNSIGNED = (
        bytes([OpCodes.OP_0])
        + 3 * NO_SIGNATURE_PUSH
        + 3 * P2PK_SCRIPTSIG_COMPRESSED
        + Script.push_data(MULTISIG_REDEEM_SCRIPT)
    )
    P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_MISSING_OP_0 = (
        P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3[1:]
    )

    def test_is_push_opcode(self):
        push_opcodes_and_max_data_size = [
            (OpCodes.OP_0, 0),
            (OpCodes.OP_1NEGATE, 1),
            (OpCodes.OP_PUSHDATA1, 0xFF),
            (OpCodes.OP_PUSHDATA2, 0xFFFF),
            (OpCodes.OP_PUSHDATA4, 0xFFFFFFFF),
        ]
        push_opcodes_and_max_data_size += [
            (opcode, 1) for opcode in range(OpCodes.OP_1, OpCodes.OP_16 + 1)
        ]
        push_opcodes_and_max_data_size += [
            (i, i) for i in range(1, OpCodes.OP_PUSHDATA1)
        ]

        # Test all opcodes without size consideration
        all_push_opcodes = {opcode for (opcode, size) in push_opcodes_and_max_data_size}
        for opcode in iter(OpCodes):
            self.assertEqual(
                transaction.is_push_opcode(opcode), opcode in all_push_opcodes
            )

        # Test size boundaries for push opcodes
        for opcode, max_data_size in push_opcodes_and_max_data_size:
            for size in (max(0, max_data_size - 1), max_data_size):
                self.assertTrue(transaction.is_push_opcode(opcode, size))
            if max_data_size < 0xFFFFFFFF:
                self.assertFalse(transaction.is_push_opcode(opcode, max_data_size + 1))

        with self.assertRaises(AssertionError):
            transaction.is_push_opcode(OpCodes.OP_0, -1)
        with self.assertRaises(AssertionError):
            transaction.is_push_opcode(OpCodes.OP_PUSHDATA4, 0xFFFFFFFF + 1)

    def test_matches_p2pk_scriptsig(self):
        vectors = (
            (self.P2PK_SCRIPTSIG_COMPRESSED, True),
            (self.P2PK_SCRIPTSIG_UNCOMPRESSED, True),
            (self.P2PK_SCRIPTSIG_TOO_SHORT, False),
            (self.P2PKH_SCRIPTSIG_COMPRESSED, False),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3, False),
            (self.MULTISIG_REDEEM_SCRIPT, False),
        )
        for script, expected_result in vectors:
            self.assertEqual(
                transaction.matches_p2pk_scriptsig(Script.get_ops(script)),
                expected_result,
            )

    def test_matches_p2pkh_scriptsig(self):
        vectors = (
            (self.P2PKH_SCRIPTSIG_UNSIGNED, True),
            (self.P2PKH_SCRIPTSIG_UNCOMPRESSED, True),
            (self.P2PKH_SCRIPTSIG_COMPRESSED, True),
            (self.P2PKH_SCRIPTSIG_PUBKEY_TOO_SHORT, False),
            (self.P2PK_SCRIPTSIG_COMPRESSED, False),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3, False),
            (self.MULTISIG_REDEEM_SCRIPT, False),
        )
        for script, expected_result in vectors:
            self.assertEqual(
                transaction.matches_p2pkh_scriptsig(Script.get_ops(script)),
                expected_result,
            )

    def test_matches_p2sh_ecdsa_multisig_scriptsig(self):
        vectors = (
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3, True),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_PARTIAL, True),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_UNSIGNED, True),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_MISSING_OP_0, False),
            (self.P2PKH_SCRIPTSIG_COMPRESSED, False),
            (self.P2PK_SCRIPTSIG_COMPRESSED, False),
            (self.MULTISIG_REDEEM_SCRIPT, False),
        )
        for script, expected_result in vectors:
            self.assertEqual(
                transaction.matches_p2sh_ecdsa_multisig_scriptsig(
                    Script.get_ops(script)
                ),
                expected_result,
            )

    def test_matches_multisig_redeemscript(self):
        vectors = (
            (self.MULTISIG_REDEEM_SCRIPT, True),
            (self.MULTISIG_REDEEM_SCRIPT_MISSING_OP_CHECKMULTISIG, False),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3, False),
            (self.P2SH_SCRIPTSIG_ECDSA_MULTISIG_2OF3_MISSING_OP_0, False),
            (self.P2PKH_SCRIPTSIG_COMPRESSED, False),
            (self.P2PK_SCRIPTSIG_COMPRESSED, False),
        )
        for script, expected_result in vectors:
            self.assertEqual(
                transaction.matches_multisig_redeemscript(
                    Script.get_ops(script), num_pubkeys=3
                ),
                expected_result,
            )


class NetworkMock:
    def __init__(self, unspent):
        self.unspent = unspent

    def synchronous_get(self, arg):
        return self.unspent


if __name__ == "__main__":
    unittest.main()
