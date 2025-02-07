// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{
        genesis_section, parse_section, sections_opreturn, send_section,
        ParseError,
    },
    color::{ColorError, ColoredTx, ColoredTxSection, FailedColoring},
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    structs::{
        Atoms, GenesisInfo, TokenMeta, TokenOutput, TokenVariant, TxType,
    },
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};
use pretty_assertions::assert_eq;

const TXID: TxId = TxId::new([1; 32]);
const TOKEN_ID: TokenId = TokenId::new(TXID);
const TXID2: TxId = TxId::new([2; 32]);
const TOKEN_ID2: TokenId = TokenId::new(TXID2);

const STD: AlpTokenType = AlpTokenType::Standard;

static INFO: GenesisInfo = GenesisInfo::empty_alp();

const MAX: Atoms = 0xffff_ffff_ffff;

const MINT_BATON: Option<TokenOutput> = Some(TokenOutput {
    token_idx: 0,
    variant: TokenVariant::MintBaton,
});

fn make_tx<const N: usize>(script: Script) -> Tx {
    Tx::with_txid(
        TXID,
        TxMut {
            outputs: [
                [TxOutput { sats: 0, script }].as_ref(),
                &vec![TxOutput::default(); N],
            ]
            .concat(),
            ..Default::default()
        },
    )
}

fn meta(token_id: TokenId) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Alp(STD),
    }
}

fn mint_data() -> ParsedMintData {
    ParsedMintData::default()
}

fn amount(amount: u64) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: 0,
        variant: TokenVariant::Atoms(amount),
    })
}

#[test]
fn test_color_alp_genesis_must_be_first() -> Result<(), ParseError> {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            send_section(&TOKEN_ID2, STD, []),
            genesis_section(STD, &INFO, &mint_data()),
        ]))),
        Some(ColoredTx {
            sections: vec![ColoredTxSection {
                meta: meta(TOKEN_ID2),
                tx_type: TxType::SEND,
                required_input_sum: 0,
                has_colored_out_of_range: false,
                genesis_info: None,
            }],
            outputs: vec![None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse_section(
                    &TXID,
                    genesis_section(STD, &INFO, &mint_data())
                )?
                .unwrap(),
                error: ColorError::GenesisMustBeFirst,
            }],
            ..Default::default()
        }),
    );
    Ok(())
}

#[test]
fn test_color_alp_genesis_too_few_outputs() {
    for mint_data in [
        ParsedMintData {
            atoms_vec: vec![1, 2, 3, 4],
            num_batons: 0,
        },
        ParsedMintData {
            atoms_vec: vec![],
            num_batons: 4,
        },
    ] {
        assert_eq!(
            ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
                genesis_section(
                    AlpTokenType::Standard,
                    &GenesisInfo::default(),
                    &mint_data,
                )
            ]))),
            Some(ColoredTx {
                outputs: vec![None],
                failed_colorings: vec![FailedColoring {
                    pushdata_idx: 0,
                    parsed: ParsedData {
                        meta: meta(TOKEN_ID),
                        tx_type: ParsedTxType::Genesis(ParsedGenesis {
                            info: INFO.clone(),
                            mint_data,
                        }),
                    },
                    error: ColorError::TooFewOutputs {
                        expected: 5,
                        actual: 1,
                    },
                }],
                ..Default::default()
            }),
        );
    }
    // 0 amounts don't cause the coloring to fail even if there's no associated
    // output
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            genesis_section(
                AlpTokenType::Standard,
                &INFO,
                &ParsedMintData {
                    // 127 amounts
                    atoms_vec: vec![0; 127],
                    num_batons: 0,
                },
            )
        ]))),
        Some(ColoredTx {
            outputs: vec![None],
            sections: vec![ColoredTxSection {
                meta: meta(TOKEN_ID),
                tx_type: TxType::GENESIS,
                required_input_sum: 0,
                has_colored_out_of_range: false,
                genesis_info: Some(INFO.clone()),
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_slpv2_genesis_success_simple() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            genesis_section(STD, &INFO, &mint_data())
        ]))),
        Some(ColoredTx {
            sections: vec![ColoredTxSection {
                meta: meta(TOKEN_ID),
                tx_type: TxType::GENESIS,
                required_input_sum: 0,
                has_colored_out_of_range: false,
                genesis_info: Some(INFO.clone()),
            }],
            outputs: vec![None],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_slpv2_genesis_success_big() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<9>(sections_opreturn(vec![
            genesis_section(
                STD,
                &INFO,
                &ParsedMintData {
                    atoms_vec: vec![0, 7, MAX, 0],
                    num_batons: 3,
                },
            )
        ]))),
        Some(ColoredTx {
            sections: vec![ColoredTxSection {
                meta: meta(TOKEN_ID),
                tx_type: TxType::GENESIS,
                required_input_sum: 0,
                has_colored_out_of_range: false,
                genesis_info: Some(INFO.clone()),
            }],
            outputs: vec![
                None,
                None,
                amount(7),
                amount(MAX),
                None,
                MINT_BATON,
                MINT_BATON,
                MINT_BATON,
                None,
                None,
            ],
            ..Default::default()
        }),
    );
}
