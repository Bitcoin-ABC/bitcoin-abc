use bitcoinsuite_chronik_client::ScriptType;
use bitcoinsuite_core::{
    AddressType, CashAddress, Hashed, Op, Script, ShaRmd160,
};
use bitcoinsuite_error::Result;

use crate::chain::Chain;

pub fn to_be_hex(slice: &[u8]) -> String {
    let mut vec = slice.to_vec();
    vec.reverse();
    hex::encode(&vec)
}

pub fn from_be_hex(string: &str) -> Result<Vec<u8>> {
    let mut decoded = hex::decode(string)?;
    decoded.reverse();
    Ok(decoded)
}

#[derive(Clone, Debug)]
pub enum Destination<'a> {
    Nulldata(Vec<Op>),
    Address(CashAddress<'a>),
    P2PK(Vec<u8>),
    Unknown(Vec<u8>),
}

pub fn destination_from_script<'a>(
    prefix: &'a str,
    script: &[u8],
) -> Destination<'a> {
    const OP_RETURN: u8 = 106;
    const OP_DUP: u8 = 118;
    const OP_EQUAL: u8 = 135;
    const OP_EQUALVERIFY: u8 = 136;
    const OP_HASH160: u8 = 169;
    const OP_CHECKSIG: u8 = 172;

    match script {
        [OP_DUP, OP_HASH160, 20, hash @ .., OP_EQUALVERIFY, OP_CHECKSIG] => {
            Destination::Address(CashAddress::from_hash(
                prefix,
                AddressType::P2PKH,
                ShaRmd160::from_slice(hash).expect("Invalid hash"),
            ))
        }
        [OP_HASH160, 20, hash @ .., OP_EQUAL] => {
            Destination::Address(CashAddress::from_hash(
                prefix,
                AddressType::P2SH,
                ShaRmd160::from_slice(hash).expect("Invalid hash"),
            ))
        }
        [33, pk @ .., OP_CHECKSIG] => Destination::P2PK(pk.to_vec()),
        [65, pk @ .., OP_CHECKSIG] => Destination::P2PK(pk.to_vec()),
        [OP_RETURN, data @ ..] => {
            let ops = Script::from_slice(data);
            let ops = ops.ops().into_iter().map(|op| op.unwrap()).collect();
            Destination::Nulldata(ops)
        }
        _ => Destination::Unknown(script.to_vec()),
    }
}

pub fn to_legacy_address(cash_address: &CashAddress, chain: &Chain) -> String {
    use bitcoin::{
        hashes::{hash160, Hash},
        PubkeyHash, ScriptHash,
    };
    let hash = hash160::Hash::from_slice(cash_address.hash().as_slice())
        .expect("Impossible");
    let script = match cash_address.addr_type() {
        AddressType::P2PKH => {
            bitcoin::Script::new_p2pkh(&PubkeyHash::from_hash(hash))
        }
        AddressType::P2SH => {
            bitcoin::Script::new_p2sh(&ScriptHash::from_hash(hash))
        }
    };
    let legacy_chain = match chain {
        Chain::Mainnet => bitcoin::Network::Bitcoin,
        Chain::Testnet => bitcoin::Network::Testnet,
        Chain::Regtest => bitcoin::Network::Regtest,
    };
    let address = bitcoin::Address::from_script(&script, legacy_chain)
        .expect("Invalid address");
    address.to_string()
}

pub fn calculate_block_difficulty(n_bits: u32) -> f64 {
    let max_target = 0x00ffff as f64 * 2f64.powi(8 * (0x1d - 3));
    let n_size = n_bits >> 24;
    let n_word = (n_bits & 0xffffff) as f64;

    max_target / (n_word * 2f64.powi(8 * (n_size as i32 - 3)))
}

pub fn cash_addr_to_script_type_payload(
    addr: &CashAddress,
) -> (ScriptType, [u8; 20]) {
    let script_type = match addr.addr_type() {
        AddressType::P2PKH => ScriptType::P2pkh,
        AddressType::P2SH => ScriptType::P2sh,
    };
    let script_payload: &[u8; 20] = addr.hash().byte_array().as_array();

    (script_type, *script_payload)
}
