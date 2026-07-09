#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2026-present The Electrum ABC developers
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

import hashlib
import multiprocessing
import os
import stat
import sys

import requests

from electrumabc.util import get_user_dir

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

    WRONG_CHECKSUM_MSG = "@wrong sha256sum@"
    FAILED_TO_SAVE_MSG = "@failed to save file@"
    FINISHED_MSG = "@finished@"

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
                    f"{self.WRONG_CHECKSUM_MSG} {self.expected_sha256sum} {actual_sha256sum}"
                )
                return
        try:
            with open(self.filename, "wb") as f:
                f.write(r.content)
            if self.make_executable:
                st = os.stat(self.filename)
                os.chmod(self.filename, st.st_mode | stat.S_IEXEC)
        except OSError as e:
            self.queue.put(f"{self.FAILED_TO_SAVE_MSG} {e}")
        else:
            self.queue.put(self.FINISHED_MSG)
