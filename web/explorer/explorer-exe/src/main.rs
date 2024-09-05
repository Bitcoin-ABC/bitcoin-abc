use std::{fs, sync::Arc};

use axum::Extension;
use bitcoinsuite_chronik_client::ChronikClient;
use bitcoinsuite_error::Result;
use explorer_server::{chain::Chain, config, server::Server};

#[tokio::main]
async fn main() -> Result<()> {
    let config_path = std::env::args().nth(1);
    let config_path = config_path.as_deref().unwrap_or("config.toml");
    let config_string = fs::read_to_string(config_path)?;
    let config = config::load_config(&config_string)?;

    let chronik = ChronikClient::new(config.chronik_api_url)?;
    let base_dir = config
        .base_dir
        .unwrap_or_else(|| "../explorer-server".into());
    let chain = config
        .chain
        .unwrap_or("mainnet".to_string())
        .parse::<Chain>()?;
    let network_selector = config.network_selector.unwrap_or(false);
    let server = Arc::new(
        Server::setup(chronik, base_dir, chain, network_selector).await?,
    );
    let app = server.router().layer(Extension(server));

    axum::Server::bind(&config.host)
        .serve(app.into_make_service())
        .await
        .unwrap();

    Ok(())
}
