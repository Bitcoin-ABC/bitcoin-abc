import json
import os
import stat
import threading
from copy import deepcopy
from decimal import Decimal as PyDecimal

from . import util
from .constants import XEC
from .printerror import PrintError, print_error
from .util import get_user_dir, make_dir

FINAL_CONFIG_VERSION = 2


class SimpleConfig(PrintError):
    """
    The SimpleConfig class is responsible for handling operations involving
    configuration files.

    There are two different sources of possible configuration values:
        1. Command line options.
        2. User configuration (in the user's config directory)
    They are taken in order (1. overrides config options set in 2.)
    """

    max_slider_fee: int = 10000
    """Maximum fee rate in sat/kB that can be selected using the slider widget
    in the send tab. Make sure this is a multiple of slider_steps, so that
    all slider positions are integers."""
    slider_steps: int = 10
    """Number of possible equidistant fee rate settings (starting with
    max_slider_fee / slider_steps)"""

    def __init__(
        self,
        options=None,
        read_user_config_function=None,
        read_user_dir_function=None,
    ):
        if options is None:
            options = {}

        # This lock needs to be acquired for updating and reading the config in
        # a thread-safe way.
        self.lock = threading.RLock()

        # The following two functions are there for dependency injection when
        # testing.
        if read_user_config_function is None:
            read_user_config_function = read_user_config
        if read_user_dir_function is None:
            self.user_dir = get_user_dir
        else:
            self.user_dir = read_user_dir_function

        # The command line options
        self.cmdline_options = deepcopy(options)
        # don't allow to be set on CLI:
        self.cmdline_options.pop("config_version", None)

        # Set self.path and read the user config
        self.user_config = {}  # for self.get in electrum_path()
        self.path = self.electrum_path()
        self.user_config = read_user_config_function(self.path)
        if not self.user_config:
            # avoid new config getting upgraded
            self.user_config = {"config_version": FINAL_CONFIG_VERSION}

        # config "upgrade" - CLI options
        self.rename_config_keys(
            self.cmdline_options, {"auto_cycle": "auto_connect"}, True
        )

        # config upgrade - user config
        if self.requires_upgrade():
            self.upgrade()

    def electrum_path(self):
        # Read electrum_cash_path from command line
        # Otherwise use the user's default data directory.
        path = self.get("data_path")
        if path is None:
            path = self.user_dir()

        make_dir(path)
        if self.get("testnet"):
            path = os.path.join(path, "testnet")
            make_dir(path)
        elif self.get("regtest"):
            path = os.path.join(path, "regtest")
            make_dir(path)

        obsolete_file = os.path.join(path, "recent_servers")
        if os.path.exists(obsolete_file):
            os.remove(obsolete_file)
        return path

    def rename_config_keys(self, config, keypairs, deprecation_warning=False):
        """Migrate old key names to new ones"""
        updated = False
        for old_key, new_key in keypairs.items():
            if old_key in config:
                if new_key not in config:
                    config[new_key] = config[old_key]
                    if deprecation_warning:
                        self.print_stderr(
                            "Note that the {} variable has been deprecated. "
                            "You should use {} instead.".format(old_key, new_key)
                        )
                del config[old_key]
                updated = True
        return updated

    def set_key(self, key, value, save=True):
        if not self.is_modifiable(key):
            self.print_error(
                "Warning: not changing config key '%s' set on the command line" % key
            )
            return
        self._set_key_in_user_config(key, value, save)

    def _set_key_in_user_config(self, key, value, save=True):
        with self.lock:
            if value is not None:
                self.user_config[key] = value
            else:
                self.user_config.pop(key, None)
            if save:
                self.save_user_config()

    def get(self, key, default=None):
        with self.lock:
            out = self.cmdline_options.get(key)
            if out is None:
                out = self.user_config.get(key, default)
        return out

    def requires_upgrade(self):
        return self.get_config_version() < FINAL_CONFIG_VERSION

    def upgrade(self):
        with self.lock:
            self.convert_version_2()

            self.set_key("config_version", FINAL_CONFIG_VERSION, save=True)

    def convert_version_2(self):
        if not self._is_upgrade_method_needed(1, 1):
            return

        self.rename_config_keys(self.user_config, {"auto_cycle": "auto_connect"})

        try:
            # change server string FROM host:port:proto TO host:port:s
            server_str = self.user_config.get("server")
            host, port, protocol = str(server_str).rsplit(":", 2)
            assert protocol in ("s", "t")
            int(port)  # Throw if cannot be converted to int
            server_str = str("{}:{}:s".format(host, port))
            self._set_key_in_user_config("server", server_str)
        except Exception:
            self._set_key_in_user_config("server", None)

        self.set_key("config_version", 2)

    def _is_upgrade_method_needed(self, min_version, max_version):
        cur_version = self.get_config_version()
        if cur_version > max_version:
            return False
        elif cur_version < min_version:
            raise RuntimeError(
                "config upgrade: unexpected version %d (should be %d-%d)"
                % (cur_version, min_version, max_version)
            )
        else:
            return True

    def get_config_version(self):
        config_version = self.get("config_version", 1)
        if config_version > FINAL_CONFIG_VERSION:
            self.print_stderr(
                "WARNING: config version ({}) is higher than ours ({})".format(
                    config_version, FINAL_CONFIG_VERSION
                )
            )
        return config_version

    def is_modifiable(self, key):
        return key not in self.cmdline_options

    def save_user_config(self):
        if self.get("forget_config"):
            return
        if not self.path:
            return
        save_user_config(self.user_config, self.path)

    def get_new_wallet_directory(self):
        """Return the path to the directory where new wallets are saved.

        If the program was started with the wallet path (-w or --wallet
        argument), the directory of that wallet is used.
        Else, the default wallet directory inside the user data directory
        is used.
        """
        # command line -w option
        path = self.get("wallet_path")
        return os.path.dirname(path) if path else os.path.join(self.path, "wallets")

    def get_wallet_path(self):
        """Return the path of the current wallet.

        On program startup, this is either the wallet path specified on the
        command line (-w or --wallet argument), or the wallet used the last
        time the program was used, or by default a new wallet named
        "default_wallet" in the user directory.
        """
        # command line -w option
        if self.get("wallet_path"):
            return self.get("wallet_path")

        # path in config file
        path = self.get("default_wallet_path")
        if path and os.path.exists(path):
            return path

        # default path
        util.assert_datadir_available(self.path)
        dirpath = os.path.join(self.path, "wallets")
        make_dir(dirpath)
        new_path = os.path.join(self.path, "wallets", "default_wallet")
        return new_path

    def remove_from_recently_open(self, filename):
        recent = self.get("recently_open", [])
        if filename in recent:
            recent.remove(filename)
            self.set_key("recently_open", recent)

    def set_session_timeout(self, seconds):
        self.set_key("session_timeout", seconds)

    def get_session_timeout(self):
        return self.get("session_timeout", 300)

    def open_last_wallet(self):
        if self.get("wallet_path") is None:
            last_wallet = self.get("gui_last_wallet")
            if last_wallet is not None and os.path.exists(last_wallet):
                self.cmdline_options["default_wallet_path"] = last_wallet

    def save_last_wallet(self, wallet):
        if self.get("wallet_path") is None:
            path = wallet.storage.path
            self.set_key("gui_last_wallet", path)

    def static_fee(self, i: int) -> int:
        """Return fee rate for slider position i, in sat/kB.

        :param i: Fee slider index, in range 0 -- self.slider_steps - 1
        :return:
        """
        return self.max_slider_fee // self.slider_steps * (i + 1)

    def custom_fee_rate(self):
        f = self.get("customfee")
        return f

    @classmethod
    def default_fee_rate(cls) -> int:
        """
        Return default fee rate in sat/kB for new wallets.
        """
        # use the 2nd lowest rate that can be set with the slider
        return cls.max_slider_fee // cls.slider_steps * 2

    def fee_per_kb(self) -> int:
        """Return transaction fee in sats per kB"""
        retval = self.get("customfee")
        if retval is None:
            retval = self.get("fee_per_kb")
        if retval is None:
            return self.default_fee_rate()
        return retval

    def has_custom_fee_rate(self):
        i = -1
        # Defensive programming below.. to ensure the custom fee rate is valid ;)
        # This function mainly controls the appearance (or disappearance) of the fee slider in the send tab in Qt GUI
        # It is tied to the GUI preferences option 'Custom fee rate'.
        try:
            i = int(self.custom_fee_rate())
        except (ValueError, TypeError):
            pass
        return i >= 0

    def estimate_fee(self, size) -> int:
        """Return fee in satoshis for a given transaction size
        in bytes."""
        return self.estimate_fee_for_feerate(self.fee_per_kb(), size)

    @staticmethod
    def estimate_fee_for_feerate(fee_per_kb, size):
        return int(PyDecimal(fee_per_kb) * PyDecimal(size) / 1000)

    def get_video_device(self):
        device = self.get("video_device", "default")
        if device == "default":
            device = ""
        return device

    def is_current_block_locktime_enabled(self) -> bool:
        return self.get("enable_current_block_locktime", False)

    def set_current_block_locktime_enabled(self, flag: bool):
        self.set_key("enable_current_block_locktime", flag, save=True)

    def get_decimal_point(self) -> int:
        return self.get("decimal_point", XEC.decimals)

    def get_num_zeros(self) -> int:
        # by default, we want to display the full precision down to sats
        return self.get("num_zeros", XEC.decimals)


def read_user_config(path: str) -> dict:
    """Parse the user config settings and return it as a dictionary.

    :param path: Path to user data directory containing the JSON file.
    :return: Configuration dictionary.
    """
    if not path:
        return {}
    config_path = os.path.join(path, "config")
    if not os.path.exists(config_path):
        return {}
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = f.read()
        result = json.loads(data)
    except Exception:
        print_error("Warning: Cannot read config file.", config_path)
        return {}
    if not isinstance(result, dict):
        return {}
    return result


def save_user_config(config: dict, path: str):
    """Save a user config dict to a JSON file

    :param config: Configuration dictionary.
    """
    config_path = os.path.join(path, "config")
    s = json.dumps(config, indent=4, sort_keys=True)
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(s)
    os.chmod(config_path, stat.S_IREAD | stat.S_IWRITE)
