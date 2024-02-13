// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use rocksdb::ColumnFamilyDescriptor;

use crate::{
    db::{Db, CF, CF_META},
    ser::{db_deserialize, db_serialize},
};

/// Type for the version of the database, to let us know when we're outdated.
pub type SchemaVersion = u64;

/// Field in the `meta` cf storing the schema version.
pub const FIELD_SCHEMA_VERSION: &[u8] = b"SCHEMA_VERSION";

/// Field in the `meta` cf storing whether Chronik had the token index enabled
pub const FIELD_TOKEN_INDEX_ENABLED: &[u8] = b"TOKEN_INDEX_ENABLED";

/// Write database metadata
pub struct MetadataWriter<'a> {
    cf: &'a CF,
}

/// Read database metadata
pub struct MetadataReader<'a> {
    db: &'a Db,
    cf: &'a CF,
}

impl<'a> MetadataWriter<'a> {
    /// Create a writer to the database for metadata
    pub fn new(db: &'a Db) -> Result<Self> {
        let cf = db.cf(CF_META)?;
        Ok(MetadataWriter { cf })
    }

    /// Update the schema version of the database
    pub fn update_schema_version(
        &self,
        batch: &mut rocksdb::WriteBatch,
        schema_version: SchemaVersion,
    ) -> Result<()> {
        batch.put_cf(
            self.cf,
            FIELD_SCHEMA_VERSION,
            db_serialize(&schema_version)?,
        );
        Ok(())
    }

    /// Update the flag storing whether the token index is enabled in the DB
    pub fn update_is_token_index_enabled(
        &self,
        batch: &mut rocksdb::WriteBatch,
        is_token_index_enabled: bool,
    ) -> Result<()> {
        batch.put_cf(
            self.cf,
            FIELD_TOKEN_INDEX_ENABLED,
            db_serialize::<bool>(&is_token_index_enabled)?,
        );
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_META,
            rocksdb::Options::default(),
        ));
    }
}

impl std::fmt::Debug for MetadataWriter<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MetadataWriter {{ ... }}")
    }
}

impl<'a> MetadataReader<'a> {
    /// Create a reader from the database for metadata
    pub fn new(db: &'a Db) -> Result<Self> {
        let cf = db.cf(CF_META)?;
        Ok(MetadataReader { db, cf })
    }

    /// Read the schema version of the database
    pub fn schema_version(&self) -> Result<Option<SchemaVersion>> {
        match self.db.get(self.cf, FIELD_SCHEMA_VERSION)? {
            Some(ser_schema_version) => {
                Ok(Some(db_deserialize(&ser_schema_version)?))
            }
            None => Ok(None),
        }
    }

    /// Read whether the token index was enabled
    pub fn is_token_index_enabled(&self) -> Result<bool> {
        match self.db.get(self.cf, FIELD_TOKEN_INDEX_ENABLED)? {
            Some(ser_token_index) => {
                Ok(db_deserialize::<bool>(&ser_token_index)?)
            }
            // By default, the token index is enabled
            None => Ok(true),
        }
    }
}

impl std::fmt::Debug for MetadataReader<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "MetadataReader {{ ... }}")
    }
}
