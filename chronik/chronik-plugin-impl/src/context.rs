// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginContext`].

use std::{
    collections::{btree_map::Entry, BTreeMap, BTreeSet},
    fs::File,
    io::Read,
};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    net::Net,
    tx::{OutPoint, Tx, TxId},
};
use bitcoinsuite_slp::{
    lokad_id::{parse_tx_lokad_ids, LokadId},
    token_tx::TokenTx,
    verify::SpentToken,
};
use bytes::Bytes;
use chronik_plugin_common::{
    data::{PluginNameMap, PluginOutput, PluginOutputEntry, PluginTxOutputs},
    params::PluginParams,
    plugin::Plugin,
};
use chronik_util::log;
use pyo3::{
    types::{
        PyAnyMethods, PyBytes, PyBytesMethods, PyList, PyListMethods, PyModule,
    },
    Bound, PyAny, PyObject, Python,
};
use serde::Deserialize;
use thiserror::Error;

use crate::{
    context::{PluginContextError::*, PluginRunError::*},
    module::load_plugin_module,
    plugin::load_plugin,
    tx::TxModule,
};

/// Struct managing all things relating to Chronik plugins.
#[derive(Debug, Default)]
pub struct PluginContext {
    plugins: Vec<Plugin>,
    instances: Vec<PyObject>,
    tx_module: Option<TxModule>,
    plugin_output_cls: Option<PyObject>,
    lokad_ids: BTreeSet<LokadId>,
}

#[derive(Debug, Deserialize)]
struct PluginsConf {
    plugin: Option<BTreeMap<String, PluginSpec>>,
    main: Option<PluginsNetConf>,
    test: Option<PluginsNetConf>,
    regtest: Option<PluginsNetConf>,
}

#[derive(Debug, Default, Deserialize)]
struct PluginsNetConf {
    plugin: BTreeMap<String, PluginSpec>,
}

#[derive(Debug, Deserialize)]
struct PluginSpec {
    class: Option<String>,
}

/// Errors for [`PluginContext`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PluginContextError {
    /// Duplicate plugin
    #[error(
        "Duplicate plugin {0}, use either [main.plugin] or [plugin] but not \
         both"
    )]
    DuplicatePlugin(String),

    /// Inconsistent DB: Couldn't find plugin idx for plugin
    #[error("Inconsistent DB: Couldn't find plugin idx for plugin {0}")]
    PluginIdxNotFound(String),

    /// Running a plugin failed
    #[error("Plugin {plugin_name:?} failed indexing tx {txid}: {error}")]
    PluginRunFailed {
        /// TxId that failed
        txid: TxId,
        /// Name of the plugin (module name) that failed
        plugin_name: String,
        /// Error from the plugin
        error: PluginRunError,
    },
}

/// Errors for running `run_on_tx` of [`PluginContext`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PluginRunError {
    /// Plugin is missing `run` method (should never happen by ABC)
    #[error("Missing `run` method")]
    MissingRunMethod,

    /// Plugin threw exception
    #[error("Exception: {0}")]
    ThrewException(String),

    /// Plugin must return a `list` of `PluginOutput`
    #[error("Plugin must return a `list`, got {0}")]
    MustReturnList(String),

    /// Plugin must return a `list` of `PluginOutput`
    #[error(
        "Plugin must return a `list` of `PluginOutput`: at list index {idx}, \
         got {obj_str}"
    )]
    MustReturnListOfPluginOutput {
        /// Index of the item in the list returned by the plugin
        idx: usize,
        /// repr of the item
        obj_str: String,
    },

    /// PluginOutput is missing `idx` (should never happen by NamedTuple)
    #[error("`idx` of `PluginOutput` missing at list index {0}")]
    MissingIdx(usize),

    /// `idx` of `PluginOutput` must be int
    #[error(
        "`idx` of `PluginOutput` must be int: at list index {idx}, got \
         {obj_str}"
    )]
    IdxNotInt {
        /// Index of the `PluginOutput` in the list returned by the plugin
        idx: usize,
        /// repr of the `idx` field
        obj_str: String,
    },

    /// PluginOutput is missing `group` (should never happen by NamedTuple)
    #[error("`group` of `PluginOutput` missing at list index {0}")]
    MissingGroup(usize),

    /// `idx` of `PluginOutput` must be bytes or list of bytes
    #[error(
        "`group` of `PluginOutput` must be bytes or list[bytes]: at list \
         index {idx}, got {obj_str}"
    )]
    GroupNotListOfBytes {
        /// Index of the `PluginOutput` in the list returned by the plugin
        idx: usize,
        /// repr of the `group` field
        obj_str: String,
    },

    /// PluginOutput is missing `data` (should never happen by NamedTuple)
    #[error("`data` of `PluginOutput` missing at list index {0}")]
    MissingData(usize),

    /// `data` of `PluginOutput` must be bytes or list of bytes or None
    #[error(
        "`data` of `PluginOutput` must be bytes or list[bytes] or None: at \
         list index {idx}, got {obj_str}"
    )]
    DataNotListOfBytes {
        /// Index of the `PluginOutput` in the list returned by the plugin
        idx: usize,
        /// repr of the `data` field
        obj_str: String,
    },

    /// `idx` out of bounds
    #[error(
        "`idx` out of bounds; plugin provided value for output index {0}, but \
         tx has only {1} outputs"
    )]
    IdxOutOfBounds(u32, usize),

    /// Duplicate output idx
    #[error(
        "Duplicate output idx, provided multiple PluginOutputs for idx {0}"
    )]
    DuplicateIdx(u32),
}

