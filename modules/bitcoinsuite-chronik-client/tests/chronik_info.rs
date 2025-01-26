// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{Arc, Mutex};

use abc_rust_error::Result;
use async_trait::async_trait;
use bitcoinsuite_chronik_client::handler::{IpcHandler, IpcReader};
use bitcoinsuite_chronik_client::test_runner::{
    handle_test_info, spin_child_process,
};
use bitcoinsuite_chronik_client::ChronikClient;
use serde_json::Value;

#[derive(Default)]
struct ChronikInfoIPC {
    pub expected_version: Mutex<String>,
    pub returned_version: Mutex<String>,
}

#[async_trait]
impl IpcReader for ChronikInfoIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<()> {
        // Step 0: receive the chronik url and retrieve the chronik version
        if let Some(test_info) = json_data.get("test_info") {
            let chronik_url = handle_test_info(&test_info)
                .expect("Failed to extract chronik URL from test_info message");

            let client = match ChronikClient::new(chronik_url.to_string()) {
                Ok(client) => client,
                Err(e) => return Err(e),
            };

            let version = match client.chronik_info().await {
                Ok(info) => info.version,
                Err(e) => return Err(e),
            };

            *self.returned_version.lock().unwrap() = version;

            if let Err(e) = handler.send_message("next").await {
                return Err(e.into());
            }
        }

        // Step 1: receive the version sent by the setup framework
        if let Some(chronik) = json_data.get("chronik_version") {
            if let Some(chronik_str) = chronik.as_str() {
                *self.expected_version.lock().unwrap() = chronik_str.into();

                assert_eq!(
                    *self.returned_version.lock().unwrap(),
                    *self.expected_version.lock().unwrap()
                );
            }

            if let Err(e) = handler.send_message("stop").await {
                return Err(e.into());
            }
        }

        Ok(())
    }
}

pub async fn chronik_info_ipc() -> Result<()> {
    let python_script = "chronik_info";

    let ipc_reader = Arc::new(ChronikInfoIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}

#[tokio::test]
pub async fn test_chronik_version() -> Result<(), abc_rust_error::Report> {
    chronik_info_ipc().await?;
    Ok(())
}
