#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2015 Thomas Voegtlin
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
from __future__ import annotations

import ast
import os
import sys
import time
from base64 import b64encode
from typing import TYPE_CHECKING, Dict, Optional, Tuple

import jsonrpclib

from .commands import Commands, known_commands
from .constants import PROJECT_NAME, SCRIPT_NAME
from .exchange_rate import FxThread
from .json_util import json_decode
from .jsonrpc import VerifyingJSONRPCServer
from .network import Network
from .printerror import print_error, print_stderr
from .simple_config import SimpleConfig
from .storage import WalletStorage
from .util import DaemonThread, randrange, standardize_path, to_string
from .wallet import Wallet

if TYPE_CHECKING:
    from .plugins import Plugins
    from .wallet import AbstractWallet


def get_lockfile(config):
    return os.path.join(config.path, "daemon")


def remove_lockfile(lockfile):
    try:
        os.unlink(lockfile)
        print_error("Removed lockfile:", lockfile)
    except OSError as e:
        print_error("Could not remove lockfile:", lockfile, repr(e))


def get_fd_or_server(
    config: SimpleConfig,
) -> Tuple[Optional[int], Optional[jsonrpclib.Server]]:
    """Tries to create the lockfile, using O_EXCL to
    prevent races.  If it succeeds it returns a tuple (fd, None).
    Otherwise try and connect to the server specified in the lockfile.
    If this succeeds, a tuple (None, server) is returned.
    Otherwise remove the lockfile and try again.
    """
    lockfile = get_lockfile(config)

    limit = 5
    latest_exc = None
    for n in range(limit):
        try:
            return os.open(lockfile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644), None
        except PermissionError as e:
            sys.exit(
                f"Unable to create lockfile due to file system permission problems: {e}"
            )
        except NotADirectoryError as e:
            lockdir = os.path.dirname(lockfile)
            sys.exit(
                f"{PROJECT_NAME} directory location at {lockdir} is not"
                f" a directory. Error was: {e}"
            )
        except OSError as e:
            # Unable to create because there was a pre-existing lockfile
            latest_exc = e
        server = get_server(config)
        if server is not None:
            return None, server
        # Couldn't connect; remove lockfile and try again.
        remove_lockfile(lockfile)
    sys.exit(
        f"Unable to open/create lockfile at {lockfile} after "
        f"{limit} attempts. Please check your filesystem setup. "
        f"Last error was: {repr(latest_exc)}"
    )


def get_server(config: SimpleConfig, timeout=2.0) -> Optional[jsonrpclib.Server]:
    assert timeout > 0.0
    lockfile = get_lockfile(config)
    while True:
        create_time = None
        try:
            with open(lockfile, encoding="utf-8") as f:
                (host, port), tmp_create_time = ast.literal_eval(f.read())
                create_time = float(tmp_create_time)
                del tmp_create_time  # ensures create_time is float; raises if create_time is not-float-compatible
                rpc_user, rpc_password = get_rpc_credentials(config)
                if rpc_password == "":
                    # authentication disabled
                    server_url = "http://%s:%d" % (host, port)
                else:
                    server_url = "http://%s:%s@%s:%d" % (
                        rpc_user,
                        rpc_password,
                        host,
                        port,
                    )
                server = jsonrpclib.Server(server_url)
            # Test daemon is running
            server.ping()
            return server
        except Exception as e:
            print_error("[get_server]", e)
        # Note that the create_time may be in the future if there was a clock
        # adjustment by system ntp, etc. We guard against this, with some
        # tolerance.  The net effect here is in normal cases we wait for the
        # daemon, giving up after timeout seconds (or at worst timeout*2 seconds
        # in the pathological case of a clock adjustment happening
        # at the precise time the daemon was starting up).
        if not create_time or abs(time.time() - create_time) > timeout:
            return None
        # Sleep a bit and try again; it might have just been started
        time.sleep(1.0)


def get_rpc_credentials(config):
    rpc_user = config.get("rpcuser", None)
    rpc_password = config.get("rpcpassword", None)
    if rpc_user is None or rpc_password is None:
        rpc_user = "electrumabcuser"
        bits = 128
        nbytes = bits // 8 + (bits % 8 > 0)
        pw_int = randrange(pow(2, bits))
        pw_b64 = b64encode(pw_int.to_bytes(nbytes, "big"), b"-_")
        rpc_password = to_string(pw_b64, "ascii")
        config.set_key("rpcuser", rpc_user)
        config.set_key("rpcpassword", rpc_password, save=True)
    elif rpc_password == "":
        print_stderr("WARNING: RPC authentication is disabled.")
    return rpc_user, rpc_password


