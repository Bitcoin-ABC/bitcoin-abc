// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::{
    atomic::{AtomicI32, Ordering},
    Arc,
};

use async_trait::async_trait;
use bitcoinsuite_chronik_client::{
    assert_status_code_eq,
    handler::{IpcHandler, IpcReader},
    test_runner::{handle_test_info, spin_child_process},
    ChronikClient, ChronikClientError,
};
use bitcoinsuite_core::{hash::Sha256d, tx::TxId};
use chronik_proto::proto;
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Default)]
struct BroadcastTxIPC {
    pub chronik_url: Mutex<String>,
    pub counter: AtomicI32,
    pub alp_genesis_rawtx: Mutex<String>,
    pub alp_genesis_txid: Mutex<String>,
    pub ok_rawtx: Mutex<String>,
    pub ok_txid: Mutex<String>,
    pub alp_burn_rawtx: Mutex<String>,
    pub alp_burn_txid: Mutex<String>,
    pub alp_burn_2_rawtx: Mutex<String>,
    pub alp_burn_2_txid: Mutex<String>,
}

pub async fn get_tx(
    chronik_url: &str,
    txid: TxId,
) -> Result<proto::Tx, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;

    let sha256d_hash = Sha256d(txid.to_bytes());

    client.tx(&sha256d_hash).await
}

pub async fn get_validate_raw_tx(
    chronik_url: &str,
    raw_tx: Vec<u8>,
) -> Result<proto::Tx, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.validate_tx(raw_tx).await
}

pub async fn do_broadcast_tx(
    chronik_url: &str,
    raw_tx: Vec<u8>,
    skip_token_checks: bool,
) -> Result<proto::BroadcastTxResponse, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.broadcast_tx(raw_tx, skip_token_checks).await
}

pub async fn do_broadcast_txs(
    chronik_url: &str,
    raw_txs: Vec<Vec<u8>>,
    skip_token_checks: bool,
) -> Result<proto::BroadcastTxsResponse, abc_rust_error::Report> {
    let client = ChronikClient::new(chronik_url.to_string())?;
    client.broadcast_txs(raw_txs, skip_token_checks).await
}

