Bitcoin XBT
=====================

Setup
---------------------
Bitcoin XBT is an identical and fully compatible implementation of the Bitcoin ABC protocol, which has been forked from Bitcoin Core as of Aug 1st 2017, Bitcoin/Core was the original Bitcoin client from 2009-2017 and built the backbone of the Bitcoin network. Bitcoin XBT builds upon previous implementations of Bitcoin by allowing up to 8mb blocks to be propagated to the network (default 2mb). BitcoinXBT downloads and stores the entire history of Bitcoin transactions (which is currently over 100 GB in size); depending on the speed of your computer and network connection, the full synchronization process can take anywhere from a 24 hours to a few days..

To download Bitcoin XBT, visit [bitcoinxbt.org](https://download.bitcoinxbt.org/).

Running
---------------------
The following are some helpful notes on how to run Bitcoin on your native platform.

### Unix

Unpack the files into a directory and run:

- `bin/bitcoin-qt` (GUI) or
- `bin/bitcoind` (headless)

### Windows

Unpack the files into a directory, and then run bitcoin-qt.exe.

### OS X

Drag bitcoin-xbt to your applications folder, and then run bitcoin-XBT.

### Need Help?

* See the documentation at the [Bitcoin Wiki](https://en.bitcoin.it/wiki/Main_Page)
for help and more information.
* Ask for help on the [Bitcoin XBT Subreddit](https://www.reddit.com/r/BitcoinXBT/).

Building
---------------------
The following are developer notes on how to build Bitcoin on your native platform. They are not complete guides, but include notes on the necessary libraries, compile flags, etc.

- [OS X Build Notes](build-osx.md)
- [Unix Build Notes](build-unix.md)
- [Windows Build Notes](build-windows.md)
- [OpenBSD Build Notes](build-openbsd.md)
- [Gitian Building Guide](gitian-building.md)

Development
---------------------
The Bitcoin XBT repo's [root README](/README.md) contains relevant information on the development process and automated testing.

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
Distributed under the [MIT software license](/COPYING).
This product includes software developed by the OpenSSL Project for use in the [OpenSSL Toolkit](https://www.openssl.org/). This product includes
cryptographic software written by Eric Young ([eay@cryptsoft.com](mailto:eay@cryptsoft.com)), and UPnP software written by Thomas Bernard.
