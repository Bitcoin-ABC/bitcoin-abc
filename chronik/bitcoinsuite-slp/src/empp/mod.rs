// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! # eMPP (eCash Multi Pushdata Protocol) protocol.
//!
//! Allows having multipe protocols in an OP_RETURN in a reliable way.
//!
//! ## OP_RESERVED
//!
//! For an OP_RETURN output to be considered "standard" it can only consist of
//! ops that are considered "Push Ops". Note that OP_RESERVED (0x50) is
//! considered a push op, but is largely unused for OP_RETURN protocols, which
//! we can use for eMPP.
//!
//! We require the OP_RESERVED opcode, to cleanly break with existing protocols,
//! and to allow indexers/explorers etc. to clearly identify eMPP transactions.
//!
//! ## Specification
//!
//! A valid eMPP script looks like this:
//!
//! 1. OP_RETURN (0x6a)
//! 2. OP_RESERVED (0x50)
//! 3. <pushop0> <pushop1> ... <pushopN> (One push op containing the entire
//!    payload for each fragment)
//!
//! Push ops in 3. must be encoded the following way:
//!
//! 1. Any non-push opcode (e.g. OP_CHECKSIG) is invalid in OP_RETURN scripts by
//!    eCash policy rules; if it is encountered, the entire OP_RETURN should be
//!    ignored as invalid.
//!
//! 2. Single-byte push opcodes (i.e. OP_0, OP_RESERVED, OP_1NEGATE, OP_1, ...,
//!    OP_16) are not supported and the entire OP_RETURN script should be
//!    ignored as invalid.
//!
//! 3. Any pushop pushing the empty string is invalid and the entire OP_RETURN
//!    should be ignored as invalid.
//!
//! 4. The payload can be pushed using any of these opcodes:
//!    1. Opcodes with the number 0x01-0x4b (1 to 75)
//!    2. OP_PUSHDATA1
//!    3. OP_PUSHDATA2
//!    4. OP_PUSHDATA4
//!
//! 5. Unlike data in scriptSig, the op doesn’t have to be encoded minimally.
//!    All of these are considered valid for pushing the payload 0x77:
//!    0x0177, 0x4c0177, 0x4d010077, 0x4e0100000077.

mod parse;

pub use self::parse::*;
