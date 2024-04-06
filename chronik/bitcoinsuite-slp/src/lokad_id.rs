// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`LokadId`] and parsing helpers.

use std::iter::Chain;

use bitcoinsuite_core::{
    script::{opcode::OP_RETURN, Op, Script},
    tx::{TxInput, TxMut},
};
use bytes::Bytes;

use crate::empp;

/// A LOKAD ID is a 4 byte prefix identifying an on-chain protocol:
/// "SLP\0" for SLP
/// "SLP2" for ALP
/// ".xec" for alias
pub type LokadId = [u8; 4];

/// Parse the script as `OP_RETURN <LOKAD ID> ...`, or [`None`] otherwise.
fn parse_opreturn_lokad_id(script: &Script) -> Option<LokadId> {
    let mut ops = script.iter_ops();
    if ops.next()?.ok()? != Op::Code(OP_RETURN) {
        return None;
    }
    parse_lokad_id_pushop_prefix(&ops.next()?.ok()?)
}

fn parse_lokad_id_pushop_prefix(op: &Op) -> Option<LokadId> {
    match op {
        Op::Push(_, data) => LokadId::try_from(data.as_ref()).ok(),
        _ => None,
    }
}

/// Parse script as `OP_RETURN OP_RESERVED "<LOKAD_ID>..." "<LOKAD_ID>..." ...`
#[derive(Debug, Default)]
pub struct EmppLokadIdIter {
    pushdata_iter: std::vec::IntoIter<Bytes>,
}

impl EmppLokadIdIter {
    /// Create a new [`EmppLokadIdIter`] from a script.
    pub fn new(pushdata: Vec<Bytes>) -> Self {
        EmppLokadIdIter {
            pushdata_iter: pushdata.into_iter(),
        }
    }
}

impl Iterator for EmppLokadIdIter {
    type Item = LokadId;

    fn next(&mut self) -> Option<Self::Item> {
        let pushdata = self.pushdata_iter.next()?;
        LokadId::try_from(pushdata.get(..4)?).ok()
    }
}

fn parse_input_script_lokad_id(tx_input: &TxInput) -> Option<LokadId> {
    let mut ops = tx_input.script.iter_ops();
    parse_lokad_id_pushop_prefix(&ops.next()?.ok()?)
}

/// Parse the script as `<LOKAD ID> ...`, or [`None`] otherwise.
#[derive(Debug, Default)]
pub struct TxInputLokadIdIter<'a> {
    inputs_iter: std::slice::Iter<'a, TxInput>,
}

impl<'a> TxInputLokadIdIter<'a> {
    /// Create a new [`TxInputLokadIdIter`].
    pub fn new(tx_inputs: &'a [TxInput]) -> Self {
        TxInputLokadIdIter {
            inputs_iter: tx_inputs.iter(),
        }
    }
}

impl Iterator for TxInputLokadIdIter<'_> {
    type Item = LokadId;

    fn next(&mut self) -> Option<Self::Item> {
        parse_input_script_lokad_id(self.inputs_iter.next()?)
    }
}

/// Return type of [`parse_tx_lokad_ids`].
pub type LokadIdIter<'a> = Chain<
    Chain<std::option::IntoIter<LokadId>, EmppLokadIdIter>,
    TxInputLokadIdIter<'a>,
>;

/// Parse all the LOKAD IDs of the tx as an iterator.
///
/// We allow the following patterns for a LOKAD ID:
/// - `OP_RETURN <LOKAD ID> ...` (first output), where the LOKAD ID is a 4-byte
///   pushdata op. This is the only allowed variant in the original spec, and
///   still kind-of the standard.
/// - `OP_RETURN OP_RESERVED "<LOKAD ID>..." "<LOKAD_ID>..." ...` (first
///   output), where the OP_RETURN is encoded as eMPP and every pushop is
///   considered prefixed by a 4-byte LOKAD ID. This is new after the
///   introduction of eMPP.
/// - `<LOKAD ID> ...` (every input), where any input starting with a 4-byte
///   pushop is interpreted as a LOKAD ID. This allows covenants to easily
///   enforce a LOKAD ID by simply doing `<LOKAD ID> OP_EQUAL` at the end of all
///   the ops.
pub fn parse_tx_lokad_ids(tx: &TxMut) -> LokadIdIter<'_> {
    let opreturn_lokad_id = tx
        .outputs
        .first()
        .and_then(|output| parse_opreturn_lokad_id(&output.script));
    let empp_pushdata = tx
        .outputs
        .first()
        .and_then(|output| empp::parse(&output.script).ok())
        .flatten()
        .unwrap_or_default();
    opreturn_lokad_id
        .into_iter()
        .chain(EmppLokadIdIter::new(empp_pushdata))
        .chain(TxInputLokadIdIter::new(&tx.inputs))
}

#[cfg(test)]
mod tests {
    use bitcoinsuite_core::{
        hash::ShaRmd160,
        script::Script,
        tx::{TxInput, TxMut, TxOutput},
    };
    use pretty_assertions::assert_eq;

    use crate::{
        empp,
        lokad_id::{
            parse_input_script_lokad_id, parse_opreturn_lokad_id,
            parse_tx_lokad_ids, EmppLokadIdIter, LokadId,
        },
    };

