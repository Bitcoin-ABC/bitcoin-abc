// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ReportError`].

use abc_rust_error::{parse_error_status, Report};
use axum::response::{IntoResponse, Response};
use chronik_proto::proto;
use chronik_util::{log, log_chronik};
use http::StatusCode;

use crate::{protobuf::Protobuf, server::ChronikServerError};

/// Wrapper around [`Report`] which can be converted into a [`Response`].
#[derive(Debug)]
pub struct ReportError(pub Report);

impl From<Report> for ReportError {
    fn from(err: Report) -> Self {
        ReportError(err)
    }
}

impl From<ChronikServerError> for ReportError {
    fn from(err: ChronikServerError) -> Self {
        ReportError(err.into())
    }
}

pub(crate) fn report_status_error(
    report: Report,
) -> (StatusCode, proto::Error) {
    let msg = report.to_string();
    let (status_code, response_msg) = match parse_error_status(&msg) {
        None => {
            // Unknown internal error: don't expose potential
            // vulnerabilities through HTTP, only log to node.
            log_chronik!("{report:?}\n");
            log!("Chronik HTTP server got an unknown error: {report:#}\n");
            let unknown_msg = "Unknown error, contact admins".to_string();
            (StatusCode::INTERNAL_SERVER_ERROR, unknown_msg)
        }
        Some(status) if status.is_server_error() => {
            // Internal server error, but explicitly marked with "5xx: ", so
            // we expose it through HTTP (and also log to node).
            log_chronik!("{report:?}\n");
            log!(
                "Chronik HTTP server got an internal server error: \
                 {report:#}\n"
            );
            (status, msg)
        }
        Some(status) => {
            // "Normal" error (400, 404, etc.), expose, but don't log.
            (status, msg)
        }
    };
    let proto_response = proto::Error { msg: response_msg };
    (status_code, proto_response)
}

impl IntoResponse for ReportError {
    fn into_response(self) -> Response {
        let ReportError(report) = self;
        let (code, proto_response) = report_status_error(report);
        (code, Protobuf(proto_response)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use axum::response::IntoResponse;
    use chronik_proto::proto;
    use http_body_util::BodyExt;
    use hyper::StatusCode;
    use prost::Message;
    use thiserror::Error;

    use crate::error::ReportError;

    #[tokio::test]
    async fn test_report_error() -> Result<()> {
        #[derive(Debug, Error)]
        enum TestError {
            #[error("Something obsure")]
            Obsure,
            #[error("500: Cable eaten by cat")]
            CableEaten,
            #[error("501: Never implemented")]
            NeverImplemented,
            #[error("400: Request encoding not code page 65001")]
            NotCp65001,
        }

        async fn make_error_response(
            err: TestError,
        ) -> Result<(StatusCode, proto::Error)> {
            let report_err = ReportError(err.into());
            let response = report_err.into_response();
            let status = response.status();
            let body = response.into_body().collect().await?.to_bytes();
            let proto_error = proto::Error::decode(body)?;
            Ok((status, proto_error))
        }

        assert_eq!(
            make_error_response(TestError::Obsure).await?,
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                proto::Error {
                    msg: "Unknown error, contact admins".to_string(),
                },
            ),
        );

        assert_eq!(
            make_error_response(TestError::CableEaten).await?,
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                proto::Error {
                    msg: "500: Cable eaten by cat".to_string(),
                },
            ),
        );

        assert_eq!(
            make_error_response(TestError::NeverImplemented).await?,
            (
                StatusCode::NOT_IMPLEMENTED,
                proto::Error {
                    msg: "501: Never implemented".to_string(),
                },
            ),
        );

        assert_eq!(
            make_error_response(TestError::NotCp65001).await?,
            (
                StatusCode::BAD_REQUEST,
                proto::Error {
                    msg: "400: Request encoding not code page 65001"
                        .to_string(),
                },
            ),
        );

        Ok(())
    }
}
