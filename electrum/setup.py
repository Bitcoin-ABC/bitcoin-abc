# -*- coding: utf-8 -*-

# python setup.py sdist --format=zip,gztar

import argparse
import importlib.util
import os
import platform
import sys

import setuptools.command.sdist
from setuptools import setup

ELECTRUM_ROOT = os.path.dirname(os.path.abspath(__file__))
REQUIREMENTS_DIR = os.path.join(ELECTRUM_ROOT, "contrib", "requirements")

with open(os.path.join(ELECTRUM_ROOT, "README.md"), "r", encoding="utf-8") as f:
    long_description = f.read()

with open(os.path.join(REQUIREMENTS_DIR, "requirements.txt"), encoding="utf-8") as f:
    requirements = f.read().splitlines()

with open(os.path.join(REQUIREMENTS_DIR, "requirements-hw.txt"), encoding="utf-8") as f:
    requirements_hw = f.read().splitlines()

with open(
    os.path.join(REQUIREMENTS_DIR, "requirements-binaries.txt"), encoding="utf-8"
) as f:
    requirements_binaries = f.read().splitlines()


def load_module(module_path):
    """Import a module without importing the whole package"""
    # [:-3] assumes a .py extension
    module_name = os.path.basename(module_path)[:-3]

    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


version = load_module(os.path.join(ELECTRUM_ROOT, "electrumabc", "version.py"))
constants = load_module(os.path.join(ELECTRUM_ROOT, "electrumabc", "constants.py"))

data_files = []

if platform.system() in ["Linux", "FreeBSD", "DragonFly"]:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--user", dest="is_user", action="store_true")
    parser.add_argument("--system", dest="is_user", action="store_false", default=False)
    parser.add_argument("--root=", dest="root_path", metavar="dir", default="/")
    parser.add_argument(
        "--prefix=",
        dest="prefix_path",
        metavar="prefix",
        nargs="?",
        const="/",
        default=sys.prefix,
    )
    opts, _ = parser.parse_known_args(sys.argv[1:])

    # Use per-user */share directory if the global one is not writable or if a per-user installation
    # is attempted
    user_share = os.environ.get("XDG_DATA_HOME", os.path.expanduser("~/.local/share"))
    system_share = os.path.join(opts.prefix_path, "share")
    if not opts.is_user:
        # Not neccarily a per-user installation try system directories
        if os.access(opts.root_path + system_share, os.W_OK):
            # Global /usr/share is writable for us so just use that
            share_dir = system_share
        elif not os.path.exists(opts.root_path + system_share) and os.access(
            opts.root_path, os.W_OK
        ):
            # Global /usr/share does not exist, but / is writable keep using the global directory
            # (happens during packaging)
            share_dir = system_share
        else:
            # Neither /usr/share (nor / if /usr/share doesn't exist) is writable, use the
            # per-user */share directory
            share_dir = user_share
    else:
        # Per-user installation
        share_dir = user_share
    data_files += [
        # Menu icon
        (
            os.path.join(share_dir, "icons/hicolor/256x256/apps/"),
            ["icons/electrumABC.png"],
        ),
        (os.path.join(share_dir, "pixmaps/"), ["icons/electrumABC.png"]),
        (
            os.path.join(share_dir, "icons/hicolor/scaleable/apps/"),
            ["icons/electrumABC.svg"],
        ),
        # Menu entry
        (os.path.join(share_dir, "applications/"), ["electrum-abc.desktop"]),
        # App stream (store) metadata
        (
            os.path.join(share_dir, "metainfo/"),
            ["org.bitcoinabc.Electrum-ABC.appdata.xml"],
        ),
    ]


