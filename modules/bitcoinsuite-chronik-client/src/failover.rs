// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::sync::atomic::AtomicUsize;

use abc_rust_error::{Report, Result, WrapErr};
use reqwest::header::CONTENT_TYPE;
use reqwest::{Client, StatusCode};

use crate::ChronikClientError::HttpRequestError;
use crate::{ChronikClientError, WsEndpoint, WsSubscriptions};

#[derive(Debug, Clone)]
pub struct Endpoint {
    pub url: String,
    pub ws_url: String,
}

// Handles the networking to Chronik `Endpoint`s, including cycling
// through both types of endpoints.
#[derive(Debug)]
pub struct FailoverProxy {
    pub endpoints: Vec<Endpoint>,
    pub working_index: AtomicUsize,
    client: Client,
}

impl FailoverProxy {
    pub fn new(urls: impl Into<Vec<String>>) -> Result<Self> {
        let urls = urls.into();

        if urls.is_empty() {
            return Err(Report::msg("Url array must not be empty"));
        }

        for url in &urls {
            if url.ends_with('/') {
                return Err(ChronikClientError::CannotHaveTrailingSlashInUrl(
                    url.clone(),
                )
                .into());
            }

            if !url.starts_with("https://") && !url.starts_with("http://") {
                return Err(
                    ChronikClientError::InvalidUrlSchema(url.clone()).into()
                );
            }
        }

        let endpoints = Self::append_ws_urls(urls);

        Ok(Self {
            endpoints,
            working_index: AtomicUsize::new(0),
            client: Client::new(),
        })
    }

    pub fn get_endpoint_array(&self) -> &[Endpoint] {
        &self.endpoints
    }

    pub fn derive_endpoint_index(&self, loop_index: usize) -> usize {
        (self
            .working_index
            .load(std::sync::atomic::Ordering::Relaxed)
            + loop_index)
            % self.endpoints.len()
    }

    pub fn set_working_index(&mut self, new_index: usize) {
        self.working_index
            .store(new_index, std::sync::atomic::Ordering::Relaxed);
    }

    // Converts an array of chronik http/https urls into websocket equivalents
    fn append_ws_urls(urls: Vec<String>) -> Vec<Endpoint> {
        urls.into_iter()
            .map(|url| {
                if url.starts_with("https://") {
                    Endpoint {
                        url: url.clone(),
                        ws_url: format!(
                            "wss://{}/ws",
                            &url["https://".len()..]
                        ),
                    }
                } else if url.starts_with("http://") {
                    Endpoint {
                        url: url.clone(),
                        ws_url: format!("ws://{}/ws", &url["http://".len()..]),
                    }
                } else {
                    panic!("Invalid url found in array: {}", url)
                }
            })
            .collect()
    }

    pub async fn post<
        MRequest: prost::Message,
        MResponse: prost::Message + Default,
    >(
        &self,
        url_suffix: &str,
        request: &MRequest,
    ) -> Result<MResponse> {
        for i in 0..self.endpoints.len() {
            let index = self.derive_endpoint_index(i);
            let this_proxy_url = &self.endpoints[index].url;

            let response = self
                .client
                .post(format!("{}{}", this_proxy_url, url_suffix))
                .header(CONTENT_TYPE, "application/x-protobuf")
                .body(request.encode_to_vec())
                .send()
                .await;

            match response {
                Ok(response) => {
                    self.working_index
                        .store(index, std::sync::atomic::Ordering::Relaxed);
                    let result = Self::_handle_response(response).await;
                    match &result {
                        Ok(_) => return result,
                        Err(e) => {
                            let err_str = e.to_string();
                            if err_str.contains(
                                "Unable to decode error msg, chronik server \
                                 is indexing or in error state",
                            ) || err_str.trim().ends_with(":")
                            {
                                continue;
                            }
                            return result;
                        }
                    }
                }
                Err(err) => {
                    if err.is_connect() || err.is_timeout() {
                        continue;
                    }

                    let err_string = err.to_string();
                    if err_string.contains(
                        "Unable to decode error msg, chronik server is \
                         indexing or in error state",
                    ) || err_string.trim().ends_with(":")
                    {
                        continue;
                    }

                    return Err(ChronikClientError::HttpRequestError.into());
                }
            }
        }
        Err(Report::msg("Error connecting to known Chronik instances"))
    }

