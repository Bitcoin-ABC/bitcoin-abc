// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    error::DataError,
    hash::ShaRmd160,
    script::{opcode::*, PubKey, Script},
    tx::{Tx, TxId},
};
use bitcoinsuite_slp::slp::{
    consts::ALL_TOKEN_TYPES, parse, parse_tx, parse_with_ignored_err,
    ParseError,
};

#[track_caller]
fn check_script(script: &[u8], expected_err: ParseError, should_ignore: bool) {
    let script = Script::new(script.to_vec().into());
    assert_eq!(
        parse_with_ignored_err(&TxId::default(), &script),
        Err(expected_err),
    );
    let ignored = matches!(parse(&TxId::default(), &script), Ok(None));
    assert_eq!(ignored, should_ignore);
}

#[test]
fn test_parse_not_opreturn() {
    // No outputs -> no parsed SLP data
    assert_eq!(parse_tx(&Tx::default()), Ok(None));

    // Empty script
    check_script(&[], ParseError::EmptyScript, true);

    // Missing OP_RETURN opcode
    check_script(&[0xac], ParseError::MissingOpReturn(OP_CHECKSIG), true);
    check_script(&[0x01], ParseError::MissingOpReturn(Opcode(1)), true);
    check_script(&[0x4c], ParseError::MissingOpReturn(OP_PUSHDATA1), true);

    check_script(
        Script::p2pk(&PubKey::default()).bytecode(),
        ParseError::MissingOpReturn(Opcode(33)),
        true,
    );
    check_script(
        Script::p2pkh(&ShaRmd160::default()).bytecode(),
        ParseError::MissingOpReturn(OP_DUP),
        true,
    );
    check_script(
        Script::p2sh(&ShaRmd160::default()).bytecode(),
        ParseError::MissingOpReturn(OP_HASH160),
        true,
    );
}

#[test]
fn test_parse_slp_lokad_id() {
    // Missing LOKAD ID
    check_script(&[0x6a], ParseError::MissingLokadId, true);

    // Invalid LOKAD ID opcode
    check_script(
        &[0x6a, 0xac],
        ParseError::InvalidLokadIdOpcode(OP_CHECKSIG),
        true,
    );

    // Invalidly encoded LOKAD ID opcode also results in the same error
    check_script(
        &[0x6a, 0x01],
        ParseError::InvalidLokadIdOpcode(Opcode(1)),
        true,
    );
    check_script(
        &[0x6a, 0x4c],
        ParseError::InvalidLokadIdOpcode(OP_PUSHDATA1),
        true,
    );

    // Wrong LOKAD ID
    check_script(
        &[0x6a, 0x01, 0x00],
        ParseError::WrongLokadId(vec![0x00].into()),
        true,
    );
    check_script(
        &[0x6a, 0x01, 0x22, 0x01, 0x00],
        ParseError::WrongLokadId(vec![0x22].into()),
        true,
    );
    check_script(
        &[0x6a, 0x03, b'S', b'L', b'P'],
        ParseError::WrongLokadId(b"SLP".as_ref().into()),
        true,
    );
    check_script(
        &[0x6a, 0x04, b'S', b'L', b'P', 0x99],
        ParseError::WrongLokadId(b"SLP\x99".as_ref().into()),
        true,
    );

    // Valid Lokad ID (using OP_PUSHDATA1, OP_PUSHDATA2 and OP_PUSHDATA4)
    check_script(
        &[
            0x6a, // OP_RETURN
            0x04, b'S', b'L', b'P', 0x00, // "SLP\0"
            0x4c, 0x00, 0x01, 0x00, // token type (empty) & tx type
        ],
        ParseError::InvalidTokenType(vec![].into()),
        false,
    );
    check_script(
        &[
            0x6a, // OP_RETURN
            0x4c, 0x04, b'S', b'L', b'P', 0x00, // OP_PUSHDATA1 "SLP\0"
            0x4c, 0x00, 0x01, 0x00, // token type (empty) & tx type
        ],
        ParseError::InvalidTokenType(vec![].into()),
        false,
    );
    check_script(
        &[
            0x6a, // OP_RETURN
            0x4d, 0x04, 0x00, b'S', b'L', b'P', 0x00, // OP_PUSHDATA2
            0x4c, 0x00, 0x01, 0x00, // token type (empty) & tx type
        ],
        ParseError::InvalidTokenType(vec![].into()),
        false,
    );
    check_script(
        &[
            0x6a, // OP_RETURN
            // OP_PUSHDATA4 "SLP\0"
            0x4e, 0x04, 0x00, 0x00, 0x00, b'S', b'L', b'P', 0x00,
            // token type (empty) & tx type
            0x4c, 0x00, 0x01, 0x00,
        ],
        ParseError::InvalidTokenType(vec![].into()),
        false,
    );

    // After OP_RETURN "SLP\0", all invalidly encoded opcodes are a DataError
    check_script(
        &[0x6a, 0x04, b'S', b'L', b'P', 0x00, 0x01],
        ParseError::DataError(DataError::InvalidLength {
            expected: 1,
            actual: 0,
        }),
        false,
    );
    check_script(
        &[0x6a, 0x04, b'S', b'L', b'P', 0x00, OP_PUSHDATA4::N],
        ParseError::DataError(DataError::InvalidLength {
            expected: 4,
            actual: 0,
        }),
        false,
    );
}

