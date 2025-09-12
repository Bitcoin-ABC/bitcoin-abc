// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::path::PathBuf;

use anyhow::Result;
use clap::{Parser, Subcommand};

mod decode;
mod delegate;
mod generatekeypair;
mod getid;
mod io;
mod json;
mod privacy;
mod sign;
mod typedetect;
mod validate;
mod wif;

use decode::decode_command;
use delegate::delegate_command;
use generatekeypair::generate_keypair_command;
use getid::getid_command;
use io::write_output;
use sign::sign_command;
use validate::validate_command;

#[derive(Parser)]
#[command(name = "proof-manager")]
#[command(
    about = "A CLI tool for managing Avalanche proofs, stakes, and delegations"
)]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Decode/convert between formats (hex, JSON configs)
    Decode {
        /// Type of object to decode (auto-detected if not specified)
        #[arg(short, long)]
        r#type: Option<String>,
        /// Input data (hex string or JSON) - can be provided directly or via
        /// file
        input: Option<String>,
        /// Input file containing hex string or JSON config (alternative to
        /// direct input)
        #[arg(short, long)]
        input_file: Option<PathBuf>,
        /// Output file (optional, defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,
        /// Output format (hex, json, both)
        #[arg(short, long, default_value = "json")]
        format: String,
    },
    /// Sign unsigned content with a private key (secure input)
    Sign {
        /// Type of object to sign (auto-detected if not specified)
        #[arg(short, long)]
        r#type: Option<String>,
        /// Input data (JSON) - can be provided directly or via file
        input: Option<String>,
        /// Input file containing JSON (alternative to direct input)
        #[arg(short, long)]
        input_file: Option<PathBuf>,
        /// Output file with signature added (optional, defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,
        /// Output format (hex, json)
        #[arg(short, long, default_value = "json")]
        format: String,
        /// Proof JSON file path or direct JSON for stake signing (required for
        /// stake type)
        #[arg(short, long)]
        commitment: Option<String>,
        /// Private key in hex or WIF format (if not provided, will prompt
        /// securely via stdin)
        #[arg(long)]
        private_key: Option<String>,
        /// Disable automatic shell history cleanup (not recommended for
        /// security)
        #[arg(long)]
        no_history_cleanup: bool,
    },
    /// Validate a proof, stake, or delegation
    Validate {
        /// Type of object to validate (auto-detected if not specified)
        #[arg(short, long)]
        r#type: Option<String>,
        /// Input data (hex string or JSON) - can be provided directly or via
        /// file
        input: Option<String>,
        /// Input file containing hex string or JSON (alternative to direct
        /// input)
        #[arg(short, long)]
        input_file: Option<PathBuf>,
    },
    /// Create unsigned delegation from proof or existing delegation
    Delegate {
        /// Type of input object (proof, delegation) - auto-detected if not
        /// specified
        #[arg(short, long)]
        r#type: Option<String>,
        /// Input data (hex string or JSON) - can be provided directly or via
        /// file
        input: Option<String>,
        /// Input file containing proof or delegation (alternative to direct
        /// input)
        #[arg(short, long)]
        input_file: Option<PathBuf>,
        /// Public key to delegate to (hex format)
        #[arg(short, long)]
        pubkey: String,
        /// Output file (optional, defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Get IDs from proof, stake, or delegation
    GetId {
        /// Type of object (auto-detected if not specified)
        #[arg(short, long)]
        r#type: Option<String>,
        /// Input data (hex string or JSON) - can be provided directly or via
        /// file
        input: Option<String>,
        /// Input file containing hex string or JSON (alternative to direct
        /// input)
        #[arg(short, long)]
        input_file: Option<PathBuf>,
        /// Output file (optional, defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Generate a secure random keypair using avalanche-lib-wasm crypto
    GenerateKeypair {
        /// Output file (optional, defaults to stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Decode {
            r#type,
            input,
            input_file,
            output,
            format,
        } => decode_command(r#type, input, input_file, output, format),
        Commands::Sign {
            r#type,
            input,
            input_file,
            output,
            format,
            commitment,
            private_key,
            no_history_cleanup,
        } => sign_command(
            r#type,
            input,
            input_file,
            output,
            format,
            commitment,
            private_key,
            no_history_cleanup,
        ),
        Commands::Validate {
            r#type,
            input,
            input_file,
        } => validate_command(r#type, input, input_file),
        Commands::Delegate {
            r#type,
            input,
            input_file,
            pubkey,
            output,
        } => delegate_command(r#type, input, input_file, pubkey, output),
        Commands::GetId {
            r#type,
            input,
            input_file,
            output,
        } => getid_command(r#type, input, input_file, output),
        Commands::GenerateKeypair { output } => {
            generate_keypair_command(output)
        }
    }
}
