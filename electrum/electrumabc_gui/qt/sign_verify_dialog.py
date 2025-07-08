from __future__ import annotations

import base64
from functools import partial
from typing import TYPE_CHECKING, Optional

from qtpy.QtCore import Qt
from qtpy.QtWidgets import (
    QDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QRadioButton,
    QSizePolicy,
    QTextEdit,
    QToolButton,
    QWidget,
)

from electrumabc.address import Address
from electrumabc.constants import CURRENCY, PROJECT_NAME
from electrumabc.ecc import SignatureType, verify_message_with_address
from electrumabc.i18n import _

from .password_dialog import PasswordDialog
from .util import MessageBoxMixin

if TYPE_CHECKING:
    from electrumabc.wallet import AbstractWallet


class CollapsibleSection(QWidget):
    def __init__(
        self, title: str, content_widget: QWidget, parent: Optional[QWidget] = None
    ):
        super().__init__(parent)

        main_layout = QGridLayout(self)
        main_layout.setVerticalSpacing(0)
        main_layout.setContentsMargins(0, 0, 0, 0)
        self.setLayout(main_layout)

        self.toggleButton = QToolButton(self)
        self.toggleButton.setStyleSheet("QToolButton {border: none;}")  # noqa: FS003
        self.toggleButton.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        self.toggleButton.setArrowType(Qt.RightArrow)
        self.toggleButton.setText(title)
        self.toggleButton.setCheckable(True)
        self.toggleButton.setChecked(False)

        self.header_line = QFrame(self)
        self.header_line.setFrameShape(QFrame.HLine)
        self.header_line.setFrameShadow(QFrame.Sunken)
        self.header_line.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Maximum
        )

        content_layout = QHBoxLayout()
        self.contentFrame = QFrame(self)
        self.contentFrame.setFrameShape(QFrame.Box)
        self.contentFrame.setFrameShadow(QFrame.Sunken)
        self.contentFrame.setLayout(content_layout)
        content_layout.addWidget(content_widget)
        self.contentFrame.setVisible(False)

        main_layout.addWidget(self.toggleButton, 0, 0, 1, 1, Qt.AlignmentFlag.AlignLeft)
        main_layout.addWidget(self.header_line, 0, 2, 1, 1)
        main_layout.addWidget(self.contentFrame, 1, 0, 1, 3)

        self.toggleButton.toggled.connect(self.toggle)

    def toggle(self, collapsed: bool):
        if collapsed:
            self.toggleButton.setArrowType(Qt.DownArrow)
            self.contentFrame.setVisible(True)
        else:
            self.toggleButton.setArrowType(Qt.RightArrow)
            self.contentFrame.setVisible(False)


