// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use chronik_util::log_chronik;
use karyon_jsonrpc::{
    codec::{Codec, Decoder, Encoder},
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

    fn encode(&self, src: &Self::EnMessage, dst: &mut [u8]) -> Result<usize> {
        let msg = serde_json::to_string(src)
            .map_err(|err| Error::Encode(err.to_string()))?;
        let buf = msg.as_bytes();

        // Make sure there is enough room allocated in the dst buffer
        if buf.len() + 1 > dst.len() {
            log_chronik!(
                "Electrum encoding error: the message does not fit in the \
                 encoding buffer\n"
            );
            return Err(Error::Encode(
                "the message does not fit in the encoding buffer".into(),
            ));
        }

        dst[..buf.len()].copy_from_slice(buf);
        // Fulcrum adds a newline as a separator, so we oblige. This is
        // permitted by the json-rpc standard so this server encoding is still
        // compliant.
        dst[buf.len()] = b'\n';
        Ok(buf.len() + 1)
    }
}

impl Decoder for ElectrumCodec {
    type DeError = Error;
    type DeMessage = serde_json::Value;

    fn decode(
        &self,
        src: &mut [u8],
    ) -> Result<Option<(usize, Self::DeMessage)>> {
        let de = serde_json::Deserializer::from_slice(src);
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
