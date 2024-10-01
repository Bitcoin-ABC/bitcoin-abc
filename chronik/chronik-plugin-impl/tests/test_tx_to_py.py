# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from chronik_plugin.etoken import GenesisInfo, Token, TokenTxEntry
from chronik_plugin.script import CScript
from chronik_plugin.tx import OutPoint, PluginOutputEntry, Tx, TxInput, TxOutput
from test_framework.util import assert_equal


def slp_amount(token_id: str, token_type: int, amount: int, entry_idx=0) -> Token:
    return Token(
        token_id=token_id,
        token_protocol="SLP",
        token_type=token_type,
        entry_idx=entry_idx,
        amount=amount,
        is_mint_baton=False,
    )


def slp_baton(token_id: str, token_type: int, entry_idx=0) -> Token:
    return Token(
        token_id=token_id,
        token_protocol="SLP",
        token_type=token_type,
        entry_idx=entry_idx,
        amount=0,
        is_mint_baton=True,
    )


def alp_amount(token_id: str, token_type: int, amount: int, entry_idx=0) -> Token:
    return Token(
        token_id=token_id,
        token_protocol="ALP",
        token_type=token_type,
        entry_idx=entry_idx,
        amount=amount,
        is_mint_baton=False,
    )


def alp_baton(token_id: str, token_type: int, entry_idx=0) -> Token:
    return Token(
        token_id=token_id,
        token_protocol="ALP",
        token_type=token_type,
        entry_idx=entry_idx,
        amount=0,
        is_mint_baton=True,
    )


def test_non_token_tx(tx: Tx):
    assert_equal(tx.txid, b"\x01" * 32)
    assert_equal(tx.version, 1)
    assert_equal(
        tx.inputs,
        [
            TxInput(
                prev_out=OutPoint(b"\x05" * 32, 7),
                script=CScript(bytes.fromhex("0101")),
                output=TxOutput(
                    script=CScript(
                        bytes.fromhex("a914020202020202020202020202020202020202020287")
                    ),
                    value=50000,
                    token=None,
                ),
                sequence=0x12345678,
                plugin={},
            ),
            TxInput(
                prev_out=OutPoint(b"\x08" * 32, 22),
                script=CScript(b""),
                output=None,
                sequence=0,
                plugin={},
            ),
        ],
    )
    assert_equal(
        tx.outputs,
        [
            TxOutput(
                script=CScript(
                    bytes.fromhex("76a914060606060606060606060606060606060606060688ac")
                ),
                value=40000,
                token=None,
            ),
        ],
    )
    assert_equal(tx.lock_time, 0x87654321)
    assert_equal(tx.token_entries, [])
    assert_equal(tx.empp_data, [])


def test_slp_genesis_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(tx.inputs, [])
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            slp_amount("02" * 32, 1, 1234),
            slp_baton("02" * 32, 1),
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="02" * 32,
                token_protocol="SLP",
                token_type=1,
                tx_type="GENESIS",
                group_token_id=None,
                genesis_info=GenesisInfo(
                    token_ticker=b"SLP FUNGIBLE",
                    token_name=b"Slp Fungible",
                    mint_vault_scripthash=None,
                    url=b"https://slp.fungible",
                    hash=b"x" * 32,
                    data=None,
                    auth_pubkey=None,
                    decimals=4,
                ),
            ),
        ],
    )


def test_slp_mint_vault_genesis_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(tx.inputs, [])
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            slp_amount("02" * 32, 2, 1234),
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="02" * 32,
                token_protocol="SLP",
                token_type=2,
                tx_type="GENESIS",
                group_token_id=None,
                genesis_info=GenesisInfo(
                    token_ticker=b"SLP MINT VAULT",
                    token_name=b"Slp Mint Vault",
                    mint_vault_scripthash=b"\x05" * 20,
                    url=b"https://slp.mintvault",
                    hash=None,
                    data=None,
                    auth_pubkey=None,
                    decimals=4,
                ),
            ),
        ],
    )


def test_slp_nft1_child_genesis_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [
            slp_amount("03" * 32, 0x81, 1, entry_idx=1),
        ],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            slp_amount("02" * 32, 0x41, 1),
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="02" * 32,
                token_protocol="SLP",
                token_type=0x41,
                tx_type="GENESIS",
                group_token_id="03" * 32,
                genesis_info=GenesisInfo(
                    token_ticker=b"",
                    token_name=b"",
                    mint_vault_scripthash=None,
                    url=b"",
                    hash=None,
                    data=None,
                    auth_pubkey=None,
                    decimals=0,
                ),
            ),
            TokenTxEntry(
                token_id="03" * 32,
                token_protocol="SLP",
                token_type=0x81,
            ),
        ],
    )


def test_slp_mint_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [
            slp_baton("03" * 32, 1),
        ],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            slp_amount("03" * 32, 1, 1234),
            slp_baton("03" * 32, 1),
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="03" * 32,
                token_protocol="SLP",
                token_type=1,
                tx_type="MINT",
            ),
        ],
    )


def test_slp_send_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [
            slp_amount("03" * 32, 1, 20),
        ],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            slp_amount("03" * 32, 1, 5),
            slp_amount("03" * 32, 1, 6),
            slp_amount("03" * 32, 1, 7),
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="03" * 32,
                token_protocol="SLP",
                token_type=1,
                tx_type="SEND",
                actual_burn_amount=2,
            ),
        ],
    )


