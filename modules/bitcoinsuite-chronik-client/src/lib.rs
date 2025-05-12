// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
use std::fmt::Display;

use abc_rust_error::{Report, Result, WrapErr};
use bitcoinsuite_core::hash::{Hashed, Sha256d};
use bytes::Bytes;
pub use chronik_proto::proto;
use chronik_proto::proto::WsSubScript;
use futures_util::{SinkExt, StreamExt};
use prost::Message;
use reqwest::{header::CONTENT_TYPE, StatusCode};
use thiserror::Error;
use tokio_tungstenite::WebSocketStream;
use tungstenite::protocol::Message as WsMessage;

use crate::ChronikClientError::*;

pub mod handler;
pub mod test_runner;

#[derive(Debug, Clone)]
pub struct ChronikClient {
    http_url: String,
    ws_url: String,
    client: reqwest::Client,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ScriptType {
    Other,
    P2pk,
    P2pkh,
    P2sh,
}

#[derive(Debug, Clone)]
pub struct ScriptEndpoint<'payload, 'client> {
    script_type: ScriptType,
    script_payload: &'payload [u8],
    client: &'client ChronikClient,
}

#[derive(Debug, Clone)]
pub struct PluginEndpoint<'payload, 'client> {
    plugin_name: &'payload str,
    payload: &'payload [u8],
    client: &'client ChronikClient,
}

#[derive(Debug, Error, PartialEq)]
pub enum ChronikClientError {
    #[error("`url` cannot end with '/', got: {0}")]
    CannotHaveTrailingSlashInUrl(String),

    #[error("`url` must start with 'https://' or 'http://', got: {0}")]
    InvalidUrlSchema(String),

    #[error("HTTP request error")]
    HttpRequestError,

    #[error("Unexpected text message: {0}")]
    UnexpectedWsTextMessage(String),

    #[error("Chronik error ({status_code}): {error_msg}")]
    ChronikError {
        status_code: StatusCode,
        error: proto::Error,
        error_msg: String,
    },

    #[error("Invalid protobuf: {0}")]
    InvalidProtobuf(String),
}
pub struct WsEndpoint {
    pub ws: WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    pub subs: WsSubscriptions,
}

#[derive(Debug, Clone, Default)]
pub struct WsSubscriptions {
    pub scripts: Vec<WsSubScript>,
    pub tokens: Vec<String>,
    pub lokad_ids: Vec<String>,
    pub blocks: bool,
}

impl ChronikClient {
    pub fn new(url: String) -> Result<Self> {
        if url.ends_with('/') {
            return Err(CannotHaveTrailingSlashInUrl(url).into());
        }
        let ws_url = if url.starts_with("https://") {
            "wss://".to_string() + url.strip_prefix("https://").unwrap()
        } else if url.starts_with("http://") {
            "ws://".to_string() + url.strip_prefix("http://").unwrap()
        } else {
            return Err(InvalidUrlSchema(url).into());
        };
        let ws_url = ws_url + "/ws";
        Ok(ChronikClient {
            http_url: url,
            ws_url,
            client: reqwest::Client::new(),
        })
    }

    pub fn ws_url(&self) -> &str {
        &self.ws_url
    }

    pub async fn broadcast_tx(
        &self,
        raw_tx: Vec<u8>,
        skip_token_checks: bool,
    ) -> Result<proto::BroadcastTxResponse> {
        let request = proto::BroadcastTxRequest {
            raw_tx,
            skip_token_checks,
        };
        self._post("/broadcast-tx", &request).await
    }

    pub async fn broadcast_txs(
        &self,
        raw_txs: Vec<Vec<u8>>,
        skip_token_checks: bool,
    ) -> Result<proto::BroadcastTxsResponse> {
        let request = proto::BroadcastTxsRequest {
            raw_txs,
            skip_token_checks,
        };
        self._post("/broadcast-txs", &request).await
    }

    pub async fn blockchain_info(&self) -> Result<proto::BlockchainInfo> {
        self._get("/blockchain-info").await
    }

    pub async fn block_by_height(&self, height: i32) -> Result<proto::Block> {
        self._get(&format!("/block/{}", height)).await
    }

    pub async fn block_by_hash(&self, hash: &Sha256d) -> Result<proto::Block> {
        self._get(&format!("/block/{}", hash.hex_be())).await
    }

