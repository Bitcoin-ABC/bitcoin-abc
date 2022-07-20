use abc_rust_error::Report;
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
enum E1 {
    #[error("Variant")]
    A,
}

#[derive(Debug, Error, PartialEq)]
enum E2 {}

#[test]
fn test_error() {
    assert_eq!(Report::from(E1::A).downcast::<E1>().unwrap(), E1::A);
    assert!(Report::from(E1::A).downcast::<E2>().is_err());
}
