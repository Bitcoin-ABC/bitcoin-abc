// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikServer`].

use std::collections::HashMap;
use std::time::Duration;
use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::{Result, WrapErr};
use axum::{
    extract::{Path, Query, WebSocketUpgrade},
    response::IntoResponse,
    routing::{self, MethodFilter},
    Extension, Router,
};
use bitcoinsuite_core::tx::TxId;
use chronik_indexer::{
    indexer::{ChronikIndexer, Node},
    pause::PauseNotify,
};
use chronik_proto::proto;
use hyper::server::conn::AddrIncoming;
use thiserror::Error;
use tokio::sync::RwLock;

use crate::{
    error::ReportError, handlers, protobuf::Protobuf,
    ws::handle_subscribe_socket,
};

/// Ref-counted indexer with read or write access
pub type ChronikIndexerRef = Arc<RwLock<ChronikIndexer>>;
/// Ref-counted access to the bitcoind node
pub type NodeRef = Arc<Node>;
/// Ref-counted pause notifier for Chronik indexing
pub type PauseNotifyRef = Arc<PauseNotify>;

/// Settings to tune Chronik
#[derive(Clone, Debug)]
pub struct ChronikSettings {
    /// Duration between WebSocket pings initiated by Chronik.
    pub ws_ping_interval: Duration,
}

/// Params defining what and where to serve for [`ChronikServer`].
#[derive(Clone, Debug)]
pub struct ChronikServerParams {
    /// Host address (port + IP) where to serve Chronik at.
    pub hosts: Vec<SocketAddr>,
    /// Indexer to read data from
    pub indexer: ChronikIndexerRef,
    /// Access to the bitcoind node
    pub node: NodeRef,
    /// Handle for pausing/resuming indexing any updates from the node
    pub pause_notify: PauseNotifyRef,
    /// Settings to tune Chronik
    pub settings: ChronikSettings,
}

/// Chronik HTTP server, holding all the data/handles required to serve an
/// instance.
#[derive(Debug)]
pub struct ChronikServer {
    server_builders: Vec<hyper::server::Builder<AddrIncoming>>,
    indexer: ChronikIndexerRef,
    node: NodeRef,
    pause_notify: PauseNotifyRef,
    settings: ChronikSettings,
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
            node: params.node,
            pause_notify: params.pause_notify,
            settings: params.settings,
        })
    }

    /// Serve a Chronik HTTP endpoint with the given parameters.
    pub async fn serve(self) -> Result<()> {
        let app = Self::make_router(
            self.indexer,
            self.node,
            self.pause_notify,
            self.settings,
        );
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

    fn make_router(
        indexer: ChronikIndexerRef,
        node: NodeRef,
        pause_notify: PauseNotifyRef,
        settings: ChronikSettings,
    ) -> Router {
        Router::new()
            .route("/blockchain-info", routing::get(handle_blockchain_info))
            .route("/block/:hash_or_height", routing::get(handle_block))
            .route("/block-txs/:hash_or_height", routing::get(handle_block_txs))
            .route("/blocks/:start/:end", routing::get(handle_block_range))
            .route("/chronik-info", routing::get(handle_chronik_info))
            .route("/tx/:txid", routing::get(handle_tx))
            .route("/token/:txid", routing::get(handle_token_info))
            .route(
                "/validate-tx",
                routing::post(handle_validate_tx)
                    .on(MethodFilter::OPTIONS, handle_post_options),
            )
            .route(
                "/broadcast-tx",
                routing::post(handle_broadcast_tx)
                    .on(MethodFilter::OPTIONS, handle_post_options),
            )
            .route(
                "/broadcast-txs",
                routing::post(handle_broadcast_txs)
                    .on(MethodFilter::OPTIONS, handle_post_options),
            )
            .route("/raw-tx/:txid", routing::get(handle_raw_tx))
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
            .route(
                "/script/:type/:payload/utxos",
                routing::get(handle_script_utxos),
            )
            .route("/ws", routing::get(handle_ws))
            .route("/pause", routing::get(handle_pause))
            .route("/resume", routing::get(handle_resume))
            .fallback(handlers::handle_not_found)
            .layer(Extension(indexer))
            .layer(Extension(node))
            .layer(Extension(pause_notify))
            .layer(Extension(settings))
    }
}

