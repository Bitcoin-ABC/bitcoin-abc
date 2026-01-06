// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc,
};

use async_trait::async_trait;
use bitcoinsuite_chronik_client::ScriptType;
use bitcoinsuite_chronik_client::{
    handler::{IpcHandler, IpcReader},
    test_runner::{handle_test_info, spin_child_process},
    ChronikClient, WsEndpoint,
};
use bitcoinsuite_core::{address::CashAddress, block::BlockHash, tx::TxId};
use chronik_proto::proto::{
    ws_msg::MsgType, BlockMsgType::*, CoinbaseData, MsgBlock, MsgTx,
    TxFinalizationReason, TxFinalizationReasonType, TxMsgType, TxOutput, WsMsg,
    WsSubScript,
};
use serde_json::Value;
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

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
    p2pkh_address: String,
    p2sh_address: String,
    p2pk_script: String,
    other_script: String,
    p2pkh_txid: String,
    p2sh_txid: String,
    p2pk_txid: String,
    other_txid: String,
    mixed_output_txid: String,
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
            "p2pkh_address",
            "p2sh_address",
            "p2pk_script",
            "other_script",
            "p2pkh_txid",
            "p2sh_txid",
            "p2pk_txid",
            "other_txid",
            "mixed_output_txid",
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
                    "p2pkh_address" => {
                        if let Some(address) = value.as_str() {
                            data.p2pkh_address = address.to_string();
                        }
                    }
                    "p2sh_address" => {
                        if let Some(address) = value.as_str() {
                            data.p2sh_address = address.to_string();
                        }
                    }
                    "p2pk_script" => {
                        if let Some(script) = value.as_str() {
                            data.p2pk_script = script.to_string();
                        }
                    }
                    "other_script" => {
                        if let Some(script) = value.as_str() {
                            data.other_script = script.to_string();
                        }
                    }
                    "p2pkh_txid" => {
                        if let Some(txid) = value.as_str() {
                            data.p2pkh_txid = txid.to_string();
                        }
                    }
                    "p2sh_txid" => {
                        if let Some(txid) = value.as_str() {
                            data.p2sh_txid = txid.to_string();
                        }
                    }
                    "p2pk_txid" => {
                        if let Some(txid) = value.as_str() {
                            data.p2pk_txid = txid.to_string();
                        }
                    }
                    "other_txid" => {
                        if let Some(txid) = value.as_str() {
                            data.other_txid = txid.to_string();
                        }
                    }
                    "mixed_output_txid" => {
                        if let Some(txid) = value.as_str() {
                            data.mixed_output_txid = txid.to_string();
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
                0 => {
                    self.counter.fetch_add(1, Ordering::SeqCst);
                    handler.send_message("next").await?;
                    return Ok(());
                }
                1 => {
                    let chronik_url = data.chronik_url.clone();
                    data.endpoint = Some(
                        ChronikClient::new(vec![chronik_url])?.ws().await?,
                    );

                    let p2pkh_addr =
                        data.p2pkh_address.parse::<CashAddress>()?;
                    let p2pkh_hash = p2pkh_addr.hash();
                    let p2sh_addr = data.p2sh_address.parse::<CashAddress>()?;
                    let p2sh_hash = p2sh_addr.hash();
                    let p2pk_script = &data.p2pk_script;
                    let other_script = &data.other_script;

                    let subscriptions: Vec<WsSubScript> = vec![
                        WsSubScript {
                            script_type: ScriptType::P2pkh.to_string(),
                            payload: p2pkh_hash.as_ref().to_vec(),
                        },
                        WsSubScript {
                            script_type: ScriptType::P2sh.to_string(),
                            payload: p2sh_hash.as_ref().to_vec(),
                        },
                        WsSubScript {
                            script_type: ScriptType::P2pk.to_string(),
                            payload: hex::decode(p2pk_script)?,
                        },
                        WsSubScript {
                            script_type: ScriptType::Other.to_string(),
                            payload: hex::decode(other_script)?,
                        },
                    ];

                    if let Some(ep) = &mut data.endpoint {
                        for sub in &subscriptions {
                            ep.subscribe_to_script(
                                sub.script_type.clone(),
                                sub.payload.clone(),
                            )
                            .await?;
                        }
                        assert_eq!(ep.subs.scripts, subscriptions);

                        // Try to unsubscribe from a script we were never
                        // subscribed to
                        let non_existent_script = WsSubScript {
                            script_type: ScriptType::P2pkh.to_string(),
                            payload: vec![0x11; 20], // P2PKH requires 20 bytes
                        };
                        let err = ep
                            .unsubscribe_from_script(
                                non_existent_script.script_type,
                                non_existent_script.payload,
                            )
                            .await
                            .unwrap_err();
                        assert!(err.to_string().contains("No existing sub at"));
                        // Verify subscriptions haven't changed
                        assert_eq!(ep.subs.scripts, subscriptions);

                        // Try to unsubscribe with an invalid script type
                        let err = ep
                            .unsubscribe_from_script(
                                "not a type".to_string(),
                                "who knows".as_bytes().to_vec(),
                            )
                            .await
                            .unwrap_err();
                        assert!(err.to_string().contains(
                            "No existing sub at not a type, who knows"
                        ));
                        // Verify subscriptions haven't changed
                        assert_eq!(ep.subs.scripts, subscriptions);

                        // Test removing subscriptions one by one
                        let mut remaining_subscriptions = subscriptions.clone();
                        for _ in 0..subscriptions.len() {
                            let unsub = remaining_subscriptions.remove(0);
                            ep.unsubscribe_from_script(
                                unsub.script_type.clone(),
                                unsub.payload.clone(),
                            )
                            .await?;

                            assert_eq!(
                                ep.subs.scripts,
                                remaining_subscriptions
                            );
                        }

                        ep.subscribe_to_address(p2pkh_addr.clone()).await?;
                        ep.subscribe_to_address(p2sh_addr.clone()).await?;

                        assert_eq!(
                            ep.subs.scripts,
                            vec![
                                WsSubScript {
                                    script_type: ScriptType::P2pkh.to_string(),
                                    payload: p2pkh_hash.as_ref().to_vec(),
                                },
                                WsSubScript {
                                    script_type: ScriptType::P2sh.to_string(),
                                    payload: p2sh_hash.as_ref().to_vec(),
                                },
                            ]
                        );

                        ep.unsubscribe_from_address(p2pkh_addr.clone()).await?;
                        ep.unsubscribe_from_address(p2sh_addr.clone()).await?;

                        ep.subscribe_to_blocks().await?;
                        assert_eq!(ep.subs.blocks, true);

                        ep.unsubscribe_from_blocks().await?;
                        assert_eq!(ep.subs.blocks, false);

                        // Test invalid script type
                        let result = ep
                            .subscribe_to_script(
                                "notavalidtype".to_string(),
                                b"deadbeefe".to_vec(),
                            )
                            .await;
                        assert!(result.is_err());
                        assert!(result
                            .unwrap_err()
                            .to_string()
                            .contains("Invalid scriptType"));

                        for sub in &subscriptions {
                            ep.subscribe_to_script(
                                sub.script_type.clone(),
                                sub.payload.clone(),
                            )
                            .await?;
                        }

                        ep.unsubscribe_from_script(
                            ScriptType::P2pkh.to_string(),
                            p2pkh_hash.as_ref().to_vec(),
                        )
                        .await?;
                        ep.subscribe_to_address(p2pkh_addr).await?;

                        ep.subscribe_to_blocks().await?;
                        assert_eq!(ep.subs.blocks, true);
                    }
                }

                // After a block is avalanche finalized
                2 => {
                    let block_message =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_message,
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
                    let mut expected_msgs: Vec<
                        Option<chronik_proto::proto::WsMsg>,
                    > = vec![];
                    for _ in 0..4 {
                        expected_msgs.push(
                            data.endpoint
                                .as_mut()
                                .unwrap()
                                .recv()
                                .await
                                .unwrap(),
                        );
                    }

                    assert_eq!(
                        expected_msgs[0],
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .p2pkh_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );

                    assert_eq!(
                        expected_msgs[1],
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .p2sh_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );

                    assert_eq!(
                        expected_msgs[2],
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .p2pk_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );

                    assert_eq!(
                        expected_msgs[3],
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .other_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );
                }

                // After a block is mined
                4 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    // The order of confirmed and finalized txs from multiple
                    // script subscriptions is indeterminate
                    // See https://reviews.bitcoinabc.org/D15452
                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_tx_confirmed_msgs = Vec::new();
                    for txid in txids {
                        expected_tx_confirmed_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxConfirmed.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                ..Default::default()
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_tx_confirmed_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After this block is finalized by Avalanche
                5 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    // The order of confirmed and finalized txs from multiple
                    // script subscriptions is indeterminate
                    // See https://reviews.bitcoinabc.org/D15452
                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_tx_confirmed_msgs = Vec::new();
                    for txid in txids {
                        use TxFinalizationReasonType::*;
                        expected_tx_confirmed_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxFinalized.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                finalization_reason: Some(
                                    TxFinalizationReason {
                                        finalization_type:
                                            TxFinalizationReasonPostConsensus
                                                as _,
                                    },
                                ),
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_tx_confirmed_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After this block is parked
                6 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_msgs = Vec::new();
                    for txid in txids {
                        expected_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                ..Default::default()
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After this block is unparked
                7 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    // The order of confirmed and finalized txs from multiple
                    // script subscriptions is indeterminate
                    // See https://reviews.bitcoinabc.org/D15452
                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_msgs = Vec::new();
                    for txid in txids {
                        expected_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxConfirmed.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                ..Default::default()
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After this block is invalidated
                8 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_msgs = Vec::new();
                    for txid in txids {
                        expected_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                ..Default::default()
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After this block is reconsidered
                9 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    // The order of confirmed and finalized txs from multiple
                    // script subscriptions is indeterminate
                    // See https://reviews.bitcoinabc.org/D15452
                    let txids = [
                        &data.p2pkh_txid,
                        &data.p2sh_txid,
                        &data.p2pk_txid,
                        &data.other_txid,
                    ];
                    let mut expected_msgs = Vec::new();
                    for txid in txids {
                        expected_msgs.push(Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxConfirmed.into(),
                                txid: txid.parse::<TxId>()?.to_bytes().to_vec(),
                                ..Default::default()
                            })),
                        }));
                    }

                    // Receive 4 messages from script subscriptions
                    let mut received_msgs = Vec::new();
                    for _ in 0..4 {
                        received_msgs.push(
                            data.endpoint.as_mut().unwrap().recv().await?,
                        );
                    }

                    // Verify all expected messages are in received messages
                    // (order doesn't matter)
                    for expected_msg in &expected_msgs {
                        assert!(
                            received_msgs.iter().any(|msg| msg == expected_msg),
                            "Expected message not found: {:?}",
                            expected_msg
                        );
                    }
                }

                // After a tx is broadcast with outputs of each type
                10 => {
                    let mixed_output_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        mixed_output_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .mixed_output_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );
                }

                // After a block is mined
                11 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    let tx_msg = data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        tx_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxConfirmed.into(),
                                txid: data
                                    .mixed_output_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );
                }

                // After this block is avalanche parked
                12 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    let tx_msg = data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        tx_msg,
                        Some(WsMsg {
                            msg_type: Some(MsgType::Tx(MsgTx {
                                msg_type: TxMsgType::TxAddedToMempool.into(),
                                txid: data
                                    .mixed_output_txid
                                    .parse::<TxId>()?
                                    .to_bytes()
                                    .to_vec(),
                                ..Default::default()
                            }))
                        })
                    );
                }

                // After this block is avalanche invalidated
                13 => {
                    let block_msg =
                        data.endpoint.as_mut().unwrap().recv().await?;
                    assert_eq!(
                        block_msg,
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

                    let p2pkh_addr =
                        data.p2pkh_address.parse::<CashAddress>()?;
                    let p2pkh_hash = p2pkh_addr.hash();
                    let p2sh_addr = data.p2sh_address.parse::<CashAddress>()?;
                    let p2sh_hash = p2sh_addr.hash();
                    let p2pk_script = &data.p2pk_script;
                    let other_script = &data.other_script;

                    let subscriptions: Vec<WsSubScript> = vec![
                        WsSubScript {
                            script_type: ScriptType::P2pkh.to_string(),
                            payload: p2pkh_hash.as_ref().to_vec(),
                        },
                        WsSubScript {
                            script_type: ScriptType::P2sh.to_string(),
                            payload: p2sh_hash.as_ref().to_vec(),
                        },
                        WsSubScript {
                            script_type: ScriptType::P2pk.to_string(),
                            payload: hex::decode(p2pk_script)?,
                        },
                        WsSubScript {
                            script_type: ScriptType::Other.to_string(),
                            payload: hex::decode(other_script)?,
                        },
                    ];

                    if let Some(ep) = &mut data.endpoint {
                        // Unsubscribe from everything to show you do not get
                        // any more msgs if another block is found
                        ep.unsubscribe_from_blocks().await?;
                        for sub in &subscriptions {
                            ep.unsubscribe_from_script(
                                sub.script_type.clone(),
                                sub.payload.clone(),
                            )
                            .await?;
                        }
                        // The ws object is updated to reflect no subscriptions
                        assert_eq!(ep.subs.scripts, Vec::new());
                        // The ws object is updated to reflect no block
                        // subscription
                        assert_eq!(ep.subs.blocks, false);
                    }
                }

                // After we have unsubscribed to all and another block is found
                14 => {
                    let timeout_result = timeout(
                        Duration::from_secs(1),
                        data.endpoint.as_mut().unwrap().recv(),
                    )
                    .await;
                    assert!(
                        timeout_result.is_err(),
                        "Expected timeout but received a message"
                    );
                }

                15..=19 => {
                    // TODO: Implement rest of the test
                }

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
