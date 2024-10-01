// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for tx related objects such as [`Tx`] for plugins.

use std::collections::BTreeMap;

use bitcoinsuite_core::{
    script::Script,
    tx::{OutPoint, Tx, TxInput, TxOutput},
};
use bitcoinsuite_slp::{
    empp,
    structs::TokenOutput,
    token_tx::{TokenTx, TokenTxEntry},
    verify::SpentToken,
};
use chronik_plugin_common::data::{PluginNameMap, PluginOutput};
use pyo3::{
    prelude::*,
    types::{PyBytes, PyDict, PyList},
};

use crate::{etoken::TokenModule, util::to_bytes};

/// `tx.py` module handles
#[derive(Debug)]
pub struct TxModule {
    cls_tx: PyObject,
    cls_out_point: PyObject,
    cls_tx_input: PyObject,
    cls_tx_output: PyObject,
    cls_plugin_output_entry: PyObject,
    cls_script: PyObject,
    token_module: TokenModule,
}

impl TxModule {
    /// Import the `tx.py` module
    pub fn import(py: Python<'_>) -> PyResult<Self> {
        let tx_module = PyModule::import_bound(py, "chronik_plugin.tx")?;
        let script_module =
            PyModule::import_bound(py, "chronik_plugin.script")?;
        Ok(TxModule {
            cls_tx: tx_module.getattr("Tx")?.into(),
            cls_out_point: tx_module.getattr("OutPoint")?.into(),
            cls_tx_input: tx_module.getattr("TxInput")?.into(),
            cls_tx_output: tx_module.getattr("TxOutput")?.into(),
            cls_plugin_output_entry: tx_module
                .getattr("PluginOutputEntry")?
                .into(),
            cls_script: script_module.getattr("CScript")?.into(),
            token_module: TokenModule::import(py)?,
        })
    }

    /// Bridge a [`Tx`] and attached token data to its Python equivalent.
    pub fn bridge_tx(
        &self,
        py: Python<'_>,
        tx: &Tx,
        token_data: Option<(&TokenTx, &[Option<SpentToken>])>,
        plugin_outputs: &BTreeMap<OutPoint, PluginOutput>,
        plugin_name_map: &PluginNameMap,
    ) -> PyResult<PyObject> {
        let py_empp_data = PyList::empty_bound(py);
        if let Some(first_output) = tx.outputs.first() {
            let empp_data = empp::parse(&first_output.script)
                .ok()
                .flatten()
                .unwrap_or_default();
            for pushdata in empp_data {
                py_empp_data.append(pushdata.as_ref())?;
            }
        }
        let mut entries = [].as_ref();
        let mut py_entries = vec![];
        let mut spent_tokens = None;
        let mut output_tokens = None;
        if let Some((token_tx, tokens)) = token_data {
            py_entries = token_tx
                .entries
                .iter()
                .map(|entry| self.token_module.bridge_token_tx_entry(py, entry))
                .collect::<PyResult<_>>()?;
            entries = &token_tx.entries;
            spent_tokens = Some(tokens);
            output_tokens = Some(&token_tx.outputs);
        }
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("txid", to_bytes(py, tx.txid().as_bytes()))?;
        kwargs.set_item("version", tx.version)?;
        kwargs.set_item(
            "inputs",
            tx.inputs
                .iter()
                .enumerate()
                .map(|(input_idx, input)| {
                    self.bridge_tx_input(
                        py,
                        input,
                        spent_tokens
                            .and_then(|tokens| tokens[input_idx].as_ref()),
                        &py_entries,
                        entries,
                        plugin_outputs.get(&input.prev_out),
                        plugin_name_map,
                    )
                })
                .collect::<PyResult<Vec<_>>>()?,
        )?;
        kwargs.set_item(
            "outputs",
            tx.outputs
                .iter()
                .enumerate()
                .map(|(output_idx, output)| {
                    self.bridge_tx_output(
                        py,
                        output,
                        output_tokens
                            .and_then(|outputs| outputs[output_idx].as_ref()),
                        &py_entries,
                    )
                })
                .collect::<PyResult<Vec<_>>>()?,
        )?;
        kwargs.set_item("lock_time", tx.locktime)?;
        kwargs.set_item("token_entries", py_entries)?;
        kwargs.set_item("empp_data", py_empp_data)?;
        self.cls_tx.call_bound(py, (), Some(&kwargs))
    }

