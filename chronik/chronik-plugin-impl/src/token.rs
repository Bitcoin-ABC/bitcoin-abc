// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for token related objects such as [`TokenTxEntry`] for plugins.

use bitcoinsuite_core::hash::Hashed;
use bitcoinsuite_slp::{
    structs::{GenesisInfo, TokenVariant},
    token_tx::TokenTxEntry,
    token_type::TokenType,
};
use pyo3::{prelude::*, types::PyDict};

use crate::util::to_bytes;

/// `token.py` module handles.
#[derive(Debug)]
pub struct TokenModule {
    cls_genesis_info: PyObject,
    cls_token_tx_entry: PyObject,
    cls_token: PyObject,
}

impl TokenModule {
    /// Import the `token.py` module
    pub fn import(py: Python<'_>) -> PyResult<Self> {
        let token_module = PyModule::import_bound(py, "chronik_plugin.token")?;
        Ok(TokenModule {
            cls_genesis_info: token_module.getattr("GenesisInfo")?.into(),
            cls_token_tx_entry: token_module.getattr("TokenTxEntry")?.into(),
            cls_token: token_module.getattr("Token")?.into(),
        })
    }

    /// Bridge a [`GenesisInfo`] to its Python equivalent.
    pub fn bridge_genesis_info(
        &self,
        py: Python<'_>,
        info: &GenesisInfo,
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("token_ticker", to_bytes(py, &info.token_ticker))?;
        kwargs.set_item("token_name", to_bytes(py, &info.token_name))?;
        kwargs.set_item(
            "mint_vault_scripthash",
            info.mint_vault_scripthash
                .as_ref()
                .map(|hash| to_bytes(py, hash.as_le_bytes())),
        )?;
        kwargs.set_item("url", to_bytes(py, &info.url))?;
        kwargs.set_item(
            "hash",
            info.hash.as_ref().map(|hash| to_bytes(py, hash)),
        )?;
        kwargs.set_item(
            "data",
            info.data.as_ref().map(|data| to_bytes(py, data)),
        )?;
        kwargs.set_item(
            "auth_pubkey",
            info.auth_pubkey.as_ref().map(|pubkey| to_bytes(py, pubkey)),
        )?;
        kwargs.set_item("decimals", info.decimals)?;

        self.cls_genesis_info.call_bound(py, (), Some(&kwargs))
    }

    /// Bridge the [`TokenTxEntry`] to its Python equivalent.
    pub fn bridge_token_tx_entry(
        &self,
        py: Python<'_>,
        entry: &TokenTxEntry,
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("token_id", entry.meta.token_id.to_string())?;
        kwargs.set_item(
            "token_protocol",
            match entry.meta.token_type {
                TokenType::Slp(_) => "SLP",
                TokenType::Alp(_) => "ALP",
            },
        )?;
        kwargs.set_item(
            "token_type",
            match entry.meta.token_type {
                TokenType::Slp(token_type) => token_type.to_u8(),
                TokenType::Alp(token_type) => token_type.to_u8(),
            },
        )?;
        kwargs.set_item(
            "tx_type",
            entry
                .tx_type
                .as_ref()
                .map(|tx_type| format!("{:?}", tx_type)),
        )?;
        kwargs.set_item(
            "group_token_id",
            entry.group_token_meta.map(|meta| meta.token_id.to_string()),
        )?;
        kwargs.set_item("is_invalid", entry.is_invalid)?;
        kwargs.set_item("actual_burn_amount", entry.actual_burn_amount)?;
        kwargs.set_item(
            "intentional_burn_amount",
            entry.intentional_burn_amount,
        )?;
        kwargs.set_item("burns_mint_batons", entry.burns_mint_batons)?;
        kwargs.set_item(
            "genesis_info",
            entry
                .genesis_info
                .as_ref()
                .map(|info| self.bridge_genesis_info(py, info))
                .transpose()?,
        )?;

        self.cls_token_tx_entry.call_bound(py, (), Some(&kwargs))
    }

    /// Bridge the token to a Python `Token` object, reusing some objects from
    /// `entry` for efficiency.
    pub fn bridge_token(
        &self,
        py: Python<'_>,
        entry: &PyObject,
        entry_idx: usize,
        token_variant: TokenVariant,
    ) -> PyResult<PyObject> {
        let kwargs = PyDict::new_bound(py);
        kwargs.set_item("token_id", entry.getattr(py, "token_id")?)?;
        kwargs
            .set_item("token_protocol", entry.getattr(py, "token_protocol")?)?;
        kwargs.set_item("token_type", entry.getattr(py, "token_type")?)?;
        kwargs.set_item("entry_idx", entry_idx)?;
        kwargs.set_item("amount", token_variant.amount())?;
        kwargs.set_item("is_mint_baton", token_variant.is_mint_baton())?;

        self.cls_token.call_bound(py, (), Some(&kwargs))
    }
}
