// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Protobuf`].

use abc_rust_error::Report;
use async_trait::async_trait;
use axum::{
    body::{Body, Bytes},
    extract::{
        rejection::{BytesRejection, FailedToBufferBody},
        FromRequest,
    },
    http::{HeaderValue, Request},
    response::{IntoResponse, Response},
};
use hyper::header::CONTENT_TYPE;
use prost::Message;
use thiserror::Error;

use crate::{error::ReportError, validation::check_content_type};

/// Consensus maximum transaction size in bytes.
/// Keep in sync with C++ `MAX_TX_SIZE`.
pub const MAX_TX_SIZE: usize = 1_000_000;

/// Maximum HTTP request body size for Chronik protobuf POSTs.
/// This is set to twice the maximum transaction size to allow for a full-sized
/// transaction to fit and several standard-sized transactions.
/// Note: at the time of writing this is mostly the same as Axum's default
/// (2 MiB), but it's better to have the limit explicit.
pub const MAX_REQUEST_BODY_SIZE: usize = 2 * MAX_TX_SIZE;

/// Struct for en-/decoding a specific protobuf message `P`:
///
/// Used as:
/// 1. Extractor for requests of a specific message type, and fail otherwise.
/// 2. Response type to return a protobuf encoded message.
///
/// # Example usage
/// ```
/// # use chronik_http::protobuf::Protobuf;
///
/// #[derive(prost::Message)]
/// struct Foo {}
/// #[derive(prost::Message)]
/// struct Bar {}
///
/// async fn handle_protobuf_response(
///     Protobuf(payload): Protobuf<Foo>,
/// ) -> Protobuf<Bar> {
///     Protobuf(Bar {})
/// }
///
/// use axum::{routing::get, Router};
/// fn make_route() -> Router {
///     Router::new().route("/protobuf", get(handle_protobuf_response))
/// }
/// ```
#[derive(Debug)]
pub struct Protobuf<P: Default + Message>(pub P);

/// 'Content-Type' header for protobuf requests/responses
pub const CONTENT_TYPE_PROTOBUF: &str = "application/x-protobuf";

/// Errors indicating something went wrong with [`Protobuf`].
#[derive(Debug, Error)]
pub enum ChronikProtobufError {
    /// Couldn't read body from request
    #[error("400: Invalid body: {0}")]
    InvalidBody(String),

    /// Couldn't decode request body as protobuf
    #[error("400: Bad protobuf: {0}")]
    BadProtobuf(String),

    /// Request body exceeds [`MAX_REQUEST_BODY_SIZE`]
    #[error(
        "413: Request body exceeds maximum size of {MAX_REQUEST_BODY_SIZE} \
         bytes"
    )]
    BodyTooLarge,
}

use self::ChronikProtobufError::*;

#[async_trait]
impl<P: Message + Default, S: Send + Sync> FromRequest<S> for Protobuf<P> {
    type Rejection = ReportError;

    async fn from_request(
        req: Request<Body>,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        check_content_type(req.headers(), CONTENT_TYPE_PROTOBUF)?;
        // Use Bytes so DefaultBodyLimit / into_limited_body applies. A raw
        // Body::collect bypasses Axum's request size limit.
        let mut body_bytes =
            Bytes::from_request(req, state)
                .await
                .map_err(|err| match err {
                    BytesRejection::FailedToBufferBody(
                        FailedToBufferBody::LengthLimitError(_),
                    ) => Report::from(BodyTooLarge),
                    err => Report::from(InvalidBody(err.to_string())),
                })?;
        let proto = P::decode(&mut body_bytes)
            .map_err(|err| Report::from(BadProtobuf(err.to_string())))?;
        Ok(Protobuf(proto))
    }
}

