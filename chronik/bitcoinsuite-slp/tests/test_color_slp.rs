// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    hash::ShaRmd160,
    script::{opcode::OP_RETURN, Script},
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    color::{
        ColoredTx, ColoredTxSection, FailedParsing, IntentionalBurn, ParseError,
    },
    slp::{
        self, burn_opreturn, genesis_opreturn, mint_opreturn,
        mint_vault_opreturn, send_opreturn,
    },
    structs::{GenesisInfo, TokenMeta, TokenOutput, TokenVariant, TxType},
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};
use pretty_assertions::assert_eq;

const TXID: TxId = TxId::new([4; 32]);
const TOKEN_ID: TokenId = TokenId::new(TXID);
const TXID1: TxId = TxId::new([1; 32]);
const TOKEN_ID1: TokenId = TokenId::new(TXID1);

fn make_tx(script: Script, n_extra_outputs: usize) -> Tx {
    Tx::with_txid(
        TXID,
        TxMut {
            outputs: [
                [TxOutput { sats: 0, script }].as_ref(),
                &vec![TxOutput::default(); n_extra_outputs],
            ]
            .concat(),
            ..Default::default()
        },
    )
}

fn meta(token_id: TokenId, token_type: SlpTokenType) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Slp(token_type),
    }
}

fn atoms(atoms: u64) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: 0,
        variant: TokenVariant::Atoms(atoms),
    })
}

const MINT_BATON: Option<TokenOutput> = Some(TokenOutput {
    token_idx: 0,
    variant: TokenVariant::MintBaton,
});

#[test]
fn test_color_slp_error() {
    let script = Script::new(vec![OP_RETURN::N, 4, b'S', b'L', b'P', 0].into());
    assert_eq!(
        ColoredTx::color_tx(&make_tx(script.clone(), 0)),
        Some(ColoredTx {
            outputs: vec![None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: None,
                bytes: script.bytecode().clone(),
                error: ParseError::Slp(slp::ParseError::TooFewPushes {
                    expected: 3,
                    actual: 1
                }),
            }],
            ..Default::default()
        })
    );

    let script =
        Script::new(vec![OP_RETURN::N, 4, b'S', b'L', b'P', b'2'].into());
    assert_eq!(
        ColoredTx::color_tx(&make_tx(script.clone(), 0)),
        Some(ColoredTx {
            outputs: vec![None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: None,
                bytes: script.bytecode().clone(),
                error: ParseError::Slp(slp::ParseError::InvalidAlpLokadId),
            }],
            ..Default::default()
        })
    );
}

#[test]
fn test_color_slp_genesis_no_baton() {
    for (token_type, amt, mint_vault_scripthash) in [
        (SlpTokenType::Fungible, 1234, None),
        (SlpTokenType::MintVault, 2345, Some(ShaRmd160([4; 20]))),
        (SlpTokenType::Nft1Child, 1, None),
        (SlpTokenType::Nft1Group, 3456, None),
    ] {
        let info = GenesisInfo {
            mint_vault_scripthash,
            ..Default::default()
        };
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                genesis_opreturn(&info, token_type, None, amt),
                4,
            )),
            Some(ColoredTx {
                outputs: vec![None, atoms(amt), None, None, None],
                sections: vec![ColoredTxSection {
                    meta: meta(TOKEN_ID, token_type),
                    tx_type: TxType::GENESIS,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: Some(info),
                }],
                ..Default::default()
            }),
        );
    }
}

#[test]
fn test_color_slp_genesis_mint_baton_out_idx() {
    for token_type in [SlpTokenType::Fungible, SlpTokenType::Nft1Group] {
        for out_idx in 2..=255 {
            let mut outputs = vec![None; out_idx + 1];
            outputs[1] = atoms(1234567);
            outputs[out_idx] = MINT_BATON;
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    genesis_opreturn(
                        &GenesisInfo::default(),
                        token_type,
                        Some(out_idx as u8),
                        1234567,
                    ),
                    out_idx,
                )),
                Some(ColoredTx {
                    outputs,
                    sections: vec![ColoredTxSection {
                        meta: TokenMeta {
                            token_id: TOKEN_ID,
                            token_type: TokenType::Slp(token_type),
                        },
                        tx_type: TxType::GENESIS,
                        required_input_sum: 0,
                        has_colored_out_of_range: false,
                        genesis_info: Some(GenesisInfo::default()),
                    }],
                    ..Default::default()
                }),
            );
        }
    }
}