class MakeAllBeforeSdist(setuptools.command.sdist.sdist):
    """Does some custom stuff before calling super().run()."""

    user_options = setuptools.command.sdist.sdist.user_options + [
        ("disable-secp", None, "Disable libsecp256k1 complilation (default)."),
        ("enable-secp", None, "Enable libsecp256k1 complilation."),
        ("disable-zbar", None, "Disable libzbar complilation (default)."),
        ("enable-zbar", None, "Enable libzbar complilation."),
    ]

    def initialize_options(self):
        self.disable_secp = None
        self.enable_secp = None
        self.disable_zbar = None
        self.enable_zbar = None
        super().initialize_options()

    def finalize_options(self):
        if self.enable_secp is None:
            self.enable_secp = False
        self.enable_secp = not self.disable_secp and self.enable_secp
        if self.enable_zbar is None:
            self.enable_zbar = False
        self.enable_zbar = not self.disable_zbar and self.enable_zbar
        super().finalize_options()

    def run(self):
        """Run command."""
        # self.announce("Running make_locale...")
        # 0==os.system("contrib/make_locale") or sys.exit("Could not make locale, aborting")
        # self.announce("Running make_packages...")
        # 0==os.system("contrib/make_packages") or sys.exit("Could not make locale, aborting")
        if self.enable_secp:
            self.announce("Running make_secp...")
            0 == os.system("contrib/make_secp") or sys.exit(
                "Could not build libsecp256k1"
            )
        if self.enable_zbar:
            self.announce("Running make_zbar...")
            0 == os.system("contrib/make_zbar") or sys.exit("Could not build libzbar")
        super().run()


platform_package_data = {}

if sys.platform in ("linux",):
    platform_package_data = {
        "electrumabc_gui.qt": ["data/ecsupplemental_lnx.ttf", "data/fonts.xml"],
    }

if sys.platform in ("win32", "cygwin"):
    platform_package_data = {
        "electrumabc_gui.qt": ["data/ecsupplemental_win.ttf"],
    }

setup(
    cmdclass={
        "sdist": MakeAllBeforeSdist,
    },
    name=constants.PROJECT_NAME_NO_SPACES,
    version=version.PACKAGE_VERSION,
    install_requires=requirements,
    extras_require={
        "hardware": requirements_hw,
        "gui": requirements_binaries,
        "all": requirements_hw + requirements_binaries,
    },
    python_requires=">=3.9",
    packages=[
        "electrumabc",
        "electrumabc.avalanche",
        "electrumabc.qrreaders",
        "electrumabc.tokens",
        "electrumabc.tor",
        "electrumabc.utils",
        "electrumabc_gui",
        "electrumabc_gui.qt",
        "electrumabc_gui.qt.avalanche",
        "electrumabc_gui.qt.qrreader",
        "electrumabc_gui.qt.utils",
        "electrumabc_gui.qt.utils.darkdetect",
        "electrumabc_plugins",
        "electrumabc_plugins.audio_modem",
        "electrumabc_plugins.cosigner_pool",
        "electrumabc_plugins.email_requests",
        "electrumabc_plugins.hw_wallet",
        "electrumabc_plugins.keepkey",
        "electrumabc_plugins.ledger",
        "electrumabc_plugins.trezor",
        "electrumabc_plugins.digitalbitbox",
        "electrumabc_plugins.virtualkeyboard",
        "electrumabc_plugins.satochip",
        "electrumabc_plugins.fusion",
    ],
    package_data={
        "electrumabc": [
            "checkpoint.json",
            "checkpoint_testnet.json",
            "servers.json",
            "servers_testnet.json",
            "servers_regtest.json",
            "currencies.json",
            "www/index.html",
            "wordlist/*.txt",
            "libsecp256k1*",
            "libzbar*",
            "locale/*/LC_MESSAGES/electron-cash.mo",
        ],
        "electrumabc_plugins.fusion": ["*.svg", "*.png"],
        "electrumabc_plugins.trezor": ["homescreen/*.jpg", "firmware/*.bin"],
        # On Linux and Windows this means adding electrumabc_gui/qt/data/*.ttf
        # On Darwin we don't use that font, so we don't add it to save space.
        **platform_package_data,
    },
    classifiers=[
        # Chose either "3 - Alpha", "4 - Beta" or "5 - Production/Stable"
        "Development Status :: 3 - Alpha",
        "Environment :: Console",
        "Environment :: MacOS X",
        "Environment :: Win32 (MS Windows)",
        "Environment :: X11 Applications :: Qt",
        "Intended Audience :: End Users/Desktop",
        "Natural Language :: English",
        "Operating System :: MacOS",
        "Operating System :: Microsoft :: Windows",
        "Operating System :: POSIX",
        "Topic :: Software Development :: Build Tools",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Topic :: Security :: Cryptography",
        "Topic :: Office/Business :: Financial",
    ],
    scripts=[constants.SCRIPT_NAME],
    data_files=data_files,
    description="Lightweight eCash Wallet",
    author=f"The {constants.PROJECT_NAME} Developers",
    # author_email=
    license="MIT Licence",
    url=constants.REPOSITORY_URL,
    long_description=long_description,
)
