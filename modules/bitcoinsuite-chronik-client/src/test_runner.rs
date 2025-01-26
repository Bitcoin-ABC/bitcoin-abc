// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{env, sync::Arc};

use abc_rust_error::{bail, Result};
use serde_json::Value;
use tokio::{io, io::AsyncReadExt, net::UnixListener, process::Command};

use crate::handler::{IpcHandler, IpcReader};

pub async fn spin_child_process(
    python_script: &str,
    ipc_reader: Arc<dyn IpcReader>,
) -> io::Result<()> {
    let script_name = format!("chronik-client_{}", python_script);
    let socket_path = format!("/tmp/{}.socket", python_script);
    let path = std::path::Path::new(&socket_path);

    if path.exists() {
        std::fs::remove_file(path).unwrap_or_else(|_| {
            panic!("Failed to remove file {}", socket_path);
        });
    }

    let build_dir = env::var("BUILD_DIR").unwrap_or_else(|_| ".".to_string());

    let python_command = if Command::new("python3")
        .arg("--version")
        .output()
        .await
        .is_ok()
    {
        "python3"
    } else {
        "python"
    };

    println!("Starting test_runner for {}", script_name);
    let mut child = Command::new(python_command)
        .arg("test/functional/test_runner.py")
        .arg(format!("setup_scripts/{}", script_name))
        .current_dir(build_dir)
        .env("CHRONIK_CLIENT_RUST_IPC_SOCKET", socket_path.clone())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .expect("Failed to start Python process");

    let socket_listener = UnixListener::bind(&socket_path)
        .unwrap_or_else(|_| panic!("Failed to bind to socket {}", socket_path));
    println!("Rust IPC server is listening on {:?}", socket_path);

    let (socket, _) = socket_listener
        .accept()
        .await
        .expect("Connection to socket failed");

    let mut handler = IpcHandler::new(socket);

    let ipc_reader_clone = ipc_reader.clone();
    let listen_task = tokio::spawn(async move {
        handler.listen_for_messages(ipc_reader_clone).await
    });

    // Block until the messaging completed and the socket is closed
    let result = listen_task.await;

    // Dump stdout to stderr, this will only be printed upon error
    let mut output = Vec::new();
    child
        .stdout
        .take()
        .unwrap()
        .read_to_end(&mut output)
        .await?;
    eprintln!("\nOutput: {}", String::from_utf8_lossy(&output));

    if result.is_err() {
        // Cause the test to fail
        panic!("Test {script_name} failed!");
    }

    Ok(())
}

pub fn handle_test_info(message: &Value) -> Result<String> {
    if let Some(test_info) = message.as_object() {
        if let Some(chronik_address) =
            test_info.get("chronik").and_then(|v| v.as_str())
        {
            return Ok(chronik_address.to_string());
        }
    }
    bail!(
        "Chronik url is missing from the test_info message: {:?}",
        message
    )
}
