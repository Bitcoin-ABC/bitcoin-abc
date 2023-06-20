# Electrum ABC - lightweight eCash client
# Copyright (C) 2019-2020 Axel Gembe <derago@gmail.com>
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

import inspect
import os
import re
import shutil
import subprocess
import sys
import threading
from enum import IntEnum, unique
from typing import Optional, Tuple

import stem
import stem.control
import stem.process
import stem.socket

from .. import version
from ..printerror import PrintError, is_verbose
from ..simple_config import SimpleConfig
from ..utils import Event

# Python 3.10 workaround for stem package which is using collections.Iterable
# (removed in 3.10)
if sys.version_info >= (3, 10):
    if hasattr(stem, "__version__") and version.parse_package_version(stem.__version__)[
        :2
    ] <= (1, 8):
        import collections.abc

        # monkey-patch collections.Iterable back since stem.control expects to see
        # this name
        stem.control.collections.Iterable = collections.abc.Iterable


_TOR_ENABLED_KEY = "tor_enabled"
_TOR_ENABLED_DEFAULT = False

_TOR_SOCKS_PORT_KEY = "tor_socks_port"
_TOR_SOCKS_PORT_DEFAULT = 0


def check_proxy_bypass_tor_control(*args, **kwargs) -> bool:
    """
    This function returns True when called by stem.socket.ControlPort to prevent
    the Tor control connection going through a proxied socket.
    """
    stack = inspect.stack()
    if stack and len(stack) >= 4:
        # [0] is this function, [1] is the genexpr in _socksocket_filtered,
        # [2] is _socksocket_filtered and [3] is the caller. In newer stem
        # versions socket is not called directly but through asyncio.
        for s in stack[3:7]:
            caller_self = stack[3].frame.f_locals.get("self")
            if caller_self and type(caller_self) is stem.socket.ControlPort:
                return True
    return False


