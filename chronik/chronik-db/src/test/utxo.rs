// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

macro_rules! make_mempool_tx {
    (
        txid_num = $txid_num:literal,
        inputs = [$(($input_txid_num:literal, $input_out_idx:literal)),*],
        num_outputs = $num_outputs:literal
    ) => {
        MempoolTx {
            tx: make_inputs_tx(
                $txid_num,
                [$(($input_txid_num, $input_out_idx, -1)),*],
                [-1; $num_outputs],
            ),
            time_first_seen: 0,
        }
    };
}

pub(crate) use make_mempool_tx;
