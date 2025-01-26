// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::io::{self, ErrorKind};
use std::sync::Arc;

use abc_rust_error::Result;
use async_trait::async_trait;
use serde_json::{from_str, Value};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader, ReadHalf, WriteHalf},
    net::UnixStream,
};

#[derive(Debug)]
pub struct IpcHandler {
    pub reader: BufReader<ReadHalf<UnixStream>>,
    pub writer: WriteHalf<UnixStream>,
}

#[async_trait]
pub trait IpcReader: Sync + Send {
    async fn on_rx(
        &self,
        handler: &mut IpcHandler,
        json_data: Value,
    ) -> Result<()>;
}

// Split the stream so we can handle reader and writer operations separately
impl IpcHandler {
    pub fn new(stream: UnixStream) -> Self {
        let (reader, writer) = tokio::io::split(stream);
        Self {
            reader: BufReader::new(reader),
            writer,
        }
    }

    pub async fn listen_for_messages(
        &mut self,
        ipc_reader: Arc<dyn IpcReader>,
    ) -> io::Result<()> {
        let mut buffer = String::new();

        loop {
            buffer.clear();

            let bytes_read = self.reader.read_line(&mut buffer).await?;
            if bytes_read == 0 {
                eprintln!("EOF: Connection closed by client");
                break Ok(());
            }

            let message = buffer.trim().to_string();

            if let Err(err) = match from_str::<Value>(&message) {
                Ok(json_data) => {
                    ipc_reader.on_rx(self, json_data).await.map_err(|e| {
                        io::Error::new(
                            ErrorKind::InvalidData,
                            format!("on_rx failed: {}", e),
                        )
                    })
                }
                Err(e) => Err(io::Error::new(
                    ErrorKind::InvalidData,
                    format!("Failed to parse JSON: {}", e),
                )),
            } {
                self.send_message("stop").await.unwrap();
                return Err(err);
            }
        }
    }

    /// Send message (encoded using JSON) to the handler‘s UnixStream
    pub async fn send_message(&mut self, message: &str) -> io::Result<()> {
        let json_message = serde_json::to_string(&message)?;
        self.writer.write_all(json_message.as_bytes()).await?;
        self.writer.write_all(b"\n").await?;
        self.writer.flush().await?;

        println!("Sent: {}", message);

        Ok(())
    }
}
