// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::{
    hash::ShaRmd160,
    script::Script,
    tx::{Coin, OutPoint, Tx, TxId, TxInput, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{
        burn_section, genesis_section, mint_section, sections_opreturn,
        send_section,
    },
    color::ColoredTx,
    parsed::ParsedMintData,
    slp::{burn_opreturn, genesis_opreturn, mint_opreturn, send_opreturn},
    structs::{GenesisInfo, Token, TokenVariant},
    test_helpers::{
        meta_alp, meta_alp_unknown, meta_slp, spent_amount, spent_amount_group,
        spent_baton, EMPTY_TOKEN_ID, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4,
        TOKEN_ID5, TOKEN_ID6, TOKEN_ID7, TOKEN_ID8,
    },
    token_type::{AlpTokenType, SlpTokenType},
    verify::{SpentToken, VerifyContext},
};
use chronik_plugin_impl::{
    module::{add_test_framework_to_pythonpath, load_plugin_module},
    tx::TxModule,
};
use pyo3::{types::PyModule, PyErr, PyObject, PyResult, Python};

fn make_py_tx(
    py: Python<'_>,
    tx_module: &TxModule,
    txid_num: u8,
    num_outputs: usize,
    op_return_script: Script,
    spent_tokens: &[Option<SpentToken>],
) -> PyResult<PyObject> {
    let tx = Tx::with_txid(
        TxId::from([txid_num; 32]),
        TxMut {
            version: 0,
            inputs: spent_tokens
                .iter()
                .map(|_| TxInput {
                    prev_out: OutPoint {
                        txid: TxId::from([2; 32]),
                        out_idx: 1,
                    },
                    coin: Some(Coin::default()),
                    ..Default::default()
                })
                .collect(),
            outputs: [TxOutput {
                value: 0,
                script: op_return_script.clone(),
            }]
            .into_iter()
            .chain((0..num_outputs).map(|_| TxOutput::default()))
            .collect(),
            locktime: 0,
        },
    );
    let colored_tx = ColoredTx::color_tx(&tx).unwrap_or_else(|| ColoredTx {
        outputs: vec![None; tx.outputs.len()],
        ..Default::default()
    });
    let context = VerifyContext {
        spent_tokens,
        spent_scripts: None,
        genesis_info: None,
        override_has_mint_vault: None,
    };
    let token_tx = context.verify(colored_tx);
    tx_module.bridge_tx(py, &tx, Some((&token_tx, spent_tokens)))
}

