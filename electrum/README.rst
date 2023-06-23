Electrum ABC - Lightweight eCash client
=======================================

::

  Licence: MIT Licence
  Author: Electrum ABC Developers
  Language: Python
  Homepage: https://www.bitcoinabc.org/electrum


Getting started
===============

**Note: If running from source, Python 3.7 or above is required to run Electrum ABC.**
If your system lacks Python 3.7, you have other options, such as the
`AppImage / binary releases <https://github.com/Bitcoin-ABC/ElectrumABC/releases/>`_
or running from source using `pyenv` (see section `Running from source on old Linux`_ below).

**macOS:** It is recommended that macOS users run
`the binary .dmg <https://github.com/Bitcoin-ABC/ElectrumABC/releases>`_
as that's simpler to use and has everything included.  Otherwise, if you
want to run from source, see section `Running from source on macOS`_ below.

If you want to use the Qt interface, install the Qt dependencies::

    sudo apt-get install python3-pyqt5 python3-pyqt5.qtsvg

If you downloaded the official package (tar.gz), you can run
Electrum ABC from its root directory, without installing it on your
system; all the python dependencies are included in the 'packages'
directory. To run Electrum ABC from its root directory, just do::

    ./electrum-abc

You can also install Electrum ABC on your system, by running this command::

    pip3 install . --user

Compile the icons file for Qt (normally you can skip this step, run this command if icons are missing)::

    sudo apt-get install pyqt5-dev-tools
    pyrrc5 icons.qrc -o electrumabc_gui/qt/icons.py

This will download and install the Python dependencies used by
Electrum ABC, instead of using the 'packages' directory.

If you cloned the git repository, you need to compile extra files
before you can run Electrum ABC. Read the next section, "Development
Version".

Hardware Wallet
---------------

Electrum ABC natively supports Ledger, Trezor and Satochip hardware wallets.
You need additional dependencies. To install them, run this command::

    pip3 install -r contrib/requirements/requirements-hw.txt

If you still have problems connecting to your Nano S please have a look at this
`troubleshooting <https://support.ledger.com/hc/en-us/articles/115005165269-Fix-connection-issues>`_ section on Ledger website.


Development version
===================

Check your python version >= 3.7, and install pyqt5, as instructed above in the
`Getting started`_ section above or `Running from source on old Linux`_ section below.

If you are on macOS, see the `Running from source on macOS`_ section below.

Check out the code from Github::

    git clone https://github.com/Bitcoin-ABC/ElectrumABC
    cd ElectrumABC

Install the python dependencies::

    pip3 install -r contrib/requirements/requirements.txt --user

Create translations (optional)::

    sudo apt-get install python-requests gettext
    ./contrib/make_locale

Compile libsecp256k1 (optional, yet highly recommended)::

    sudo apt-get install libtool automake
    ./contrib/make_secp

For plugin development, see the `plugin documentation <plugins/README.rst>`_.

Running unit tests (optional)::

    python3 -m electrumabc.tests


Running from source on old Linux
================================

If your Linux distribution has a different version of python 3 (such as python
3.5 in Debian 9), it is recommended to do a user dir install with
`pyenv <https://github.com/pyenv/pyenv-installer>`_. This allows Electrum ABC
to run completely independently of your system configuration.

1. Install `pyenv <https://github.com/pyenv/pyenv-installer>`_ in your user
   account. Follow the printed instructions about updating your environment
   variables and ``.bashrc``, and restart your shell to ensure that they are
   loaded.
2. Run ``pyenv install 3.9.7``. This will download and compile that version of
   python, storing it under ``.pyenv`` in your home directory.
3. ``cd`` into the Electrum ABC directory. Run ``pyenv local 3.9.7`` which inserts
   a file ``.python-version`` into the current directory.
4. While still in this directory, run ``pip install pyqt5``.
5. If you are installing from the source file (.tar.gz or .zip) then you are
   ready and you may run ``./electrum-abc``. If you are using the git version,
   then continue by following the Development version instructions above.

Running from source on macOS
============================

You need to install **either** `MacPorts <https://www.macports.org>`_  **or**
`HomeBrew <https://www.brew.sh>`_.  Follow the instructions on either site for
installing (Xcode from `Apple's developer site <https://developer.apple.com>`_
is required for either).

1. After installing either HomeBrew or MacPorts, clone this repository and
   switch to the directory:
   ``git clone https://github.com/Bitcoin-ABC/ElectrumABC && cd ElectrumABC``
2. Install python 3.7+. For brew: ``brew install python3``
   or if using MacPorts: ``sudo port install python37``
3. Install PyQt5: ``python3 -m pip install --user pyqt5``
4. Install Electrum ABC requirements:
   ``python3 -m pip install --user -r contrib/requirements/requirements.txt``
5. Compile libsecp256k1 (optional, yet highly recommended):
   ``./contrib/make_secp``.
   This requires GNU tools and automake, install with brew:
   ``brew install coreutils automake``
   or if using MacPorts: ``sudo port install coreutils automake``
6. At this point you should be able to just run the sources: ``./electrum-abc``


Creating Binaries
=================

Linux AppImage & Source Tarball
-------------------------------

See `contrib/build-linux/README.md <contrib/build-linux/README.md>`_.

Mac OS X / macOS
----------------

See `contrib/osx/ <contrib/osx/>`_.

Windows
-------

See `contrib/build-wine/ <contrib/build-wine>`_.

Verifying Release Binaries
==========================

See `contrib/pubkeys/README.md <contrib/pubkeys/README.md>`_

Contact developers
==================

`Join the Electrum ABC telegram group <https://t.me/ElectrumABC>`_ to get in contact
with developers or to get help from the community.
