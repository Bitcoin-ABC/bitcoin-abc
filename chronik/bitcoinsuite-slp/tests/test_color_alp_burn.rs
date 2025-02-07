// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{burn_section, parse_section, sections_opreturn},
    color::{ColorError, ColoredTx, FailedColoring, IntentionalBurn},
    parsed::ParsedData,
    structs::{Atoms, TokenMeta},
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};
use bytes::Bytes;
use pretty_assertions::assert_eq;

const TXID: TxId = TxId::new([4; 32]);
const TXID2: TxId = TxId::new([5; 32]);
const TOKEN_ID2: TokenId = TokenId::new(TXID2);
const TXID3: TxId = TxId::new([6; 32]);
const TOKEN_ID3: TokenId = TokenId::new(TXID3);

const STD: AlpTokenType = AlpTokenType::Standard;
const MAX: Atoms = 0xffff_ffff_ffff;

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

fn parse(pushdata: Bytes) -> ParsedData {
    parse_section(&TXID, pushdata).unwrap().unwrap()
}

fn make_burn(token_id: &TokenId, atoms: Atoms) -> Bytes {
    burn_section(token_id, AlpTokenType::Standard, atoms)
}

#[test]
fn test_color_alp_burn_duplicate() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            make_burn(&TOKEN_ID2, 3),
            make_burn(&TOKEN_ID2, 2),
        ]))),
        Some(ColoredTx {
            intentional_burns: vec![IntentionalBurn {
                meta: meta(TOKEN_ID2),
                atoms: 3,
            }],
            outputs: vec![None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_burn(&TOKEN_ID2, 2)),
                error: ColorError::DuplicateIntentionalBurnTokenId {
                    prev_burn_idx: 0,
                    burn_idx: 1,
                    token_id: TOKEN_ID2,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_burn_success_simple() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![make_burn(
            &TOKEN_ID2, 3
        )]))),
        Some(ColoredTx {
            intentional_burns: vec![IntentionalBurn {
                meta: meta(TOKEN_ID2),
                atoms: 3,
            }],
            outputs: vec![None],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_burn_success_complex() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            make_burn(&TOKEN_ID2, 1),
            make_burn(&TOKEN_ID3, MAX),
        ]))),
        Some(ColoredTx {
            intentional_burns: vec![
                IntentionalBurn {
                    meta: meta(TOKEN_ID2),
                    atoms: 1,
                },
                IntentionalBurn {
                    meta: meta(TOKEN_ID3),
                    atoms: MAX,
                },
            ],
            outputs: vec![None],
            ..Default::default()
        }),
    );
}
