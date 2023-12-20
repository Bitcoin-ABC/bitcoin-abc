// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{script::Script, tx::TxId};
use bitcoinsuite_slp::{
    parsed::{ParsedData, ParsedTxType},
    slp::parse,
    structs::TokenMeta,
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};

#[test]
fn test_slp_parse_unknown() {
    // Unknown token type (no error, but results in "Unknown" fields)
    let unknown_types = [0u8]
        .into_iter()
        .chain(3..0x41) // 0x41 is NFT1 Child
        .chain(0x42..0x81) // 0x81 is NFT1 Group
        .chain(0x82..=0xff);
    for typ in unknown_types {
        assert_eq!(
            parse(
                &TxId::default(),
                &Script::new(
                    vec![
                        // OP_RETURN "SLP\0"
                        0x6a, 0x04, b'S', b'L', b'P', 0x00,
                        // unknown type
                        0x01, typ, 0x01, 0x00,
                    ]
                    .into()
                ),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id: TokenId::from_be_bytes([0; 32]),
                    token_type: TokenType::Slp(SlpTokenType::Unknown(typ)),
                },
                tx_type: ParsedTxType::Unknown,
            })),
        );
    }
}
