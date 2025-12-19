// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse, Response},
};

use crate::file_hashes::FileHashes;
use crate::templating::ErrorTemplate;

pub struct ServerError {
    pub message: String,
}

impl IntoResponse for ServerError {
    fn into_response(self) -> Response {
        let network_selector = false;
        // If hash calculation fails, use empty strings as fallback
        // (this should not happen in practice, but we handle it gracefully)
        let hashes = *FileHashes::get().unwrap_or(&FileHashes::default());
        let error_template = ErrorTemplate {
            message: self.message,
            network_selector,
            hashes,
        };
        let error_page = error_template.render().unwrap();

        (StatusCode::INTERNAL_SERVER_ERROR, Html(error_page)).into_response()
    }
}

pub fn to_server_error<T: ToString>(err: T) -> ServerError {
    ServerError {
        message: err.to_string(),
    }
}