#[test]
fn test_tx_to_py() -> Result<()> {
    let non_token_tx = Tx::with_txid(
        TxId::new([1; 32]),
        TxMut {
            version: 1,
            inputs: vec![
                TxInput {
                    prev_out: OutPoint {
                        txid: TxId::new([5; 32]),
                        out_idx: 7,
                    },
                    script: Script::new(b"\x01\x01".as_ref().into()),
                    sequence: 0x12345678,
                    coin: Some(Coin {
                        output: TxOutput {
                            script: Script::p2sh(&ShaRmd160([2; 20])),
                            value: 50000,
                        },
                        height: 0,
                        is_coinbase: false,
                    }),
                },
                TxInput {
                    prev_out: OutPoint {
                        txid: TxId::new([8; 32]),
                        out_idx: 22,
                    },
                    ..Default::default()
                },
            ],
            outputs: vec![TxOutput {
                value: 40000,
                script: Script::p2pkh(&ShaRmd160([6; 20])),
            }],
            locktime: 0x87654321,
        },
    );

    load_plugin_module();
    pyo3::prepare_freethreaded_python();
    Python::with_gil(|py| -> Result<_> {
        add_test_framework_to_pythonpath(py)?;

        let handle_exc = |py_err: PyErr| {
            py_err.print(py);
            py_err
        };

        let tx_module = TxModule::import(py)?;

        let test_module = PyModule::from_code(
            py,
            include_str!("test_tx_to_py.py"),
            "test_tx_to_py.py",
            "test_tx_to_py",
        )?;

        test_module
            .getattr("test_non_token_tx")?
            .call1((tx_module.bridge_tx(py, &non_token_tx, None)?,))
            .map_err(handle_exc)?;

        let slp_genesis_tx = make_py_tx(
            py,
            &tx_module,
            2,
            2,
            genesis_opreturn(
                &GenesisInfo {
                    token_ticker: b"SLP FUNGIBLE".as_ref().into(),
                    token_name: b"Slp Fungible".as_ref().into(),
                    mint_vault_scripthash: None,
                    url: b"https://slp.fungible".as_ref().into(),
                    hash: Some([b'x'; 32]),
                    data: None,
                    auth_pubkey: None,
                    decimals: 4,
                },
                SlpTokenType::Fungible,
                Some(2),
                1234,
            ),
            &[],
        )?;
        test_module
            .getattr("test_slp_genesis_tx")?
            .call1((slp_genesis_tx,))
            .map_err(handle_exc)?;

        let slp_mint_vault_genesis_tx = make_py_tx(
            py,
            &tx_module,
            2,
            1,
            genesis_opreturn(
                &GenesisInfo {
                    token_ticker: b"SLP MINT VAULT".as_ref().into(),
                    token_name: b"Slp Mint Vault".as_ref().into(),
                    mint_vault_scripthash: Some(ShaRmd160([5; 20])),
                    url: b"https://slp.mintvault".as_ref().into(),
                    hash: None,
                    data: None,
                    auth_pubkey: None,
                    decimals: 4,
                },
                SlpTokenType::MintVault,
                None,
                1234,
            ),
            &[],
        )?;
        test_module
            .getattr("test_slp_mint_vault_genesis_tx")?
            .call1((slp_mint_vault_genesis_tx,))
            .map_err(handle_exc)?;

        let slp_nft1_child_genesis_tx = make_py_tx(
            py,
            &tx_module,
            2,
            1,
            genesis_opreturn(
                &GenesisInfo::empty_slp(),
                SlpTokenType::Nft1Child,
                None,
                1,
            ),
            &[spent_amount(
                meta_slp(TOKEN_ID3, SlpTokenType::Nft1Group),
                1,
            )],
        )?;
        test_module
            .getattr("test_slp_nft1_child_genesis_tx")?
            .call1((slp_nft1_child_genesis_tx,))
            .map_err(handle_exc)?;

        let slp_mint_tx = make_py_tx(
            py,
            &tx_module,
            2,
            2,
            mint_opreturn(&TOKEN_ID3, SlpTokenType::Fungible, Some(2), 1234),
            &[spent_baton(meta_slp(TOKEN_ID3, SlpTokenType::Fungible))],
        )?;
        test_module
            .getattr("test_slp_mint_tx")?
            .call1((slp_mint_tx,))
            .map_err(handle_exc)?;

        let slp_send_tx = make_py_tx(
            py,
            &tx_module,
            2,
            3,
            send_opreturn(&TOKEN_ID3, SlpTokenType::Fungible, &[5, 6, 7]),
            &[spent_amount(
                meta_slp(TOKEN_ID3, SlpTokenType::Fungible),
                20,
            )],
        )?;
        test_module
            .getattr("test_slp_send_tx")?
            .call1((slp_send_tx,))
            .map_err(handle_exc)?;

        let slp_burn_tx = make_py_tx(
            py,
            &tx_module,
            2,
            0,
            burn_opreturn(&TOKEN_ID3, SlpTokenType::Fungible, 500),
            &[spent_amount(
                meta_slp(TOKEN_ID3, SlpTokenType::Fungible),
                600,
            )],
        )?;
        test_module
            .getattr("test_slp_burn_tx")?
            .call1((slp_burn_tx,))
            .map_err(handle_exc)?;

        let alp_tx = make_py_tx(
            py,
            &tx_module,
            1,
            10,
            sections_opreturn(vec![
                genesis_section(
                    AlpTokenType::Standard,
                    &GenesisInfo {
                        token_ticker: b"ALP STANDARD".as_ref().into(),
                        token_name: b"Alp Standard".as_ref().into(),
                        mint_vault_scripthash: None,
                        url: b"https://alp.std".as_ref().into(),
                        hash: None,
                        data: Some(b"ALP DATA".as_ref().into()),
                        auth_pubkey: Some(b"ALP PubKey".as_ref().into()),
                        decimals: 2,
                    },
                    &ParsedMintData {
                        amounts: vec![0, 0, 10, 0, 0],
                        num_batons: 2,
                    },
                ),
                mint_section(
                    &TOKEN_ID2,
                    AlpTokenType::Standard,
                    &ParsedMintData {
                        amounts: vec![1000, 0, 0],
                        num_batons: 1,
                    },
                ),
                send_section(
                    &TOKEN_ID3,
                    AlpTokenType::Standard,
                    vec![0, 500, 0, 0, 0, 0, 0, 0, 6000],
                ),
                burn_section(&TOKEN_ID3, AlpTokenType::Standard, 1000),
                send_section(
                    &TOKEN_ID8,
                    AlpTokenType::Standard,
                    vec![0, 0, 0, 0, 40],
                ),
                b"SLP2\x02".as_ref().into(),
            ]),
            &[
                spent_baton(meta_alp(TOKEN_ID2)),
                None,
                spent_amount(meta_alp(TOKEN_ID3), 2000),
                spent_amount(meta_alp(TOKEN_ID3), 5000),
                spent_amount(meta_slp(TOKEN_ID4, SlpTokenType::Fungible), 30),
                spent_amount(meta_slp(TOKEN_ID5, SlpTokenType::MintVault), 20),
                spent_amount(meta_slp(TOKEN_ID6, SlpTokenType::Nft1Group), 20),
                spent_amount_group(
                    meta_slp(TOKEN_ID7, SlpTokenType::Nft1Child),
                    1,
                    meta_slp(TOKEN_ID6, SlpTokenType::Nft1Group),
                ),
                Some(SpentToken {
                    token: Token {
                        meta: meta_alp_unknown(EMPTY_TOKEN_ID, 3),
                        variant: TokenVariant::Unknown(3),
                    },
                    group_token_meta: None,
                }),
                Some(SpentToken {
                    token: Token {
                        meta: meta_slp(
                            EMPTY_TOKEN_ID,
                            SlpTokenType::Unknown(3),
                        ),
                        variant: TokenVariant::Unknown(3),
                    },
                    group_token_meta: None,
                }),
            ],
        )?;
        test_module
            .getattr("test_alp_tx")?
            .call1((alp_tx,))
            .map_err(handle_exc)?;

        let non_token_burn_tx = make_py_tx(
            py,
            &tx_module,
            1,
            1,
            Script::default(),
            &[spent_amount(meta_alp(TOKEN_ID2), 200)],
        )?;
        test_module
            .getattr("test_non_token_burn_tx")?
            .call1((non_token_burn_tx,))
            .map_err(handle_exc)?;

        Ok(())
    })
}
