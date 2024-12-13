// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::str::FromStr;
use std::{net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    hash::{Hashed, Sha256},
    tx::TxId,
};
use futures::future;
use itertools::izip;
use karyon_jsonrpc::{RPCError, RPCMethod, RPCService, Server};
use karyon_net::{Addr, Endpoint};
use rustls::pki_types::{
    pem::PemObject,
    {CertificateDer, PrivateKeyDer},
};
use serde_json::{json, Value};
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
    indexer: ChronikIndexerRef,
    node: NodeRef,
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

struct ChronikElectrumRPCBlockchainEndpoint {
    indexer: ChronikIndexerRef,
    node: NodeRef,
}

impl ChronikElectrumServer {
    /// Binds the Chronik server on the given hosts
    pub fn setup(params: ChronikElectrumServerParams) -> Result<Self> {
        Ok(ChronikElectrumServer {
            hosts: params.hosts,
            indexer: params.indexer,
            node: params.node,
            tls_cert_path: params.tls_cert_path,
            tls_privkey_path: params.tls_privkey_path,
        })
    }

    /// Start the Chronik electrum server
    pub async fn serve(self) -> Result<()> {
        // The behavior is to bind the endpoint name to its method name like so:
        // endpoint.method as the name of the RPC
        let server_endpoint = Arc::new(ChronikElectrumRPCServerEndpoint {});
        let blockchain_endpoint =
            Arc::new(ChronikElectrumRPCBlockchainEndpoint {
                indexer: self.indexer,
                node: self.node,
            });

        let tls_cert_path = self.tls_cert_path.clone();
        let tls_privkey_path = self.tls_privkey_path.clone();

        let servers = izip!(
            self.hosts,
            std::iter::repeat(server_endpoint),
            std::iter::repeat(blockchain_endpoint),
            std::iter::repeat(tls_cert_path),
            std::iter::repeat(tls_privkey_path)
        )
        .map(
            |(
                (host, protocol),
                server_endpoint,
                blockchain_endpoint,
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
                        .service(blockchain_endpoint)
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

impl RPCService for ChronikElectrumRPCBlockchainEndpoint {
    fn name(&self) -> String {
        "blockchain".to_string()
    }

    fn get_method(&self, name: &str) -> Option<RPCMethod<'_>> {
        match name {
            "transaction.get" => Some(Box::new(move |params: Value| {
                Box::pin(self.transaction_get(params))
            })),
            _ => None,
        }
    }
}

/// Get a mandatory JSONRPC param by index or by name.
macro_rules! get_param {
    ($params:expr, $index:expr, $key:expr) => {{
        match $params {
            Value::Array(ref arr) => Ok(arr
                .get($index)
                .ok_or(RPCError::InvalidParams(concat!(
                    "Missing mandatory '",
                    $key,
                    "' parameter"
                )))?
                .clone()),
            Value::Object(ref obj) => match obj.get($key) {
                Some(value) => Ok(value.clone()),
                None => Err(RPCError::InvalidParams(concat!(
                    "Missing mandatory '",
                    $key,
                    "' parameter"
                ))),
            },
            _ => Err(RPCError::InvalidParams(
                "'params' must be an array or an object",
            )),
        }
    }};
}

/// Get an optional JSONRPC param by index or by name, return the
/// provided default if the param not specified.
macro_rules! get_optional_param {
    ($params:expr, $index:expr, $key:expr, $default:expr) => {{
        match $params {
            Value::Array(ref arr) => match arr.get($index) {
                Some(val) => Ok(val.clone()),
                None => Ok($default),
            },
            Value::Object(ref obj) => match obj.get($key) {
                Some(value) => Ok(value.clone()),
                None => Ok($default),
            },
            _ => Err(RPCError::InvalidParams(
                "'params' must be an array or an object",
            )),
        }
    }};
}

impl ChronikElectrumRPCBlockchainEndpoint {
    async fn transaction_get(&self, params: Value) -> Result<Value, RPCError> {
        let txid_hex = get_param!(params, 0, "txid")?;
        let verbose =
            get_optional_param!(params, 1, "verbose", Value::Bool(false))?;
        let txid_hex = match txid_hex {
            Value::String(s) => Ok(s),
            _ => Err(RPCError::InvalidParams(
                "'txid' must be a hexadecimal string",
            )),
        }?;
        let txid = TxId::from_str(&txid_hex)
            .or(Err(RPCError::InvalidParams("Failed to parse txid")))?;

        let verbose = match verbose {
            Value::Bool(v) => Ok(v),
            _ => Err(RPCError::InvalidParams("'verbose' must be a boolean")),
        }?;

        let indexer = self.indexer.read().await;
        let query_tx = indexer.txs(&self.node);
        let raw_tx = hex::encode(
            query_tx
                .raw_tx_by_id(&txid)
                .or(Err(RPCError::InvalidRequest("Unknown transaction id")))?
                .raw_tx,
        );
        if !verbose {
            return Ok(Value::String(raw_tx));
        }

        let tx = query_tx
            .tx_by_id(txid)
            // The following error should be unreachable, unless raw_tx_by_id
            // and tx_by_id are inconsistent
            .or(Err(RPCError::InvalidRequest("Unknown transaction id")))?;
        let blockchaininfo = indexer.blocks(&self.node).blockchain_info();
        if blockchaininfo.is_err() {
            return Err(RPCError::InternalError);
        }
        if tx.block.is_none() {
            // mempool transaction
            return Ok(json!({
                "confirmations": 0,
                "hash": txid_hex,
                "hex": raw_tx,
                "time": tx.time_first_seen,
            }));
        }
        let block = tx.block.unwrap();
        let blockhash = Sha256::from_le_slice(block.hash.as_ref()).unwrap();
        let confirmations =
            blockchaininfo.ok().unwrap().tip_height - block.height + 1;
        // TODO: more verbose fields, inputs, outputs
        //      (but for now only "confirmations" is used in Electrum ABC)
        Ok(json!({
            "blockhash": blockhash.hex_be(),
            "blocktime": block.timestamp,
            "confirmations": confirmations,
            "hash": txid_hex,
            "hex": raw_tx,
            "time": tx.time_first_seen,
        }))
    }
}
