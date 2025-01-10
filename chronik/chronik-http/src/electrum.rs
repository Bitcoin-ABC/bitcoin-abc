// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::{cmp, net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    hash::{Hashed, Sha256},
    tx::TxId,
};
use futures::future;
use itertools::izip;
use karyon_jsonrpc::{
    error::RPCError,
    net::{Addr, Endpoint},
    rpc_impl, rpc_method,
    server::ServerBuilder,
};
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

                    let mut builder = ServerBuilder::new_with_codec(
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

/// Enforce maximum number of parameters for a JSONRPC method
macro_rules! check_max_number_of_params {
    ($params:expr, $max_num_params:expr) => {
        let mut err_max =
            format!("Expected at most {} parameter", $max_num_params);
        if $max_num_params != 1 {
            err_max.push_str("s");
        }
        match $params {
            Value::Array(ref arr) => {
                if arr.len() > $max_num_params {
                    return Err(RPCError::InvalidParams(err_max));
                }
            }
            Value::Object(ref obj) => {
                if obj.len() > $max_num_params {
                    return Err(RPCError::InvalidParams(err_max));
                }
            }
            Value::Null => {
                if $max_num_params != 0 {
                    return Err(RPCError::InvalidParams(
                        "Missing required params".to_string(),
                    ));
                }
            }
            _ => {
                return Err(RPCError::InvalidParams(
                    "'params' must be an array or an object".to_string(),
                ))
            }
        };
    };
}

/// Get a mandatory JSONRPC param by index or by name.
macro_rules! get_param {
    ($params:expr, $index:expr, $key:expr) => {{
        match $params {
            Value::Array(ref arr) => Ok(arr
                .get($index)
                .ok_or(RPCError::InvalidParams(format!(
                    "Missing mandatory '{}' parameter",
                    $key
                )))?
                .clone()),
            Value::Object(ref obj) => match obj.get($key) {
                Some(value) => Ok(value.clone()),
                None => Err(RPCError::InvalidParams(format!(
                    "Missing mandatory '{}' parameter",
                    $key
                ))),
            },
            _ => Err(RPCError::InvalidParams(
                "'params' must be an array or an object".to_string(),
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
                "'params' must be an array or an object".to_string(),
            )),
        }
    }};
}

struct ChronikElectrumRPCServerEndpoint {}

struct ChronikElectrumRPCBlockchainEndpoint {
    indexer: ChronikIndexerRef,
    node: NodeRef,
}

#[rpc_impl(name = "server")]
impl ChronikElectrumRPCServerEndpoint {
    async fn ping(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 0);
        Ok(Value::Null)
    }
}

fn json_to_u31(num: Value, err_msg: &str) -> Result<i32, RPCError> {
    match num {
        Value::Number(n) => match n.as_i64() {
            Some(n) if n >= 0 => i32::try_from(n)
                .map_err(|_| RPCError::CustomError(1, err_msg.to_string())),
            _ => Err(RPCError::CustomError(1, err_msg.to_string())),
        },
        _ => Err(RPCError::CustomError(1, err_msg.to_string())),
    }
}

fn be_bytes_to_le_hex(hash: &[u8]) -> String {
    hex::encode(Sha256::from_be_slice(hash).unwrap().as_le_bytes())
}

#[rpc_impl(name = "blockchain")]
impl ChronikElectrumRPCBlockchainEndpoint {
    #[rpc_method(name = "block.header")]
    async fn block_header(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 2);
        let height =
            json_to_u31(get_param!(params, 0, "height")?, "Invalid height")?;
        let checkpoint_height = json_to_u31(
            get_optional_param!(params, 1, "cp_height", json!(0))?,
            "Invalid cp_height",
        )?;

        let indexer = self.indexer.read().await;
        let blocks = indexer.blocks(&self.node);

        if checkpoint_height > 0 && height > checkpoint_height {
            let tip_height = blocks
                .blockchain_info()
                .map_err(|_| RPCError::InternalError)?
                .tip_height;
            return Err(RPCError::CustomError(
                1,
                format!(
                    "header height {height} must be <= cp_height \
                     {checkpoint_height} which must be <= chain height \
                     {tip_height}"
                ),
            ));
        }

