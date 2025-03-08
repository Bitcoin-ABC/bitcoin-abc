// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::HashMap;
use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Arc;

use abc_rust_error::bail;
use async_trait::async_trait;
use bitcoinsuite_chronik_client::handler::{IpcHandler, IpcReader};
use bitcoinsuite_chronik_client::test_runner::{
    handle_test_info, spin_child_process,
};
use bitcoinsuite_chronik_client::{
    assert_status_code_eq, ChronikClient, ChronikClientError,
};
use bitcoinsuite_core::hash::Sha256d;
use bitcoinsuite_core::tx::TxId;
use bytes::Bytes;
use chronik_proto::proto::{self, Block};
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Default)]
struct BlocktxsAndTxAndRawtx {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
    pub txs_and_rawtxs: Mutex<HashMap<String, String>>,
}

pub fn handle_tx_and_rawtxs(
    message: &Value,
) -> Result<HashMap<String, String>, abc_rust_error::Report> {
    if let Some(map) = message.as_object() {
        let mut txs_map = HashMap::new();

        for (txid, raw_tx_value) in map {
            if let Some(raw_tx) = raw_tx_value.as_str() {
                txs_map.insert(txid.clone(), raw_tx.to_string());
            } else {
                eprintln!(
                    "Unexpected value type for txid {}: {:?}",
                    txid, raw_tx_value
                );
            }
        }

        Ok(txs_map)
    } else {
        bail!(
            "Expected an object in txs_and_rawtxs, but got: {:?}",
            message
        )
    }
}

pub async fn get_block_by_height(
    chronik_url: &str,
    block_height: i32,
) -> Result<Block, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.block_by_height(block_height).await
}

pub async fn get_block_txs_by_height(
    chronik_url: &str,
    height: i32,
    page: usize,
) -> Result<proto::TxHistoryPage, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.block_txs_by_height(height, page).await
}

pub async fn get_block_txs_by_height_with_page_size(
    chronik_url: &str,
    height: i32,
    page: usize,
    page_size: usize,
) -> Result<proto::TxHistoryPage, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client
        .block_txs_by_height_with_page_size(height, page, page_size)
        .await
}

pub async fn get_block_txs_by_hash(
    chronik_url: &str,
    block_hash: Vec<u8>,
    page: usize,
) -> Result<proto::TxHistoryPage, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;

    let tx_hash = TxId::try_from(block_hash.as_slice()).map_err(|_| {
        abc_rust_error::Report::msg("Invalid block hash length")
    })?;

    let sha256d_hash = Sha256d(tx_hash.to_bytes());

    client.block_txs_by_hash(&sha256d_hash, page).await
}

pub async fn get_tx(
    chronik_url: &str,
    txid: TxId,
) -> Result<proto::Tx, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;

    let sha256d_hash = Sha256d(txid.to_bytes());

    client.tx(&sha256d_hash).await
}

pub async fn get_raw_tx(
    chronik_url: &str,
    raw_txid: TxId,
) -> Result<Bytes, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;

    let sha256d_hash = Sha256d(raw_txid.to_bytes());

    client.raw_tx(&sha256d_hash).await
}

#[async_trait]
impl IpcReader for BlocktxsAndTxAndRawtx {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<(), abc_rust_error::Report> {
        const REGTEST_CHAIN_INIT_HEIGHT: i32 = 200;

        // Step 0: Receive the Chronik URL
        if let Some(test_info) = json_data.get("test_info") {
            *self.chronik_url.lock().await = handle_test_info(&test_info)
                .expect("Failed to extract chronik URL from test_info message");
        }
        // Receive test txs through IPC
        if let Some(test_txs_and_rawtxs) = json_data.get("txs_and_rawtxs") {
            *self.txs_and_rawtxs.lock().await =
                handle_tx_and_rawtxs(&test_txs_and_rawtxs)?;
        }

