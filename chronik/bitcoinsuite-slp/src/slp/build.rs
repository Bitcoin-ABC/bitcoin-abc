// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    hash::Hashed,
    script::{opcode::OP_RETURN, Script, ScriptMut},
};

use crate::{
    consts::{BURN, GENESIS, MINT, SEND},
    slp::consts::{
        SLP_LOKAD_ID, TOKEN_TYPE_V1, TOKEN_TYPE_V1_NFT1_CHILD,
        TOKEN_TYPE_V1_NFT1_GROUP, TOKEN_TYPE_V2,
    },
    structs::{Atoms, GenesisInfo},
    token_id::TokenId,
    token_type::SlpTokenType,
};

fn token_type_bytes(token_type: SlpTokenType) -> &'static [u8] {
    match token_type {
        SlpTokenType::Fungible => &[TOKEN_TYPE_V1],
        SlpTokenType::MintVault => &[TOKEN_TYPE_V2],
        SlpTokenType::Nft1Group => &[TOKEN_TYPE_V1_NFT1_GROUP],
        SlpTokenType::Nft1Child => &[TOKEN_TYPE_V1_NFT1_CHILD],
        SlpTokenType::Unknown(_) => {
            panic!("Cannot use 'Unknown' token type here")
        }
    }
}

/// Build an SLP OP_RETURN GENESIS script
pub fn genesis_opreturn(
    genesis_info: &GenesisInfo,
    token_type: SlpTokenType,
    mint_baton_out_idx: Option<u8>,
    initial_quantity: Atoms,
) -> Script {
    let mut script = ScriptMut::with_capacity(64);
    script.put_opcodes([OP_RETURN]);
    script.put_slp_pushdata(&SLP_LOKAD_ID);
    script.put_slp_pushdata(token_type_bytes(token_type));
    script.put_slp_pushdata(GENESIS);
    script.put_slp_pushdata(&genesis_info.token_ticker);
    script.put_slp_pushdata(&genesis_info.token_name);
    script.put_slp_pushdata(&genesis_info.url);
    script.put_slp_pushdata(match &genesis_info.hash {
        Some(hash) => hash,
        None => &[],
    });
    script.put_slp_pushdata(&[genesis_info.decimals]);
    match token_type {
        SlpTokenType::MintVault => script.put_slp_pushdata(
            genesis_info
                .mint_vault_scripthash
                .as_ref()
                .map_or(&[], |hash| hash.as_le_bytes()),
        ),
        _ => match mint_baton_out_idx {
            Some(out_idx) => script.put_slp_pushdata(&[out_idx]),
            None => script.put_slp_pushdata(&[]),
        },
    }
    script.put_slp_pushdata(&initial_quantity.to_be_bytes());
    script.freeze()
}

/// Build an SLP OP_RETURN MINT script (for Fungible and Nft1Group).
pub fn mint_opreturn(
    token_id: &TokenId,
    token_type: SlpTokenType,
    mint_baton_out_idx: Option<u8>,
    additional_quantity: Atoms,
) -> Script {
    let mut script = ScriptMut::with_capacity(64);
    script.put_opcodes([OP_RETURN]);
    script.put_slp_pushdata(&SLP_LOKAD_ID);
    script.put_slp_pushdata(token_type_bytes(token_type));
    script.put_slp_pushdata(MINT);
    script.put_slp_pushdata(&token_id.to_be_bytes());
    match mint_baton_out_idx {
        Some(out_idx) => script.put_slp_pushdata(&[out_idx]),
        None => script.put_slp_pushdata(&[]),
    };
    script.put_slp_pushdata(&additional_quantity.to_be_bytes());
    script.freeze()
}

/// Build an SLP OP_RETURN MINT script for V2 MintVault
pub fn mint_vault_opreturn(
    token_id: &TokenId,
    additional_quantites: impl IntoIterator<Item = Atoms>,
) -> Script {
    let mut script = ScriptMut::with_capacity(64);
    script.put_opcodes([OP_RETURN]);
    script.put_slp_pushdata(&SLP_LOKAD_ID);
    script.put_slp_pushdata(token_type_bytes(SlpTokenType::MintVault));
    script.put_slp_pushdata(MINT);
    script.put_slp_pushdata(&token_id.to_be_bytes());
    for additional_quantity in additional_quantites {
        script.put_slp_pushdata(&additional_quantity.to_be_bytes());
    }
    script.freeze()
}

/// Build an SLP OP_RETURN SEND script
pub fn send_opreturn(
    token_id: &TokenId,
    token_type: SlpTokenType,
    send_atoms: &[Atoms],
) -> Script {
    let mut script = ScriptMut::with_capacity(64);
    script.put_opcodes([OP_RETURN]);
    script.put_slp_pushdata(&SLP_LOKAD_ID);
    script.put_slp_pushdata(token_type_bytes(token_type));
    script.put_slp_pushdata(SEND);
    script.put_slp_pushdata(&token_id.to_be_bytes());
    for &atoms in send_atoms {
        script.put_slp_pushdata(&atoms.to_be_bytes());
    }
    script.freeze()
}

/// Build an SLP OP_RETURN BURN script
pub fn burn_opreturn(
    token_id: &TokenId,
    token_type: SlpTokenType,
    burn_atoms: Atoms,
) -> Script {
    let mut script = ScriptMut::with_capacity(1 + 5 + 2 + 5 + 33 + 9);
    script.put_opcodes([OP_RETURN]);
    script.put_slp_pushdata(&SLP_LOKAD_ID);
    script.put_slp_pushdata(token_type_bytes(token_type));
    script.put_slp_pushdata(BURN);
    script.put_slp_pushdata(&token_id.to_be_bytes());
    script.put_slp_pushdata(&burn_atoms.to_be_bytes());
    script.freeze()
}
