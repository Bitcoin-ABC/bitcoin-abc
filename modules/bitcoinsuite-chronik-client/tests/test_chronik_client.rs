// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
use std::collections::HashMap;

use abc_rust_error::Result;
use bitcoinsuite_chronik_client::{
    proto::{self, token_type},
    ChronikClient, ChronikClientError, ScriptType,
};
use bitcoinsuite_core::hash::{Hashed, Sha256d};
use pretty_assertions::assert_eq;
use regex::Regex;
use reqwest::StatusCode;

const CHRONIK_URL: &str = "https://chronik.e.cash";
const GENESIS_PK_HEX: &str = "04678afdb0fe5548271967f1a67130b7105cd6a828e03\
                              909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e5\
                              1ec112de5c384df7ba0b8d578a4c702b6bf11d5f";

#[tokio::test]
pub async fn test_broadcast_tx() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let response = client
        .broadcast_tx(hex::decode("00000000")?)
        .await
        .unwrap_err()
        .downcast::<ChronikClientError>()?;
    let error_msg = "400: Parsing tx failed Invalid length, expected 1 bytes \
                     but got 0 bytes";
    assert_eq!(
        response,
        ChronikClientError::ChronikError {
            status_code: StatusCode::BAD_REQUEST,
            error: proto::Error {
                msg: error_msg.to_string(),
            },
            error_msg: error_msg.to_string(),
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_broadcast_txs() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let response = client
        .broadcast_txs(vec![hex::decode("00000000")?])
        .await
        .unwrap_err()
        .downcast::<ChronikClientError>()?;
    let error_msg = "400: Parsing tx failed Invalid length, expected 1 bytes \
                     but got 0 bytes";
    assert_eq!(
        response,
        ChronikClientError::ChronikError {
            status_code: StatusCode::BAD_REQUEST,
            error: proto::Error {
                msg: error_msg.to_string(),
            },
            error_msg: error_msg.to_string(),
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_blockchain_info() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let blockchain_info = client.blockchain_info().await?;
    assert!(blockchain_info.tip_height > 243892);
    assert_eq!(blockchain_info.tip_hash[28..], [0; 4]);
    Ok(())
}

#[tokio::test]
pub async fn test_block() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let block_hash = Sha256d::from_be_hex(
        "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
    )?;
    let prev_block_hash = Sha256d::from_be_hex(
        "000000002a22cfee1f2c846adbd12b3e183d4f97683f85dad08a79780a84bd55",
    )?;
    let expected_height = 170;
    let block = client.block_by_hash(&block_hash).await?;
    assert_eq!(
        block.block_info,
        Some(proto::BlockInfo {
            hash: block_hash.0.as_slice().to_vec(),
            prev_hash: prev_block_hash.0.as_slice().to_vec(),
            height: expected_height,
            n_bits: 0x1d00ffff,
            timestamp: 1231731025,
            block_size: 490,
            num_txs: 2,
            num_inputs: 2,
            num_outputs: 3,
            sum_input_sats: 5000000000,
            sum_coinbase_output_sats: 5000000000,
            sum_normal_output_sats: 5000000000,
            sum_burned_sats: 0,
            is_final: true,
        }),
    );
    assert_eq!(client.block_by_height(expected_height).await?, block);
    Ok(())
}

#[tokio::test]
pub async fn test_blocks() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let blocks = client.blocks(129_113, 129_120).await?;
    assert_eq!(blocks.len(), 8);
    Ok(())
}

#[tokio::test]
pub async fn test_tx_missing() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let err = client
        .tx(&Sha256d([0; 32]))
        .await
        .unwrap_err()
        .downcast::<ChronikClientError>()?;
    let error_msg =
        "404: Transaction \
         0000000000000000000000000000000000000000000000000000000000000000 not \
         found in the index";
    assert_eq!(
        err,
        ChronikClientError::ChronikError {
            status_code: StatusCode::NOT_FOUND,
            error_msg: error_msg.to_string(),
            error: proto::Error {
                msg: error_msg.to_string(),
            },
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_raw_tx_missing() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let err = client
        .raw_tx(&Sha256d([0; 32]))
        .await
        .unwrap_err()
        .downcast::<ChronikClientError>()?;
    let error_msg =
        "404: Transaction \
         0000000000000000000000000000000000000000000000000000000000000000 not \
         found in the index";
    assert_eq!(
        err,
        ChronikClientError::ChronikError {
            status_code: StatusCode::NOT_FOUND,
            error_msg: error_msg.to_string(),
            error: proto::Error {
                msg: error_msg.to_string(),
            },
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_tx() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let block_hash = Sha256d::from_be_hex(
        "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
    )?;
    let txid = Sha256d::from_be_hex(
        "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    )?;
    let actual_tx = client.tx(&txid).await?;
    let expected_tx = proto::Tx {
        txid: txid.0.as_slice().to_vec(),
        version: 1,
        inputs: vec![proto::TxInput {
            prev_out: Some(proto::OutPoint {
                txid: Sha256d::from_be_hex(
                    "0437cd7f8525ceed2324359c2d0ba26006d92d856a9c20fa0241106\
                     ee5a597c9",
                )?
                .0.as_slice()
                .to_vec(),
                out_idx: 0,
            }),
            input_script: hex::decode(
                "47304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c6\
                 1548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbb\
                 ac4622082221a8768d1d0901",
            )?,
            output_script: hex::decode(
                "410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148\
                 a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b864\
                 3f656b412a3ac",
            )?,
            sats: 5_000_000_000,
            sequence_no: 0xffffffff,
            token: None,
            plugins: HashMap::new(),
        }],
        outputs: vec![
            proto::TxOutput {
                sats: 1_000_000_000,
                output_script: hex::decode(
                    "4104ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d7\
                     1302fa28414e7aab37397f554a7df5f142c21c1b7303b8a0626f1bade\
                     d5c72a704f7e6cd84cac",
                )?,
                token: None,
                spent_by: Some(proto::SpentBy {
                    txid: Sha256d::from_be_hex(
                        "ea44e97271691990157559d0bdd9959e02790c34db6c006d779e8\
                         2fa5aee708e",
                    )?
                    .0.as_slice()
                    .to_vec(),
                    input_idx: 0,
                }),
                plugins: HashMap::new(),
            },
            proto::TxOutput {
                sats: 4_000_000_000,
                output_script: hex::decode(
                    "410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b\
                     148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f\
                     999b8643f656b412a3ac",
                )?,
                token: None,
                spent_by: Some(proto::SpentBy {
                    txid: Sha256d::from_be_hex(
                        "a16f3ce4dd5deb92d98ef5cf8afeaf0775ebca408f708b2146c4f\
                         b42b41e14be",
                    )?
                    .0.as_slice()
                    .to_vec(),
                    input_idx: 0,
                }),
                plugins: HashMap::new(),
            },
        ],
        lock_time: 0,
        token_entries: vec![],
        token_failed_parsings: vec![],
        token_status: proto::TokenStatus::NonToken as _,
        block: Some(proto::BlockMetadata {
            height: 170,
            hash: block_hash.0.as_slice().to_vec(),
            timestamp: 1231731025,
            is_final: true,
        }),
        time_first_seen: 0,
        size: 275,
        is_coinbase: false,
        is_final: true,
    };
    assert_eq!(actual_tx, expected_tx);
    Ok(())
}

#[tokio::test]
pub async fn test_raw_tx() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let txid = Sha256d::from_be_hex(
        "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    )?;
    let actual_raw_tx = client.raw_tx(&txid).await?;
    let expected_raw_tx =
        "0100000001c997a5e56e104102fa209c6a852dd90660a20b2d9c352423edce258\
         57fcd3704000000004847304402204e45e16932b8af514961a1d3a1a25fdf3f4f\
         7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d8\
         31cc56cbbac4622082221a8768d1d0901ffffffff0200ca9a3b00000000434104\
         ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d71302fa28414e\
         7aab37397f554a7df5f142c21c1b7303b8a0626f1baded5c72a704f7e6cd84cac\
         00286bee0000000043410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b\
         1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c0\
         3f999b8643f656b412a3ac00000000";
    assert_eq!(hex::encode(actual_raw_tx), expected_raw_tx);
    Ok(())
}

#[tokio::test]
pub async fn test_block_txs() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let block_hash = Sha256d::from_be_hex(
        "00000000000053807791091d70e691abff37fc4f8196df306ade8fd8fc40b9e8",
    )?;
    let block_height: i32 = 122740;
    let block_txs_by_hash = client.block_txs_by_hash(&block_hash, 0).await?;
    let block_txs_by_height =
        client.block_txs_by_height(block_height, 0).await?;
    assert_eq!(block_txs_by_hash, block_txs_by_height);

    let num_txs_in_block: u32 = block_txs_by_hash.num_txs;
    assert_eq!(block_txs_by_hash.num_txs, 64);

    let num_txs_in_page: u32 = block_txs_by_hash.txs.len().try_into().unwrap();
    assert_eq!(
        block_txs_by_hash.num_pages,
        num_txs_in_block / num_txs_in_page + 1
    );

    // Same page size gives the same result
    let page_size: usize = num_txs_in_page.try_into().unwrap();
    let block_txs_by_hash_with_page_size = client
        .block_txs_by_hash_with_page_size(&block_hash, 0, page_size)
        .await?;
    let block_txs_by_height_with_page_size = client
        .block_txs_by_height_with_page_size(block_height, 0, page_size)
        .await?;

    assert_eq!(
        block_txs_by_hash_with_page_size,
        block_txs_by_height_with_page_size
    );
    assert_eq!(block_txs_by_hash_with_page_size, block_txs_by_hash);

    let block_txs_by_hash_with_max_page_size = client
        .block_txs_by_hash_with_page_size(&block_hash, 0, 64)
        .await?;
    assert_eq!(block_txs_by_hash_with_max_page_size.num_pages, 1);
    assert_eq!(block_txs_by_hash_with_max_page_size.num_txs, 64);
    assert_eq!(block_txs_by_hash_with_max_page_size.txs.len(), 64);

    Ok(())
}

#[tokio::test]
pub async fn test_chronik_info() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let version_string = client.chronik_info().await?.version;
    let re = Regex::new(r"^v\d+\.\d+\.\d+(-[a-f0-9]+)?$").unwrap();
    assert_eq!(re.is_match(version_string.as_str()), true);
    Ok(())
}

#[tokio::test]
pub async fn test_slpv1_token() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let token_id = Sha256d::from_be_hex(
        "0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073",
    )?;
    let token = client.token(&token_id).await?;
    let block_hash = Sha256d::from_be_hex(
        "00000000000000002686aa5ffa8401c7ed67338fb9475561b2fa9817d6571da8",
    )?;
    assert_eq!(
        token,
        proto::TokenInfo {
            token_id: token_id.hex_be(),
            token_type: Some(proto::TokenType {
                token_type: Some(token_type::TokenType::Slp(
                    proto::SlpTokenType::Fungible as _
                ))
            }),
            genesis_info: Some(proto::GenesisInfo {
                token_ticker: b"USDR".to_vec(),
                token_name: b"RaiUSD".to_vec(),
                mint_vault_scripthash: vec![],
                url: b"https://www.raiusd.co/etoken".to_vec(),
                hash: vec![],
                data: vec![],
                auth_pubkey: vec![],
                decimals: 4,
            }),
            block: Some(proto::BlockMetadata {
                hash: block_hash.0.as_slice().to_vec(),
                height: 697721,
                timestamp: 1627783243,
                is_final: true,
            }),
            time_first_seen: token.time_first_seen,
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_slpv2_token() -> Result<()> {
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let token_id = Sha256d::from_be_hex(
        "cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145",
    )?;
    let token = client.token(&token_id).await?;
    let block_hash = Sha256d::from_be_hex(
        "00000000000000000b7e89959ee52ca1cd691e1fc3b4891c1888f84261c83e73",
    )?;
    assert_eq!(
        token,
        proto::TokenInfo {
            token_id: token_id.hex_be(),
            token_type: Some(proto::TokenType {
                token_type: Some(token_type::TokenType::Alp(
                    proto::AlpTokenType::Standard as _
                ))
            }),
            genesis_info: Some(proto::GenesisInfo {
                token_ticker: b"CRD".to_vec(),
                token_name: b"Credo In Unum Deo".to_vec(),
                mint_vault_scripthash: vec![],
                url: b"https://crd.network/token".to_vec(),
                hash: vec![],
                data: vec![],
                auth_pubkey: hex::decode(
                    "0334b744e6338ad438c92900c0ed1869c3fd2c0f35a4a9b97a884\
                     47b6e2b145f10"
                )
                .unwrap(),
                decimals: 4,
            }),
            block: Some(proto::BlockMetadata {
                hash: block_hash.0.as_slice().to_vec(),
                height: 795680,
                timestamp: 1686305735,
                is_final: true,
            }),
            time_first_seen: token.time_first_seen,
        },
    );
    Ok(())
}

#[tokio::test]
pub async fn test_history() -> Result<()> {
    let genesis_pk = hex::decode(GENESIS_PK_HEX)?;
    let client = ChronikClient::new(CHRONIK_URL.to_string())?;
    let history = client
        .script(ScriptType::P2pk, &genesis_pk)
        .confirmed_txs(0)
        .await?;
    assert_eq!(history.num_pages, 1);
    assert_eq!(
        history.txs[0].txid,
        Sha256d::from_be_hex(
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
        )?
        .0
        .as_slice()
        .to_vec(),
    );
    Ok(())
}
