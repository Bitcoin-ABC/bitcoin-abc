use bytes::{BufMut, Bytes, BytesMut};

use crate::{
    hash::Hashed,
    script::{PubKey, PubKeyVariant, ScriptVariant, UncompressedPubKey},
};

/// Number of special script for compression
pub const COMPRESS_NUM_SPECIAL_SCRIPTS: usize = 6;

/// Compresses the given script, which results in a shorter bytestring for
/// common script variants.
///
/// Important: This matches the ScriptCompression function in /src/compressor.h.
/// When introducing new script variants, consider updating it in tandem with
/// this one.
pub fn compress_script_variant(script_variant: &ScriptVariant) -> Bytes {
    match script_variant {
        ScriptVariant::P2PKH(pkh) => {
            let mut bytes = BytesMut::with_capacity(21);
            bytes.put_u8(0x00);
            bytes.put_slice(pkh.as_le_bytes());
            bytes.freeze()
        }
        ScriptVariant::P2SH(sh) => {
            let mut bytes = BytesMut::with_capacity(21);
            bytes.put_u8(0x01);
            bytes.put_slice(sh.as_le_bytes());
            bytes.freeze()
        }
        ScriptVariant::P2PK(pk) => match pk {
            PubKeyVariant::Compressed(PubKey(pk)) => pk.to_vec().into(),
            PubKeyVariant::Uncompressed(UncompressedPubKey(pk)) => {
                let mut bytes = BytesMut::with_capacity(33);
                bytes.put_u8((pk[64] & 0x01) | 0x04);
                bytes.put_slice(&pk[1..][..32]);
                bytes.freeze()
            }
        },
        ScriptVariant::Other(script) => {
            let mut bytes =
                BytesMut::with_capacity(script.bytecode().len() + 1);
            write_var_int(
                &mut bytes,
                (script.bytecode().len() + COMPRESS_NUM_SPECIAL_SCRIPTS) as u64,
            );
            bytes.put_slice(script.bytecode());
            bytes.freeze()
        }
    }
}

/// Write a VARINT (not to be confused with CompactSize).
pub fn write_var_int(bytes: &mut BytesMut, mut n: u64) {
    let mut tmp = [0u8; 10];
    let mut len = 0;
    loop {
        tmp[len] = (n & 0x7F) as u8 | (if len != 0 { 0x80 } else { 0x00 });
        if n <= 0x7F {
            break;
        }
        n = (n >> 7) - 1;
        len += 1;
    }
    loop {
        bytes.put_slice(&[tmp[len]]);
        if len == 0 {
            break;
        }
        len -= 1;
    }
}

#[cfg(test)]
mod tests {
    use bytes::{Bytes, BytesMut};

    use crate::{
        error::DataError,
        hash::{Hashed, ShaRmd160},
        script::{
            compress::write_var_int, compress_script_variant, PubKey,
            PubKeyVariant, Script, ScriptVariant, UncompressedPubKey,
        },
    };

    #[test]
    fn test_var_int() {
        // see src/test/serialize_tests.cpp(varints_bitpatterns)
        let varint_hex = |n: u64| -> String {
            let mut bytes = BytesMut::new();
            write_var_int(&mut bytes, n);
            hex::encode(&bytes.freeze())
        };
        assert_eq!(varint_hex(0), "00");
        assert_eq!(varint_hex(0x7f), "7f");
        assert_eq!(varint_hex(0x80), "8000");
        assert_eq!(varint_hex(0x1234), "a334");
        assert_eq!(varint_hex(0xffff), "82fe7f");
        assert_eq!(varint_hex(0x123456), "c7e756");
        assert_eq!(varint_hex(0x80123456), "86ffc7e756");
        assert_eq!(varint_hex(0xffffffff), "8efefefe7f");
        assert_eq!(varint_hex(0x7fffffffffffffff), "fefefefefefefefe7f");
        assert_eq!(varint_hex(0xffffffffffffffff), "80fefefefefefefefe7f");
    }

    #[test]
    fn test_compress_script_variant() -> Result<(), DataError> {
        let hash = ShaRmd160([4; 20]);
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2PKH(hash)),
            Bytes::from([[0x00].as_ref(), hash.as_le_bytes()].concat()),
        );
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2SH(hash)),
            Bytes::from([[0x01].as_ref(), hash.as_le_bytes()].concat()),
        );

        let pk = "027c5bde5a66a0fbcfe89c394f406ab88a245beb66af6a25216b1415ac94\
                5142ea"
            .parse::<PubKey>()?;
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2PK(
                PubKeyVariant::Compressed(pk)
            )),
            Bytes::from(pk.0.to_vec()),
        );
        let pk = "0336850a73a20c678a27f8ed42a6713c971ae9479436a0f26afa7e6eb831\
                4aa479"
            .parse::<PubKey>()?;
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2PK(
                PubKeyVariant::Compressed(pk)
            )),
            Bytes::from(pk.0.to_vec()),
        );

        // Uncompressed PK with even parity
        let pk = "04b7490a14c2266e6e12f474158121e322d1660643721af48256a5a0f8f7\
                 eeb230af067256dcd144310ab866101af284f4499eae73ec308e1c894610\
                 1d85949b8a"
            .parse::<UncompressedPubKey>()?;
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2PK(
                PubKeyVariant::Uncompressed(pk)
            )),
            Bytes::from(pk.0[..33].to_vec()),
        );

        // Uncompressed PK with odd parity
        let pk = "04eefdb19ef67210ca651c5b466c5fc4e5183b71ae7a3524f11090a0ebd1\
                 707e674f3d673c461162a3862277fdd422a20486b3b536232eef48fad179\
                 ddff4a93ed"
            .parse::<UncompressedPubKey>()?;
        assert_eq!(
            compress_script_variant(&ScriptVariant::P2PK(
                PubKeyVariant::Uncompressed(pk)
            )),
            Bytes::from([[0x05].as_ref(), &pk.0[1..33]].concat()),
        );

        assert_eq!(
            compress_script_variant(&ScriptVariant::Other(Script::default())),
            Bytes::from([0x06].as_ref()),
        );

        assert_eq!(
            compress_script_variant(&ScriptVariant::Other(Script::new(
                vec![4; 121].into()
            ))),
            Bytes::from([[0x7f].as_ref(), &[4; 121]].concat()),
        );

        assert_eq!(
            compress_script_variant(&ScriptVariant::Other(Script::new(
                vec![4; 122].into()
            ))),
            Bytes::from([[0x80, 0x00].as_ref(), &[4; 122]].concat()),
        );

        Ok(())
    }
}
