// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use futures::future;
use itertools::izip;
use karyon_jsonrpc::{RPCError, RPCMethod, RPCService, Server};
use karyon_net::{Addr, Endpoint};
use rustls::pki_types::{
    pem::PemObject,
    {CertificateDer, PrivateKeyDer},
};
use serde_json::Value;
use thiserror::Error;

use crate::{
    server::{ChronikIndexerRef, NodeRef},
    {electrum::ChronikElectrumServerError::*, electrum_codec::ElectrumCodec},
};

/// Chronik Electrum protocol
#[derive(Clone, Copy, Debug)]
pub enum ChronikElectrumProtocol {
    /// TCP
    Tcp,
    /// TLS
    Tls,
}

/// Params defining what and where to serve for [`ChronikElectrumServer`].
#[derive(Clone, Debug)]
pub struct ChronikElectrumServerParams {
    /// Host address (port + IP) where to serve the electrum server at.
    pub hosts: Vec<(SocketAddr, ChronikElectrumProtocol)>,
    /// Indexer to read data from
    pub indexer: ChronikIndexerRef,
    /// Access to the bitcoind node
    pub node: NodeRef,
    /// The TLS certificate chain file
    pub tls_cert_path: String,
    /// The TLS private key file
    pub tls_privkey_path: String,
}

/// Chronik Electrum server, holding all the data/handles required to serve an
/// instance.
#[derive(Debug)]
pub struct ChronikElectrumServer {
    hosts: Vec<(SocketAddr, ChronikElectrumProtocol)>,
    _indexer: ChronikIndexerRef,
    _node: NodeRef,
    tls_cert_path: String,
    tls_privkey_path: String,
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

    /// Chronik Electrum TLS invalid configuration
    #[error("Chronik Electrum TLS configuration is invalid: {0}")]
    InvalidTlsConfiguration(String),

    /// Chronik Electrum TLS configuration failed
    #[error("Chronik Electrum TLS configuration failed: {0}")]
    TlsConfigurationFailed(String),

    /// Missing certificate chain file
    #[error(
        "Chronik Electrum TLS configuration requires a certificate chain file \
         (see -chronikelectrumcert)"
    )]
    MissingCertificateFile,

    /// Certificate chain file not found
    #[error(
        "Chronik Electrum TLS configuration failed to open the certificate \
         chain file {0}: {1}"
    )]
    CertificateFileNotFound(String, String),

    /// Missing private key file
    #[error(
        "Chronik Electrum TLS configuration requires a private key file (see \
         -chronikelectrumprivkey)"
    )]
    MissingPrivateKeyFile,

    /// Private key file not found
    #[error(
        "Chronik Electrum TLS configuration failed to open the private key \
         file {0}, {1}"
    )]
    PrivateKeyFileNotFound(String, String),
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
            tls_cert_path: params.tls_cert_path,
            tls_privkey_path: params.tls_privkey_path,
        })
    }

    /// Start the Chronik electrum server
    pub async fn serve(self) -> Result<()> {
        // The behavior is to bind the endpoint name to its method name like so:
        // endpoint.method as the name of the RPC
        let server_endpoint = Arc::new(ChronikElectrumRPCServerEndpoint {});

        let tls_cert_path = self.tls_cert_path.clone();
        let tls_privkey_path = self.tls_privkey_path.clone();

        let servers = izip!(
            self.hosts,
            std::iter::repeat(server_endpoint),
            std::iter::repeat(tls_cert_path),
            std::iter::repeat(tls_privkey_path)
        )
        .map(
            |(
                (host, protocol),
                server_endpoint,
                tls_cert_path,
                tls_privkey_path,
            )| {
                Box::pin(async move {
                    let mut require_tls_config = false;
                    // Don't use the karyon Endpoint parsing as it doesn't
                    // appear to support IPv6.
                    let endpoint = match protocol {
                        ChronikElectrumProtocol::Tcp => {
                            Endpoint::Tcp(Addr::Ip(host.ip()), host.port())
                        }
                        ChronikElectrumProtocol::Tls => {
                            require_tls_config = true;
                            Endpoint::Tls(Addr::Ip(host.ip()), host.port())
                        }
                    };

                    let mut builder = Server::builder_with_json_codec(
                        endpoint,
                        ElectrumCodec {},
                    )
                    .map_err(|err| {
                        FailedBindingAddress(host, err.to_string())
                    })?;

                    if require_tls_config {
                        if tls_cert_path.is_empty() {
                            return Err(MissingCertificateFile);
                        }
                        if tls_privkey_path.is_empty() {
                            return Err(MissingPrivateKeyFile);
                        }

                        let certs: Vec<_> = CertificateDer::pem_file_iter(
                            tls_cert_path.as_str(),
                        )
                        .map_err(|err| {
                            CertificateFileNotFound(
                                tls_cert_path,
                                err.to_string(),
                            )
                        })?
                        .map(|cert| cert.unwrap())
                        .collect();
                        let private_key = PrivateKeyDer::from_pem_file(
                            tls_privkey_path.as_str(),
                        )
                        .map_err(|err| {
                            PrivateKeyFileNotFound(
                                tls_privkey_path,
                                err.to_string(),
                            )
                        })?;

                        let tls_config = rustls::ServerConfig::builder()
                            .with_no_client_auth()
                            .with_single_cert(certs, private_key)
                            .map_err(|err| {
                                InvalidTlsConfiguration(err.to_string())
                            })?;
                        builder =
                            builder.tls_config(tls_config).map_err(|err| {
                                TlsConfigurationFailed(err.to_string())
                            })?;
                    }

                    let server = builder
                        .service(server_endpoint)
                        .build()
                        .await
                        .map_err(|err| ServingFailed(err.to_string()))?;
                    server.start();

                    let () = future::pending().await;

                    Ok::<(), ChronikElectrumServerError>(())
                })
            },
        );

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
