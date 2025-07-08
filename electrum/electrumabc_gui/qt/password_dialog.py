#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2013 ecdsa@github
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

import math
import re

from qtpy import QtWidgets
from qtpy.QtCore import Qt
from qtpy.QtGui import QIcon, QPixmap

from electrumabc.i18n import _
from electrumabc.plugins import run_hook

from .util import Buttons, CancelButton, OkButton, PasswordLineEdit, WindowModalDialog


def check_password_strength(password):
    """
    Check the strength of the password entered by the user and return back the same
    :param password: password entered by user in New Password
    :return: password strength Weak or Medium or Strong
    """
    password = password
    n = math.log(len(set(password)))
    num = (
        re.search("[0-9]", password) is not None
        and re.match("^[0-9]*$", password) is None
    )
    caps = password != password.upper() and password != password.lower()
    extra = re.match("^[a-zA-Z0-9]*$", password) is None
    score = len(password) * (n + caps + num + extra) / 20
    password_strength = {0: "Weak", 1: "Medium", 2: "Strong", 3: "Very Strong"}
    return password_strength[min(3, int(score))]


PW_NEW, PW_CHANGE, PW_PASSPHRASE = range(0, 3)


class PasswordLayout:
    titles = [_("Enter Password"), _("Change Password"), _("Enter Passphrase")]

    def __init__(
        self,
        msg,
        kind,
        OK_button,
        wallet=None,
        *,
        permit_empty: bool = True,
        force_disable_encrypt_cb: bool = False,
    ):
        self.wallet = wallet

        self.permit_empty = bool(permit_empty)
        self.pw = PasswordLineEdit()
        self.new_pw = PasswordLineEdit()
        self.conf_pw = PasswordLineEdit()
        self.kind = kind
        self.OK_button = OK_button
        self.all_lineedits = (self.pw, self.new_pw, self.conf_pw)
        self.pw_strength = None  # Will be a QLabel if kind != PW_PASSPHRASE

        vbox = QtWidgets.QVBoxLayout()
        label = QtWidgets.QLabel(msg + "\n")
        label.setWordWrap(True)

        grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.setColumnStretch(1, 1)

        if kind == PW_PASSPHRASE:
            vbox.addWidget(label)
            msgs = [_("Passphrase:"), _("Confirm Passphrase:")]
        else:
            logo_grid = QtWidgets.QGridLayout()
            logo_grid.setSpacing(8)
            logo_grid.setColumnMinimumWidth(0, 70)
            logo_grid.setColumnStretch(1, 1)

            logo = QtWidgets.QLabel()
            logo.setAlignment(Qt.AlignmentFlag.AlignCenter)

            logo_grid.addWidget(logo, 0, 0)
            logo_grid.addWidget(label, 0, 1, 1, 2)
            vbox.addLayout(logo_grid)

            m1 = _("New Password:") if kind == PW_CHANGE else _("Password:")
            msgs = [m1, _("Confirm Password:")]
            if wallet and wallet.has_password():
                grid.addWidget(QtWidgets.QLabel(_("Current Password:")), 0, 0)
                grid.addWidget(self.pw, 0, 1, 1, -1)
                lockfile = ":icons/lock.svg"
            else:
                lockfile = ":icons/unlock.svg"
            logo.setPixmap(QIcon(lockfile).pixmap(36))

        grid.addWidget(QtWidgets.QLabel(msgs[0]), 1, 0)
        grid.addWidget(self.new_pw, 1, 1, 1, -1)

        grid.addWidget(QtWidgets.QLabel(msgs[1]), 2, 0)
        grid.addWidget(self.conf_pw, 2, 1, 1, -1)
        vbox.addLayout(grid)

        # Password Strength Label
        if kind != PW_PASSPHRASE:
            self.pw_strength = QtWidgets.QLabel()
            grid.addWidget(self.pw_strength, 3, 0, 1, 2)
            self.new_pw.textChanged.connect(self.pw_changed)

        self.show_cb = QtWidgets.QCheckBox(_("Show"))
        f = self.show_cb.font()
        f.setPointSize(f.pointSize() - 1)
        self.show_cb.setFont(f)  # make font -1
        grid.addWidget(self.show_cb, 3, 2, Qt.AlignmentFlag.AlignRight)

        def toggle_show_pws():
            show = self.show_cb.isChecked()
            for le in self.all_lineedits:
                le.setEchoMode(
                    QtWidgets.QLineEdit.EchoMode.Password
                    if not show
                    else QtWidgets.QLineEdit.Normal
                )

        self.show_cb.toggled.connect(toggle_show_pws)

        self.encrypt_cb = QtWidgets.QCheckBox(_("Encrypt wallet file"))
        self.encrypt_cb.setEnabled(False)
        grid.addWidget(self.encrypt_cb, 4, 0, 1, -1)
        self.encrypt_cb.setVisible(kind != PW_PASSPHRASE)

        def enable_OK():
            ok = bool(
                self.new_pw.text() == self.conf_pw.text()
                and (self.new_pw.text() or self.permit_empty)
            )
            OK_button.setEnabled(ok)
            self.encrypt_cb.setEnabled(
                ok and bool(self.new_pw.text()) and not force_disable_encrypt_cb
            )

        self.new_pw.textChanged.connect(enable_OK)
        self.conf_pw.textChanged.connect(enable_OK)

        if not self.permit_empty:
            enable_OK()  # force buttons to OFF state initially.

        self.vbox = vbox

    def title(self):
        return self.titles[self.kind]

    def layout(self):
        return self.vbox

    def pw_changed(self):
        if not self.pw_strength:
            return
        password = self.new_pw.text()
        if password:
            colors = {
                "Weak": "Red",
                "Medium": "Blue",
                "Strong": "Green",
                "Very Strong": "Green",
            }
            strength = check_password_strength(password)
            label = (
                _("Password Strength")
                + ": "
                + "<font color="
                + colors[strength]
                + ">"
                + strength
                + "</font>"
            )
        else:
            label = ""
        self.pw_strength.setText(label)

    def old_password(self):
        if self.kind == PW_CHANGE:
            return self.pw.text() or None
        return None

    def new_password(self):
        pw = self.new_pw.text()
        # Empty passphrases are fine and returned empty.
        if pw == "" and self.kind != PW_PASSPHRASE:
            pw = None
        return pw


