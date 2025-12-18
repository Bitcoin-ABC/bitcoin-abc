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
        /// assert_eq!(opcode_number_to_name(0xff), Some("OP_INVALIDOPCODE"));
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
    /// Read 1 byte, read that many bytes and push them on the stack.
    OP_PUSHDATA1 = 0x4c,
    /// Read 2 bytes as little-endian, read that many bytes and push them.
    OP_PUSHDATA2 = 0x4d,
    /// Read 4 bytes as little-endian, read that many bytes and push them.
    OP_PUSHDATA4 = 0x4e,
    /// Push the number -1 (`0x81`) onto the stack.
    OP_1NEGATE = 0x4f,
    /// Reserved pushop, can be used in OP_RETURN.
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

    /// No operation.
    OP_NOP = 0x61,
    /// Transaction is invalid unless occurring in an unexecuted OP_IF branch.
    OP_VER = 0x62,
    /// Execute the following instructions if the top stack value is true
    /// (non-zero).
    OP_IF = 0x63,
    /// Execute the following instructions if the top stack value is false
    /// (zero).
    OP_NOTIF = 0x64,
    /// Transaction is invalid even when occurring in an unexecuted OP_IF
    /// branch.
    OP_VERIF = 0x65,
    /// Transaction is invalid even when occurring in an unexecuted OP_IF
    /// branch.
    OP_VERNOTIF = 0x66,
    /// Execute the following instructions if the preceding OP_IF or OP_NOTIF.
    OP_ELSE = 0x67,
    /// Mark the end of an OP_IF/OP_NOTIF block.
    OP_ENDIF = 0x68,
    /// Marks transaction as invalid if top stack value is false (zero).
    OP_VERIFY = 0x69,
    /// Mark transaction as invalid. Used to add data to a tx in an output.
    OP_RETURN = 0x6a,

    /// Move the top stack item to the alt stack.
    OP_TOALTSTACK = 0x6b,
    /// Move the top stack item from the alt stack to the main stack.
    OP_FROMALTSTACK = 0x6c,
    /// Remove the top two stack items.
    OP_2DROP = 0x6d,
    /// Duplicate the top two stack items.
    OP_2DUP = 0x6e,
    /// Duplicate the top three stack items.
    OP_3DUP = 0x6f,
    /// Copy the pair of items two spaces back in the stack to the top.
    OP_2OVER = 0x70,
    /// Move the fifth and sixth items to the top of the stack.
    OP_2ROT = 0x71,
    /// Swap the top two pairs of items.
    OP_2SWAP = 0x72,
    /// Duplicate the top stack item if it is not zero.
    OP_IFDUP = 0x73,
    /// Get the number of stack items.
    OP_DEPTH = 0x74,
    /// Remove the top stack item.
    OP_DROP = 0x75,
    /// Duplicate the top stack item.
    OP_DUP = 0x76,
    /// Remove the second-to-top stack item.
    OP_NIP = 0x77,
    /// Copy the second-to-top stack item to the top.
    OP_OVER = 0x78,
    /// Copy the nth stack item to the top.
    OP_PICK = 0x79,
    /// Move the nth stack item to the top.
    OP_ROLL = 0x7a,
    /// Rotate the top three stack items.
    OP_ROT = 0x7b,
    /// Swap the top two stack items.
    OP_SWAP = 0x7c,
    /// Insert the top stack item before the second-to-top item.
    OP_TUCK = 0x7d,

    /// Concatenate two top stack items.
    OP_CAT = 0x7e,
    /// Divide one top stack item into two.
    OP_SPLIT = 0x7f,
    /// Convert a number to its binary representation.
    OP_NUM2BIN = 0x80,
    /// Convert a binary representation to a number.
    OP_BIN2NUM = 0x81,
    /// Push the size of the top stack item onto the stack.
    OP_SIZE = 0x82,

    /// Flips all bits in the top stack item.
    OP_INVERT = 0x83,
    /// Bitwise AND between the top two stack items.
    OP_AND = 0x84,
    /// Bitwise OR between the top two stack items.
    OP_OR = 0x85,
    /// Bitwise XOR between the top two stack items.
    OP_XOR = 0x86,
    /// If the top two stack items are byte-equal, push 1 onto the stack,
    /// otherwise 0.
    OP_EQUAL = 0x87,
    /// Like [`OP_EQUAL`], but fail the script if the items aren't equal.
    OP_EQUALVERIFY = 0x88,
    /// Transaction is invalid unless occurring in an unexecuted OP_IF branch.
    OP_RESERVED1 = 0x89,
    /// Transaction is invalid unless occurring in an unexecuted OP_IF branch.
    OP_RESERVED2 = 0x8a,

    /// Add one to the top stack item.
    OP_1ADD = 0x8b,
    /// Subtract one from the top stack item.
    OP_1SUB = 0x8c,
    /// Multiply the top stack item by 2.
    OP_2MUL = 0x8d,
    /// Divide the top stack item by 2.
    OP_2DIV = 0x8e,
    /// Negate the top stack item.
    OP_NEGATE = 0x8f,
    /// Absolute value of the top stack item.
    OP_ABS = 0x90,
    /// If the input is 0 or 1, it is flipped. Otherwise the output will be 0.
    OP_NOT = 0x91,
    /// Returns 0 if the input is 0. 1 otherwise.
    OP_0NOTEQUAL = 0x92,

    /// Add the top two stack items.
    OP_ADD = 0x93,
    /// Subtract the top two stack items.
    OP_SUB = 0x94,
    /// Multiply the top two stack items.
    OP_MUL = 0x95,
    /// Divide the top two stack items.
    OP_DIV = 0x96,
    /// Modulo of the top two stack items.
    OP_MOD = 0x97,
    /// The first stack item is shifted left by the number of bits specified by
    /// the second stack item, preserving sign.
    OP_LSHIFT = 0x98,
    /// The first stack item is shifted right by the number of bits specified by
    /// the second stack item, preserving sign.
    OP_RSHIFT = 0x99,

    /// Boolean AND between the top two stack items.
    OP_BOOLAND = 0x9a,
    /// Boolean OR between the top two stack items.
    OP_BOOLOR = 0x9b,
    /// Returns 1 if the two top stack items are equal, 0 otherwise.
    OP_NUMEQUAL = 0x9c,
    /// Like [`OP_NUMEQUAL`], but fail the script if the items are not equal.
    OP_NUMEQUALVERIFY = 0x9d,
    /// Returns 1 if the two top stack items are not equal, 0 otherwise.
    OP_NUMNOTEQUAL = 0x9e,
    /// Returns 1 if the second-to-top stack item is less than the top stack
    /// item.
    OP_LESSTHAN = 0x9f,
    /// Returns 1 if the second-to-top stack item is greater than the top stack
    /// item.
    OP_GREATERTHAN = 0xa0,
    /// Returns 1 if the second-to-top stack item is less than or equal to the
    /// top stack item.
    OP_LESSTHANOREQUAL = 0xa1,
    /// Returns 1 if the second-to-top stack item is greater than or equal to
    /// the top stack item.
    OP_GREATERTHANOREQUAL = 0xa2,
    /// Returns the minimum of the top two stack items.
    OP_MIN = 0xa3,
    /// Returns the maximum of the top two stack items.
    OP_MAX = 0xa4,
    /// Returns 1 if x is within the specified range (left-inclusive), 0
    /// otherwise.
    OP_WITHIN = 0xa5,

    /// Hash the top stack item x using RIPEMD-160.
    OP_RIPEMD160 = 0xa6,
    /// Hash the top stack item x using SHA-1.
    OP_SHA1 = 0xa7,
    /// Hash the top stack item x using SHA-256.
    OP_SHA256 = 0xa8,
    /// Hash the top stack item x using RIPEMD-160(SHA-256(x)).
    OP_HASH160 = 0xa9,
    /// Hash the top stack item x using SHA-256(SHA-256(x)).
    OP_HASH256 = 0xaa,
    /// The scriptCode verified in OP_CHECK(MULTI)SIG(VERIFY) will be cut to
    /// after the most recently-executed OP_CODESEPARATOR.
    OP_CODESEPARATOR = 0xab,
    /// Pop pubkey and signature and verify if they sign this input's BIP143
    /// sighash.
    OP_CHECKSIG = 0xac,
    /// Like [`OP_CHECKSIG`], but fail the script if the signature is invalid.
    OP_CHECKSIGVERIFY = 0xad,
    /// Verifies a minimum threshold of signatures sign the transaction with a
    /// given set of pubkeys.
    OP_CHECKMULTISIG = 0xae,
    /// Like [`OP_CHECKMULTISIG`], but fail the script if the signatures are
    /// invalid.
    OP_CHECKMULTISIGVERIFY = 0xaf,

    /// No operation.
    OP_NOP1 = 0xb0,
    /// Marks transaction as invalid if the top stack item is greater than the
    /// transaction's nLockTime field, otherwise script evaluation continues as
    /// though an OP_NOP was executed.
    OP_CHECKLOCKTIMEVERIFY = 0xb1,
    /// Legacy opcode, alias for [`OP_CHECKLOCKTIMEVERIFY`].
    OP_NOP2 = 0xb1,
    /// Marks transaction as invalid if the relative lock time of the input
    /// is not equal to or longer than the value of the top stack item.
    OP_CHECKSEQUENCEVERIFY = 0xb2,
    /// Legacy opcode, alias for [`OP_CHECKSEQUENCEVERIFY`].
    OP_NOP3 = 0xb2,
    /// No operation.
    OP_NOP4 = 0xb3,
    /// No operation.
    OP_NOP5 = 0xb4,
    /// No operation.
    OP_NOP6 = 0xb5,
    /// No operation.
    OP_NOP7 = 0xb6,
    /// No operation.
    OP_NOP8 = 0xb7,
    /// No operation.
    OP_NOP9 = 0xb8,
    /// No operation.
    OP_NOP10 = 0xb9,

    /// Verify a signature where the message comes from the stack.
    OP_CHECKDATASIG = 0xba,
    /// Like [`OP_CHECKDATASIG`], but fail the script if the signature is
    /// invalid.
    OP_CHECKDATASIGVERIFY = 0xbb,

    /// Reverses the order of bytes in the top stack item.
    OP_REVERSEBYTES = 0xbc,

    /// Start of multi-byte opcode prefixes.
    OP_PREFIX_BEGIN = 0xf0,
    /// End of multi-byte opcode prefixes.
    OP_PREFIX_END = 0xf7,

    /// Invalid opcode.
    OP_INVALIDOPCODE = 0xff,
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
