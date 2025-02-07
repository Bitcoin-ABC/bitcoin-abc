// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    alp::{
        self, burn_section, genesis_section, sections_opreturn, send_section,
    },
    color::{ColorError, FailedColoring, FailedParsing, ParseError},
    parsed::ParsedMintData,
    structs::{GenesisInfo, TxType},
    test_helpers::{
        alp_mint, empty_entry, meta_alp as meta, meta_alp_unknown, parse_alp,
        spent_atoms, spent_baton, token_atoms, token_baton, token_unknown,
        verify, EMPTY_TOKEN_ID, TOKEN_ID1, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::AlpTokenType::*,
};
use pretty_assertions::assert_eq;

#[test]
fn test_color_slpv2_all_the_things() {
    assert_eq!(
        verify::<10>(
            sections_opreturn(vec![
                // success GENESIS
                genesis_section(
                    Standard,
                    &GenesisInfo::empty_alp(),
                    &ParsedMintData {
                        atoms_vec: vec![0, 7, 0, 0, 1],
                        num_batons: 2,
                    }
                ),
                // fail GENESIS: must be first
                genesis_section(
                    Standard,
                    &GenesisInfo::default(),
                    &ParsedMintData::default()
                ),
                // fail MINT: Too few outputs
                alp_mint(&TOKEN_ID2, [0; 7], 99),
                // success BURN: token ID 2
                burn_section(&TOKEN_ID2, Standard, 2),
                // success MINT: token ID 3
                alp_mint(&TOKEN_ID3, [3, 0], 1),
                // success MINT: token ID 2
                alp_mint(&TOKEN_ID2, [0, 0, 0, 2, 0, 0, 0], 1),
                // fail MINT: Duplicate token ID 2
                alp_mint(&TOKEN_ID2, [], 0),
                // fail BURN: Duplicate burn token ID 2
                burn_section(&TOKEN_ID2, Standard, 2),
                // success SEND: token ID 4
                send_section(
                    &TOKEN_ID4,
                    Standard,
                    vec![0, 0, 0, 0, 0, 0, 0, 0, 0, 0xffff_ffff_ffff, 0, 0, 0],
                ),
                // fail MINT: Duplicate token ID 4
                alp_mint(&TOKEN_ID4, [], 0),
                // success UNKNOWN
                b"SLP2\x89".as_ref().into(),
                // fail: Descending token type
                burn_section(&TOKEN_ID2, Standard, 2),
                // Invalid usage of SLP\0
                b"SLP\0".as_ref().into(),
                // success UNKNOWN
                b"SLP2\x9a".as_ref().into(),
            ]),
            &[
                spent_baton(meta(TOKEN_ID3)),
                spent_baton(meta(TOKEN_ID2)),
                spent_atoms(meta(TOKEN_ID4), 0xffff_ffff_ffff - 2),
                spent_atoms(meta(TOKEN_ID4), 7),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID1),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(GenesisInfo::empty_alp()),
                    failed_colorings: vec![FailedColoring {
                        pushdata_idx: 1,
                        parsed: parse_alp(genesis_section(
                            Standard,
                            &GenesisInfo::default(),
                            &ParsedMintData::default()
                        )),
                        error: ColorError::GenesisMustBeFirst,
                    }],
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: Some(TxType::MINT),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::MINT),
                    intentional_burn_atoms: Some(2),
                    failed_colorings: vec![
                        FailedColoring {
                            pushdata_idx: 2,
                            parsed: parse_alp(alp_mint(&TOKEN_ID2, [0; 7], 99)),
                            error: ColorError::TooFewOutputs {
                                expected: 107,
                                actual: 11,
                            },
                        },
                        FailedColoring {
                            pushdata_idx: 6,
                            parsed: parse_alp(alp_mint(&TOKEN_ID2, [], 0)),
                            error: ColorError::DuplicateTokenId {
                                prev_section_idx: 2,
                                token_id: TOKEN_ID2,
                            },
                        },
                        FailedColoring {
                            pushdata_idx: 7,
                            parsed: parse_alp(burn_section(
                                &TOKEN_ID2, Standard, 2
                            )),
                            error:
                                ColorError::DuplicateIntentionalBurnTokenId {
                                    prev_burn_idx: 0,
                                    burn_idx: 1,
                                    token_id: TOKEN_ID2,
                                },
                        },
                        FailedColoring {
                            pushdata_idx: 11,
                            parsed: parse_alp(burn_section(
                                &TOKEN_ID2, Standard, 2
                            )),
                            error: ColorError::DescendingTokenType {
                                before: 0x89,
                                after: 0,
                            },
                        },
                    ],
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID4),
                    tx_type: Some(TxType::SEND),
                    actual_burn_atoms: 5,
                    failed_colorings: vec![FailedColoring {
                        pushdata_idx: 9,
                        parsed: parse_alp(alp_mint(&TOKEN_ID4, [], 0)),
                        error: ColorError::DuplicateTokenId {
                            prev_section_idx: 3,
                            token_id: TOKEN_ID4,
                        },
                    },],
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta_alp_unknown(EMPTY_TOKEN_ID, 0x89),
                    tx_type: Some(TxType::UNKNOWN),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta_alp_unknown(EMPTY_TOKEN_ID, 0x9a),
                    tx_type: Some(TxType::UNKNOWN),
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_atoms::<1>(3),
                token_atoms::<0>(7),
                token_baton::<1>(),
                token_atoms::<2>(2),
                token_atoms::<0>(1),
                token_baton::<0>(),
                token_baton::<0>(),
                token_baton::<2>(),
                token_unknown::<4>(0x89),
                token_atoms::<3>(0xffff_ffff_ffff),
            ],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: Some(12),
                bytes: b"SLP\0".as_ref().into(),
                error: ParseError::Alp(alp::ParseError::InvalidSlpLokadId),
            },],
        },
    );
}