    pub async fn get<MResponse: prost::Message + Default>(
        &self,
        url_suffix: &str,
    ) -> Result<MResponse> {
        let response = self
            .client
            .get(
                format!(
                    "{}{}",
                    self.endpoints[self
                        .working_index
                        .load(std::sync::atomic::Ordering::Relaxed)]
                    .url,
                    url_suffix
                )
                .as_str(),
            )
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
            let error = crate::proto::Error::decode(data.as_ref())
                .wrap_err_with(|| {
                    crate::ChronikClientError::InvalidProtobuf(hex::encode(
                        &data,
                    ))
                })?;
            return Err(crate::ChronikClientError::ChronikError {
                status_code,
                error_msg: error.msg.clone(),
                error,
            }
            .into());
        }
        let bytes = response.bytes().await.wrap_err(HttpRequestError)?;
        let response =
            MResponse::decode(bytes.as_ref()).wrap_err_with(|| {
                crate::ChronikClientError::InvalidProtobuf(hex::encode(&bytes))
            })?;
        Ok(response)
    }

    // TODO: Store and cycle through subscriptions
    pub async fn connect_ws(&self) -> Result<WsEndpoint> {
        for i in 0..self.endpoints.len() {
            let index = self.derive_endpoint_index(i);
            let this_proxy_url = &self.endpoints[index].ws_url;

            let (ws, response) =
                tokio_tungstenite::connect_async(this_proxy_url).await?;

            if response.status()
                != tungstenite::http::StatusCode::SWITCHING_PROTOCOLS
            {
                abc_rust_error::bail!(
                    "WebSocket connection failed: expected status 101 \
                     (Switching Protocols), got {}",
                    response.status()
                )
            }
            self.working_index
                .store(index, std::sync::atomic::Ordering::Relaxed);

            return Ok(WsEndpoint {
                ws,
                subs: WsSubscriptions::default(),
            });
        }

        Err(Report::msg("Error connecting to known Chronik websockets"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_new_empty_url_array() {
        let urls: Vec<String> = vec![];
        let result = FailoverProxy::new(urls);
        assert!(result.is_err());
        let err_str = result.unwrap_err().to_string();
        assert!(err_str.contains("Url array must not be empty"));
    }

    #[tokio::test]
    #[should_panic(expected = "Invalid url found in array: \
                               invalidschema://chronik.example.com")]
    async fn test_append_ws_urls_invalid_schema() {
        let urls = vec!["invalidschema://chronik.example.com".to_string()];
        FailoverProxy::append_ws_urls(urls);
    }

    #[tokio::test]
    async fn test_append_ws_urls() {
        let urls = vec![
            "https://chronik.be.cash/xec".to_string(),
            "https://chronik.fabien.cash".to_string(),
            "https://chronik2.fabien.cash".to_string(),
        ];
        let endpoints = FailoverProxy::append_ws_urls(urls);
        assert_eq!(endpoints.len(), 3);
        assert_eq!(endpoints[0].url, "https://chronik.be.cash/xec");
        assert_eq!(endpoints[0].ws_url, "wss://chronik.be.cash/xec/ws");
        assert_eq!(endpoints[1].url, "https://chronik.fabien.cash");
        assert_eq!(endpoints[1].ws_url, "wss://chronik.fabien.cash/ws");
        assert_eq!(endpoints[2].url, "https://chronik2.fabien.cash");
        assert_eq!(endpoints[2].ws_url, "wss://chronik2.fabien.cash/ws");
    }

    #[tokio::test]
    async fn test_append_ws_urls_mixed() {
        let urls = vec![
            "https://chronik.be.cash/xec".to_string(),
            "http://chronik.fabien.cash".to_string(),
            "https://chronik2.fabien.cash".to_string(),
        ];
        let endpoints = FailoverProxy::append_ws_urls(urls);
        assert_eq!(endpoints.len(), 3);
        assert_eq!(endpoints[0].url, "https://chronik.be.cash/xec");
        assert_eq!(endpoints[0].ws_url, "wss://chronik.be.cash/xec/ws");
        assert_eq!(endpoints[1].url, "http://chronik.fabien.cash");
        assert_eq!(endpoints[1].ws_url, "ws://chronik.fabien.cash/ws");
        assert_eq!(endpoints[2].url, "https://chronik2.fabien.cash");
        assert_eq!(endpoints[2].ws_url, "wss://chronik2.fabien.cash/ws");
    }

    #[tokio::test]
    async fn test_derive_endpoint_index() {
        let urls = vec![
            "https://chronik.be.cash/xec".to_string(),
            "http://chronik.fabien.cash".to_string(),
            "https://chronik2.fabien.cash".to_string(),
            "https://chronik3.fabien.cash".to_string(),
        ];
        let mut proxy = FailoverProxy::new(urls).unwrap();

        let index_order: Vec<usize> =
            (0..4).map(|i| proxy.derive_endpoint_index(i)).collect();
        assert_eq!(index_order, vec![0, 1, 2, 3]);

        proxy.set_working_index(3);
        let index_order: Vec<usize> =
            (0..4).map(|i| proxy.derive_endpoint_index(i)).collect();
        assert_eq!(index_order, vec![3, 0, 1, 2]);
    }

    #[tokio::test]
    async fn test_error_handling() {
        use chronik_proto::proto::BlockchainInfo;
        let urls = vec![
            "https://chronik1.alitayin.com".to_string(),
            "https://chronik2.alitayin.com".to_string(),
        ];
        let proxy = FailoverProxy::new(urls).unwrap();

        let result = proxy.get::<BlockchainInfo>("/blockchain-info").await;
        match result {
            Ok(_) => (), // Success case
            Err(e) => {
                assert!(!e.to_string().contains(
                    "Unable to decode error msg, chronik server is indexing \
                     or in error state"
                ));
            }
        }

        let result = proxy.get::<BlockchainInfo>("/blockchain-info").await;
        match result {
            Ok(_) => (), // Success case
            Err(e) => {
                assert!(!e.to_string().contains("connection refused"));
            }
        }
    }
}
