use bytes::{BufMut, BytesMut};

use crate::script::{opcode::Opcode, Script};

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