impl PluginContext {
    /// Setup a plugin context, i.e. setting up an embedded Python instance and
    /// loading plugins.
    pub fn setup(params: PluginParams) -> Result<Self> {
        if !params.plugins_conf.exists() {
            log!(
                "Skipping initializing plugins: {} doesn't exist\n",
                params.plugins_conf.to_string_lossy(),
            );
            return Ok(PluginContext::default());
        }
        let mut plugins_conf_file = File::open(&params.plugins_conf)?;
        let mut plugins_conf = String::new();
        plugins_conf_file.read_to_string(&mut plugins_conf)?;
        let plugins_conf = toml::from_str::<PluginsConf>(&plugins_conf)?;

        // Treat plugins in [plugin] section and [main.plugin] the same
        let mut main_conf = plugins_conf.main.unwrap_or_default();
        for (plugin_name, plugin) in plugins_conf.plugin.unwrap_or_default() {
            match main_conf.plugin.entry(plugin_name.clone()) {
                Entry::Vacant(vacant) => {
                    vacant.insert(plugin);
                }
                Entry::Occupied(_) => {
                    return Err(DuplicatePlugin(plugin_name).into());
                }
            }
        }

        let net_plugins = match params.net {
            Net::Mainnet => main_conf,
            Net::Testnet => plugins_conf.test.unwrap_or_default(),
            Net::Regtest => plugins_conf.regtest.unwrap_or_default(),
        };

        load_plugin_module();
        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| -> Result<_> {
            // Extract the Python version
            let version = PyModule::import_bound(py, "platform")?
                .getattr("python_version")?
                .call0()?
                .extract::<String>()?;
            log!("Plugin context initialized Python {}\n", version);

            let tx_module = TxModule::import(py)?;

            // Add <datadir>/plugins to sys.path
            PyModule::import_bound(py, "sys")?
                .getattr("path")?
                .downcast::<PyList>()
                .unwrap()
                .append(params.plugins_dir)?;

            // Load the chronik Plugin class
            let plugin_module =
                match PyModule::import_bound(py, "chronik_plugin.plugin") {
                    Ok(plugin_module) => plugin_module,
                    Err(err) => {
                        err.print(py);
                        return Err(err.into());
                    }
                };
            let plugin_cls = plugin_module.getattr("Plugin")?;
            let plugin_output_cls = plugin_module.getattr("PluginOutput")?;

            let mut plugins = Vec::with_capacity(net_plugins.plugin.len());
            let mut instances = Vec::with_capacity(plugins.len());
            let mut lokad_ids = BTreeSet::new();
            for (module_name, plugin_spec) in net_plugins.plugin {
                let (plugin, instance) = match load_plugin(
                    py,
                    module_name.clone(),
                    plugin_spec.class,
                    &plugin_cls,
                ) {
                    Ok(plugin) => plugin,
                    Err(err) => {
                        log!("Failed loading plugin {module_name}\n");
                        return Err(err);
                    }
                };
                for &lokad_id in &plugin.lokad_ids {
                    lokad_ids.insert(lokad_id);
                }
                let lokad_ids = plugin
                    .lokad_ids
                    .iter()
                    .map(|lokad_id| Bytes::copy_from_slice(lokad_id))
                    .collect::<Vec<_>>();
                log!(
                    "Loaded plugin {}.{} (version {}) with LOKAD IDs {:?}\n",
                    plugin.module_name,
                    plugin.class_name,
                    plugin.version,
                    lokad_ids,
                );
                plugins.push(plugin);
                instances.push(instance);
            }
            Ok(PluginContext {
                plugins,
                instances,
                tx_module: Some(tx_module),
                plugin_output_cls: Some(plugin_output_cls.into()),
                lokad_ids,
            })
        })
    }

    /// Run the loaded plugins that match LOKAD IDs on the given tx, with the
    /// given plugin_outputs and token_data
    pub fn run_on_tx(
        &self,
        py: Python<'_>,
        tx: &Tx,
        token_data: Option<(&TokenTx, &[Option<SpentToken>])>,
        plugin_outputs: &BTreeMap<OutPoint, PluginOutput>,
        plugin_name_map: &PluginNameMap,
    ) -> Result<PluginTxOutputs> {
        let mut result = PluginTxOutputs::default();
        let Some(tx_module) = self.tx_module.as_ref() else {
            return Ok(result);
        };
        let py_tx = tx_module.bridge_tx(
            py,
            tx,
            token_data,
            plugin_outputs,
            plugin_name_map,
        )?;
        let lokad_ids = parse_tx_lokad_ids(tx).collect::<BTreeSet<_>>();
        for (plugin, instance) in self.plugins.iter().zip(&self.instances) {
            if !plugin
                .lokad_ids
                .iter()
                .any(|lokad_id| lokad_ids.contains(lokad_id))
            {
                // Skip plugins that don't have any of the lokad IDs of the tx
                continue;
            }
            let plugin_idx = plugin_name_map
                .idx_by_name(&plugin.module_name)
                .ok_or_else(|| {
                PluginIdxNotFound(plugin.module_name.clone())
            })?;
            let plugin_result =
                match self.run_plugin(py, instance, &py_tx, tx.outputs.len()) {
                    Ok(plugin_result) => plugin_result,
                    Err(error) => {
                        return Err(PluginRunFailed {
                            txid: tx.txid(),
                            plugin_name: plugin.module_name.clone(),
                            error,
                        }
                        .into());
                    }
                };
            for (out_idx, output) in plugin_result {
                result
                    .outputs
                    .entry(out_idx)
                    .or_default()
                    .plugins
                    .insert(plugin_idx, output);
            }
        }

        Ok(result)
    }

    fn run_plugin(
        &self,
        py: Python<'_>,
        instance: &PyObject,
        py_tx: &PyObject,
        num_outputs: usize,
    ) -> Result<BTreeMap<u32, PluginOutputEntry>, PluginRunError> {
        let plugin_output_cls = self.plugin_output_cls.as_ref().unwrap();
        let instance = instance.bind(py);
        // Run the plugin; any exceptions bubble up and stop the node
        let outputs = instance
            .getattr("run")
            .map_err(|_| MissingRunMethod)?
            .call1((py_tx,))
            .map_err(|err| ThrewException(err.to_string()))?;

        let outputs = outputs
            .downcast::<PyList>()
            .map_err(|_| MustReturnList(repr(&outputs)))?;

        let mut output_entries = BTreeMap::new();

        for (idx, output) in outputs.iter().enumerate() {
            if !output
                .is_instance(plugin_output_cls.bind(py))
                .map_err(|err| ThrewException(err.to_string()))?
            {
                return Err(MustReturnListOfPluginOutput {
                    idx,
                    obj_str: repr(&output),
                });
            }
            let out_idx = output.getattr("idx").map_err(|_| MissingIdx(idx))?;
            let out_idx = out_idx.extract::<u32>().map_err(|_| IdxNotInt {
                idx,
                obj_str: repr(&out_idx),
            })?;
            let group =
                output.getattr("group").map_err(|_| MissingGroup(idx))?;
            let groups = extract_bytes_or_list(&group).map_err(|_| {
                GroupNotListOfBytes {
                    idx,
                    obj_str: repr(&group),
                }
            })?;
            let data = output.getattr("data").map_err(|_| MissingData(idx))?;
            let data = if data.is_none() {
                vec![]
            } else {
                extract_bytes_or_list(&data).map_err(|_| {
                    DataNotListOfBytes {
                        idx,
                        obj_str: repr(&data),
                    }
                })?
            };
            if out_idx as usize >= num_outputs {
                return Err(IdxOutOfBounds(out_idx, num_outputs));
            }
            match output_entries.entry(out_idx) {
                Entry::Vacant(entry) => {
                    entry.insert(PluginOutputEntry { groups, data });
                }
                Entry::Occupied(_) => return Err(DuplicateIdx(out_idx)),
            }
        }

        Ok(output_entries)
    }

    /// Plugins loaded in this context
    pub fn plugins(&self) -> &[Plugin] {
        &self.plugins
    }

    /// Whether any plugin has the given lokad ID
    pub fn has_plugin_with_lokad_id(&self, lokad_id: LokadId) -> bool {
        self.lokad_ids.contains(&lokad_id)
    }

    /// Acquire the Python GIL and run `f` if the Plugin context is initialized,
    /// otherwise just return `R::default()`.
    pub fn with_py<F, R>(&self, f: F) -> Result<R>
    where
        F: for<'py> FnOnce(Python<'py>) -> Result<R>,
        R: Default,
    {
        if self.tx_module.is_none() || self.plugins.is_empty() {
            return Ok(R::default());
        }
        Python::with_gil(f)
    }
}

