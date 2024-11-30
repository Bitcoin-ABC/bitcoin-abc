// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{error::DataError, script::opcode::Opcode};
use bytes::Bytes;
use thiserror::Error;

use crate::structs::Amount;

/// Errors when parsing a SLP tx.
#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ParseError {
    /// Parsing encountered an invalidly encoded opcode, e.g. `OP_PUSHDATA1`
    /// without a size.
    #[error("Failed parsing pushdata: {0}")]
    DataError(#[from] DataError),

    /// Script is empty
    #[error("First must be OP_RETURN (0x6a), but got no opcodes")]
    EmptyScript,

    /// First opcode is not OP_RETURN
    #[error("First must be OP_RETURN (0x6a), but got {0}")]
    MissingOpReturn(Opcode),

    /// No opcodes after OP_RETURN
    #[error("Missing LOKAD ID")]
    MissingLokadId,

    /// Wrong LOKAD ID
    #[error("Wrong LOKAD ID: {0:?}")]
    WrongLokadId(Bytes),

    /// Invalid opcode instead of LOKAD ID pushop
    #[error("Invalid opcode instead of LOKAD ID pushop: {0}")]
    InvalidLokadIdOpcode(Opcode),

    /// Used the ALP "SLP2" prefix, this is almost certainly a mistake, so we
    /// handle it separately.
    #[error("Invalid LOKAD ID \"SLP2\", did you forget to use eMPP?")]
    InvalidAlpLokadId,

    /// OP_RETURN can't contain any non-push ops
    #[error("Non-push op: {opcode} at op {op_idx}")]
    NonPushOp {
        /// Disallowed non-push opcode
        opcode: Opcode,
        /// Position of the opcode in the Script
        op_idx: usize,
    },

    /// Used a disallowed push (e.g. OP_0)
    #[error("Disallowed push: {opcode} at op {op_idx}")]
    DisallowedPush {
        /// Disallowed push opcode
        opcode: Opcode,
        /// Position of the opcode in the Script
        op_idx: usize,
    },

    /// Unexpected field size
    #[error(
        "Field has invalid length: expected one of {expected:?} but got \
         {actual} for field {field_name}"
    )]
    InvalidFieldSize {
        /// Name of the field according to the spec
        field_name: &'static str,
        /// List of allowed sizes
        expected: &'static [usize],
        /// Actual invalid size
        actual: usize,
    },

    /// Decimals out of range
    #[error("Too many decimals, only max. 9 allowed, but got {actual}")]
    InvalidDecimals {
        /// Actual invalid decimals
        actual: usize,
    },

    /// Mint baton is at an invalid index
    #[error(
        "Mint baton at invalid output index, must be between 2 and 255, but \
         got {0}"
    )]
    InvalidMintBatonIdx(u8),

    /// NFT1 Child GENESIS cannot have mint baton
    #[error("NFT1 Child GENESIS cannot have mint baton")]
    Nft1ChildCannotHaveMintBaton,

    /// NFT1 Child GENESIS must have exactly 1 quantity
    #[error(
        "Invalid NFT1 Child GENESIS initial quantity, expected 1 but got {0}"
    )]
    Nft1ChildInvalidInitialQuantity(Amount),

    /// NFT1 Child GENESIS must have 0 decimals
    #[error("Invalid NFT1 Child GENESIS decimals, expected 0 but got {0}")]
    Nft1ChildInvalidDecimals(u8),

    /// Too few pushes onto the stack, expected at least some number
    #[error(
        "Too few pushes, expected at least {expected} but only got {actual}"
    )]
    TooFewPushes {
        /// How many pushes were expected at least
        expected: usize,
        /// Actual invalid nummber of pushes
        actual: usize,
    },

    /// Unexpected number of pushes onto the stack, expected an exact number
    #[error(
        "Unexpected number of pushes, expected exactly {expected} but only \
         got {actual}"
    )]
    UnexpectedNumPushes {
        /// How many pushes were expected exactly
        expected: usize,
        /// Actual invalid nummber of pushes
        actual: usize,
    },

    /// Too many pushes onto the stack
    #[error(
        "Pushed superfluous data: expected at most {expected} pushes, but got \
         {actual}"
    )]
    SuperfluousPushes {
        /// How many pushes were expected at most
        expected: usize,
        /// Actual invalid number of pushes
        actual: usize,
    },

    /// Invalid token type length
    #[error(
        "Token type must be 1 byte long, got {byte_len}: {byte_len:?}",
        byte_len = .0.len(),
    )]
    InvalidTokenType(Bytes),

    /// Invalid tx type
    #[error("Invalid tx type: {0:?}")]
    InvalidTxType(Bytes),
}
