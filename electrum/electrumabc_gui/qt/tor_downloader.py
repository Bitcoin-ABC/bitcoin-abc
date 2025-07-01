#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Electrum ABC developers
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

import hashlib
import multiprocessing
import os
import stat
import sys
from typing import TYPE_CHECKING

import requests
from qtpy import QtWidgets
from qtpy.QtCore import Qt, QTimer

from electrumabc.i18n import _
from electrumabc.util import get_user_dir

if TYPE_CHECKING:
    from electrumabc.simple_config import SimpleConfig

# dict keys are sys.platform string
TOR_BINARY_URLS = {
    "linux": "https://github.com/PiRK/Electrum-ABC-Build-Tools/releases/download/v1.0/tor-linux",
    "win32": "https://github.com/PiRK/Electrum-ABC-Build-Tools/releases/download/v1.0/tor.exe",
    "darwin": "https://github.com/PiRK/Electrum-ABC-Build-Tools/releases/download/v1.0/tor-macos",
}
TOR_BINARY_URL = TOR_BINARY_URLS.get(sys.platform)


TOR_BINARY_NAMES = {
    "linux": "tor",
    "win32": "tor.exe",
    "darwin": "tor",
}
DOWNLOAD_DIR = os.path.join(get_user_dir(), "tor")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
TOR_BINARY_PATH = None
if sys.platform in TOR_BINARY_URLS:
    TOR_BINARY_PATH = os.path.join(DOWNLOAD_DIR, TOR_BINARY_NAMES[sys.platform])

TOR_BINARY_SHA256S = {
    "linux": "f88b318a72a8b1f7b4c6fb288887d9f7f44b731596399ae658074b1b7b4f9fb1",
    "win32": "e3ec0b9ed4e22149751309916483e2ef7cfd90d1c864c8dc6709d36cd0cb404b",
    "darwin": "804c30e3837793d800f82361ed2c240859fba26cdb1cb5c895691dfca2b4571d",
}
TOR_BINARY_SHA256 = TOR_BINARY_SHA256S[sys.platform]

WRONG_CHECKSUM_MSG = "@wrong sha256sum@"
FAILED_TO_SAVE_MSG = "@failed to save file@"
FINISHED_MSG = "@finished@"


class Downloader:
    """URL downloader designed to be run as a separate process and to communicate
    with the main process via a Queue.

    multiprocessing is used because of pythons multi-threading limitations, and
    because an alternative solution based on QNetworkAccessManager would not work
    for any HTTPS URL (SSL issues).

    The queue can be monitored for the following messages (as str objects):

      - "@started@"
      - "@HTTP status@ {status code} {reason}"
        (e.g "@HTTP status@ 200 OK")
      - "@content size@ {size in bytes}"
      - "@failed to save file@ {error message}"   (failure)
      - "@wrong sha256sum@ {expected} {actual}"   (failure)
      - "@finished@"   (success)
    """

    def __init__(
        self,
        url: str,
        filename: str,
        make_executable: bool = False,
        sha256sum: str = "",
    ):
        self.url = url
        self.filename = filename
        self.make_executable = make_executable
        self.expected_sha256sum = sha256sum

        self.queue = multiprocessing.Queue()

    def run_download(self):
        self.queue.put("@started@")
        r = requests.get(self.url)
        self.queue.put(f"@HTTP status@ {r.status_code} {r.reason}")
        self.queue.put(f"@content size@ {len(r.content)}")
        if self.expected_sha256sum:
            actual_sha256sum = hashlib.sha256(r.content).hexdigest()
            if self.expected_sha256sum != actual_sha256sum:
                self.queue.put(
                    f"{WRONG_CHECKSUM_MSG} {self.expected_sha256sum} {actual_sha256sum}"
                )
                return
        try:
            with open(self.filename, "wb") as f:
                f.write(r.content)
            if self.make_executable:
                st = os.stat(self.filename)
                os.chmod(self.filename, st.st_mode | stat.S_IEXEC)
        except OSError as e:
            self.queue.put(f"{FAILED_TO_SAVE_MSG} {e}")
        else:
            self.queue.put(FINISHED_MSG)


class DownloadTorDialog(QtWidgets.QDialog):
    def __init__(self, config: SimpleConfig, parent=None):
        self.config = config
        self.was_download_successful = False

        super().__init__(parent)
        self.setWindowTitle("Tor downloader")
        self.setMinimumWidth(650)
        self.setMinimumHeight(200)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        self.label = QtWidgets.QLabel(_("Downloading Tor..."))
        layout.addWidget(self.label)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)
        self.ok_button = QtWidgets.QPushButton("OK")
        self.ok_button.setVisible(False)
        buttons_layout.addWidget(self.ok_button)
        self.cancel_button = QtWidgets.QPushButton("Cancel")
        buttons_layout.addWidget(self.cancel_button)

        if TOR_BINARY_PATH is None or TOR_BINARY_URL is None:
            raise NotImplementedError(
                f"No Tor binary available for platform {sys.platform}."
            )
        self.downloader = Downloader(
            TOR_BINARY_URL,
            TOR_BINARY_PATH,
            make_executable=True,
            sha256sum=TOR_BINARY_SHA256,
        )
        self.download_process = multiprocessing.Process(
            target=self.downloader.run_download
        )
        self.timer = QTimer()
        self.timer.timeout.connect(self.read_queue)

        self.ok_button.clicked.connect(self.accept)
        self.cancel_button.clicked.connect(self.reject)

        self.start_download()

    def start_download(self):
        QtWidgets.QApplication.setOverrideCursor(Qt.WaitCursor)
        self.download_process.start()
        self.timer.start(1000)

    def read_queue(self):
        while not self.downloader.queue.empty():
            msg = self.downloader.queue.get()
            error = "<b>Error:</b> "
            if msg.startswith(FAILED_TO_SAVE_MSG):
                error += "Failed to save file<br><br>"
                error += f"{msg[len(FAILED_TO_SAVE_MSG) + 1:]}"
                self.on_error(error)
            if msg.startswith(WRONG_CHECKSUM_MSG):
                expected, actual = msg[len(WRONG_CHECKSUM_MSG) + 1 :].split()
                error += (
                    "Download failed: File has wrong checksum<br>"
                    f"<br>Expected sha256sum:<br>    {expected}"
                    f"<br>Actual sha256sum:<br>    {actual}"
                )
                self.on_error(error)
            if msg == FINISHED_MSG:
                self.on_download_complete()

    def on_download_complete(self):
        self.config.set_key("downloaded_tor_path", TOR_BINARY_PATH)
        self.timer.stop()
        QtWidgets.QApplication.restoreOverrideCursor()
        self.label.setText(
            _("Tor was successfully downloaded and saved to")
            + f"\n{TOR_BINARY_PATH}\n\n"
        )
        self.cancel_button.setVisible(False)
        self.ok_button.setVisible(True)
        self.was_download_successful = True

    def on_error(self, error: str):
        self.label.setText(error)
        self.timer.stop()
        self.cancel_button.setText("Quit")
        QtWidgets.QApplication.restoreOverrideCursor()

    def reject(self):
        self.timer.stop()
        self.download_process.kill()
        QtWidgets.QApplication.restoreOverrideCursor()
        super().reject()
