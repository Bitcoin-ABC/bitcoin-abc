from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from typing import List, Optional, Union

from PyQt5 import QtCore, QtGui, QtWidgets

from electrumabc.address import Address, AddressError
from electrumabc.avalanche.primitives import COutPoint, Key, PublicKey
from electrumabc.avalanche.proof import Proof, ProofBuilder, SignedStake, Stake
from electrumabc.avalanche.serialize import (
    DeserializationError,
    serialize_blob,
    write_compact_size,
)
from electrumabc.bitcoin import is_private_key
from electrumabc.constants import PROOF_DUST_THRESHOLD, STAKE_UTXO_CONFIRMATIONS
from electrumabc.i18n import _
from electrumabc.transaction import get_address_from_output_script
from electrumabc.uint256 import UInt256
from electrumabc.util import format_satoshis
from electrumabc.wallet import AddressNotFoundError, DeterministicWallet

from .delegation_editor import AvaDelegationDialog
from .util import CachedWalletPasswordWidget, get_auxiliary_privkey

PROOF_MASTER_KEY_INDEX = 0


@dataclass
class StakeAndKey:
    """Class storing a stake waiting to be signed (waiting for the stake commitment)"""

    stake: Stake
    key: Key


class TextColor:
    NEUTRAL = "black"
    GOOD_SIG = "darkgreen"
    BAD_SIG = "darkred"
    GOOD_STAKE_SIG = "blue"
    BAD_STAKE_SIG = "darkmagenta"


def colored_text(text: str, color: str) -> str:
    return f"<b><font color='{color}'>{text}</font></b>"


def proof_to_rich_text(proof: Proof) -> str:
    """
    Return a proof hex as a colored html string. Colors are used to indicate the
    validity of stake signatures and of the master signature.
    """
    p = struct.pack("<Qq", proof.sequence, proof.expiration_time)
    p += proof.master_pub.serialize()
    p += write_compact_size(len(proof.signed_stakes))
    rich_text = colored_text(p.hex(), TextColor.NEUTRAL)

    for ss in proof.signed_stakes:
        rich_text += colored_text(ss.stake.to_hex(), TextColor.NEUTRAL)
        if ss.verify_signature(proof.stake_commitment):
            rich_text += colored_text(ss.sig.hex(), TextColor.GOOD_STAKE_SIG)
        else:
            rich_text += colored_text(ss.sig.hex(), TextColor.BAD_STAKE_SIG)

    rich_text += colored_text(
        serialize_blob(proof.payout_script_pubkey).hex(), TextColor.NEUTRAL
    )
    if proof.verify_master_signature():
        return rich_text + colored_text(proof.signature.hex(), TextColor.GOOD_SIG)
    return rich_text + colored_text(proof.signature.hex(), TextColor.BAD_SIG)


