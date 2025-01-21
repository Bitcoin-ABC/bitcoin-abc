import base64
import unittest
from unittest import mock

from .. import address, storage
from ..address import Address, ScriptOutput
from ..avalanche.delegation import (
    Delegation,
    DelegationBuilder,
    DelegationId,
    Level,
    WrongDelegatorKeyError,
)
from ..avalanche.primitives import Key, PublicKey
from ..avalanche.proof import (
    LimitedProofId,
    Proof,
    ProofBuilder,
    ProofId,
    Stake,
    StakeAndSigningData,
)
from ..keystore import from_private_key_list
from ..serialize import DeserializationError
from ..transaction import OutPoint, get_address_from_output_script
from ..uint256 import UInt256
from ..wallet import ImportedPrivkeyWallet

master_wif = "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw"
master = Key.from_wif(master_wif)
# prove that this is the same key as before
pubkey_hex = "030b4c866585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744"
assert master.get_pubkey().keydata.hex() == pubkey_hex
utxos = [
    {
        "txid": UInt256.from_hex(
            "24ae50f5d4e81e340b29708ab11cab48364e2ae2c53f8439cbe983257919fcb7",
        ),
        "vout": 0,
        "amount": 10000,
        "height": 672828,
        "privatekey": "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ",
        "iscoinbase": False,
        "address": Address.from_string(
            "ecash:qzn96x3rn48vveny856sc7acl3zd9zq39q34hl80wj"
        ),
    },
]

expected_proof1 = (
    "2a00000000000000fff053650000000021030b4c866585dd868a9d62348a9cd008d6a31"
    "2937048fff31670e7e920cfc7a74401b7fc19792583e9cb39843fc5e22a4e3648ab1cb1"
    "8a70290b341ee8d4f550ae24000000001027000000000000788814004104d0de0aaeaef"
    "ad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd85228a6fb29940e85"
    "8e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0abd9740c85a05a7d543c3d3012"
    "73d79ff7054758579e30cc05cdfe1aca3374adfe55104b409ffce4a2f19d8a5981d5f0c"
    "79b23edac73352ab2898aca89270282500788bac77505ca17d6d0dcc946ced3990c2857"
    "c73743cd74d881fcbcbc8eaaa8d72812ebb9a556610687ca592fe907a4af024390e0a92"
    "60c4f5ea59e7ac426cc5"
)
expected_limited_id1 = (
    "e5845c13b93a1c207bd72033c185a2f833eef1748ee62fd49161119ac2c22864"
)
expected_proofid1 = "74c91491e5d6730ea1701817ed6c34e9627904fc3117647cc7d4bce73f56e45a"

# data from Bitcoin ABC's proof_tests.cpp
sequence2 = 5502932407561118921
expiration2 = 5658701220890886376
master2 = Key.from_wif("L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW")
# master_pub2 = "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
payout_pubkey = address.PublicKey(
    bytes.fromhex("038439233261789dd340bdc1450172d9c671b72ee8c0b2736ed2a3a250760897fd")
)
utxos2 = [
    {
        "txid": UInt256.from_hex(
            "37424bda9a405b59e7d4f61a4c154cea5ee34e445f3daa6033b64c70355f1e0b"
        ),
        "vout": 2322162807,
        "amount": 3291110545,
        "height": 426611719,
        "iscoinbase": True,
        "privatekey": "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM",
        "address": Address.from_string(
            "ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"
        ),
    },
    {
        "txid": UInt256.from_hex(
            "300cbba81ef40a6d269be1e931ccb58c074ace4a9b06cc0f2a2c9bf1e176ede4"
        ),
        "vout": 2507977928,
        "amount": 2866370216,
        "height": 1298955966,
        "iscoinbase": True,
        "privatekey": "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM",
        "address": Address.from_string(
            "ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"
        ),
    },
    {
        "txid": UInt256.from_hex(
            "2313cb59b19774df1f0b86e079ddac61c5846021324e4a36db154741868c09ac"
        ),
        "vout": 35672324,
        "amount": 3993160086,
        "height": 484677071,
        "iscoinbase": True,
        "privatekey": "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM",
        "address": Address.from_string(
            "ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"
        ),
    },
]
expected_proof2 = (
    "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8bc67"
    "bb05a971f5ac2745fd683797dde3030b1e5f35704cb63360aa3d5f444ee35eea4c154c1a"
    "f6d4e7595b409ada4b42377764698a915c2ac4000000000f28db322102449fb5237efe8f"
    "647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680da44b13031186044cd54f0"
    "084dcbe703bdb74058a1ddd3efffb347c04d45ced339a41eecedad05f8380a4115016404"
    "a2787f51e27165171976d1925944df0231e4ed76e1f19b2c2a0fcc069b4ace4a078cb5cc"
    "31e9e19b266d0af41ea8bb0c30c8b47c95a856d9aa000000007dfdd89a2102449fb5237e"
    "fe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68019201c99059772f645"
    "2efb50579edc11370a94ea0b7fc61f22cbacc1339a22a04a41b20066c617138d715d9562"
    "9a837e4f74633f823dddda0a0a40d0f37b59a4ac098c86414715db364a4e32216084c561"
    "acdd79e0860b1fdf7497b159cb13230451200296c902ee000000009f2bc7392102449fb5"
    "237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6800eb604ecae881c"
    "e1eb68dcc1f94725f70aedec1e60077b59eb4ce4b44d5475ba16b8b0b370cad583eaf342"
    "b4442bc0f09001f1cb1074526c58f2047892f79c252321038439233261789dd340bdc145"
    "0172d9c671b72ee8c0b2736ed2a3a250760897fdacd6bf9c0c881001dc5749966a2f6562"
    "f291339521b3894326c0740de880565549fc6838933c95fbee05ff547ae89bad63e92f55"
    "2ca3ea4cc01ac3e4869d0dc61b"
)
expected_limited_id2 = UInt256.from_hex(
    "7223b8cc572bdf8f123ee7dd0316962f0367b0be8bce9b6e9465d1f413d95616",
)
expected_proofid2 = UInt256.from_hex(
    "95c9673bc14f3c36e9310297e8df81867b42dd1a7bb7944aeb6c1797fbd2a6d5",
)


