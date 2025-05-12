// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::{cmp, net::SocketAddr, sync::Arc};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    hash::{Hashed, Sha256, Sha256d},
    tx::TxId,
};
use bytes::Bytes;
use chronik_bridge::ffi;
use chronik_db::group::GroupMember;
use chronik_indexer::{merkle::MerkleTree, query::MAX_HISTORY_PAGE_SIZE};
use chronik_proto::proto::{Tx, TxHistoryPage};
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
use versions::Versioning;

use crate::{
    server::{ChronikIndexerRef, NodeRef},
    {electrum::ChronikElectrumServerError::*, electrum_codec::ElectrumCodec},
};

/// Protocol version implemented by this server
pub const ELECTRUM_PROTOCOL_VERSION: &str = "1.4";

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
    /// Maximum transaction history length
    pub max_history: u32,
    /// Server donation address
    pub donation_address: String,
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
    max_history: u32,
    donation_address: String,
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
            max_history: params.max_history,
            donation_address: params.donation_address,
        })
    }

    /// Start the Chronik electrum server
    pub async fn serve(self) -> Result<()> {
        // The behavior is to bind the endpoint name to its method name like so:
        // endpoint.method as the name of the RPC
        let server_endpoint = Arc::new(ChronikElectrumRPCServerEndpoint {
            donation_address: self.donation_address,
        });
        let blockchain_endpoint =
            Arc::new(ChronikElectrumRPCBlockchainEndpoint {
                indexer: self.indexer,
                node: self.node,
                max_history: self.max_history,
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

struct ChronikElectrumRPCServerEndpoint {
    donation_address: String,
}

struct ChronikElectrumRPCBlockchainEndpoint {
    indexer: ChronikIndexerRef,
    node: NodeRef,
    max_history: u32,
}

#[rpc_impl(name = "server")]
impl ChronikElectrumRPCServerEndpoint {
    async fn donation_address(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 0);
        Ok(json!(self.donation_address))
    }

    async fn ping(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 0);
        Ok(Value::Null)
    }

    async fn version(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 2);
        let _client_name =
            get_optional_param!(params, 0, "client_name", json!(""))?;
        let client_protocol_versions =
            get_optional_param!(params, 1, "protocol_version", json!("1.4"))?;
        let unsup_version_err = RPCError::CustomError(
            1,
            "Unsupported protocol version".to_string(),
        );
        match client_protocol_versions {
            Value::String(version_string) => {
                if version_string != ELECTRUM_PROTOCOL_VERSION {
                    return Err(unsup_version_err);
                }
            }
            Value::Array(arr) => {
                if arr.len() != 2 {
                    return Err(unsup_version_err);
                }
                let bad_version_err = || {
                    RPCError::CustomError(
                        1,
                        format!("Bad version tuple: {arr:?}"),
                    )
                };
                let min_version = Versioning::new(
                    arr[0].as_str().ok_or_else(bad_version_err)?,
                )
                .ok_or_else(bad_version_err)?;
                let max_version = Versioning::new(
                    arr[1].as_str().ok_or_else(bad_version_err)?,
                )
                .ok_or_else(bad_version_err)?;
                // Only allow versions in the correct order
                if min_version > max_version {
                    return Err(bad_version_err());
                }
                let target_version =
                    Versioning::new(ELECTRUM_PROTOCOL_VERSION).unwrap();
                if target_version < min_version || target_version > max_version
                {
                    return Err(unsup_version_err);
                }
            }
            _ => {
                return Err(unsup_version_err);
            }
        };
        let version_number = ffi::format_full_version();
        let server_version = format!("Bitcoin ABC {version_number}");
        Ok(json!([server_version, ELECTRUM_PROTOCOL_VERSION]))
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

fn get_scripthash_balance(
    history: TxHistoryPage,
    scripthash: Sha256,
) -> (i64, i64) {
    let mut confirmed: i64 = 0;
    let mut unconfirmed: i64 = 0;

    for tx in history.txs.iter() {
        let is_mempool = tx.block.is_none();
        for outp in tx.outputs.iter() {
            if Sha256::digest(&outp.output_script) != scripthash {
                continue;
            }
            if is_mempool {
                unconfirmed += outp.sats;
            } else {
                confirmed += outp.sats;
            }
        }
        for inp in tx.inputs.iter() {
            if Sha256::digest(&inp.output_script) != scripthash {
                continue;
            }
            if is_mempool {
                unconfirmed -= inp.sats;
            } else {
                confirmed -= inp.sats;
            }
        }
    }
    (confirmed, unconfirmed)
}

fn get_tx_fee(tx: &Tx) -> i64 {
    let mut fee: i64 = 0;
    for inp in tx.inputs.iter() {
        fee += inp.sats;
    }
    for outp in tx.outputs.iter() {
        fee -= outp.sats;
    }
    fee
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

    #[rpc_method(name = "transaction.broadcast")]
    async fn transaction_broadcast(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);
        let raw_tx = match get_param!(params, 0, "raw_tx")? {
            Value::String(raw_tx) => Ok(raw_tx),
            _ => Err(RPCError::CustomError(
                1,
                "Invalid raw_tx argument; expected hex string".to_string(),
            )),
        }?;
        let raw_tx = Bytes::from(hex::decode(raw_tx).map_err(|_err| {
            RPCError::CustomError(
                1,
                "Failed to decode raw_tx as a hex string".to_string(),
            )
        })?);

        let max_fee = ffi::calc_fee(
            raw_tx.len(),
            ffi::default_max_raw_tx_fee_rate_per_kb(),
        );
        let txid = match self.node.bridge.broadcast_tx(&raw_tx, max_fee) {
            Ok(txid) => Ok(TxId::from(txid)),
            Err(err) => Err(RPCError::CustomError(1, err.what().to_string())),
        }?;

        Ok(Value::String(txid.to_string()))
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

    #[rpc_method(name = "transaction.get_merkle")]
    async fn transaction_get_merkle(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 2);
        let txid = TxId::try_from(&get_param!(params, 0, "txid")?)
            .map_err(|err| RPCError::CustomError(1, err.to_string()))?;
        let mut block_height = json_to_u31(
            get_optional_param!(params, 1, "height", json!(0))?,
            "Invalid height argument; expected non-negative numeric value",
        )?;

        let indexer = self.indexer.read().await;

        let query_tx = indexer.txs(&self.node);
        let conf_tx_not_found_err =
            "No confirmed transaction matching the requested hash was found";
        let tx = query_tx.tx_by_id(txid).or(Err(RPCError::CustomError(
            1,
            conf_tx_not_found_err.to_string(),
        )))?;

        let block_hash = match tx.block {
            Some(b) => {
                // We don't actually need the block height param. In Fulcrum
                // it is optional and saves a database access when provided.
                // Let's just make sure we get the same error message when an
                // incorrect value is provided.
                if block_height != 0 && block_height != b.height {
                    return Err(RPCError::CustomError(
                        1,
                        format!(
                            "No transaction matching the requested hash found \
                             at height {block_height}"
                        ),
                    ));
                }
                block_height = b.height;
                Ok(b.hash)
            }
            None => {
                Err(RPCError::CustomError(1, conf_tx_not_found_err.to_string()))
            }
        }?;

        let bridge = &self.node.bridge;
        let bindex = bridge
            .lookup_block_index(
                block_hash.try_into().map_err(|_| RPCError::InternalError)?,
            )
            .map_err(|_| RPCError::InternalError)?;
        let block = indexer
            .load_chronik_block(bridge, bindex)
            .map_err(|_| RPCError::InternalError)?;

        let txids: Vec<Sha256d> = block
            .block_txs
            .txs
            .iter()
            .map(|txentry| Sha256d(txentry.txid.to_bytes()))
            .collect();
        let index_in_block = txids
            .iter()
            .position(|&id| id == Sha256d(txid.to_bytes()))
            .ok_or(RPCError::InternalError)?;

        let mut merkle_tree = MerkleTree::new();
        let (_root, branch) =
            merkle_tree.merkle_root_and_branch(&txids, index_in_block);
        let branch: Vec<String> = branch
            .iter()
            .map(|h| hex::encode(h.to_be_bytes()))
            .collect();
        Ok(json!({
            "merkle": branch,
            "block_height": block_height,
            "pos": index_in_block,
        }))
    }

    #[rpc_method(name = "scripthash.get_balance")]
    async fn scripthash_get_balance(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let script_hash_hex = match get_param!(params, 0, "scripthash")? {
            Value::String(v) => Ok(v),
            _ => {
                Err(RPCError::CustomError(1, "Invalid scripthash".to_string()))
            }
        }?;

        let script_hash =
            Sha256::from_be_hex(&script_hash_hex).map_err(|_| {
                RPCError::CustomError(1, "Invalid scripthash".to_string())
            })?;

        let indexer = self.indexer.read().await;
        let script_history = indexer
            .script_history(&self.node)
            .map_err(|_| RPCError::InternalError)?;
        let history = script_history
            .rev_history(
                GroupMember::MemberHash(script_hash).as_ref(),
                0,
                MAX_HISTORY_PAGE_SIZE,
            )
            .map_err(|_| RPCError::InternalError)?;
        if history.num_txs == 0 {
            return Ok(json!({
              "confirmed": 0,
              "unconfirmed": 0
            }));
        }
        if history.num_txs > self.max_history {
            return Err(RPCError::CustomError(
                1,
                format!(
                    "transaction history for scripthash {script_hash_hex} \
                     exceeds limit ({0})",
                    self.max_history
                ),
            ));
        }
        let num_pages = history.num_pages;
        let (mut confirmed, mut unconfirmed) =
            get_scripthash_balance(history, script_hash);
        for page in 1..num_pages {
            let history = script_history
                .rev_history(
                    GroupMember::MemberHash(script_hash).as_ref(),
                    page as usize,
                    MAX_HISTORY_PAGE_SIZE,
                )
                .map_err(|_| RPCError::InternalError)?;
            let (page_conf, page_unconf) =
                get_scripthash_balance(history, script_hash);
            confirmed += page_conf;
            unconfirmed += page_unconf;
        }
        Ok(json!({
          "confirmed": confirmed,
          "unconfirmed": unconfirmed,
        }))
    }

    #[rpc_method(name = "scripthash.get_history")]
    async fn scripthash_get_history(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let script_hash_hex = match get_param!(params, 0, "scripthash")? {
            Value::String(v) => Ok(v),
            _ => {
                Err(RPCError::CustomError(1, "Invalid scripthash".to_string()))
            }
        }?;

        let script_hash =
            Sha256::from_be_hex(&script_hash_hex).map_err(|_| {
                RPCError::CustomError(1, "Invalid scripthash".to_string())
            })?;

        let indexer = self.indexer.read().await;
        let script_history = indexer
            .script_history(&self.node)
            .map_err(|_| RPCError::InternalError)?;
        let history = script_history
            .rev_history(
                GroupMember::MemberHash(script_hash).as_ref(),
                0,
                MAX_HISTORY_PAGE_SIZE,
            )
            .map_err(|_| RPCError::InternalError)?;
        if history.num_txs > self.max_history {
            // Note that Fulcrum would return an empty history in this case
            return Err(RPCError::CustomError(
                1,
                format!(
                    "transaction history for scripthash {script_hash_hex} \
                     exceeds limit ({0})",
                    self.max_history
                ),
            ));
        }
        if history.num_txs == 0 {
            return Ok(json!([]));
        }

        let mut json_history: Vec<Value> = vec![];
        let num_pages = history.num_pages;

        // Return the history in ascending block height order
        for page in (0..num_pages).rev() {
            let history = script_history
                .rev_history(
                    GroupMember::MemberHash(script_hash).as_ref(),
                    page as usize,
                    MAX_HISTORY_PAGE_SIZE,
                )
                .map_err(|_| RPCError::InternalError)?;
            for tx in history.txs.iter().rev() {
                let height = match &tx.block {
                    Some(block) => block.height,
                    // Here we differ from Fulcrum because we don't discriminate
                    // between unconfirmed transactions and
                    // transactions with unconfirmed parents
                    // (height -1)
                    None => 0,
                };
                let be_txid: Vec<u8> = tx.txid.iter().copied().rev().collect();
                if height > 0 {
                    json_history.push(json!({
                        "height": height,
                        "tx_hash": hex::encode(be_txid)
                    }));
                } else {
                    let fee = get_tx_fee(tx);
                    json_history.push(json!({
                        "fee": fee,
                        "height": height,
                        "tx_hash": hex::encode(be_txid)
                    }));
                }
            }
        }
        Ok(json!(json_history))
    }

    #[rpc_method(name = "scripthash.listunspent")]
    async fn scripthash_listunspent(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let script_hash_hex = match get_param!(params, 0, "scripthash")? {
            Value::String(v) => Ok(v),
            _ => {
                Err(RPCError::CustomError(1, "Invalid scripthash".to_string()))
            }
        }?;

        let script_hash =
            Sha256::from_be_hex(&script_hash_hex).map_err(|_| {
                RPCError::CustomError(1, "Invalid scripthash".to_string())
            })?;

        let indexer = self.indexer.read().await;
        let script_utxos = indexer
            .script_utxos()
            .map_err(|_| RPCError::InternalError)?;
        let script = match script_utxos.script(
            GroupMember::MemberHash(script_hash),
            indexer.decompress_script_fn,
        ) {
            Ok(script) => script,
            Err(_) => return Ok(json!([])),
        };
        let utxos = script_utxos.utxos(&script).ok().unwrap_or_default();

        let mut json_utxos: Vec<Value> = vec![];
        for utxo in utxos.iter() {
            let outpoint =
                utxo.outpoint.as_ref().ok_or(RPCError::InternalError)?;
            let be_txid: Vec<u8> =
                outpoint.txid.iter().copied().rev().collect();
            // The electrum spec says mempool utxos have a block height of 0
            let height: i32 = match utxo.block_height {
                -1 => 0,
                i => i,
            };
            json_utxos.push(json!({
                "height": height,
                "tx_hash": hex::encode(be_txid),
                "tx_pos": outpoint.out_idx,
                "value": &utxo.sats,
            }));
        }

        Ok(json!(json_utxos))
    }
}
