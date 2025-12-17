use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::{get_service, MethodRouter},
    Extension, Json,
};
use futures::future::ready;
use tower_http::services::ServeDir;

use crate::{
    server::Server,
    server_error::{to_server_error, ServerError},
    server_primitives::{JsonBlocksResponse, JsonTxsResponse},
};

pub async fn blocks(
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(server.blocks().await.map_err(to_server_error)?))
}

pub async fn testnet_faucet(
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(
        server.testnet_faucet().await.map_err(to_server_error)?,
    ))
}

pub async fn tx(
    Path(hash): Path<String>,
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(server.tx(&hash).await.map_err(to_server_error)?))
}

pub async fn block(
    Path(hash): Path<String>,
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(server.block(&hash).await.map_err(to_server_error)?))
}

pub async fn address(
    Path(hash): Path<String>,
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(server.address(&hash).await.map_err(to_server_error)?))
}

pub async fn address_qr(
    Path(hash): Path<String>,
    server: Extension<Arc<Server>>,
) -> Result<impl IntoResponse, ServerError> {
    let qr_code = server.address_qr(&hash).await.map_err(to_server_error)?;
    Ok((StatusCode::OK, [("content-type", "image/png")], qr_code))
}

pub async fn block_height(
    Path(height): Path<u32>,
    server: Extension<Arc<Server>>,
) -> Result<Redirect, ServerError> {
    Ok(server.block_height(height).await.map_err(to_server_error)?)
}

pub async fn search(
    Path(query): Path<String>,
    server: Extension<Arc<Server>>,
) -> Result<Redirect, ServerError> {
    server.search(&query).await.map_err(to_server_error)
}

pub async fn data_blocks(
    Path((start_height, end_height)): Path<(i32, i32)>,
    server: Extension<Arc<Server>>,
) -> Result<Json<JsonBlocksResponse>, ServerError> {
    Ok(Json(
        server
            .data_blocks(start_height, end_height)
            .await
            .map_err(to_server_error)?,
    ))
}

pub async fn data_block_txs(
    Path((hash, page, page_size)): Path<(String, usize, usize)>,
    server: Extension<Arc<Server>>,
) -> Result<Json<JsonTxsResponse>, ServerError> {
    Ok(Json(
        server
            .data_block_txs(&hash, page, page_size)
            .await
            .map_err(to_server_error)?,
    ))
}

pub async fn data_address_txs(
    Path(hash): Path<String>,
    Query(query): Query<HashMap<String, String>>,
    server: Extension<Arc<Server>>,
) -> Result<Json<JsonTxsResponse>, ServerError> {
    Ok(Json(
        server
            .data_address_txs(&hash, query)
            .await
            .map_err(to_server_error)?,
    ))
}

pub async fn mempool(
    server: Extension<Arc<Server>>,
) -> Result<Html<String>, ServerError> {
    Ok(Html(server.mempool().await.map_err(to_server_error)?))
}

pub async fn data_mempool(
    server: Extension<Arc<Server>>,
) -> Result<Json<JsonTxsResponse>, ServerError> {
    Ok(Json(server.data_mempool().await.map_err(to_server_error)?))
}

pub fn serve_files(path: &std::path::Path) -> MethodRouter {
    get_service(ServeDir::new(path))
        .handle_error(|_| ready(StatusCode::INTERNAL_SERVER_ERROR))
}