class WalletDummyThread:
    """Mimic the TaskThread for testing"""

    def __init__(self):
        self.tasks = []

    def add(self, task, on_success=None, on_done=None, on_error=None):
        result = task()
        if on_done:
            on_done()
        if on_success:
            on_success(result)


@mock.patch.object(storage.WalletStorage, "_write")
def wallet_from_wif_keys(keys_wif, _mock_write):
    ks = from_private_key_list(keys_wif)
    store = storage.WalletStorage("if_this_exists_mocking_failed_648151893")
    store.put("keystore", ks.dump())
    wallet = ImportedPrivkeyWallet(store)
    wallet.thread = WalletDummyThread()
    return wallet


class TestAvalancheProofBuilder(unittest.TestCase):
    def setUp(self) -> None:
        # Print the entire serialized proofs on assertEqual failure
        self.maxDiff = None

    def _test(
        self,
        master_key,
        sequence,
        expiration,
        utxos,
        payout_address,
        expected_proof_hex,
        expected_limited_proofid,
        expected_proofid,
    ):
        wallet = wallet_from_wif_keys("\n".join([utxo["privatekey"] for utxo in utxos]))

        proofbuilder = ProofBuilder(
            sequence=sequence,
            expiration_time=expiration,
            payout_address=payout_address,
            wallet=wallet,
            master=master_key,
        )
        for utxo in utxos:
            proofbuilder.sign_and_add_stake(
                StakeAndSigningData(
                    Stake(
                        OutPoint(utxo["txid"], utxo["vout"]),
                        utxo["amount"],
                        utxo["height"],
                        utxo["iscoinbase"],
                    ),
                    utxo["address"],
                )
            )

        def check_proof(proof):
            self.assertEqual(proof.to_hex(), expected_proof_hex)

            self.assertEqual(proof.limitedid, expected_limited_proofid)
            self.assertEqual(proof.proofid, expected_proofid)

            self.assertTrue(proof.verify_master_signature())
            for ss in proof.signed_stakes:
                self.assertTrue(ss.verify_signature(proof.stake_commitment))

            proof.signature = 64 * b"\0"
            self.assertFalse(proof.verify_master_signature())
            for ss in proof.signed_stakes:
                self.assertTrue(ss.verify_signature(proof.stake_commitment))

            ss = proof.signed_stakes[0]
            ss.sig = 64 * b"\0"
            self.assertFalse(ss.verify_signature(proof.stake_commitment))
            for ss in proof.signed_stakes[1:]:
                self.assertTrue(ss.verify_signature(proof.stake_commitment))

        proofbuilder.build(on_completion=check_proof)

    def test_1_stake(self):
        self._test(
            master,
            42,
            1699999999,
            utxos,
            ScriptOutput.from_string(""),
            expected_proof1,
            # The following proofid and limited id were obtained by passing
            # the previous serialized proof to `bitcoin-cli decodeavalancheproof`
            LimitedProofId.from_hex(expected_limited_id1),
            ProofId.from_hex(expected_proofid1),
        )

        # A test similar to Bitcoin ABC's  "Properly signed 1 UTXO proof, P2PKH payout
        # script" (proof_tests.cpp), except that I rebuild it with the node's
        # buildavalancheproof RPC to get the same signatures, as the test proof was
        # generated with a random nonce.
        # RPC command used (Bitcoin ABC commit bdee6e2):
        #  src/bitcoin-cli buildavalancheproof 6296457553413371353 -4129334692075929194 "L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW"  '[{"txid":"915d9cc742b46b77c52f69eb6be16739e5ff1cd82ad4fa4ac6581d3ef29fa769","vout":567214302,"amount":4446386380000.00,"height":1370779804,"iscoinbase":false,"privatekey":"KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM"}]'  "ecash:qrupwtz3a7lngsf6xz9qxr75k9jvt07d3uexmwmpqy"
        # Proof ID and limited ID verified with node RPC decodeavalancheproof.
        self._test(
            master2,
            6296457553413371353,
            -4129334692075929194,
            [
                {
                    "txid": UInt256.from_hex(
                        "915d9cc742b46b77c52f69eb6be16739e5ff1cd82ad4fa4ac6581d3ef29fa769"
                    ),
                    "vout": 567214302,
                    "amount": 444638638000000,
                    "height": 1370779804,
                    "iscoinbase": False,
                    "privatekey": (
                        "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM"
                    ),
                    "address": Address.from_string(
                        "ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"
                    ),
                },
            ],
            Address.from_string("ecash:qrupwtz3a7lngsf6xz9qxr75k9jvt07d3uexmwmpqy"),
            "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
            "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
            "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
            "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680e6569b4412"
            "fbb651e44282419f62e9b3face655d3a96e286f70dd616592d6837ccf55cadd71eb53"
            "50a4c46f23ca69230c27f6c0a7c1ed15aee38ab4cbc6f8d031976a914f8172c51efbf"
            "34413a308a030fd4b164c5bfcd8f88ac2fe2dbc2d5d28ed70f4bf9e3e7e76db091570"
            "8100f048a17f6347d95e1135d6403241db4f4b42aa170919bd0847d158d087d9b0d9b"
            "92ad41114cf03a3d44ec84",
            UInt256.from_hex(
                "199bd28f711413cf2cf04a2520f3ccadbff296d9be231c00cb6308528a0b51ca",
            ),
            UInt256.from_hex(
                "8a2fcc5700a89f37a3726cdf3202353bf61f280815a9df744e3c9de6215a745a",
            ),
        )

    def test_3_stakes(self):
        self._test(
            master2,
            sequence2,
            expiration2,
            utxos2,
            payout_pubkey,
            expected_proof2,
            expected_limited_id2,
            expected_proofid2,
        )
        # Change the order of UTXOS to test that the stakes have a unique order inside
        # a proof.
        self._test(
            master2,
            sequence2,
            expiration2,
            utxos2[::-1],
            payout_pubkey,
            expected_proof2,
            expected_limited_id2,
            expected_proofid2,
        )

    def test_adding_stakes_to_proof(self):
        key_wif = "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM"

        wallet = wallet_from_wif_keys(key_wif)

        masterkey = Key.from_wif("L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW")
        proofbuilder = ProofBuilder(
            sequence=0,
            expiration_time=1670827913,
            payout_address=Address.from_string(
                "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4"
            ),
            wallet=wallet,
            master=masterkey,
        )
        txid = UInt256.from_hex(
            "37424bda9a405b59e7d4f61a4c154cea5ee34e445f3daa6033b64c70355f1e0b"
        )
        proofbuilder.sign_and_add_stake(
            StakeAndSigningData(
                Stake(
                    OutPoint(txid, 0),
                    amount=3291110545,
                    height=700000,
                    is_coinbase=False,
                ),
                Address.from_string("ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"),
            )
        )

        proof = None

        def test_initial_proof(_proof):
            nonlocal proof
            proof = _proof

            self.assertEqual(
                proof.to_hex(),
                "000000000000000089cf96630000000021023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3010b1e5f35704cb63360aa3d5f444ee35eea4c154c1af6d4e7595b409ada4b423700000000915c2ac400000000c05c15002102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680b8d717142339f0baf0c8099bafd6491d42e73f7224cacf1daa20a2aeb7b4b3fa68a362bfed33bf20ec1c08452e6ad5536fec3e1198d839d64c2e0e6fe25afaa61976a9149a9ad444d4542b572b12d9be83ac79158cc175cb88acc768803afa6a4662bab4199535122b4a8c7fb9889f1fe77043d8ecd43ad04c5cf07e602e47b68deaac1bbdc7c170ad57c38aa47e5a5d23cac011c15ed31bbc54",
            )
            self.assertTrue(proof.verify_master_signature())

        proofbuilder.build(on_completion=test_initial_proof)

        # create a new builder from this proof, add more stakes
        proofbuilder_add_stakes = ProofBuilder.from_proof(proof, wallet, masterkey)
        txid = UInt256.from_hex(
            "300cbba81ef40a6d269be1e931ccb58c074ace4a9b06cc0f2a2c9bf1e176ede4"
        )
        proofbuilder_add_stakes.sign_and_add_stake(
            StakeAndSigningData(
                Stake(
                    OutPoint(txid, 1),
                    amount=2866370216,
                    height=700001,
                    is_coinbase=False,
                ),
                Address.from_string("ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"),
            )
        )

        def test_proof_with_added_stake(_proof):
            self.assertEqual(
                _proof.to_hex(),
                "000000000000000089cf96630000000021023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde302e4ed76e1f19b2c2a0fcc069b4ace4a078cb5cc31e9e19b266d0af41ea8bb0c3001000000a856d9aa00000000c25c15002102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68089bf7f0f956b084160d505dcd8b375499ffad816d1c76c8b13ac92d1ef3c5c3ecb6ee6c094ef790fb93f6711955c48f2cf098750427808c9e2aab77ee1b8de110b1e5f35704cb63360aa3d5f444ee35eea4c154c1af6d4e7595b409ada4b423700000000915c2ac400000000c05c15002102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680b8d717142339f0baf0c8099bafd6491d42e73f7224cacf1daa20a2aeb7b4b3fa68a362bfed33bf20ec1c08452e6ad5536fec3e1198d839d64c2e0e6fe25afaa61976a9149a9ad444d4542b572b12d9be83ac79158cc175cb88acec2623216b901037fb780e3d2a06f982bbe36d87be7adc82e83ebfc1f3c4eff6262577cfa9f72d18570dc5cdf9bf96676700abdb3d8f4bc989c975870ab8cbb7",
            )

        proofbuilder_add_stakes.build(on_completion=test_proof_with_added_stake)

    def test_without_master_private_key(self):
        key_wif = "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM"
        wallet = wallet_from_wif_keys(key_wif)

        masterkey = Key.from_wif("L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW")
        master_pub = masterkey.get_pubkey()
        proofbuilder = ProofBuilder(
            sequence=0,
            expiration_time=1670827913,
            payout_address=Address.from_string(
                "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4"
            ),
            wallet=wallet,
            master_pub=master_pub,
        )
        txid = UInt256.from_hex(
            "37424bda9a405b59e7d4f61a4c154cea5ee34e445f3daa6033b64c70355f1e0b"
        )
        proofbuilder.sign_and_add_stake(
            StakeAndSigningData(
                Stake(
                    OutPoint(txid, 0),
                    amount=3291110545,
                    height=700000,
                    is_coinbase=False,
                ),
                Address.from_string("ecash:qrl3p3j0vda2p6t7aepzc3c3fshefz0uhveex0udjh"),
            )
        )

        # Same proof as the first one in test_adding_stakes_to_proof
        expected_hex = "000000000000000089cf96630000000021023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3010b1e5f35704cb63360aa3d5f444ee35eea4c154c1af6d4e7595b409ada4b423700000000915c2ac400000000c05c15002102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce680b8d717142339f0baf0c8099bafd6491d42e73f7224cacf1daa20a2aeb7b4b3fa68a362bfed33bf20ec1c08452e6ad5536fec3e1198d839d64c2e0e6fe25afaa61976a9149a9ad444d4542b572b12d9be83ac79158cc175cb88acc768803afa6a4662bab4199535122b4a8c7fb9889f1fe77043d8ecd43ad04c5cf07e602e47b68deaac1bbdc7c170ad57c38aa47e5a5d23cac011c15ed31bbc54"
        expected_hex_no_sig = expected_hex[:-128] + 64 * "00"

        proof = None

        def check_proof_stage1(_proof):
            nonlocal proof
            proof = _proof

            self.assertEqual(proof.to_hex(), expected_hex_no_sig)
            self.assertFalse(proof.verify_master_signature())

        proofbuilder.build(on_completion=check_proof_stage1)

        proofbuilder = ProofBuilder.from_proof(proof, wallet)

        def check_proof_stage2(_proof):
            nonlocal proof
            proof = _proof

            self.assertEqual(proof.to_hex(), expected_hex_no_sig)
            self.assertFalse(proof.verify_master_signature())

        proofbuilder.build(on_completion=check_proof_stage2)

        proofbuilder = ProofBuilder.from_proof(proof, wallet, masterkey)

        def check_proof_stage3(_proof):
            self.assertEqual(_proof.to_hex(), expected_hex)
            self.assertTrue(_proof.verify_master_signature())

        proofbuilder.build(on_completion=check_proof_stage3)

    def test_payout_address_script(self):
        """Test that the proof builder generates the expected script for an address"""

        # This script was generated using Bitcoin ABC's decodeavalancheproof RPC
        # on a proof build with the buildavalancheproof RPC using
        # ADDRESS_ECREG_UNSPENDABLE as the payout address
        payout_script_pubkey = bytes.fromhex(
            "76a914000000000000000000000000000000000000000088ac"
        )
        # Sanity check
        _txout_type, addr = get_address_from_output_script(payout_script_pubkey)
        self.assertEqual(
            addr.to_ui_string(), "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx"
        )

        wallet = wallet_from_wif_keys(
            "KydYrKDNsVnY5uhpLyC4UmazuJvUjNoKJhEEv9f1mdK1D5zcnMSM"
        )
        pb = ProofBuilder(
            sequence=0,
            expiration_time=1670827913,
            payout_address=addr,
            wallet=wallet,
            master=master2,
        )

        def check_proof(proof):
            script = Address.from_string(
                "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt",
                support_arbitrary_prefix=True,
            ).to_script()
            self.assertEqual(script, proof.payout_script_pubkey)
            self.assertEqual(addr, proof.get_payout_address())

        pb.build(on_completion=check_proof)