class AvaProofEditor(CachedWalletPasswordWidget):
    def __init__(
        self,
        wallet: DeterministicWallet,
        receive_address: Optional[Address] = None,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        CachedWalletPasswordWidget.__init__(self, wallet, parent=parent)
        # This is enough width to show a whole compressed pubkey.
        self.setMinimumWidth(750)
        # Enough height to show the entire proof without scrolling.
        self.setMinimumHeight(680)

        self.stakes: List[Union[SignedStake, StakeAndKey]] = []
        self.receive_address = receive_address

        self.wallet = wallet

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        layout.addWidget(QtWidgets.QLabel("Proof sequence"))
        self.sequence_sb = QtWidgets.QSpinBox()
        self.sequence_sb.setMinimum(0)
        layout.addWidget(self.sequence_sb)
        layout.addSpacing(10)

        expiration_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(expiration_layout)

        self.expiration_checkbox = QtWidgets.QCheckBox("Enable proof expiration")
        self.expiration_checkbox.setChecked(True)
        expiration_layout.addWidget(self.expiration_checkbox)

        expiration_date_sublayout = QtWidgets.QVBoxLayout()
        expiration_layout.addLayout(expiration_date_sublayout)
        expiration_date_sublayout.addWidget(QtWidgets.QLabel("Expiration date"))
        self.calendar = QtWidgets.QDateTimeEdit()
        self.calendar.setToolTip("Date and time at which the proof will expire")
        expiration_date_sublayout.addWidget(self.calendar)

        expiration_timestamp_sublayout = QtWidgets.QVBoxLayout()
        expiration_layout.addLayout(expiration_timestamp_sublayout)
        expiration_timestamp_sublayout.addWidget(
            QtWidgets.QLabel("Expiration POSIX timestamp")
        )
        # Use a QDoubleSpinbox with precision set to 0 decimals, because
        # QSpinBox is limited to the int32 range (January 19, 2038)
        self.timestamp_widget = QtWidgets.QDoubleSpinBox()
        self.timestamp_widget.setDecimals(0)
        # date range: genesis block to Wed Jun 09 3554 16:53:20 GMT
        self.timestamp_widget.setRange(1231006505, 50**10)
        self.timestamp_widget.setSingleStep(86400)
        self.timestamp_widget.setToolTip(
            "POSIX time, seconds since 1970-01-01T00:00:00"
        )
        expiration_timestamp_sublayout.addWidget(self.timestamp_widget)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel("Master private key (WIF)"))
        self.master_key_edit = QtWidgets.QLineEdit()
        self.master_key_edit.setToolTip(
            "Private key that controls the proof. This is the key that signs the "
            "delegation or signs the avalanche votes. The suggested key (if any) is "
            "derived from the wallet's seed, on the (change_index, key_index) = (2, 0) "
            "index."
        )
        layout.addWidget(self.master_key_edit)
        layout.addSpacing(10)

        layout.addWidget(
            QtWidgets.QLabel("Master public key (computed from master private key)")
        )
        self.master_pubkey_view = QtWidgets.QLineEdit()
        self.master_pubkey_view.setReadOnly(True)
        layout.addWidget(self.master_pubkey_view)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel("Payout address"))
        self.payout_addr_edit = QtWidgets.QLineEdit()
        self.payout_addr_edit.setToolTip(
            "Address to which staking rewards could be sent, in the future"
        )
        layout.addWidget(self.payout_addr_edit)
        layout.addSpacing(10)

        self.utxos_wigdet = QtWidgets.QTableWidget()
        self.utxos_wigdet.setColumnCount(4)
        self.utxos_wigdet.setHorizontalHeaderLabels(
            ["txid", "vout", "amount (XEC)", "block height"]
        )
        self.utxos_wigdet.verticalHeader().setVisible(False)
        self.utxos_wigdet.setSelectionMode(QtWidgets.QTableWidget.NoSelection)
        # This is a simple global way to make the table read-only, without having to
        # set flags on each individual item.
        self.utxos_wigdet.setEditTriggers(QtWidgets.QTableWidget.NoEditTriggers)
        self.utxos_wigdet.horizontalHeader().setSectionResizeMode(
            0, QtWidgets.QHeaderView.Stretch
        )
        layout.addWidget(self.utxos_wigdet)

        self.total_amount_label = QtWidgets.QLabel("Total amount:")
        layout.addWidget(self.total_amount_label)

        stakes_button_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(stakes_button_layout)

        self.add_coins_from_file_button = QtWidgets.QPushButton("Add coins from file")
        stakes_button_layout.addWidget(self.add_coins_from_file_button)

        self.add_coins_from_wallet_button = QtWidgets.QPushButton(
            "Add coins from wallet"
        )
        stakes_button_layout.addWidget(self.add_coins_from_wallet_button)

        self.merge_stakes_button = QtWidgets.QPushButton("Merge stakes from proof")
        self.merge_stakes_button.setToolTip(
            "Add stakes from an existing proof. The proof master key and expiration "
            "time must exactly match when merging proofs, or else the stake signatures "
            "will be invalid."
        )
        stakes_button_layout.addWidget(self.merge_stakes_button)

        self.generate_button = QtWidgets.QPushButton("Generate proof")
        layout.addWidget(self.generate_button)
        self.generate_button.clicked.connect(self._on_generate_clicked)

        self.proof_display = QtWidgets.QTextEdit()
        self.proof_display.setReadOnly(True)
        layout.addWidget(self.proof_display)

        proof_status_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(proof_status_layout)

        master_sig_status_header_label = QtWidgets.QLabel("Master signature: ")
        proof_status_layout.addWidget(master_sig_status_header_label)
        self.master_sig_status_label = QtWidgets.QLabel("")
        proof_status_layout.addWidget(self.master_sig_status_label)
        stake_sigs_status_header_label = QtWidgets.QLabel("Stake signatures: ")
        proof_status_layout.addWidget(stake_sigs_status_header_label)
        self.stake_sigs_status_label = QtWidgets.QLabel("")
        proof_status_layout.addWidget(self.stake_sigs_status_label)

        proof_buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(proof_buttons_layout)

        self.load_proof_button = QtWidgets.QPushButton("Load proof")
        self.load_proof_button.setToolTip("Load a proof from a .proof file.")
        proof_buttons_layout.addWidget(self.load_proof_button)

        self.save_proof_button = QtWidgets.QPushButton("Save proof")
        self.save_proof_button.setToolTip("Save this proof to a .proof file.")
        self.save_proof_button.setEnabled(False)
        proof_buttons_layout.addWidget(self.save_proof_button)

        self.generate_dg_button = QtWidgets.QPushButton("Generate a delegation")
        self.generate_dg_button.setEnabled(False)
        proof_buttons_layout.addWidget(self.generate_dg_button)

        # Connect signals
        self.expiration_checkbox.toggled.connect(self.on_expiration_cb_toggled)
        self.calendar.dateTimeChanged.connect(self.on_datetime_changed)
        self.timestamp_widget.valueChanged.connect(self.on_timestamp_changed)
        self.master_key_edit.textChanged.connect(self.update_master_pubkey)
        self.add_coins_from_file_button.clicked.connect(
            self.on_add_coins_from_file_clicked
        )
        self.add_coins_from_wallet_button.clicked.connect(
            self.on_add_coins_from_wallet_clicked
        )
        self.merge_stakes_button.clicked.connect(self.on_merge_stakes_clicked)
        self.generate_dg_button.clicked.connect(self.open_dg_dialog)
        self.load_proof_button.clicked.connect(self.on_load_proof_clicked)
        self.save_proof_button.clicked.connect(self.on_save_proof_clicked)

        # Init widgets
        self.dg_dialog = None
        self.init_data()

    def init_data(self):
        # Clear internal state
        self.stakes.clear()

        self.sequence_sb.setValue(0)

        # Set a default expiration date
        self.expiration_checkbox.setChecked(True)
        now = QtCore.QDateTime.currentDateTime()
        self.calendar.setDateTime(now.addYears(3))

        self.master_pubkey_view.setText("")
        # Suggest a private key to the user. He can change it if he wants.
        self.master_key_edit.setText(self._get_privkey_suggestion())

        if self.receive_address is not None:
            self.payout_addr_edit.setText(self.receive_address.to_ui_string())

        self.utxos_wigdet.clearContents()
        self.total_amount_label.setText("Total amount:")
        self.proof_display.setText("")
        self.master_sig_status_label.clear()
        self.stake_sigs_status_label.clear()

    def add_utxos(self, utxos: List[dict]):
        """Add UTXOs from a list of dict objects, such as stored internally by
        the wallet or loaded from a JSON file. These UTXOs must belong to the current
        wallet, as they are not yet signed.
        They must also be confirmed (i.e. have a block height number).
        """
        unconfirmed_count = 0
        stakes = []
        for utxo in utxos:
            height = utxo["height"]
            if height <= 0:
                unconfirmed_count += 1
                continue

            address = utxo["address"]
            if not isinstance(utxo["address"], Address):
                # utxo loaded from JSON file (serialized)
                address = Address.from_string(address)
            txid = UInt256.from_hex(utxo["prevout_hash"])

            # derive addresses as needed (if this is an offline wallet, it may not
            # have derived addresses beyond the initial gap limit at index 20)
            addr_index = utxo.get("address_index")
            if addr_index is not None:
                for_change = addr_index[0] == 1
                num_addresses = (
                    len(self.wallet.change_addresses)
                    if for_change
                    else len(self.wallet.receiving_addresses)
                )
                for _i in range(num_addresses, addr_index[1] + 1):
                    self.wallet.create_new_address(for_change)

            try:
                wif_key = self.wallet.export_private_key(address, self.pwd)
                key = Key.from_wif(wif_key)
            except AddressNotFoundError:
                QtWidgets.QMessageBox.critical(
                    self,
                    _("Missing key or signature"),
                    (
                        f'UTXO {utxo["prevout_hash"]}:{utxo["prevout_n"]} with address '
                        f"{address.to_ui_string()} does not belong to this wallet."
                    ),
                )
                return

            stakes.append(
                StakeAndKey(
                    Stake(
                        COutPoint(txid, utxo["prevout_n"]),
                        amount=utxo["value"],
                        height=utxo["height"],
                        pubkey=key.get_pubkey(),
                        is_coinbase=utxo["coinbase"],
                    ),
                    key,
                )
            )

        if unconfirmed_count:
            QtWidgets.QMessageBox.warning(
                self,
                _("Excluded coins"),
                (
                    f"{unconfirmed_count} coins have been ignored because they are "
                    "unconfirmed or do not have a block height specified."
                ),
            )

        self.add_stakes(stakes)

    def add_stakes(self, stakes: List[Union[SignedStake, StakeAndKey]]):
        previous_utxo_count = len(self.stakes)
        self.stakes += stakes
        self.utxos_wigdet.setRowCount(len(self.stakes))

        tip = self.wallet.get_local_height()
        for i, ss in enumerate(stakes):
            stake = ss.stake
            height = stake.height

            row_index = previous_utxo_count + i
            txid_item = QtWidgets.QTableWidgetItem(stake.utxo.txid.get_hex())
            self.utxos_wigdet.setItem(row_index, 0, txid_item)

            vout_item = QtWidgets.QTableWidgetItem(str(stake.utxo.n))
            self.utxos_wigdet.setItem(row_index, 1, vout_item)

            amount_item = QtWidgets.QTableWidgetItem(
                format_satoshis(stake.amount, num_zeros=2)
            )
            amount_item.setTextAlignment(QtCore.Qt.AlignRight | QtCore.Qt.AlignVCenter)
            if stake.amount < PROOF_DUST_THRESHOLD:
                amount_item.setForeground(QtGui.QColor("red"))
                amount_item.setToolTip(
                    _(
                        "The minimum threshold for a coin in an avalanche proof is "
                        f"{format_satoshis(PROOF_DUST_THRESHOLD)} XEC."
                    )
                )
            self.utxos_wigdet.setItem(row_index, 2, amount_item)

            height_item = QtWidgets.QTableWidgetItem(str(height))
            utxo_validity_height = height + STAKE_UTXO_CONFIRMATIONS
            if utxo_validity_height > tip:
                height_item.setForeground(QtGui.QColor("orange"))
                height_item.setToolTip(
                    _(
                        f"UTXOs with less than {STAKE_UTXO_CONFIRMATIONS} "
                        "confirmations cannot be used as stake proofs."
                    )
                    + f"\nCurrent known block height is {tip}.\nYour proof will be "
                    f"valid after block {utxo_validity_height}."
                )
            self.utxos_wigdet.setItem(row_index, 3, height_item)

        total_amount_sats = 0
        for s in self.stakes:
            total_amount_sats += s.stake.amount
        self.total_amount_label.setText(
            f"Total amount: <b>{format_satoshis(total_amount_sats)} XEC</b>"
        )

    def _get_privkey_suggestion(self) -> str:
        """Get a private key to pre-fill the master key field.
        Return it in WIF format, or return an empty string on failure (pwd dialog
        cancelled).
        """
        if not self.wallet.is_deterministic() or not self.wallet.can_export():
            return ""
        wif_pk = ""
        if not self.wallet.has_password() or self.pwd is not None:
            wif_pk = get_auxiliary_privkey(
                self.wallet, key_index=PROOF_MASTER_KEY_INDEX, pwd=self.pwd
            )
        return wif_pk

    def on_expiration_cb_toggled(self, is_checked: bool):
        self.timestamp_widget.setEnabled(is_checked)
        self.calendar.setEnabled(is_checked)

    def on_datetime_changed(self, dt: QtCore.QDateTime):
        """Set the timestamp from a QDateTime"""
        was_blocked = self.blockSignals(True)
        self.timestamp_widget.setValue(dt.toSecsSinceEpoch())
        self.blockSignals(was_blocked)

    def on_timestamp_changed(self, timestamp: float):
        """Set the calendar date from POSIX timestamp"""
        timestamp = int(timestamp)
        was_blocked = self.blockSignals(True)
        self.calendar.setDateTime(QtCore.QDateTime.fromSecsSinceEpoch(timestamp))
        self.blockSignals(was_blocked)

    def on_add_coins_from_file_clicked(self):
        fileName, __ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select the file containing the data for coins to be used as stakes",
            filter="JSON (*.json);;All files (*)",
        )
        if not fileName:
            return

        with open(fileName, "r", encoding="utf-8") as f:
            utxos = json.load(f)
        if utxos is None:
            return
        self.add_utxos(utxos)

    def on_add_coins_from_wallet_clicked(self):
        d = UtxosDialog(self.wallet)
        if d.exec_() == QtWidgets.QDialog.Rejected:
            return
        utxos = d.get_selected_utxos()

        if not check_utxos(utxos, self):
            return

        self.add_utxos(utxos)

    def on_merge_stakes_clicked(self):
        fileName, __ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select the proof file for merging stakes",
            filter="Avalanche proof (*.proof);;All files (*)",
        )
        if not fileName:
            return

        with open(fileName, "r", encoding="utf-8") as f:
            proof_hex = f.read()

        # TODO: catch possible decoding, format, hex ... errors
        self.add_stakes(Proof.from_hex(proof_hex).signed_stakes)

        self._on_generate_clicked()

    def displayProof(self, proof: Proof):
        self.proof_display.setText(proof_to_rich_text(proof))
        assert proof.to_hex() == self.proof_display.toPlainText()

        # Update status bar below actual proof display
        if proof.verify_master_signature():
            self.master_sig_status_label.setText(
                colored_text("✅ Valid", TextColor.GOOD_SIG)
            )
        else:
            self.master_sig_status_label.setText(
                colored_text("❌ Invalid", TextColor.BAD_SIG)
            )

        good_count, bad_count = 0, 0
        for ss in proof.signed_stakes:
            if ss.verify_signature(proof.stake_commitment):
                good_count += 1
            else:
                bad_count += 1
        text = ""
        if good_count:
            text = colored_text(f"{good_count} good", TextColor.GOOD_STAKE_SIG)
        if bad_count:
            if text:
                text += "; "
            text += colored_text(f"{bad_count} bad", TextColor.BAD_STAKE_SIG)
        self.stake_sigs_status_label.setText(
            text or colored_text("No stakes", TextColor.NEUTRAL)
        )

    def on_load_proof_clicked(self):
        d = LoadProofDialog(self)
        if not d.exec_():
            return

        self.load_proof(d.proof)
        self.generate_dg_button.setEnabled(True)
        self.save_proof_button.setEnabled(True)

    def load_proof(self, proof: Proof):
        known_keys = []
        if self._get_privkey_suggestion():
            known_keys.append(self._get_privkey_suggestion())
        if is_private_key(self.master_key_edit.text()):
            known_keys.append(self.master_key_edit.text())
        self.init_data()

        self.sequence_sb.setValue(proof.sequence)
        if proof.expiration_time <= 0:
            self.expiration_checkbox.setChecked(False)
        else:
            self.timestamp_widget.setValue(proof.expiration_time)

        self.master_key_edit.setText("")
        for wif_key in known_keys:
            if Key.from_wif(wif_key).get_pubkey() == proof.master_pub:
                self.master_key_edit.setText(wif_key)
                break
        else:
            QtWidgets.QMessageBox.warning(
                self,
                "Missing private key",
                (
                    "Unable to guess private key associated with this proof's public"
                    " key. You can fill it manually if you know it, or leave it blank"
                    " if you just want to sign your stakes, "
                ),
            )
        self.master_pubkey_view.setText(proof.master_pub.to_hex())

        _txout_type, addr = get_address_from_output_script(proof.payout_script_pubkey)
        # note: this will work even if the "addr" is not an address (PublicKey or
        # ScriptOutput), but the proof generation currently only supports addresses
        self.payout_addr_edit.setText(addr.to_ui_string())
        self.add_stakes(proof.signed_stakes)

        self.displayProof(proof)

    def on_save_proof_clicked(self):
        if not self.proof_display.toPlainText():
            raise AssertionError(
                "No proof to be saved. The save button should not be enabled."
            )
        proof = Proof.from_hex(self.proof_display.toPlainText())

        default_filename = f"{proof.proofid.get_hex()[:8]}"
        if not proof.verify_master_signature():
            default_filename += "-unsigned"
        default_filename += ".proof"

        fileName, __ = QtWidgets.QFileDialog.getSaveFileName(
            self,
            "Save proof to file",
            default_filename,
            filter="Avalanche proof (*.proof);;All files (*)",
        )
        if not fileName:
            return
        with open(fileName, "w", encoding="utf-8") as f:
            f.write(proof.to_hex())

    def update_master_pubkey(self, master_wif: str):
        if is_private_key(master_wif):
            master_pub = Key.from_wif(master_wif).get_pubkey()
            pubkey_str = master_pub.to_hex()
            self.master_pubkey_view.setText(pubkey_str)

    def _on_generate_clicked(self):
        proof = self._build()
        if proof is not None:
            self.displayProof(proof)
        self.generate_dg_button.setEnabled(proof is not None)
        self.save_proof_button.setEnabled(proof is not None)

    def _build(self) -> Optional[Proof]:
        master_wif = self.master_key_edit.text()
        if not is_private_key(master_wif):
            try:
                master_pub = PublicKey.from_hex(self.master_pubkey_view.text())
            except DeserializationError:
                QtWidgets.QMessageBox.critical(
                    self,
                    "No valid master key",
                    (
                        "You need to specify either a master private key or a master "
                        "public key before generate a proof."
                    ),
                )
                return
            QtWidgets.QMessageBox.warning(
                self,
                "Invalid private key",
                (
                    "Unable to parse private key. The generated proof will not be"
                    " signed. This is OK if you just intend to sign your stakes and"
                    " sign the proof later in a master wallet."
                ),
            )
            master = None
        else:
            master = Key.from_wif(master_wif)
            master_pub = None

        try:
            payout_address = Address.from_string(self.payout_addr_edit.text())
        except AddressError as e:
            QtWidgets.QMessageBox.critical(self, "Invalid payout address", str(e))
            return

        if self.wallet.has_password() and self.pwd is None:
            self.proof_display.setText(
                '<p style="color:red;">Password dialog cancelled!</p>'
            )
            return
        expiration_time = (
            0
            if not self.expiration_checkbox.isChecked()
            else self.calendar.dateTime().toSecsSinceEpoch()
        )
        proofbuilder = ProofBuilder(
            sequence=self.sequence_sb.value(),
            expiration_time=expiration_time,
            payout_address=payout_address,
            master=master,
            master_pub=master_pub,
        )

        for ss in self.stakes:
            if isinstance(ss, StakeAndKey):
                proofbuilder.sign_and_add_stake(ss.stake, ss.key)
            else:
                proofbuilder.add_signed_stake(ss)

        return proofbuilder.build()

    def open_dg_dialog(self):
        if self.dg_dialog is None:
            self.dg_dialog = AvaDelegationDialog(self.wallet, self.pwd, self)
        self.dg_dialog.set_proof(self.proof_display.toPlainText())
        self.dg_dialog.set_master(self.master_key_edit.text())
        self.dg_dialog.show()


