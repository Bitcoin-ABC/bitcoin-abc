// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::{opcode::*, Op, Script},
    tx::{Tx, TxId},
};
use bytes::Bytes;

use crate::{
    alp::consts::ALP_LOKAD_ID,
    consts::{BURN, GENESIS, MINT, SEND},
    parsed::{ParsedData, ParsedTxType},
    slp::{
        burn::parse_burn_data,
        consts::{
            SLP_LOKAD_ID, TOKEN_TYPE_V1, TOKEN_TYPE_V1_NFT1_CHILD,
            TOKEN_TYPE_V1_NFT1_GROUP, TOKEN_TYPE_V2,
        },
        genesis::parse_genesis_data,
        mint::parse_mint_data_baton,
        mint_vault::parse_mint_data_mint_vault,
        send::parse_send_data,
        ParseError::{self, *},
    },
    structs::TokenMeta,
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};

/// Parse the tx as SLP
pub fn parse_tx(tx: &Tx) -> Result<Option<ParsedData>, ParseError> {
    if tx.outputs.is_empty() {
        return Ok(None);
    }
    parse(tx.txid_ref(), &tx.outputs[0].script)
}

/// Parse the OP_RETURN script as SLP. The txid is used to assign GENESIS token
/// IDs.
pub fn parse(
    txid: &TxId,
    script: &Script,
) -> Result<Option<ParsedData>, ParseError> {
    match parse_with_ignored_err(txid, script) {
        Ok(parsed) => Ok(Some(parsed)),
        Err(err) if should_ignore_err(&err) => Ok(None),
        Err(err) => Err(err),
    }
}

/// Parse the OP_RETURN script as SLP like [`parse`], but return an error
/// instead of [`None`]` if the script doesn't look like SLP at all.
///
/// Exposed for testing.
pub fn parse_with_ignored_err(
    txid: &TxId,
    script: &Script,
) -> Result<ParsedData, ParseError> {
    parse_lokad_id(script)?;
    let ops = script.iter_ops().collect::<Result<Vec<_>, _>>()?;
    let opreturn_data = parse_opreturn_ops(ops.into_iter())?;
    if opreturn_data.len() < 3 {
        return Err(TooFewPushes {
            actual: opreturn_data.len(),
            expected: 3,
        });
    }
    if opreturn_data[1].len() != 1 {
        return Err(InvalidTokenType(opreturn_data[1].clone()));
    }
    // Short circuit for unknown/unsupported token types
    let token_type = parse_token_type(&opreturn_data[1]);
    if let SlpTokenType::Unknown(_) = token_type {
        return Ok(ParsedData {
            meta: TokenMeta {
                token_id: TokenId::new(TxId::from([0; 32])),
                token_type: TokenType::Slp(token_type),
            },
            tx_type: ParsedTxType::Unknown,
        });
    }

    match opreturn_data[2].as_ref() {
        GENESIS => parse_genesis_data(*txid, token_type, opreturn_data),
        MINT if token_type == SlpTokenType::MintVault => {
            parse_mint_data_mint_vault(opreturn_data)
        }
        MINT => parse_mint_data_baton(token_type, opreturn_data),
        SEND => parse_send_data(token_type, opreturn_data),
        BURN => parse_burn_data(token_type, opreturn_data),
        _ => Err(InvalidTxType(opreturn_data[2].clone())),
    }
}

fn parse_opreturn_ops(
    ops: impl Iterator<Item = Op>,
) -> Result<Vec<Bytes>, ParseError> {
    let mut pushes = Vec::new();
    for (op_idx, op) in ops.into_iter().enumerate() {
        // first opcode must be OP_RETURN
        match (op_idx, &op) {
            (0, Op::Code(OP_RETURN)) => continue,
            (0, &Op::Code(opcode)) | (0, &Op::Push(opcode, _)) => {
                return Err(MissingOpReturn(opcode))
            }
            _ => {}
        }
        match op {
            Op::Code(opcode @ OP_0)
            | Op::Code(opcode @ Opcode(OP_1NEGATE::N..=OP_16::N)) => {
                return Err(DisallowedPush { op_idx, opcode });
            }
            Op::Code(opcode) => {
                return Err(NonPushOp { op_idx, opcode });
            }
            Op::Push(opcode, push) => {
                if opcode == OP_0 || opcode.number() > OP_PUSHDATA4::N {
                    return Err(DisallowedPush { op_idx, opcode });
                }
                pushes.push(push);
            }
        }
    }
    Ok(pushes)
}

fn parse_lokad_id(script: &Script) -> Result<(), ParseError> {
    let mut ops_iter = script.iter_ops();
    match ops_iter.next() {
        Some(Ok(Op::Code(OP_RETURN))) => {}
        Some(_) => return Err(MissingOpReturn(Opcode(script.bytecode()[0]))),
        None => return Err(EmptyScript),
    }
    match ops_iter.next() {
        Some(Ok(Op::Push(_, lokad_id))) => {
            if lokad_id.starts_with(&ALP_LOKAD_ID) {
                return Err(InvalidAlpLokadId);
            }
            if lokad_id.as_ref() != SLP_LOKAD_ID {
                return Err(WrongLokadId(lokad_id.clone()));
            }
        }
        Some(_) => {
            return Err(InvalidLokadIdOpcode(Opcode(script.bytecode()[1])));
        }
        None => return Err(MissingLokadId),
    }
    Ok(())
}

fn parse_token_type(bytes: &Bytes) -> SlpTokenType {
    // Token type bytes must match exactly; so [0, 1] would be considered
    // "unknown".
    //
    // Note that this differs from the original SLP spec (which allows e.g.
    // [0, 1] as Fungible), but both main implementations (bcash and Chronik)
    // accidentally implemented it incorrectly by only allowing 1 byte here,
    // therefore we stick with these stricter rules. This is reflected in the
    // badger-cash repo we use as reference for our SLP implementation.
    if bytes.as_ref() == [TOKEN_TYPE_V1] {
        SlpTokenType::Fungible
    } else if bytes.as_ref() == [TOKEN_TYPE_V2] {
        SlpTokenType::MintVault
    } else if bytes.as_ref() == [TOKEN_TYPE_V1_NFT1_GROUP] {
        SlpTokenType::Nft1Group
    } else if bytes.as_ref() == [TOKEN_TYPE_V1_NFT1_CHILD] {
        SlpTokenType::Nft1Child
    } else {
        SlpTokenType::Unknown(bytes[0])
    }
}

/// Whether this parse error doesn't look like SLP at all and should be
/// treated as an unrelated protocol.
fn should_ignore_err(err: &ParseError) -> bool {
    matches!(
        err,
        EmptyScript
            | MissingOpReturn(_)
            | MissingLokadId
            | InvalidLokadIdOpcode(_)
            | WrongLokadId(_)
    )
}
