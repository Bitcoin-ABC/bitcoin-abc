// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`handle_subscribe_socket`].

use abc_rust_error::Result;
use axum::extract::ws::{self, WebSocket};
use chronik_indexer::subs::{BlockMsg, BlockMsgType};
use chronik_proto::proto;
use prost::Message;
use thiserror::Error;
use tokio::sync::broadcast;

use crate::{error::report_status_error, server::ChronikIndexerRef};

/// Errors for [`ChronikServer`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikWsError {
    /// Unexpected [`ws::Message`] type.
    #[error("Unexpected message type {0}")]
    UnexpectedMessageType(&'static str),
}

use self::ChronikWsError::*;

enum WsAction {
    Close,
    Message(ws::Message),
    Nothing,
}

fn sub_client_msg_action(
    client_msg: Option<Result<ws::Message, axum::Error>>,
) -> Result<WsAction> {
    let client_msg = match client_msg {
        Some(client_msg) => client_msg,
        None => return Ok(WsAction::Close),
    };
    match client_msg {
        Ok(ws::Message::Binary(_)) => Ok(WsAction::Nothing),
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
    let Ok(block_msg) = block_msg else { return Ok(WsAction::Nothing) };
    let block_msg_type = match block_msg.msg_type {
        BlockMsgType::Connected => Connected,
        BlockMsgType::Disconnected => Disconnected,
        BlockMsgType::Finalized => Finalized,
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

/// Future for a WS connection, which will run indefinitely until the WS will be
/// closed.
pub async fn handle_subscribe_socket(
    mut socket: WebSocket,
    indexer: ChronikIndexerRef,
) {
    let mut revc_blocks = {
        let indexer = indexer.read().await;
        let subs = indexer.subs().read().await;
        subs.sub_to_block_msgs()
    };

    loop {
        let sub_action = tokio::select! {
            client_msg = socket.recv() => sub_client_msg_action(client_msg),
            block_msg = revc_blocks.recv() => sub_block_msg_action(block_msg),
        };

        let subscribe_action = match sub_action {
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
            WsAction::Close => return,
            WsAction::Message(msg) => match socket.send(msg).await {
                Ok(()) => {}
                Err(_) => return,
            },
            WsAction::Nothing => {}
        }
    }
}