class AvaProofDialog(QtWidgets.QDialog):
    def __init__(
        self,
        wallet: DeterministicWallet,
        receive_address: Optional[Address] = None,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        super().__init__(parent)
        self.setWindowTitle(f"Avalanche Proof Editor - {wallet.basename()}")

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)
        self.proof_widget = AvaProofEditor(wallet, receive_address, self)
        layout.addWidget(self.proof_widget)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)
        self.close_button = QtWidgets.QPushButton("Close")
        buttons_layout.addWidget(self.close_button)

        self.close_button.clicked.connect(self.accept)

    def add_utxos(self, utxos: List[dict]) -> bool:
        if not check_utxos(utxos, self):
            return False
        self.proof_widget.add_utxos(utxos)
        return True


class LoadProofDialog(QtWidgets.QDialog):
    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)
        self.setWindowTitle("Load an existing proof")

        self.proof: Optional[Proof] = None

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        layout.addWidget(
            QtWidgets.QLabel('Paste a hexadecimal proof or click "Load from file"')
        )

        self.proof_edit = QtWidgets.QTextEdit()
        self.proof_edit.setAcceptRichText(False)
        layout.addWidget(self.proof_edit)

        self.load_from_file_button = QtWidgets.QPushButton("Load from file")
        layout.addWidget(self.load_from_file_button)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)

        self.ok_button = QtWidgets.QPushButton("OK")
        self.ok_button.setEnabled(False)
        buttons_layout.addWidget(self.ok_button)
        self.cancel_button = QtWidgets.QPushButton("Cancel")
        buttons_layout.addWidget(self.cancel_button)

        self.load_from_file_button.clicked.connect(self.on_load_from_file_clicked)
        self.ok_button.clicked.connect(self.accept)
        self.cancel_button.clicked.connect(self.reject)
        self.proof_edit.textChanged.connect(self.on_proof_text_changed)

    def on_load_from_file_clicked(self):
        proof_hex = self.load_from_file()
        if proof_hex:
            self.proof_edit.setText(proof_hex)

    def load_from_file(self) -> Optional[str]:
        fileName, __ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select the proof file",
            filter="Avalanche proof (*.proof);;All files (*)",
        )
        if not fileName:
            return
        with open(fileName, "r", encoding="utf-8") as f:
            proof_hex = f.read().strip()
        if self.try_to_decode_proof(proof_hex):
            self.accept()

    def on_proof_text_changed(self):
        self.try_to_decode_proof(self.proof_edit.toPlainText())
        self.ok_button.setEnabled(self.proof is not None)

    def try_to_decode_proof(self, proof_hex) -> bool:
        try:
            self.proof = Proof.from_hex(proof_hex)
        except DeserializationError:
            self.proof = None
        return self.proof is not None


