// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    error::DataError,
    script::{opcode::*, Op, Script},
};
use bytes::Bytes;
use thiserror::Error;

use crate::empp::ParseError::*;

/// Parsed list of byte arrays from the eMPP protocol
pub type EmppData = Vec<Bytes>;

/// Errors when parsing a eMPP tx failed.
#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ParseError {
    /// Script doesn't parse
    #[error("Failed parsing script: {0}")]
    DataError(#[from] DataError),

    /// Script empty
    #[error("Empty script")]
    EmptyScript,

    /// Script not empty, but didn't get OP_RETURN
    #[error("Expected OP_RETURN, but got {0}")]
    MissingOpReturn(Opcode),

    /// Got OP_RETURN, but then nothing followed
    #[error("Empty OP_RETURN")]
    EmptyOpReturn,

    /// Got OP_RETURN, but then didn't get OP_RESERVED
    #[error("Missing OP_RESERVED, but got {0}")]
    MissingOpReserved(Opcode),

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

/// Parse the given script according to the eMPP (eCash Multi Pushdata Protocol)
/// protocol.
///
/// See [`crate::empp`] for details.
pub fn parse(script: &Script) -> Result<EmppData, ParseError> {
    let mut ops = script.iter_ops();
    let op_return = ops.next().ok_or(EmptyScript)??;
    if !matches!(op_return, Op::Code(OP_RETURN)) {
        return Err(MissingOpReturn(op_return.opcode()));
    }
    let op_reserved = ops.next().ok_or(EmptyOpReturn)??;
    if !matches!(op_reserved, Op::Code(OP_RESERVED)) {
        return Err(MissingOpReserved(op_reserved.opcode()));
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

impl ParseError {
    /// Whether this parse error doesn't look like eMPP at all and should be
    /// treated as an unrelated protocol.
    pub fn should_ignore(&self) -> bool {
        matches!(
            self,
            EmptyScript
                | MissingOpReturn(_)
                | EmptyOpReturn
                | MissingOpReserved(_)
        )
    }
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::{
        error::DataError,
        script::{opcode::*, Script},
    };
    use bytes::Bytes;
    use pretty_assertions::assert_eq;

    use crate::empp::{parse, EmppData, ParseError};

    #[test]
    fn test_empp() -> Result<(), ParseError> {
        #[track_caller]
        fn check_parse_err(
            bytecode: Vec<u8>,
            expected_err: ParseError,
            should_ignore: bool,
        ) {
            let actual_err = parse(&Script::new(bytecode.into()))
                .expect_err("Test expected parse to fail");
            assert_eq!(actual_err, expected_err);
            assert_eq!(actual_err.should_ignore(), should_ignore);
        }

        check_parse_err(vec![], ParseError::EmptyScript, true);
        check_parse_err(
            vec![OP_CHECKSIG::N],
            ParseError::MissingOpReturn(OP_CHECKSIG),
            true,
        );
        check_parse_err(vec![OP_RETURN::N], ParseError::EmptyOpReturn, true);
        check_parse_err(
            vec![OP_RETURN::N, OP_CHECKSIG::N],
            ParseError::MissingOpReserved(OP_CHECKSIG),
            true,
        );
        assert_eq!(
            parse(&Script::new(vec![OP_RETURN::N, OP_RESERVED::N].into()))?,
            EmppData::new(),
        );
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_0::N],
            ParseError::EmptyPushdata(OP_0),
            false,
        );
        for opcode in [OP_1NEGATE, OP_1, OP_2, OP_16] {
            check_parse_err(
                vec![OP_RETURN::N, OP_RESERVED::N, opcode.number()],
                ParseError::InvalidPushOpcode(opcode),
                false,
            );
        }
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_CHECKSIG::N],
            ParseError::InvalidNonPushOpcode(OP_CHECKSIG),
            false,
        );
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA1::N, 0],
            ParseError::EmptyPushdata(OP_PUSHDATA1),
            false,
        );
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA2::N, 0, 0],
            ParseError::EmptyPushdata(OP_PUSHDATA2),
            false,
        );
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA4::N, 0, 0, 0, 0],
            ParseError::EmptyPushdata(OP_PUSHDATA4),
            false,
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
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, 1, 77, 2, 88, 99, 0],
            ParseError::EmptyPushdata(OP_0),
            false,
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
        check_parse_err(
            vec![OP_RETURN::N, OP_RESERVED::N, OP_PUSHDATA4::N],
            ParseError::DataError(DataError::InvalidLength {
                expected: 4,
                actual: 0,
            }),
            false,
        );
        Ok(())
    }
}