class TestAvalancheProofFromHex(unittest.TestCase):
    def test_proofid(self):
        # Data from bitcoin ABC's proof_tests
        # 1 stake
        proof = Proof.from_hex(
            "d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8b"
            "c67bb05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967"
            "e16beb692fc5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb"
            "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce68099f1e258ab"
            "54f960102c8b480e1dd5795422791bb8a7a19e5542fe8b6a76df7fa09a3fd4be62db7"
            "50131f1fbea6f7bb978288f7fe941c39ef625aa80576e19fc43410469ab5a892ffa4b"
            "b104a3d5760dd893a5502512eea4ba32a6d6672767be4959c0f70489b803a47a3abf8"
            "3f30e8d9da978de4027c70ce7e0d3b0ad62eb08edd8f9ac05a9ea3a5333926249331f"
            "34a41a3519bab179ce9228dc940019ee80f754da0499379229f9b49f1bccc6566a734"
            "7227299f775939444505952f920ccea8b9f18"
        )
        ltd_id = LimitedProofId.from_hex(
            "deabf2c0f8e656857340aeb029bbf88ba11dbaf2d98b8e754556f6ebc173801f"
        )
        proof_id = ProofId.from_hex(
            "cdcdd71605139f49d4884b0c3d9a6be309f07b008a760bb3b25fcfcb7a3ffc46"
        )

        self.assertEqual(proof.limitedid, ltd_id)
        self.assertEqual(proof.proofid, proof_id)

        # 3 stakes
        proof = Proof.from_hex(
            "c964aa6fde575e4ce8404581c7be874e21023beefdde700a6bc02036335b4df141c8b"
            "c67bb05a971f5ac2745fd683797dde3030b1e5f35704cb63360aa3d5f444ee35eea4c"
            "154c1af6d4e7595b409ada4b42377764698a915c2ac4000000000f28db322102449fb"
            "5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6809d1eddf2e4"
            "6ca8bfc4ff8d512c2c9fed6371baf1335940397ec40b1d6da8f8f086f8cd01a90ecee"
            "97096d0cfc4f56f8b5166d03ee1d1935a5b4e79c11cbf9c74e4ed76e1f19b2c2a0fcc"
            "069b4ace4a078cb5cc31e9e19b266d0af41ea8bb0c30c8b47c95a856d9aa000000007"
            "dfdd89a2102449fb5237efe8f647d32e8b64f06c22d1d40368eaca2a71ffc6a13ecc8"
            "bce680dfcfdcf00a1ac526c8ca44fe095a0a204e5e2b85b0ad3fadaf53ec84e2c9408"
            "300f2dc21781346d71f941e045871f7931622dc4a4331c795d8ca596d24ddb021ac09"
            "8c86414715db364a4e32216084c561acdd79e0860b1fdf7497b159cb1323045120029"
            "6c902ee000000009f2bc7392102449fb5237efe8f647d32e8b64f06c22d1d40368eac"
            "a2a71ffc6a13ecc8bce6801f42d48c9369898b7c5eb4157f30745b9ee51b32882b320"
            "32429f77166a1ebab6b88de018bf0340097887b1aeff8b7aa728a072b38e02ee8a705"
            "14db1de147ad2321038439233261789dd340bdc1450172d9c671b72ee8c0b2736ed2a"
            "3a250760897fdace7662689aa1c9c5d9d9a6dbe9a94859be27fbddca080abff31012a"
            "5277bc98630c47bb04830514ac04304d726b598e05c4cd89506bb2e1f0a78f54ab3f3"
            "15cfe"
        )
        ltd_id = LimitedProofId.from_hex(
            "7223b8cc572bdf8f123ee7dd0316962f0367b0be8bce9b6e9465d1f413d95616"
        )
        proof_id = ProofId.from_hex(
            "95c9673bc14f3c36e9310297e8df81867b42dd1a7bb7944aeb6c1797fbd2a6d5"
        )
        self.assertEqual(proof.limitedid, ltd_id)
        self.assertEqual(proof.proofid, proof_id)

    def test_proof_data(self):
        # Reuse a proof from a test above, but instead of building the proof and
        # checking that the resulting serialized proof matches the expected, we do
        # it the other way around: deserialize the proof and check that all fields
        # match the expected data.
        proof = Proof.from_hex(expected_proof1)

        self.assertEqual(proof.sequence, 42)
        self.assertEqual(proof.expiration_time, 1699999999)
        self.assertEqual(proof.master_pub, PublicKey.from_hex(pubkey_hex))
        self.assertEqual(proof.limitedid, LimitedProofId.from_hex(expected_limited_id1))
        self.assertEqual(proof.proofid, ProofId.from_hex(expected_proofid1))
        self.assertEqual(proof.signed_stakes[0].stake.utxo.txid, utxos[0]["txid"])
        self.assertEqual(proof.signed_stakes[0].stake.utxo.n, utxos[0]["vout"])
        self.assertEqual(proof.signed_stakes[0].stake.amount, utxos[0]["amount"])
        self.assertEqual(proof.signed_stakes[0].stake.height, utxos[0]["height"])
        self.assertFalse(proof.signed_stakes[0].stake.is_coinbase)
        self.assertEqual(
            proof.signed_stakes[0].stake.pubkey,
            PublicKey.from_hex(
                "04d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645cd852"
                "28a6fb29940e858e7e55842ae2bd115d1ed7cc0e82d934e929c97648cb0a"
            ),
        )
        self.assertEqual(
            proof.signed_stakes[0].sig,
            base64.b64decode(
                "vZdAyFoFp9VDw9MBJz15/3BUdYV54wzAXN/hrKM3St/lUQS0Cf/OSi8Z2KWYHV8MebI+2s"
                "czUqsomKyoknAoJQ==".encode("ascii")
            ),
        )
        self.assertEqual(proof.payout_script_pubkey, b"")

        proof2 = Proof.from_hex(expected_proof2)
        self.assertEqual(proof2.payout_script_pubkey, payout_pubkey.to_script())

    def test_raises_deserializationerror(self):
        with self.assertRaises(DeserializationError):
            Proof.from_hex("not hex")
        with self.assertRaises(DeserializationError):
            Proof.from_hex("aabbc")

        # Drop the last hex char to make the string not valid hex
        with self.assertRaises(DeserializationError):
            Proof.from_hex(expected_proof1[:-1])

        # Proper hex, but not a proof
        with self.assertRaises(DeserializationError):
            Proof.from_hex("aabbcc")

        # Drop the last byte to make the signature incomplete
        with self.assertRaises(DeserializationError):
            Proof.from_hex(expected_proof1[:-2])

        # A ProofId must have exactly 32 bytes
        ProofId.from_hex(32 * "aa")

        with self.assertRaises(DeserializationError):
            ProofId.from_hex(31 * "aa")

        with self.assertRaises(DeserializationError):
            ProofId.from_hex(33 * "aa")

        with self.assertRaises(DeserializationError):
            LimitedProofId.from_hex(32 * "yz")