fn extract_bytes_or_list(
    py_any: &Bound<'_, PyAny>,
) -> Result<Vec<Vec<u8>>, ()> {
    py_any
        .downcast::<PyBytes>()
        .map(|bytes| vec![bytes.as_bytes().to_vec()])
        .or_else(|_| {
            let list = py_any.downcast::<PyList>().map_err(|_| ())?;
            list.iter()
                .map(|item| {
                    Ok(item
                        .downcast::<PyBytes>()
                        .map_err(|_| ())?
                        .as_bytes()
                        .to_vec())
                })
                .collect()
        })
}

fn repr(obj: &Bound<'_, PyAny>) -> String {
    match obj.repr() {
        Ok(repr) => repr.to_string(),
        Err(err) => err.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use std::{collections::BTreeMap, fs::File, io::Write};

    use abc_rust_error::Result;
    use bitcoinsuite_core::{
        net::Net,
        script::Script,
        tx::{Tx, TxMut, TxOutput},
    };
    use bitcoinsuite_slp::test_helpers::TXID;
    use chronik_plugin_common::{
        data::{
            PluginNameMap, PluginOutput, PluginOutputEntry, PluginTxOutputs,
        },
        params::PluginParams,
    };
    use pretty_assertions::assert_eq;
    use pyo3::Python;

    use crate::context::{PluginContext, PluginContextError, PluginRunError};

    #[test]
    fn test_run_on_tx() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-plugin-impl-run_on_tx")?;
        let plugins_conf_path = tempdir.path().join("plugins.toml");

        File::create(&plugins_conf_path)?.write_all(
            b"
[plugin]
plg1 = {}
plg2 = {}",
        )?;

        File::create(tempdir.path().join("plg1.py"))?.write_all(
            b"
from chronik_plugin.plugin import Plugin, PluginOutput
class Plg1Plugin(Plugin):
    def lokad_id(self):
        return b'PLG1'
    def version(self):
        return '0.0.0'
    def run(self, tx):
        if tx.version == 1:
            raise ValueError('MyError')
        elif tx.version == 2:
            return 'string'
        elif tx.version == 3:
            return ['string']
        elif tx.version == 4:
            return [PluginOutput(idx='string', group=[])]
        elif tx.version == 5:
            return [PluginOutput(idx=0, group='string')]
        elif tx.version == 6:
            return [PluginOutput(idx=0, group=[], data='string')]
        elif tx.version == 7:
            return [PluginOutput(idx=77, group=[])]
        elif tx.version == 8:
            return [
                PluginOutput(idx=0, group=[]),
                PluginOutput(idx=0, group=[]),
            ]
        elif tx.version == 9:
            return [PluginOutput(idx=0, group=[b'grp1', b'grp2'], data=b'dat')]
        elif tx.version == 10:
            return [
                # interpreted as [b'']
                PluginOutput(idx=1, group=b'', data=b''),
                # interpreted as []
                PluginOutput(idx=2, group=[], data=[]),
            ]
",
        )?;

        File::create(tempdir.path().join("plg2.py"))?.write_all(
            b"
from chronik_plugin.plugin import Plugin, PluginOutput
class Plg2Plugin(Plugin):
    def lokad_id(self):
        return b'PLG2'
    def version(self):
        return '0.0.0'
    def run(self, tx):
        return [
            PluginOutput(idx=0, group=[], data=b'batman'),
            PluginOutput(idx=1, group=b'2grp', data=[b'2dat', b'3dat']),
        ]",
        )?;

        let plugin_ctx = PluginContext::setup(PluginParams {
            net: Net::Mainnet,
            plugins_dir: tempdir.path().to_path_buf(),
            plugins_conf: plugins_conf_path,
        })?;

        let plugin_name_map = PluginNameMap::new(vec![
            (0, "plg1".to_string()),
            (1, "plg2".to_string()),
        ]);

        Python::with_gil(|py| -> Result<_> {
            let make_plg_tx_with_script = |version, script, num_outputs| {
                Tx::with_txid(
                    TXID,
                    TxMut {
                        version,
                        outputs: vec![TxOutput { value: 0, script }]
                            .into_iter()
                            .chain(vec![TxOutput::default(); num_outputs])
                            .collect(),
                        ..Default::default()
                    },
                )
            };
            let make_plg_tx = |version| {
                make_plg_tx_with_script(
                    version,
                    Script::new(b"\x6a\x04PLG1".as_ref().into()),
                    2,
                )
            };
            let check_run_error = |version, error| -> Result<_> {
                assert_eq!(
                    plugin_ctx
                        .run_on_tx(
                            py,
                            &make_plg_tx(version),
                            None,
                            &BTreeMap::new(),
                            &plugin_name_map,
                        )
                        .unwrap_err()
                        .downcast::<PluginContextError>()?,
                    PluginContextError::PluginRunFailed {
                        txid: TXID,
                        plugin_name: "plg1".to_string(),
                        error,
                    },
                );
                Ok(())
            };

            check_run_error(
                1,
                PluginRunError::ThrewException(
                    "ValueError: MyError".to_string(),
                ),
            )?;

            check_run_error(
                2,
                PluginRunError::MustReturnList("'string'".to_string()),
            )?;

            check_run_error(
                3,
                PluginRunError::MustReturnListOfPluginOutput {
                    idx: 0,
                    obj_str: "'string'".to_string(),
                },
            )?;

            check_run_error(
                4,
                PluginRunError::IdxNotInt {
                    idx: 0,
                    obj_str: "'string'".to_string(),
                },
            )?;

            check_run_error(
                5,
                PluginRunError::GroupNotListOfBytes {
                    idx: 0,
                    obj_str: "'string'".to_string(),
                },
            )?;

            check_run_error(
                6,
                PluginRunError::DataNotListOfBytes {
                    idx: 0,
                    obj_str: "'string'".to_string(),
                },
            )?;

            check_run_error(7, PluginRunError::IdxOutOfBounds(77, 3))?;

            check_run_error(8, PluginRunError::DuplicateIdx(0))?;

            assert_eq!(
                plugin_ctx.run_on_tx(
                    py,
                    &make_plg_tx(9),
                    None,
                    &BTreeMap::new(),
                    &plugin_name_map,
                )?,
                PluginTxOutputs {
                    outputs: vec![(
                        0,
                        PluginOutput {
                            plugins: vec![(
                                0,
                                PluginOutputEntry {
                                    groups: vec![
                                        b"grp1".to_vec(),
                                        b"grp2".to_vec(),
                                    ],
                                    data: vec![b"dat".to_vec()],
                                },
                            )]
                            .into_iter()
                            .collect(),
                        },
                    ),]
                    .into_iter()
                    .collect()
                }
            );

            assert_eq!(
                plugin_ctx.run_on_tx(
                    py,
                    &make_plg_tx_with_script(
                        10,
                        Script::new(
                            b"\x6a\x50\x04PLG1\x04PLG2".as_ref().into(),
                        ),
                        2,
                    ),
                    None,
                    &BTreeMap::new(),
                    &plugin_name_map,
                )?,
                PluginTxOutputs {
                    outputs: vec![
                        (
                            0,
                            PluginOutput {
                                plugins: vec![(
                                    1,
                                    PluginOutputEntry {
                                        groups: vec![],
                                        data: vec![b"batman".to_vec()],
                                    },
                                )]
                                .into_iter()
                                .collect(),
                            },
                        ),
                        (
                            1,
                            PluginOutput {
                                plugins: vec![
                                    (
                                        0,
                                        PluginOutputEntry {
                                            groups: vec![vec![]],
                                            data: vec![vec![]],
                                        },
                                    ),
                                    (
                                        1,
                                        PluginOutputEntry {
                                            groups: vec![b"2grp".to_vec()],
                                            data: vec![
                                                b"2dat".to_vec(),
                                                b"3dat".to_vec(),
                                            ],
                                        },
                                    ),
                                ]
                                .into_iter()
                                .collect(),
                            },
                        ),
                        (
                            2,
                            PluginOutput {
                                plugins: vec![(
                                    0,
                                    PluginOutputEntry {
                                        groups: vec![],
                                        data: vec![],
                                    },
                                )]
                                .into_iter()
                                .collect(),
                            },
                        ),
                    ]
                    .into_iter()
                    .collect()
                },
            );

            Ok(())
        })?;

        Ok(())
    }
}
