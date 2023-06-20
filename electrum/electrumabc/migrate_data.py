"""This module handles copying the Electron Cash data dir
to the Electrum ABC data path if it does not already exists.

The first time a user runs this program, if he already uses Electron Cash,
he should be able to see all his BCH wallets and have some of the
settings imported.

This module also handles updating the config file when default config parameters are
changed.
"""
import glob
import logging
import os
import shutil

from .simple_config import SimpleConfig, read_user_config, save_user_config
from .util import get_user_dir
from .version import PACKAGE_VERSION, VERSION_TUPLE

_logger = logging.getLogger(__name__)


# The default fee set to 80000 in 4.3.0 was lowered to 10000 in 4.3.2,
# and then again to 5000 in 4.3.3, and then again to 2000 in 5.0.2
OLD_DEFAULT_FEES = [80000, 10000, 5000]


def safe_rm(path: str):
    """Delete a file or a directory.
    In case an exception occurs, log the error message.
    """
    try:
        if os.path.isfile(path):
            os.remove(path)
        elif os.path.isdir(path):
            shutil.rmtree(path)
    except (OSError, shutil.Error) as e:
        _logger.warning(f"Unable to delete path {path}.\n{str(e)}")


def _version_tuple_to_str(version_tuple):
    return ".".join(map(str, version_tuple))


def update_config():
    """Update configuration parameters for old default parameters
    that changed in newer releases. This function should only be
    called if a data directory already exists."""
    config = read_user_config(get_user_dir())
    if not config:
        return

    # update config only when first running a new version
    config_version = config.get("latest_version_used", (4, 3, 1))
    if tuple(config_version) >= VERSION_TUPLE:
        return

    version_transition_msg = _version_tuple_to_str(config_version)
    version_transition_msg += " 🠚 " + PACKAGE_VERSION
    _logger.info("Updating configuration file " + version_transition_msg)

    if config.get("fee_per_kb") in OLD_DEFAULT_FEES:
        _logger.info("Updating default transaction fee")
        config["fee_per_kb"] = SimpleConfig.default_fee_rate()

    # Migrate all users to the XEC unit
    if "decimal_point" in config and tuple(config_version) <= (4, 9, 9):
        config["decimal_point"] = 2

    # Remove exchange cache data after upgrading to 5.0.1 because the old
    # "CoinGecko" exchange was renamed and the name reused for the new
    # XEC API.
    if tuple(config_version) <= (5, 0, 0):
        for fname in glob.glob(os.path.join(get_user_dir(), "cache", "CoinGecko_*")):
            _logger.info(f"Deleting exchange cache data {fname}")
            safe_rm(fname)

    # Change default block explorer to e.cash
    if tuple(config_version) <= (5, 1, 4) and "block_explorer" in config:
        _logger.info("Updating the block explorer to the new default explorer.e.cash")
        config["block_explorer"] = "eCash"

    # We no longer support the BCH Cash Address format in the GUI as of 5.1.7
    if config.get("address_format") == "CashAddr BCH":
        _logger.info("Updating the Cash Addr format from bitcoincash: to ecash:")
        config["address_format"] = "CashAddr"

    # The bitcoin-cash-abc-2 CoingGecko API no longer exists
    if config.get("use_exchange") == "CoinGeckoBcha":
        _logger.info("Updating the fiat exchange from CoinGeckoBcha to CoinGecko")
        config["use_exchange"] = "CoinGecko"

    # update version number, to avoid doing this again for this version
    config["latest_version_used"] = VERSION_TUPLE
    save_user_config(config, get_user_dir())
