// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Opcode`].

/// A script opcode, e.g. [`OP_0`] or [`OP_TRUE`].
///
/// The contained opcode doesn't have to be valid/known.
///
/// Effectively, this is a newtype wrapper around [`u8`]:
/// ```
/// # use bitcoinsuite_core::script::opcode::*;
/// assert_eq!(Opcode(0x00), OP_0);
/// assert_eq!(Opcode(0x51), OP_TRUE);
/// assert_eq!(OP_0::N, 0x00);
/// assert_eq!(OP_TRUE::N, 0x51);
/// ```
#[derive(Clone, Copy, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Opcode(pub u8);

macro_rules! define_opcodes {
    ($(
        $(#[doc = $doc:literal])*
        $opcode:ident = $number:literal,
    )*) => {
        $(
            $(#[doc = $doc])*
            pub const $opcode: Opcode = Opcode($number);

            #[allow(non_snake_case)]
            $(#[doc = $doc])*
            pub mod $opcode {
                $(#[doc = $doc])*
                pub const N: u8 = $number;
            }
        )*

        /// Return the opcode's number using its name:
        /// ```
        /// # use bitcoinsuite_core::script::opcode::*;
        /// assert_eq!(opcode_number_to_name(0), Some("OP_0"));
        /// assert_eq!(opcode_number_to_name(0x51), Some("OP_1"));
        /// assert_eq!(opcode_number_to_name(0xff), None);
        /// ```
        pub fn opcode_number_to_name(opcode: u8) -> Option<&'static str> {
            #[allow(unreachable_patterns)]
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
    /// Push the number 0 (=empty string) onto the stack.
    OP_FALSE = 0x00,
    /// Read 1 byte, read that many bytes and push them on the stack
    OP_PUSHDATA1 = 0x4c,
    /// Read 2 bytes as little-endian, read that many bytes and push them
    OP_PUSHDATA2 = 0x4d,
    /// Read 4 bytes as little-endian, read that many bytes and push them
    OP_PUSHDATA4 = 0x4e,
    /// Push the number -1 (`0x81`) onto the stack
    OP_1NEGATE = 0x4f,
    /// Reserved pushop, can be used in OP_RETURN
    OP_RESERVED = 0x50,
    /// Push the number 1 onto the stack.
    OP_1 = 0x51,
    /// Push the number 1 onto the stack.
    OP_TRUE = 0x51,
    /// Push the number 2 onto the stack.
    OP_2 = 0x52,
    /// Push the number 3 onto the stack.
    OP_3 = 0x53,
    /// Push the number 4 onto the stack.
    OP_4 = 0x54,
    /// Push the number 5 onto the stack.
    OP_5 = 0x55,
    /// Push the number 6 onto the stack.
    OP_6 = 0x56,
    /// Push the number 7 onto the stack.
    OP_7 = 0x57,
    /// Push the number 8 onto the stack.
    OP_8 = 0x58,
    /// Push the number 9 onto the stack.
    OP_9 = 0x59,
    /// Push the number 10 onto the stack.
    OP_10 = 0x5a,
    /// Push the number 11 onto the stack.
    OP_11 = 0x5b,
    /// Push the number 12 onto the stack.
    OP_12 = 0x5c,
    /// Push the number 13 onto the stack.
    OP_13 = 0x5d,
    /// Push the number 14 onto the stack.
    OP_14 = 0x5e,
    /// Push the number 15 onto the stack.
    OP_15 = 0x5f,
    /// Push the number 16 onto the stack.
    OP_16 = 0x60,
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
    use crate::script::opcode::*;

    #[test]
    fn test_opcode_from_u8() {
        assert_eq!(u8::from(OP_0), 0);
        assert_eq!(u8::from(OP_1), 0x51);
        assert_eq!(u8::from(OP_TRUE), 0x51);
    }

    #[test]
    fn test_display_opcode() {
        assert_eq!(OP_0.to_string(), "OP_0");
        assert_eq!(OP_1.to_string(), "OP_1");
        assert_eq!(OP_TRUE.to_string(), "OP_1");
    }
}
