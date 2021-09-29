macOS Build Instructions and Notes
====================================
The commands in this guide should be executed in a Terminal application.
The built-in one is located in `/Applications/Utilities/Terminal.app`.

Preparation
-----------

1.  Install Xcode from the app store if you don't have it already (it's a dependency for qt5)

2.  Install the macOS command line tools:

`xcode-select --install`

When the popup appears, click `Install`.

3.  Install [Homebrew](https://brew.sh).

Dependencies
----------------------

Install dependencies:

    brew install berkeley-db boost cmake jemalloc libevent librsvg miniupnpc ninja openssl protobuf python qrencode qt@5 zeromq

See [dependencies.md](dependencies.md) for a complete overview.

If you want to build the disk image with `ninja osx-dmg` (.dmg / optional), you need RSVG:

    brew install librsvg

Build Bitcoin ABC
-----------------

Before you start building, please make sure that your compiler supports C++17.

1. Clone the Bitcoin ABC source code and cd into `bitcoin-abc`

        git clone https://github.com/Bitcoin-ABC/bitcoin-abc.git
        cd bitcoin-abc

2.  Build Bitcoin ABC:

    Configure and build the headless Bitcoin ABC binaries as well as the GUI.

    You can disable the GUI build by passing `-DBUILD_BITCOIN_QT=OFF` to cmake.

    It is recommended to create a build directory to build out-of-tree.

        mkdir build
        cd build
        cmake -GNinja ..
        ninja

3.  It is recommended to build and run the unit tests:

        ninja check

4.  You can also create a .dmg that contains the .app bundle (optional):

        ninja osx-dmg

Disable-wallet mode
--------------------
When the intention is to run only a P2P node without a wallet, Bitcoin ABC may be compiled in
disable-wallet mode with:

    cmake -GNinja .. -DBUILD_BITCOIN_WALLET=OFF

Mining is also possible in disable-wallet mode using the `getblocktemplate` RPC call.

Running
-------

Bitcoin ABC is now available at `./src/bitcoind`

Before running, it's recommended that you create an RPC configuration file:

    echo -e "rpcuser=bitcoinrpc\nrpcpassword=$(xxd -l 16 -p /dev/urandom)" > "/Users/${USER}/Library/Application Support/Bitcoin/bitcoin.conf"

    chmod 600 "/Users/${USER}/Library/Application Support/Bitcoin/bitcoin.conf"

The first time you run bitcoind, it will start downloading the blockchain. This process could take many hours, or even days on slower than average systems.

You can monitor the download process by looking at the debug.log file:

    tail -f $HOME/Library/Application\ Support/Bitcoin/debug.log

Other commands:
-------

    ./src/bitcoind -daemon # Starts the bitcoin daemon.
    ./src/bitcoin-cli --help # Outputs a list of command-line options.
    ./src/bitcoin-cli help # Outputs a list of RPC commands when the daemon is running.

Notes
-----

* Building with downloaded Qt binaries is not officially supported. See the notes in [#7714](https://github.com/bitcoin/bitcoin/issues/7714)