impl<P: Message + Default> IntoResponse for Protobuf<P> {
    fn into_response(self) -> Response {
        let mut response = Response::builder()
            .body(Body::from(self.0.encode_to_vec()))
            .unwrap();
        response.headers_mut().insert(
            CONTENT_TYPE,
            HeaderValue::from_static(CONTENT_TYPE_PROTOBUF),
        );
        response
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use axum::{body::Body, extract::DefaultBodyLimit, routing::get, Router};
    use chronik_proto::proto;
    use http_body_util::BodyExt;
    use hyper::{header::CONTENT_TYPE, Request, StatusCode};
    use prost::Message;
    use thiserror::Error;
    use tower_service::Service;

    use crate::protobuf::{
        Protobuf, CONTENT_TYPE_PROTOBUF, MAX_REQUEST_BODY_SIZE,
    };

    #[tokio::test]
    async fn test_protobuf() -> Result<()> {
        #[derive(prost::Message, PartialEq)]
        struct Foo {
            #[prost(int32, tag = "1")]
            number: i32,
        }
        #[derive(prost::Message, PartialEq)]
        struct Bar {
            #[prost(int32, tag = "2")]
            number_inc: i32,
        }

        async fn handle_protobuf_response(
            Protobuf(payload): Protobuf<Foo>,
        ) -> Protobuf<Bar> {
            Protobuf(Bar {
                number_inc: payload.number + 1,
            })
        }

        let mut router = Router::<()>::new()
            .route("/", get(handle_protobuf_response))
            .layer(DefaultBodyLimit::max(MAX_REQUEST_BODY_SIZE));

        // No Content-Type
        let response =
            router.call(Request::builder().body(Body::empty())?).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(
            proto::Error::decode(body)?,
            proto::Error {
                msg: "400: No Content-Type set".to_string(),
            },
        );

        // Content-Type invalid UTF-8
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, b"\xff".as_ref())
                    .body(Body::empty())?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(
            proto::Error::decode(body)?,
            proto::Error {
                msg: "400: Content-Type bad encoding: failed to convert \
                      header to a str"
                    .to_string(),
            },
        );

        // Content-Type is not application/x-protobuf
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, "text/not-protobuf")
                    .body(Body::empty())?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(
            proto::Error::decode(body)?,
            proto::Error {
                msg: "400: Content-Type must be application/x-protobuf, got \
                      text/not-protobuf"
                    .to_string(),
            },
        );

        // Bad body
        #[derive(Debug, Error)]
        #[error("Test bad body error")]
        struct TestBadBodyError;

        let bad_result: Result<&[u8], _> = Err(TestBadBodyError);
        let bad_body_future = futures::future::ready(bad_result);
        let bad_body =
            Body::from_stream(futures::stream::once(bad_body_future));
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, CONTENT_TYPE_PROTOBUF)
                    .body(bad_body)?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await?.to_bytes();
        let proto_error = proto::Error::decode(body)?;
        assert!(
            proto_error.msg.starts_with("400: Invalid body:"),
            "unexpected error: {}",
            proto_error.msg,
        );

        // Bad protobuf
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, CONTENT_TYPE_PROTOBUF)
                    .body(Body::from(vec![0xff]))?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(
            proto::Error::decode(body)?,
            proto::Error {
                msg: "400: Bad protobuf: failed to decode Protobuf message: \
                      invalid varint"
                    .to_string(),
            },
        );

        // Oversized body
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, CONTENT_TYPE_PROTOBUF)
                    .body(Body::from(vec![0u8; MAX_REQUEST_BODY_SIZE + 1]))?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(
            proto::Error::decode(body)?,
            proto::Error {
                msg: format!(
                    "413: Request body exceeds maximum size of {} bytes",
                    MAX_REQUEST_BODY_SIZE,
                ),
            },
        );

        // Success
        let response = router
            .call(
                Request::builder()
                    .header(CONTENT_TYPE, CONTENT_TYPE_PROTOBUF)
                    .body(Body::from(Foo { number: 100 }.encode_to_vec()))?,
            )
            .await?;
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await?.to_bytes();
        assert_eq!(Bar::decode(body)?, Bar { number_inc: 101 });

        Ok(())
    }
}