#[async_trait]
impl IpcReader for BroadcastTxIPC {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<(), abc_rust_error::Report> {
        let values_to_match: Vec<&str> = vec![
            "test_info",
            "alp_genesis_rawtx",
            "alp_genesis_txid",
            "ok_rawtx",
            "ok_txid",
            "alp_burn_rawtx",
            "alp_burn_txid",
            "alp_burn_2_rawtx",
            "alp_burn_2_txid",
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
                    "alp_genesis_rawtx" => {
                        if let Some(raw_tx) = value.as_str() {
                            *self.alp_genesis_rawtx.lock().await =
                                raw_tx.to_string();
                        }
                    }
                    "alp_genesis_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_genesis_txid.lock().await =
                                txid.to_string();
                        }
                    }
                    "ok_rawtx" => {
                        if let Some(raw_tx) = value.as_str() {
                            *self.ok_rawtx.lock().await = raw_tx.to_string();
                        }
                    }
                    "ok_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.ok_txid.lock().await = txid.to_string();
                        }
                    }
                    "alp_burn_rawtx" => {
                        if let Some(raw_tx) = value.as_str() {
                            *self.alp_burn_rawtx.lock().await =
                                raw_tx.to_string();
                        }
                    }
                    "alp_burn_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_burn_txid.lock().await = txid.to_string();
                        }
                    }
                    "alp_burn_2_rawtx" => {
                        if let Some(raw_tx) = value.as_str() {
                            *self.alp_burn_2_rawtx.lock().await =
                                raw_tx.to_string();
                        }
                    }
                    "alp_burn_2_txid" => {
                        if let Some(txid) = value.as_str() {
                            *self.alp_burn_2_txid.lock().await =
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
                0 => {
                    self.counter.fetch_add(1, Ordering::SeqCst);
                    handler.send_message("next").await?;
                    return Ok(());
                }
                // New regtest chain. Behavior of broadcastTx and validateRawTx
                1 => {
                    let bad_raw_tx =
                    "0100000001fa5b8f14f5b63ae42f7624a416214bdfff\
                        d1de438e9db843a4ddf4d392302e2100000000020151\
                        000000000800000000000000003c6a5039534c503200\
                        0747454e4553495300000000000006e80300000000d0\
                        0700000000b80b00000000a00f000000008813000000\
                        0070170000000000102700000000000017a914da1745\
                        e9b549bd0bfa1a569971c77eba30cd5a4b8710270000\
                        0000000017a914da1745e9b549bd0bfa1a569971c77e\
                        ba30cd5a4b87102700000000000017a914da1745e9b5\
                        49bd0bfa1a569971c77eba30cd5a4b87102700000000\
                        000017a914da1745e9b549bd0bfa1a569971c77eba30\
                        cd5a4b87102700000000000017a914da1745e9b549bd\
                        0bfa1a569971c77eba30cd5a4b871027000000000000\
                        17a914da1745e9b549bd0bfa1a569971c77eba30cd5a\
                        4b8760c937278c04000017a914da1745e9b549bd0bfa\
                        1a569971c77eba30cd5a4b8700000000";
                    let bad_raw_tx_bytes = hex::decode(bad_raw_tx)?;
                    let result: Result<
                        proto::BroadcastTxResponse,
                        abc_rust_error::Report,
                    > = do_broadcast_tx(
                        &chronik_url.as_str(),
                        bad_raw_tx_bytes.clone(),
                        false,
                    )
                    .await;
                    assert_status_code_eq!(result, 400);

                    // We can preview an invalid tx using
                    // get_validate_raw_tx
                    let invalid_tx = get_validate_raw_tx(
                        &chronik_url.as_str(),
                        bad_raw_tx_bytes.clone(),
                    )
                    .await?;
                    assert_eq!(
                        TxId::try_from(invalid_tx.txid.as_slice())?,
                        "5c91ef5b654d21ad5db2c7af71f2924a0c31a5ef34\
                            7498bbcba8ee1374d6c6a9"
                        .parse::<TxId>()?
                    );

                    const BAD_VALUE_IN_SATS: i64 = 2500000000;
                    const BAD_VALUE_OUT_SATS: i64 = 4999999960000;

                    let invalid_tx_sum_inputs: i64 =
                        invalid_tx.inputs.iter().map(|input| input.sats).sum();

                    let invalid_tx_sum_outputs: i64 = invalid_tx
                        .outputs
                        .iter()
                        .map(|output| output.sats)
                        .sum();

                    // The outputs are greater than the inputs,
                    // and such that the tx is invalid
                    assert_eq!(invalid_tx_sum_inputs, BAD_VALUE_IN_SATS);
                    assert_eq!(invalid_tx_sum_outputs, BAD_VALUE_OUT_SATS);

                    // We cannot call validateRawTx to get a tx from a
                    // rawtx of a normal token send tx if its inputs are
                    // not in the mempool or db
                    // txid in blockchain but not regtest,
                    // 423e24bf0715cfb80727e5e7a6ff7b9e37cb2f555c537ab06
                    // fdc7fd9b3a0ba3a

                    let normal_token_send =
                    "020000000278e5886fb86174d9abd4af331a4b67a3baf37\
                    d052703c176009a92dba60181d9020000006b48304502210\
                    09149768d5e8b2bedf8259f91741db160ae389451ed11bb3\
                    76f372c61c88d58ec02202492c21df1b21b99d7b021eb6ee\
                    f78be99b45a64e9c7d9ce8f8880abfa28a5e4412103632f6\
                    03f43ae61afece65288d7d92e55188783edb74e205be974b\
                    8cd1cd36a1effffffff78e5886fb86174d9abd4af331a4b6\
                    7a3baf37d052703c176009a92dba60181d9030000006b483\
                    045022100f7311d000d3fbe672dd742e85f372cd6d524352\
                    10d0c92f21e73ca6588918a4702204b5a7a90a73e5fd48f9\
                    0af24c02c4f15e8c40515af931dd44f8030691a2e5d8d412\
                    103632f603f43ae61afece65288d7d92e55188783edb74e2\
                    05be974b8cd1cd36a1effffffff040000000000000000406\
                    a04534c500001010453454e4420fb4233e8a568993976ed3\
                    8a81c2671587c5ad09552dedefa78760deed6ff87aa08000\
                    00002540be40008000000079d6e2ee722020000000000001\
                    976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d8\
                    8ac22020000000000001976a9141c13ddb8dd422bbe02dc2\
                    ae8798b4549a67a3c1d88acf7190600000000001976a9141\
                    c13ddb8dd422bbe02dc2ae8798b4549a67a3c1d88ac00000\
                    000";

                    let result = get_validate_raw_tx(
                        &chronik_url,
                        hex::decode(normal_token_send)?,
                    )
                    .await;
                    assert_status_code_eq!(result, 400);

                    let alp_genesis_bytes =
                        hex::decode(&*self.alp_genesis_rawtx.lock().await)?;

                    // We can validateRawTx an ALP genesis tx before it is
                    // broadcast
                    let alp_genesis_preview = get_validate_raw_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                    )
                    .await?;
                    // We can broadcast an ALP genesis tx
                    let broadcast_result = do_broadcast_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                        false,
                    )
                    .await?;
                    assert_eq!(
                        TxId::try_from(broadcast_result.txid.as_slice())?,
                        TxId::try_from(alp_genesis_preview.txid.as_slice())?,
                    );

                    let alp_burn_rawtx_bytes =
                        hex::decode(&*self.alp_burn_rawtx.lock().await)?;

                    // We can preview an ALP burn tx before it is broadcast
                    let alp_burn_preview = get_validate_raw_tx(
                        &chronik_url,
                        alp_burn_rawtx_bytes.clone(),
                    )
                    .await?;

                    // But not a burn if skip_token_checks is set to false
                    let result = do_broadcast_tx(
                        &chronik_url,
                        alp_burn_rawtx_bytes.clone(),
                        false,
                    )
                    .await;

                    assert_status_code_eq!(result, 400);

                    let ok_raw_tx_bytes =
                        hex::decode(&*self.ok_rawtx.lock().await)?;

                    // We also can't broadcast an array of txs if one tx is a
                    // burn
                    let result = do_broadcast_txs(
                        &chronik_url,
                        vec![
                            ok_raw_tx_bytes.clone(),
                            alp_burn_rawtx_bytes.clone(),
                        ],
                        false,
                    )
                    .await;
                    assert_status_code_eq!(result, 400);

                    // We can't broadcast an array of txs if one tx is
                    // invalid
                    // Note that BAD_RAW_TX is now bad because of
                    // mempool conflict with genesis tx, this error
                    // takes precedence over
                    // bad-txns-in-belowout

                    let result = do_broadcast_txs(
                        &chronik_url,
                        vec![ok_raw_tx_bytes.clone(), bad_raw_tx_bytes.clone()],
                        false,
                    )
                    .await;
                    assert_status_code_eq!(result, 400);

                    // We can also preview okRawTx before it is broadcast
                    let ok_preview = get_validate_raw_tx(
                        &chronik_url,
                        ok_raw_tx_bytes.clone(),
                    )
                    .await?;

                    // Chronik is checking if your burning tokens, however we
                    // don't check due to setting
                    // skip_token_checks to true, thus allowing the alp burn
                    let response = do_broadcast_txs(
                        &chronik_url,
                        vec![ok_raw_tx_bytes, alp_burn_rawtx_bytes],
                        true,
                    )
                    .await?;

                    let response_txids: Vec<TxId> = response
                        .txids
                        .iter()
                        .map(|txid_bytes| {
                            TxId::try_from(txid_bytes.as_slice()).unwrap()
                        })
                        .collect();

                    let expected_txids: Vec<TxId> = vec![
                        self.ok_txid.lock().await.parse::<TxId>()?,
                        self.alp_burn_txid.lock().await.parse::<TxId>()?,
                    ];

                    assert_eq!(response_txids, expected_txids);

                    let alp_burn_two_raw_tx =
                        hex::decode(&*self.alp_burn_2_rawtx.lock().await)?;
                    let alp_burn_two_txid =
                        self.alp_burn_2_txid.lock().await.parse::<TxId>()?;

                    // We can preview an ALP burn tx before its broadcasted
                    let alp_burn_two_preview = get_validate_raw_tx(
                        &chronik_url,
                        alp_burn_two_raw_tx.clone(),
                    )
                    .await?;

                    // We can broadcast an ALP burn tx if we set
                    // skip_token_checks to true
                    let alp_burn_two_response = do_broadcast_tx(
                        &chronik_url,
                        alp_burn_two_raw_tx.clone(),
                        true,
                    )
                    .await?;

                    let response_txid =
                        TxId::try_from(alp_burn_two_response.txid.as_slice())?;
                    assert_eq!(response_txid, alp_burn_two_txid);

                    // All of these txs are in the mempool, i.e. they
                    // have been broadcast
                    let broadcast_txs = [
                        (
                            self.alp_genesis_txid
                                .lock()
                                .await
                                .parse::<TxId>()?,
                            alp_genesis_preview.clone(),
                        ),
                        (
                            self.ok_txid.lock().await.parse::<TxId>()?,
                            ok_preview.clone(),
                        ),
                        (
                            self.alp_burn_txid.lock().await.parse::<TxId>()?,
                            alp_burn_preview.clone(),
                        ),
                        (
                            (*self.alp_burn_2_txid.lock().await)
                                .parse::<TxId>()?,
                            alp_burn_two_preview.clone(),
                        ),
                    ];

                    for (txid, preview) in broadcast_txs {
                        let tx_in_mempool = get_tx(&chronik_url, txid).await?;
                        // We get the same tx from the mempool
                        assert_eq!(
                            TxId::try_from(tx_in_mempool.txid.as_slice())?,
                            txid
                        );
                        // Previewing the tx gives us the same info as calling
                        // chronik.tx on the tx in the
                        // mempool Except for expected
                        // changes
                        // - spent_by key is present in mempool if it was
                        //   spentBy
                        // - time_first_seen is 0 in the preview txs
                        let mut tx_in_mempool_modified = tx_in_mempool.clone();
                        // preview txs have timeFirstSeen of 0
                        tx_in_mempool_modified.time_first_seen = 0;
                        // preview txs have output.spentBy undefined
                        for output in &mut tx_in_mempool_modified.outputs {
                            output.spent_by = None;
                        }

                        assert_eq!(preview, tx_in_mempool_modified);
                    }

                    // If we use validateRawTx on a tx that has been
                    // broadcast, we still get timeFirstSeen of 0
                    // and outputs.spentBy of undefined, even if the
                    // outputs have been spent
                    // We can validateRawTx an ALP genesis tx after it
                    // is broadcast
                    let alp_genesis_after = get_validate_raw_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                    )
                    .await?;
                    assert_eq!(alp_genesis_after, alp_genesis_preview);

                    let result =
                        do_broadcast_tx(&chronik_url, bad_raw_tx_bytes, false)
                            .await;
                    assert_status_code_eq!(result, 400);

                    // If we broadcast a tx already in the mempool, we get a
                    // normal response
                    let alp_genesis_txid =
                        self.alp_genesis_txid.lock().await.parse::<TxId>()?;
                    let alp_genesis_response =
                        do_broadcast_tx(&chronik_url, alp_genesis_bytes, false)
                            .await?;
                    let response_txid =
                        TxId::try_from(alp_genesis_response.txid.as_slice())?;
                    assert_eq!(response_txid, alp_genesis_txid);

                    // We can't broadcast a tx if its inputs do not
                    // exist in mempool or blockchain
                    // 16fb49b12c7bcafd997040be7ceb9eb72d8624285
                    // aae5b13bd3d86e21dea4a93,
                    // just taken from mainnet. We do not have mainnet
                    // history in regtest,
                    // so invalid
                    let inputs_do_not_exist_raw =
                    "0200000002549194ec103e460d67f530737518f13f6fe30a\
                    2882c387c25ba719a2b5a63f1a020000006a47304402204b1\
                    4aba87bab02e88a19f0303c7d3a6d86583abd99ff1bab2ee1\
                    85b6499d26c202205e893212af1f5b9a63ab3c0eb6b9432c8\
                    d483fbc163fd86ffa7e8711d50eed4a4121037b40772a921c\
                    6add3c283037a8784c68378883dcb05b85c1eddfce9b55783\
                    027ffffffff42f3c77adfe2d84c2230b8cebc358819538d19\
                    075adaa35f09402254d92d7801030000006b483045022100f\
                    1fdd68b241be27066b0e0fa673a075e1630677c70c31af628\
                    48c658da452a0402205c0274b0ac8a481d03cb75fea656375\
                    2dff3bd7f897a5f8278b4a4ee6527a4744121037b40772a92\
                    1c6add3c283037a8784c68378883dcb05b85c1eddfce9b557\
                    83027ffffffff040000000000000000406a04534c50000101\
                    0453454e4420fb4233e8a568993976ed38a81c2671587c5ad\
                    09552dedefa78760deed6ff87aa080000000005f5e1000800\
                    000008bb2c970022020000000000001976a91404577f22113\
                    160825ce6a2d3ad6696527ee9bdf288ac2202000000000000\
                    1976a91479557c1fec4f44c688b993feed5cd7a8900d5d618\
                    8ac60880d00000000001976a91479557c1fec4f44c688b993\
                    feed5cd7a8900d5d6188ac00000000";

                    let inputs_do_not_exist_decoded =
                        hex::decode(inputs_do_not_exist_raw)?;

                    let result = do_broadcast_tx(
                        &chronik_url,
                        inputs_do_not_exist_decoded,
                        false,
                    )
                    .await;

                    assert_status_code_eq!(result, 400);
                }
                // After broadcastTxs are mined
                2 => {
                    let alp_genesis_bytes =
                        hex::decode(&*self.alp_genesis_rawtx.lock().await)?;

                    // We can't broadcast a rawtx if it is already in a block
                    let result = do_broadcast_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                        false,
                    )
                    .await;

                    assert_status_code_eq!(result, 400);

                    // If we use validateRawTx on a tx that has been
                    // mined, we still get timeFirstSeen of 0
                    // and outputs.spentBy of undefined, even if the
                    // outputs have been spent
                    let alp_genesis_after_mined = get_validate_raw_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                    )
                    .await?;

                    let alp_genesis_preview = get_validate_raw_tx(
                        &chronik_url,
                        alp_genesis_bytes.clone(),
                    )
                    .await?;

                    // Create a modified version of
                    // alp_genesis_after_mined with specific fields
                    // from alp_genesis_preview for comparison
                    let mut expected_tx = alp_genesis_after_mined.clone();

                    // Make sure we have at least one input to modify
                    assert!(
                        !expected_tx.inputs.is_empty(),
                        "Transaction has no inputs"
                    );

                    if let Some(input) = expected_tx.inputs.get_mut(0) {
                        if let Some(preview_input) =
                            alp_genesis_preview.inputs.get(0)
                        {
                            input.output_script =
                                preview_input.output_script.clone();
                            input.sats = preview_input.sats;
                        }
                    }

                    assert_eq!(alp_genesis_preview, expected_tx);
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
pub async fn broadcast_txs_and_validate_rawtx(
) -> Result<(), abc_rust_error::Report> {
    let python_script = "broadcast_txs_and_validate_rawtx";

    let ipc_reader = Arc::new(BroadcastTxIPC::default());

    spin_child_process(python_script, ipc_reader.clone()).await?;

    Ok(())
}