    #[test]
    fn test_parse_lokad_id_opreturn() {
        let parse = parse_opreturn_lokad_id;
        let script = |script: &'static [u8]| Script::new(script.into());
        assert_eq!(parse(&Script::default()), None);
        assert_eq!(parse(&Script::p2pkh(&ShaRmd160::default())), None);
        assert_eq!(parse(&Script::p2sh(&ShaRmd160::default())), None);
        assert_eq!(parse(&script(b"\0")), None);
        assert_eq!(parse(&script(b"\x04")), None);
        assert_eq!(parse(&script(b"\x04abcd")), None);
        assert_eq!(parse(&script(b"\x06abcdef")), None);
        assert_eq!(parse(&script(b"\x6a")), None);
        assert_eq!(parse(&script(b"\x6a\0")), None);
        assert_eq!(parse(&script(b"\x6a\x01\x01")), None);
        assert_eq!(parse(&script(b"\x6a\x04")), None);
        assert_eq!(parse(&script(b"\x6a\x04abc")), None);
        assert_eq!(parse(&script(b"\x6a\x04abcd")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x4c\x04abcd")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x4d\x04\0abcd")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x4e\x04\0\0\0abcd")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x04abcdef")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x04abcd\x041234")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x4c\x04abcdef")), Some(*b"abcd"));
        assert_eq!(parse(&script(b"\x6a\x05abcde")), None);
        assert_eq!(parse(&script(b"\x6a\x06abcdef")), None);
    }

    #[test]
    fn test_parse_lokad_id_input() {
        let parse = parse_input_script_lokad_id;
        let input = |script: &'static [u8]| TxInput {
            script: Script::new(script.into()),
            ..Default::default()
        };
        assert_eq!(parse(&input(b"")), None);
        assert_eq!(parse(&input(b"\0")), None);
        assert_eq!(parse(&input(b"\x04")), None);
        assert_eq!(parse(&input(b"\x04abcd")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x4c\x04abcd")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x4d\x04\0abcd")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x4e\x04\0\0\0abcd")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x04abcdef")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x04abcd\x041234")), Some(*b"abcd"));
        assert_eq!(parse(&input(b"\x06abcdef")), None);
        assert_eq!(parse(&input(b"\x6a\x04abcd")), None);
    }

    #[test]
    fn test_parse_lokad_id_empp() {
        let parse = |script| {
            EmppLokadIdIter::new(
                empp::parse(&script).ok().flatten().unwrap_or_default(),
            )
            .collect::<Vec<_>>()
        };
        let script = |script: &'static [u8]| Script::new(script.into());
        let empty: Vec<LokadId> = vec![];
        assert_eq!(parse(Script::default()), empty);
        assert_eq!(parse(Script::p2pkh(&ShaRmd160::default())), empty);
        assert_eq!(parse(Script::p2sh(&ShaRmd160::default())), empty);
        assert_eq!(parse(script(b"\0")), empty);
        assert_eq!(parse(script(b"\x04")), empty);
        assert_eq!(parse(script(b"\x04abcd")), empty);
        assert_eq!(parse(script(b"\x06abcdef")), empty);
        assert_eq!(parse(script(b"\x6a")), empty);
        assert_eq!(parse(script(b"\x6a\0")), empty);
        assert_eq!(parse(script(b"\x6a\x01\x01")), empty);
        assert_eq!(parse(script(b"\x6a\x50\x04")), empty);
        assert_eq!(parse(script(b"\x6a\x50\x04abc")), empty);
        assert_eq!(parse(script(b"\x6a\x50\x04abcd")), vec![*b"abcd"]);
        assert_eq!(parse(script(b"\x6a\x50\x4c\x04abcd")), vec![*b"abcd"]);
        assert_eq!(parse(script(b"\x6a\x50\x4d\x04\0abcd")), vec![*b"abcd"]);
        assert_eq!(
            parse(script(b"\x6a\x50\x4e\x04\0\0\0abcd")),
            vec![*b"abcd"]
        );
        assert_eq!(parse(script(b"\x6a\x50\x04abcdef")), empty);
        assert_eq!(
            parse(script(b"\x6a\x50\x04abcd\x041234")),
            vec![*b"abcd", *b"1234"]
        );
        assert_eq!(parse(script(b"\x6a\x50\x4c\x04abcdef")), empty);
        assert_eq!(parse(script(b"\x6a\x50\x04abcd")), vec![*b"abcd"]);
        assert_eq!(parse(script(b"\x6a\x50\x05abcde")), vec![*b"abcd"]);
        assert_eq!(parse(script(b"\x6a\x50\x06abcdef")), vec![*b"abcd"]);
    }

    #[test]
    fn test_parse_tx_lokad_ids() {
        let script = |script: &[u8]| Script::new(script.to_vec().into());
        assert_eq!(
            parse_tx_lokad_ids(&TxMut {
                version: 1,
                inputs: vec![
                    TxInput {
                        script: script(b"\x04abcd"),
                        ..Default::default()
                    },
                    TxInput {
                        script: script(b"\x4c\x041234"),
                        ..Default::default()
                    },
                    TxInput {
                        // ignored if first pushop is not 4 bytes
                        script: script(
                            &[b"\x41".as_ref(), &[0x41; 5], b"\x04xxxx"]
                                .concat(),
                        ),
                        ..Default::default()
                    },
                ],
                outputs: vec![
                    TxOutput {
                        script: script(b"\x6a\x046789\x04yyyy"),
                        value: 0,
                    },
                    // Ignored: OP_RETURN must be first
                    TxOutput {
                        script: script(b"\x6a\x04zzzz"),
                        value: 0,
                    },
                ],
                locktime: 0,
            })
            .collect::<Vec<_>>(),
            vec![*b"6789", *b"abcd", *b"1234"],
        );
        assert_eq!(
            parse_tx_lokad_ids(&TxMut {
                version: 1,
                inputs: vec![TxInput {
                    script: script(b"\x4d\x04\0efgh"),
                    ..Default::default()
                }],
                outputs: vec![TxOutput {
                    script: script(b"\x6a\x50\x046789\x044321"),
                    value: 0,
                }],
                locktime: 0,
            })
            .collect::<Vec<_>>(),
            vec![*b"6789", *b"4321", *b"efgh"],
        );
    }
}