    pub async fn blocks(
        &self,
        start_height: i32,
        end_height: i32,
    ) -> Result<Vec<proto::BlockInfo>> {
        let blocks: proto::Blocks = self
            ._get(&format!("/blocks/{}/{}", start_height, end_height))
            .await?;
        Ok(blocks.blocks)
    }

    pub async fn chronik_info(&self) -> Result<proto::ChronikInfo> {
        self._get("/chronik-info").await
    }

    pub async fn tx(&self, txid: &Sha256d) -> Result<proto::Tx> {
        self._get(&format!("/tx/{}", txid.hex_be())).await
    }

    pub async fn raw_tx(&self, txid: &Sha256d) -> Result<Bytes> {
        Ok(self
            ._get::<proto::RawTx>(&format!("/raw-tx/{}", txid.hex_be()))
            .await?
            .raw_tx
            .into())
    }

    pub async fn block_txs_by_height(
        &self,
        height: i32,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self._get(&format!("/block-txs/{}?page={}", height, page))
            .await
    }

    pub async fn block_txs_by_height_with_page_size(
        &self,
        height: i32,
        page: usize,
        page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        self._get(&format!(
            "/block-txs/{}?page={}&page_size={}",
            height, page, page_size
        ))
        .await
    }

    pub async fn block_txs_by_hash(
        &self,
        hash: &Sha256d,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self._get(&format!("/block-txs/{}?page={}", hash.hex_be(), page))
            .await
    }

    pub async fn block_txs_by_hash_with_page_size(
        &self,
        hash: &Sha256d,
        page: usize,
        page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        self._get(&format!(
            "/block-txs/{}?page={}&page_size={}",
            hash.hex_be(),
            page,
            page_size
        ))
        .await
    }

    pub async fn validate_tx(&self, raw_tx: Vec<u8>) -> Result<proto::Tx> {
        self._post("/validate-tx", &proto::RawTx { raw_tx }).await
    }

    pub async fn token(&self, token_id: &Sha256d) -> Result<proto::TokenInfo> {
        self._get(&format!("/token/{}", token_id.hex_be())).await
    }

    pub fn script<'payload, 'client>(
        &'client self,
        script_type: ScriptType,
        script_payload: &'payload [u8],
    ) -> ScriptEndpoint<'payload, 'client> {
        ScriptEndpoint {
            script_type,
            script_payload,
            client: self,
        }
    }

    pub fn plugin<'payload, 'client>(
        &'client self,
        plugin_name: &'payload str,
        payload: &'payload [u8],
    ) -> PluginEndpoint<'payload, 'client> {
        PluginEndpoint {
            plugin_name,
            payload,
            client: self,
        }
    }

    async fn _post<
        MRequest: prost::Message,
        MResponse: prost::Message + Default,
    >(
        &self,
        url_suffix: &str,
        request: &MRequest,
    ) -> Result<MResponse> {
        let response = self
            .client
            .post(format!("{}{}", self.http_url, url_suffix))
            .header(CONTENT_TYPE, "application/x-protobuf")
            .body(request.encode_to_vec())
            .send()
            .await
            .wrap_err(HttpRequestError)?;
        Self::_handle_response(response).await
    }

    pub async fn ws(&self) -> Result<WsEndpoint> {
        let (ws, response) =
            tokio_tungstenite::connect_async(&self.ws_url).await?;

        if response.status()
            != tungstenite::http::StatusCode::SWITCHING_PROTOCOLS
        {
            abc_rust_error::bail!(
                "WebSocket connection failed: expected status 101 (Switching \
                 Protocols), got {}",
                response.status()
            )
        }

        Ok(WsEndpoint {
            ws,
            subs: WsSubscriptions::default(),
        })
    }

    async fn _get<MResponse: prost::Message + Default>(
        &self,
        url_suffix: &str,
    ) -> Result<MResponse> {
        let response = self
            .client
            .get(format!("{}{}", self.http_url, url_suffix))
            .header(CONTENT_TYPE, "application/x-protobuf")
            .send()
            .await
            .wrap_err(HttpRequestError)?;
        Self::_handle_response(response).await
    }

