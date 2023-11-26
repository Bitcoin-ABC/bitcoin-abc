# Electron Cash - lightweight Bitcoin client
# Copyright (C) 2020, 2023 Axel Gembe <derago@gmail.com>
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

import ipaddress
import re
import warnings
from typing import Tuple

from PyQt5.QtCore import pyqtSignal
from PyQt5.QtGui import QIntValidator, QValidator
from PyQt5.QtWidgets import QLineEdit, QWidget


def mark_widget(state: QValidator.State, widget: QWidget):
    from ..util import ColorScheme

    if state == QValidator.Acceptable:
        widget.setStyleSheet("")
    else:
        widget.setStyleSheet(
            "QWidget {{ border: 1px solid {color} }}".format(
                color=ColorScheme.RED.get_html()
            )
        )


# Based on: https://stackoverflow.com/a/33214423
# By Eugene Yarmash (https://stackoverflow.com/users/244297)

_all_numeric_re = re.compile(r"[0-9]+$")
_allowed_label_re = re.compile(r"(?!-)[a-z0-9-]{1,63}(?<!-)$", re.IGNORECASE)


def is_valid_hostname(hostname):
    if hostname[-1] == ".":
        # strip exactly one dot from the right, if present
        hostname = hostname[:-1]
    if len(hostname) > 253:
        return False

    labels = hostname.split(".")

    # the TLD must be not all-numeric
    if _all_numeric_re.match(labels[-1]):
        return False

    return all(_allowed_label_re.match(label) for label in labels)


class PortValidator(QIntValidator):
    """A generic IP port validator.  Accepts any number in the range [1,65535]
    by default."""

    stateChanged = pyqtSignal(QValidator.State)

    def __init__(self, parent, minimum=1, accept_zero=False):
        super().__init__(0, 65535, parent)
        if not isinstance(parent, QLineEdit):
            warnings.warn(
                RuntimeWarning("PortValidator must be passed a QLineEdit parent")
            )
        self.minimum = minimum
        self.accept_zero = accept_zero
        self.stateChanged.connect(self.setRedBorder)

    def validate(self, inputStr: str, pos: int) -> Tuple[QValidator.State, str, int]:
        res = list(super().validate(inputStr, pos))
        if res[0] == QValidator.Acceptable:
            try:
                value = int(inputStr)
                if value < self.minimum and (not self.accept_zero or value != 0):
                    res[0] = QValidator.Intermediate
            except (ValueError, TypeError):
                res[0] = QValidator.Invalid
        self.stateChanged.emit(res[0])
        return tuple(res)

    def setRedBorder(self, state):
        parent = self.parent()
        if isinstance(parent, QLineEdit):
            mark_widget(state, parent)


class UserPortValidator(PortValidator):
    """
    Checks that a given port is either a high port (from 1024 to 65535) or zero.
    Additionally provides a callback for when the validation state changes.
    """

    def __init__(self, parent, accept_zero=False):
        super().__init__(parent, 1024, accept_zero)


class HostValidator(QValidator):
    """
    Validates a host string, accepts either IPV4, IPV6 or domain names
    """

    stateChanged = pyqtSignal(QValidator.State)

    def __init__(self, parent):
        super().__init__(parent)
        if not isinstance(parent, QLineEdit):
            warnings.warn(
                RuntimeWarning("HostValidator must be passed a QLineEdit parent")
            )
        self.stateChanged.connect(self.setRedBorder)

    def fixup(self, inputStr: str):
        return inputStr.strip()

    def validate(self, inputStr: str, pos: int) -> Tuple[QValidator.State, str, int]:
        def set_state(state):
            self.stateChanged.emit(state)
            return state, inputStr, pos

        if len(inputStr) == 0:
            return set_state(QValidator.Intermediate)

        # Check for valid IP address
        try:
            ipaddress.ip_address(inputStr)
            return set_state(QValidator.Acceptable)
        except ValueError:
            pass

        # Check for valid DNS
        if is_valid_hostname(inputStr):
            return set_state(QValidator.Acceptable)

        return set_state(QValidator.Intermediate)

    def setRedBorder(self, state):
        parent = self.parent()
        if isinstance(parent, QLineEdit):
            mark_widget(state, parent)