    /// Bridge the [`OutPoint`] to its Python equivalent
    pub fn bridge_out_point(
        &self,
        py: Python<'_>,
        outpoint: &OutPoint,
    ) -> PyResult<PyObject> {
        self.cls_out_point
            .call1(py, (outpoint.txid.as_bytes().as_ref(), outpoint.out_idx))
    }

    /// Bridge the [`TxOutput`] and attached token data to is Python equivalent.
    pub fn bridge_tx_output(
        &self,
        py: Python<'_>,
        output: &TxOutput,
        token_output: Option<&TokenOutput>,
        py_token_entries: &[PyObject],
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("script", self.bridge_script(py, &output.script)?)?;
        kwargs.set_item("value", output.value)?;
        kwargs.set_item(
            "token",
            token_output
                .map(|token| {
                    self.token_module.bridge_token(
                        py,
                        &py_token_entries[token.token_idx],
                        token.token_idx,
                        token.variant,
                    )
                })
                .transpose()?,
        )?;
        self.cls_tx_output.call_bound(py, (), Some(&kwargs))
    }

    /// Bridge the [`TxInput`] and attached token data to is Python equivalent.
    #[allow(clippy::too_many_arguments)]
    pub fn bridge_tx_input(
        &self,
        py: Python<'_>,
        input: &TxInput,
        spent_token: Option<&SpentToken>,
        py_token_entries: &[PyObject],
        entries: &[TokenTxEntry],
        plugin_output: Option<&PluginOutput>,
        plugin_name_map: &PluginNameMap,
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item(
            "prev_out",
            self.bridge_out_point(py, &input.prev_out)?,
        )?;
        kwargs.set_item("script", self.bridge_script(py, &input.script)?)?;
        kwargs.set_item(
            "output",
            input
                .coin
                .as_ref()
                .map(|coin| {
                    self.bridge_input_output(
                        py,
                        &coin.output,
                        spent_token,
                        py_token_entries,
                        entries,
                    )
                })
                .transpose()?,
        )?;
        kwargs.set_item("sequence", input.sequence)?;
        kwargs.set_item(
            "plugin",
            self.bridge_plugin_data(py, plugin_output, plugin_name_map)?,
        )?;
        self.cls_tx_input.call_bound(py, (), Some(&kwargs))
    }

    fn bridge_input_output(
        &self,
        py: Python<'_>,
        output: &TxOutput,
        spent_token: Option<&SpentToken>,
        py_token_entries: &[PyObject],
        entries: &[TokenTxEntry],
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("script", self.bridge_script(py, &output.script)?)?;
        kwargs.set_item("value", output.value)?;
        kwargs.set_item(
            "token",
            spent_token
                .and_then(|token| {
                    let entry_idx = entries
                        .iter()
                        .position(|entry| entry.meta == token.token.meta)?;
                    Some(self.token_module.bridge_token(
                        py,
                        &py_token_entries[entry_idx],
                        entry_idx,
                        token.token.variant,
                    ))
                })
                .transpose()?,
        )?;
        self.cls_tx_output.call_bound(py, (), Some(&kwargs))
    }

    fn bridge_plugin_data<'py>(
        &self,
        py: Python<'py>,
        plugin_output: Option<&PluginOutput>,
        plugin_name_map: &PluginNameMap,
    ) -> PyResult<Bound<'py, PyDict>> {
        let plugin_data = PyDict::new_bound(py);
        let Some(plugin_output) = plugin_output else {
            return Ok(plugin_data);
        };
        for (&plugin_idx, entry) in &plugin_output.plugins {
            let Some(plugin_name) = plugin_name_map.name_by_idx(plugin_idx)
            else {
                // Skip plugins that aren't loaded.
                continue;
            };
            let kwargs = PyDict::new_bound(py);
            let py_groups = PyList::empty_bound(py);
            for group in &entry.groups {
                py_groups.append(to_bytes(py, group))?;
            }
            let py_data = PyList::empty_bound(py);
            for data in &entry.data {
                py_data.append(to_bytes(py, data))?;
            }
            kwargs.set_item("groups", py_groups)?;
            kwargs.set_item("data", py_data)?;
            plugin_data.set_item(
                plugin_name,
                self.cls_plugin_output_entry.call_bound(
                    py,
                    (),
                    Some(&kwargs),
                )?,
            )?;
        }
        Ok(plugin_data)
    }

    fn bridge_script(
        &self,
        py: Python<'_>,
        script: &Script,
    ) -> PyResult<PyObject> {
        let bytes = PyBytes::new_bound(py, script.bytecode().as_ref());
        self.cls_script.call1(py, (bytes,))
    }
}
