# Contributing to Electrum ABC

## Main repository

The Electrum ABC source repository has been merged into the Bitcoin ABC repository,
and the development is now taking place at [reviews.bitcoinabc.org](https://reviews.bitcoinabc.org/).

Please read the main [CONTRIBUTING.md](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md)
document to familiarize yourself with the development philosophy and find out how to
set up the Bitcoin ABC repository.

The original Electrum ABC github repository is maintained as a mirror of the `electrum/`
directory in the main repository.

The rest of this document provides instructions that are specific to Electrum ABC.

## Contacting developers

[Join the Electrum ABC telegram group](https://t.me/ElectrumABC) to get in contact
with developers or to get help from the community.

## Installing dependencies

All commands in this document assume that your current working directory is the
`electrum/` directory that resides at the root of the Bitcoin ABC repository.

### Python

Python 3.9 or above is required to run Electrum ABC.

If your system lacks Python 3.7+, you can use `pyenv` to install newer versions, or
install an [alternative python distribution](https://www.python.org/download/alternatives/)
in addition to your system's version.

### Python packages

The simplest way to install all needed packages is to run the following command:
```shell
pip install .[all]
```

This will install Electrum ABC and all its dependencies as a python package and application.

This is equivalent to:
```shell
pip install .
pip install .[gui]
pip install .[hardware]
```

If you do not want to install Electrum ABC as a package, you can install only the dependencies
using the following commands:
```shell
pip3 install -r contrib/requirements/requirements.txt
pip3 install -r contrib/requirements/requirements-binaries.txt
pip3 install -r contrib/requirements/requirements-hw.txt
```

## Running Electrum ABC from source

If you installed the application as a python package, you can run it from anywhere
using `electrum-abc` (assuming that your system has the python script directory in
its PATH).

If you installed all dependencies, you can also start the application by invoking
the `./electrum-abc` script. See the following sections for additional instructions
and optional dependencies.

### Running from source on old Linux

If your Linux distribution has a version of python 3 lower than the minimum required
version, it is recommended to do a user dir install with
[pyenv](https://github.com/pyenv/pyenv-installer). This allows Electrum ABC
to run completely independently of your system configuration.

1. Install `pyenv` in your user
   account. Follow the printed instructions about updating your environment
   variables and `.bashrc`, and restart your shell to ensure that they are
   loaded.
2. Run `pyenv install 3.9.7`. This will download and compile that version of
   python, storing it under `.pyenv` in your home directory.
3. `cd` into the Electrum ABC directory. Run `pyenv local 3.9.7` which inserts
   a file `.python-version` into the current directory.
4. [Install Electrum ABC requirements](#python-packages)
5. [Compile libsecp256k1](#compiling-libsecp256k1)

### Running from source on macOS

You need to install **either** [MacPorts](https://www.macports.org)  **or**
[HomeBrew](https://www.brew.sh).  Follow the instructions on either site for
installing (Xcode from [Apple's developer site](https://developer.apple.com)
is required for either).

1. After installing either HomeBrew or MacPorts, clone this repository and
   switch to the directory:
   `git clone https://github.com/Bitcoin-ABC/ElectrumABC && cd ElectrumABC`
2. Install python 3+. For brew:
   `brew install python3`
3. Install PyQt5: `python3 -m pip install --user pyqt5`
4. [Install Electrum ABC requirements](#python-packages)
5. [Compile libsecp256k1](#compiling-libsecp256k1)

## Running tests

Running unit tests:
```shell
python3 test_runner.py
```

This can also be run as a `ninja` target in the context of a Bitcoin ABC build:
```shell
ninja check-electrum
```

Functional tests can be run with the following command:
```shell
pytest electrumabc/tests/regtest
```

This requires `docker` and additional python dependencies:
```shell
pip3 install -r contrib/requirements/requirements-regtest.txt
```

## Compiling libsecp256k1

Compiling libsecp256k1 is highly-recommended when running from source, to use fast
cryptographic algorithms instead of using fallback pure-python algos.

It is required when using CashFusion, as slow participants can cause a fusion round
to fail.

On Debian or Ubuntu linux:
```shell
sudo apt-get install libtool automake
./contrib/make_secp
```

On MacOS:
```shell
brew install coreutils automake
./contrib/make_secp
```

or if using MacPorts: `sudo port install coreutils automake`

## Compiling the icons file for Qt

If you change or add any icons to the `icons` subdirectory, you need to run the following
script before you can use them in the application:
```shell
contrib/gen_icons.sh
```

This requires the `pyrcc5` command which can be installed using your package manager.
For instance for Ubuntu or Debian, run:
```
sudo apt-get install pyqt5-dev-tools
```

## Creating translations
<!-- FIXME: we are still relying on Electron Cash translations-->
```shell
sudo apt-get install python-requests gettext
./contrib/make_locale
```

## Plugin development

For plugin development, see the [plugin documentation](electrumabc_plugins/README.md).

## Creating Binaries

See the *Building the release files* section in [contrib/release.md](contrib/release.md)

## Backporting

Electrum or Electron Cash features, refactoring commits or bug fixes can be
backported into Electrum ABC.

To do this, first add the remote repositories:
```shell
git remote add electrum https://github.com/spesmilo/electrum.git
git remote add electroncash https://github.com/Electron-Cash/Electron-Cash.git
```

Then fetch the remote git history:
```shell
git fetch electrum
git fetch electroncash
```

This step must be repeated every time you want to backport a commit that is more
recent than the last time you fetched the history.

Then you can cherry-pick the relevant commits:
```shell
git cherry-pick -Xsubtree=electrum <commit hash>
```