#[test]
fn test_color_slp_genesis_has_colored_out_of_range() {
    for token_type in [SlpTokenType::Fungible, SlpTokenType::Nft1Group] {
        let info = GenesisInfo::default();
        let section = ColoredTxSection {
            meta: meta(TOKEN_ID, token_type),
            tx_type: TxType::GENESIS,
            required_input_sum: 0,
            has_colored_out_of_range: false,
            genesis_info: Some(GenesisInfo::default()),
        };

        // Initial quantity colored out of range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                genesis_opreturn(&info, token_type, None, 7777),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![ColoredTxSection {
                    has_colored_out_of_range: true,
                    ..section.clone()
                }],
                ..Default::default()
            }),
        );

        // 0 initial quantity doesn't color out-of-range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                genesis_opreturn(&info, token_type, None, 0),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![section.clone()],
                ..Default::default()
            }),
        );

        // Test all the possible mint_baton_out_idx
        for out_idx in 2..=255 {
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    genesis_opreturn(&info, token_type, Some(out_idx), 7777),
                    1,
                )),
                Some(ColoredTx {
                    outputs: vec![None, atoms(7777)],
                    sections: vec![ColoredTxSection {
                        has_colored_out_of_range: true,
                        ..section.clone()
                    }],
                    ..Default::default()
                }),
            );
        }
    }
}

#[test]
fn test_color_slp_mint_no_baton() {
    for (token_type, amt) in [
        (SlpTokenType::Fungible, 1234),
        (SlpTokenType::Nft1Child, 2345),
        (SlpTokenType::Nft1Group, 3456),
    ] {
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_opreturn(&TOKEN_ID1, token_type, None, amt),
                4,
            )),
            Some(ColoredTx {
                outputs: vec![None, atoms(amt), None, None, None],
                sections: vec![ColoredTxSection {
                    meta: meta(TOKEN_ID1, token_type),
                    tx_type: TxType::MINT,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                }],
                ..Default::default()
            }),
        );
    }
}

#[test]
fn test_color_slp_mint_vault() {
    for num_amounts in 1..=19 {
        let amounts = (0..num_amounts).collect::<Vec<u64>>();
        // Zero amounts are colored as None
        let outputs = [None, None]
            .into_iter()
            .chain((1..num_amounts).map(atoms))
            .collect::<Vec<_>>();
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_vault_opreturn(&TOKEN_ID1, amounts),
                num_amounts as usize,
            )),
            Some(ColoredTx {
                outputs,
                sections: vec![ColoredTxSection {
                    meta: meta(TOKEN_ID1, SlpTokenType::MintVault),
                    tx_type: TxType::MINT,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                }],
                ..Default::default()
            }),
        );
    }
}

#[test]
fn test_color_slp_mint_has_colored_out_of_range() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        let section = ColoredTxSection {
            meta: meta(TOKEN_ID1, token_type),
            tx_type: TxType::MINT,
            required_input_sum: 0,
            has_colored_out_of_range: false,
            genesis_info: None,
        };

        // Additional quantity colored out of range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_opreturn(&TOKEN_ID1, token_type, None, 7777),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![ColoredTxSection {
                    has_colored_out_of_range: true,
                    ..section.clone()
                }],
                ..Default::default()
            }),
        );

        // 0 initial quantity doesn't color out-of-range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_opreturn(&TOKEN_ID1, token_type, None, 0),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![section.clone()],
                ..Default::default()
            }),
        );

        // Test all the possible mint_baton_out_idx
        for out_idx in 2..=255 {
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    mint_opreturn(&TOKEN_ID1, token_type, Some(out_idx), 7777),
                    1,
                )),
                Some(ColoredTx {
                    outputs: vec![None, atoms(7777)],
                    sections: vec![ColoredTxSection {
                        has_colored_out_of_range: true,
                        ..section.clone()
                    }],
                    ..Default::default()
                }),
            );
        }
    }
}

