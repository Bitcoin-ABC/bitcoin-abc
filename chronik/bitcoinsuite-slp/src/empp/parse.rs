// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    error::DataError,
    script::{opcode::*, Op, Script},
};
use bytes::Bytes;
use thiserror::Error;

/// Parsed list of byte arrays from the eMPP protocol
pub type EmppData = Vec<Bytes>;

/// Errors when parsing a eMPP tx failed.
#[derive(Clone, Debug, Error, PartialEq)]
pub enum ParseError {
    /// Script doesn't parse
    #[error("Failed parsing script: {0}")]
    DataError(#[from] DataError),

    /// Script empty
    #[error("Empty script")]
    EmptyScript,

    /// Script not empty, but didn't get OP_RETURN
    #[error("Expected OP_RETURN, but got {0:?}")]
    MissingOpReturn(Op),

    /// Got OP_RETURN, but then nothing followed
    #[error("Empty OP_RETURN")]
    EmptyOpReturn,

    /// Got OP_RETURN, but then didn't get OP_RESERVED
    #[error("Missing OP_RESERVED, but got {0:?}")]
    MissingOpReserved(Op),

    /// Cannot use single-byte push opcodes in eMPP
    #[error(
        "Invalid push opcode {0}: OP_0, OP_1NEGATE, OP_RESERVED, OP_1, .. \
         OP_16 not allowed"
    )]
    InvalidPushOpcode(Opcode),

    /// Got a non-push opcode, which is not allowed
    #[error("Invalid non-push opcode {0}")]
    InvalidNonPushOpcode(Opcode),

    /// Pushdata may not be empty
    #[error("Empty pushdata not allowed (used {0})")]
    EmptyPushdata(Opcode),
}

use self::ParseError::*;

/// Parse the given script according to the eMPP (eCash Multi Pushdata Protocol)
/// protocol.
///
/// See [`crate::empp`] for details.
pub fn parse(script: &Script) -> Result<EmppData, ParseError> {
    let mut ops = script.iter_ops();
    let op_return = ops.next().ok_or(EmptyScript)??;
    if !matches!(op_return, Op::Code(OP_RETURN)) {
        return Err(MissingOpReturn(op_return));
    }
    let op_reserved = ops.next().ok_or(EmptyOpReturn)??;
    if !matches!(op_reserved, Op::Code(OP_RESERVED)) {
        return Err(MissingOpReserved(op_reserved));
    }
    let mut empp_data = EmppData::new();
    for pushop in ops {
        let payload = match pushop? {
            Op::Code(OP_0) => return Err(EmptyPushdata(OP_0)),
            Op::Code(opcode @ Opcode(OP_1NEGATE::N..=OP_16::N)) => {
                return Err(InvalidPushOpcode(opcode))
            }
            Op::Code(opcode) => return Err(InvalidNonPushOpcode(opcode)),
            Op::Push(opcode, payload) if payload.is_empty() => {
                return Err(EmptyPushdata(opcode))
            }
            Op::Push(_, payload) => payload,
        };
        empp_data.push(payload);
    }
    Ok(empp_data)
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::{
        error::DataError,
        script::{opcode::*, Op, Script},
    };
    use bytes::Bytes;

    use crate::empp::{parse, EmppData, ParseError};

    #[test]
    fn test_empp() -> Result<(), ParseError> {
        assert_eq!(
            parse(&Script::new(vec![].into())).unwrap_err(),
            ParseError::EmptyScript,
        );
        assert_eq!(
            parse(&Script::new(vec![OP_CHECKSIG::N].into())).unwrap_err(),
            ParseError::MissingOpReturn(Op::Code(OP_CHECKSIG)),
        );
        assert_eq!(
            parse(&Script::new(vec![OP_RETURN::N].into())).unwrap_err(),
            ParseError::EmptyOpReturn,
        );
        assert_eq!(
            parse(&Script::new(vec![OP_RETURN::N, OP_CHECKSIG::N].into()))
                .unwrap_err(),
            ParseError::MissingOpReserved(Op::Code(OP_CHECKSIG)),
        );
        assert_eq!(
            parse(&Script::new(vec![OP_RETURN::N, OP_RESERVED::N].into()))?,
            EmppData::new(),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_0::N].into()
            ))
            .unwrap_err(),
            ParseError::EmptyPushdata(OP_0),
        );
        for opcode in [OP_1NEGATE, OP_1, OP_2, OP_16] {
            assert_eq!(
                parse(&Script::new(
                    vec![OP_RETURN::N, OP_RESERVED::N, opcode.number()].into()
                ))
                .unwrap_err(),
                ParseError::InvalidPushOpcode(opcode),
            );
        }
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_CHECKSIG::N].into()
            ))
            .unwrap_err(),
            ParseError::InvalidNonPushOpcode(OP_CHECKSIG),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA1::N, 0].into()
            ))
            .unwrap_err(),
            ParseError::EmptyPushdata(OP_PUSHDATA1),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA2::N, 0, 0]
                    .into()
            ))
            .unwrap_err(),
            ParseError::EmptyPushdata(OP_PUSHDATA2),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA4::N, 0, 0, 0, 0]
                    .into()
            ))
            .unwrap_err(),
            ParseError::EmptyPushdata(OP_PUSHDATA4),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, 1, 77].into()
            ))?,
            vec![Bytes::from(vec![77])],
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, 1, 77, 2, 88, 99].into()
            ))?,
            vec![Bytes::from(vec![77]), Bytes::from(vec![88, 99])],
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, 1, 77, 2, 88, 99, 0].into()
            ))
            .unwrap_err(),
            ParseError::EmptyPushdata(OP_0),
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA1::N, 1, 77]
                    .into()
            ))?,
            vec![Bytes::from(vec![77])],
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA2::N, 1, 0, 77]
                    .into()
            ))?,
            vec![Bytes::from(vec![77])],
        );
        assert_eq!(
            parse(&Script::new(
                vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA4::N].into()
            ))
            .unwrap_err(),
            ParseError::DataError(DataError::InvalidLength {
                expected: 4,
                actual: 0,
            }),
        );
        Ok(())
    }
}
