// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::Tx;
use chronik_db::io::DbBlock;
use chronik_proto::proto;

/// Make a [`proto::Tx`].
pub fn make_tx_proto(
    tx: &Tx,
    time_first_seen: i64,
    is_coinbase: bool,
    block: Option<&DbBlock>,
) -> proto::Tx {
    proto::Tx {
        txid: tx.txid().to_vec(),
        version: tx.version,
        inputs: tx
            .inputs
            .iter()
            .map(|input| {
                let coin = input.coin.as_ref();
                let (output_script, value) = coin
                    .map(|coin| {
                        (coin.output.script.to_vec(), coin.output.value)
                    })
                    .unwrap_or_default();
                proto::TxInput {
                    prev_out: Some(proto::OutPoint {
                        txid: input.prev_out.txid.to_vec(),
                        out_idx: input.prev_out.out_idx,
                    }),
                    input_script: input.script.to_vec(),
                    output_script,
                    value,
                    sequence_no: input.sequence,
                }
            })
            .collect(),
        outputs: tx
            .outputs
            .iter()
            .map(|output| proto::TxOutput {
                value: output.value,
                output_script: output.script.to_vec(),
            })
            .collect(),
        lock_time: tx.locktime,
        block: block.map(|block| proto::BlockMetadata {
            hash: block.hash.to_vec(),
            height: block.height,
            timestamp: block.timestamp,
        }),
        time_first_seen,
        is_coinbase,
    }
}
