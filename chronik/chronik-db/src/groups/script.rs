// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::script::Script;

use crate::{
    db::CF_SCRIPT_HISTORY,
    group::{Group, GroupQuery},
    io::{GroupHistoryConf, GroupHistoryReader, GroupHistoryWriter},
    mem::MempoolGroupHistory,
};

/// Index the mempool tx history of scripts
pub type MempoolScriptHistory = MempoolGroupHistory<ScriptGroup>;
/// Index the tx history of script in the DB
pub type ScriptHistoryWriter<'a> = GroupHistoryWriter<'a, ScriptGroup>;
/// Read the tx history of scripts in the DB
pub type ScriptHistoryReader<'a> = GroupHistoryReader<'a, ScriptGroup>;
/// Function ptr to compress scripts
pub type FnCompressScript = fn(&Script) -> Vec<u8>;

/// Group txs by input/output scripts.
#[derive(Clone)]
pub struct ScriptGroup {
    /// Function to compress scripts.
    fn_compress_script: FnCompressScript,
}

impl Group for ScriptGroup {
    type Iter<'a> = std::vec::IntoIter<&'a Script>;
    type Member<'a> = &'a Script;
    type MemberSer<'a> = Vec<u8>;

    fn members_tx<'a>(&self, query: GroupQuery<'a>) -> Self::Iter<'a> {
        let inputs = if !query.is_coinbase {
            query.tx.inputs.as_slice()
        } else {
            &[]
        };
        let outputs = query.tx.outputs.as_slice();
        let mut scripts = Vec::with_capacity(inputs.len() + outputs.len());
        for input in inputs {
            if let Some(coin) = &input.coin {
                scripts.push(&coin.output.script);
            }
        }
        for output in outputs {
            if !output.script.is_opreturn() {
                scripts.push(&output.script);
            }
        }
        scripts.into_iter()
    }

    fn ser_member<'a>(&self, member: Self::Member<'a>) -> Self::MemberSer<'a> {
        (self.fn_compress_script)(member)
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_name: CF_SCRIPT_HISTORY,
            page_size: 1000,
        }
    }
}

impl ScriptGroup {
    /// Create a new [`ScriptGroup`].
    pub fn new(fn_compress_script: FnCompressScript) -> Self {
        ScriptGroup { fn_compress_script }
    }
}

impl std::fmt::Debug for ScriptGroup {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ScriptGroup").finish_non_exhaustive()
    }
}

/// A mock "compression" that just prefixes with "COMPRESS:".
pub fn prefix_mock_compress(script: &Script) -> Vec<u8> {
    [b"COMPRESS:".as_ref(), script.as_ref()].concat()
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::{
        script::Script,
        tx::{Coin, Tx, TxId, TxInput, TxMut, TxOutput},
    };

    use crate::{
        group::{Group, GroupQuery},
        groups::{prefix_mock_compress, ScriptGroup},
    };

    #[test]
    fn test_script_group() {
        let script_group = ScriptGroup::new(prefix_mock_compress);
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
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx,
        };
        assert_eq!(
            script_group.members_tx(query).collect::<Vec<_>>(),
            vec![
                &Script::new(vec![0x51].into()),
                &Script::new(vec![0x52].into()),
                &Script::new(vec![0x53].into()),
                &Script::new(vec![0x51].into()),
            ],
        );
        let query = GroupQuery {
            is_coinbase: true,
            tx: &tx,
        };
        assert_eq!(
            script_group.members_tx(query).collect::<Vec<_>>(),
            vec![
                &Script::new(vec![0x53].into()),
                &Script::new(vec![0x51].into()),
            ],
        );
        assert_eq!(
            script_group.ser_member(&Script::new(vec![0x53].into())),
            [b"COMPRESS:".as_ref(), &[0x53]].concat(),
        );
    }
}
