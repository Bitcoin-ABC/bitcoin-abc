// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`handle_subscribe_socket`].

use std::{collections::HashMap, time::Duration};

use abc_rust_error::Result;
use axum::extract::ws::{self, WebSocket};
use bitcoinsuite_core::script::ScriptVariant;
use bitcoinsuite_slp::token_id::TokenId;
use chronik_indexer::{
    subs::{BlockMsg, BlockMsgType},
    subs_group::{TxMsg, TxMsgType},
};
use chronik_proto::proto;
use chronik_util::log_chronik;
use futures::future::select_all;
use prost::Message;
use thiserror::Error;
use tokio::sync::broadcast;

use crate::{
    error::report_status_error,
    parse::parse_script_variant,
    server::{ChronikIndexerRef, ChronikSettings},
};

/// Errors for [`ChronikServer`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikWsError {
    /// Unexpected [`ws::Message`] type.
    #[error("Unexpected message type {0}")]
    UnexpectedMessageType(&'static str),

    /// [`proto::WsSub`] must have the `sub_type` field set.
    #[error("400: Missing sub_type in WsSub message")]
    MissingSubType,
}

use self::ChronikWsError::*;

enum WsAction {
    Close,
    Sub(WsSub),
    Message(ws::Message),
    Nothing,
}

struct WsSub {
    is_unsub: bool,
    sub_type: WsSubType,
}

enum WsSubType {
    Blocks,
    Script(ScriptVariant),
    TokenId(TokenId),
}

type SubRecvBlocks = Option<broadcast::Receiver<BlockMsg>>;
type SubRecvScripts = HashMap<ScriptVariant, broadcast::Receiver<TxMsg>>;
type SubRecvTokenId = HashMap<TokenId, broadcast::Receiver<TxMsg>>;

struct SubRecv {
    blocks: SubRecvBlocks,
    scripts: SubRecvScripts,
    token_ids: SubRecvTokenId,
    ws_ping_interval: Duration,
}

impl SubRecv {
    async fn recv_action(&mut self) -> Result<WsAction> {
        tokio::select! {
            biased;
            action = Self::recv_blocks(&mut self.blocks) => action,
            action = Self::recv_scripts(&mut self.scripts) => action,
            action = Self::recv_token_ids(&mut self.token_ids) => action,
            action = Self::schedule_ping(self.ws_ping_interval) => action,
        }
    }

    async fn recv_blocks(blocks: &mut SubRecvBlocks) -> Result<WsAction> {
        match blocks {
            Some(blocks) => sub_block_msg_action(blocks.recv().await),
            None => futures::future::pending().await,
        }
    }

    #[allow(clippy::mutable_key_type)]
    async fn recv_scripts(scripts: &mut SubRecvScripts) -> Result<WsAction> {
        if scripts.is_empty() {
            futures::future::pending().await
        } else {
            let script_receivers = select_all(
                scripts
                    .values_mut()
                    .map(|receiver| Box::pin(receiver.recv())),
            );
            let (tx_msg, _, _) = script_receivers.await;
            sub_tx_msg_action(tx_msg)
        }
    }

    async fn recv_token_ids(
        token_ids: &mut SubRecvTokenId,
    ) -> Result<WsAction> {
        if token_ids.is_empty() {
            futures::future::pending().await
        } else {
            let token_ids_receivers = select_all(
                token_ids
                    .values_mut()
                    .map(|receiver| Box::pin(receiver.recv())),
            );
            let (tx_msg, _, _) = token_ids_receivers.await;
            sub_tx_msg_action(tx_msg)
        }
    }

    async fn schedule_ping(ws_ping_interval: Duration) -> Result<WsAction> {
        tokio::time::sleep(ws_ping_interval).await;
        let ping_payload = b"Bitcoin ABC Chronik Indexer".to_vec();
        Ok(WsAction::Message(ws::Message::Ping(ping_payload)))
    }

    async fn handle_sub(&mut self, sub: WsSub, indexer: &ChronikIndexerRef) {
        let indexer = indexer.read().await;
        let mut subs = indexer.subs().write().await;
        match sub.sub_type {
            WsSubType::Blocks => {
                if sub.is_unsub {
                    log_chronik!("WS unsubscribe from blocks\n");
                    self.blocks = None;
                } else {
                    log_chronik!("WS subscribe to blocks\n");
                    // Silently ignore multiple subs to blocks
                    if self.blocks.is_none() {
                        self.blocks = Some(subs.sub_to_block_msgs());
                    }
                }
            }
            WsSubType::Script(script_variant) => {
                let script = script_variant.to_script();
                if sub.is_unsub {
                    log_chronik!("WS unsubscribe from {}\n", script_variant);
                    std::mem::drop(self.scripts.remove(&script_variant));
                    subs.subs_script_mut().unsubscribe_from_member(&&script)
                } else {
                    log_chronik!("WS subscribe to {}\n", script_variant);
                    let recv =
                        subs.subs_script_mut().subscribe_to_member(&&script);
                    self.scripts.insert(script_variant, recv);
                }
            }
            WsSubType::TokenId(token_id) => {
                if sub.is_unsub {
                    log_chronik!("WS unsubscribe from token ID {token_id}\n");
                    std::mem::drop(self.token_ids.remove(&token_id));
                    subs.subs_token_id_mut().unsubscribe_from_member(&token_id)
                } else {
                    log_chronik!("WS subscribe to token ID {token_id}\n");
                    let recv =
                        subs.subs_token_id_mut().subscribe_to_member(&token_id);
                    self.token_ids.insert(token_id, recv);
                }
            }
        }
    }

