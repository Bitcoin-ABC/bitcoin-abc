// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::{Coin, Tx, TxId, TxInput, TxMut, TxOutput};

use crate::{
    group::{Group, GroupQuery},
    io::GroupHistoryConf,
};

/// Index by output/input value. While useless in pactice, this makes
/// writing tests very convenient and showcases how Group can be used.
pub(crate) struct ValueGroup;

impl Group for ValueGroup {
    type Iter<'a> = std::vec::IntoIter<i64>;
    type Member<'a> = i64;
    type MemberSer<'a> = [u8; 8];

    fn members_tx(&self, query: GroupQuery<'_>) -> Self::Iter<'_> {
        let mut values = Vec::new();
        if !query.is_coinbase {
            for input in &query.tx.inputs {
                if let Some(coin) = &input.coin {
                    values.push(coin.output.value);
                }
            }
        }
        for output in &query.tx.outputs {
            values.push(output.value);
        }
        values.into_iter()
    }

    fn ser_member<'a>(&self, value: i64) -> Self::MemberSer<'a> {
        ser_value(value)
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_name: "value_history",
            page_size: 4,
        }
    }
}

/// Serialize the value as array
pub(crate) fn ser_value(value: i64) -> [u8; 8] {
    value.to_be_bytes()
}

/// Make a tx with inputs and outputs having the given values.
/// Also pass _tx_num, which is ignored, but allows tests to document the tx_num
/// of this tx.
pub(crate) fn make_value_tx<const N: usize, const M: usize>(
    txid_num: u8,
    input_values: [i64; N],
    output_values: [i64; M],
) -> Tx {
    Tx::with_txid(
        TxId::from([txid_num; 32]),
        TxMut {
            version: 0,
            inputs: input_values
                .into_iter()
                .map(|value| TxInput {
                    coin: Some(Coin {
                        output: TxOutput {
                            value,
                            ..Default::default()
                        },
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .collect(),
            outputs: output_values
                .into_iter()
                .map(|value| TxOutput {
                    value,
                    ..Default::default()
                })
                .collect(),
            locktime: 0,
        },
    )
}
