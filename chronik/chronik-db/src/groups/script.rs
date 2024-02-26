// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::{compress_script_variant, Script},
    tx::Tx,
};
use bytes::Bytes;

use crate::{
    db::{CF_SCRIPT_HISTORY, CF_SCRIPT_HISTORY_NUM_TXS, CF_SCRIPT_UTXO},
    group::{Group, GroupQuery, MemberItem, UtxoDataValue},
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

/// Iterator over the scripts of a tx
#[derive(Debug)]
pub struct ScriptGroupIter<'a> {
    is_coinbase: bool,
    tx: &'a Tx,
    idx: usize,
    is_outputs: bool,
}

impl<'a> Iterator for ScriptGroupIter<'a> {
    type Item = MemberItem<&'a Script>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.is_coinbase && !self.is_outputs {
            return None;
        }
        let idx = self.idx;
        self.idx += 1;
        Some(MemberItem {
            idx,
            member: if self.is_outputs {
                &self.tx.outputs.get(idx)?.script
            } else {
                &self.tx.inputs.get(idx)?.coin.as_ref()?.output.script
            },
        })
    }
}

impl Group for ScriptGroup {
    type Aux = ();
    type Iter<'a> = ScriptGroupIter<'a>;
    type Member<'a> = &'a Script;
    type MemberSer<'a> = Bytes;
    type UtxoData = UtxoDataValue;

    fn input_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        ScriptGroupIter {
            is_coinbase: query.is_coinbase,
            tx: query.tx,
            idx: 0,
            is_outputs: false,
        }
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        ScriptGroupIter {
            is_coinbase: query.is_coinbase,
            tx: query.tx,
            idx: 0,
            is_outputs: true,
        }
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
            script_group.input_members(query, &()).collect::<Vec<_>>(),
            vec![
                make_member_item(0, &make_script(vec![0x51])),
                make_member_item(1, &make_script(vec![0x52])),
            ],
        );
        assert_eq!(
            script_group.output_members(query, &()).collect::<Vec<_>>(),
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
        assert_eq!(
            script_group.input_members(query, &()).collect::<Vec<_>>(),
            vec![],
        );
        assert_eq!(
            script_group.output_members(query, &()).collect::<Vec<_>>(),
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
