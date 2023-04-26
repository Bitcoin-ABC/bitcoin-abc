// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`read_bytes`] and [`read_array`].

use bytes::Bytes;

use crate::error::DataError;

/// Read `num_bytes` bytes from the given `bytes` (shrinking it), and return the
/// read bytes as a [`Bytes`].
///
/// Returns an error if `num_bytes` > `bytes.len()`.
///
/// This is O(1), and doesn't allocate memory, as it just creates a slice on
/// existing memory.
///
/// ```
/// # use bitcoinsuite_core::{bytes::read_bytes, error::DataError};
/// use bytes::Bytes;
/// let mut a = Bytes::from(vec![1, 2, 3, 4, 5]);
/// assert_eq!(read_bytes(&mut a, 3).unwrap().as_ref(), &[1, 2, 3]);
/// assert_eq!(a.as_ref(), &[4, 5]);
///
/// assert_eq!(
///     read_bytes(&mut a, 4).unwrap_err(),
///     DataError::InvalidLength {
///         expected: 4,
///         actual: 2,
///     },
/// );
/// ```
pub fn read_bytes(
    bytes: &mut Bytes,
    num_bytes: usize,
) -> Result<Bytes, DataError> {
    if bytes.len() < num_bytes {
        return Err(DataError::InvalidLength {
            expected: num_bytes,
            actual: bytes.len(),
        });
    }
    Ok(bytes.split_to(num_bytes))
}

/// Read a fixed-sized byte array from the given `bytes` (shrinking it), and
/// return the read array.
///
/// Returns an error if `N` > `bytes.len()`.
///
/// This is O(1), and doesn't allocate memory, as it just creates a slice on
/// existing memory.
///
/// ```
/// # use bitcoinsuite_core::{bytes::read_array, error::DataError};
/// use bytes::Bytes;
/// let mut a = Bytes::from(vec![1, 2, 3, 4, 5]);
/// assert_eq!(read_array::<3>(&mut a).unwrap(), [1, 2, 3]);
/// assert_eq!(a.as_ref(), &[4, 5]);
///
/// assert_eq!(
///     read_array::<4>(&mut a).unwrap_err(),
///     DataError::InvalidLength {
///         expected: 4,
///         actual: 2,
///     },
/// );
/// ```
pub fn read_array<const N: usize>(
    bytes: &mut Bytes,
) -> Result<[u8; N], DataError> {
    let data = read_bytes(bytes, N)?;
    Ok(data.as_ref().try_into().unwrap())
}
