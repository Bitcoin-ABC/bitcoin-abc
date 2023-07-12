# Electrum ABC - Lightweight eCash client

Electrum ABC is an open source, fast and secure eCash wallet for Windows, MacOS and Linux.
It supports mnemonic seed phrases, hardware wallets, multisig wallets, and importing
private keys or addresses.

It enables you to verify that your transactions are in the blockchain without downloading
the entire blockchain or trusting a centralized server, by using the
Simple Payment Verification described in the Bitcoin whitepaper.

Anyone can run a backend server for Electrum ABC — no single entity controls the network.

## Getting started

Electrum ABC can be run from source or from one of the binary releases
that can be downloaded from [bitcoinabc.org/electrum](https://www.bitcoinabc.org/electrum).
The binary releases are recommended for most users.

Running from source is useful for developers or if no binary release is provided for your OS.

Documentation about how to run the application from source is provided in the
[CONTRIBUTING.md](CONTRIBUTING.md) file.

A `.tar.gz` source package is provided for each release. This package contains all
required dependencies and some optional compiled libraries (`libsecp256k1`, `libzbar`)
to run the application from source on Linux.

## Hardware Wallets

Electrum ABC natively supports Ledger, Trezor and Satochip hardware wallets.
You need additional dependencies when running from source:
```
pip3 install -r contrib/requirements/requirements-hw.txt
```

If you still have problems connecting to your Nano S please have a look at this
[troubleshooting](https://support.ledger.com/hc/en-us/articles/115005165269-Fix-connection-issues) section on Ledger website.

## Verifying Release Binaries

See [contrib/pubkeys/README.md](contrib/pubkeys/README.md)

## Release notes

Find out about new features and bugfixes in the [release notes](RELEASE-NOTES.md).

## Contributing or contacting developers

See the dedicated [CONTRIBUTING.md](CONTRIBUTING.md) document for instructions
about how to contribute to the project and how to contact developers for support.

## Credits

Electrum ABC is a fork of the open source BCH *Electron Cash* wallet, which is itself a
fork of the BTC *Electrum* wallet.

The Electrum ABC software is NOT affiliated, associated, or endorsed by
Electron Cash, electroncash.org, Electrum or electrum.org.
