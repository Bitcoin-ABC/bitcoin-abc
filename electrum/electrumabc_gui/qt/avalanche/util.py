from __future__ import annotations

from typing import Optional

from PyQt5 import QtWidgets

from electrumabc.address import PublicKey
from electrumabc.bitcoin import is_private_key
from electrumabc.wallet import DeterministicWallet

from ..password_dialog import PasswordDialog
from ..util import ButtonsLineEdit


def get_auxiliary_privkey(
    wallet: DeterministicWallet,
    key_index: int = 0,
    pwd: Optional[str] = None,
) -> str:
    """Get a deterministic private key derived from a BIP44 path that is not used
    by the wallet to generate addresses.

    Return it in WIF format, or return an empty string on failure (pwd dialog
    cancelled).
    """
    # Use BIP44 change_index 2, which is not used by any application.
    privkey_index = (2, key_index)

    if wallet.has_password() and pwd is None:
        raise RuntimeError("Wallet password required")
    return wallet.export_private_key_for_index(privkey_index, pwd)


class CachedWalletPasswordWidget(QtWidgets.QWidget):
    """A base class for widgets that may prompt the user for a wallet password and
    remember that password for later reuse.
    The password can also be specified in the constructor. In this case, there is no
    need to prompt the user for it.
    """

    def __init__(
        self,
        wallet: DeterministicWallet,
        pwd: Optional[str] = None,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        super().__init__(parent)
        self._pwd = pwd
        self.wallet = wallet

    @property
    def pwd(self) -> Optional[str]:
        """Return wallet password.

        Open a dialog to ask for the wallet password if necessary, and cache it.
        Keep asking until the user provides the correct pwd or clicks cancel.
        If the password dialog is cancelled, return None.
        """
        if self._pwd is not None:
            return self._pwd

        while self.wallet.has_password():
            password = PasswordDialog(parent=self).run()
            if password is None:
                # dialog cancelled
                return
            try:
                self.wallet.check_password(password)
                self._pwd = password
                # success
                return self._pwd
            except Exception as e:
                QtWidgets.QMessageBox.critical(self, "Invalid password", str(e))


class KeyWidget(QtWidgets.QWidget):
    """A widget to view a private key - public key pair"""

    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)
        layout.setContentsMargins(0, 0, 0, 0)

        layout.addWidget(QtWidgets.QLabel("Private key"))
        self.privkey_view = ButtonsLineEdit()
        self.privkey_view.setReadOnly(True)
        self.privkey_view.addCopyButton()
        layout.addWidget(self.privkey_view)

        layout.addWidget(QtWidgets.QLabel("Public key"))
        self.pubkey_view = ButtonsLineEdit()
        self.pubkey_view.setReadOnly(True)
        self.pubkey_view.addCopyButton()
        layout.addWidget(self.pubkey_view)

    def setPrivkey(self, wif_privkey: str):
        assert is_private_key(wif_privkey)
        self.privkey_view.setText(wif_privkey)
        pub = PublicKey.from_WIF_privkey(wif_privkey)
        self.pubkey_view.setText(pub.to_ui_string())


class AuxiliaryKeysWidget(CachedWalletPasswordWidget):
    """A widget to show private-public key pairs derived from the BIP44 change_index 2
    derivation path.
    """

    def __init__(
        self,
        wallet: DeterministicWallet,
        pwd: Optional[str] = None,
        parent: Optional[QtWidgets.QWidget] = None,
        additional_info: Optional[str] = None,
    ):
        super().__init__(wallet, pwd, parent)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        info_label = QtWidgets.QLabel(
            "These keys are not used to generate addresses and can be used for other "
            "purposes, such as building Avalanche Proofs and Delegations.<br><br>"
            "They are derived from the change_index = 2 branch of this wallet's "
            "derivation path.<br><br>"
            "<b>Do not share your private keys with anyone!</b><br>"
        )
        info_label.setWordWrap(True)
        layout.addWidget(info_label)
        if additional_info is not None:
            info_label2 = QtWidgets.QLabel(additional_info)
            info_label2.setWordWrap(True)
            layout.addWidget(info_label2)

        index_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(index_layout)

        index_layout.addWidget(QtWidgets.QLabel("Key index"))
        self.index_spinbox = QtWidgets.QSpinBox()
        self.index_spinbox.setRange(0, 1000)
        index_layout.addWidget(self.index_spinbox)
        index_layout.addStretch(1)

        self.key_widget = KeyWidget()
        layout.addWidget(self.key_widget)

        self.set_index(self.index_spinbox.value())
        self.index_spinbox.valueChanged.connect(self.set_index)

    def set_index(self, index: int):
        wif_key = get_auxiliary_privkey(self.wallet, index, self.pwd)
        self.key_widget.setPrivkey(wif_key)

        was_blocked = self.index_spinbox.blockSignals(True)
        self.index_spinbox.setValue(index)
        self.index_spinbox.blockSignals(was_blocked)

    def get_wif_private_key(self) -> str:
        return self.key_widget.privkey_view.text()

    def get_hex_public_key(self) -> str:
        return self.key_widget.pubkey_view.text()


class AuxiliaryKeysDialog(QtWidgets.QDialog):
    def __init__(
        self,
        wallet: DeterministicWallet,
        pwd: Optional[str] = None,
        parent: Optional[QtWidgets.QWidget] = None,
        additional_info: Optional[str] = None,
    ):
        super().__init__(parent)
        self.setWindowTitle("Auxiliary keys")
        self.setMinimumWidth(650)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        self.aux_keys_widget = AuxiliaryKeysWidget(wallet, pwd, self, additional_info)
        layout.addWidget(self.aux_keys_widget)

        self.ok_button = QtWidgets.QPushButton("OK")
        layout.addWidget(self.ok_button)

        self.ok_button.clicked.connect(self.accept)

    def set_index(self, index: int):
        self.aux_keys_widget.set_index(index)

    def get_hex_public_key(self) -> str:
        return self.aux_keys_widget.get_hex_public_key()

    def get_wif_private_key(self) -> str:
        return self.aux_keys_widget.get_wif_private_key()
