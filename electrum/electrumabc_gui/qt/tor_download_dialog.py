#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2023-present The Electrum ABC developers
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

import multiprocessing
import sys

from qtpy import QtWidgets
from qtpy.QtCore import Qt, QTimer

from electrumabc.i18n import _
from electrumabc.tor_downloader import (
    TOR_BINARY_PATH,
    TOR_BINARY_SHA256,
    TOR_BINARY_URL,
    Downloader,
)


class DownloadTorDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
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
            if msg.startswith(Downloader.FAILED_TO_SAVE_MSG):
                error += "Failed to save file<br><br>"
                error += f"{msg[len(Downloader.FAILED_TO_SAVE_MSG) + 1 :]}"
                self.on_error(error)
            if msg.startswith(Downloader.WRONG_CHECKSUM_MSG):
                expected, actual = msg[len(Downloader.WRONG_CHECKSUM_MSG) + 1 :].split()
                error += (
                    "Download failed: File has wrong checksum<br>"
                    f"<br>Expected sha256sum:<br>    {expected}"
                    f"<br>Actual sha256sum:<br>    {actual}"
                )
                self.on_error(error)
            if msg == Downloader.FINISHED_MSG:
                self.on_download_complete()

    def on_download_complete(self):
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
