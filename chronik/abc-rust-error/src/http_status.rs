// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use http::StatusCode;

/// Parse an error of the form "NNN: Error message", where NNN is an HTTP status
/// code.
///
/// ```
/// # use abc_rust_error::parse_error_status;
/// use http::StatusCode as SC;
///
/// assert_eq!(parse_error_status("404: Nada"), Some(SC::NOT_FOUND));
/// assert_eq!(parse_error_status("200: "), Some(SC::OK));
/// assert_eq!(parse_error_status("418: Earl Gray"), Some(SC::IM_A_TEAPOT));
/// assert_eq!(parse_error_status("199: ???"), SC::from_u16(199).ok());
/// assert_eq!(parse_error_status("499: ???"), SC::from_u16(499).ok());
///
/// let invalid_msgs = [
///     "1000: Nope",
///     "10: Nope",
///     "abc: Nope",
///     "000: Nope",
///     "400_ Nope",
///     "400:Nope",
/// ];
///
/// for invalid_msg in invalid_msgs {
///     let status = parse_error_status(invalid_msg);
///     assert_eq!(status, None);
/// }
/// ```
pub fn parse_error_status(error_msg: &str) -> Option<StatusCode> {
    let status_prefix = error_msg.as_bytes().get(..5);
    let status_bytes = match status_prefix {
        Some([status_bytes @ .., b':', b' ']) => status_bytes,
        _ => return None,
    };
    StatusCode::from_bytes(status_bytes).ok()
}