        let proto_header = blocks
            .header(height.to_string(), checkpoint_height)
            .await
            .map_err(|_| {
                RPCError::CustomError(
                    1,
                    format!("Height {height} is out of range"),
                )
            })?;
        if checkpoint_height == 0 {
            Ok(json!(hex::encode(proto_header.raw_header)))
        } else {
            let branch: Vec<String> = proto_header
                .branch
                .iter()
                .map(|h| be_bytes_to_le_hex(h))
                .collect();
            Ok(json!({
                "branch": branch,
                "header": hex::encode(proto_header.raw_header) ,
                "root": be_bytes_to_le_hex(&proto_header.root),
            }))
        }
    }

    #[rpc_method(name = "block.headers")]
    async fn block_headers(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 3);
        let start_height = json_to_u31(
            get_param!(params, 0, "start_height")?,
            "Invalid height",
        )?;
        let max_count = 2016;
        let mut count =
            json_to_u31(get_param!(params, 1, "count")?, "Invalid count")?;
        count = cmp::min(count, max_count);
        let checkpoint_height = json_to_u31(
            get_optional_param!(params, 2, "cp_height", json!(0))?,
            "Invalid cp_height",
        )?;

        let indexer = self.indexer.read().await;
        let blocks = indexer.blocks(&self.node);

        let end_height = start_height + count - 1;
        let tip_height = blocks
            .blockchain_info()
            .map_err(|_| RPCError::InternalError)?
            .tip_height;
        if checkpoint_height > 0
            && (end_height > checkpoint_height
                || checkpoint_height > tip_height)
        {
            return Err(RPCError::CustomError(
                1,
                format!(
                    "header height + (count - 1) {end_height} must be <= \
                     cp_height {checkpoint_height} which must be <= chain \
                     height {tip_height}"
                ),
            ));
        }

        if count == 0 {
            return Ok(json!({
                "count": 0,
                "hex": "",
                "max": max_count,
            }));
        }

        // The RPC may return less headers than requested when there aren't
        // enough blocks in the chain.
        count = cmp::min(count, tip_height - start_height + 1);
        let proto_headers = blocks
            .headers_by_range(
                start_height,
                start_height + count - 1,
                checkpoint_height,
            )
            .await
            .map_err(|_| RPCError::InternalError)?;
        let headers_hex = proto_headers
            .headers
            .iter()
            .map(|proto_header| hex::encode(&proto_header.raw_header))
            .collect::<String>();

        if checkpoint_height == 0 {
            Ok(json!({
                "count": count,
                "hex": headers_hex,
                "max": max_count,
            }))
        } else {
            let last_header = proto_headers
                .headers
                .last()
                .ok_or(RPCError::InternalError)?;
            let branch: Vec<String> = last_header
                .branch
                .iter()
                .map(|h| be_bytes_to_le_hex(h))
                .collect();
            Ok(json!({
                "branch": branch,
                "count": count,
                "hex": headers_hex,
                "max": max_count,
                "root": be_bytes_to_le_hex(&last_header.root),
            }))
        }
    }

    #[rpc_method(name = "transaction.get")]
    async fn transaction_get(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 2);
        let txid_hex = get_param!(params, 0, "txid")?;
        let txid = TxId::try_from(&txid_hex)
            .map_err(|err| RPCError::CustomError(1, err.to_string()))?;

        let verbose =
            get_optional_param!(params, 1, "verbose", Value::Bool(false))?;
        let verbose = match verbose {
            Value::Bool(v) => Ok(v),
            _ => Err(RPCError::CustomError(
                1,
                "Invalid verbose argument; expected boolean".to_string(),
            )),
        }?;

        let indexer = self.indexer.read().await;
        let query_tx = indexer.txs(&self.node);
        let unknown_txid_msg =
            "No transaction matching the requested hash was found".to_string();
        let raw_tx = hex::encode(
            query_tx
                .raw_tx_by_id(&txid)
                .or(Err(RPCError::CustomError(1, unknown_txid_msg.clone())))?
                .raw_tx,
        );
        if !verbose {
            return Ok(Value::String(raw_tx));
        }

        let tx = query_tx
            .tx_by_id(txid)
            // The following error should be unreachable, unless raw_tx_by_id
            // and tx_by_id are inconsistent
            .or(Err(RPCError::CustomError(1, unknown_txid_msg)))?;
        let blockchaininfo = indexer.blocks(&self.node).blockchain_info();
        if blockchaininfo.is_err() {
            return Err(RPCError::InternalError);
        }
        if tx.block.is_none() {
            // mempool transaction
            return Ok(json!({
                "confirmations": 0,
                "hash": txid.to_string(),
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
            "hash": txid.to_string(),
            "hex": raw_tx,
            "time": tx.time_first_seen,
        }))
    }

    #[rpc_method(name = "transaction.get_height")]
    async fn transaction_get_height(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);
        let txid_hex = get_param!(params, 0, "txid")?;
        let txid = TxId::try_from(&txid_hex)
            .map_err(|err| RPCError::CustomError(1, err.to_string()))?;

        let indexer = self.indexer.read().await;
        let query_tx = indexer.txs(&self.node);
        let tx = query_tx
            .tx_by_id(txid)
            .or(Err(RPCError::InvalidRequest("Unknown txid".to_string())))?;

        match tx.block {
            Some(block) => Ok(json!(block.height)),
            None => Ok(json!(0)), // mempool transaction
        }
    }
}
