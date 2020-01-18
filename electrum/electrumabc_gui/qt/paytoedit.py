#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2012 thomasv@gitorious
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

import re
import sys
from decimal import Decimal as PyDecimal  # Qt 5.12 also exports Decimal
from typing import Dict, List

from PyQt5.QtCore import pyqtSignal
from PyQt5.QtGui import QFontMetrics

from electrumabc import alias, bitcoin, networks, web
from electrumabc.address import Address, AddressError, ScriptOutput
from electrumabc.contacts import Contact
from electrumabc.printerror import PrintError
from electrumabc.transaction import TxOutput

from . import util
from .completion_text_edit import CompletionTextEdit
from .qrtextedit import ScanQRTextEdit

RE_ALIAS = r"^(.*?)\s*<\s*([0-9A-Za-z:]{26,})\s*>$"
RE_AMT = r"^.*\s*,\s*([0-9,.]*)\s*$"

RX_ALIAS = re.compile(RE_ALIAS)
RX_AMT = re.compile(RE_AMT)

frozen_style = "PayToEdit { border:none;}"
normal_style = "PayToEdit { }"


class PayToEdit(PrintError, CompletionTextEdit, ScanQRTextEdit):
    alias_resolved = pyqtSignal(dict)

    def __init__(self, win):
        from .main_window import ElectrumWindow

        assert isinstance(win, ElectrumWindow) and win.amount_e and win.wallet
        CompletionTextEdit.__init__(self)
        ScanQRTextEdit.__init__(self)
        self.win = win
        self.amount_edit = win.amount_e
        document = self.document()
        document.contentsChanged.connect(self.update_size)

        fontMetrics = QFontMetrics(document.defaultFont())
        self.fontSpacing = fontMetrics.lineSpacing()

        margins = self.contentsMargins()
        self.verticalMargins = margins.top() + margins.bottom()
        self.verticalMargins += self.frameWidth() * 2
        self.verticalMargins += int(document.documentMargin() * 2)

        self.heightMin = self.fontSpacing + self.verticalMargins
        self.heightMax = (self.fontSpacing * 10) + self.verticalMargins

        self.c = None
        self.textChanged.connect(self.check_text)
        self.outputs = []
        self.errors = []
        self.is_pr = False
        self.is_alias = self.validated = False
        self.scan_f = win.pay_to_URI
        self.update_size()
        self.payto_address = None
        self._original_style_sheet = self.styleSheet() or ""

        self.previous_payto = ""

        if sys.platform in ("darwin",):
            # See issue #1411 -- on *some* macOS systems, clearing the
            # payto field with setText('') ends up leaving "ghost" pixels
            # in the field, which look like the text that was just there.
            # This situation corrects itself eventually if another repaint
            # is issued to the widget. I couldn't figure out why it is happening
            # and the workaround is simply to force a repaint using this trick
            # for all textChanged events. -Calin
            self.textChanged.connect(self.repaint)

        self.verticalScrollBar().valueChanged.connect(self._vertical_scroll_bar_changed)
        self.alias_resolved.connect(self.on_alias_resolved)

    def setFrozen(self, b):
        self.setReadOnly(b)
        self.setStyleSheet(
            self._original_style_sheet + (frozen_style if b else normal_style)
        )
        self.overlay_widget.setHidden(b)

    def setGreen(self):
        if sys.platform in ("darwin",) and util.ColorScheme.dark_scheme:
            # MacOS dark mode requires special treatment here
            self.setStyleSheet(
                self._original_style_sheet
                + util.ColorScheme.DEEPGREEN.as_stylesheet(True)
            )
        else:
            self.setStyleSheet(
                self._original_style_sheet + util.ColorScheme.GREEN.as_stylesheet(True)
            )

    def setExpired(self):
        self.setStyleSheet(
            self._original_style_sheet + util.ColorScheme.RED.as_stylesheet(True)
        )

    def parse_address_and_amount(self, line) -> TxOutput:
        x, y = line.split(",")
        out_type, out = self.parse_output(x)
        amount = self.parse_amount(y)
        return TxOutput(out_type, out, amount)

    @classmethod
    def parse_output(cls, x):
        try:
            address = cls.parse_address(x)
            return bitcoin.TYPE_ADDRESS, address
        except Exception:
            return bitcoin.TYPE_SCRIPT, ScriptOutput.from_string(x)

    @staticmethod
    def parse_address(line):
        r = line.strip()
        m = RX_ALIAS.match(r)
        address = m.group(2) if m else r
        return Address.from_string(address)

    def parse_amount(self, x):
        if x.strip() == "!":
            return "!"
        p = pow(10, self.amount_edit.decimal_point)
        return int(p * PyDecimal(x.strip()))

    def check_text(self):
        self.errors = []
        if self.is_pr:
            return
        # filter out empty lines
        lines = [i for i in self.lines() if i]

        self.outputs = []

        self.payto_address = None

        if not lines:
            return

        if len(lines) != 1:
            self._parse_as_multiline(lines)
            return

        data = lines[0]
        lc_data = data.lower()
        if any(lc_data.startswith(scheme + ":") for scheme in web.parseable_schemes()):
            self.scan_f(data)
            return
        try:
            self.payto_address = self.parse_output(data)
        except Exception:
            pass
        else:
            self.win.lock_amount(False)

    def _parse_as_multiline(self, lines):
        outputs = []
        total = 0
        is_max = False
        for i, line in enumerate(lines):
            try:
                output = self.parse_address_and_amount(line)
            except (AddressError, ArithmeticError, ValueError):
                self.errors.append((i, line.strip()))
                continue

            outputs.append(output)
            if output.value == "!":
                is_max = True
            else:
                total += output.value

        self.win.max_button.setChecked(is_max)
        self.outputs = outputs
        self.payto_address = None

        if self.win.max_button.isChecked():
            self.win.spend_max()
        else:
            self.amount_edit.setAmount(total if outputs else None)
        self.win.lock_amount(self.win.max_button.isChecked() or bool(outputs))

    def get_errors(self):
        return self.errors

    def get_recipient(self):
        return self.payto_address

    def get_outputs(self, is_max) -> List[TxOutput]:
        if self.payto_address:
            if is_max:
                amount = "!"
            else:
                amount = self.amount_edit.get_amount()

            _type, addr = self.payto_address
            self.outputs = [TxOutput(_type, addr, amount)]

        return self.outputs[:]

    def lines(self):
        return self.toPlainText().split("\n")

    def is_multiline(self):
        return len(self.lines()) > 1

    def paytomany(self):
        self.setText("\n\n\n")
        self.update_size()

    def update_size(self):
        docLineCount = self.document().lineCount()
        if self.cursorRect().right() + 1 >= self.overlay_widget.pos().x():
            # Add a line if we are under the overlay widget
            docLineCount += 1
        docHeight = docLineCount * self.fontSpacing

        h = docHeight + self.verticalMargins
        h = min(max(h, self.heightMin), self.heightMax)

        self.setMinimumHeight(h)
        self.setMaximumHeight(h)

        self.verticalScrollBar().setHidden(
            docHeight + self.verticalMargins < self.heightMax
        )

        # The scrollbar visibility can have changed so we update the overlay position here
        self._updateOverlayPos()

    def _vertical_scroll_bar_changed(self, value):
        """Fix for bug #1521 -- Contents of payto edit can disappear
        unexpectedly when selecting with mouse on a single-liner."""
        vb = self.verticalScrollBar()
        docLineCount = self.document().lineCount()
        if (
            docLineCount == 1
            and vb.maximum() - vb.minimum() == 1
            and value != vb.minimum()
        ):
            self.print_error(
                f"Workaround #1521: forcing scrollbar value back to {vb.minimum()} for"
                " single line payto_e."
            )
            vb.setValue(vb.minimum())

    def qr_input(self):
        def _on_qr_success(result):
            if result and result.startswith(networks.net.CASHADDR_PREFIX + ":"):
                self.scan_f(result)
                # TODO: update fee

        super(PayToEdit, self).qr_input(_on_qr_success)

    def resolve(self, *, force_if_has_focus=False):
        """This is called by the main window periodically from a timer. See
        main_window.py function `timer_actions`.

        It will resolve OpenAliases and eCash aliases in the send tab.

        Note that aliases are assumed to be a single-line payto.

        Aliases and other payto types are mutually exclusive (that is, if
        OpenAlias, you are such with 1 payee which is alias, and cannot
        mix with regular accounts)."""
        prev_vals = (
            self.is_alias,
            self.validated,
        )  # used only if early return due to unchanged text below
        self.is_alias, self.validated = False, False
        if not force_if_has_focus and self.hasFocus():
            return
        if self.is_multiline():  # only supports single line entries atm
            return
        if self.is_pr:
            return
        key = str(self.toPlainText())
        key = key.strip()  # strip whitespaces
        if key == self.previous_payto:
            # unchanged, restore previous state, abort early.
            self.is_alias, self.validated = prev_vals
            return self.is_alias
        self.previous_payto = key
        if "." not in key or "<" in key or " " in key:
            # not an openalias or eCash aliase or an openalias with extra info in it,
            # bail..!
            return
        parts = key.split(sep=",")  # assuming single line
        if parts and len(parts) > 0 and Address.is_valid(parts[0]):
            return

        def resolve_in_thread():
            try:
                return alias.resolve(key)
            except Exception as e:
                return e

        def on_done(data):
            if isinstance(data, Exception):
                self.print_error(f"error resolving alias: {repr(data)}")
                return

            if data is None:
                return
            # emit a signal to let the main qt thread deal with results
            self.alias_resolved.emit(data)

        util.WaitingDialog(self, "Resolving Alias", resolve_in_thread, on_done)

    def on_alias_resolved(self, data: Dict):
        address = data.get("address")
        name = data.get("name")
        _type = data.get("type")

        if _type not in ("openalias", "ecash"):
            return

        if isinstance(address, str):
            address_str = address
        elif isinstance(address, Address):
            address_str = address.to_ui_string()
        else:
            raise RuntimeError("unknown address type")

        self.is_alias = True

        new_url = name + " <" + address_str + ">"
        self.setText(new_url)
        self.previous_payto = new_url

        # Don't save OpenAliases to this wallet's contacts, because the address may not
        # be immutable.
        # TODO: save the url/alias as the address, and support parsing of the resulting
        #       contact string (e.g. "Monero Development" <donate.monero.org>) or alias
        #       (e.g. "john <john.xec>") in the "Pay To" field.
        if _type != "openalias":
            self.win.contacts.add(
                Contact(name=name, address=address_str, type=_type), unique=True
            )
            self.win.contact_list.update()
            self.win.update_completions()

        self.setFrozen(True)

        self.validated = bool(data.get("validated"))
        if self.validated:
            self.setGreen()
        else:
            self.setExpired()

        return True
