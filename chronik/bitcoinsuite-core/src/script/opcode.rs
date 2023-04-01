// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Opcode`].

/// A script opcode, e.g. [`OP_0`] or [`OP_TRUE`].
///
/// The contained opcode doesn't have to be valid/known.
#[derive(Clone, Copy, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Opcode(u8);

macro_rules! define_opcodes {
    ($(
        $(#[doc = $doc:literal])*
        $opcode:ident = $number:literal,
    )*) => {
        $(
            $(#[doc = $doc])*
            pub const $opcode: Opcode = Opcode($number);
        )*

        /// Return the opcode's number using its name:
        /// ```
        /// # use bitcoinsuite_core::script::opcode::*;
        /// assert_eq!(opcode_number_to_name(0), Some("OP_0"));
        /// assert_eq!(opcode_number_to_name(0x51), Some("OP_TRUE"));
        /// assert_eq!(opcode_number_to_name(0xff), None);
        /// ```
        pub fn opcode_number_to_name(opcode: u8) -> Option<&'static str> {
            match opcode {
                $(
                    $number => Some(stringify!($opcode)),
                )*
                _ => None,
            }
        }
    };
}

impl From<Opcode> for u8 {
    fn from(Opcode(value): Opcode) -> Self {
        value
    }
}

impl std::fmt::Display for Opcode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match opcode_number_to_name(self.number()) {
            Some(name) => write!(f, "{}", name),
            None => write!(f, "[unrecognized opcode]"),
        }
    }
}

impl Opcode {
    /// Number of the opcode:
    /// ```
    /// # use bitcoinsuite_core::script::opcode::*;
    /// assert_eq!(OP_0.number(), 0);
    /// assert_eq!(OP_TRUE.number(), 0x51);
    /// ```
    pub fn number(self) -> u8 {
        self.0
    }
}

define_opcodes! {
    /// Push the number 0 (=empty string) onto the stack.
    OP_0 = 0x00,
    /// Push the number 1 onto the stack.
    OP_TRUE = 0x51,
    /// Mark transaction as invalid. Used to add data to a tx in an output.
    OP_RETURN = 0x6a,
    /// Duplicate the top stack item.
    OP_DUP = 0x76,
    /// If the top two stack items are byte-equal, push 1 onto the stack,
    /// otherwise 0.
    OP_EQUAL = 0x87,
    /// Like [`OP_EQUAL`], but fail the script if the items aren't equal.
    OP_EQUALVERIFY = 0x88,
    /// Hash the top stack item x using RIPEMD-160(SHA-256(x))
    OP_HASH160 = 0xa9,
    /// Pop pubkey and signature and verify if they sign this input's BIP143
    /// sighash.
    OP_CHECKSIG = 0xac,
}

#[cfg(test)]
mod tests {
    use crate::script::opcode::{OP_0, OP_TRUE};

    #[test]
    fn test_opcode_from_u8() {
        assert_eq!(u8::from(OP_0), 0);
        assert_eq!(u8::from(OP_TRUE), 0x51);
    }

    #[test]
    fn test_display_opcode() {
        assert_eq!(OP_0.to_string(), "OP_0");
        assert_eq!(OP_TRUE.to_string(), "OP_TRUE");
    }
}
