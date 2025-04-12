// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc,
};

use async_trait::async_trait;
use bitcoinsuite_chronik_client::{
    handler::{IpcHandler, IpcReader},
    test_runner::{handle_test_info, spin_child_process},
    ChronikClient, WsEndpoint,
};
use bitcoinsuite_core::block::BlockHash;
use chronik_proto::proto::{
    ws_msg::MsgType, BlockMsgType::*, CoinbaseData, MsgBlock, TxOutput, WsMsg,
};
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Default)]
struct TestData {
    chronik_url: String,
    finalized_block_blockhash: String,
    finalized_height: i64,
    block_timestamp: i64,
    next_blockhash: String,
    endpoint: Option<WsEndpoint>,
    coinbase_out_scriptpubkey: String,
    coinbase_out_value: i64,
    coinbase_scriptsig: String,
}

#[derive(Default)]
struct WebsocketIPC {
    pub counter: AtomicI32,
    pub data: Mutex<TestData>,
}

#[async_trait]
impl IpcReader for WebsocketIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<(), abc_rust_error::Report> {
        let values_to_match: Vec<&str> = vec![
            "test_info",
            "finalized_block_blockhash",
            "finalized_height",
            "block_timestamp",
            "next_blockhash",
            "coinbase_out_scriptpubkey",
            "coinbase_out_value",
            "coinbase_scriptsig",
        ];

        // We use a mutable reference so we can call recv() on data.endpoint
        let mut data = self.data.lock().await;
        for key in values_to_match {
            if let Some(value) = json_data.get(key) {
                match key {
                    "test_info" => {
                        data.chronik_url = handle_test_info(value).expect(
                            "Failed to extract chronik URL from test_info \
                             message",
                        );
                    }
                    "finalized_block_blockhash" => {
                        if let Some(blockhash) = value.as_str() {
                            data.finalized_block_blockhash =
                                blockhash.to_string();
                        }
                    }
                    "finalized_height" => {
                        if let Some(height) = value.as_i64() {
                            data.finalized_height = height;
                        }
                    }
                    "block_timestamp" => {
                        if let Some(timestamp) = value.as_i64() {
                            data.block_timestamp = timestamp;
                        }
                    }
                    "next_blockhash" => {
                        if let Some(blockhash) = value.as_str() {
                            data.next_blockhash = blockhash.to_string();
                        }
                    }
                    "coinbase_out_scriptpubkey" => {
                        if let Some(coinbase_out_spk) = value.as_str() {
                            data.coinbase_out_scriptpubkey =
                                coinbase_out_spk.to_string();
                        }
                    }
                    "coinbase_out_value" => {
                        if let Some(coinbase_out_value) = value.as_i64() {
                            data.coinbase_out_value = coinbase_out_value;
                        }
                    }
                    "coinbase_scriptsig" => {
                        if let Some(coinbase_sig) = value.as_str() {
                            data.coinbase_scriptsig = coinbase_sig.to_string();
                        }
                    }
                    _ => {
                        println!("Unhandled key: {}", key);
                    }
                }
            }
        }

