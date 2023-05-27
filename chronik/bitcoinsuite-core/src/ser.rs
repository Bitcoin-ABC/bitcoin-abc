// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`BitcoinSer`].

use bytes::{Bytes, BytesMut};

use crate::{
    bytes::{read_array, read_bytes},
    error::DataError,
};

/// Serializer for implementors of [`BitcoinSer`].
pub trait BitcoinSerializer {
    /// Serialize the given slice of data.
    fn put(&mut self, slice: &[u8]);
}

/// Trait for serializing data using the serialization Bitcoin is using.
pub trait BitcoinSer: Sized {
    /// Serialize to the given serializer
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S);

    /// Serialize to bytes.
    fn ser(&self) -> Bytes {
        let mut bytes = BytesMut::new();
        self.ser_to(&mut bytes);
        bytes.freeze()
    }

    /// Measure the length of the serialized result without storing the
    /// serialization.
    fn ser_len(&self) -> usize {
        let mut len = 0usize;
        self.ser_to(&mut len);
        len
    }

    /// Deserialize the given bytes to `Self`
    fn deser(data: &mut Bytes) -> Result<Self, DataError>;
}

impl BitcoinSerializer for BytesMut {
    fn put(&mut self, slice: &[u8]) {
        use bytes::BufMut;
        self.put_slice(slice);
    }
}

impl BitcoinSerializer for usize {
    fn put(&mut self, slice: &[u8]) {
        *self += slice.len();
    }
}

impl BitcoinSer for Bytes {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        write_compact_size(bytes, self.len() as u64);
        bytes.put(self.as_ref());
    }

    fn deser(data: &mut Bytes) -> Result<Self, DataError> {
        let size = read_compact_size(data)?;
        read_bytes(data, size as usize)
    }
}

impl<const N: usize> BitcoinSer for [u8; N] {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        bytes.put(self.as_ref());
    }

    fn deser(data: &mut Bytes) -> Result<Self, DataError> {
        read_array::<N>(data)
    }
}

impl<T: BitcoinSer> BitcoinSer for Vec<T> {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        write_compact_size(bytes, self.len() as u64);
        for part in self {
            part.ser_to(bytes);
        }
    }

    fn deser(data: &mut Bytes) -> Result<Self, DataError> {
        let size = read_compact_size(data)? as usize;
        let mut entries = Vec::with_capacity(size.min(0x10000));
        for _ in 0..size {
            entries.push(T::deser(data)?);
        }
        Ok(entries)
    }
}

impl BitcoinSer for bool {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        bytes.put(&[*self as u8]);
    }

    fn deser(data: &mut Bytes) -> Result<Self, DataError> {
        Ok(read_array::<1>(data)?[0] != 0)
    }
}

macro_rules! integer_impls {
    ($($T:ident $SIZE:literal,)+) => {
        $(
            impl BitcoinSer for $T {
                fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
                    bytes.put(&self.to_le_bytes())
                }

                fn deser(data: &mut Bytes) -> Result<Self, DataError> {
                    let value = $T::from_le_bytes(read_array::<$SIZE>(data)?);
                    Ok(value)
                }
            }
        )+
    }
}

integer_impls! {
    u8 1, i8 1, u16 2, i16 2, u32 4, i32 4, u64 8, i64 8, u128 16, i128 16,
}

fn write_compact_size<S: BitcoinSerializer>(bytes: &mut S, size: u64) {
    match size {
        0..=0xfc => bytes.put(&[size as u8]),
        0xfd..=0xffff => {
            bytes.put(&[0xfd]);
            bytes.put(&(size as u16).to_le_bytes());
        }
        0x10000..=0xffff_ffff => {
            bytes.put(&[0xfe]);
            bytes.put(&(size as u32).to_le_bytes());
        }
        _ => {
            bytes.put(&[0xff]);
            bytes.put(&size.to_le_bytes());
        }
    }
}

fn read_compact_size(bytes: &mut Bytes) -> Result<u64, DataError> {
    let first_byte = read_array::<1>(bytes)?[0];
    match first_byte {
        0..=0xfc => Ok(first_byte as u64),
        0xfd => Ok(u16::from_le_bytes(read_array::<2>(bytes)?) as u64),
        0xfe => Ok(u32::from_le_bytes(read_array::<4>(bytes)?) as u64),
        0xff => Ok(u64::from_le_bytes(read_array::<8>(bytes)?)),
    }
}

#[cfg(test)]
mod tests {
    use std::fmt::Debug;

    use bytes::Bytes;

    use crate::ser::BitcoinSer;

    fn verify_ser<T: BitcoinSer + Debug + PartialEq>(a: T, b: &[u8]) {
        assert_eq!(a.ser().as_ref(), b);
        assert_eq!(a.ser_len(), b.len());
        let mut bytes = Bytes::copy_from_slice(b);
        assert_eq!(a, T::deser(&mut bytes).unwrap());
    }

