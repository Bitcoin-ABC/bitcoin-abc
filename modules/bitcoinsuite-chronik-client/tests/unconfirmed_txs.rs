// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc,
};

use abc_rust_error::bail;
use async_trait::async_trait;
use bitcoinsuite_chronik_client::{
    handler::{IpcHandler, IpcReader},
    test_runner::{handle_test_info, spin_child_process},
    ChronikClient,
};
use bitcoinsuite_core::tx::TxId;
use chronik_proto::proto::{BlockchainInfo, TxHistoryPage};
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Default)]
struct UnconfirmedTxsIPC {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
    pub mempool_txids: Mutex<Vec<String>>,
    pub mempool_time_first_seen: Mutex<Vec<u64>>,
    pub remaining_txids: Mutex<Vec<String>>,
    pub remaining_time_first_seen: Mutex<Vec<u64>>,
}

fn handle_array_txids(
    message: &Value,
    field: &str,
) -> Result<Vec<String>, abc_rust_error::Report> {
    if let Some(txids) = message.as_array() {
        return Ok(txids
            .iter()
            .filter_map(|txid_value| txid_value.as_str().map(|s| s.to_string()))
            .collect());
    } else {
        bail!("Expected an array in {field}, but got: {:?}", message)
    }
}

fn handle_array_time_first_seen(
    message: &Value,
    field: &str,
) -> Result<Vec<u64>, abc_rust_error::Report> {
    if let Some(times_first_seen) = message.as_array() {
        return Ok(times_first_seen
            .iter()
            .filter_map(|time_first_seen| time_first_seen.as_u64())
            .collect());
    } else {
        bail!("Expected an array in {field}, but got: {:?}", message)
    }
}

async fn get_blockchain_info(
    chronik_url: &String,
) -> Result<BlockchainInfo, abc_rust_error::Report> {
    let client = ChronikClient::new(vec![chronik_url.to_string()])?;
    client.blockchain_info().await
}

async fn get_unconfirmed_txs(
    chronik_url: &String,
) -> Result<TxHistoryPage, abc_rust_error::Report> {
    let client = ChronikClient::new(vec![chronik_url.to_string()])?;
    client.unconfirmed_txs().await
}

async fn check_expected_txs(
    chronik_url: &String,
    expected_txids: &Vec<String>,
    expected_time_first_seen: &Vec<u64>,
) -> Result<(), abc_rust_error::Report> {
    let unconfirmed_txs = get_unconfirmed_txs(&chronik_url).await?;

    assert_eq!(unconfirmed_txs.txs.len(), expected_txids.len());
    // It's always a single page at this point (no real
    // pagination yet)
    assert_eq!(unconfirmed_txs.num_pages, 1);
    assert_eq!(unconfirmed_txs.num_txs, expected_txids.len() as u32);

    let mut prev_time_first_seen = 0u64;
    let mut prev_txid = "00".repeat(32).to_string().parse::<TxId>().unwrap();
    for (i, tx) in unconfirmed_txs.txs.iter().enumerate() {
        // Check the txid is in our list and the time
        // first seen matches
        let current_txid = TxId::try_from(tx.txid.as_slice()).unwrap();
        let index = expected_txids
            .clone()
            .into_iter()
            .position(|txid| txid == current_txid.to_string())
            .expect(&format!(
                "Txid {} from unconfirmed txs not found in expected mempool \
                 txids",
                current_txid
            ));
        let current_time_first_seen = tx.time_first_seen as u64;
        assert_eq!(
            current_time_first_seen, expected_time_first_seen[index],
            "Time first seen at index {i} does not match"
        );

        // Check sorting
        assert!(
            current_time_first_seen >= prev_time_first_seen,
            "Unconfirmed txs are not sorted by time_first_seen ascending at \
             index {i}: current_time_first_seen = {}, prev_time_first_seen = \
             {}",
            current_time_first_seen,
            prev_time_first_seen
        );
        if current_time_first_seen == prev_time_first_seen {
            assert!(
                current_txid > prev_txid,
                "Unconfirmed txs with same time_first_seen are not sorted by \
                 txid ascending at index {i}: current_txid = {}, prev_txid = \
                 {}",
                current_txid,
                prev_txid
            );
        }
        prev_time_first_seen = current_time_first_seen;
        prev_txid = current_txid;
    }

    Ok(())
}

#[async_trait]
impl IpcReader for UnconfirmedTxsIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<(), abc_rust_error::Report> {
        // IPC data handling
        if let Some(test_info) = json_data.get("test_info") {
            *self.chronik_url.lock().await = handle_test_info(&test_info)
                .expect("Failed to extract chronik URL from test_info message");
        }
        if let Some(mempool_txids) = json_data.get("mempool_txids") {
            *self.mempool_txids.lock().await =
                handle_array_txids(&mempool_txids, "mempool_txids")?;
        }
        if let Some(mempool_time_first_seen) =
            json_data.get("mempool_time_first_seen")
        {
            *self.mempool_time_first_seen.lock().await =
                handle_array_time_first_seen(
                    &mempool_time_first_seen,
                    "mempool_time_first_seen",
                )?;
        }
        if let Some(remaining_txids) = json_data.get("remaining_txids") {
            *self.remaining_txids.lock().await =
                handle_array_txids(&remaining_txids, "remaining_txids")?;
        }
        if let Some(remaining_time_first_seen) =
            json_data.get("remaining_time_first_seen")
        {
            *self.remaining_time_first_seen.lock().await =
                handle_array_time_first_seen(
                    &remaining_time_first_seen,
                    "remaining_time_first_seen",
                )?;
        }

        if let Some(status) = json_data.get("status") {
            if let Some(ready) = status.as_str() {
                if ready == "ready" {
                    let chronik_url = (*self.chronik_url.lock().await).clone();
                    match self.counter.load(Ordering::SeqCst) {
                        // No mempool tx yet
                        0 | 1 => {
                            let blockchain_info =
                                get_blockchain_info(&chronik_url).await?;
                            assert_eq!(blockchain_info.tip_height, 0);

                            let unconfirmed_txs =
                                get_unconfirmed_txs(&chronik_url).await?;
                            assert!(unconfirmed_txs.txs.is_empty());
                        }
                        2 => {
                            let mempool_txids = self.mempool_txids.lock().await;
                            let mempool_time_first_seen =
                                self.mempool_time_first_seen.lock().await;

                            check_expected_txs(
                                &chronik_url,
                                &mempool_txids,
                                &mempool_time_first_seen,
                            )
                            .await?;
                        }
                        3 => {
                            let remaining_txids =
                                self.remaining_txids.lock().await;
                            let remaining_time_first_seen =
                                self.remaining_time_first_seen.lock().await;

                            check_expected_txs(
                                &chronik_url,
                                &remaining_txids,
                                &remaining_time_first_seen,
                            )
                            .await?;
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
pub async fn unconfirmed_txs() -> Result<(), abc_rust_error::Report> {
    let python_script = "unconfirmed_txs";

    let ipc_reader = Arc::new(UnconfirmedTxsIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
