// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::{
    Coin, OutPoint, Tx, TxId, TxInput, TxMut, TxOutput,
};

use crate::{
    group::{Group, GroupQuery, MemberItem, UtxoDataValue},
    io::{GroupHistoryConf, GroupUtxoConf},
};

/// Index by output/input sats. While useless in practice, this makes
/// writing tests very convenient and showcases how Group can be used.
#[derive(Debug, Default, Eq, PartialEq)]
pub(crate) struct ValueGroup;

impl Group for ValueGroup {
    type Aux = ();
    type Iter<'a> = Vec<MemberItem<i64>>;
    type Member<'a> = i64;
    type MemberSer = [u8; 8];
    type UtxoData = UtxoDataValue;

    fn input_members(
        &self,
        query: GroupQuery<'_>,
        _aux: &(),
    ) -> Self::Iter<'_> {
        let mut inputs = Vec::new();
        if !query.is_coinbase {
            for (idx, input) in query.tx.inputs.iter().enumerate() {
                if let Some(coin) = &input.coin {
                    inputs.push(MemberItem {
                        idx,
                        member: coin.output.sats,
                    });
                }
            }
        }
        inputs
    }

    fn output_members(
        &self,
        query: GroupQuery<'_>,
        _aux: &(),
    ) -> Self::Iter<'_> {
        let mut outputs = Vec::new();
        for (idx, output) in query.tx.outputs.iter().enumerate() {
            outputs.push(MemberItem {
                idx,
                member: output.sats,
            });
        }
        outputs
    }

    fn ser_member(&self, sats: &i64) -> Self::MemberSer {
        ser_value(*sats)
    }

    fn is_hash_member_supported(&self) -> bool {
        false
    }

    fn ser_hash_member(&self, _member: &Self::Member<'_>) -> [u8; 32] {
        unimplemented!()
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_page_name: "value_history",
            cf_num_txs_name: "value_history_num_txs",
            page_size: 4,
            cf_member_hash_name: None,
        }
    }

    fn utxo_conf() -> GroupUtxoConf {
        GroupUtxoConf {
            cf_name: "value_utxo",
        }
    }
}

/// Serialize the sats as array
pub(crate) fn ser_value(sats: i64) -> [u8; 8] {
    sats.to_be_bytes()
}

/// Make a tx with inputs and outputs having the given values.
/// Also pass _tx_num, which is ignored, but allows tests to document the tx_num
/// of this tx.
pub(crate) fn make_value_tx<const N: usize, const M: usize>(
    txid_num: u8,
    input_values: [i64; N],
    output_values: [i64; M],
) -> Tx {
    make_inputs_tx(
        txid_num,
        input_values.map(|sats| (0, 0, sats)),
        output_values,
    )
}

pub(crate) fn make_inputs_tx<const N: usize, const M: usize>(
    txid_num: u8,
    input_values: [(u8, u32, i64); N],
    output_values: [i64; M],
) -> Tx {
    Tx::with_txid(
        TxId::from([txid_num; 32]),
        TxMut {
            version: 0,
            inputs: input_values
                .into_iter()
                .map(|(input_txid_num, out_idx, sats)| TxInput {
                    prev_out: OutPoint {
                        txid: TxId::from([input_txid_num; 32]),
                        out_idx,
                    },
                    coin: Some(Coin {
                        output: TxOutput {
                            sats,
                            ..Default::default()
                        },
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .collect(),
            outputs: output_values
                .into_iter()
                .map(|sats| TxOutput {
                    sats,
                    ..Default::default()
                })
                .collect(),
            locktime: 0,
        },
    )
}
