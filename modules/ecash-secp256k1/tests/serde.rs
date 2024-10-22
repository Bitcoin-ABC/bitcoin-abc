#![cfg(feature = "serde")]

extern crate bincode;
extern crate ecash_secp256k1 as secp256k1;
extern crate serde_cbor;

#[cfg(feature = "global-context")]
use secp256k1::{Keypair, Secp256k1};
use secp256k1::{PublicKey, SecretKey, XOnlyPublicKey};

// Arbitrary key data.

#[rustfmt::skip]
static SK_BYTES: [u8; 32] = [
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x16, 0x17, 0x18, 0x19, 0x20, 0x21, 0x22, 0x23,
    0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x30, 0x31,
    0x0f, 0x10, 0x1f, 0xa0, 0xa9, 0xaa, 0xaf, 0xff,
];

#[rustfmt::skip]
static PK_BYTES: [u8; 33] = [
    0x02,
    0x18, 0x84, 0x57, 0x81, 0xf6, 0x31, 0xc4, 0x8f,
    0x1c, 0x97, 0x09, 0xe2, 0x30, 0x92, 0x06, 0x7d,
    0x06, 0x83, 0x7f, 0x30, 0xaa, 0x0c, 0xd0, 0x54,
    0x4a, 0xc8, 0x87, 0xfe, 0x91, 0xdd, 0xd1, 0x66,
];

#[rustfmt::skip]
static XONLY_PK_BYTES: [u8; 32] = [
    0x18, 0x84, 0x57, 0x81, 0xf6, 0x31, 0xc4, 0x8f,
    0x1c, 0x97, 0x09, 0xe2, 0x30, 0x92, 0x06, 0x7d,
    0x06, 0x83, 0x7f, 0x30, 0xaa, 0x0c, 0xd0, 0x54,
    0x4a, 0xc8, 0x87, 0xfe, 0x91, 0xdd, 0xd1, 0x66,
];

fn secret_key() -> SecretKey {
    SecretKey::from_byte_array(&SK_BYTES)
        .expect("failed to create sk from slice")
}

// Our current serde serialization implementation is only guaranteed to be fixed
// width for bincode. https://docs.rs/bincode/latest/bincode/index.html
#[test]
fn bincode_secret_key() {
    let sk = secret_key();
    let ser = bincode::serialize(&sk).unwrap();

    assert_eq!(ser, SK_BYTES);
}

#[test]
fn bincode_public_key() {
    let pk = PublicKey::from_slice(&PK_BYTES)
        .expect("failed to create pk from slice");
    let ser = bincode::serialize(&pk).unwrap();

    assert_eq!(ser, &PK_BYTES as &[u8])
}

#[test]
#[cfg(feature = "global-context")]
fn bincode_keypair() {
    let secp = Secp256k1::new();
    let kp = Keypair::from_seckey_slice(&secp, &SK_BYTES)
        .expect("failed to create keypair");
    let ser = bincode::serialize(&kp).unwrap();

    assert_eq!(ser, SK_BYTES);
}

#[test]
fn bincode_x_only_public_key() {
    let pk = XOnlyPublicKey::from_slice(&XONLY_PK_BYTES)
        .expect("failed to create xonly pk from slice");
    let ser = bincode::serialize(&pk).unwrap();

    assert_eq!(ser, XONLY_PK_BYTES);
}

#[test]
fn cbor() {
    let sk = secret_key();
    let e = serde_cbor::to_vec(&sk).unwrap();
    // Secret key is 32 bytes. CBOR adds a byte of metadata for 20 of these
    // bytes, (Apparently, any byte whose value is <24 gets an extra byte.)
    // It also adds a 1-byte length prefix and a byte of metadata for the whole
    // vector.
    assert_eq!(e.len(), 54);
}