class StakeDustThresholdMessageBox(QtWidgets.QMessageBox):
    """QMessageBox question dialog with custom buttons."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setIcon(QtWidgets.QMessageBox.Warning)
        self.setWindowTitle(_("Coins below the stake dust threshold"))
        self.setText(
            _(
                "The value of one or more coins is below the"
                f" {format_satoshis(PROOF_DUST_THRESHOLD)} XEC stake minimum threshold."
                " The generated proof will be invalid."
            )
        )

        self.setStandardButtons(QtWidgets.QMessageBox.Ok | QtWidgets.QMessageBox.Cancel)
        ok_button = self.button(QtWidgets.QMessageBox.Ok)
        ok_button.setText(_("Continue, I'm just testing"))

        self.cancel_button = self.button(QtWidgets.QMessageBox.Cancel)
        self.setEscapeButton(self.cancel_button)

    def has_cancelled(self) -> bool:
        return self.clickedButton() == self.cancel_button


def check_utxos(utxos: List[dict], parent: Optional[QtWidgets.QWidget] = None) -> bool:
    """Check utxos are usable for avalanche proofs.
    If they aren't, and the user has not acknowledged that he wants to build the
    proof anyway, return False.
    """
    if any(u["value"] < PROOF_DUST_THRESHOLD for u in utxos):
        warning_dialog = StakeDustThresholdMessageBox(parent)
        warning_dialog.exec_()
        if warning_dialog.has_cancelled():
            return False
    return True


class UtxosDialog(QtWidgets.QDialog):
    """A widget listing all coins in a wallet and allowing to load multiple coins"""

    def __init__(self, wallet: DeterministicWallet):
        super().__init__()
        self.setMinimumWidth(750)

        self.wallet = wallet
        self.utxos: List[dict] = []
        self.selected_rows: List[int] = []

        layout = QtWidgets.QVBoxLayout(self)
        self.setLayout(layout)

        self.utxos_table = QtWidgets.QTableWidget()
        layout.addWidget(self.utxos_table)
        self.utxos_table.setColumnCount(4)
        self.utxos_table.setHorizontalHeaderLabels(
            ["txid", "vout", "amount (sats)", "block height"]
        )
        self.utxos_table.verticalHeader().setVisible(False)
        self.utxos_table.setSelectionBehavior(QtWidgets.QTableWidget.SelectRows)
        self.utxos_table.setSelectionMode(QtWidgets.QTableWidget.ExtendedSelection)
        self.utxos_table.horizontalHeader().setSectionResizeMode(
            0, QtWidgets.QHeaderView.Stretch
        )
        layout.addWidget(self.utxos_table)
        self._fill_utxos_table()

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)

        self.load_button = QtWidgets.QPushButton("Load selected coins")
        self.load_button.setEnabled(False)
        buttons_layout.addWidget(self.load_button)

        self.cancel_button = QtWidgets.QPushButton("Cancel")
        buttons_layout.addWidget(self.cancel_button)

        self.load_button.clicked.connect(self.accept)
        self.cancel_button.clicked.connect(self.reject)

        self.utxos_table.itemSelectionChanged.connect(self._on_selection_changed)

    def _fill_utxos_table(self):
        self.utxos = [u for u in self.wallet.get_utxos() if u["height"] > 0]
        self.utxos.sort(key=lambda u: u["value"], reverse=True)

        tip = self.wallet.get_local_height()

        self.utxos_table.setRowCount(len(self.utxos))

        for row_index, utxo in enumerate(self.utxos):
            txid_item = QtWidgets.QTableWidgetItem(utxo["prevout_hash"])
            self.utxos_table.setItem(row_index, 0, txid_item)

            vout_item = QtWidgets.QTableWidgetItem(str(utxo["prevout_n"]))
            self.utxos_table.setItem(row_index, 1, vout_item)

            amount_item = QtWidgets.QTableWidgetItem(
                format_satoshis(utxo["value"], num_zeros=2)
            )
            amount_item.setTextAlignment(QtCore.Qt.AlignRight | QtCore.Qt.AlignVCenter)
            if utxo["value"] < PROOF_DUST_THRESHOLD:
                amount_item.setForeground(QtGui.QColor("red"))
                amount_item.setToolTip(
                    _(
                        "The minimum threshold for a coin in an avalanche proof is "
                        f"{format_satoshis(PROOF_DUST_THRESHOLD)} XEC."
                    )
                )
            self.utxos_table.setItem(row_index, 2, amount_item)

            height = utxo["height"]
            height_item = QtWidgets.QTableWidgetItem(str(height))
            utxo_validity_height = height + STAKE_UTXO_CONFIRMATIONS
            if utxo_validity_height > tip:
                height_item.setForeground(QtGui.QColor("orange"))
                height_item.setToolTip(
                    _(
                        f"UTXOs with less than {STAKE_UTXO_CONFIRMATIONS} "
                        "confirmations cannot be used as stake proofs."
                    )
                    + f"\nCurrent known block height is {tip}.\nYour proof will be "
                    f"valid after block {utxo_validity_height}."
                )
            self.utxos_table.setItem(row_index, 3, height_item)

    def _on_selection_changed(self):
        self.selected_rows = [
            idx.row() for idx in self.utxos_table.selectionModel().selectedRows()
        ]
        self.load_button.setEnabled(bool(self.selected_rows))

    def get_selected_utxos(self) -> List[dict]:
        return [self.utxos[r] for r in self.selected_rows]
