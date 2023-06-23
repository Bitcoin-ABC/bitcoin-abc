from __future__ import annotations

from typing import Optional

from PyQt5 import QtWidgets

from electrumabc import address
from electrumabc.avalanche.delegation import (
    Delegation,
    DelegationBuilder,
    WrongDelegatorKeyError,
)
from electrumabc.avalanche.primitives import Key, PublicKey
from electrumabc.avalanche.proof import LimitedProofId, Proof
from electrumabc.avalanche.serialize import DeserializationError
from electrumabc.bitcoin import is_private_key
from electrumabc.wallet import DeterministicWallet

from .util import AuxiliaryKeysDialog, CachedWalletPasswordWidget


class AvaDelegationWidget(CachedWalletPasswordWidget):
    def __init__(
        self,
        wallet: DeterministicWallet,
        pwd: Optional[str] = None,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        super().__init__(wallet, pwd, parent)
        self.setMinimumWidth(750)
        self.setMinimumHeight(580)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        self.load_proof_button = QtWidgets.QPushButton("Load proof from file")
        layout.addWidget(self.load_proof_button)

        self.tab_widget = QtWidgets.QTabWidget()
        layout.addWidget(self.tab_widget)
        layout.addSpacing(10)

        self.proof_edit = QtWidgets.QTextEdit()
        self.proof_edit.setAcceptRichText(False)
        self.proof_edit.setToolTip(
            "Enter a proof in hexadecimal format. A delegation will be generated for "
            "this proof. Specify the proof master key as the delegator key below."
        )
        self.tab_widget.addTab(self.proof_edit, "From a proof")

        self.ltd_id_edit = QtWidgets.QLineEdit()
        self.ltd_id_edit.setToolTip(
            "Enter the proof ID of the proof to be delegated. A delegation will be "
            "generated for the proof corresponding to this ID. "
            "You need to provide this proof's master key as the delegator key (below)."
        )
        self.tab_widget.addTab(self.ltd_id_edit, "From a Limited Proof ID")

        self.dg_edit = QtWidgets.QTextEdit()
        self.dg_edit.setAcceptRichText(False)
        self.dg_edit.setToolTip(
            "Enter an existing delegation to which you want to add another level. "
            "Enter the private key corresponding to this existing delegation's "
            "delegated key as the new delegator key, and specify a new delegated key."
        )
        self.tab_widget.addTab(self.dg_edit, "From an existing delegation")

        layout.addWidget(QtWidgets.QLabel("Delegator key (WIF)"))
        self.delegator_key_edit = QtWidgets.QLineEdit()
        self.delegator_key_edit.setToolTip(
            "Master key of the proof, or private key for the last level of an "
            "existing delegation."
        )
        layout.addWidget(self.delegator_key_edit)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel("Delegated public key"))
        delegated_key_layout = QtWidgets.QHBoxLayout()
        self.pubkey_edit = QtWidgets.QLineEdit()
        self.pubkey_edit.setToolTip("The public key to delegate the proof to.")
        delegated_key_layout.addWidget(self.pubkey_edit)
        generate_key_button = QtWidgets.QPushButton("Generate key")
        delegated_key_layout.addWidget(generate_key_button)
        layout.addLayout(delegated_key_layout)
        layout.addSpacing(10)

        self.generate_button = QtWidgets.QPushButton("Generate delegation")
        layout.addWidget(self.generate_button)

        self.dg_display = QtWidgets.QTextEdit()
        self.dg_display.setReadOnly(True)
        layout.addWidget(self.dg_display)

        # Signals
        self.load_proof_button.clicked.connect(self.on_load_proof_clicked)
        self.dg_edit.textChanged.connect(self.on_delegation_pasted)
        generate_key_button.clicked.connect(self.on_generate_key_clicked)
        self.generate_button.clicked.connect(self.on_generate_clicked)

    def set_proof(self, proof_hex: str):
        self.proof_edit.setText(proof_hex)

    def set_master(self, master_wif: str):
        self.delegator_key_edit.setText(master_wif)

    def on_load_proof_clicked(self):
        fileName, __ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select the proof file",
            filter="Avalanche proof (*.proof);;All files (*)",
        )
        if not fileName:
            return
        with open(fileName, "r", encoding="utf-8") as f:
            proof_hex = f.read().strip()
        self.set_proof(proof_hex)
        self.tab_widget.setCurrentWidget(self.proof_edit)

    def on_delegation_pasted(self):
        """Deserialize the delegation to be used as a base delegation to which a level
        is to be added. Find the delegated pubkey and check whether this is an auxiliary
        key from this wallet. If it is, prefill the Delegator key field with the private
        key.
        """
        try:
            dg = Delegation.from_hex(self.dg_edit.toPlainText())
        except DeserializationError:
            return
        dg_pubkey = dg.get_delegated_public_key()
        # Mind the type difference between PublicKey returned by
        # Delegation.get_delegated_public_key and PublicKey used by Wallet.
        idx = self.wallet.get_auxiliary_pubkey_index(
            address.PublicKey.from_pubkey(dg_pubkey.keydata),
            self.pwd,
        )
        if idx is not None:
            self.delegator_key_edit.setText(
                self.wallet.export_private_key_for_index((2, idx), self.pwd)
            )

    def on_generate_key_clicked(self):
        """Open a dialog to show a private/public key pair to be used as delegated key.
        Fill the delegated public key widget with the resulting public key.
        """
        if not self.wallet.is_deterministic() or not self.wallet.can_export():
            return
        additional_info = (
            "Please save the private key. You will need it to use your delegation with "
            "a Bitcoin ABC node."
        )
        d = AuxiliaryKeysDialog(self.wallet, self.pwd, self, additional_info)
        d.set_index(1)
        d.exec_()

        self.pubkey_edit.setText(d.get_hex_public_key())

    def on_generate_clicked(self):
        dg_hex = self._build()
        if dg_hex is not None:
            self.dg_display.setText(f'<p style="color:black;"><b>{dg_hex}</b></p>')

    def _build(self) -> Optional[str]:
        delegator_wif = self.delegator_key_edit.text()
        if not is_private_key(delegator_wif):
            QtWidgets.QMessageBox.critical(
                self, "Invalid private key", "Could not parse private key."
            )
            return
        delegator = Key.from_wif(delegator_wif)

        try:
            delegated_pubkey = PublicKey.from_hex(self.pubkey_edit.text())
        except DeserializationError:
            QtWidgets.QMessageBox.critical(
                self,
                "Invalid delegated pubkey",
                "Could not parse delegated public key.",
            )
            return

        active_tab_widget = self.tab_widget.currentWidget()
        if active_tab_widget is self.ltd_id_edit:
            try:
                ltd_id = LimitedProofId.from_hex(self.ltd_id_edit.text())
            except DeserializationError:
                QtWidgets.QMessageBox.critical(
                    self,
                    "Invalid limited ID",
                    "Could not parse limited ID (not a 32 bytes hex string).",
                )
                return
            dgb = DelegationBuilder(ltd_id, delegator.get_pubkey())
        elif active_tab_widget is self.proof_edit:
            try:
                proof = Proof.from_hex(self.proof_edit.toPlainText())
            except DeserializationError:
                QtWidgets.QMessageBox.critical(
                    self,
                    "Invalid proof",
                    "Could not parse proof. Check the format.",
                )
                return
            dgb = DelegationBuilder.from_proof(proof)
        elif active_tab_widget is self.dg_edit:
            try:
                dg = Delegation.from_hex(self.dg_edit.toPlainText())
            except DeserializationError:
                QtWidgets.QMessageBox.critical(
                    self,
                    "Invalid delegation",
                    "Could not parse delegation. Check the format.",
                )
                return
            dgb = DelegationBuilder.from_delegation(dg)
        else:
            # This should never happen, so we want to hear about it. Catch fire.
            raise RuntimeError("Indeterminate active tab.")

        try:
            dgb.add_level(delegator, delegated_pubkey)
        except WrongDelegatorKeyError:
            QtWidgets.QMessageBox.critical(
                self,
                "Wrong delegator key",
                (
                    "The provided delegator key does not match the proof master key or"
                    " the previous delegated public key (if adding a level to an"
                    " existing delegation)."
                ),
            )
            return

        return dgb.build().to_hex()

    def get_delegation(self) -> str:
        """Return delegation, as a hexadecimal string.

        An empty string means the delegation building failed.
        """
        return self.dg_display.toPlainText()


class AvaDelegationDialog(QtWidgets.QDialog):
    def __init__(
        self,
        wallet: DeterministicWallet,
        pwd: Optional[str] = None,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        super().__init__(parent)
        self.setWindowTitle("Build Avalanche Delegation")

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)
        self.dg_widget = AvaDelegationWidget(wallet, pwd, parent)
        layout.addWidget(self.dg_widget)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)
        self.close_button = QtWidgets.QPushButton("Close")
        buttons_layout.addWidget(self.close_button)

        self.close_button.clicked.connect(self.accept)

    def set_proof(self, proof_hex: str):
        self.dg_widget.set_proof(proof_hex)

    def set_master(self, master_wif: str):
        self.dg_widget.set_master(master_wif)
