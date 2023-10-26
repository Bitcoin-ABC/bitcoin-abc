##!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2015 Thomas Voegtlin
#
# Electron Cash - lightweight Bitcoin Cash Client
# Copyright (C) 2019-2020 The Electron Cash developers
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
import base64
import json
import os.path
import sys
import threading
import time

import requests
from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt, pyqtSignal

from electrumabc import address, bitcoin, version
from electrumabc.constants import PROJECT_NAME, RELEASES_JSON_URL
from electrumabc.i18n import _
from electrumabc.networks import MainNet
from electrumabc.printerror import PrintError, print_error
from electrumabc.simple_config import SimpleConfig

from .util import Buttons


class UpdateChecker(QtWidgets.QWidget, PrintError):
    """A window that checks for updates.

    If ok, and a new version is detected, will present the hard-coded download
    URL in the GUI.

    If ok, and we are on the latest version, will present a message to that
    effect.

    If it can't verify the response or can't talk on network, will present a
    generic error message.

    Update data is expected to be JSON with a bunch of signed version strings.
    see self._process_server_reply below for an example.
    """

    # Note: it's guaranteed that every call to do_check() will either result
    # in a 'checked' signal or a 'failed' signal to be emitted.
    # got_new_version is only emitted if the new version is actually newer than
    # our version.
    checked = pyqtSignal(object)
    """emitted whenever the server gave us a (properly signed) version string.
    This may or may not mean it's a new version."""
    got_new_version = pyqtSignal(object)
    """emitted in tandem with 'checked' above ONLY if the server gave us a
    (properly signed) version string we recognize as *newer*"""
    failed = pyqtSignal()
    """emitted when there is an exception, network error, or verify error
    on version check."""

    _req_finished = pyqtSignal(object)
    """internal use by _Req thread"""
    _dl_prog = pyqtSignal(object, int)
    """[0 -> 100] range"""

    # Release URL
    download_url = "https://www.bitcoinabc.org/electrum"

    VERSION_ANNOUNCEMENT_SIGNING_ADDRESSES = (
        # Pierre's keys
        address.Address.from_string(
            "ecash:qz5j83ez703wvlwpqh94j6t45f8dn2afjgtgurgua0", net=MainNet
        ),
    )

    def __init__(self, config: SimpleConfig, parent=None):
        super().__init__(parent)
        self.is_test_run = config.get("test_release_notification", False)
        self.setWindowTitle(f"{PROJECT_NAME} - " + _("Update Checker"))
        self.content = QtWidgets.QVBoxLayout()
        self.content.setContentsMargins(*([10] * 4))

        self.heading_label = QtWidgets.QLabel()
        self.content.addWidget(self.heading_label)

        self.detail_label = QtWidgets.QLabel()
        self.detail_label.setTextInteractionFlags(Qt.LinksAccessibleByMouse)
        self.detail_label.setOpenExternalLinks(True)
        self.detail_label.setWordWrap(True)
        self.content.addWidget(self.detail_label)

        self.pb = QtWidgets.QProgressBar()
        self.pb.setMaximum(100)
        self.pb.setMinimum(0)
        self.content.addWidget(self.pb)

        versions = QtWidgets.QHBoxLayout()
        current_version_message = (
            _(f"Current version: {version.PACKAGE_VERSION}")
            if not self.is_test_run
            else "Testing release notification"
        )
        versions.addWidget(QtWidgets.QLabel(current_version_message))
        self.latest_version_label = QtWidgets.QLabel(_(f"Latest version: {' '}"))
        versions.addWidget(self.latest_version_label)
        self.content.addLayout(versions)

        close_button = QtWidgets.QPushButton(_("Close"))
        close_button.clicked.connect(self.close)
        self.cancel_or_check_button = QtWidgets.QPushButton(_("Cancel"))
        self.cancel_or_check_button.clicked.connect(self.cancel_or_check)
        self.content.addLayout(Buttons(self.cancel_or_check_button, close_button))
        grid = QtWidgets.QGridLayout()
        grid.addLayout(self.content, 0, 0)
        self.setLayout(grid)

        self._req_finished.connect(self._on_req_finished)
        self._dl_prog.connect(self._on_downloading)

        self.active_req = None
        self.last_checked_ts = 0.0
        self.resize(450, 200)

    def _process_server_reply(self, signed_version_dict):
        """Returns:
            - the new package version string if new version found from
              server, e.g. '3.3.5', '3.3.5CS', etc
            - or the current version (version.PACKAGE_VERSION) if no new
              version found.
            - None on failure (such as bad signature).

        May also raise on error.
        """
        # example signed_version_dict:
        # {
        #     "3.9.9": {
        #         "bitcoincash:qphax4cg8sxuc0qnzk6sx25939ma7y877uz04s2z82": "IA+2QG3xPRn4HAIFdpu9eeaCYC7S5wS/sDxn54LJx6BdUTBpse3ibtfq8C43M7M1VfpGkD5tsdwl5C6IfpZD/gQ="
        #     },
        #     "3.9.9CS": {
        #         "bitcoincash:qphax4cg8sxuc0qnzk6sx25939ma7y877uz04s2z82": "IA+2QG3xPRn4HAIFdpu9eeaCYC7S5wS/sDxn54LJx6BdUTBpse3ibtfq8C43M7M1VfpGkD5tsdwl5C6IfpZD/gQ="
        #     },
        #     "3.9.9SLP": {
        #         "bitcoincash:qphax4cg8sxuc0qnzk6sx25939ma7y877uz04s2z82": "IA+2QG3xPRn4HAIFdpu9eeaCYC7S5wS/sDxn54LJx6BdUTBpse3ibtfq8C43M7M1VfpGkD5tsdwl5C6IfpZD/gQ="
        #     },
        # }
        # All signed messages above are signed with the address in the dict,
        # and the message is the "3.9.9" or "3.9.9CS" etc string
        ct_matching = 0
        for version_msg, sigdict in signed_version_dict.items():
            # This looks quadratic, and it is. But the expected results are small.
            # We needed to do it this way to detect when there was no matching
            # variant and/or no known-key match.
            if self.is_matching_variant(version_msg):
                for adr, sig in sigdict.items():
                    # may raise
                    adr = address.Address.from_string(adr, net=MainNet)
                    if adr in self.VERSION_ANNOUNCEMENT_SIGNING_ADDRESSES:
                        ct_matching += 1
                        # may raise
                        if not self.is_newer(version_msg):
                            continue
                        try:
                            is_verified = bitcoin.verify_message(
                                adr,
                                base64.b64decode(sig),
                                version_msg.encode("utf-8"),
                                net=MainNet,
                            )
                        except Exception:
                            # temporary: try the legacy verification algorithm
                            # because we will need to sign the old way for a
                            # couple of releases, for old releases to verify
                            # the message.
                            # TODO: remove after two new releases past 5.0.1
                            try:
                                is_verified = bitcoin.verify_message(
                                    adr,
                                    base64.b64decode(sig),
                                    version_msg.encode("utf-8"),
                                    net=MainNet,
                                    legacy=True,
                                )
                            except Exception:
                                self.print_error(
                                    "Exception when verifying version signature for",
                                    version_msg,
                                    ":",
                                    repr(sys.exc_info()[1]),
                                )
                                return None
                        if is_verified:
                            self.print_error("Got new version", version_msg)
                            return version_msg.strip()
                        else:
                            self.print_error(
                                "Got new version", version_msg, "but sigcheck failed!"
                            )
                            return None
        if 0 == ct_matching:
            # Hmm. None of the versions we saw matched our variant.
            # And/Or, none of the keys we saw matched keys we knew about.
            # This is an error condition, so return None
            self.print_error(
                "Error: Got a valid reply from server but none of the variants"
                " match us and/or none of the signing keys are known!"
            )
            return None
        return version.PACKAGE_VERSION

    def _my_version(self):
        if self.is_test_run:
            # Return a lower version to always trigger the notification
            return 0, 0, 0, ""
        if getattr(self, "_my_version_parsed", None) is None:
            self._my_version_parsed = version.parse_package_version(
                version.PACKAGE_VERSION
            )
        return self._my_version_parsed

    @classmethod
    def _parse_version(cls, version_msg):
        try:
            return version.parse_package_version(version_msg)
        except Exception:
            print_error(
                "[{}] Error parsing version '{}': {}".format(
                    cls.__name__, version_msg, repr(sys.exc_info()[1])
                )
            )
            raise

    def is_matching_variant(self, version_msg, *, return_parsed=False):
        parsed_version = self._parse_version(version_msg)
        me = self._my_version()
        # last element of tuple is always a string, the 'variant'
        # (may be '' for EC Regular)
        ret = me[-1] == parsed_version[-1]
        if return_parsed:
            return ret, parsed_version
        return ret

    def is_newer(self, version_msg):
        yes, parsed = self.is_matching_variant(version_msg, return_parsed=True)
        # make sure it's the same variant as us eg SLP, CS, '' regular, etc..
        if yes:
            v_me = self._my_version()[:-1]
            v_server = parsed[:-1]
            return v_server > v_me
        return False

    def _on_downloading(self, req, prog):
        if req is self.active_req:
            prog = int(prog or 0)
            self.print_error("Downloading progress", str(prog) + "%", "from", req.url)
            self.pb.setValue(max(0, min(int(prog), 100)))
        else:
            self.print_error(
                "Warning: on_downloading called with a req that is not 'active'!"
            )

    def _update_view(self, latest_version=None):
        if latest_version == self._error_val:
            self.heading_label.setText("<h2>" + _("Update check failed") + "</h2>")
            self.detail_label.setText(
                _(
                    "Sorry, but we were unable to check for updates. "
                    "Please try again later."
                )
            )
            self.cancel_or_check_button.setText(_("Check Again"))
            self.cancel_or_check_button.setEnabled(True)

            self.pb.hide()
        elif latest_version:
            self.pb.hide()
            self.cancel_or_check_button.setText(_("Check Again"))
            self.latest_version_label.setText(
                _(f"Latest version: {'<b>' + latest_version + '</b>'}")
            )
            if self.is_newer(latest_version):
                self.heading_label.setText(
                    "<h2>" + _("There is a new update available") + "</h2>"
                )
                url = '<a href="{u}">{u}</a>'.format(u=UpdateChecker.download_url)
                self.detail_label.setText(
                    _(f"You can download the new version from:<br>{url}")
                )
                self.cancel_or_check_button.setEnabled(False)
            else:
                self.heading_label.setText("<h2>" + _("Already up to date") + "</h2>")
                self.detail_label.setText(
                    _(f"You are already on the latest version of {PROJECT_NAME}.")
                )
                self.cancel_or_check_button.setEnabled(True)
        else:
            self.pb.show()
            self.pb.setValue(0)
            self.cancel_or_check_button.setText(_("Cancel"))
            self.cancel_or_check_button.setEnabled(True)
            self.latest_version_label.setText("")
            self.heading_label.setText("<h2>" + _("Checking for updates...") + "</h2>")
            self.detail_label.setText(
                _(f"Please wait while {PROJECT_NAME} checks for available updates.")
            )

    def cancel_active(self):
        if self.active_req:
            self.active_req.abort()
            self.active_req = None
            self._err_fail()

    def cancel_or_check(self):
        if self.active_req:
            self.cancel_active()
        else:
            self.do_check(force=True)

    # Note: calls to do_check() will either result in a 'checked' signal or
    # a 'failed' signal to be emitted (and possibly also 'got_new_version')
    def do_check(self, force=False):
        if force:
            # no-op if none active
            self.cancel_active()
        if not self.active_req:
            self.last_checked_ts = time.time()
            self._update_view()
            self.active_req = _Req(self, self.is_test_run)

    def did_check_recently(self, secs=10.0):
        return time.time() - self.last_checked_ts < secs

    _error_val = 0xDEADB33F

    def _err_fail(self):
        self._update_view(self._error_val)
        self.failed.emit()

    def _ok_good(self, newver):
        # NB: below 'newver' may actually just be our version or a version
        # before our version (in case we are on a development build).
        # Client code should check with this class.is_newer if the emitted
        # version is actually newer.
        self._update_view(newver)
        self.checked.emit(newver)
        if self.is_newer(newver):
            self.got_new_version.emit(newver)

    def _got_reply(self, req):
        newver = None
        if not req.aborted and req.json:
            try:
                newver = self._process_server_reply(req.json)
            except Exception:
                import traceback

                self.print_error(traceback.format_exc())
        if newver is not None:
            self._ok_good(newver)
        else:
            self._err_fail()

    def _on_req_finished(self, req):
        adjective = ""
        if req is self.active_req:
            self._got_reply(req)
            self.active_req = None
            adjective = "Active"
        if req.aborted:
            adjective = "Aborted"
        self.print_error(f"{adjective}", req.diagnostic_name(), "finished")