async fn handle_blockchain_info(
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::BlockchainInfo>, ReportError> {
    let indexer = indexer.read().await;
    let blocks = indexer.blocks();
    Ok(Protobuf(blocks.blockchain_info()?))
}

async fn handle_chronik_info(
) -> Result<Protobuf<proto::ChronikInfo>, ReportError> {
    let this_chronik_version: String = env!("CARGO_PKG_VERSION").to_string();
    let chronik_info = proto::ChronikInfo {
        version: this_chronik_version,
    };
    Ok(Protobuf(chronik_info))
}

async fn handle_block_range(
    Path((start_height, end_height)): Path<(i32, i32)>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Blocks>, ReportError> {
    let indexer = indexer.read().await;
    let blocks = indexer.blocks();
    Ok(Protobuf(blocks.by_range(start_height, end_height)?))
}

async fn handle_block(
    Path(hash_or_height): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Block>, ReportError> {
    let indexer = indexer.read().await;
    let blocks = indexer.blocks();
    Ok(Protobuf(blocks.by_hash_or_height(hash_or_height)?))
}

async fn handle_block_txs(
    Path(hash_or_height): Path<String>,
    Query(query_params): Query<HashMap<String, String>>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::TxHistoryPage>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        handlers::handle_block_txs(hash_or_height, &query_params, &indexer)
            .await?,
    ))
}

async fn handle_tx(
    Path(txid): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::Tx>, ReportError> {
    let indexer = indexer.read().await;
    let txid = txid.parse::<TxId>().wrap_err(NotTxId(txid))?;
    Ok(Protobuf(indexer.txs().tx_by_id(txid)?))
}

async fn handle_token_info(
    Path(txid): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::TokenInfo>, ReportError> {
    let indexer = indexer.read().await;
    let txid = txid.parse::<TxId>().wrap_err(NotTxId(txid))?;
    Ok(Protobuf(indexer.txs().token_info(&txid)?))
}

async fn handle_broadcast_tx(
    Extension(indexer): Extension<ChronikIndexerRef>,
    Extension(node): Extension<NodeRef>,
    Protobuf(request): Protobuf<proto::BroadcastTxRequest>,
) -> Result<Protobuf<proto::BroadcastTxResponse>, ReportError> {
    let indexer = indexer.read().await;
    let txids = indexer
        .broadcast(node.as_ref())
        .broadcast_txs(&[request.raw_tx.into()], request.skip_token_checks)?;
    Ok(Protobuf(proto::BroadcastTxResponse {
        txid: txids[0].to_vec(),
    }))
}

async fn handle_broadcast_txs(
    Extension(indexer): Extension<ChronikIndexerRef>,
    Extension(node): Extension<NodeRef>,
    Protobuf(request): Protobuf<proto::BroadcastTxsRequest>,
) -> Result<Protobuf<proto::BroadcastTxsResponse>, ReportError> {
    let indexer = indexer.read().await;
    let txids = indexer.broadcast(node.as_ref()).broadcast_txs(
        &request
            .raw_txs
            .into_iter()
            .map(Into::into)
            .collect::<Vec<_>>(),
        request.skip_token_checks,
    )?;
    Ok(Protobuf(proto::BroadcastTxsResponse {
        txids: txids.into_iter().map(|txid| txid.to_vec()).collect(),
    }))
}

async fn handle_validate_tx(
    Extension(indexer): Extension<ChronikIndexerRef>,
    Extension(node): Extension<NodeRef>,
    Protobuf(raw_tx): Protobuf<proto::RawTx>,
) -> Result<Protobuf<proto::Tx>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        indexer
            .broadcast(node.as_ref())
            .validate_tx(raw_tx.raw_tx)?,
    ))
}

async fn handle_raw_tx(
    Path(txid): Path<String>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::RawTx>, ReportError> {
    let indexer = indexer.read().await;
    let txid = txid.parse::<TxId>().wrap_err(NotTxId(txid))?;
    Ok(Protobuf(indexer.txs().raw_tx_by_id(&txid)?))
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

async fn handle_script_utxos(
    Path((script_type, payload)): Path<(String, String)>,
    Extension(indexer): Extension<ChronikIndexerRef>,
) -> Result<Protobuf<proto::ScriptUtxos>, ReportError> {
    let indexer = indexer.read().await;
    Ok(Protobuf(
        handlers::handle_script_utxos(&script_type, &payload, &indexer).await?,
    ))
}

async fn handle_pause(
    Extension(pause_notify): Extension<PauseNotifyRef>,
) -> Result<Protobuf<proto::Empty>, ReportError> {
    pause_notify.pause()?;
    Ok(Protobuf(proto::Empty {}))
}

async fn handle_resume(
    Extension(pause_notify): Extension<PauseNotifyRef>,
) -> Result<Protobuf<proto::Empty>, ReportError> {
    pause_notify.resume()?;
    Ok(Protobuf(proto::Empty {}))
}

async fn handle_ws(
    ws: WebSocketUpgrade,
    Extension(indexer): Extension<ChronikIndexerRef>,
    Extension(settings): Extension<ChronikSettings>,
) -> impl IntoResponse {
    ws.on_upgrade(|ws| handle_subscribe_socket(ws, indexer, settings))
}

async fn handle_post_options(
) -> Result<axum::http::Response<axum::body::Body>, ReportError> {
    axum::http::Response::builder()
        .header("Allow", "OPTIONS, HEAD, POST")
        .body(axum::body::Body::empty())
        .map_err(|err| ReportError(err.into()))
}