#[test]
fn test_parse_slp_alp_mixup() {
    // Used ALP ("SLP2") LOKAD ID, which we report separately and don't ignore.
    // Otherwise, someone forgetting the OP_RESERVED might get confused.
    check_script(
        &[0x6a, 0x04, b'S', b'L', b'P', b'2'],
        ParseError::InvalidAlpLokadId,
        false,
    );
    // Using it with additional bytes at the end also gets reported as ALP
    check_script(
        &[0x6a, 0x05, b'S', b'L', b'P', b'2', 0],
        ParseError::InvalidAlpLokadId,
        false,
    );
    check_script(
        &[0x6a, 0x06, b'S', b'L', b'P', b'2', 0, 0],
        ParseError::InvalidAlpLokadId,
        false,
    );
}

#[test]
fn test_parse_slp_disallowed_push() {
    // Disallowed push
    let mut scripts: Vec<(&[_], Opcode, usize)> = vec![
        (&[0x00], OP_0, 2),
        (&[0x4f], OP_1NEGATE, 2),
        (&[0x4c, 0x00, 0x51], OP_1, 3),
        (&[0x4d, 0x00, 0x00, 0x52], OP_2, 3),
        (&[0x4e, 0x00, 0x00, 0x00, 0x00, 0x53], OP_3, 3),
        (&[0x01, 0x00, 0x54], OP_4, 3),
        (&[0x02, 0x00, 0x00, 0x55], OP_5, 3),
        (&[0x56], OP_6, 2),
        (&[0x57], OP_7, 2),
        (&[0x58], OP_8, 2),
        (&[0x59], OP_9, 2),
        (&[0x5a], OP_10, 2),
        (&[0x5b], OP_11, 2),
        (&[0x5c], OP_12, 2),
        (&[0x5d], OP_13, 2),
        (&[0x5e], OP_14, 2),
        (&[0x5f], OP_15, 2),
        (&[0x60], OP_16, 2),
    ];
    let script = [[0x4b].as_ref(), &[0x00; 0x4b], &[0x00]].concat();
    scripts.push((&script, OP_0, 3));
    for (script, opcode, op_idx) in scripts {
        let script = [[0x6a, 0x04].as_ref(), b"SLP\0", script].concat();
        check_script(
            &script,
            ParseError::DisallowedPush { opcode, op_idx },
            false,
        );
    }
}

#[test]
fn test_parse_slp_non_pushop() {
    // Non-pushop
    for opcode in 0x61..=0xff {
        check_script(
            &[[0x6a, 0x04].as_ref(), b"SLP\0", &[opcode]].concat(),
            ParseError::NonPushOp {
                opcode: Opcode(opcode),
                op_idx: 2,
            },
            false,
        );
    }
}

#[test]
fn test_parse_slp_too_few_pushes() {
    // Too few pushes
    let scripts = [
        &[[0x6a, 0x04].as_ref(), b"SLP\0"].concat(),
        &[[0x6a, 0x04].as_ref(), b"SLP\0", &[0x01, 0x00]].concat(),
    ];
    for (num_pushes, script) in scripts.into_iter().enumerate() {
        check_script(
            script,
            ParseError::TooFewPushes {
                expected: 3,
                actual: num_pushes + 1,
            },
            false,
        );
    }
}

#[test]
fn test_parse_slp_invalid_token_type() {
    // Invalid token type, must be 1 or 2 bytes
    check_script(
        &[
            0x6a, 0x04, b'S', b'L', b'P', 0x00, // OP_RETURN "SLP\0"
            0x4c, 0x00, // 0 byte token type
            0x01, 0x00, // tx type
        ],
        ParseError::InvalidTokenType(vec![].into()),
        false,
    );
    check_script(
        &[
            0x6a, 0x04, b'S', b'L', b'P', 0x00, // OP_RETURN "SLP\0"
            0x02, 0x77, 0x77, // 3 byte token type
            0x01, 0x00, // tx type
        ],
        ParseError::InvalidTokenType(vec![0x77, 0x77].into()),
        false,
    );
    check_script(
        &[
            0x6a, 0x04, b'S', b'L', b'P', 0x00, // OP_RETURN "SLP\0"
            0x03, 0x99, 0x99, 0x99, // 3 byte token type
            0x01, 0x00, // tx type
        ],
        ParseError::InvalidTokenType(vec![0x99, 0x99, 0x99].into()),
        false,
    );
}

#[test]
fn test_slp_parse_invalid_tx_type() {
    // test for all token types
    for &typ in ALL_TOKEN_TYPES {
        // Invalid tx type
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, typ],
                &[0x07],
                b"INVALID",
            ]
            .concat(),
            ParseError::InvalidTxType(b"INVALID".as_ref().into()),
            false,
        );
    }
}