        if json_data.get("status").and_then(|status| status.as_str())
            == Some("ready")
        {
            match self.counter.load(Ordering::SeqCst) {
                // New regtest chain
                0 | 1 => {
                    let chronik_url = data.chronik_url.clone();
                    data.endpoint =
                        Some(ChronikClient::new(chronik_url)?.ws().await?);

                    if let Some(ep) = &mut data.endpoint {
                        ep.subscribe_to_blocks().await?;
                        assert_eq!(ep.subs.blocks, true);
                        ep.unsubscribe_from_blocks().await?;
                        assert_eq!(ep.subs.blocks, false);
                        ep.subscribe_to_blocks().await?;
                        assert_eq!(ep.subs.blocks, true);
                    }
                }
                // After a block is avalanche finalized
                2 => {
                    let finalized_block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        finalized_block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkFinalized.into(),
                                block_hash: data
                                    .finalized_block_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After some txs have been broadcast
                3 => {
                    // Part of the structure to keep count clean
                    // for future iterations. Tx testing will be
                    // conducted here.
                }
                // After a block is mined
                4 => {
                    let block_connected_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_connected_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkConnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After this block is finalized by Avalanche
                5 => {
                    let block_connected_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_connected_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkFinalized.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After this block is parked
                6 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkDisconnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: Some(CoinbaseData {
                                    coinbase_scriptsig: hex::decode(
                                        &data.coinbase_scriptsig
                                    )?,
                                    coinbase_outputs: vec![TxOutput {
                                        sats: data.coinbase_out_value,
                                        output_script: hex::decode(
                                            &data.coinbase_out_scriptpubkey
                                        )?,
                                        spent_by: None,
                                        token: None,
                                        plugins: Default::default()
                                    }]
                                })
                            }))
                        })
                    );
                }
                // After this block is unparked
                7 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkConnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After this block is invalidated
                8 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkDisconnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: Some(CoinbaseData {
                                    coinbase_scriptsig: hex::decode(
                                        &data.coinbase_scriptsig
                                    )?,
                                    coinbase_outputs: vec![TxOutput {
                                        sats: data.coinbase_out_value,
                                        output_script: hex::decode(
                                            &data.coinbase_out_scriptpubkey
                                        )?,
                                        spent_by: None,
                                        token: None,
                                        plugins: Default::default()
                                    }]
                                })
                            }))
                        })
                    );
                }
                // After this block is reconsidered
                9 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkConnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 1,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After a tx is broadcast with outputs of each type
                10 => {
                    // Part of the structure to keep count clean
                    // for future iterations. Tx testing will be
                    // conducted here.
                }
                // After a block is mined
                11 => {
                    let next_blockhash_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        next_blockhash_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkConnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 2,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: None,
                            }))
                        })
                    );
                }
                // After this block is avalanche parked
                12 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkDisconnected.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 2,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: Some(CoinbaseData {
                                    coinbase_scriptsig: hex::decode(
                                        &data.coinbase_scriptsig
                                    )?,
                                    coinbase_outputs: vec![TxOutput {
                                        sats: data.coinbase_out_value,
                                        output_script: hex::decode(
                                            &data.coinbase_out_scriptpubkey
                                        )?,
                                        spent_by: None,
                                        token: None,
                                        plugins: Default::default()
                                    }]
                                })
                            }))
                        })
                    );
                }
                // After this block is avalanche invalidated
                13 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Block(MsgBlock {
                                msg_type: BlkInvalidated.into(),
                                block_hash: data
                                    .next_blockhash
                                    .parse::<BlockHash>()?
                                    .to_vec(),
                                block_height: data.finalized_height as i32 + 2,
                                block_timestamp: data.block_timestamp,
                                coinbase_data: Some(CoinbaseData {
                                    coinbase_scriptsig: hex::decode(
                                        &data.coinbase_scriptsig
                                    )?,
                                    coinbase_outputs: vec![TxOutput {
                                        sats: data.coinbase_out_value,
                                        output_script: hex::decode(
                                            &data.coinbase_out_scriptpubkey
                                        )?,
                                        spent_by: None,
                                        token: None,
                                        plugins: Default::default()
                                    }]
                                })
                            }))
                        })
                    );
                    data.endpoint
                        .as_mut()
                        .unwrap()
                        .unsubscribe_from_blocks()
                        .await?;
                    assert_eq!(
                        data.endpoint.as_ref().unwrap().subs.blocks,
                        false
                    );
                }
                // After we have unsubscribed to all and another block is found
                14 => {}
                _ => {
                    handler.send_message("stop").await?;
                    unreachable!(
                        "An unexpected ready message was sent from the setup \
                         framework, causing the counter to increment beyond a \
                         valid match arm."
                    );
                }
            }
            self.counter.fetch_add(1, Ordering::SeqCst);
            handler.send_message("next").await?;
            return Ok(());
        }
        Ok(())
    }
}

#[tokio::test]
pub async fn websocket() -> Result<(), abc_rust_error::Report> {
    let python_script = "websocket";

    let ipc_reader = Arc::new(WebsocketIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
