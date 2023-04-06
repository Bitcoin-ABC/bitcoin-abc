// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikServer`].

use std::collections::HashMap;
use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::{Result, WrapErr};
use axum::{
    extract::{Path, Query},
    routing, Extension, Router,
};
use bitcoinsuite_core::block::BlockHash;
use bitcoinsuite_core::tx::TxId;
use chronik_db::io::BlockHeight;
use chronik_indexer::indexer::ChronikIndexer;
use chronik_proto::proto;
use hyper::server::conn::AddrIncoming;
use thiserror::Error;
use tokio::sync::RwLock;

use crate::{error::ReportError, handlers, protobuf::Protobuf};

type ChronikIndexerRef = Arc<RwLock<ChronikIndexer>>;

/// Params defining what and where to serve for [`ChronikServer`].
#[derive(Clone, Debug)]
pub struct ChronikServerParams {
    /// Host address (port + IP) where to serve Chronik at.
    pub hosts: Vec<SocketAddr>,
    /// Indexer to read data from
    pub indexer: ChronikIndexerRef,
}

/// Chronik HTTP server, holding all the data/handles required to serve an
/// instance.
#[derive(Debug)]
pub struct ChronikServer {
    server_builders: Vec<hyper::server::Builder<AddrIncoming>>,
    indexer: ChronikIndexerRef,
}

/// Errors for [`ChronikServer`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikServerError {
    /// Binding to host address failed
    #[error("Chronik failed binding to {0}: {1}")]
    FailedBindingAddress(SocketAddr, String),

    /// Serving Chronik failed
    #[error("Chronik failed serving: {0}")]
    ServingFailed(String),

    /// Query is neither a hex hash nor an integer string
    #[error("400: Not a hash or height: {0}")]
    NotHashOrHeight(String),

    /// Query is not a txid
    #[error("400: Not a txid: {0}")]
    NotTxId(String),

    /// Block not found in DB
    #[error("404: Block not found: {0}")]
    BlockNotFound(String),
}

use self::ChronikServerError::*;

impl ChronikServer {
    /// Binds the Chronik server on the given hosts
    pub fn setup(params: ChronikServerParams) -> Result<Self> {
        let server_builders = params
            .hosts
            .into_iter()
            .map(|host| {
                axum::Server::try_bind(&host).map_err(|err| {
                    FailedBindingAddress(host, err.to_string()).into()
                })
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(ChronikServer {
            server_builders,
            indexer: params.indexer,
        })
    }

    /// Serve a Chronik HTTP endpoint with the given parameters.
    pub async fn serve(self) -> Result<()> {
        let app = Self::make_router(self.indexer);
        let servers = self
            .server_builders
            .into_iter()
            .zip(std::iter::repeat(app))
            .map(|(server_builder, app)| {
                Box::pin(async move {
                    server_builder
                        .serve(app.into_make_service())
                        .await
                        .map_err(|err| ServingFailed(err.to_string()))
                })
            });
        let (result, _, _) = futures::future::select_all(servers).await;
        result?;
        Ok(())
    }

    fn make_router(indexer: ChronikIndexerRef) -> Router {
        Router::new()
            .route("/block/:hash_or_height", routing::get(handle_block))
            .route("/tx/:txid", routing::get(handle_tx))
            .route(
                "/script/:type/:payload/confirmed-txs",
                routing::get(handle_script_confirmed_txs),
            )
            .route(
                "/script/:type/:payload/history",
                routing::get(handle_script_history),
            )
            .route(
                "/script/:type/:payload/unconfirmed-txs",
                routing::get(handle_script_unconfirmed_txs),
            )
            .fallback(handlers::handle_not_found)
            .layer(Extension(indexer))
    }
}

async fn handle_block(
    Path(hash_or_height): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Block>, ReportError> {
    let indexer = indexer.read().await;
    let blocks = indexer.blocks()?;
    let db_block = if let Ok(hash) = hash_or_height.parse::<BlockHash>() {
        blocks.by_hash(&hash)?
    } else {
        let height = match hash_or_height.parse::<BlockHeight>() {
            // disallow leading zeros
            Ok(0) if hash_or_height.len() == 1 => 0,
            Ok(height) if !hash_or_height.starts_with('0') => height,
            _ => return Err(NotHashOrHeight(hash_or_height).into()),
        };
        blocks.by_height(height)?
    };
    let db_block = db_block.ok_or(BlockNotFound(hash_or_height))?;
    Ok(Protobuf(proto::Block {
        block_info: Some(proto::BlockInfo {
            hash: db_block.hash.to_vec(),
            prev_hash: db_block.prev_hash.to_vec(),
            height: db_block.height,
            n_bits: db_block.n_bits,
            timestamp: db_block.timestamp,
        }),
    }))
}

async fn handle_tx(
    Path(txid): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Tx>, ReportError> {
    let indexer = indexer.read().await;
    let txid = txid.parse::<TxId>().wrap_err(NotTxId(txid))?;
    Ok(Protobuf(indexer.txs().tx_by_id(txid)?))
}

async fn handle_script_confirmed_txs(
    Path((script_type, payload)): Path<(String, String)>,
    Query(query_params): Query<HashMap<String, String>>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::TxHistoryPage>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        handlers::handle_script_confirmed_txs(
            &script_type,
            &payload,
            &query_params,
            &indexer,
        )
        .await?,
    ))
}

async fn handle_script_history(
    Path((script_type, payload)): Path<(String, String)>,
    Query(query_params): Query<HashMap<String, String>>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::TxHistoryPage>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        handlers::handle_script_history(
            &script_type,
            &payload,
            &query_params,
            &indexer,
        )
        .await?,
    ))
}

async fn handle_script_unconfirmed_txs(
    Path((script_type, payload)): Path<(String, String)>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::TxHistoryPage>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        handlers::handle_script_unconfirmed_txs(
            &script_type,
            &payload,
            &indexer,
        )
        .await?,
    ))
}