    #[test]
    fn test_ser_bytes() {
        verify_ser(Bytes::new(), &[0]);
        verify_ser(Bytes::from(vec![1]), &[1, 1]);
        verify_ser(Bytes::from(vec![1, 2, 3]), &[3, 1, 2, 3]);
        verify_ser(
            Bytes::from(vec![4; 0xfc]),
            &[[0xfc].as_ref(), &[4; 0xfc]].concat(),
        );
        verify_ser(
            Bytes::from(vec![5; 0xfd]),
            &[[0xfd, 0xfd, 0].as_ref(), &[5; 0xfd]].concat(),
        );
        verify_ser(
            Bytes::from(vec![6; 0xfe]),
            &[[0xfd, 0xfe, 0].as_ref(), &[6; 0xfe]].concat(),
        );
        verify_ser(
            Bytes::from(vec![7; 0xffff]),
            &[[0xfd, 0xff, 0xff].as_ref(), &vec![7; 0xffff]].concat(),
        );
        verify_ser(
            Bytes::from(vec![8; 0x10000]),
            &[[0xfe, 0, 0, 1, 0].as_ref(), &vec![8; 0x10000]].concat(),
        );
    }

    #[test]
    fn test_ser_byte_array() {
        verify_ser([], &[]);
        verify_ser([1u8], &[1]);
        verify_ser([1u8, 2], &[1, 2]);
        verify_ser([1u8, 2, 3], &[1, 2, 3]);
        verify_ser([4u8; 32], &[4; 32]);
        verify_ser([5u8; 0xff], &[5; 0xff]);
    }

    #[test]
    fn test_ser_vec() {
        verify_ser(Vec::<u32>::new(), &[0]);
        verify_ser(vec![1u8], &[1, 1]);
        verify_ser(vec![1u32], &[1, 1, 0, 0, 0]);
        verify_ser(vec![1u8, 2, 3], &[3, 1, 2, 3]);
        verify_ser(vec![1u16, 2, 3], &[3, 1, 0, 2, 0, 3, 0]);
        let vec_bytes = vec![
            Bytes::new(),
            Bytes::from([1].as_ref()),
            Bytes::from([1, 2, 3].as_ref()),
        ];
        verify_ser(vec_bytes, &[3, 0, 1, 1, 3, 1, 2, 3]);
    }

    #[test]
    fn test_ser_bool() {
        verify_ser(true, &[1]);
        verify_ser(false, &[0]);
    }

    #[test]
    fn test_ser_integers() {
        verify_ser(128u8, &[128]);
        verify_ser(123u8, &[123]);
        verify_ser(123i8, &[123]);
        verify_ser(-123i8, &[133]);
        verify_ser(0x1234u16, &[0x34, 0x12]);
        verify_ser(0x9234u16, &[0x34, 0x92]);
        verify_ser(0x1234i16, &[0x34, 0x12]);
        verify_ser(-0x1234i16, &[0xcc, 0xed]);
        verify_ser(0x12345678u32, &[0x78, 0x56, 0x34, 0x12]);
        verify_ser(0x92345678u32, &[0x78, 0x56, 0x34, 0x92]);
        verify_ser(0x12345678i32, &[0x78, 0x56, 0x34, 0x12]);
        verify_ser(-0x12345678i32, &[0x88, 0xa9, 0xcb, 0xed]);
        verify_ser(
            0x1234567890abcdefu64,
            &[0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12],
        );
        verify_ser(
            0x9234567890abcdefu64,
            &[0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x92],
        );
        verify_ser(
            0x1234567890abcdefi64,
            &[0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12],
        );
        verify_ser(
            -0x1234567890abcdefi64,
            &[0x11, 0x32, 0x54, 0x6f, 0x87, 0xa9, 0xcb, 0xed],
        );
        verify_ser(
            0x1234567890abcdeffedcba0123456789u128,
            &[
                0x89, 0x67, 0x45, 0x23, 0x01, 0xba, 0xdc, 0xfe, 0xef, 0xcd,
                0xab, 0x90, 0x78, 0x56, 0x34, 0x12,
            ],
        );
        verify_ser(
            0x9234567890abcdeffedcba0123456789u128,
            &[
                0x89, 0x67, 0x45, 0x23, 0x01, 0xba, 0xdc, 0xfe, 0xef, 0xcd,
                0xab, 0x90, 0x78, 0x56, 0x34, 0x92,
            ],
        );
        verify_ser(
            0x1234567890abcdeffedcba0123456789i128,
            &[
                0x89, 0x67, 0x45, 0x23, 0x01, 0xba, 0xdc, 0xfe, 0xef, 0xcd,
                0xab, 0x90, 0x78, 0x56, 0x34, 0x12,
            ],
        );
        verify_ser(
            -0x1234567890abcdeffedcba0123456789i128,
            &[
                0x77, 0x98, 0xba, 0xdc, 0xfe, 0x45, 0x23, 0x01, 0x10, 0x32,
                0x54, 0x6f, 0x87, 0xa9, 0xcb, 0xed,
            ],
        );
    }
}
