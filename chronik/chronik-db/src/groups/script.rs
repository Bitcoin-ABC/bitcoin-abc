// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::script::{compress_script_variant, Script};
use bytes::Bytes;

use crate::{
    db::{CF_SCRIPT_HISTORY, CF_SCRIPT_HISTORY_NUM_TXS, CF_SCRIPT_UTXO},
    group::{Group, GroupQuery, MemberItem},
    io::{
        GroupHistoryConf, GroupHistoryReader, GroupHistoryWriter,
        GroupUtxoConf, GroupUtxoReader, GroupUtxoWriter,
    },
    mem::{MempoolGroupHistory, MempoolGroupUtxos},
};

/// Index the mempool tx history of scripts
pub type MempoolScriptHistory = MempoolGroupHistory<ScriptGroup>;
/// Index the mempool UTXOs of scripts
pub type MempoolScriptUtxos = MempoolGroupUtxos<ScriptGroup>;
/// Index the tx history of script in the DB
pub type ScriptHistoryWriter<'a> = GroupHistoryWriter<'a, ScriptGroup>;
/// Read the tx history of scripts in the DB
pub type ScriptHistoryReader<'a> = GroupHistoryReader<'a, ScriptGroup>;
/// Index the UTXOs of scripts in the DB
pub type ScriptUtxoWriter<'a> = GroupUtxoWriter<'a, ScriptGroup>;
/// Read the UTXOs of scripts in the DB
pub type ScriptUtxoReader<'a> = GroupUtxoReader<'a, ScriptGroup>;

/// Group txs by input/output scripts.
#[derive(Clone, Debug)]
pub struct ScriptGroup;

impl Group for ScriptGroup {
    type Aux = ();
    type Iter<'a> = Vec<MemberItem<&'a Script>>;
    type Member<'a> = &'a Script;
    type MemberSer<'a> = Bytes;

    fn input_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        if query.is_coinbase {
            return vec![];
        }
        let mut input_scripts = Vec::with_capacity(query.tx.inputs.len());
        for (idx, input) in query.tx.inputs.iter().enumerate() {
            if let Some(coin) = &input.coin {
                input_scripts.push(MemberItem {
                    idx,
                    member: &coin.output.script,
                });
            }
        }
        input_scripts
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        let mut output_scripts = Vec::with_capacity(query.tx.outputs.len());
        for (idx, output) in query.tx.outputs.iter().enumerate() {
            if !output.script.is_opreturn() {
                output_scripts.push(MemberItem {
                    idx,
                    member: &output.script,
                });
            }
        }
        output_scripts
    }

    fn ser_member<'a>(&self, member: &Self::Member<'a>) -> Self::MemberSer<'a> {
        compress_script_variant(&member.variant())
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_page_name: CF_SCRIPT_HISTORY,
            cf_num_txs_name: CF_SCRIPT_HISTORY_NUM_TXS,
            page_size: 1000,
        }
    }

    fn utxo_conf() -> GroupUtxoConf {
        GroupUtxoConf {
            cf_name: CF_SCRIPT_UTXO,
        }
    }
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::{
        script::Script,
        tx::{Coin, Tx, TxId, TxInput, TxMut, TxOutput},
    };

    use crate::{
        group::{tx_members_for_group, Group, GroupQuery, MemberItem},
        groups::ScriptGroup,
    };

    #[test]
    fn test_script_group() {
        let script_group = ScriptGroup;
        let tx = Tx::with_txid(
            TxId::from([0; 32]),
            TxMut {
                inputs: [[0x51].as_ref(), &[0x52]]
                    .into_iter()
                    .map(|script| TxInput {
                        coin: Some(Coin {
                            output: TxOutput {
                                script: Script::new(script.into()),
                                ..Default::default()
                            },
                            ..Default::default()
                        }),
                        ..Default::default()
                    })
                    .collect(),
                outputs: [[0x53].as_ref(), &[0x51]]
                    .into_iter()
                    .map(|script| TxOutput {
                        script: Script::new(script.into()),
                        ..Default::default()
                    })
                    .collect(),
                ..Default::default()
            },
        );
        let make_script = |script: Vec<u8>| Script::new(script.into());
        fn make_member_item(
            idx: usize,
            script: &Script,
        ) -> MemberItem<&Script> {
            MemberItem {
                idx,
                member: script,
            }
        }
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx,
        };
        assert_eq!(
            tx_members_for_group(&script_group, query, &()).collect::<Vec<_>>(),
            vec![
                &make_script(vec![0x51]),
                &make_script(vec![0x52]),
                &make_script(vec![0x53]),
                &make_script(vec![0x51]),
            ],
        );
        assert_eq!(
            script_group.input_members(query, &()),
            vec![
                make_member_item(0, &make_script(vec![0x51])),
                make_member_item(1, &make_script(vec![0x52])),
            ],
        );
        assert_eq!(
            script_group.output_members(query, &()),
            vec![
                make_member_item(0, &make_script(vec![0x53])),
                make_member_item(1, &make_script(vec![0x51])),
            ],
        );

        let query = GroupQuery {
            is_coinbase: true,
            tx: &tx,
        };
        assert_eq!(
            tx_members_for_group(&script_group, query, &()).collect::<Vec<_>>(),
            vec![
                &Script::new(vec![0x53].into()),
                &Script::new(vec![0x51].into()),
            ],
        );
        assert_eq!(script_group.input_members(query, &()), vec![]);
        assert_eq!(
            script_group.output_members(query, &()),
            vec![
                make_member_item(0, &make_script(vec![0x53])),
                make_member_item(1, &make_script(vec![0x51])),
            ],
        );

        assert_eq!(
            script_group.ser_member(&&make_script(vec![0x53])),
            [[0x07].as_ref(), &[0x53]].concat(),
        );
    }
}