one_level_dg_hex = (
    "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
    "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
    "012103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e6"
    "45ef7d512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521"
    "f7e2e767c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc"
)


class TestAvalancheDelegationBuilder(unittest.TestCase):
    def setUp(self) -> None:
        self.level1_privkey = Key.from_wif(
            "KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77"
        )
        self.level1_pubkey = PublicKey.from_hex(
            "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef"
        )
        self.level2_pubkey = PublicKey.from_hex(
            "03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a"
        )

        self.wrong_proof_master = Key.from_wif(
            "KwM6hV6hxZt3Kt4NHMtWQGH5T2SwhpyswodUQC2zmSjg6KWFWkQU"
        )

        self.base_delegation = Delegation.from_hex(
            "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e521030b4c86"
            "6585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744012103e49f9df52d"
            "e2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef22c1dd0a15c32d251dd9"
            "93dde979e8f2751a468d622ca7db10bfc11180497d0ff4be928f362fd8fcd5259cef923bb4"
            "71840c307e9bc4f89e5426b4e67b72d90e"
        )

        self.two_levels_delegation = Delegation.from_hex(
            "6428c2c29a116191d42fe68e74f1ee33f8a285c13320d77b201c3ab9135c84e521030b4c86"
            "6585dd868a9d62348a9cd008d6a312937048fff31670e7e920cfc7a744022103e49f9df52d"
            "e2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef22c1dd0a15c32d251dd9"
            "93dde979e8f2751a468d622ca7db10bfc11180497d0ff4be928f362fd8fcd5259cef923bb4"
            "71840c307e9bc4f89e5426b4e67b72d90e2103aac52f4cfca700e7e9824298e0184755112e"
            "32f359c832f5f6ad2ef62a2c024a77c153340bb951e56df134c66042426f4fe33b670bb2d4"
            "85f6d96f9d0d1db525dfa449565b8f424d71615d5f6c9399334b2550d554577ffa2ee8d758"
            "eb8ded88"
        )

    def test_from_ltd_id(self):
        # This is based on the proof from the Bitcoin ABC test framework's unit test
        # in messages.py:
        #     d97587e6c882615796011ec8f9a7b1c621023beefdde700a6bc02036335b4df141c8bc67bb
        #     05a971f5ac2745fd683797dde30169a79ff23e1d58c64afad42ad81cffe53967e16beb692f
        #     c5776bb442c79c5d91de00cf21804712806594010038e168a32102449fb5237efe8f647d32
        #     e8b64f06c22d1d40368eaca2a71ffc6a13ecc8bce6804534ca1f5e22670be3df5cbd5957d8
        #     dd83d05c8f17eae391f0e7ffdce4fb3defadb7c079473ebeccf88c1f8ce87c61e451447b89
        #     c445967335ffd1aadef429982321023beefdde700a6bc02036335b4df141c8bc67bb05a971
        #     f5ac2745fd683797dde3ac7b0b7865200f63052ff980b93f965f398dda04917d411dd46e3c
        #     009a5fef35661fac28779b6a22760c00004f5ddf7d9865c7fead7e4a840b94793959026164
        #     0f

        proof_master = Key.from_wif(
            "L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW"
        )
        dgb = DelegationBuilder(
            LimitedProofId.from_hex(
                "c1283084c878408b2a5a11b7a1155b3cccce91526e4da0ba3947bbcf9d9ed402"
            ),
            proof_master.get_pubkey(),
        )
        dgb.add_level(proof_master, self.level1_pubkey)
        self.assertEqual(
            dgb.build(),
            Delegation.from_hex(
                "02d49e9dcfbb4739baa04d6e5291cecc3c5b15a1b7115a2a8b4078c8843028c121023b"
                "eefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3012103e4"
                "9f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645effa701924"
                "fe7367835b3a0fb30bcc706f00624633980f601987400bb24551cf57bd9f2d106f5c58"
                "4e4e0efa2069a606cf1aa64f776ccb3304f8486eb3d1ce3acf"
            ),
        )

    def test_from_proof(self):
        proof_master = Key.from_wif(
            "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw"
        )
        proof = Proof.from_hex(expected_proof1)
        self.assertEqual(proof.master_pub, proof_master.get_pubkey())

        dgb = DelegationBuilder.from_proof(proof)

        # Level 1
        dgb.add_level(proof_master, self.level1_pubkey)
        self.assertEqual(dgb.build(), self.base_delegation)

        # Level 2
        dgb.add_level(self.level1_privkey, self.level2_pubkey)
        self.assertEqual(dgb.build(), self.two_levels_delegation)

    def test_wrong_privkey_raises(self):
        proof = Proof.from_hex(expected_proof1)

        dgb = DelegationBuilder.from_proof(proof)
        with self.assertRaises(WrongDelegatorKeyError):
            dgb.add_level(self.wrong_proof_master, self.level1_pubkey)

    def test_from_delegation(self):
        dgb = DelegationBuilder.from_delegation(self.base_delegation)
        self.assertEqual(dgb.build(), self.base_delegation)

        dgb.add_level(self.level1_privkey, self.level2_pubkey)
        self.assertEqual(dgb.build(), self.two_levels_delegation)


