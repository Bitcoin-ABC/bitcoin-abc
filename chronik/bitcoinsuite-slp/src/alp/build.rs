use bitcoinsuite_core::{
    hash::Hashed,
    script::{
        opcode::{OP_RESERVED, OP_RETURN},
        Script, ScriptMut,
    },
};
use bytes::{BufMut, Bytes, BytesMut};

use crate::{
    alp::consts::ALP_LOKAD_ID,
    consts::{BURN, GENESIS, MINT, SEND},
    parsed::ParsedMintData,
    structs::{Atoms, GenesisInfo},
    token_id::TokenId,
    token_type::AlpTokenType,
};

/// Build an OP_RETURN script with the given sections
pub fn sections_opreturn(sections: Vec<Bytes>) -> Script {
    let mut script = ScriptMut::default();
    script.put_opcodes([OP_RETURN, OP_RESERVED]);
    for section in sections {
        script.put_pushdata(&section);
    }
    script.freeze()
}

/// Build an ALP GENESIS pushdata section
pub fn genesis_section(
    token_type: AlpTokenType,
    genesis_info: &GenesisInfo,
    mint_data: &ParsedMintData,
) -> Bytes {
    let mut section = BytesMut::new();
    section.put_slice(&ALP_LOKAD_ID);
    section.put_slice(&[token_type.to_u8()]);
    section.put_slice(&[GENESIS.len() as u8]);
    section.put_slice(GENESIS);

    section.put_slice(&[genesis_info.token_ticker.len() as u8]);
    section.put_slice(&genesis_info.token_ticker);

    section.put_slice(&[genesis_info.token_name.len() as u8]);
    section.put_slice(&genesis_info.token_name);

    section.put_slice(&[genesis_info.url.len() as u8]);
    section.put_slice(&genesis_info.url);

    let data = genesis_info.data.as_deref().unwrap_or(&[]);
    section.put_slice(&[data.len() as u8]);
    section.put_slice(data);

    let auth_pubkey = genesis_info.auth_pubkey.as_deref().unwrap_or(&[]);
    section.put_slice(&[auth_pubkey.len() as u8]);
    section.put_slice(auth_pubkey);

    section.put_slice(&[genesis_info.decimals]);
    put_mint_data(&mut section, mint_data);
    section.freeze()
}

/// Build an ALP MINT pushdata section
pub fn mint_section(
    token_id: &TokenId,
    token_type: AlpTokenType,
    mint_data: &ParsedMintData,
) -> Bytes {
    let mut section = BytesMut::new();
    section.put_slice(&ALP_LOKAD_ID);
    section.put_slice(&[token_type.to_u8()]);
    section.put_slice(&[MINT.len() as u8]);
    section.put_slice(MINT);
    section.put_slice(token_id.txid().hash().as_le_bytes());
    put_mint_data(&mut section, mint_data);

    section.freeze()
}

/// Build an ALP BURN pushdata section
pub fn burn_section(
    token_id: &TokenId,
    token_type: AlpTokenType,
    atoms: Atoms,
) -> Bytes {
    let mut section = BytesMut::new();
    section.put_slice(&ALP_LOKAD_ID);
    section.put_slice(&[token_type.to_u8()]);
    section.put_slice(&[BURN.len() as u8]);
    section.put_slice(BURN);
    section.put_slice(token_id.txid().hash().as_le_bytes());
    put_atoms(&mut section, atoms);
    section.freeze()
}

/// Build an ALP SEND pushdata section
pub fn send_section<I: ExactSizeIterator<Item = Atoms>>(
    token_id: &TokenId,
    token_type: AlpTokenType,
    send_amounts: impl IntoIterator<Item = Atoms, IntoIter = I>,
) -> Bytes {
    let mut section = BytesMut::new();
    section.put_slice(&ALP_LOKAD_ID);
    section.put_slice(&[token_type.to_u8()]);
    section.put_slice(&[SEND.len() as u8]);
    section.put_slice(SEND);
    section.put_slice(token_id.txid().hash().as_le_bytes());

    let send_amounts = send_amounts.into_iter();
    section.put_slice(&[send_amounts.len() as u8]);
    for send_amount in send_amounts {
        put_atoms(&mut section, send_amount);
    }
    section.freeze()
}

fn put_mint_data(section: &mut BytesMut, mint_data: &ParsedMintData) {
    section.put_slice(&[mint_data.atoms_vec.len() as u8]);
    for &atoms in &mint_data.atoms_vec {
        put_atoms(section, atoms);
    }
    section.put_slice(&[mint_data.num_batons as u8]);
}

fn put_atoms(section: &mut BytesMut, atoms: Atoms) {
    section.put_slice(&atoms.to_le_bytes()[..6]);
}
