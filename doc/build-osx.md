Mac OS X Build Instructions and Notes
====================================
The commands in this guide should be executed in a Terminal application.
The built-in one is located in `/Applications/Utilities/Terminal.app`.

Preparation
-----------

1.  Install Xcode from the app store if you don't have it already (it's a dependency for qt5)

    NOTE: Building with Qt4 is still supported, however, could result in a broken UI. Building with Qt5 is recommended.

2.  Install the OS X command line tools:

`xcode-select --install`

When the popup appears, click `Install`.

3.  Install [Homebrew](http://brew.sh).

Dependencies
----------------------

Install dependencies:

    brew install automake berkeley-db libtool boost miniupnpc openssl pkg-config qt5 libevent

In case you want to build the disk image with `make deploy` (.dmg / optional), you need RSVG

    brew install librsvg

Build Devault
-----------------

1. Clone the Devault source code and cd into `DeVault`

        git clone https://github.com/DeVault/DeVault.git
        cd DeVault

2.  Build DeVault:

    Configure and build the headless devault binaries as well as the GUI (if Qt is found).

    You can disable the GUI build by passing `--without-gui` to configure.

    It is recommended to create a build directory to build out-of-tree. 

        ./autogen.sh
        mkdir build
        cd build
        ../configure
        make

3.  It is recommended to build and run the unit tests:

        make check

4.  You can also create a .dmg that contains the .app bundle (optional):

        make deploy

Running
-------

Devault is now available at `./src/devaultd`

Before running, it's recommended you create an RPC configuration file.

    echo -e "rpcuser=devaultrpc\nrpcpassword=$(xxd -l 16 -p /dev/urandom)" > "/Users/${USER}/Library/Application Support/Devault/devault.conf"

    chmod 600 "/Users/${USER}/Library/Application Support/Devault/devault.conf"

The first time you run devaultd, it will start downloading the blockchain. This process could take several hours.

You can monitor the download process by looking at the debug.log file:

    tail -f $HOME/Library/Application\ Support/Devault/debug.log

Other commands:
-------

    ./src/devaultd -daemon # Starts the devault daemon.
    ./src/devault-cli --help # Outputs a list of command-line options.
    ./src/devault-cli help # Outputs a list of RPC commands when the daemon is running.

Using Qt Creator as IDE
------------------------
You can use Qt Creator as an IDE, for devault development.
Download and install the community edition of [Qt Creator](https://www.qt.io/download/).
Uncheck everything except Qt Creator during the installation process.

1. Make sure you installed everything through Homebrew mentioned above
2. Do a proper ./configure --enable-debug
3. In Qt Creator do "New Project" -> Import Project -> Import Existing Project
4. Enter "devault-qt" as project name, enter src/qt as location
5. Leave the file selection as it is
6. Confirm the "summary page"
7. In the "Projects" tab select "Manage Kits..."
8. Select the default "Desktop" kit and select "Clang (x86 64bit in /usr/bin)" as compiler
9. Select LLDB as debugger (you might need to set the path to your installation)
10. Start debugging with Qt Creator

Notes
-----

* Tested on OS X 10.8 through 10.12 on 64-bit Intel processors only.

* Building with downloaded Qt binaries is not officially supported. See the notes in [#7714](https://github.com/devault/devault/issues/7714)
