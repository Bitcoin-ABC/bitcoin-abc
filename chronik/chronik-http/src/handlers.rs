//! Module for Chronik handlers.

use abc_rust_error::Report;
use hyper::Uri;
use thiserror::Error;

use crate::error::ReportError;

/// Errors for HTTP handlers.
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikHandlerError {
    /// Not found
    #[error("404: Not found: {0}")]
    RouteNotFound(Uri),
}

use self::ChronikHandlerError::*;

/// Fallback route that returns a 404 response
pub async fn handle_not_found(uri: Uri) -> Result<(), ReportError> {
    Err(Report::from(RouteNotFound(uri)).into())
}
