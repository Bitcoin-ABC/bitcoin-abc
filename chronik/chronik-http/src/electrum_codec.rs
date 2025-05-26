// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use karyon_jsonrpc::{
    codec::{ByteBuffer, Codec, Decoder, Encoder},
    error::{Error, Result},
};

#[derive(Clone)]
pub(crate) struct ElectrumCodec;

impl Codec for ElectrumCodec {
    type Error = Error;
    type Message = serde_json::Value;
}

impl Encoder for ElectrumCodec {
    type EnError = Error;
    type EnMessage = serde_json::Value;

    fn encode(
        &self,
        src: &Self::EnMessage,
        dst: &mut ByteBuffer,
    ) -> Result<usize> {
        let msg = serde_json::to_string(src)
            .map_err(|err| Error::Encode(err.to_string()))?;
        let buf = msg.as_bytes();

        dst.extend_from_slice(buf);
        // Fulcrum adds a newline as a separator, so we oblige. This is
        // permitted by the json-rpc standard so this server encoding is still
        // compliant.
        dst.extend_from_slice(b"\n");
        Ok(buf.len() + 1)
    }
}

impl Decoder for ElectrumCodec {
    type DeError = Error;
    type DeMessage = serde_json::Value;

    fn decode(
        &self,
        src: &mut ByteBuffer,
    ) -> Result<Option<(usize, Self::DeMessage)>> {
        let de = serde_json::Deserializer::from_slice(src.as_ref());
        let mut iter = de.into_iter::<serde_json::Value>();

        let item = match iter.next() {
            Some(Ok(item)) => item,
            Some(Err(e)) if e.is_eof() => return Ok(None),
            Some(Err(e)) => return Err(Error::Decode(e.to_string())),
            None => return Ok(None),
        };

        Ok(Some((iter.byte_offset(), item)))
    }
}
