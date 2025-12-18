// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::LazyLock;

use bytes::Bytes;
use regex::Regex;

use crate::{
    bytes::{read_array, read_bytes},
    error::DataError,
    script::opcode::*,
};

/// An operation in a script.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum Op {
    /// Opcode that stands by itself, with no data following it e.g. [`OP_0`],
    /// [`OP_1NEGATE`], [`OP_RETURN`], [`OP_EQUAL`], [`OP_CHECKSIG`].
    Code(Opcode),
    /// Opcode that pushes the bytes following it onto the stack.
    Push(Opcode, Bytes),
}

impl Op {
    /// Read the next [`Op`] in the script bytecode, including the
    /// payload for [`Op::Push`] opcodes.
    pub fn read_op(data: &mut Bytes) -> Result<Op, DataError> {
        let opcode_num = read_bytes(data, 1)?[0];
        Ok(match Opcode(opcode_num) {
            opcode @ Opcode(0x01..=0x4b) => {
                Op::Push(opcode, read_bytes(data, opcode_num as usize)?)
            }
            opcode @ OP_PUSHDATA1 => {
                let size = read_bytes(data, 1)?[0] as usize;
                Op::Push(opcode, read_bytes(data, size)?)
            }
            opcode @ OP_PUSHDATA2 => {
                let size = u16::from_le_bytes(read_array(data)?);
                Op::Push(opcode, read_bytes(data, size as usize)?)
            }
            opcode @ OP_PUSHDATA4 => {
                let size = u32::from_le_bytes(read_array(data)?);
                Op::Push(opcode, read_bytes(data, size as usize)?)
            }
            otherwise => Op::Code(otherwise),
        })
    }

    /// [`Opcode`] of the [`Op`], without pushed data, if any.
    pub fn opcode(&self) -> Opcode {
        match *self {
            Op::Code(opcode) => opcode,
            Op::Push(opcode, _) => opcode,
        }
    }
}

static TEXT_HEURISTIC: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[\w\s\p{Punctuation}\p{Symbol}\p{Emoji}]+$").unwrap()
});

impl std::fmt::Display for Op {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Op::Code(code) => f.write_str(&code.to_string()),
            Op::Push(_, data) => {
                if data.is_empty() {
                    return write!(f, "\"\"");
                }
                if let Ok(text) = std::str::from_utf8(data) {
                    if TEXT_HEURISTIC.is_match(text.trim_end_matches('\0')) {
                        return write!(f, "\"{}\"", text.replace('\0', "\\0"));
                    }
                }
                write!(f, "0x{}", hex::encode(data))
            }
        }
    }
}
