import unittest

import keepkeylib

from electrumabc.plugins import Plugins
from electrumabc.simple_config import SimpleConfig
from electrumabc.transaction import Transaction

from ..keepkey import KeepKeyPlugin


class TestKeepKeyPlugin(unittest.TestCase):
    def test_electrum_tx_to_txtype(self):
        config = SimpleConfig()
        gui_name = "dummy name"
        plugins = Plugins(config, gui_name)
        plugin = KeepKeyPlugin(plugins, config, gui_name)

        tx = Transaction(
            bytes.fromhex(
                "02000000011dcce4740d2e5c485f721ca618181b8d56a523af355763361b839505bb28c9c7000000006441d755cc75163a46d06697eb18a6cc38118cd31bacc5830b80bff9c85c14f00b17bf939549619c72c5230f9e83ff4b6525dad76298e833e7cf7e61b0f8d26ba0904121022d7c29a4517239de97e9aad96d47af527c302791e69e53451e3532cf89dbd38dfeffffff0170b00000000000001976a91409cc75a1c2bc4c33edd69e70fa4a278300cd865e88ac00000000"
            )
        )

        expected_txtype = keepkeylib.client.types.TransactionType()
        expected_txtype.version = 2
        expected_txtype.lock_time = 0

        inp = keepkeylib.client.types.TxInputType(
            prev_hash=bytes.fromhex(
                "c7c928bb0595831b36635735af23a5568d1b1818a61c725f485c2e0d74e4cc1d"
            ),
            prev_index=0,
        )
        inp.script_sig = bytes.fromhex(
            "41d755cc75163a46d06697eb18a6cc38118cd31bacc5830b80bff9c85c14f00b17bf939549619c72c5230f9e83ff4b6525dad76298e833e7cf7e61b0f8d26ba0904121022d7c29a4517239de97e9aad96d47af527c302791e69e53451e3532cf89dbd38d"
        )
        inp.sequence = 4294967294
        expected_txtype.inputs.extend([inp])

        o = expected_txtype.bin_outputs.add()
        o.amount = 45168
        o.script_pubkey = bytes.fromhex(
            "76a91409cc75a1c2bc4c33edd69e70fa4a278300cd865e88ac"
        )

        self.assertEqual(plugin.electrum_tx_to_txtype(tx), expected_txtype)


if __name__ == "__main__":
    unittest.main()
