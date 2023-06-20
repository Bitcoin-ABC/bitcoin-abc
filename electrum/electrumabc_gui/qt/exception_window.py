#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
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

import html
import locale
import platform
import sys
import traceback
import urllib.parse
import webbrowser
from typing import Optional

import PyQt5.QtCore as QtCore
from PyQt5 import QtWidgets
from PyQt5.QtCore import QObject
from PyQt5.QtGui import QIcon

from electrumabc.constants import PROJECT_NAME, REPOSITORY_URL
from electrumabc.i18n import _
from electrumabc.printerror import print_error
from electrumabc.util import finalization_print_error
from electrumabc.version import PACKAGE_VERSION

from .main_window import ElectrumWindow
from .util import destroyed_print_error

issue_template_html = f"""<h2>Traceback</h2>
<pre>
{{traceback}}
</pre>

<h2>Additional information</h2>
<ul>
  <li>{PROJECT_NAME} version: {{app_version}}</li>
  <li>Python version: {{python_version}}</li>
  <li>Operating system: {{os}}</li>
  <li>Wallet type: {{wallet_type}}</li>
  <li>Locale: {{locale}}</li>
</ul>
"""

issue_template_markdown = f"""
# Description
<!--- Please add under this line additional information, such as a description
 of what action led to the error--->

# Traceback
```
{{traceback}}
```

# System information

- {PROJECT_NAME} version: {{app_version}}
- Python version: {{python_version}}
- Operating system: {{os}}
- Wallet type: {{wallet_type}}
- Locale: {{locale}}

"""


class ExceptionDialog(QtWidgets.QDialog):
    def __init__(self, config, exctype, value, tb):
        super().__init__()
        self.exc_args = (exctype, value, tb)
        self.config = config
        self.setWindowTitle(f"{PROJECT_NAME} - " + _("An Error Occurred"))
        self.setMinimumSize(600, 600)

        main_box = QtWidgets.QVBoxLayout()
        main_box.setContentsMargins(20, 20, 20, 20)

        heading = QtWidgets.QLabel("<h2>" + _("Sorry!") + "</h2>")
        main_box.addWidget(heading)
        label = QtWidgets.QLabel(_(f"Something went wrong running {PROJECT_NAME}."))
        label.setWordWrap(True)
        main_box.addWidget(label)

        label = QtWidgets.QLabel(
            _(
                "To help us diagnose and fix the problem, you can send us"
                " a bug report that contains useful debug information:"
            )
        )
        label.setWordWrap(True)
        main_box.addWidget(label)

        self.report_textfield = QtWidgets.QTextEdit()
        self.report_textfield.setReadOnly(True)
        self.report_textfield.setText(self.get_report_string("html"))

        main_box.addWidget(self.report_textfield)

        label = QtWidgets.QLabel(
            "<br/>You will be able to add more information after clicking on"
            " <i>Open a Bug Report</i><br/><br/>"
        )
        label.setWordWrap(True)
        label.setTextFormat(QtCore.Qt.RichText)
        main_box.addWidget(label)

        buttons = QtWidgets.QHBoxLayout()

        buttons.addStretch(1)

        report_button = QtWidgets.QPushButton(_("Open a Bug Report"))
        report_button.clicked.connect(self.send_report)
        report_button.setIcon(QIcon(":icons/tab_send.png"))
        buttons.addWidget(report_button)

        close_button = QtWidgets.QPushButton("Close")
        close_button.clicked.connect(self.reject)
        buttons.addWidget(close_button)

        main_box.addLayout(buttons)

        self.setLayout(main_box)
        self.show()

    def send_report(self):
        title = urllib.parse.quote(self.get_issue_title())
        body = urllib.parse.quote(self.get_report_string())
        labels = "bug, crash report"
        webbrowser.open_new_tab(
            f"{REPOSITORY_URL}/issues/new?title={title}&body={body}&labels={labels}"
        )

    def closeEvent(self, event):
        sys.__excepthook__(*self.exc_args)
        event.accept()

    def get_additional_info(self):
        args = {
            "app_version": PACKAGE_VERSION,
            "python_version": sys.version,
            "os": platform.platform(),
            "locale": locale.getdefaultlocale()[0],
            "description": self.report_textfield.toPlainText(),
            "wallet_type": _get_current_wallet_types(),
        }
        return args

    def get_report_string(self, fmt: str = "markdown") -> str:
        info = self.get_additional_info()
        info["traceback"] = html.escape(
            "".join(traceback.format_exception(*self.exc_args)), quote=False
        )
        if fmt == "html":
            return issue_template_html.format(**info)
        return issue_template_markdown.format(**info)

    def get_issue_title(self):
        """Return the actual error which is printed on the
        last line of the exception stack"""
        lines = traceback.format_exception(*self.exc_args)
        return lines[-1].strip()


def is_enabled(config) -> bool:
    return bool(config.get("show_crash_reporter2", default=True))


def set_enabled(config, b: bool):
    config.set_key("show_crash_reporter2", bool(b))


def _get_current_wallet_types():
    wtypes = {
        str(getattr(w.wallet, "wallet_type", "Unknown"))
        for w in QtWidgets.QApplication.instance().topLevelWidgets()
        if isinstance(w, ElectrumWindow) and w.is_alive()
    }
    return ",".join(list(wtypes)) or "Unknown"


class ExceptionHook(QObject):
    """Exception Hook singleton.  Only one of these will be extant. It is
    created by the ElectrumGui singleton, and it lives forever until app exit.
    (But ONLY if the `show_crash_reporter` config key is set.)"""

    _report_exception = QtCore.pyqtSignal(object, object, object, object)
    _instance = None

    def __init__(self, config):
        super().__init__()
        self.dialog: Optional[ExceptionDialog] = None
        if ExceptionHook._instance is not None:
            # This is ok, we will be GC'd later.
            return
        # strong reference to self keeps us alive until uninstall() is called
        ExceptionHook._instance = self
        self.config = config
        sys.excepthook = self.handler
        self._report_exception.connect(self._show_window)
        print_error(f"[{__class__.__qualname__}] Installed.")
        finalization_print_error(self, f"[{__class__.__qualname__}] Finalized.")
        destroyed_print_error(self)

    @staticmethod
    def uninstall():
        sys.excepthook = sys.__excepthook__
        if ExceptionHook._instance is not None:
            print_error(f"[{__class__.__qualname__}] Uninstalled.")
            ExceptionHook._instance = None

    def handler(self, exctype, value, tb):
        if (
            exctype is KeyboardInterrupt
            or exctype is SystemExit
            or not is_enabled(self.config)
        ):
            sys.__excepthook__(exctype, value, tb)
        else:
            self._report_exception.emit(self.config, exctype, value, tb)

    def _show_window(self, config, exctype, value, tb):
        self.dialog = ExceptionDialog(config, exctype, value, tb)
        self.dialog.show()
