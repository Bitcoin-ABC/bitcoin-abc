// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc, Mutex,
};

use abc_rust_error::Result;
use async_trait::async_trait;
use bitcoinsuite_chronik_client::{
    assert_status_code_eq,
    handler::{IpcHandler, IpcReader},
    test_runner::{handle_test_info, spin_child_process},
    ChronikClient, ChronikClientError,
};
use bitcoinsuite_core::{block::BlockHash, hash::Sha256d};
use chronik_proto::proto::{Block, BlockInfo};
use serde_json::Value;

#[derive(Default)]
struct BlockandBlocksIPC {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
}

#[async_trait]
impl IpcReader for BlockandBlocksIPC {
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
                        // Gives us the block and blocks
                        0 | 1 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT,
                            )
                            .await?;
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;
                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Gives us blocks
                            let last_three_blocks = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT - 2,
                                REGTEST_CHAIN_INIT_HEIGHT,
                            )
                            .await?;
                            let last_three_blocks_length =
                                last_three_blocks.len();
                            assert_eq!(last_three_blocks_length, 3);

                            // Expect the last block to equal the most recent
                            // one called with block
                            assert_eq!(
                                block_from_hash.block_info.unwrap(),
                                last_three_blocks[2]
                            );

                            // Expect last_three_blocks to be in order
                            for i in 0..last_three_blocks.len() - 1 {
                                let this_block = &last_three_blocks[i];
                                let next_block = &last_three_blocks[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }

                            // Throws expected error if we call blocks with
                            // startHeight > endHeight
                            let result = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT,
                                REGTEST_CHAIN_INIT_HEIGHT - 2,
                            )
                            .await;

                            assert_status_code_eq!(result, 400);
                        }

                        // Gives us the block at 10 higher
                        2 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;
                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Gives us blocks
                            let last_three_blocks = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 10 - 2,
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            let last_three_blocks_length =
                                last_three_blocks.len();
                            assert_eq!(last_three_blocks_length, 3);

                            // Expect the last block to equal the most recent
                            // one called with block
                            assert_eq!(
                                block_from_hash.block_info.unwrap(),
                                last_three_blocks[2]
                            );

                            // Expect last_three_blocks to be in order
                            for i in 0..last_three_blocks.len() - 1 {
                                let this_block = &last_three_blocks[i];
                                let next_block = &last_three_blocks[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }
                        }
                        // Gives us the block after parking the last block and
                        // throws expected error attempting to get parked block
                        3 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 9,
                            )
                            .await?;
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT + 9,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;
                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Throws expected error if asked to fetch the
                            // parked block
                            let result = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await;

                            assert_status_code_eq!(result, 404);

                            // blocks does not throw error if asked for parked
                            // block, but also does not return it
                            let latest_blocks_available = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 8,
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            let latest_blocks_available_length =
                                latest_blocks_available.len();
                            assert_eq!(latest_blocks_available_length, 2);

                            // Expect latest_blocks_available to be in order
                            for i in 0..latest_blocks_available_length - 1 {
                                let this_block = &latest_blocks_available[i];
                                let next_block =
                                    &latest_blocks_available[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }

                            // We get an empty array if we ask for an
                            // unavailable block
                            let latest_block_available_by_blocks =
                                get_blocks_in_range(
                                    &chronik_url,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                )
                                .await?;
                            assert_eq!(latest_block_available_by_blocks, []);
                        }
                        // Gives us the block and blocks after unparking the
                        // last block
                        4 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await
                            .unwrap();
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;

                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Blocks gets the unparked block now
                            let latest_blocks_available = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 8,
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;

                            let latest_blocks_available_length =
                                latest_blocks_available.len();
                            assert_eq!(latest_blocks_available_length, 3);

                            // Expect latest_blocks_available to be in order
                            for i in 0..latest_blocks_available_length - 1 {
                                let this_block = &latest_blocks_available[i];
                                let next_block =
                                    &latest_blocks_available[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }

                            // We get the now-unparked block
                            let latest_block_available_by_blocks =
                                get_blocks_in_range(
                                    &chronik_url,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                )
                                .await?;
                            assert_eq!(
                                vec![block_from_hash.block_info.unwrap()],
                                latest_block_available_by_blocks
                            );
                        }
                        // Gives us the block and blocks after invalidating the
                        // last block and throws
                        // expected error attempting to get
                        // invalidated block
                        5 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 9,
                            )
                            .await?;
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT + 9,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;
                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Throws expected error if asked to fetch the
                            // invalidated block
                            let result = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await;

                            assert_status_code_eq!(result, 404);

                            // blocks does not throw error if asked for
                            // invalidated block, but also does not return it
                            let latest_blocks_available = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 8,
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            let latest_blocks_available_length =
                                latest_blocks_available.len();
                            assert_eq!(latest_blocks_available_length, 2);

                            // Expect latest_blocks_available to be in order
                            for i in 0..latest_blocks_available_length - 1 {
                                let this_block = &latest_blocks_available[i];
                                let next_block =
                                    &latest_blocks_available[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }

                            // We get an empty array if we ask for an
                            // unavailable
                            // (invalidated) block
                            let latest_block_available_by_blocks =
                                get_blocks_in_range(
                                    &chronik_url,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                )
                                .await?;
                            assert_eq!(latest_block_available_by_blocks, []);
                        }
                        // Gives us the block and blocks after reconsiderblock
                        // called on the last block
                        6 => {
                            let block_from_height = get_block_by_height(
                                chronik_url.as_str(),
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            assert_eq!(
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .height
                            );

                            // Get the same block by calling hash instead of
                            // height
                            let block_from_hash = get_block_by_hash(
                                chronik_url.as_str(),
                                block_from_height
                                    .block_info
                                    .as_ref()
                                    .unwrap()
                                    .hash
                                    .clone(),
                            )
                            .await?;

                            // Verify it is the same
                            assert_eq!(block_from_hash, block_from_height);

                            // Blocks gets the reconsidered block now
                            let latest_blocks_available = get_blocks_in_range(
                                &chronik_url,
                                REGTEST_CHAIN_INIT_HEIGHT + 8,
                                REGTEST_CHAIN_INIT_HEIGHT + 10,
                            )
                            .await?;
                            let latest_blocks_available_length =
                                latest_blocks_available.len();
                            assert_eq!(latest_blocks_available_length, 3);

                            // Expect latest_blocks_available to be in order
                            for i in 0..latest_blocks_available_length - 1 {
                                let this_block = &latest_blocks_available[i];
                                let next_block =
                                    &latest_blocks_available[i + 1];
                                assert_eq!(
                                    this_block.hash,
                                    next_block.prev_hash
                                );
                                assert_eq!(
                                    this_block.height,
                                    next_block.height - 1
                                );
                            }

                            // We get the reconsidered block
                            let latest_block_available_by_blocks =
                                get_blocks_in_range(
                                    &chronik_url,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                    REGTEST_CHAIN_INIT_HEIGHT + 10,
                                )
                                .await?;
                            assert_eq!(
                                vec![block_from_hash.block_info.unwrap()],
                                latest_block_available_by_blocks
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
pub async fn block_and_blocks() -> Result<(), abc_rust_error::Report> {
    let python_script = "block_and_blocks";

    let ipc_reader = Arc::new(BlockandBlocksIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}

pub async fn get_block_by_height(
    chronik_url: &str,
    block_height: i32,
) -> Result<Block, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.block_by_height(block_height).await
}

pub async fn get_block_by_hash(
    chronik_url: &str,
    block_hash: Vec<u8>,
) -> Result<Block, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;

    // Convert Vec<u8> to BlockHash
    let block_hash =
        BlockHash::try_from(block_hash.as_slice()).map_err(|_| {
            abc_rust_error::Report::msg("Invalid block hash length")
        })?;

    // Convert BlockHash to Sha256d
    let sha256d_hash = Sha256d(block_hash.to_bytes());

    // Pass the Sha256d reference to the client
    client.block_by_hash(&sha256d_hash).await
}

pub async fn get_blocks_in_range(
    chronik_url: &str,
    start_height: i32,
    end_height: i32,
) -> Result<Vec<BlockInfo>, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.blocks(start_height, end_height).await
}
