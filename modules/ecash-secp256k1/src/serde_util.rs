// SPDX-License-Identifier: CC0-1.0

use core::fmt;
use core::marker::PhantomData;
use core::str::{self, FromStr};

use serde::de;

/// A serde visitor that works for `T`s implementing `FromStr`.
pub struct FromStrVisitor<T> {
    expectation: &'static str,
    _pd: PhantomData<T>,
}

impl<T> FromStrVisitor<T> {
    pub fn new(expectation: &'static str) -> Self {
        FromStrVisitor {
            expectation,
            _pd: PhantomData,
        }
    }
}

impl<'de, T> de::Visitor<'de> for FromStrVisitor<T>
where
    T: FromStr,
    <T as FromStr>::Err: fmt::Display,
{
    type Value = T;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str(self.expectation)
    }

    fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
        FromStr::from_str(v).map_err(E::custom)
    }
}

pub struct BytesVisitor<F> {
    expectation: &'static str,
    parse_fn: F,
}

impl<F, T, Err> BytesVisitor<F>
where
    F: FnOnce(&[u8]) -> Result<T, Err>,
    Err: fmt::Display,
{
    pub fn new(expectation: &'static str, parse_fn: F) -> Self {
        BytesVisitor {
            expectation,
            parse_fn,
        }
    }
}

impl<'de, F, T, Err> de::Visitor<'de> for BytesVisitor<F>
where
    F: FnOnce(&[u8]) -> Result<T, Err>,
    Err: fmt::Display,
{
    type Value = T;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str(self.expectation)
    }

    fn visit_bytes<E: de::Error>(self, v: &[u8]) -> Result<Self::Value, E> {
        (self.parse_fn)(v).map_err(E::custom)
    }
}

macro_rules! impl_tuple_visitor {
    ($thing:ident, $len:expr) => {
        pub(crate) struct $thing<F> {
            expectation: &'static str,
            parse_fn: F,
        }

        impl<F, T, E> $thing<F>
        where
            F: FnOnce(&[u8]) -> Result<T, E>,
            E: fmt::Display,
        {
            pub fn new(expectation: &'static str, parse_fn: F) -> Self {
                $thing {
                    expectation,
                    parse_fn,
                }
            }
        }

        impl<'de, F, T, E> de::Visitor<'de> for $thing<F>
        where
            F: FnOnce(&[u8]) -> Result<T, E>,
            E: fmt::Display,
        {
            type Value = T;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str(self.expectation)
            }

            fn visit_seq<V>(self, mut seq: V) -> Result<Self::Value, V::Error>
            where
                V: de::SeqAccess<'de>,
            {
                let mut bytes = [0u8; $len];

                for (i, byte) in bytes.iter_mut().enumerate() {
                    if let Some(value) = seq.next_element()? {
                        *byte = value;
                    } else {
                        return Err(de::Error::invalid_length(i, &self));
                    }
                }
                (self.parse_fn)(&bytes).map_err(de::Error::custom)
            }
        }
    };
}

impl_tuple_visitor!(Tuple32Visitor, 32);
impl_tuple_visitor!(Tuple33Visitor, 33);