        if let Some(status) = json_data.get("status") {
            if let Some(ready) = status.as_str() {
                if ready == "ready" {
                    let chronik_url = (*self.chronik_url.lock().await).clone();
                    match self.counter.load(Ordering::SeqCst) {
                        // New regtest chain
                        0 | 1 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT,
                            )
                            .await?;

                            let block_txs_by_height = get_block_txs_by_height(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT,
                                0,
                            )
                            .await?;

                            let block_txs_by_hash = get_block_txs_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                                0,
                            )
                            .await?;

                            assert_eq!(block_txs_by_height, block_txs_by_hash);

                            // Verify the first tx is the coinbase tx
                            let coinbase_tx = &block_txs_by_height.txs[0];
                            assert_eq!(coinbase_tx.is_coinbase, true);

                            // A coinbase tx has timeFirstSeen of 0
                            assert_eq!(coinbase_tx.time_first_seen, 0);

                            // The txid for a Coinbase tx prevout is all 0s
                            assert_eq!(
                                coinbase_tx.inputs[0]
                                    .prev_out
                                    .as_ref()
                                    .unwrap()
                                    .txid,
                                vec![0u8; 32]
                            );

                            // The block key returned by chronik.tx matches the
                            // calling block
                            assert_eq!(
                                coinbase_tx.block.as_ref().unwrap().hash,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                            );

                            let tx = get_tx(
                                &chronik_url,
                                TxId::try_from(coinbase_tx.txid.as_slice())?,
                            )
                            .await?;

                            // It's the same as getting it from blockTxs
                            assert_eq!(*coinbase_tx, tx);

                            let raw_tx = get_raw_tx(
                                chronik_url.as_str(),
                                TxId::try_from(coinbase_tx.txid.as_slice())?,
                            )
                            .await?;
                            assert!(
                                !raw_tx.is_empty(),
                                "raw_tx should be a non-empty byte array"
                            );

                            let not_existant_txid: Vec<u8> = vec![0xFF; 32];

                            // Calling for a tx with an invalid txid throws
                            // expected error
                            let result = get_tx(
                                &chronik_url,
                                TxId::try_from(not_existant_txid.as_slice())?,
                            )
                            .await;

                            assert_status_code_eq!(result, 404);

                            // Calling for a rawTx with an invalid txid throws
                            // expected error
                            let result = get_raw_tx(
                                &chronik_url,
                                TxId::try_from(not_existant_txid.as_slice())?,
                            )
                            .await;

                            assert_status_code_eq!(result, 404);
                        }
                        // After some txs have been broadcast
                        2 => {
                            for (txid_str, expected_raw_tx_hex) in
                                self.txs_and_rawtxs.lock().await.iter()
                            {
                                let tx = get_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await
                                .unwrap();

                                assert!(
                                    tx.block.is_none(),
                                    "Expected block to be None (unconfirmed \
                                     tx)"
                                );

                                assert_eq!(
                                    TxId::try_from(tx.txid.as_slice())?,
                                    txid_str.parse::<TxId>()?
                                );
                                let raw_tx = get_raw_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await?;

                                let raw_tx_hex = hex::encode(&raw_tx[..]);

                                assert_eq!(raw_tx_hex, *expected_raw_tx_hex);
                            }
                        }
                        // After these txs are mined
                        3 => {
                            let block_from_height = get_block_by_height(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 1,
                            )
                            .await?;

                            assert_eq!(
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height,
                                REGTEST_CHAIN_INIT_HEIGHT + 1
                            );

                            for (txid_str, expected_raw_tx_hex) in
                                self.txs_and_rawtxs.lock().await.iter()
                            {
                                let tx = get_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await
                                .unwrap();

                                assert_eq!(
                                    tx.block.unwrap().height,
                                    block_from_height
                                        .block_info
                                        .as_ref()
                                        .unwrap()
                                        .height
                                );

                                assert_eq!(
                                    TxId::try_from(tx.txid.as_slice())?,
                                    txid_str.parse::<TxId>()?
                                );
                                let raw_tx = get_raw_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await?;

                                let raw_tx_hex = hex::encode(&raw_tx[..]);

                                assert_eq!(raw_tx_hex, *expected_raw_tx_hex);
                            }
                            // These txs are in the just-mined block
                            let mut block_txs_by_height =
                                get_block_txs_by_height(
                                    &chronik_url,
                                    block_from_height
                                        .block_info
                                        .as_ref()
                                        .unwrap()
                                        .height,
                                    0,
                                )
                                .await?;
                            // Now we have a coinbase tx and the broadcast txs

                            // The first tx is the coinbase tx
                            let coinbase_tx = block_txs_by_height.txs.remove(0);
                            assert_eq!(coinbase_tx.is_coinbase, true);

                            // And the other txs are the same as what the node
                            // broadcast
                            let expected_txids: Vec<String> = self
                                .txs_and_rawtxs
                                .lock()
                                .await
                                .keys()
                                .cloned()
                                .collect();

                            let block_txids: Vec<String> = block_txs_by_height
                                .txs
                                .iter()
                                .map(|tx| {
                                    let txid =
                                        TxId::try_from(tx.txid.as_slice())
                                            .unwrap();
                                    txid.to_string()
                                })
                                .collect();

                            // Make sure all expected txids are in the block
                            // txids
                            for expected_txid in &expected_txids {
                                assert!(
                                    block_txids.contains(expected_txid),
                                    "Expected txid {} not found in block \
                                     transactions",
                                    expected_txid
                                );
                            }

                            assert_eq!(
                                expected_txids.len(),
                                block_txids.len(),
                                "Expected {} transactions, but found {}",
                                expected_txids.len(),
                                block_txids.len()
                            );

                            let custom_page_size = 3;
                            let block_txs_from_custom_page_size =
                                get_block_txs_by_height_with_page_size(
                                    &chronik_url,
                                    block_from_height
                                        .block_info
                                        .as_ref()
                                        .unwrap()
                                        .height,
                                    0,
                                    custom_page_size,
                                )
                                .await?;
                            assert_eq!(
                                block_txs_from_custom_page_size.txs.len(),
                                custom_page_size
                            );
                            // This block should have 11 txs, coinbase + the 10
                            // broadcasted by the node
                            assert_eq!(
                                block_txs_from_custom_page_size.num_txs,
                                11
                            );

                            // We can get the last page. In this case, we expect
                            // length = 2 (11 % 3)

                            // Note, the first page is page 0
                            // The last page is numPages - 1
                            let last_page =
                                block_txs_from_custom_page_size.num_pages - 1;
                            let block_txs_last_page =
                                get_block_txs_by_height_with_page_size(
                                    &chronik_url,
                                    block_from_height
                                        .block_info
                                        .as_ref()
                                        .unwrap()
                                        .height,
                                    last_page.try_into().unwrap(),
                                    custom_page_size,
                                )
                                .await?;
                            assert_eq!(
                                block_txs_last_page.txs.len(),
                                11 % custom_page_size
                            );

                            // If we ask for a page number higher than numPages,
                            // we get an empty array at txs
                            let empty_page =
                                get_block_txs_by_height_with_page_size(
                                    &chronik_url,
                                    block_from_height
                                        .block_info
                                        .as_ref()
                                        .unwrap()
                                        .height,
                                    (last_page + 1).try_into().unwrap(),
                                    custom_page_size,
                                )
                                .await?;
                            assert_eq!(empty_page.txs.len(), 0);
                        }
                        // After this mined block has been parked
                        4 => {
                            // We can't get blockTxs for the now-parked block
                            let result = get_block_txs_by_height(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 1,
                                0,
                            )
                            .await;

                            assert_status_code_eq!(result, 404);

                            for (txid_str, expected_raw_tx_hex) in
                                self.txs_and_rawtxs.lock().await.iter()
                            {
                                let tx = get_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await
                                .unwrap();

                                assert_eq!(
                                    TxId::try_from(tx.txid.as_slice())?,
                                    txid_str.parse::<TxId>()?
                                );
                                // Txs are back in the mempool and no longer
                                // have a block key
                                assert!(tx.block.is_none());

                                let raw_tx = get_raw_tx(
                                    &chronik_url,
                                    txid_str.parse::<TxId>()?,
                                )
                                .await?;

                                let raw_tx_hex = hex::encode(&raw_tx[..]);

                                assert_eq!(raw_tx_hex, *expected_raw_tx_hex);
                            }
                        }
                        _ => {
                            handler.send_message("stop").await?;
                            unreachable!(
                                "An unexpected ready message was sent from the
                                 setup framework, causing the counter to
                                 increment beyond a valid match arm."
                            );
                        }
                    }
                    self.counter.fetch_add(1, Ordering::SeqCst);
                    handler.send_message("next").await?;
                    return Ok(());
                }
            }
        }
        Ok(())
    }
}

#[tokio::test]
pub async fn blocktxs_and_tx_and_rawtx() -> Result<(), abc_rust_error::Report> {
    let python_script = "blocktxs_and_tx_and_rawtx";

    let ipc_reader = Arc::new(BlocktxsAndTxAndRawtx::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