class PasswordLayoutForHW(object):
    def __init__(self, msg, wallet=None):
        self.wallet = wallet

        vbox = QtWidgets.QVBoxLayout()
        label = QtWidgets.QLabel(msg + "\n")
        label.setWordWrap(True)

        grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.setColumnMinimumWidth(0, 150)
        grid.setColumnMinimumWidth(1, 100)
        grid.setColumnStretch(1, 1)

        logo_grid = QtWidgets.QGridLayout()
        logo_grid.setSpacing(8)
        logo_grid.setColumnMinimumWidth(0, 70)
        logo_grid.setColumnStretch(1, 1)

        logo = QtWidgets.QLabel()
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)

        logo_grid.addWidget(logo, 0, 0)
        logo_grid.addWidget(label, 0, 1, 1, 2)
        vbox.addLayout(logo_grid)

        if wallet and wallet.has_storage_encryption():
            lockfile = ":icons/lock.png"
        else:
            lockfile = ":icons/unlock.png"
        logo.setPixmap(QPixmap(lockfile).scaledToWidth(36))

        vbox.addLayout(grid)

        self.encrypt_cb = QtWidgets.QCheckBox(_("Encrypt wallet file"))
        grid.addWidget(self.encrypt_cb, 1, 0, 1, 2)

        self.vbox = vbox

    def title(self):
        return _("Toggle Encryption")

    def layout(self):
        return self.vbox


