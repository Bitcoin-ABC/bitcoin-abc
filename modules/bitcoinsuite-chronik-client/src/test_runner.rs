// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::env;

use tokio::net::UnixListener;
use tokio::process::{Child, Command};

pub async fn spin_child_process(
    python_script: &str,
    socket_path: &str,
) -> Child {
    let script_name = format!("chronik-client_{}", python_script);

    if std::path::Path::new(&socket_path).exists() {
        std::fs::remove_file(socket_path).unwrap_or_else(|_| {
            panic!("Failed to remove file {}", socket_path)
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
    let child = Command::new(python_command)
        .arg("test/functional/test_runner.py")
        .arg(format!("setup_scripts/{}", script_name))
        .current_dir(build_dir)
        .env("CHRONIK_CLIENT_RUST_IPC_SOCKET", socket_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn() // Start the child process
        .expect("Failed to start Python process");

    let socket_listener = UnixListener::bind(socket_path)
        .unwrap_or_else(|_| panic!("Failed to bind to socket {}", socket_path));
    println!("Rust IPC server is listening on {:?}", socket_path);

    tokio::spawn(async move {
        let (_socket, _) = socket_listener.accept().await.unwrap();
    });

    child
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tokio;
    use tokio::io::{AsyncBufReadExt, BufReader};
    use tokio::time::timeout;

    use super::*;

    #[tokio::test]
    async fn test_socket() {
        let socket_path = "/tmp/test_env_vars.socket";
        let python_script = "chronik_info";
        let mut child = spin_child_process(python_script, socket_path).await;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let timeout_duration = Duration::from_secs(60);
            let mut socket_found = false;
            let mut socket_connection_found = false;

            // Use timeout to wrap the whole loop for 3 seconds
            let result = timeout(timeout_duration, async {
                while let Some(line) = lines.next_line().await.unwrap() {
                    println!("{}", line);
                    if line.trim() == "SOCKET IS FOUND" {
                        socket_found = true;
                    } else if line.trim() == "SOCKET CONNECTION ACCEPTED" {
                        socket_connection_found = true;
                    }
                    if socket_connection_found && socket_found {
                        child
                            .kill()
                            .await
                            .expect("Failed to kill python process");
                        return; // Exit after killing the process
                    }
                }
            })
            .await;

            match &result {
                Ok(_) => {
                    println!("Env vars have been found: exiting");
                }
                Err(e) => {
                    println!("Timeout reached: {}", e);
                    // Only kill the child if there was an error (don't override
                    // error)
                    if let Err(kill_error) = child.kill().await {
                        eprintln!(
                            "Error killing child process: {}",
                            kill_error
                        );
                    }
                }
            }

            assert_eq!(result, Ok(()));
        }
    }
}