class TorController(PrintError):
    @unique
    class Status(IntEnum):
        STOPPING = 0
        STOPPED = 1
        STARTED = 2
        READY = 3
        ERRORED = 4

    @unique
    class BinaryType(IntEnum):
        MISSING = 0
        SYSTEM = 1
        DOWNLOADED = 2

    _tor_process: Optional[subprocess.Popen] = None
    _tor_read_thread: Optional[threading.Thread] = None
    _tor_controller: Optional[stem.control.Controller] = None

    status: Status = Status.STOPPED
    status_changed = Event()

    active_socks_port: Optional[int] = None
    active_control_port: Optional[int] = None
    active_port_changed = Event()

    tor_binary: str
    tor_binary_type: BinaryType = BinaryType.MISSING

    def __init__(self, config: SimpleConfig):
        if not config:
            raise AssertionError("TorController: config must be set")

        self._config: SimpleConfig = config

        if not self.detect_tor() and self.is_enabled():
            self.print_error("Tor enabled but no usable Tor binary found, disabling")
            self.set_enabled(False)

        socks_port = self._config.get(_TOR_SOCKS_PORT_KEY, _TOR_SOCKS_PORT_DEFAULT)
        if not socks_port or not self._check_port(int(socks_port)):
            # If no valid SOCKS port is set yet, we set the default
            self._config.set_key(_TOR_SOCKS_PORT_KEY, _TOR_SOCKS_PORT_DEFAULT)

    def __del__(self):
        self.status_changed.clear()
        self.active_port_changed.clear()

    # Version 0.4.5.5
    # [notice] Opening Socks listener on 127.0.0.1:0
    # [notice] Socks listener listening on port 36103.
    # [notice] Opened Socks listener connection (ready) on 127.0.0.1:36103
    # [notice] Opening Control listener on 127.0.0.1:0
    # [notice] Control listener listening on port 36104.
    # [notice] Opened Control listener connection (ready) on 127.0.0.1:36104

    # Version 0.4.2.5
    # [notice] Opening Socks listener on 127.0.0.1:0
    # [notice] Socks listener listening on port 36103.
    # [notice] Opened Socks listener on 127.0.0.1:36103
    # [notice] Opening Control listener on 127.0.0.1:0
    # [notice] Control listener listening on port 36104.
    # [notice] Opened Control listener on 127.0.0.1:36104

    _listener_re = re.compile(
        r".*\[notice\] ([^ ]*) listener listening on port ([0-9]+)\.?$"
    )

    # If a log string matches any of the included regex it is ignored
    _ignored_res = [
        # This is caused by the network dialog TorDetector
        re.compile(r".*This port is not an HTTP proxy.*"),
    ]

    def _tor_msg_handler(self, message: str):
        if is_verbose:
            if all(not regex.match(message) for regex in TorController._ignored_res):
                self.print_msg(message)

        # Check if this is a "Opened listener" message and extract the information
        # into the active_socks_port and active_control_port variables
        listener_match = TorController._listener_re.match(message)
        if listener_match:
            listener_type = listener_match.group(1)
            listener_port = int(listener_match.group(2))
            if listener_type == "Socks":
                self.active_socks_port = listener_port
            elif listener_type == "Control":
                self.active_control_port = listener_port
                # The control port is the last port opened, so only notify after it
                self.active_port_changed(self)

    def _read_tor_msg(self):
        try:
            while self._tor_process and not self._tor_process.poll():
                line = (
                    self._tor_process.stdout.readline()
                    .decode("utf-8", "replace")
                    .strip()
                )
                if not line:
                    break
                self._tor_msg_handler(line)
        except Exception:
            self.print_exception("Exception in Tor message reader")

    _orig_subprocess_popen = subprocess.Popen

    @staticmethod
    def _popen_monkey_patch(*args, **kwargs):
        if sys.platform in ("win32",):
            if hasattr(subprocess, "CREATE_NO_WINDOW"):
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            else:
                # CREATE_NO_WINDOW, for < Python 3.7
                kwargs["creationflags"] = 0x08000000
        kwargs["start_new_session"] = True
        return TorController._orig_subprocess_popen(*args, **kwargs)

    def _get_tor_binary(self) -> Tuple[str, BinaryType]:
        # Try to locate a system tor
        res = shutil.which("tor")
        if res and os.path.isfile(res):
            return res, TorController.BinaryType.SYSTEM

        # Use the automatically downloaded tor
        res = self._config.get("downloaded_tor_path")
        if res and os.path.isfile(res):
            return res, TorController.BinaryType.DOWNLOADED

        return "", TorController.BinaryType.MISSING

    def detect_tor(self) -> bool:
        path, bintype = self._get_tor_binary()
        self.tor_binary = path
        self.tor_binary_type = bintype
        return self.is_available()

    def is_available(self) -> bool:
        return self.tor_binary_type != TorController.BinaryType.MISSING

    def start(self):
        if self._tor_process is not None:
            # Tor is already running
            return

        if not self.is_enabled():
            # Don't start Tor if not enabled
            return

        if self.tor_binary_type == TorController.BinaryType.MISSING:
            self.print_error("No Tor binary found")
            self.status = TorController.Status.ERRORED
            self.status_changed(self)
            return

        # When the socks port is set to zero, we let tor choose one
        socks_port = str(self.get_socks_port())
        if socks_port == "0":
            socks_port = "auto"

        try:
            subprocess.Popen = TorController._popen_monkey_patch
            self._tor_process = stem.process.launch_tor_with_config(
                tor_cmd=self.tor_binary,
                # We will monitor the bootstrap status
                completion_percent=0,
                init_msg_handler=self._tor_msg_handler,
                take_ownership=True,
                close_output=False,
                config={
                    "SocksPort": socks_port,
                    "ControlPort": "auto",
                    "CookieAuthentication": "1",
                    "DataDirectory": os.path.join(self._config.path, "tor"),
                    "Log": "NOTICE stdout",
                },
            )
        except Exception:
            self.print_exception("Failed to start Tor")
            self._tor_process = None
            self.status = TorController.Status.ERRORED
            self.status_changed(self)
            return
        finally:
            subprocess.Popen = TorController._orig_subprocess_popen

        self._tor_read_thread = threading.Thread(
            target=self._read_tor_msg, name="Tor message reader"
        )
        self._tor_read_thread.start()

        self.status = TorController.Status.STARTED
        self.status_changed(self)

        try:
            self._tor_controller = stem.control.Controller.from_port(
                port=self.active_control_port
            )
            self._tor_controller.authenticate()
            self._tor_controller.add_event_listener(
                self._handle_network_liveliness_event,
                stem.control.EventType.NETWORK_LIVENESS,
            )  # pylint: disable=no-member
        except Exception:
            self.print_exception("Failed to connect to Tor control port")
            self.stop()
            return

        self.print_error(
            "started (Tor version {})".format(self._tor_controller.get_version())
        )

    def stop(self):
        if self._tor_process is None:
            # Tor is not running
            return

        self.status = TorController.Status.STOPPING
        self.status_changed(self)

        self.active_socks_port = None
        self.active_control_port = None
        self.active_port_changed(self)

        if self._tor_controller is not None:
            # tell tor to shut down
            self._tor_controller.signal(stem.Signal.HALT)  # pylint: disable=no-member
            self._tor_controller.close()
            self._tor_controller = None

        if self._tor_process is not None:
            try:
                try:
                    self._tor_process.wait(1.0)
                    # if the wait doesn't raise an exception, the process has terminated
                except subprocess.TimeoutExpired:
                    # process is still running, try to terminate it
                    self._tor_process.terminate()
                    self._tor_process.wait()
            except ProcessLookupError:
                self.print_exception("Failed to terminate Tor process")
            self._tor_process = None

        if self._tor_read_thread is not None:
            self._tor_read_thread.join()
            self._tor_read_thread = None

        self.status = TorController.Status.STOPPED
        self.status_changed(self)
        self.print_error("stopped")

    def _handle_network_liveliness_event(
        self, event: stem.response.events.NetworkLivenessEvent
    ):
        old_status = self.status
        self.status = (
            TorController.Status.READY
            if event.status == "UP"
            else TorController.Status.STARTED
        )
        if old_status != self.status:
            self.status_changed(self)

    def _check_port(self, port: int) -> bool:
        if not isinstance(port, int):
            return False
        if port is None:
            return False
        # Port 0 is automatic
        if port != 0:
            if port < 1024 or port > 65535:
                return False
        return True

    def set_enabled(self, enabled: bool):
        self._config.set_key(_TOR_ENABLED_KEY, enabled)
        if enabled:
            self.start()
        else:
            self.stop()

    def is_enabled(self) -> bool:
        return bool(self._config.get(_TOR_ENABLED_KEY, _TOR_ENABLED_DEFAULT))

    def set_socks_port(self, port: int):
        if not self._check_port(port):
            raise AssertionError("TorController: invalid port")

        self.stop()
        self._config.set_key(_TOR_SOCKS_PORT_KEY, port)
        self.start()

    def get_socks_port(self) -> int:
        socks_port = self._config.get(_TOR_SOCKS_PORT_KEY, _TOR_SOCKS_PORT_DEFAULT)
        if not self._check_port(int(socks_port)):
            raise AssertionError("TorController: invalid port")
        return int(socks_port)
