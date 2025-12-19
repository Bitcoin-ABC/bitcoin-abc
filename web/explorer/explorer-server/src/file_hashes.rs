// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::fs;
use std::path::PathBuf;
use std::sync::{LazyLock, OnceLock};

use abc_rust_error::Result;
use bitcoinsuite_core::hash::{Hashed, Sha256};
use thiserror::Error;

#[derive(Debug, Error, Clone)]
pub enum FileHashError {
    #[error("Failed to read file {path}: {message}")]
    ReadFile { path: PathBuf, message: String },
    #[error("BASE_DIR already initialized")]
    AlreadyInitialized,
    #[error("FileHashes not initialized. Call FileHashes::init() first.")]
    NotInitialized,
}

/// Global base directory for file hashes
static BASE_DIR: OnceLock<PathBuf> = OnceLock::new();

/// Initialize the base directory for file hashes
/// This must be called before any file hashes are computed
pub fn init_base_dir(base_dir: PathBuf) -> Result<()> {
    if BASE_DIR.set(base_dir).is_err() {
        return Err(FileHashError::AlreadyInitialized.into());
    }
    Ok(())
}

/// Get the base directory
/// Returns an error if not initialized
fn get_base_dir() -> Result<PathBuf> {
    BASE_DIR
        .get()
        .cloned()
        .ok_or_else(|| FileHashError::NotInitialized.into())
}

/// Get hash for a specific file path (e.g., "styles/index.css" or "common.js")
/// Returns the first 10 hex characters of the SHA256 hash
fn get_file_hash(file_path: &str) -> Result<String> {
    let base_dir = get_base_dir()?;
    let file_path = base_dir.join("code").join(file_path);
    let file_content =
        fs::read(&file_path).map_err(|e| FileHashError::ReadFile {
            path: file_path.clone(),
            message: e.to_string(),
        })?;

    let hash = Sha256::digest(&file_content);
    let hash_str = hash.hex_be();
    Ok(hash_str[..10].to_string())
}

/// Struct containing all file hashes used in templates
#[derive(Clone, Copy, Default)]
pub struct FileHashes {
    pub css_index: &'static str,
    pub js_common: &'static str,
    pub js_txs_render: &'static str,
    pub js_blocks: &'static str,
    pub js_block_txs: &'static str,
    pub js_timestamps: &'static str,
    pub js_address: &'static str,
    pub js_mempool_txs: &'static str,
}

static FILE_HASHES: LazyLock<Result<FileHashes, String>> =
    LazyLock::new(|| FileHashes::compute().map_err(|e| e.to_string()));

impl FileHashes {
    /// Get the cached FileHashes struct, computing it on first access
    pub fn get() -> Result<&'static FileHashes> {
        FILE_HASHES.as_ref().map_err(|err_msg| {
            // Convert the error string back to FileHashError, then to the
            // Result type
            FileHashError::ReadFile {
                path: PathBuf::from("code"),
                message: err_msg.clone(),
            }
            .into()
        })
    }

    /// Compute hashes for all known files
    /// This is only called once at startup
    fn compute() -> Result<Self> {
        // Compute hashes for all known files and convert to static strings
        // Using Box::leak is acceptable here since this is only called once
        // and the hashes are needed for the lifetime of the program
        let css_index =
            Box::leak(get_file_hash("styles/index.css")?.into_boxed_str());
        let js_common = Box::leak(get_file_hash("common.js")?.into_boxed_str());
        let js_txs_render =
            Box::leak(get_file_hash("txsRender.js")?.into_boxed_str());
        let js_blocks = Box::leak(get_file_hash("blocks.js")?.into_boxed_str());
        let js_block_txs =
            Box::leak(get_file_hash("blockTxs.js")?.into_boxed_str());
        let js_timestamps =
            Box::leak(get_file_hash("timestamps.js")?.into_boxed_str());
        let js_address =
            Box::leak(get_file_hash("address.js")?.into_boxed_str());
        let js_mempool_txs =
            Box::leak(get_file_hash("mempoolTxs.js")?.into_boxed_str());

        Ok(FileHashes {
            css_index,
            js_common,
            js_txs_render,
            js_blocks,
            js_block_txs,
            js_timestamps,
            js_address,
            js_mempool_txs,
        })
    }
}
