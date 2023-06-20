Building Mac OS binaries
========================

✗ _This script does not produce reproducible output (yet!)._

This guide explains how to build binaries for macOS systems.
We build our binaries on Big Sur (11.7.2). The generated binaries may be
incompatible with older versions.

The script is only tested on Intel-based Macs, and the binary built
targets `x86_64` currently.

This assumes that the Xcode Command Line tools (and thus git) are already installed. You can install older (and newer!)
versions of Xcode from Apple provided you have a developer account
[from the Apple developer downloads site](https://developer.apple.com/download/more/).

## Make sure coreutils is installed

Run

```shell
brew update
brew install coreutils gettext pyenv
```

Alternatively, with [macports](https://www.macports.org) installed, run

```shell
sudo port install coreutils
```

## Use the provided script to begin building.

    ./make_osx

Or, if you wish to sign the app when building, provide an Apple developer identity installed on the system for signing:

    ./make_osx "Developer ID Application: MY NAME (123456789)"

To find the identity string, use the following command:

    security find-identity -v -p codesigning

## Done

You should see ElectrumABC.app and ElectrumABC-x.y.z.dmg in ../dist/. If you provided an identity for signing, these
files can even be distributed to other Macs and they will run there without warnings from GateKeeper.