def test_slp_burn_tx(tx: Tx):
    assert_equal(tx.txid, b"\x02" * 32)
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [
            slp_amount("03" * 32, 1, 600),
        ],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
        ],
    )
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="03" * 32,
                token_protocol="SLP",
                token_type=1,
                tx_type="BURN",
                actual_burn_amount=600,
                intentional_burn_amount=500,
            ),
        ],
    )


def test_alp_tx(tx: Tx):
    assert_equal(tx.txid, b"\x01" * 32)
    assert_equal(len(tx.token_entries), 11)
    assert_equal(
        tx.token_entries[0],
        TokenTxEntry(
            token_id="01" * 32,
            token_protocol="ALP",
            token_type=0,
            tx_type="GENESIS",
            genesis_info=GenesisInfo(
                token_ticker=b"ALP STANDARD",
                token_name=b"Alp Standard",
                mint_vault_scripthash=None,
                url=b"https://alp.std",
                hash=None,
                data=b"ALP DATA",
                auth_pubkey=b"ALP PubKey",
                decimals=2,
            ),
        ),
    )
    assert_equal(
        tx.token_entries[1],
        TokenTxEntry(
            token_id="02" * 32,
            token_protocol="ALP",
            token_type=0,
            tx_type="MINT",
        ),
    )
    assert_equal(
        tx.token_entries[2],
        TokenTxEntry(
            token_id="03" * 32,
            token_protocol="ALP",
            token_type=0,
            tx_type="SEND",
            actual_burn_amount=500,
            intentional_burn_amount=1000,
        ),
    )
    assert_equal(
        tx.token_entries[3],
        TokenTxEntry(
            token_id="08" * 32,
            token_protocol="ALP",
            token_type=0,
            tx_type="SEND",
            is_invalid=True,
        ),
    )
    assert_equal(
        tx.token_entries[4],
        TokenTxEntry(
            token_id="00" * 32,
            token_protocol="ALP",
            token_type=2,
            tx_type="UNKNOWN",
        ),
    )
    assert_equal(
        tx.token_entries[5],
        TokenTxEntry(
            token_id="00" * 32,
            token_protocol="SLP",
            token_type=3,
            is_invalid=True,
        ),
    )
    assert_equal(
        tx.token_entries[6],
        TokenTxEntry(
            token_id="00" * 32,
            token_protocol="ALP",
            token_type=3,
            is_invalid=True,
        ),
    )
    assert_equal(
        tx.token_entries[7],
        TokenTxEntry(
            token_id="04" * 32,
            token_protocol="SLP",
            token_type=1,
            is_invalid=True,
            actual_burn_amount=30,
        ),
    )
    assert_equal(
        tx.token_entries[8],
        TokenTxEntry(
            token_id="05" * 32,
            token_protocol="SLP",
            token_type=2,
            is_invalid=True,
            actual_burn_amount=20,
        ),
    )
    assert_equal(
        tx.token_entries[9],
        TokenTxEntry(
            token_id="06" * 32,
            token_protocol="SLP",
            token_type=0x81,
            is_invalid=True,
            actual_burn_amount=20,
        ),
    )
    assert_equal(
        tx.token_entries[10],
        TokenTxEntry(
            token_id="07" * 32,
            token_protocol="SLP",
            token_type=0x41,
            group_token_id="0606060606060606060606060606060606060606060606060606060606060606",
            is_invalid=True,
            actual_burn_amount=1,
        ),
    )
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [
            alp_baton("02" * 32, 0, entry_idx=1),
            None,
            alp_amount("03" * 32, 0, 2000, entry_idx=2),
            alp_amount("03" * 32, 0, 5000, entry_idx=2),
            slp_amount("04" * 32, 1, 30, entry_idx=7),
            slp_amount("05" * 32, 2, 20, entry_idx=8),
            slp_amount("06" * 32, 0x81, 20, entry_idx=9),
            slp_amount("07" * 32, 0x41, 1, entry_idx=10),
            alp_amount("00" * 32, 3, 0, entry_idx=6),
            slp_amount("00" * 32, 3, 0, entry_idx=5),
        ],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [
            None,
            alp_amount("02" * 32, 0, 1000, entry_idx=1),
            alp_amount("03" * 32, 0, 500, entry_idx=2),
            alp_amount("01" * 32, 0, 10, entry_idx=0),
            alp_baton("02" * 32, 0, entry_idx=1),
            None,
            alp_baton("01" * 32, 0, entry_idx=0),
            alp_baton("01" * 32, 0, entry_idx=0),
            alp_amount("00" * 32, 2, 0, entry_idx=4),
            alp_amount("03" * 32, 0, 6000, entry_idx=2),
            alp_amount("00" * 32, 2, 0, entry_idx=4),
        ],
    )


def test_non_token_burn_tx(tx: Tx):
    assert_equal(
        tx.token_entries,
        [
            TokenTxEntry(
                token_id="02" * 32,
                token_protocol="ALP",
                token_type=0,
                is_invalid=True,
                actual_burn_amount=200,
            )
        ],
    )
    assert_equal(
        [inpt.output.token for inpt in tx.inputs],
        [alp_amount("02" * 32, 0, 200)],
    )
    assert_equal(
        [output.token for output in tx.outputs],
        [None, None],
    )


def test_plugin_inputs_tx(tx: Tx):
    assert_equal(
        [inpt.plugin for inpt in tx.inputs],
        [
            {
                "plg1": PluginOutputEntry(groups=[b"grp1", b"grp2"], data=[b"dat1"]),
                "plg2": PluginOutputEntry(groups=[b"2grp"], data=[b"2dat"]),
            },
            {},
        ],
    )
