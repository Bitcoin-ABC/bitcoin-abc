// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikServer`].

use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use axum::{extract::Path, routing, Extension, Router};
use chronik_indexer::indexer::ChronikIndexer;
use hyper::server::conn::AddrIncoming;
use thiserror::Error;
use tokio::sync::RwLock;

use crate::{error::ReportError, proto, protobuf::Protobuf};

type ChronikIndexerRef = Arc<RwLock<ChronikIndexer>>;

use crate::handlers::handle_not_found;

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
            .route("/block/:height", routing::get(handle_block))
            .fallback(handle_not_found)
            .layer(Extension(indexer))
    }
}

async fn handle_block(
    Path(height): Path<i32>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Block>, ReportError> {
    let indexer = indexer.read().await;
    let blocks = indexer.blocks()?;
    let db_block = blocks
        .by_height(height)?
        .ok_or_else(|| BlockNotFound(height.to_string()))?;
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
