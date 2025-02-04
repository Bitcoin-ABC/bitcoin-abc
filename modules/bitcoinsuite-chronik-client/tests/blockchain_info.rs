// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::atomic::AtomicI32;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use bitcoinsuite_chronik_client::handler::{IpcHandler, IpcReader};
use bitcoinsuite_chronik_client::test_runner::{
    handle_test_info, spin_child_process,
};
use bitcoinsuite_chronik_client::ChronikClient;
use chronik_proto::proto::BlockchainInfo;
use serde_json::Value;

#[derive(Default)]
struct BlockchaininfoIPC {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
}

pub async fn get_blockchain_info(
    chronik_url: String,
) -> Result<BlockchainInfo, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.blockchain_info().await
}

#[async_trait]
impl IpcReader for BlockchaininfoIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<(), abc_rust_error::Report> {
        const REGTEST_CHAIN_INIT_HEIGHT: i32 = 200;

        // Step 0: Receive the Chronik URL
        if let Some(test_info) = json_data.get("test_info") {
            *self.chronik_url.lock().unwrap() = handle_test_info(&test_info)
                .expect("Failed to extract chronik URL from test_info message");
        }

        if let Some(status) = json_data.get("status") {
            if let Some(ready) = status.as_str() {
                if ready == "ready" {
                    let chronik_url =
                        (*self.chronik_url.lock().unwrap()).clone();
                    match self.counter.load(Ordering::SeqCst) {
                        0 | 1 => {
                            // Retrieve and validate blockchain info
                            let blockchain_info =
                                get_blockchain_info(chronik_url).await?;
                            let tip_hash_hex =
                                hex::encode(blockchain_info.tip_hash);
                            assert_eq!(tip_hash_hex.len(), 64,);
                            assert_eq!(
                                blockchain_info.tip_height,
                                REGTEST_CHAIN_INIT_HEIGHT,
                            );
                        }
                        2 => {
                            // Give us the blockchain info with 10 more blocks
                            let blockchain_info =
                                get_blockchain_info(chronik_url).await?;
                            let tip_hash_hex =
                                hex::encode(blockchain_info.tip_hash);
                            assert_eq!(tip_hash_hex.len(), 64,);
                            assert_eq!(
                                blockchain_info.tip_height,
                                REGTEST_CHAIN_INIT_HEIGHT + 10
                            );
                        }
                        3 => {
                            // Give us the blockchain info with again 10 more
                            // blocks
                            let blockchain_info =
                                get_blockchain_info(chronik_url).await?;
                            let tip_hash_hex =
                                hex::encode(blockchain_info.tip_hash);
                            assert_eq!(tip_hash_hex.len(), 64);
                            assert_eq!(
                                blockchain_info.tip_height,
                                REGTEST_CHAIN_INIT_HEIGHT + 20
                            );
                        }
                        4 => {
                            // Give us the blockchain info after parking the
                            // last block
                            let blockchain_info =
                                get_blockchain_info(chronik_url).await?;
                            let tip_hash_hex =
                                hex::encode(blockchain_info.tip_hash);
                            assert_eq!(tip_hash_hex.len(), 64);
                            assert_eq!(
                                blockchain_info.tip_height,
                                REGTEST_CHAIN_INIT_HEIGHT + 19
                            );
                        }
                        5 => {
                            // Give us the blockchain info after unparking the
                            // last block
                            let blockchain_info =
                                get_blockchain_info(chronik_url).await?;
                            let tip_hash_hex =
                                hex::encode(blockchain_info.tip_hash);
                            assert_eq!(tip_hash_hex.len(), 64);
                            assert_eq!(
                                blockchain_info.tip_height,
                                REGTEST_CHAIN_INIT_HEIGHT + 20
                            );
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
pub async fn blockchain_info() -> Result<(), abc_rust_error::Report> {
    let python_script = "blockchain_info";

    let ipc_reader = Arc::new(BlockchaininfoIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