    async fn _handle_response<MResponse: prost::Message + Default>(
        response: reqwest::Response,
    ) -> Result<MResponse> {
        use prost::Message as _;
        let status_code = response.status();
        if status_code != StatusCode::OK {
            let data = response.bytes().await?;
            let error = proto::Error::decode(data.as_ref())
                .wrap_err_with(|| InvalidProtobuf(hex::encode(&data)))?;
            return Err(ChronikError {
                status_code,
                error_msg: error.msg.clone(),
                error,
            }
            .into());
        }
        let bytes = response.bytes().await.wrap_err(HttpRequestError)?;
        let response = MResponse::decode(bytes.as_ref())
            .wrap_err_with(|| InvalidProtobuf(hex::encode(&bytes)))?;
        Ok(response)
    }
}

impl ScriptEndpoint<'_, '_> {
    pub async fn history_with_page_size(
        &self,
        page: usize,
        page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/script/{}/{}/history?page={}&page_size={}",
                self.script_type,
                hex::encode(self.script_payload),
                page,
                page_size,
            ))
            .await
    }

    pub async fn history(&self, page: usize) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/script/{}/{}/history?page={}",
                self.script_type,
                hex::encode(self.script_payload),
                page,
            ))
            .await
    }

    pub async fn confirmed_txs(
        &self,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/script/{}/{}/confirmed-txs?page={}",
                self.script_type,
                hex::encode(self.script_payload),
                page,
            ))
            .await
    }

    pub async fn unconfirmed_txs(
        &self,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/script/{}/{}/unconfirmed-txs?page={}",
                self.script_type,
                hex::encode(self.script_payload),
                page,
            ))
            .await
    }

    pub async fn utxos(&self) -> Result<Vec<proto::ScriptUtxo>> {
        let utxos = self
            .client
            ._get::<proto::ScriptUtxos>(&format!(
                "/script/{}/{}/utxos",
                self.script_type,
                hex::encode(self.script_payload),
            ))
            .await?;
        Ok(utxos.utxos)
    }
}

impl PluginEndpoint<'_, '_> {
    pub async fn history_with_page_size(
        &self,
        page: usize,
        page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/plugin/{}/{}/history?page={}&page_size={}",
                self.plugin_name,
                hex::encode(self.payload),
                page,
                page_size,
            ))
            .await
    }

    pub async fn history(&self, page: usize) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/plugin/{}/{}/history?page={}",
                self.plugin_name,
                hex::encode(self.payload),
                page,
            ))
            .await
    }

    pub async fn confirmed_txs(
        &self,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/plugin/{}/{}/confirmed-txs?page={}",
                self.plugin_name,
                hex::encode(self.payload),
                page,
            ))
            .await
    }

    pub async fn unconfirmed_txs(
        &self,
        page: usize,
    ) -> Result<proto::TxHistoryPage> {
        self.client
            ._get(&format!(
                "/plugin/{}/{}/unconfirmed-txs?page={}",
                self.plugin_name,
                hex::encode(self.payload),
                page,
            ))
            .await
    }

    pub async fn utxos(&self) -> Result<Vec<proto::ScriptUtxo>> {
        let utxos = self
            .client
            ._get::<proto::ScriptUtxos>(&format!(
                "/plugin/{}/{}/utxos",
                self.plugin_name,
                hex::encode(self.payload),
            ))
            .await?;
        Ok(utxos.utxos)
    }
}

impl Display for ScriptType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let text = match self {
            ScriptType::Other => "other",
            ScriptType::P2pk => "p2pk",
            ScriptType::P2pkh => "p2pkh",
            ScriptType::P2sh => "p2sh",
        };
        write!(f, "{}", text)?;
        Ok(())
    }
}

impl WsEndpoint {
    pub async fn subscribe_to_blocks(&mut self) -> Result<(), Report> {
        let msg = proto::WsSub {
            is_unsub: false,
            sub_type: Some(proto::ws_sub::SubType::Blocks(
                proto::WsSubBlocks {},
            )),
        };
        self.ws
            .send(tokio_tungstenite::tungstenite::Message::Binary(
                Bytes::from(msg.encode_to_vec()),
            ))
            .await
            .wrap_err(HttpRequestError)?;
        self.subs.blocks = true;
        Ok(())
    }

    pub async fn unsubscribe_from_blocks(&mut self) -> Result<(), Report> {
        let msg = proto::WsSub {
            is_unsub: true,
            sub_type: Some(proto::ws_sub::SubType::Blocks(
                proto::WsSubBlocks {},
            )),
        };
        self.ws
            .send(tokio_tungstenite::tungstenite::Message::Binary(
                Bytes::from(msg.encode_to_vec()),
            ))
            .await
            .wrap_err(HttpRequestError)?;
        self.subs.blocks = false;

        Ok(())
    }

