#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2014 Thomas Voegtlin
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

from typing import TYPE_CHECKING

from qtpy import QtWidgets
from qtpy.QtCore import Qt

from electrumabc.amount import format_amount
from electrumabc.constants import PROJECT_NAME
from electrumabc.i18n import _
from electrumabc.util import Weak

from .qrcodewidget import QRCodeWidget, copy_to_clipboard, save_to_file
from .util import Buttons, MessageBoxMixin, WWLabel

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


class QRWindow(QtWidgets.QWidget, MessageBoxMixin):
    def __init__(self):
        # Top-level window.
        super().__init__()
        self.setWindowTitle(f"{PROJECT_NAME} - " + _("Payment Request"))
        self.label = ""
        self.amount = 0
        self.setFocusPolicy(Qt.NoFocus)
        self.setSizePolicy(
            QtWidgets.QSizePolicy.MinimumExpanding,
            QtWidgets.QSizePolicy.MinimumExpanding,
        )

        main_box = QtWidgets.QHBoxLayout(self)
        main_box.setContentsMargins(12, 12, 12, 12)
        self.qrw = QRCodeWidget()
        self.qrw.setSizePolicy(
            QtWidgets.QSizePolicy.MinimumExpanding,
            QtWidgets.QSizePolicy.MinimumExpanding,
        )
        main_box.addWidget(self.qrw, 2)

        vbox = QtWidgets.QVBoxLayout()
        vbox.setContentsMargins(12, 12, 12, 12)
        main_box.addLayout(vbox, 2)
        main_box.addStretch(1)

        self.address_label = WWLabel()
        self.address_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        vbox.addWidget(self.address_label)

        self.msg_label = WWLabel()
        self.msg_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        vbox.addWidget(self.msg_label)

        self.amount_label = WWLabel()
        self.amount_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        vbox.addWidget(self.amount_label)

        self.op_return_label = WWLabel()
        self.op_return_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        vbox.addWidget(self.op_return_label)

        vbox.addStretch(2)

        copyBut = QtWidgets.QPushButton(_("Copy QR Image"))
        saveBut = QtWidgets.QPushButton(_("Save QR Image"))
        vbox.addLayout(Buttons(copyBut, saveBut))

        weakSelf = Weak.ref(self)
        weakQ = Weak.ref(self.qrw)
        weakBut = Weak.ref(copyBut)
        copyBut.clicked.connect(lambda: copy_to_clipboard(weakQ(), weakBut()))
        saveBut.clicked.connect(lambda: save_to_file(weakQ(), weakSelf()))

    def set_content(
        self,
        win: ElectrumWindow,
        address_text,
        amount,
        message,
        url,
        *,
        op_return=None,
        op_return_raw=None,
    ):
        if op_return is not None and op_return_raw is not None:
            raise ValueError(
                "Must specify exactly one of op_return or op_return_hex as kwargs to"
                " QR_Window.set_content"
            )
        self.address_label.setText(address_text)
        if amount:
            amount_text = "{} {}".format(
                format_amount(amount, win.config), win.base_unit()
            )
        else:
            amount_text = ""
        self.amount_label.setText(amount_text)
        self.msg_label.setText(message)
        self.qrw.setData(url)
        if op_return:
            self.op_return_label.setText(f"OP_RETURN: {str(op_return)}")
        elif op_return_raw:
            self.op_return_label.setText(f"OP_RETURN (raw): {str(op_return_raw)}")
        self.op_return_label.setVisible(bool(op_return or op_return_raw))
        self.layout().activate()

    def closeEvent(self, e):
        # May have modal up when closed -- because wallet window may force-close
        # us when it is gets closed (See ElectrumWindow.clean_up in
        # main_window.py).
        # .. So kill the "QR Code Copied to clipboard" modal dialog that may
        # be up as it can cause a crash for this window to be closed with it
        # still up.
        for c in self.findChildren(QtWidgets.QDialog):
            if c.isWindow() and c.isModal() and c.isVisible():
                # break out of local event loop for dialog as we are about to die and
                # we will be invalidated.
                c.reject()
        super().closeEvent(e)