class Daemon(DaemonThread):
    def __init__(
        self,
        config: SimpleConfig,
        fd: int,
        plugins: Plugins,
        *,
        listen_jsonrpc: bool = True,
    ):
        DaemonThread.__init__(self)
        self.plugins = plugins
        self.config = config
        self.listen_jsonrpc = listen_jsonrpc
        self.network: Optional[Network] = None
        if not config.get("offline"):
            self.network = Network(config)
            self.network.start()
        self.fx = FxThread(config, self.network)
        if self.network:
            self.network.add_jobs([self.fx])
        self.gui = None
        self.server = None
        self.wallets: Dict[str, AbstractWallet] = {}
        if listen_jsonrpc:
            # Setup JSONRPC server
            self.init_server(config, fd)

    def init_server(self, config: SimpleConfig, fd: int):
        host = config.get("rpchost", "127.0.0.1")
        port = config.get("rpcport", 0)

        rpc_user, rpc_password = get_rpc_credentials(config)
        try:
            server = VerifyingJSONRPCServer(
                (host, port),
                logRequests=False,
                rpc_user=rpc_user,
                rpc_password=rpc_password,
            )
        except Exception as e:
            self.print_error("Warning: cannot initialize RPC server on host", host, e)
            os.close(fd)
            return
        os.write(fd, bytes(repr((server.socket.getsockname(), time.time())), "utf8"))
        os.close(fd)
        self.server = server
        server.timeout = 0.1
        server.register_function(self.ping, "ping")
        server.register_function(self.run_gui, "gui")
        server.register_function(self.run_daemon, "daemon")
        self.cmd_runner = Commands(self.config, None, self.network, self)
        for cmdname in known_commands:
            server.register_function(getattr(self.cmd_runner, cmdname), cmdname)
        server.register_function(self.run_cmdline, "run_cmdline")

    def ping(self):
        return True

    def run_daemon(self, config_options):
        config = SimpleConfig(config_options)
        sub = config.get("subcommand")
        subargs = config.get("subargs")
        plugin_cmd = self.plugins and self.plugins.daemon_commands.get(sub)
        if subargs and sub in [None, "start", "stop"]:
            return "Unexpected arguments: {!r}. {!r} takes no options.".format(
                subargs, sub
            )
        if sub in [None, "start"]:
            response = "Daemon already running"
        elif sub == "stop":
            self.stop()
            response = "Daemon stopped"
        elif plugin_cmd is not None:
            # note that daemon's own commands take precedence, i.e., a plugin CANNOT override 'load_wallet'.
            response = plugin_cmd(self, config)
        else:
            return "Unrecognized subcommand {!r}".format(sub)
        return response

    def run_gui(self, config_options):
        config = SimpleConfig(config_options)
        if self.gui:
            if hasattr(self.gui, "new_window"):
                # This tells the gui to open the current wallet if any,
                # or the last wallet if no wallets are currently open.
                self.gui.new_window(None, config.get("url"))
                response = "ok"
            else:
                response = "error: current GUI does not support multiple windows"
        else:
            response = (
                f"Error: {PROJECT_NAME} is running in daemon mode. Please stop the"
                " daemon first."
            )
        return response

    def load_wallet(self, path, password: str):
        path = standardize_path(path)
        # wizard will be launched if we return
        if path in self.wallets:
            wallet = self.wallets[path]
            return wallet
        storage = WalletStorage(path, manual_upgrades=True)
        if not storage.file_exists():
            return
        if storage.is_encrypted():
            if not password:
                return
            storage.decrypt(password)
        if storage.requires_split():
            return
        if storage.requires_upgrade():
            return
        if storage.get_action():
            return
        wallet = Wallet(storage)
        wallet.start_threads(self.network)
        self.wallets[path] = wallet
        return wallet

    def add_wallet(self, wallet):
        path = wallet.storage.path
        self.wallets[path] = wallet

    def get_wallet(self, path):
        return self.wallets.get(path)

    def delete_wallet(self, path):
        self.stop_wallet(path)
        if os.path.exists(path):
            os.unlink(path)
            return True
        return False

    def stop_wallet(self, path):
        # Issue #659 wallet may already be stopped.
        if path in self.wallets:
            wallet = self.wallets.pop(path)
            wallet.stop_threads()

    def run_cmdline(self, config_options):
        config = SimpleConfig(config_options)
        cmdname = config.get("cmd")
        cmd = known_commands[cmdname]
        if cmd.requires_wallet:
            path = config.get_wallet_path()
            wallet = self.wallets.get(path)
            if wallet is None:
                wallet_name = os.path.basename(path)
                return {
                    "error": (
                        f'Wallet "{wallet_name}" is not loaded. Use'
                        f' "{SCRIPT_NAME} daemon load_wallet"'
                    )
                }
        else:
            wallet = None
        # json decoded arguments passed to function
        args = [json_decode(config.get(x)) for x in cmd.params]
        # options
        kwargs = {}
        for x in cmd.options:
            kwargs[x] = (
                config_options.get(x)
                if x in ["password", "new_password"]
                else config.get(x)
            )
        cmd_runner = Commands(config, wallet, self.network, self)
        func = getattr(cmd_runner, cmd.name)
        try:
            result = func(*args, **kwargs)
        except TypeError as e:
            raise Exception(
                "Wrapping TypeError to prevent JSONRPC-Pelix from hiding traceback"
            ) from e
        return result

    def run(self):
        while self.is_running():
            self.server.handle_request() if self.server else time.sleep(0.1)
        for k, wallet in self.wallets.items():
            wallet.stop_threads()
        if self.network:
            self.print_error("shutting down network")
            self.network.stop()
            self.network.join()
        self.on_stop()

    def stop(self):
        if self.listen_jsonrpc:
            self.print_error("stopping, removing lockfile")
            remove_lockfile(get_lockfile(self.config))
        super().stop()

    def init_gui(self):
        config = self.config
        plugins = self.plugins
        gui_name = config.get("gui", "qt")
        if gui_name in ["lite", "classic"]:
            gui_name = "qt"
        if (
            sys.platform in ("windows", "win32")
            and config.get("qt_opengl")
            and gui_name == "qt"
        ):
            # Hack to force QT_OPENGL env var. See #1255
            #
            # Note if the user provides a bad override here.. the app may crash
            # or not run properly on windows. We don't do anything about that
            # since this command line option is ultimately intended to just
            # be used for an installer-generated shortcut.
            #
            os.environ["QT_OPENGL"] = str(config.get("qt_opengl"))
        gui = __import__("electrumabc_gui." + gui_name, fromlist=["electrumabc_gui"])
        self.gui = gui.ElectrumGui(config, self, plugins)
        self.gui.main()
