// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use futures::future;
use karyon_jsonrpc::{RPCError, RPCMethod, RPCService, Server};
use karyon_net::{Addr, Endpoint};
use serde_json::Value;
use thiserror::Error;

use crate::{
    server::{ChronikIndexerRef, NodeRef},
    {electrum::ChronikElectrumServerError::*, electrum_codec::ElectrumCodec},
};

/// Params defining what and where to serve for [`ChronikElectrumServer`].
#[derive(Clone, Debug)]
pub struct ChronikElectrumServerParams {
    /// Host address (port + IP) where to serve the electrum server at.
    pub hosts: Vec<SocketAddr>,
    /// Indexer to read data from
    pub indexer: ChronikIndexerRef,
    /// Access to the bitcoind node
    pub node: NodeRef,
}

/// Chronik Electrum server, holding all the data/handles required to serve an
/// instance.
#[derive(Debug)]
pub struct ChronikElectrumServer {
    hosts: Vec<SocketAddr>,
    _indexer: ChronikIndexerRef,
    _node: NodeRef,
}

/// Errors for [`ChronikElectrumServer`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikElectrumServerError {
    /// Binding to host address failed
    #[error("Chronik Electrum failed binding to {0}: {1}")]
    FailedBindingAddress(SocketAddr, String),

    /// Serving Electrum failed
    #[error("Chronik Electrum failed serving: {0}")]
    ServingFailed(String),
}

struct ChronikElectrumRPCServerEndpoint {}

impl ChronikElectrumServer {
    /// Binds the Chronik server on the given hosts
    pub fn setup(params: ChronikElectrumServerParams) -> Result<Self> {
        Ok(ChronikElectrumServer {
            hosts: params.hosts,
            // FIXME below params are unused but will be used in the future
            _indexer: params.indexer,
            _node: params.node,
        })
    }

    /// Start the Chronik electrum server
    pub async fn serve(self) -> Result<()> {
        // The behavior is to bind the endpoint name to its method name like so:
        // endpoint.method as the name of the RPC
        let server_endpoint = Arc::new(ChronikElectrumRPCServerEndpoint {});

        let servers = self
            .hosts
            .into_iter()
            .zip(std::iter::repeat(server_endpoint))
            .map(|(host, server_endpoint)| {
                Box::pin(async move {
                    // Don't use the karyon Endpoint parsing as it doesn't
                    // appear to support IPv6.
                    let tcp_host =
                        Endpoint::Tcp(Addr::Ip(host.ip()), host.port());

                    let builder = Server::builder_with_json_codec(
                        tcp_host,
                        ElectrumCodec {},
                    )
                    .map_err(|err| {
                        FailedBindingAddress(host, err.to_string())
                    })?;
                    let server = builder
                        .service(server_endpoint)
                        .build()
                        .await
                        .map_err(|err| ServingFailed(err.to_string()))?;
                    server.start();

                    let () = future::pending().await;

                    Ok::<(), ChronikElectrumServerError>(())
                })
            });

        let (result, _, _) = futures::future::select_all(servers).await;
        result?;
        Ok(())
    }
}

impl RPCService for ChronikElectrumRPCServerEndpoint {
    fn name(&self) -> String {
        "server".to_string()
    }

    fn get_method(&self, name: &str) -> Option<RPCMethod<'_>> {
        match name {
            // TODO Create a macro to generate this or avoid duplicated code.
            "ping" => {
                Some(Box::new(move |params: Value| Box::pin(self.ping(params))))
            }
            _ => None,
        }
    }
}

impl ChronikElectrumRPCServerEndpoint {
    async fn ping(&self, _params: Value) -> Result<Value, RPCError> {
        Ok(Value::Null)
    }
}
