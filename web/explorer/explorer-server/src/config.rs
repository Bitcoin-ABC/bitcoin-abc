use std::{net::SocketAddr, path::PathBuf};

use abc_rust_error::Result;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Config {
    pub host: SocketAddr,
    pub chronik_api_url: String,
    pub base_dir: Option<PathBuf>,
    pub chain: Option<String>,
    pub network_selector: Option<bool>,
}

pub fn load_config(config_string: &str) -> Result<Config> {
    let config: Config = toml::from_str(config_string).unwrap();
    Ok(config)
}
