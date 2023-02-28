// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use axum::http::{header::CONTENT_TYPE, HeaderMap};
use thiserror::Error;

/// Error indicating some server-side validation failed
#[derive(Debug, Error)]
pub(crate) enum ServerValidationError {
    /// 'Content-Type' header missing
    #[error("400: No Content-Type set")]
    NoContentTypeSet,

    /// 'Content-Type' header value is not valid UTF-8
    #[error("400: Content-Type bad encoding: {0}")]
    BadContentType(String),

    /// 'Content-Type' header value is not the expected type
    #[error("400: Content-Type must be {expected}, got {actual}")]
    WrongContentType {
        /// Expected content type
        expected: &'static str,
        /// Actual content type
        actual: String,
    },
}

use self::ServerValidationError::*;

/// Verify the `Content-Type` header of a request matches the expected value.
pub(crate) fn check_content_type(
    headers: &HeaderMap,
    expected: &'static str,
) -> Result<()> {
    let content_type = headers.get(CONTENT_TYPE).ok_or(NoContentTypeSet)?;
    let content_type = content_type
        .to_str()
        .map_err(|err| BadContentType(err.to_string()))?;
    if content_type != expected {
        return Err(WrongContentType {
            expected,
            actual: content_type.to_string(),
        }
        .into());
    }
    Ok(())
}
