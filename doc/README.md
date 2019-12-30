Bitcoin ABC
=====================

Setup
---------------------
Bitcoin ABC is a fork of Bitcoin Core, which is the original Bitcoin client and builds the backbone of the network. It downloads and, by default, stores the entire history of Bitcoin transactions, which requires a few hundred gigabytes of disk space. Depending on the speed of your computer and network connection, the synchronization process can take anywhere from a few hours to a day or more.

To download Bitcoin ABC, visit [bitcoinabc.org](https://download.bitcoinabc.org/).

Verify
---------------------

If you download the associated signature files with the binaries from the above link,
you can verify the integrity of the binaries by following these instructions, replacing
VERSION with the value relevant to you:

Get the keys for versions 0.20.11 or later:
```
VERSION="0.20.11"
URL="https://download.bitcoinabc.org/${VERSION}/src/bitcoin-abc-${VERSION}.tar.gz"
KEYS_FILE="bitcoin-abc-${VERSION}/contrib/gitian-signing/keys.txt"
wget -q -O - "${URL}" | tar -zxOf - "${KEYS_FILE}" | while read FINGERPRINT _; do gpg --recv-keys "${FINGERPRINT}"; done
```

Get the keys for versions 0.20.10 or earlier:
```
VERSION="0.20.10"
URL="https://raw.githubusercontent.com/Bitcoin-ABC/bitcoin-abc/v${VERSION}/contrib/gitian-signing/keys.txt"
wget -q -O - "${URL}" | awk 1 | while read FINGERPRINT _; do gpg --recv-keys "${FINGERPRINT}"; done
```

Check the binaries (all versions):
```
FILE_PATTERN="./*-sha256sums.${VERSION}.asc"
gpg --verify-files ${FILE_PATTERN}
grep "bitcoin-abc-${VERSION}" ${FILE_PATTERN} | cut -d " " -f 2- | xargs ls 2> /dev/null |\
  xargs -i grep -h "{}" ${FILE_PATTERN} | uniq | sha256sum -c
```

*IMPORTANT NOTE:* The first time you run this, all of the signing keys will be UNTRUSTED and you will see warnings
indicating this.  For best security practices, you should `gpg --sign-key <signer key>` for each release signer key
and rerun the above script (there should be no warnings the second time). If the keys change unexpectedly,
the presence of those warnings should be heeded with extreme caution.

Running
---------------------
The following are some helpful notes on how to run Bitcoin ABC on your native platform.

### Unix

Unpack the files into a directory and run:

- `bin/bitcoin-qt` (GUI) or
- `bin/bitcoind` (headless)

### Windows

Unpack the files into a directory, and then run bitcoin-qt.exe.

### macOS

Drag bitcoin-abc to your applications folder, and then run bitcoin-abc.

### Need Help?

* See the documentation at the [Bitcoin Wiki](https://en.bitcoin.it/wiki/Main_Page)
for help and more information.
* Ask for help on the [Bitcoin ABC Subreddit](https://www.reddit.com/r/BitcoinABC/).

Building
---------------------
The following are developer notes on how to build Bitcoin ABC on your native platform. They are not complete guides, but include notes on the necessary libraries, compile flags, etc.

- [Dependencies](dependencies.md)
- [macOS Build Notes](build-osx.md)
- [Unix Build Notes](build-unix.md)
- [Windows Build Notes](build-windows.md)
- [Gitian Building Guide](gitian-building.md)

Development
---------------------
The Bitcoin ABC repo's [root README](/README.md) contains relevant information on the development process and automated testing.

- [Developer Notes](developer-notes.md)
- [Release Notes](release-notes.md)
- [Release Process](release-process.md)
- [Source Code Documentation (External Link)](https://dev.visucore.com/bitcoin/doxygen/)
- [Translation Process](translation_process.md)
- [Translation Strings Policy](translation_strings_policy.md)
- [Travis CI](travis-ci.md)
- [Unauthenticated REST Interface](REST-interface.md)
- [Shared Libraries](shared-libraries.md)
- [BIPS](bips.md)
- [Dnsseed Policy](dnsseed-policy.md)
- [Benchmarking](benchmarking.md)

### Miscellaneous
- [Assets Attribution](assets-attribution.md)
- [Files](files.md)
- [Fuzz-testing](fuzzing.md)
- [Reduce Traffic](reduce-traffic.md)
- [Tor Support](tor.md)
- [Init Scripts (systemd/upstart/openrc)](init.md)
- [ZMQ](zmq.md)

License
---------------------
Distribution is done under the [MIT software license](/COPYING).
This product includes software developed by the OpenSSL Project for use in the [OpenSSL Toolkit](https://www.openssl.org/), cryptographic software written by Eric Young ([eay@cryptsoft.com](mailto:eay@cryptsoft.com)), and UPnP software written by Thomas Bernard.
