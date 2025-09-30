// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::env;
use std::fs;
use std::process::Command;

use anyhow::{Context, Result};

/// Attempt to clean up shell history to remove the command with private key
pub fn attempt_history_cleanup() -> Result<()> {
    // Get the current shell
    let shell = env::var("SHELL").unwrap_or_default();

    if shell.contains("bash") {
        // For bash, try to use history -d command
        let output = Command::new("bash")
            .arg("-c")
            .arg("history -d $((HISTCMD-1)) 2>/dev/null || true")
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                return Ok(());
            }
        }
    } else if shell.contains("zsh") {
        // For zsh, try to manipulate the history file
        if let Ok(histfile) = env::var("HISTFILE") {
            if remove_last_line_from_file(&histfile).is_err() {
                // Fallback: try to use fc command
                let output = Command::new("zsh")
                    .arg("-c")
                    .arg("fc -R && fc -W 2>/dev/null || true")
                    .output();

                if let Ok(output) = output {
                    if output.status.success() {
                        return Ok(());
                    }
                }
            } else {
                return Ok(());
            }
        }
    }

    // Generic fallback - try to detect and clean common history files
    if let Ok(home) = env::var("HOME") {
        let common_history_files = vec![
            format!("{}/.bash_history", home),
            format!("{}/.zsh_history", home),
            format!("{}/.history", home),
        ];

        for histfile in common_history_files {
            if std::path::Path::new(&histfile).exists()
                && remove_last_line_from_file(&histfile).is_ok()
            {
                return Ok(());
            }
        }
    }

    anyhow::bail!("Unable to automatically clean history")
}

fn remove_last_line_from_file(filepath: &str) -> Result<()> {
    let content = fs::read_to_string(filepath).with_context(|| {
        format!("Failed to read history file: {}", filepath)
    })?;

    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return Ok(());
    }

    // Remove the last line (which should be our command with private key)
    let new_content = lines[..lines.len().saturating_sub(1)].join("\n");
    if !new_content.is_empty() {
        let new_content = new_content + "\n";
        fs::write(filepath, new_content).with_context(|| {
            format!("Failed to write history file: {}", filepath)
        })?;
    } else {
        fs::write(filepath, "").with_context(|| {
            format!("Failed to write history file: {}", filepath)
        })?;
    }

    Ok(())
}
