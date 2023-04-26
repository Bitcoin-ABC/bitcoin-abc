// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bytes::Bytes;

use crate::{error::DataError, script::Op};

/// Iterate over the [`Op`]s in a Script.
///
/// Will read ops until parsing an opcode fails, in which case it returns
/// [`Err`] (and then stops yielding items).
#[derive(Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct ScriptOpIter {
    remaining_bytecode: Bytes,
}

impl ScriptOpIter {
    pub(crate) fn new(bytecode: Bytes) -> Self {
        ScriptOpIter {
            remaining_bytecode: bytecode,
        }
    }
}

impl Iterator for ScriptOpIter {
    type Item = Result<Op, DataError>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.remaining_bytecode.is_empty() {
            None
        } else {
            match Op::read_op(&mut self.remaining_bytecode) {
                Ok(op) => Some(Ok(op)),
                Err(err) => {
                    // Stop iteration by truncating the remaining bytecode
                    self.remaining_bytecode.truncate(0);
                    Some(Err(err))
                }
            }
        }
    }
}
