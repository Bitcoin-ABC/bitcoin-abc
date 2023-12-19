use bytes::{BufMut, BytesMut};

use crate::script::{
    opcode::{Opcode, OP_0, OP_PUSHDATA1, OP_PUSHDATA2, OP_PUSHDATA4},
    Script,
};

/// A mutable version of [`Script`], it allows appending more opcodes/bytecode
/// etc.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct ScriptMut(BytesMut);

impl ScriptMut {
    /// Create a new [`ScriptMut`] with the specified capacity.
    /// The length of the returned [`ScriptMut`] is 0, but it can grow up to the
    /// capacity size without reallocating.
    /// ```
    /// # use bitcoinsuite_core::script::ScriptMut;
    /// use bytes::Bytes;
    /// let script_mut = ScriptMut::with_capacity(42);
    /// assert_eq!(script_mut.freeze().bytecode(), &Bytes::new());
    /// ```
    pub fn with_capacity(size: usize) -> Self {
        ScriptMut(BytesMut::with_capacity(size))
    }

    /// Append the opcode numbers of the given list of opcodes to the script.
    /// ```
    /// # use bitcoinsuite_core::script::ScriptMut;
    /// use bitcoinsuite_core::script::opcode::{OP_EQUAL, OP_TRUE};
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_opcodes([OP_EQUAL, OP_TRUE]);
    /// assert_eq!(script_mut.freeze().hex(), "8751");
    /// ```
    pub fn put_opcodes(&mut self, opcodes: impl IntoIterator<Item = Opcode>) {
        for opcode in opcodes {
            self.0.put_u8(opcode.number());
        }
    }

    /// Append the given raw bytecode to this script. Note: this doesn't add
    /// push opcodes for the given slice, it just appends the bytecode which can
    /// contain any kinds of opcodes.
    /// ```
    /// # use bitcoinsuite_core::script::ScriptMut;
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_bytecode(&[1, 2, 3, 4, 5]);
    /// assert_eq!(script_mut.freeze().hex(), "0102030405");
    /// ```
    pub fn put_bytecode(&mut self, slice: &[u8]) {
        self.0.put_slice(slice);
    }

    /// Append to this script bytecode to minimally push the given pushdata onto
    /// the stack. Minimal encoding is required when executing in the Script
    /// interpreter.
    ///
    /// ```
    /// # use bitcoinsuite_core::script::ScriptMut;
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_pushdata(&[]);
    /// assert_eq!(script_mut.freeze().hex(), "00");
    ///
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_pushdata(&[0x77]);
    /// assert_eq!(script_mut.freeze().hex(), "0177");
    ///
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_pushdata(&[0x55; 0x4c]);
    /// assert_eq!(
    ///     script_mut.freeze().as_ref(),
    ///     [[0x4c, 0x4c].as_ref(), &[0x55; 0x4c]].concat(),
    /// );
    ///
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_pushdata(&[0x33; 0x100]);
    /// assert_eq!(
    ///     script_mut.freeze().as_ref(),
    ///     [[0x4d, 0x00, 0x01].as_ref(), &[0x33; 0x100]].concat(),
    /// );
    ///
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_pushdata(&[0x22; 0x10000]);
    /// assert_eq!(
    ///     script_mut.freeze().as_ref(),
    ///     [[0x4e, 0x00, 0x00, 0x01, 0x00].as_ref(), &[0x22; 0x10000]].concat()
    /// );
    /// ```
    pub fn put_pushdata(&mut self, pushdata: &[u8]) {
        match pushdata.len() {
            0 => self.put_opcodes([OP_0]),
            0x01..=0x4b => {
                self.put_opcodes([Opcode(pushdata.len() as u8)]);
            }
            0x4c..=0xff => {
                self.put_opcodes([OP_PUSHDATA1]);
                self.0.put_u8(pushdata.len() as u8);
            }
            0x100..=0xffff => {
                self.put_opcodes([OP_PUSHDATA2]);
                self.0.put_u16_le(pushdata.len() as u16);
            }
            0x10000..=0xffffffff => {
                self.put_opcodes([OP_PUSHDATA4]);
                self.0.put_u32_le(pushdata.len() as u32);
            }
            _ => panic!("Bytes way too large"),
        }
        self.put_bytecode(pushdata);
    }

    /// Append to this script bytecode to push the given pushdata onto the
    /// stack. It will be compliant with SLP push rules (i.e. no bare
    /// opcodes), but otherwise minimal.
    ///
    /// ```
    /// # use bitcoinsuite_core::script::ScriptMut;
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_slp_pushdata(&[]);
    /// assert_eq!(script_mut.freeze().hex(), "4c00");
    ///
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_slp_pushdata(&[0x77]);
    /// assert_eq!(script_mut.freeze().hex(), "0177");
    /// ```
    pub fn put_slp_pushdata(&mut self, pushdata: &[u8]) {
        if pushdata.is_empty() {
            self.put_bytecode(&[OP_PUSHDATA1::N, 0]);
        } else {
            self.put_pushdata(pushdata);
        }
    }

    /// Turn the given [`ScriptMut`] into a [`Script`], making it immutable.
    /// ```
    /// # use bitcoinsuite_core::script::{Script, ScriptMut};
    /// let mut script_mut = ScriptMut::default();
    /// script_mut.put_bytecode(&[1, 2, 3, 4, 5]);
    /// let script = Script::new(vec![1, 2, 3, 4, 5].into());
    /// assert_eq!(script_mut.freeze(), script);
    /// ```
    pub fn freeze(self) -> Script {
        Script::new(self.0.freeze())
    }
}
