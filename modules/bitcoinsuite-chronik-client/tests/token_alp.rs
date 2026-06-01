// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc,
};

use abc_rust_error::Result;
use async_trait::async_trait;
use bitcoinsuite_chronik_client::handler::{IpcHandler, IpcReader};
use bitcoinsuite_chronik_client::test_runner::{
    handle_test_info, spin_child_process,
};
use bitcoinsuite_chronik_client::ChronikClient;
use bitcoinsuite_core::tx::TxId;
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Default)]
struct TokenAlpIPC {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
    pub alp_genesis_txid: Mutex<String>,
    pub alp_mint_txid: Mutex<String>,
    pub alp_send_txid: Mutex<String>,
    pub alp_genesis2_txid: Mutex<String>,
    pub alp_multi_txid: Mutex<String>,
    pub alp_mega_txid: Mutex<String>,
    pub alp_mint_two_txid: Mutex<String>,
    pub alp_nonutf8_genesis_txid: Mutex<String>,
}

async fn check_expected_history(
    chronik_url: String,
    token_id: String,
    mut expected_txids: Vec<String>,
) -> Result<(), abc_rust_error::Report> {
    let chronik = ChronikClient::new(vec![chronik_url])?;
    let history = chronik.token_history(&token_id, 0, 100).await?;

    assert_eq!(history.txs.len(), expected_txids.len());
    assert_eq!(history.num_pages, 1);
    assert_eq!(history.num_txs, expected_txids.len() as u32);

    // All tx have the same time_first_seen, so they are sorted by txid
    expected_txids.sort();
    expected_txids.reverse();
    for (i, expected_txid) in expected_txids.iter().enumerate() {
        let txid = TxId::try_from(history.txs[i].txid.as_slice()).unwrap();
        assert_eq!(txid.to_string(), expected_txid.to_string());
    }

    Ok(())
}

#[async_trait]
impl IpcReader for TokenAlpIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<()> {
        // IPC data handling
        let values_to_match: Vec<&str> = vec![
            "test_info",
            "alp_genesis_txid",
            "alp_mint_txid",
            "alp_send_txid",
            "alp_genesis2_txid",
            "alp_multi_txid",
        ];

        for key in values_to_match {
            if let Some(value) = json_data.get(key) {
                match key {
                    "test_info" => {
                        *self.chronik_url.lock().await =
                            handle_test_info(value).expect(
                                "Failed to extract chronik URL from test_info
                                 message",
                            );
                    }
                    "alp_genesis_txid" => {
                        if let Some(raw_tx) = value.as_str() {
                            *self.alp_genesis_txid.lock().await =
                                raw_tx.to_string();
                        }
                    }
                    "alp_mint_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_mint_txid.lock().await = txid.to_string();
                        }
                    }
                    "alp_send_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_send_txid.lock().await = txid.to_string();
                        }
                    }
                    "alp_genesis2_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_genesis2_txid.lock().await =
                                txid.to_string();
                        }
                    }
                    "alp_multi_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_multi_txid.lock().await =
                                txid.to_string();
                        }
                    }
                    "alp_mega_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_mega_txid.lock().await = txid.to_string();
                        }
                    }
                    "alp_mint_two_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_mint_two_txid.lock().await =
                                txid.to_string();
                        }
                    }
                    "alp_nonutf8_genesis_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_nonutf8_genesis_txid.lock().await =
                                txid.to_string();
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
            let chronik_url = (*self.chronik_url.lock().await).clone();
            match self.counter.load(Ordering::SeqCst) {
                0 => {}
                1 => {
                    let alp_genesis_txid = self.alp_genesis_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis_txid.to_string(),
                        vec![alp_genesis_txid.to_string()],
                    )
                    .await?;
                }
                2 => {
                    let alp_genesis_txid = self.alp_genesis_txid.lock().await;
                    let alp_mint_txid = self.alp_mint_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis_txid.to_string(),
                        vec![
                            alp_genesis_txid.to_string(),
                            alp_mint_txid.to_string(),
                        ],
                    )
                    .await?;
                }
                3 => {
                    let alp_genesis_txid = self.alp_genesis_txid.lock().await;
                    let alp_mint_txid = self.alp_mint_txid.lock().await;
                    let alp_send_txid = self.alp_send_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis_txid.to_string(),
                        vec![
                            alp_genesis_txid.to_string(),
                            alp_mint_txid.to_string(),
                            alp_send_txid.to_string(),
                        ],
                    )
                    .await?;
                }
                4 => {
                    let alp_genesis2_txid = self.alp_genesis2_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis2_txid.to_string(),
                        vec![alp_genesis2_txid.to_string()],
                    )
                    .await?;
                }
                5 => {
                    let alp_genesis_txid = self.alp_genesis_txid.lock().await;
                    let alp_mint_txid = self.alp_mint_txid.lock().await;
                    let alp_send_txid = self.alp_send_txid.lock().await;
                    let alp_multi_txid = self.alp_multi_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis_txid.to_string(),
                        vec![
                            alp_genesis_txid.to_string(),
                            alp_mint_txid.to_string(),
                            alp_send_txid.to_string(),
                            alp_multi_txid.to_string(),
                        ],
                    )
                    .await?;

                    let alp_genesis2_txid = self.alp_genesis2_txid.lock().await;
                    check_expected_history(
                        chronik_url.to_string(),
                        alp_genesis2_txid.to_string(),
                        vec![
                            alp_genesis2_txid.to_string(),
                            alp_multi_txid.to_string(),
                        ],
                    )
                    .await?;
                }
                6 | 7 | 8 => {
                    // TODO implement more token endpoints and handle more steps
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

        Ok(())
    }
}

#[tokio::test]
pub async fn token_alp() -> Result<()> {
    let python_script = "token_alp";

    let ipc_reader = Arc::new(TokenAlpIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