class SignVerifyDialog(QDialog, MessageBoxMixin):
    def __init__(
        self, wallet: AbstractWallet, address: Optional[Address] = None, parent=None
    ):
        super().__init__(parent)
        self.setWindowModality(Qt.WindowModal)
        self.setWindowTitle(_("Sign/verify Message"))
        self.setMinimumSize(610, 290)

        self.wallet = wallet

        layout = QGridLayout(self)
        self.setLayout(layout)

        self.message_e = QTextEdit()
        self.message_e.setAcceptRichText(False)
        layout.addWidget(QLabel(_("Message")), 1, 0)
        layout.addWidget(self.message_e, 1, 1)
        layout.setRowStretch(2, 3)

        self.address_e = QLineEdit()
        self.address_e.setText(address.to_ui_string() if address else "")
        layout.addWidget(QLabel(_("Address")), 2, 0)
        layout.addWidget(self.address_e, 2, 1)

        self.signature_e = QTextEdit()
        self.signature_e.setAcceptRichText(False)
        layout.addWidget(QLabel(_("Signature")), 3, 0)
        layout.addWidget(self.signature_e, 3, 1)
        layout.setRowStretch(3, 1)

        sigtype_widget = QWidget()
        sigtype_layout = QHBoxLayout()
        sigtype_widget.setLayout(sigtype_layout)
        self.ecash_magic_rb = QRadioButton("eCash signature")
        self.ecash_magic_rb.setToolTip(
            "New signature scheme introduced in v5.0.2 (incompatible with signatures\n"
            "produced with earlier versions). The message is prefixed with 'eCash \n"
            "Signed Message:\\n' prior to signing."
        )
        self.ecash_magic_rb.setChecked(True)
        self.bicoin_magic_rb = QRadioButton("Bitcoin signature")
        self.bicoin_magic_rb.setToolTip(
            "Legacy signature scheme used before v5.0.2. The message is prefixed with\n"
            "'Bitcoin Signed Message:\\n' prior to signing."
        )
        sigtype_layout.addWidget(QLabel("Signature type:"))
        sigtype_layout.addWidget(self.ecash_magic_rb)
        sigtype_layout.addWidget(self.bicoin_magic_rb)

        collapsible_section = CollapsibleSection("Advanced settings", sigtype_widget)
        layout.addWidget(collapsible_section, 4, 1)

        hbox = QHBoxLayout()
        b = QPushButton(_("Sign"))
        b.clicked.connect(lambda: self.do_sign())
        hbox.addWidget(b)

        b = QPushButton(_("Verify"))
        b.clicked.connect(lambda: self.do_verify())
        hbox.addWidget(b)

        b = QPushButton(_("Close"))
        b.clicked.connect(self.accept)
        hbox.addWidget(b)
        layout.addLayout(hbox, 5, 1)

    def _get_password(self) -> Optional[str]:
        password = None
        while self.wallet.has_keystore_encryption():
            password = PasswordDialog(self).run()
            if password is None:
                return
            try:
                self.wallet.check_password(password)
                break
            except Exception as e:
                self.show_error(str(e))
                continue
        return password

    def do_sign(self):
        password = self._get_password()
        address = self.address_e.text().strip()
        message = self.message_e.toPlainText().strip()
        try:
            addr = Address.from_string(address)
        except Exception:
            self.show_message(_(f"Invalid {CURRENCY} address."))
            return
        if addr.kind != addr.ADDR_P2PKH:
            msg_sign = (
                _(
                    "Signing with an address actually means signing with the"
                    " corresponding private key, and verifying with the corresponding"
                    " public key. The address you have entered does not have a unique"
                    " public key, so these operations cannot be performed."
                )
                + "\n\n"
                + _(
                    "The operation is undefined. Not just in "
                    f"{PROJECT_NAME}, but in general."
                )
            )
            self.show_message(
                _("Cannot sign messages with this type of address.") + "\n\n" + msg_sign
            )
            return
        if self.wallet.is_watching_only():
            self.show_message(_("This is a watching-only wallet."))
            return
        if not self.wallet.is_mine(addr):
            self.show_message(_("Address not in wallet."))
            return
        task = partial(
            self.wallet.sign_message, addr, message, password, self.get_sigtype()
        )

        def show_signed_message(sig):
            self.signature_e.setText(base64.b64encode(sig).decode("ascii"))

        self.wallet.thread.add(task, on_success=show_signed_message)

    def do_verify(self):
        try:
            address = Address.from_string(self.address_e.text().strip())
        except Exception:
            self.show_message(_(f"Invalid {CURRENCY} address."))
            return
        message = self.message_e.toPlainText().strip().encode("utf-8")
        try:
            # This can throw on invalid base64
            sig = base64.b64decode(self.signature_e.toPlainText())
            verified = verify_message_with_address(
                address, sig, message, sigtype=self.get_sigtype()
            )
        except Exception:
            verified = False

        if verified:
            self.show_message(_("Signature verified"))
        else:
            self.show_error(_("Wrong signature"))

    def get_sigtype(self) -> SignatureType:
        return (
            SignatureType.ECASH
            if self.ecash_magic_rb.isChecked()
            else SignatureType.BITCOIN
        )