class TestAvalancheDelegationFromHex(unittest.TestCase):
    def setUp(self) -> None:
        self.proof_master = PublicKey.from_hex(
            "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
        )
        self.ltd_proof_id = LimitedProofId.from_hex(
            "0d45ca55662c483107b45f5c5699e0d8c7778b245c116cb988abba1afa6a1146"
        )
        self.pubkey1 = PublicKey.from_hex(
            "03e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645ef"
        )
        self.pubkey2 = PublicKey.from_hex(
            "03aac52f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a"
        )
        self.sig1 = base64.b64decode(
            "fVEt2+p8iNzzhBK1g3SFakZuFleXppMhwJKKicZFIffi52fJPeZF71El7JAdzVE0d4fKKXced4"
            "a75ALS1erQ3A==".encode("ascii")
        )
        self.sig2 = base64.b64decode(
            "XN3Q/+hOEuS/SeTAr3yFSOYYok4SSV1ln1unXhFOFSamGKowWx5pv2riCyVXmZ8uP+wl1fInH4"
            "ud4NBrpzRFUA==".encode("ascii")
        )

    def test_empty_delegation(self):
        delegation = Delegation.from_hex(
            "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
            "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
            "00"
        )
        self.assertEqual(delegation.proof_master, self.proof_master)
        self.assertEqual(delegation.limited_proofid, self.ltd_proof_id)
        self.assertEqual(
            delegation.dgid,
            DelegationId.from_hex(
                "afc74900c1f28b69e466461fb1e0663352da6153be0fcd59280e27f2446391d5"
            ),
        )
        self.assertEqual(delegation.get_delegated_public_key(), delegation.proof_master)
        self.assertEqual(delegation.levels, [])

        self.assertEqual(delegation.verify(), (True, self.proof_master))

    def test_one_level(self):
        delegation = Delegation.from_hex(one_level_dg_hex)
        self.assertEqual(delegation.proof_master, self.proof_master)
        self.assertEqual(delegation.limited_proofid, self.ltd_proof_id)
        self.assertEqual(
            delegation.dgid,
            DelegationId.from_hex(
                "ffcd49dc98ebdbc90e731a7b0c89939bfe082f15f3aa82aca657176b83669185"
            ),
        )
        self.assertEqual(delegation.get_delegated_public_key(), self.pubkey1)
        self.assertEqual(delegation.levels, [Level(self.pubkey1, self.sig1)])

        self.assertEqual(delegation.verify(), (True, self.pubkey1))

    def test_two_levels(self):
        delegation = Delegation.from_hex(
            "46116afa1abaab88b96c115c248b77c7d8e099565c5fb40731482c6655ca450d21"
            "023beefdde700a6bc02036335b4df141c8bc67bb05a971f5ac2745fd683797dde3"
            "022103e49f9df52de2dea81cf7838b82521b69f2ea360f1c4eed9e6c89b7d0f9e645e"
            "f7d512ddbea7c88dcf38412b58374856a466e165797a69321c0928a89c64521f7e2e7"
            "67c93de645ef5125ec901dcd51347787ca29771e7786bbe402d2d5ead0dc2103aac52"
            "f4cfca700e7e9824298e0184755112e32f359c832f5f6ad2ef62a2c024a5cddd0ffe8"
            "4e12e4bf49e4c0af7c8548e618a24e12495d659f5ba75e114e1526a618aa305b1e69b"
            "f6ae20b2557999f2e3fec25d5f2271f8b9de0d06ba7344550"
        )
        self.assertEqual(delegation.proof_master, self.proof_master)
        self.assertEqual(delegation.limited_proofid, self.ltd_proof_id)
        self.assertEqual(
            delegation.dgid,
            DelegationId.from_hex(
                "a3f98e6b5ec330219493d109e5c11ed8e302315df4604b5462e9fb80cb0fde89"
            ),
        )
        self.assertEqual(delegation.get_delegated_public_key(), self.pubkey2)
        self.assertEqual(
            delegation.levels,
            [
                Level(self.pubkey1, self.sig1),
                Level(self.pubkey2, self.sig2),
            ],
        )

    def test_raises_deserializationerror(self):
        # Drop the last hex char to make the string not valid hex
        with self.assertRaises(DeserializationError):
            Delegation.from_hex(one_level_dg_hex[:-1])

        # Proper hex, but not a proof
        with self.assertRaises(DeserializationError):
            Delegation.from_hex("aabbcc")

        # Drop the last byte to make the signature
        with self.assertRaises(DeserializationError):
            Delegation.from_hex(one_level_dg_hex[:-2])


if __name__ == "__main__":
    unittest.main()
