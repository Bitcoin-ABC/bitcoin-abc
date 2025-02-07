// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    hash::{Hashed, ShaRmd160},
    tx::TxId,
};
use bytes::Bytes;

use crate::{
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    slp::{common::parse_atoms, ParseError},
    structs::{GenesisInfo, TokenMeta},
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};

enum MintField {
    BatonOutIdx(Option<u8>),
    VaultScripthash(ShaRmd160),
}

pub(crate) fn parse_genesis_data(
    txid: TxId,
    token_type: SlpTokenType,
    opreturn_data: Vec<Bytes>,
) -> Result<ParsedData, ParseError> {
    if opreturn_data.len() != 10 {
        return Err(ParseError::UnexpectedNumPushes {
            expected: 10,
            actual: opreturn_data.len(),
        });
    }

    let mut data_iter = opreturn_data.into_iter();
    let _lokad_id = data_iter.next().unwrap();
    let _token_type = data_iter.next().unwrap();
    let _tx_type = data_iter.next().unwrap();
    let token_ticker = data_iter.next().unwrap();
    let token_name = data_iter.next().unwrap();
    let token_document_url = data_iter.next().unwrap();
    let token_document_hash = data_iter.next().unwrap();
    let decimals = data_iter.next().unwrap();
    let mint_field = data_iter.next().unwrap();
    let initial_quantity = data_iter.next().unwrap();
    assert!(data_iter.next().is_none());
    if !token_document_hash.is_empty() && token_document_hash.len() != 32 {
        return Err(ParseError::InvalidFieldSize {
            field_name: "token_document_hash",
            expected: &[0, 32],
            actual: token_document_hash.len(),
        });
    }
    if decimals.len() != 1 {
        return Err(ParseError::InvalidFieldSize {
            field_name: "decimals",
            expected: &[1],
            actual: decimals.len(),
        });
    }
    let mint_field = parse_mint_field(token_type, &mint_field)?;
    let initial_quantity = parse_atoms(&initial_quantity, "initial_quantity")?;
    if decimals[0] > 9 {
        return Err(ParseError::InvalidDecimals {
            actual: decimals[0] as usize,
        });
    }
    let decimals = decimals[0];
    if token_type == SlpTokenType::Nft1Child {
        if mint_field.mint_baton_out_idx().is_some() {
            return Err(ParseError::Nft1ChildCannotHaveMintBaton);
        }
        if initial_quantity != 1 {
            return Err(ParseError::Nft1ChildInvalidInitialQuantity(
                initial_quantity,
            ));
        }
        if decimals != 0 {
            return Err(ParseError::Nft1ChildInvalidDecimals(decimals));
        }
    }
    let mut atoms_vec = vec![initial_quantity];
    if let Some(mint_baton_out_idx) = mint_field.mint_baton_out_idx() {
        // Pad mint amount 0s so the mint baton is at the correct output
        // -1 for the OP_RETURN output, and -1 for the initial quantity output
        atoms_vec.extend(vec![0; mint_baton_out_idx as usize - 2]);
    }

    Ok(ParsedData {
        meta: TokenMeta {
            token_id: TokenId::new(txid),
            token_type: TokenType::Slp(token_type),
        },
        tx_type: ParsedTxType::Genesis(ParsedGenesis {
            info: GenesisInfo {
                token_ticker,
                token_name,
                mint_vault_scripthash: mint_field.mint_vault_scripthash(),
                url: token_document_url,
                hash: token_document_hash.as_ref().try_into().ok(),
                data: None,
                auth_pubkey: None,
                decimals,
            },
            mint_data: ParsedMintData {
                atoms_vec,
                num_batons: mint_field.mint_baton_out_idx().is_some() as usize,
            },
        }),
    })
}

fn parse_mint_field(
    token_type: SlpTokenType,
    mint_field: &Bytes,
) -> Result<MintField, ParseError> {
    if token_type == SlpTokenType::MintVault {
        return Ok(MintField::VaultScripthash(
            ShaRmd160::from_le_slice(mint_field.as_ref()).map_err(|_| {
                ParseError::InvalidFieldSize {
                    field_name: "mint_vault_scripthash",
                    expected: &[20],
                    actual: mint_field.len(),
                }
            })?,
        ));
    }
    if !mint_field.is_empty() && mint_field.len() != 1 {
        return Err(ParseError::InvalidFieldSize {
            field_name: "mint_baton_out_idx",
            expected: &[0, 1],
            actual: mint_field.len(),
        });
    }
    if mint_field.len() == 1 && mint_field[0] < 2 {
        return Err(ParseError::InvalidMintBatonIdx(mint_field[0]));
    }
    Ok(MintField::BatonOutIdx(mint_field.first().cloned()))
}

impl MintField {
    fn mint_baton_out_idx(&self) -> Option<u8> {
        match *self {
            MintField::BatonOutIdx(out_idx) => out_idx,
            MintField::VaultScripthash(_) => None,
        }
    }

    fn mint_vault_scripthash(&self) -> Option<ShaRmd160> {
        match *self {
            MintField::BatonOutIdx(_) => None,
            MintField::VaultScripthash(hash) => Some(hash),
        }
    }
}
