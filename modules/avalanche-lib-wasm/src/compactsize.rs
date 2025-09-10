// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Utility functions for serialization and deserialization.

/// Read compact size from bytes.
/// Returns (value, bytes_consumed).
pub fn read_compact_size(data: &[u8]) -> Result<(u64, usize), String> {
    if data.is_empty() {
        return Err("Empty data for compact size".to_string());
    }

    let first_byte = data[0];
    match first_byte {
        0..=0xfc => Ok((first_byte as u64, 1)),
        0xfd => {
            if data.len() < 3 {
                return Err(
                    "Insufficient data for compact size (fd)".to_string()
                );
            }
            let value = u16::from_le_bytes([data[1], data[2]]) as u64;
            Ok((value, 3))
        }
        0xfe => {
            if data.len() < 5 {
                return Err(
                    "Insufficient data for compact size (fe)".to_string()
                );
            }
            let value =
                u32::from_le_bytes([data[1], data[2], data[3], data[4]]) as u64;
            Ok((value, 5))
        }
        0xff => {
            if data.len() < 9 {
                return Err(
                    "Insufficient data for compact size (ff)".to_string()
                );
            }
            let value = u64::from_le_bytes([
                data[1], data[2], data[3], data[4], data[5], data[6], data[7],
                data[8],
            ]);
            Ok((value, 9))
        }
    }
}

/// Write compact size to bytes.
/// Returns the bytes representing the compact size encoding.
pub fn write_compact_size(value: u64) -> Vec<u8> {
    if value < 0xfd {
        vec![value as u8]
    } else if value <= 0xffff {
        let mut bytes = vec![0xfd];
        bytes.extend_from_slice(&(value as u16).to_le_bytes());
        bytes
    } else if value <= 0xffffffff {
        let mut bytes = vec![0xfe];
        bytes.extend_from_slice(&(value as u32).to_le_bytes());
        bytes
    } else {
        let mut bytes = vec![0xff];
        bytes.extend_from_slice(&value.to_le_bytes());
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_compact_size() {
        // Test single byte (0-252)
        assert_eq!(read_compact_size(&[42]).unwrap(), (42, 1));
        assert_eq!(read_compact_size(&[252]).unwrap(), (252, 1));

        // Test 3-byte format (253-65535)
        assert_eq!(read_compact_size(&[0xfd, 0x01, 0x00]).unwrap(), (1, 3));
        assert_eq!(read_compact_size(&[0xfd, 0xff, 0xff]).unwrap(), (65535, 3));

        // Test 5-byte format
        assert_eq!(
            read_compact_size(&[0xfe, 0x01, 0x00, 0x00, 0x00]).unwrap(),
            (1, 5)
        );

        // Test 9-byte format
        assert_eq!(
            read_compact_size(&[
                0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
            ])
            .unwrap(),
            (1, 9)
        );

        // Test error cases
        assert!(read_compact_size(&[]).is_err());
        assert!(read_compact_size(&[0xfd]).is_err());
        assert!(read_compact_size(&[0xfd, 0x01]).is_err());
    }

    #[test]
    fn test_write_compact_size() {
        // Test single byte (0-252)
        assert_eq!(write_compact_size(0), vec![0]);
        assert_eq!(write_compact_size(42), vec![42]);
        assert_eq!(write_compact_size(252), vec![252]);

        // Test 3-byte format (253-65535)
        assert_eq!(write_compact_size(253), vec![0xfd, 0xfd, 0x00]);
        assert_eq!(write_compact_size(1000), vec![0xfd, 0xe8, 0x03]);
        assert_eq!(write_compact_size(65535), vec![0xfd, 0xff, 0xff]);

        // Test 5-byte format (65536-4294967295)
        assert_eq!(
            write_compact_size(65536),
            vec![0xfe, 0x00, 0x00, 0x01, 0x00]
        );
        assert_eq!(
            write_compact_size(16777216),
            vec![0xfe, 0x00, 0x00, 0x00, 0x01]
        );
        assert_eq!(
            write_compact_size(4294967295),
            vec![0xfe, 0xff, 0xff, 0xff, 0xff]
        );

        // Test 9-byte format (4294967296+)
        assert_eq!(
            write_compact_size(4294967296),
            vec![0xff, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]
        );
        assert_eq!(
            write_compact_size(u64::MAX),
            vec![0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
        );
    }

    #[test]
    fn test_compact_size_round_trip() {
        // Test that write -> read gives back the original value
        let test_values = vec![
            0,
            1,
            42,
            252,
            253,
            254,
            255,
            256,
            1000,
            65535,
            65536,
            16777216,
            4294967295,
            4294967296,
            u64::MAX,
        ];

        for value in test_values {
            let encoded = write_compact_size(value);
            let (decoded, bytes_consumed) =
                read_compact_size(&encoded).unwrap();
            assert_eq!(decoded, value, "Round-trip failed for value {}", value);
            assert_eq!(
                bytes_consumed,
                encoded.len(),
                "Bytes consumed mismatch for value {}",
                value
            );
        }
    }
}
