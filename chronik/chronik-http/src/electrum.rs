// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ChronikElectrumServer`].

use std::{
    cmp,
    net::{IpAddr, SocketAddr, ToSocketAddrs},
    sync::{Arc, Mutex},
};

use abc_rust_error::Result;
use bitcoinsuite_core::{
    address::{CashAddress, CashAddressError},
    hash::{Hashed, Sha256, Sha256d},
    tx::TxId,
};
use bytes::Bytes;
use chronik_bridge::ffi;
use chronik_db::group::GroupMember;
use chronik_indexer::{
    indexer::ChronikIndexer,
    merkle::MerkleTree,
    query::{QueryBlockError, QueryBlocks, MAX_HISTORY_PAGE_SIZE},
    subs::BlockMsgType,
    subs_group::TxMsgType,
};
use chronik_proto::proto::{BlockMetadata, Tx};
use chronik_util::log_chronik;
use futures::future;
use itertools::izip;
use karyon_jsonrpc::{
    error::RPCError,
    message,
    net::{Addr, Endpoint},
    rpc_impl, rpc_method, rpc_pubsub_impl,
    server::{
        channel::{Channel, NewNotification},
        ServerBuilder,
    },
};
use rustls::pki_types::{
    pem::PemObject,
    {CertificateDer, PrivateKeyDer},
};
use serde_json::{json, Map, Value};
use thiserror::Error;
use versions::Versioning;

use crate::{
    server::{ChronikIndexerRef, NodeRef},
    {electrum::ChronikElectrumServerError::*, electrum_codec::ElectrumCodec},
};

/// Minimum protocol version implemented by this server
pub const ELECTRUM_PROTOCOL_MIN_VERSION: &str = "1.4";
/// Maximum protocol version implemented by this server
pub const ELECTRUM_PROTOCOL_MAX_VERSION: &str = "1.4.5";

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
    /// Host URL (fqdn) where this server is deployed. This is used to
    /// advertise in the server.features() response so other peers don't
    /// drop the connection. Note: there is no verification on this value.
    pub url: String,
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
    url: String,
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

fn electrum_notification_encoder(nt: NewNotification) -> message::Notification {
    message::Notification {
        jsonrpc: message::JSONRPC_VERSION.to_string(),
        method: nt.method,
        params: Some(nt.result),
    }
}