class ChangePasswordDialogBase(WindowModalDialog):
    def __init__(self, parent, wallet):
        WindowModalDialog.__init__(self, parent)
        is_encrypted = wallet.has_storage_encryption()
        OK_button = OkButton(self)

        self.create_password_layout(wallet, is_encrypted, OK_button)

        self.setWindowTitle(self.playout.title())
        vbox = QtWidgets.QVBoxLayout(self)
        vbox.addLayout(self.playout.layout())
        vbox.addStretch(1)
        vbox.addLayout(Buttons(CancelButton(self), OK_button))
        self.playout.encrypt_cb.setChecked(is_encrypted)

    def create_password_layout(self, wallet, is_encrypted, OK_button):
        raise NotImplementedError()


class ChangePasswordDialogForSW(ChangePasswordDialogBase):
    def __init__(self, parent, wallet):
        ChangePasswordDialogBase.__init__(self, parent, wallet)
        if not wallet.has_password():
            self.playout.encrypt_cb.setChecked(True)

    def create_password_layout(self, wallet, is_encrypted, OK_button):
        if not wallet.has_password():
            msg = _("Your wallet is not protected.")
            msg += " " + _("Use this dialog to add a password to your wallet.")
        else:
            if not is_encrypted:
                msg = _(
                    "Your bitcoins are password protected. However, your wallet file is"
                    " not encrypted."
                )
            else:
                msg = _("Your wallet is password protected and encrypted.")
            msg += " " + _("Use this dialog to change your password.")
        self.playout = PasswordLayout(
            msg=msg,
            kind=PW_CHANGE,
            OK_button=OK_button,
            wallet=wallet,
            force_disable_encrypt_cb=not wallet.can_have_keystore_encryption(),
        )

    def run(self):
        if not self.exec_():
            return False, None, None, None
        return (
            True,
            self.playout.old_password(),
            self.playout.new_password(),
            self.playout.encrypt_cb.isChecked(),
        )


class ChangePasswordDialogForHW(ChangePasswordDialogBase):
    def __init__(self, parent, wallet):
        ChangePasswordDialogBase.__init__(self, parent, wallet)

    def create_password_layout(self, wallet, is_encrypted, OK_button):
        if not is_encrypted:
            msg = _("Your wallet file is NOT encrypted.")
        else:
            msg = _("Your wallet file is encrypted.")
        msg += "\n" + _(
            "Note: If you enable this setting, you will need your hardware device to"
            " open your wallet."
        )
        msg += "\n" + _("Use this dialog to toggle encryption.")
        self.playout = PasswordLayoutForHW(msg)

    def run(self):
        if not self.exec_():
            return False, None
        return True, self.playout.encrypt_cb.isChecked()


class PasswordDialog(WindowModalDialog):
    def __init__(self, parent=None, msg=None):
        msg = msg or _("Please enter your password")
        WindowModalDialog.__init__(self, parent, _("Enter Password"))
        self.pw = pw = PasswordLineEdit()
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(QtWidgets.QLabel(msg))
        grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.addWidget(QtWidgets.QLabel(_("Password")), 1, 0)
        grid.addWidget(pw, 1, 1)
        vbox.addLayout(grid)
        vbox.addLayout(Buttons(CancelButton(self), OkButton(self)))
        self.setLayout(vbox)
        run_hook("password_dialog", pw, grid, 1)

    def run(self):
        if not self.exec_():
            return
        return self.pw.text()


class PassphraseDialog(WindowModalDialog):
    """Use this window to query the user to input a passphrase eg for
    things like the Bip38 export facility in the GUI."""

    def __init__(self, wallet, parent=None, msg=None, title=None, permit_empty=False):
        msg = msg or _("Please enter a passphrase")
        title = title or _("Enter Passphrase")
        super().__init__(parent, title)
        if parent is None:
            # Force app-modal if no parent window given
            self.setWindowModality(Qt.ApplicationModal)

        OK_button = OkButton(self)
        self.playout = PasswordLayout(
            msg,
            PW_PASSPHRASE,
            OK_button,
            wallet,
            permit_empty=permit_empty,
        )
        self.setWindowTitle(title)
        vbox = QtWidgets.QVBoxLayout(self)
        vbox.addLayout(self.playout.layout())
        vbox.addStretch(1)
        vbox.addLayout(Buttons(CancelButton(self), OK_button))

    def run(self):
        if not self.exec_():
            return None
        return self.playout.new_password()
