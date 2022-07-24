// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! De-/Serializes data for the Chronik database.

use abc_rust_error::Result;
use thiserror::Error;

/// Errors for de-/serialization.
#[derive(Clone, Debug, Error, PartialEq)]
pub enum SerError {
    /// Serialization failed.
    #[error("Cannot serialize {type_name}: {error}")]
    SerializeError {
        /// Name of the type we tried to serialize.
        type_name: &'static str,
        /// Error why serialization failed.
        error: postcard::Error,
    },

    /// Deserialization failed.
    #[error(
        "Inconsistent DB: Cannot deserialize byte sequence as {type_name}: \
         {error}. Byte sequence: {}",
        hex::encode(.bytes),
    )]
    DeserializeError {
        /// Name of the type we tried to deserialize.
        type_name: &'static str,
        /// Error why deserialization failed.
        error: postcard::Error,
        /// Byte sequence that made deserialization fail.
        bytes: Vec<u8>,
    },
}

pub(crate) fn db_serialize<T: serde::Serialize>(value: &T) -> Result<Vec<u8>> {
    Ok(postcard::to_allocvec(value).map_err(|error| {
        SerError::SerializeError {
            type_name: std::any::type_name::<T>(),
            error,
        }
    })?)
}

#[cfg(test)]
pub(crate) fn db_deserialize<'a, T: serde::Deserialize<'a>>(
    bytes: &'a [u8],
) -> Result<T> {
    Ok(postcard::from_bytes(bytes).map_err(|error| {
        SerError::DeserializeError {
            type_name: std::any::type_name::<T>(),
            error,
            bytes: bytes.to_vec(),
        }
    })?)
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use pretty_assertions::assert_eq;
    use serde::{Deserialize, Serialize};

    use crate::ser::{db_deserialize, db_serialize, SerError};

    #[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
    struct SerTest {
        arr: [u8; 4],
        vec: Vec<u8>,
        num: u32,
    }

    struct Unserializable;
    impl Serialize for Unserializable {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: serde::Serializer,
        {
            use serde::ser::SerializeSeq;
            let seq = serializer.serialize_seq(None)?;
            seq.end()
        }
    }

    #[test]
    fn test_roundtrip() -> Result<()> {
        let obj = SerTest {
            arr: [0xff, 0x60, 0x10, 0],
            vec: vec![0x80, 1, 2, 3],
            num: 0xdeadbeef,
        };
        assert_eq!(obj, db_deserialize::<SerTest>(&db_serialize(&obj)?)?);
        Ok(())
    }

    #[test]
    fn test_serialize_err() -> Result<()> {
        assert_eq!(
            db_serialize(&Unserializable)
                .unwrap_err()
                .downcast::<SerError>()?,
            SerError::SerializeError {
                type_name: "chronik_db::ser::tests::Unserializable",
                error: postcard::Error::SerializeSeqLengthUnknown,
            },
        );
        Ok(())
    }

    #[test]
    fn test_deserialize_err() -> Result<()> {
        let invalid_bytes = vec![0xff, 0xff, 0xff];
        assert_eq!(
            db_deserialize::<SerTest>(&invalid_bytes)
                .unwrap_err()
                .downcast::<SerError>()?,
            SerError::DeserializeError {
                type_name: "chronik_db::ser::tests::SerTest",
                error: postcard::Error::DeserializeUnexpectedEnd,
                bytes: invalid_bytes,
            },
        );
        Ok(())
    }

    #[test]
    fn test_err_display_serialize() {
        let err = SerError::SerializeError {
            type_name: "chronik_db::io::blocks::SerBlock",
            error: postcard::Error::SerializeBufferFull,
        };
        assert_eq!(
            err.to_string(),
            "Cannot serialize chronik_db::io::blocks::SerBlock: The serialize \
             buffer is full",
        );
    }

    #[test]
    fn test_err_display_deserialize() {
        let err = SerError::DeserializeError {
            type_name: "chronik_db::io::blocks::SerBlock",
            error: postcard::Error::DeserializeUnexpectedEnd,
            bytes: vec![1, 2, 3],
        };
        assert_eq!(
            err.to_string(),
            "Inconsistent DB: Cannot deserialize byte sequence as \
             chronik_db::io::blocks::SerBlock: Hit the end of buffer, \
             expected more data. Byte sequence: 010203",
        );
    }
}