impl ChronikElectrumServer {
    /// Binds the Chronik server on the given hosts
    pub fn setup(params: ChronikElectrumServerParams) -> Result<Self> {
        Ok(ChronikElectrumServer {
            hosts: params.hosts,
            url: params.url,
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
        let genesis_hash = self.node.bridge.get_genesis_hash();
        let genesis_hash = Sha256::from_le_bytes(genesis_hash.data).hex_be();

        // The behavior is to bind the endpoint name to its method name like so:
        // endpoint.method as the name of the RPC
        let server_endpoint = Arc::new(ChronikElectrumRPCServerEndpoint {
            donation_address: self.donation_address,
            url: self.url,
            hosts: self.hosts.clone(),
            genesis_hash,
            peers: Mutex::new(Vec::new()),
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

                    builder = builder.with_notification_encoder(
                        electrum_notification_encoder,
                    );

                    let server = builder
                        .service(server_endpoint)
                        .service(blockchain_endpoint.clone())
                        .pubsub_service(blockchain_endpoint)
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

/// Generate the address.* variant of a scripthash.* endpoint
macro_rules! address_wrapper {
    ($params:expr, $self:ident, $endpoint:ident) => {{
        check_max_number_of_params!($params, 1);

        let address = match get_param!($params, 0, "address")? {
            Value::String(v) => Ok(v),
            _ => Err(RPCError::CustomError(1, "Invalid address".to_string())),
        }?;

        let scripthash = address_to_scripthash(&address)?;

        $self.$endpoint(json!([scripthash.hex_be()])).await
    }};
}

struct ElectrumPeer {
    url: String,
    ip_addr: IpAddr,
    max_protocol_version: String,
    pruning: Option<i64>,
    tcp_port: Option<u16>,
    ssl_port: Option<u16>,
    validated: bool,
}

struct ChronikElectrumRPCServerEndpoint {
    donation_address: String,
    hosts: Vec<(SocketAddr, ChronikElectrumProtocol)>,
    url: String,
    genesis_hash: String,
    peers: Mutex<Vec<ElectrumPeer>>,
}

struct ChronikElectrumRPCBlockchainEndpoint {
    indexer: ChronikIndexerRef,
    node: NodeRef,
    max_history: u32,
}

fn get_version() -> String {
    let version_number = ffi::format_full_version();
    format!("Bitcoin ABC {version_number}")
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
                if version_string != ELECTRUM_PROTOCOL_MIN_VERSION {
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
                    Versioning::new(ELECTRUM_PROTOCOL_MIN_VERSION).unwrap();
                if target_version < min_version || target_version > max_version
                {
                    return Err(unsup_version_err);
                }
            }
            _ => {
                return Err(unsup_version_err);
            }
        };

        Ok(json!([get_version(), ELECTRUM_PROTOCOL_MIN_VERSION]))
    }

    async fn features(&self, _params: Value) -> Result<Value, RPCError> {
        let mut protocol_ports = Map::new();
        for (host, protocol) in &self.hosts {
            // Extract all enabled protocols and the port used
            match protocol {
                ChronikElectrumProtocol::Tcp => {
                    protocol_ports
                        .insert("tcp_port".to_owned(), host.port().into());
                }
                ChronikElectrumProtocol::Tls => {
                    protocol_ports
                        .insert("tls_port".to_owned(), host.port().into());
                }
            };
        }
        Ok(json!({
            "genesis_hash": self.genesis_hash,
            "hash_function": "sha256",
            "server_version": get_version(),
            "protocol_min": ELECTRUM_PROTOCOL_MIN_VERSION,
            "protocol_max": ELECTRUM_PROTOCOL_MAX_VERSION,
            // Pruning is not allowed with chronik
            "pruning": Value::Null,
            "hosts": {
                &self.url: protocol_ports,
            },
            // This is an optional key added in ElectrumX version 1.4.5 but we
            // can explicitly deny the feature as it's not supported on eCash.
            "dsproof": false,
        }))
    }

    async fn add_peer(&self, params: Value) -> Result<Value, RPCError> {
        let mut peers =
            self.peers.lock().map_err(|_| RPCError::InternalError)?;

        // Limit the number of peers we can store. If the peers list is full
        // already, bail early
        const MAX_PEERS: usize = 10;
        if peers.len() >= MAX_PEERS {
            return Ok(json!(false));
        }

        let mut features = match get_param!(params, 0, "features")? {
            Value::Object(v) => Ok(v),
            _ => Err(RPCError::CustomError(
                1,
                "sever.add_peer expected a non-empty dictionary argument"
                    .to_string(),
            )),
        }?;

        // Mandatory params
        let Some(max_protocol_version) = features.remove("protocol_max") else {
            return Ok(json!(false))
        };
        let max_protocol_version: String = match max_protocol_version.as_str() {
            Some(max_protocol_version) => max_protocol_version.into(),
            None => {
                return Ok(json!(false));
            }
        };

        let Some(hosts) = features.remove("hosts") else {
            return Ok(json!(false))
        };
        let Some(hosts) = hosts.as_object() else {
            return Ok(json!(false))
        };

        if hosts.is_empty() {
            return Ok(json!(false));
        }

        // From there it's only optional params
        let pruning = features
            .remove("pruning")
            .and_then(|pruning| pruning.as_i64());

        let mut peers_to_add = Vec::new();
        for (url, protocols) in hosts {
            for peer in &*peers {
                if &peer.url == url {
                    // Don't allow duplicates
                    return Ok(json!(false));
                }
            }

            // We need a port to resolve the url, just use 0
            let Ok(mut addrs) = format!("{url}:0").to_socket_addrs() else {
                return Ok(json!(false))
            };
            // Use the first IPv4 if several are available, the first address
            // otherwise
            let ip_addr =
                match addrs.find(|addr| addr.is_ipv4()).or(addrs.next()) {
                    Some(addr) => addr.ip(),
                    None => return Ok(json!(false)),
                };

            let tcp_port = match protocols.get("tcp_port") {
                Some(tcp_port) => {
                    let Some(tcp_port) = tcp_port.as_i64() else {
                        return Ok(json!(false))
                    };
                    match u16::try_from(tcp_port) {
                        Ok(tcp_port) => Some(tcp_port),
                        _ => return Ok(json!(false)),
                    }
                }
                None => None,
            };
            let ssl_port = match protocols.get("ssl_port") {
                Some(ssl_port) => {
                    let Some(ssl_port) = ssl_port.as_i64() else {
                        return Ok(json!(false))
                    };
                    match u16::try_from(ssl_port) {
                        Ok(ssl_port) => Some(ssl_port),
                        _ => return Ok(json!(false)),
                    }
                }
                None => None,
            };

            peers_to_add.push(ElectrumPeer {
                url: url.into(),
                ip_addr,
                max_protocol_version: max_protocol_version.clone(),
                pruning,
                tcp_port,
                ssl_port,
                validated: false,
            });
        }

        if peers.len() + peers_to_add.len() > MAX_PEERS {
            return Ok(json!(false));
        }
        peers.extend(peers_to_add);

        Ok(json!(true))
    }

    // Note that despite the name this is not a subscription, and the server
    // must send no notifications.
    #[rpc_method(name = "peers.subscribe")]
    async fn peers_subscribe(&self, _params: Value) -> Result<Value, RPCError> {
        let peers = self.peers.lock().map_err(|_| RPCError::InternalError)?;

        let mut peers_data = Vec::new();
        for peer in &*peers {
            if !peer.validated {
                continue;
            }

            let mut features = Vec::new();
            features.push(format!("v{}", peer.max_protocol_version));
            if let Some(pruning) = peer.pruning {
                features.push(format!("p{}", pruning));
            }
            if let Some(tcp_port) = peer.tcp_port {
                features.push(format!("t{}", tcp_port));
            }
            if let Some(ssl_port) = peer.ssl_port {
                features.push(format!("s{}", ssl_port));
            }

            peers_data.push(json!([
                peer.ip_addr.to_string(),
                peer.url,
                features,
            ]));
        }

        Ok(json!(peers_data))
    }

    async fn banner(&self, _params: Value) -> Result<Value, RPCError> {
        let banner_msg = format!("Connected to {} server", get_version());
        Ok(json!(banner_msg))
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

/// Whether this tx has unconfirmed parents. This is required for the Electrum
/// protocol which returns a different block height for mempool transactions
/// depending on this.
async fn has_unconfirmed_parents(
    tx: &Tx,
    indexer: &tokio::sync::RwLockReadGuard<'_, ChronikIndexer>,
    node: &NodeRef,
) -> Result<bool, RPCError> {
    if tx.is_coinbase {
        // This should be unreachable because we only check for unconfirmed txs,
        // but this is cheap, more correct and makes the code more robust.
        // A coinbase tx can't have missing parents.
        return Ok(true);
    }
    for input in tx.inputs.iter() {
        let prev_txid = match &input.prev_out {
            Some(prev_out) => TxId::try_from(prev_out.txid.as_slice())
                .map_err(|_| RPCError::InternalError)?,
            // This should be unreachable. However if there is no prevout,
            // assume this is a coinbase so it can't be missing parents.
            None => return Ok(false),
        };
        // This should never fail
        let tx = indexer
            .txs(node)
            .tx_by_id(prev_txid)
            .map_err(|_| RPCError::InternalError)?;
        if tx.block.is_none() {
            return Ok(true);
        }
    }

    Ok(false)
}

/// Return the history in a format that fulcrum expects
async fn get_scripthash_history(
    script_hash: Sha256,
    indexer: ChronikIndexerRef,
    node: NodeRef,
    max_history: u32,
) -> Result<Vec<Tx>, RPCError> {
    let script_hash_hex = hex::encode(script_hash.to_be_bytes());

    let indexer = indexer.read().await;
    let script_history = indexer
        .script_history(&node)
        .map_err(|_| RPCError::InternalError)?;

    let mut page = 0;
    let mut num_pages = 1;
    let mut tx_history: Vec<Tx> = vec![];

    while page < num_pages {
        // Return the confirmed txs in ascending block height order, with txs
        // ordered as they appear in the block
        let history = script_history
            .confirmed_txs(
                GroupMember::MemberHash(script_hash).as_ref(),
                page as usize,
                MAX_HISTORY_PAGE_SIZE,
            )
            .map_err(|_| RPCError::InternalError)?;

        if history.num_txs > max_history {
            // Note that Fulcrum would return an empty history in this case
            return Err(RPCError::CustomError(
                1,
                format!(
                    "transaction history for scripthash {script_hash_hex} \
                     exceeds limit ({0})",
                    max_history
                ),
            ));
        }

        for tx in history.txs.iter() {
            tx_history.push(tx.clone());
        }

        num_pages = history.num_pages;
        page += 1;
    }

    // Note that there is currently no pagination for the mempool.
    let mut history = script_history
        .unconfirmed_txs(GroupMember::MemberHash(script_hash).as_ref())
        .map_err(|_| RPCError::InternalError)?;

    if history.num_txs + (tx_history.len() as u32) > max_history {
        return Err(RPCError::CustomError(
            1,
            format!(
                "transaction history for scripthash {script_hash_hex} exceeds \
                 limit ({0})",
                max_history
            ),
        ));
    }

    let mut unconfirmed_tx_history: Vec<Tx> = vec![];

    for tx in history.txs.iter_mut() {
        let block_height =
            if has_unconfirmed_parents(tx, &indexer, &node).await? {
                -1
            } else {
                0
            };

        // Override the block height:
        //  - -1 if the tx has some unconfirmed parents
        //  - 0 if the tx has no unconfirmed parents
        let electrum_fake_block = BlockMetadata {
            height: block_height,
            hash: vec![0; 64],
            timestamp: 0,
            is_final: false,
        };
        tx.block = Some(electrum_fake_block);
        unconfirmed_tx_history.push(tx.clone());
    }

    // Return the mempool txs in the reverse block height then txid order
    unconfirmed_tx_history.sort_by(|a, b| {
        let a_height = a.block.as_ref().unwrap().height;
        let b_height = b.block.as_ref().unwrap().height;
        if a_height != b_height {
            // Warning: reverse order! We place txs with no unconfirmed parents
            // first (height = 0) then txs with unconfirmed parents
            // (height = -1).
            return b_height.cmp(&a_height);
        }

        let a_txid =
            hex::encode(a.txid.iter().copied().rev().collect::<Vec<u8>>());
        let b_txid =
            hex::encode(b.txid.iter().copied().rev().collect::<Vec<u8>>());
        a_txid.cmp(&b_txid)
    });

    tx_history.append(&mut unconfirmed_tx_history);

    Ok(tx_history)
}

fn get_scripthash_balance(history: &Vec<Tx>, scripthash: Sha256) -> (i64, i64) {
    let mut confirmed: i64 = 0;
    let mut unconfirmed: i64 = 0;

    for tx in history {
        let is_mempool = match &tx.block {
            Some(block) => block.height <= 0,
            None => true,
        };
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

async fn get_scripthash_status(
    script_hash: Sha256,
    indexer: ChronikIndexerRef,
    node: NodeRef,
    max_history: u32,
) -> Result<Option<String>, RPCError> {
    let tx_history =
        get_scripthash_history(script_hash, indexer, node, max_history).await?;

    if tx_history.is_empty() {
        return Ok(None);
    }

    // Then compute the status
    let mut status_parts = Vec::<String>::new();

    for tx in tx_history {
        let tx_hash =
            hex::encode(tx.txid.iter().copied().rev().collect::<Vec<u8>>());
        let height = tx.block.as_ref().unwrap().height;
        status_parts.push(format!("{tx_hash}:{height}:"));
    }

    let status_string = status_parts.join("");

    Ok(Some(Sha256::digest(status_string.as_bytes()).hex_le()))
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

async fn header_hex_from_height(
    blocks: &QueryBlocks<'_>,
    height: i32,
) -> Result<String, RPCError> {
    let header = blocks.header(height.to_string(), 0).await.map_err(|_| {
        RPCError::CustomError(
            1,
            format!("Unable to retrieve the header at height {height}"),
        )
    })?;

    Ok(hex::encode(header.raw_header))
}

fn script_hash_to_sub_id(script_hash: Sha256) -> u32 {
    let script_hash_bytes: [u8; 32] = script_hash.into();
    let id_bytes: [u8; 4] = script_hash_bytes[..4].try_into().unwrap();

    u32::from_le_bytes(id_bytes)
}

fn address_to_scripthash(address: &String) -> Result<Sha256, RPCError> {
    let supported_prefixes = ["ecash", "ectest", "ecregtest", "etoken"];
    let cash_address: CashAddress = match address.parse() {
        Ok(cash_address) => cash_address,
        Err(CashAddressError::MissingPrefix) => {
            match supported_prefixes.iter().find_map(|&prefix| {
                let prefixed_candidate: Result<CashAddress, CashAddressError> =
                    [prefix, address].join(":").parse();
                prefixed_candidate.ok()
            }) {
                Some(prefixed_address) => prefixed_address,
                None => {
                    return Err(RPCError::CustomError(
                        1,
                        format!("Invalid address: {address}"),
                    ));
                }
            }
        }
        _ => {
            return Err(RPCError::CustomError(
                1,
                format!("Invalid address: {address}"),
            ));
        }
    };

    Ok(Sha256::digest(cash_address.to_script()))
}

impl ChronikElectrumRPCBlockchainEndpoint {
    async fn scripthash_or_address_suscribe(
        &self,
        chan: Arc<Channel>,
        method: String,
        script_hash: Sha256,
        formatted_subscription: String,
    ) -> Result<Value, RPCError> {
        let indexer = self.indexer.read().await;
        let mut subs: tokio::sync::RwLockWriteGuard<
            '_,
            chronik_indexer::subs::Subs,
        > = indexer.subs().write().await;
        let script_subs = subs.subs_script_mut();

        let mut recv =
            script_subs.subscribe_to_hash_member(&script_hash.to_be_bytes());

        let indexer_clone = self.indexer.clone();
        let node_clone = self.node.clone();
        let max_history = self.max_history;

        let sub_id = script_hash_to_sub_id(script_hash);
        if let Ok(sub) = chan.new_subscription(&method, Some(sub_id)).await {
            tokio::spawn(async move {
                log_chronik!("Subscription to electrum scripthash\n");

                let mut last_status = None;

                loop {
                    let Ok(tx_msg) = recv.recv().await else {
                        // Error, disconnect
                        break;
                    };

                    // We want all the events except finalization (this might
                    // change in the future):
                    // - added to mempool
                    // - removed from mempool
                    // - confirmed
                    if tx_msg.msg_type == TxMsgType::Finalized {
                        continue;
                    }

                    if let Ok(status) = get_scripthash_status(
                        script_hash,
                        indexer_clone.clone(),
                        node_clone.clone(),
                        max_history,
                    )
                    .await
                    {
                        if last_status == status {
                            continue;
                        }
                        last_status = status.clone();

                        if sub
                            .notify(json!([formatted_subscription, status,]))
                            .await
                            .is_err()
                        {
                            // Don't log, it's likely a client
                            // unsubscription or
                            // disconnection
                            break;
                        }
                    }
                }

                log_chronik!("Unsubscription from electrum scripthash\n");
            });
        }

        let status = get_scripthash_status(
            script_hash,
            self.indexer.clone(),
            self.node.clone(),
            max_history,
        )
        .await?;

        Ok(serde_json::json!(status))
    }
}

#[rpc_pubsub_impl(name = "blockchain")]
impl ChronikElectrumRPCBlockchainEndpoint {
    #[rpc_method(name = "headers.subscribe")]
    async fn headers_subscribe(
        &self,
        chan: Arc<Channel>,
        method: String,
        _params: Value,
    ) -> Result<Value, RPCError> {
        let indexer = self.indexer.read().await;
        let blocks: chronik_indexer::query::QueryBlocks<'_> =
            indexer.blocks(&self.node);

        let subs: tokio::sync::RwLockWriteGuard<
            '_,
            chronik_indexer::subs::Subs,
        > = indexer.subs().write().await;
        let mut block_subs = subs.sub_to_block_msgs();

        let indexer_clone = self.indexer.clone();
        let node_clone = self.node.clone();

        if let Ok(sub) = chan.new_subscription(&method, Some(0)).await {
            tokio::spawn(async move {
                log_chronik!("Subscription to electrum headers\n");

                loop {
                    let Ok(block_msg) = block_subs.recv().await else {
                        // Error, disconnect
                        break;
                    };

                    if block_msg.msg_type != BlockMsgType::Connected {
                        // We're only sending headers upon block connection.
                        // At some point we might want to wait for block
                        // finalization instead, but this behavior would differ
                        // from Fulcrum.
                        continue;
                    }

                    let indexer = indexer_clone.read().await;
                    let blocks: chronik_indexer::query::QueryBlocks<'_> =
                        indexer.blocks(&node_clone);

                    match header_hex_from_height(&blocks, block_msg.height)
                        .await
                    {
                        Err(err) => {
                            log_chronik!("{err}\n");
                            break;
                        }
                        Ok(header_hex) => {
                            if sub
                                .notify(json!([{
                                            "height": block_msg.height,
                                            "hex": header_hex,
                                }]))
                                .await
                                .is_err()
                            {
                                // Don't log, it's likely a client
                                // unsubscription or disconnection
                                break;
                            }
                        }
                    };
                }

                log_chronik!("Unsubscription from electrum headers\n");
            });
        }

        let tip_height = blocks
            .blockchain_info()
            .map_err(|_| RPCError::InternalError)?
            .tip_height;

        let header_hex = header_hex_from_height(&blocks, tip_height).await?;

        Ok(json!({
            "height": tip_height,
            "hex": header_hex,
        }))
    }

    #[rpc_method(name = "headers.unsubscribe")]
    async fn headers_unsubscribe(
        &self,
        chan: Arc<Channel>,
        _method: String,
        _params: Value,
    ) -> Result<Value, RPCError> {
        let sub_id: message::SubscriptionID = 0;
        let success = chan.remove_subscription(&sub_id).await.is_ok();
        Ok(json!(success))
    }

    #[rpc_method(name = "scripthash.subscribe")]
    async fn scripthash_subscribe(
        &self,
        chan: Arc<Channel>,
        method: String,
        params: Value,
    ) -> Result<Value, RPCError> {
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

        self.scripthash_or_address_suscribe(
            chan,
            method,
            script_hash,
            hex::encode(script_hash.to_be_bytes()),
        )
        .await
    }

    #[rpc_method(name = "address.subscribe")]
    async fn address_subscribe(
        &self,
        chan: Arc<Channel>,
        method: String,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let address = match get_param!(params, 0, "address")? {
            Value::String(v) => Ok(v),
            _ => Err(RPCError::CustomError(1, "Invalid address".to_string())),
        }?;

        let script_hash = address_to_scripthash(&address)?;

        self.scripthash_or_address_suscribe(chan, method, script_hash, address)
            .await
    }

    #[rpc_method(name = "scripthash.unsubscribe")]
    async fn scripthash_unsubscribe(
        &self,
        chan: Arc<Channel>,
        _method: String,
        params: Value,
    ) -> Result<Value, RPCError> {
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

        let sub_id = script_hash_to_sub_id(script_hash);
        let success = chan.remove_subscription(&sub_id).await.is_ok();
        Ok(serde_json::json!(success))
    }

    #[rpc_method(name = "address.unsubscribe")]
    async fn address_unsubscribe(
        &self,
        chan: Arc<Channel>,
        _method: String,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let address = match get_param!(params, 0, "address")? {
            Value::String(v) => Ok(v),
            _ => Err(RPCError::CustomError(1, "Invalid address".to_string())),
        }?;

        let script_hash = address_to_scripthash(&address)?;

        let sub_id = script_hash_to_sub_id(script_hash);
        let success = chan.remove_subscription(&sub_id).await.is_ok();
        Ok(serde_json::json!(success))
    }
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
                "header": hex::encode(proto_header.raw_header),
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

        let history = get_scripthash_history(
            script_hash,
            self.indexer.clone(),
            self.node.clone(),
            self.max_history,
        )
        .await?;
        let (confirmed, unconfirmed) =
            get_scripthash_balance(&history, script_hash);

        Ok(json!({
          "confirmed": confirmed,
          "unconfirmed": unconfirmed,
        }))
    }

    #[rpc_method(name = "address.get_balance")]
    async fn address_get_balance(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        address_wrapper!(params, self, scripthash_get_balance)
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

        let history = get_scripthash_history(
            script_hash,
            self.indexer.clone(),
            self.node.clone(),
            self.max_history,
        )
        .await?;

        let mut json_history: Vec<Value> = vec![];

        // Return history in ascending order (and mempool last), which is the
        // opposite of what chronik does. The get_scripthash_history() takes
        // care of all the ordering.
        for tx in history {
            let height = match &tx.block {
                Some(block) => block.height,
                // This should never happen because the block height is filled
                // the get_scripthash_history() function even for mempool txs.
                None => 0,
            };
            let be_txid: Vec<u8> = tx.txid.iter().copied().rev().collect();
            if height > 0 {
                json_history.push(json!({
                    "height": height,
                    "tx_hash": hex::encode(be_txid)
                }));
            } else {
                let fee = get_tx_fee(&tx);
                json_history.push(json!({
                    "fee": fee,
                    "height": height,
                    "tx_hash": hex::encode(be_txid)
                }));
            }
        }

        Ok(json!(json_history))
    }

    #[rpc_method(name = "address.get_history")]
    async fn address_get_history(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        address_wrapper!(params, self, scripthash_get_history)
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

    #[rpc_method(name = "address.listunspent")]
    async fn address_listunspent(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        address_wrapper!(params, self, scripthash_listunspent)
    }

    #[rpc_method(name = "scripthash.get_first_use")]
    async fn scripthash_get_first_use(
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

        // We could just call get_scripthash_history but since we only need the
        // first use of this scripthash we can be more performant and bail
        // early.
        let indexer = self.indexer.read().await;
        let script_history = indexer
            .script_history(&self.node)
            .map_err(|_| RPCError::InternalError)?;

        let history = script_history
            .confirmed_txs(
                GroupMember::MemberHash(script_hash).as_ref(),
                /* request_page_num= */ 0,
                /* request_page_size= */ 1,
            )
            .map_err(|_| RPCError::InternalError)?;

        // We have a confirmed tx using this scripthash, return the first one as
        // it appears in the block.
        if !history.txs.is_empty() {
            let tx = &history.txs[0];
            let (block_hash, height) = match &tx.block {
                Some(block) => {
                    let block_hash =
                        Sha256::from_le_slice(block.hash.as_ref()).unwrap();
                    (block_hash.hex_be(), block.height)
                }
                // This should never happen because this is a confirmed tx
                None => ("00".repeat(32), 0),
            };
            let txid_be: Vec<u8> = tx.txid.iter().copied().rev().collect();

            return Ok(json!({
                "block_hash": block_hash,
                "height": height,
                "tx_hash": hex::encode(txid_be),
            }));
        }

        // Note that there is currently no pagination for the mempool.
        let mut history = script_history
            .unconfirmed_txs(GroupMember::MemberHash(script_hash).as_ref())
            .map_err(|_| RPCError::InternalError)?;

        // Sort by txid
        history.txs.sort_by(|a, b| {
            let a_txid =
                hex::encode(a.txid.iter().copied().rev().collect::<Vec<u8>>());
            let b_txid =
                hex::encode(b.txid.iter().copied().rev().collect::<Vec<u8>>());
            a_txid.cmp(&b_txid)
        });

        if !history.txs.is_empty() {
            let tx = &history.txs[0];
            let txid_be: Vec<u8> = tx.txid.iter().copied().rev().collect();
            return Ok(json!({
                "block_hash": "00".repeat(32),
                "height": 0,
                "tx_hash": hex::encode(txid_be),
            }));
        }

        Ok(Value::Null)
    }

    #[rpc_method(name = "address.get_first_use")]
    async fn address_get_first_use(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        address_wrapper!(params, self, scripthash_get_first_use)
    }

    #[rpc_method(name = "scripthash.get_mempool")]
    async fn scripthash_get_mempool(
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

        // Note that there is currently no pagination for the mempool.
        let mut history = script_history
            .unconfirmed_txs(GroupMember::MemberHash(script_hash).as_ref())
            .map_err(|_| RPCError::InternalError)?;

        for tx in history.txs.iter_mut() {
            let block_height =
                if has_unconfirmed_parents(tx, &indexer, &self.node).await? {
                    -1
                } else {
                    0
                };

            // Override the block height:
            //  - -1 if the tx has some unconfirmed parents
            //  - 0 if the tx has no unconfirmed parents
            let electrum_fake_block = BlockMetadata {
                height: block_height,
                hash: vec![0; 64],
                timestamp: 0,
                is_final: false,
            };
            tx.block = Some(electrum_fake_block);
        }

        // Return the mempool txs in the reverse block height then txid order
        history.txs.sort_by(|a, b| {
            let a_height = a.block.as_ref().unwrap().height;
            let b_height = b.block.as_ref().unwrap().height;
            if a_height != b_height {
                // Warning: reverse order! We place txs with no unconfirmed
                // parents first (height = 0) then txs with
                // unconfirmed parents (height = -1).
                return b_height.cmp(&a_height);
            }

            let a_txid =
                hex::encode(a.txid.iter().copied().rev().collect::<Vec<u8>>());
            let b_txid =
                hex::encode(b.txid.iter().copied().rev().collect::<Vec<u8>>());
            a_txid.cmp(&b_txid)
        });

        let mut json_mempool: Vec<Value> = vec![];
        for tx in history.txs.iter() {
            let txid_be: Vec<u8> = tx.txid.iter().copied().rev().collect();
            json_mempool.push(json!({
                "height": tx.block.as_ref().unwrap().height,
                "tx_hash": hex::encode(txid_be),
                "fee": get_tx_fee(tx),
            }));
        }

        Ok(json!(json_mempool))
    }

    #[rpc_method(name = "address.get_mempool")]
    async fn address_get_mempool(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        address_wrapper!(params, self, scripthash_get_mempool)
    }

    #[rpc_method(name = "address.get_scripthash")]
    async fn address_get_scripthash(
        &self,
        params: Value,
    ) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let address = match get_param!(params, 0, "address")? {
            Value::String(v) => Ok(v),
            _ => Err(RPCError::CustomError(1, "Invalid address".to_string())),
        }?;

        let scripthash = address_to_scripthash(&address)?;

        Ok(json!(scripthash.hex_be()))
    }

    #[rpc_method(name = "estimatefee")]
    async fn estimate_fee(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        // We don't need it but it's mandatory
        let _confirmations = match get_param!(params, 0, "number")? {
            Value::Number(v) if v.as_i64().unwrap() >= 0 => Ok(v),
            _ => Err(RPCError::CustomError(
                1,
                "blockchain.estimatefee parameter should be a single \
                 non-negative integer"
                    .to_string(),
            )),
        }?;

        let sats_per_kb = self.node.bridge.estimate_fee();
        if sats_per_kb < 0 {
            // Unable to estimate
            return Ok(json!(-1));
        }

        // Return in XEC/kB, and 1 XEC = 100 sats
        Ok(json!(sats_per_kb as f64 / 100.0))
    }

    #[rpc_method(name = "header.get")]
    async fn header_get(&self, params: Value) -> Result<Value, RPCError> {
        check_max_number_of_params!(params, 1);

        let indexer = self.indexer.read().await;
        let blocks = indexer.blocks(&self.node);

        let mut is_height = false;
        let hash_or_height = match get_param!(params, 0, "block_hash")? {
            Value::Number(height) => {
                is_height = true;
                let height = height.as_i64().unwrap_or(-1);
                if height < 0 || height > i32::MAX.into() {
                    return Err(RPCError::CustomError(
                        1,
                        "Invalid height".to_string(),
                    ));
                }

                let tip_height = blocks
                    .blockchain_info()
                    .map_err(|_| RPCError::InternalError)?
                    .tip_height;
                if height > tip_height.into() {
                    return Err(RPCError::CustomError(
                        1,
                        format!("Height {height} is out of range"),
                    ));
                }

                height.to_string()
            }
            Value::String(block_hash) => block_hash,
            _ => {
                return Err(RPCError::CustomError(
                    1,
                    "Invalid block hash".to_string(),
                ))
            }
        };

        let err_message = if is_height {
            "Invalid height".to_string()
        } else {
            "Invalid block hash".to_string()
        };

        let block_height = match blocks.by_hash_or_height(hash_or_height) {
            Ok(block) => block.block_info.unwrap().height,
            Err(e) => {
                if let Ok(err) = e.downcast::<QueryBlockError>() {
                    match err {
                        QueryBlockError::BlockNotFound(_) => {
                            return Err(RPCError::CustomError(
                                2,
                                "Block not found".to_string(),
                            ))
                        }
                        _ => return Err(RPCError::CustomError(1, err_message)),
                    };
                }
                return Err(RPCError::CustomError(1, err_message));
            }
        };

        let proto_header = blocks
            .header(block_height.to_string(), 0)
            .await
            .map_err(|_| RPCError::InternalError)?;

        Ok(json!({
            "height": block_height,
            "hex": hex::encode(proto_header.raw_header),
        }))
    }
}
