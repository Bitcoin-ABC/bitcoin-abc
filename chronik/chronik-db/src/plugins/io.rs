// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use rocksdb::{ColumnFamilyDescriptor, Direction, WriteBatch};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, CF, CF_PLUGIN_META},
    io::BlockHeight,
    plugins::PluginDbError::*,
    ser::{db_deserialize, db_serialize},
};

/// Index of a plugin to uniquely identify it
pub type PluginIdx = u32;

struct PluginsCol<'a> {
    db: &'a Db,
    cf_plugin_meta: &'a CF,
}

/// Plugin metadata
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct PluginMeta {
    /// Index of the plugin to identify it in the database
    pub plugin_idx: PluginIdx,
    /// version string
    pub version: String,
    /// Last height the plugin was synced to
    pub sync_height: BlockHeight,
}

/// Runs plugins and writes the results to the DB
#[derive(Debug)]
pub struct PluginsWriter<'a> {
    col: PluginsCol<'a>,
}

/// Read data written by plugins from the DB.
#[derive(Debug)]
pub struct PluginsReader<'a> {
    col: PluginsCol<'a>,
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PluginDbError {
    /// Inconsistent DB: Plugin name is not UTF-8
    #[error("Inconsistent DB: Plugin name is not UTF-8: {0}: {1:?}")]
    PluginNameNotUtf8(String, Vec<u8>),
}

impl<'a> PluginsCol<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf_plugin_meta = db.cf(CF_PLUGIN_META)?;
        Ok(PluginsCol { db, cf_plugin_meta })
    }
}

impl<'a> PluginsWriter<'a> {
    /// Create a new [`PluginsWriter`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(PluginsWriter {
            col: PluginsCol::new(db)?,
        })
    }

    /// Write the plugin metadata
    pub fn write_meta(
        &self,
        batch: &mut WriteBatch,
        plugin_name: &str,
        plugin_meta: &PluginMeta,
    ) -> Result<()> {
        batch.put_cf(
            self.col.cf_plugin_meta,
            plugin_name,
            db_serialize(plugin_meta)?,
        );
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_PLUGIN_META,
            rocksdb::Options::default(),
        ));
    }
}

impl<'a> PluginsReader<'a> {
    /// Create a new [`PluginsReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(PluginsReader {
            col: PluginsCol::new(db)?,
        })
    }

    /// Read all plugin metas in the DB
    pub fn metas(&self) -> Result<Vec<(String, PluginMeta)>> {
        let iter = self.col.db.iterator(
            self.col.cf_plugin_meta,
            &[],
            Direction::Forward,
        );
        let mut metas = Vec::new();
        for meta in iter {
            let (plugin_name, ser_plugin_meta) = meta?;
            let plugin_name = String::from_utf8(plugin_name.into_vec())
                .map_err(|err| {
                    PluginNameNotUtf8(err.to_string(), err.into_bytes())
                })?;
            let plugin_meta = db_deserialize::<PluginMeta>(&ser_plugin_meta)?;
            metas.push((plugin_name, plugin_meta));
        }
        Ok(metas)
    }
}

impl std::fmt::Debug for PluginsCol<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PluginsCol")
            .field("db", &self.db)
            .field("cf_plugin_meta", &"..")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use rocksdb::WriteBatch;

    use crate::{
        db::Db,
        plugins::{PluginDbError, PluginMeta, PluginsReader, PluginsWriter},
    };

    #[test]
    fn test_plugin_metas() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--plugin_metas")?;
        let mut cfs = Vec::new();
        PluginsWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;

        let plugins_writer = PluginsWriter::new(&db)?;
        let plugins_reader = PluginsReader::new(&db)?;

        assert_eq!(plugins_reader.metas()?, vec![]);

        let plg1 = PluginMeta {
            plugin_idx: 0,
            sync_height: 0,
            version: "0.1".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg1", &plg1)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![("plg1".to_string(), plg1.clone())],
        );

        let plg2 = PluginMeta {
            plugin_idx: 1000,
            sync_height: 25,
            version: "0.2".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg2", &plg2)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![
                ("plg1".to_string(), plg1.clone()),
                ("plg2".to_string(), plg2.clone()),
            ],
        );

        let plg1_new = PluginMeta {
            plugin_idx: 0,
            sync_height: 1000,
            version: "0.4".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg1", &plg1_new)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![
                ("plg1".to_string(), plg1_new.clone()),
                ("plg2".to_string(), plg2.clone()),
            ],
        );

        let mut batch = WriteBatch::default();
        batch.put_cf(plugins_writer.col.cf_plugin_meta, b"\xff", b"");
        db.write_batch(batch)?;

        assert_eq!(
            plugins_reader
                .metas()
                .unwrap_err()
                .downcast::<PluginDbError>()?,
            PluginDbError::PluginNameNotUtf8(
                "invalid utf-8 sequence of 1 bytes from index 0".to_string(),
                vec![0xff],
            ),
        );

        Ok(())
    }
}