    async fn cleanup(self, indexer: &ChronikIndexerRef) {
        if self.scripts.is_empty() {
            return;
        }
        let indexer = indexer.read().await;
        let mut subs = indexer.subs().write().await;
        for (script_variant, receiver) in self.scripts {
            std::mem::drop(receiver);
            subs.subs_script_mut()
                .unsubscribe_from_member(&&script_variant.to_script());
        }
    }
}

fn sub_client_msg_action(
    client_msg: Option<Result<ws::Message, axum::Error>>,
) -> Result<WsAction> {
    let client_msg = match client_msg {
        Some(client_msg) => client_msg,
        None => return Ok(WsAction::Close),
    };
    match client_msg {
        Ok(ws::Message::Binary(data)) => {
            use proto::ws_sub::SubType;
            let sub = proto::WsSub::decode(data.as_slice())?;
            Ok(WsAction::Sub(WsSub {
                is_unsub: sub.is_unsub,
                sub_type: match sub.sub_type {
                    None => return Err(MissingSubType.into()),
                    Some(SubType::Blocks(_)) => WsSubType::Blocks,
                    Some(SubType::Script(script)) => {
                        WsSubType::Script(parse_script_variant(
                            &script.script_type,
                            &script.payload,
                        )?)
                    }
                    Some(SubType::TokenId(token_id)) => WsSubType::TokenId(
                        token_id.token_id.parse::<TokenId>()?,
                    ),
                },
            }))
        }
        Ok(ws::Message::Text(_)) => Err(UnexpectedMessageType("Text").into()),
        Ok(ws::Message::Ping(ping)) => {
            Ok(WsAction::Message(ws::Message::Pong(ping)))
        }
        Ok(ws::Message::Pong(_pong)) => Ok(WsAction::Nothing),
        Ok(ws::Message::Close(_)) | Err(_) => Ok(WsAction::Close),
    }
}

fn sub_block_msg_action(
    block_msg: Result<BlockMsg, broadcast::error::RecvError>,
) -> Result<WsAction> {
    use proto::{ws_msg::MsgType, BlockMsgType::*};
    let Ok(block_msg) = block_msg else {
        return Ok(WsAction::Nothing);
    };
    let block_msg_type = match block_msg.msg_type {
        BlockMsgType::Connected => BlkConnected,
        BlockMsgType::Disconnected => BlkDisconnected,
        BlockMsgType::Finalized => BlkFinalized,
    };
    let msg_type = Some(MsgType::Block(proto::MsgBlock {
        msg_type: block_msg_type as _,
        block_hash: block_msg.hash.to_vec(),
        block_height: block_msg.height,
    }));
    let msg_proto = proto::WsMsg { msg_type };
    let msg = ws::Message::Binary(msg_proto.encode_to_vec());
    Ok(WsAction::Message(msg))
}

fn sub_tx_msg_action(
    tx_msg: Result<TxMsg, broadcast::error::RecvError>,
) -> Result<WsAction> {
    use proto::{ws_msg::MsgType, TxMsgType::*};
    let tx_msg = match tx_msg {
        Ok(tx_msg) => tx_msg,
        Err(_) => return Ok(WsAction::Nothing),
    };
    let tx_msg_type = match tx_msg.msg_type {
        TxMsgType::AddedToMempool => TxAddedToMempool,
        TxMsgType::RemovedFromMempool => TxRemovedFromMempool,
        TxMsgType::Confirmed => TxConfirmed,
        TxMsgType::Finalized => TxFinalized,
    };
    let msg_type = Some(MsgType::Tx(proto::MsgTx {
        msg_type: tx_msg_type as _,
        txid: tx_msg.txid.to_vec(),
    }));
    let msg_proto = proto::WsMsg { msg_type };
    let msg = ws::Message::Binary(msg_proto.encode_to_vec());
    Ok(WsAction::Message(msg))
}

/// Future for a WS connection, which will run indefinitely until the WS will be
/// closed.
pub async fn handle_subscribe_socket(
    mut socket: WebSocket,
    indexer: ChronikIndexerRef,
    settings: ChronikSettings,
) {
    let mut recv = SubRecv {
        blocks: Default::default(),
        scripts: Default::default(),
        token_ids: Default::default(),
        ws_ping_interval: settings.ws_ping_interval,
    };
    let mut last_msg = None;

    loop {
        let sub_action = tokio::select! {
            client_msg = socket.recv() => sub_client_msg_action(client_msg),
            action = recv.recv_action() => action,
        };

        let subscribe_action = match sub_action {
            // Deduplicate identical consecutive msgs
            Ok(WsAction::Message(ws::Message::Binary(msg))) => {
                if last_msg.as_ref() == Some(&msg) {
                    WsAction::Nothing
                } else {
                    last_msg = Some(msg.clone());
                    WsAction::Message(ws::Message::Binary(msg))
                }
            }
            Ok(subscribe_action) => subscribe_action,
            // Turn Err into Message and reply
            Err(report) => {
                let (_, error_proto) = report_status_error(report);
                WsAction::Message(ws::Message::Binary(
                    error_proto.encode_to_vec(),
                ))
            }
        };

        match subscribe_action {
            WsAction::Close => {
                recv.cleanup(&indexer).await;
                return;
            }
            WsAction::Sub(sub) => recv.handle_sub(sub, &indexer).await,
            WsAction::Message(msg) => match socket.send(msg).await {
                Ok(()) => {}
                Err(_) => return,
            },
            WsAction::Nothing => {}
        }
    }
}
