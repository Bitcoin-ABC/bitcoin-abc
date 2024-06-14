import unittest
from io import BytesIO

from .. import psbt

# test data from psbt_wallet_tests.cpp
psbt_data = bytes.fromhex(
    "70736274ff0100a0020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c875"
    "7924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c887"
    "7f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf0080000000019"
    "76a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976"
    "a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac000000000001002080f0fa"
    "020000000017a9140fb9463421696b82c833af241c78c17ddbde493487010447522102"
    "9583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f2102da"
    "b61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d752ae2206"
    "029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f10d9"
    "0c6a4f000000800000008000000080220602dab61ff49a14db6a7d02b0cd1fbb78fc4b"
    "18312b5b4e54dae4dba2fbfef536d710d90c6a4f000000800000008001000080000100"
    "2000c2eb0b0000000017a914f6539307e3a48d1e0136d061f5d1fe19e1a24089870104"
    "47522103089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02"
    "dc21023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e73"
    "52ae2206023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f"
    "0e7310d90c6a4f000000800000008003000080220603089dc10c7ac6db54f91329af61"
    "7333db388cead0c231f723379d1b99030b02dc10d90c6a4f0000008000000080020000"
    "8000220203a9a4c37f5996d3aa25dbac6b570af0650394492942460b354753ed9eeca5"
    "877110d90c6a4f000000800000008004000080002202027f6399757d2eff55a136ad02"
    "c684b1838b6556e5f1b6b34282a94b6b5005109610d90c6a4f00000080000000800500"
    "008000"
)


class TestPSBT(unittest.TestCase):

    def test_deserialize(self):
        psbt0 = psbt.PSBT.deserialize(BytesIO(psbt_data))

        self.assertEqual(len(psbt0.sections), 5)

        # Global map
        section0 = psbt0.sections[0]
        self.assertEqual(len(section0.keypairs), 1)
        self.assertEqual(section0.keypairs[0].keytype, psbt.PSBTGlobalType.UNSIGNED_TX)
        self.assertEqual(section0.keypairs[0].keydata, b"")
        # a raw transaction
        self.assertEqual(
            section0.keypairs[0].valuedata.hex(),
            "020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff6b04ec37326fbac8e468a73bf952c8877f84f96c3f9deadeab246455e34fe0cd0100000000ffffffff0270aaf008000000001976a914d85c2b71d0060b09c9886aeb815e50991dda124d88ac00e1f505000000001976a91400aea9a2e5f0f876a588df5546e8742d1d87008f88ac00000000",
        )

        # Input 1
        section1 = psbt0.sections[1]
        self.assertEqual(len(section1.keypairs), 4)
        self.assertEqual(section1.keypairs[0].keytype, psbt.PSBTInputType.UTXO)
        self.assertEqual(section1.keypairs[0].keydata, b"")
        # a transaction output (CTxOut)
        self.assertEqual(
            section1.keypairs[0].valuedata.hex(),
            "80f0fa020000000017a9140fb9463421696b82c833af241c78c17ddbde493487",
        )

        self.assertEqual(section1.keypairs[1].keytype, psbt.PSBTInputType.REDEEM_SCRIPT)
        self.assertEqual(section1.keypairs[1].keydata, b"")
        self.assertEqual(
            section1.keypairs[1].valuedata.hex(),
            "5221029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f2102dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d752ae",
        )

        self.assertEqual(
            section1.keypairs[2].keytype, psbt.PSBTInputType.BIP32_DERIVATION
        )
        # a pubkey
        self.assertEqual(
            section1.keypairs[2].keydata.hex(),
            "029583bf39ae0a609747ad199addd634fa6108559d6c5cd39b4c2183f1ab96e07f",
        )
        # master key fingerprint (32 bytes) +  derivation path (3 x 32 bytes)
        self.assertEqual(
            section1.keypairs[2].valuedata.hex(), "d90c6a4f000000800000008000000080"
        )

        self.assertEqual(
            section1.keypairs[3].keytype, psbt.PSBTInputType.BIP32_DERIVATION
        )
        self.assertEqual(
            section1.keypairs[3].keydata.hex(),
            "02dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d7",
        )
        self.assertEqual(
            section1.keypairs[3].valuedata.hex(), "d90c6a4f000000800000008001000080"
        )

        # Input 2
        section2 = psbt0.sections[2]
        self.assertEqual(len(section2.keypairs), 4)
        self.assertEqual(section2.keypairs[0].keytype, psbt.PSBTInputType.UTXO)
        self.assertEqual(section2.keypairs[0].keydata, b"")
        self.assertEqual(
            section2.keypairs[0].valuedata.hex(),
            "00c2eb0b0000000017a914f6539307e3a48d1e0136d061f5d1fe19e1a2408987",
        )

        self.assertEqual(section2.keypairs[1].keytype, psbt.PSBTInputType.REDEEM_SCRIPT)
        self.assertEqual(section2.keypairs[1].keydata, b"")
        self.assertEqual(
            section2.keypairs[1].valuedata.hex(),
            "522103089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02dc21023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e7352ae",
        )

        self.assertEqual(
            section2.keypairs[2].keytype, psbt.PSBTInputType.BIP32_DERIVATION
        )
        self.assertEqual(
            section2.keypairs[2].keydata.hex(),
            "023add904f3d6dcf59ddb906b0dee23529b7ffb9ed50e5e86151926860221f0e73",
        )
        self.assertEqual(
            section2.keypairs[2].valuedata.hex(), "d90c6a4f000000800000008003000080"
        )

        self.assertEqual(
            section2.keypairs[3].keytype, psbt.PSBTInputType.BIP32_DERIVATION
        )
        self.assertEqual(
            section2.keypairs[3].keydata.hex(),
            "03089dc10c7ac6db54f91329af617333db388cead0c231f723379d1b99030b02dc",
        )
        self.assertEqual(
            section2.keypairs[3].valuedata.hex(), "d90c6a4f000000800000008002000080"
        )

        # Output 1
        section3 = psbt0.sections[3]
        self.assertEqual(len(section3.keypairs), 1)
        self.assertEqual(
            section3.keypairs[0].keytype, psbt.PSBTOutputType.BIP32_DERIVATION
        )
        self.assertEqual(
            section3.keypairs[0].keydata.hex(),
            "03a9a4c37f5996d3aa25dbac6b570af0650394492942460b354753ed9eeca58771",
        )
        self.assertEqual(
            section3.keypairs[0].valuedata.hex(), "d90c6a4f000000800000008004000080"
        )

        # Output 2
        section4 = psbt0.sections[4]
        self.assertEqual(len(section4.keypairs), 1)
        self.assertEqual(
            section4.keypairs[0].keytype, psbt.PSBTOutputType.BIP32_DERIVATION
        )
        self.assertEqual(
            section4.keypairs[0].keydata.hex(),
            "027f6399757d2eff55a136ad02c684b1838b6556e5f1b6b34282a94b6b50051096",
        )
        self.assertEqual(
            section4.keypairs[0].valuedata.hex(), "d90c6a4f000000800000008005000080"
        )

    def test_round_trip(self):
        psbt0 = psbt.PSBT.deserialize(BytesIO(psbt_data))
        self.assertEqual(psbt0.serialize(), psbt_data)


if __name__ == "__main__":
    unittest.main()