#[test]
fn test_color_slp_mint_vault_has_colored_out_of_range() {
    for num_amounts in 1..=19 {
        let section = ColoredTxSection {
            meta: meta(TOKEN_ID1, SlpTokenType::MintVault),
            tx_type: TxType::MINT,
            required_input_sum: 0,
            has_colored_out_of_range: false,
            genesis_info: None,
        };

        // 0 additional amounts don't color out of range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_vault_opreturn(&TOKEN_ID1, (0..num_amounts).map(|_| 0)),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![section.clone()],
                ..Default::default()
            }),
        );

        // Amounts color out of range
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                mint_vault_opreturn(
                    &TOKEN_ID1,
                    (1..num_amounts).map(|_| 0).chain([7777]),
                ),
                0,
            )),
            Some(ColoredTx {
                outputs: vec![None],
                sections: vec![ColoredTxSection {
                    has_colored_out_of_range: true,
                    ..section
                }],
                ..Default::default()
            }),
        );
    }
}

#[test]
fn test_color_slp_send() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                send_opreturn(&TOKEN_ID1, token_type, &[4444]),
                2,
            )),
            Some(ColoredTx {
                outputs: vec![None, atoms(4444), None],
                sections: vec![ColoredTxSection {
                    meta: meta(TOKEN_ID1, token_type),
                    tx_type: TxType::SEND,
                    required_input_sum: 4444,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                }],
                ..Default::default()
            }),
        );

        for num_amounts in 1..=19 {
            let amounts = (0..num_amounts).collect::<Vec<u64>>();
            let required_input_sum =
                amounts.iter().copied().sum::<u64>() as u128;
            // Zero amounts are colored as None
            let outputs = [None, None]
                .into_iter()
                .chain((1..num_amounts).map(atoms))
                .collect::<Vec<_>>();
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    send_opreturn(&TOKEN_ID1, token_type, &amounts),
                    num_amounts as usize,
                )),
                Some(ColoredTx {
                    outputs,
                    sections: vec![ColoredTxSection {
                        meta: meta(TOKEN_ID1, token_type),
                        tx_type: TxType::SEND,
                        required_input_sum,
                        has_colored_out_of_range: false,
                        genesis_info: None,
                    }],
                    ..Default::default()
                }),
            );
        }
    }
}

#[test]
fn test_color_slp_send_vault_has_colored_out_of_range() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        for num_amounts in 1..=19 {
            let section = ColoredTxSection {
                meta: meta(TOKEN_ID1, token_type),
                tx_type: TxType::SEND,
                required_input_sum: 0,
                has_colored_out_of_range: false,
                genesis_info: None,
            };

            // 0 additional amounts don't color out of range
            let amounts = (0..num_amounts).map(|_| 0).collect::<Vec<_>>();
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    send_opreturn(&TOKEN_ID1, token_type, &amounts),
                    0,
                )),
                Some(ColoredTx {
                    outputs: vec![None],
                    sections: vec![section.clone()],
                    ..Default::default()
                }),
            );

            // Amounts color out of range
            let amounts = (1..num_amounts)
                .map(|_| 0)
                .chain([7777])
                .collect::<Vec<_>>();
            assert_eq!(
                ColoredTx::color_tx(&make_tx(
                    send_opreturn(&TOKEN_ID1, token_type, &amounts),
                    0,
                )),
                Some(ColoredTx {
                    outputs: vec![None],
                    sections: vec![ColoredTxSection {
                        required_input_sum: 7777,
                        has_colored_out_of_range: true,
                        ..section
                    }],
                    ..Default::default()
                }),
            );
        }
    }
}

#[test]
fn test_color_slp_burn() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        assert_eq!(
            ColoredTx::color_tx(&make_tx(
                burn_opreturn(&TOKEN_ID1, token_type, 3333),
                2,
            )),
            Some(ColoredTx {
                outputs: vec![None, None, None],
                sections: vec![],
                intentional_burns: vec![IntentionalBurn {
                    meta: meta(TOKEN_ID1, token_type),
                    atoms: 3333,
                }],
                ..Default::default()
            }),
        );
    }
}