class _Req(threading.Thread, PrintError):
    """Thread to get the list of releases from a JSON file on the github
    repository.
    """

    url = RELEASES_JSON_URL
    local_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "contrib",
        "update_checker",
        "releases.json",
    )

    def __init__(self, checker, is_test_run: bool):
        super().__init__(daemon=True)
        self.checker = checker
        self.aborted = False
        self.json = None
        self.is_test_run = is_test_run
        try:
            self.start()
        except RuntimeError:
            # If the user hits a system limitation on the number of threads,
            # ignore the error.
            self.aborted = True
            self.checker._req_finished.emit(self)

    def abort(self):
        self.aborted = True

    def diagnostic_name(self):
        return f"{__class__.__name__}@{id(self) & 0xffff}"

    def run(self):
        self.checker._dl_prog.emit(self, 10)
        try:
            source = self.url if not self.is_test_run else self.local_path
            self.print_error("Requesting from", source, "...")
            self.json, self.url = self._do_request(self.url)
            self.checker._dl_prog.emit(self, 100)
        except Exception:
            self.checker._dl_prog.emit(self, 25)
            import traceback

            self.print_error(traceback.format_exc())
        finally:
            self.checker._req_finished.emit(self)

    def _do_request(self, url):
        if self.is_test_run:
            # Fetch the data in the local repository to test the signature
            if not os.path.isfile(self.local_path):
                raise RuntimeError(
                    f"{self.local_path} file not found. Did you not run the application"
                    " from sources?"
                )
            with open(self.local_path, "r", encoding="utf-8") as f:
                json_data = json.loads(f.read())
            self.print_msg(json_data)
            return json_data, self.url

        # will raise requests.exceptions.Timeout on timeout
        response = requests.get(url, allow_redirects=True, timeout=30.0)

        if response.status_code != 200:
            raise RuntimeError(response.status_code, response.text)
        self.print_error(f"got response {len(response.text)} bytes")
        return response.json(), response.url
