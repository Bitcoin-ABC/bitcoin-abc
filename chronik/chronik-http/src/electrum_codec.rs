// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::io;

use karyon_jsonrpc::codec::{ByteBuffer, Codec};
use karyon_net::{layers::ws::Message as WsMessage, Error as NetError};

#[derive(Clone)]
pub(crate) struct ElectrumCodec;

impl Codec<ByteBuffer> for ElectrumCodec {
    type Error = NetError;
    type Message = serde_json::Value;

    fn encode(
        &self,
        src: &Self::Message,
        dst: &mut ByteBuffer,
    ) -> Result<usize, NetError> {
        let msg = serde_json::to_string(src)
            .map_err(|err| NetError::IO(io::Error::other(err)))?;
        let buf = msg.as_bytes();

        dst.extend_from_slice(buf);
        // Fulcrum adds a newline as a separator, so we oblige. This is
        // permitted by the json-rpc standard so this server encoding is still
        // compliant.
        dst.extend_from_slice(b"\n");
        Ok(buf.len() + 1)
    }

    fn decode(
        &self,
        src: &mut ByteBuffer,
    ) -> Result<Option<(usize, Self::Message)>, NetError> {
        let de = serde_json::Deserializer::from_slice(src.as_ref());
        let mut iter = de.into_iter::<serde_json::Value>();

        let item = match iter.next() {
            Some(Ok(item)) => item,
            Some(Err(e)) if e.is_eof() => return Ok(None),
            Some(Err(e)) => return Err(NetError::IO(io::Error::other(e))),
            None => return Ok(None),
        };

        Ok(Some((iter.byte_offset(), item)))
    }
}

impl Codec<WsMessage> for ElectrumCodec {
    type Error = NetError;
    type Message = serde_json::Value;

    fn encode(
        &self,
        src: &Self::Message,
        dst: &mut WsMessage,
    ) -> Result<usize, NetError> {
        let msg = serde_json::to_string(src)
            .map_err(|err| NetError::IO(io::Error::other(err)))?;
        let len = msg.len();
        *dst = WsMessage::Text(msg);
        Ok(len)
    }

    fn decode(
        &self,
        src: &mut WsMessage,
    ) -> Result<Option<(usize, Self::Message)>, NetError> {
        match src {
            WsMessage::Text(s) => {
                let len = s.len();
                let val = serde_json::from_str(s)
                    .map_err(|err| NetError::IO(io::Error::other(err)))?;
                Ok(Some((len, val)))
            }
            WsMessage::Binary(s) => {
                let len = s.len();
                let val = serde_json::from_slice(s)
                    .map_err(|err| NetError::IO(io::Error::other(err)))?;
                Ok(Some((len, val)))
            }
            WsMessage::Close => Err(NetError::ConnectionClosed),
            m => Err(NetError::IO(io::Error::other(format!(
                "Receive unexpected websocket message: {:?}",
                m
            )))),
        }
    }
}
