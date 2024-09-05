use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse, Response},
};

use crate::templating::ErrorTemplate;

pub struct ServerError {
    pub message: String,
}

impl IntoResponse for ServerError {
    fn into_response(self) -> Response {
        let network_selector = false;
        let error_template = ErrorTemplate {
            message: self.message,
            network_selector,
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