    pub async fn subscribe_to_script(
        &mut self,
        script_type: String,
        payload: Vec<u8>,
    ) -> Result<(), Report> {
        if !matches!(script_type.as_str(), "p2pkh" | "p2sh" | "p2pk" | "other")
        {
            return Err(Report::msg(format!(
                "Invalid scriptType: {}",
                script_type
            )));
        }

        let msg = proto::WsSub {
            is_unsub: false,
            sub_type: Some(proto::ws_sub::SubType::Script(
                proto::WsSubScript {
                    script_type: script_type.to_string(),
                    payload: payload.clone(),
                },
            )),
        };

        self.ws
            .send(tokio_tungstenite::tungstenite::Message::Binary(
                Bytes::from(msg.encode_to_vec()),
            ))
            .await
            .wrap_err(HttpRequestError)?;

        self.subs.scripts.push(WsSubScript {
            script_type: script_type.to_string(),
            payload,
        });

        Ok(())
    }

    pub async fn unsubscribe_from_script(
        &mut self,
        script_type: String,
        payload: Vec<u8>,
    ) -> Result<(), Report> {
        if !self
            .subs
            .scripts
            .iter()
            .any(|sub| sub.script_type == script_type && sub.payload == payload)
        {
            return Err(Report::msg(format!(
                "No existing sub at {}, {}",
                script_type,
                String::from_utf8_lossy(&payload)
            )));
        }

        let msg = proto::WsSub {
            is_unsub: true,
            sub_type: Some(proto::ws_sub::SubType::Script(
                proto::WsSubScript {
                    script_type: script_type.to_string(),
                    payload: payload.clone(),
                },
            )),
        };

        self.ws
            .send(tokio_tungstenite::tungstenite::Message::Binary(
                Bytes::from(msg.encode_to_vec()),
            ))
            .await
            .wrap_err(HttpRequestError)?;

        self.subs.scripts.retain(|sub| {
            sub.script_type != script_type || sub.payload != payload
        });

        Ok(())
    }

    pub async fn recv(&mut self) -> Result<Option<proto::WsMsg>, Report> {
        while let Some(msg) = self.ws.next().await {
            match msg {
                Ok(WsMessage::Binary(data)) => {
                    return Ok(Some(proto::WsMsg::decode(data)?))
                }
                Ok(WsMessage::Ping(data)) => {
                    self.ws.send(WsMessage::Pong(data)).await?;
                }
                Ok(WsMessage::Close(_)) => return Ok(None),
                Ok(WsMessage::Pong(_)) => {}
                Err(err) => return Err(err.into()),
                Ok(unexpected_message) => {
                    abc_rust_error::bail!(
                        "Unexpected WebSocket message type received {:?}",
                        unexpected_message
                    );
                }
            }
        }
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;

    use crate::{ChronikClient, ChronikClientError};

    #[test]
    fn test_constructor_trailing_slash() -> Result<()> {
        let url = "https://chronik.be.cash/xec/".to_string();
        let err = ChronikClient::new(url.clone())
            .unwrap_err()
            .downcast::<ChronikClientError>()?;
        assert_eq!(err, ChronikClientError::CannotHaveTrailingSlashInUrl(url));
        Ok(())
    }

    #[test]
    fn test_constructor_invalid_schema() -> Result<()> {
        let url = "soap://chronik.be.cash/xec".to_string();
        let err = ChronikClient::new(url.clone())
            .unwrap_err()
            .downcast::<ChronikClientError>()?;
        assert_eq!(err, ChronikClientError::InvalidUrlSchema(url));
        Ok(())
    }
}

#[macro_export]
macro_rules! assert_status_code_eq {
    ($result:expr, $expected_status:expr) => {
        match $result {
            Ok(_) => {
                panic!(
                    "Expected HTTP error response with status code {}, but \
                     the request succeeded",
                    $expected_status
                );
            }
            Err(report) => {
                let report_debug = format!("{:?}", report);

                let err =
                    report.downcast::<ChronikClientError>().expect(&format!(
                        "Expected a Chronik client error but got a different \
                         error {}",
                        report_debug
                    ));

                let status_code = match err {
                    ChronikClientError::ChronikError {
                        status_code, ..
                    } => status_code,
                    other => panic!(
                        "Expected a ChronikError with HTTP status code, but \
                         got different variant: {:?}",
                        other
                    ),
                };

                assert_eq!(
                    status_code, $expected_status,
                    "HTTP status code assertion failed: expected {}, received \
                     {}",
                    $expected_status, status_code
                );
            }
        }
    };
}
