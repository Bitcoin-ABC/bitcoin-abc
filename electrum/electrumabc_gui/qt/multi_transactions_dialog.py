import json
from pathlib import Path
from typing import Sequence

from PyQt5 import QtGui, QtWidgets

from electrumabc import transaction
from electrumabc.bitcoin import sha256
from electrumabc.constants import XEC
from electrumabc.wallet import AbstractWallet

from .util import MessageBoxMixin


class MultiTransactionsWidget(QtWidgets.QWidget, MessageBoxMixin):
    """Display multiple transactions, with statistics and tools (sign, broadcast...)"""

    def __init__(self, wallet, main_window, parent=None):
        super().__init__(parent)
        self.setMinimumWidth(800)
        self.wallet: AbstractWallet = wallet
        self.transactions: Sequence[transaction.Transaction] = []
        self.main_window = main_window

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        self.num_tx_label = QtWidgets.QLabel()
        layout.addWidget(self.num_tx_label)
        self.in_value_label = QtWidgets.QLabel()
        layout.addWidget(self.in_value_label)
        self.out_value_label = QtWidgets.QLabel()
        layout.addWidget(self.out_value_label)
        self.fees_label = QtWidgets.QLabel()
        layout.addWidget(self.fees_label)
        self.reset_labels()

        self.transactions_table = QtWidgets.QTableWidget()
        self.transactions_table.setColumnCount(5)
        self.transactions_table.horizontalHeader().setSectionResizeMode(
            QtWidgets.QHeaderView.ResizeToContents
        )
        self.transactions_table.horizontalHeader().setStretchLastSection(True)
        self._horiz_header_labels = [
            "Inputs",
            "Outputs",
            "Output amount",
            "Fee",
            "Output addresses",
        ]
        layout.addWidget(self.transactions_table)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)

        self.save_button = QtWidgets.QPushButton("Save")
        buttons_layout.addWidget(self.save_button)
        self.sign_button = QtWidgets.QPushButton("Sign")
        buttons_layout.addWidget(self.sign_button)
        self.broadcast_button = QtWidgets.QPushButton("Broadcast")
        buttons_layout.addWidget(self.broadcast_button)
        self.disable_buttons()

        self.save_button.clicked.connect(self.on_save_clicked)
        self.sign_button.clicked.connect(self.on_sign_clicked)
        self.broadcast_button.clicked.connect(self.on_broadcast_clicked)

    def reset_labels(self):
        self.num_tx_label.setText("Number of transactions:")
        self.in_value_label.setText("Total input value:")
        self.out_value_label.setText("Total output value:")
        self.fees_label.setText("Total fees:")

    def disable_buttons(self):
        self.save_button.setEnabled(False)
        self.sign_button.setEnabled(False)
        self.broadcast_button.setEnabled(False)

    def set_displayed_number_of_transactions(self, num_tx: int):
        """This method can be called to set the number of transactions without
        actually setting the transactions. It cen be used to demonstrate that progress
        is being made while transactions are still being built."""
        self.num_tx_label.setText(f"Number of transactions: <b>{num_tx}</b>")

    def set_transactions(self, transactions: Sequence[transaction.Transaction]):
        """Enable buttons, compute and display some information about transactions."""
        self.transactions_table.clear()

        self.transactions = transactions

        can_sign = self.wallet.can_sign(transactions[0]) if transactions else False

        # Reset buttons when fresh unsigned transactions are set
        self.save_button.setText("Save")
        self.save_button.setEnabled(True)
        self.sign_button.setEnabled(can_sign)
        self.broadcast_button.setEnabled(self.are_transactions_complete())

        self.num_tx_label.setText(f"Number of transactions: <b>{len(transactions)}</b>")

        sats_per_unit = 10**XEC.decimals
        sum_in_value, sum_out_value, sum_fees = 0, 0, 0
        self.transactions_table.setRowCount(len(transactions))
        self.transactions_table.setHorizontalHeaderLabels(self._horiz_header_labels)
        has_missing_input_values = False
        for i, tx in enumerate(transactions):
            out_value = tx.output_value()
            sum_out_value += out_value
            try:
                in_value = tx.input_value()
            except transaction.InputValueMissing:
                has_missing_input_values = True
                fee_item = QtWidgets.QTableWidgetItem("N.A.")
                fee_item.setToolTip(
                    "Raw signed transactions don't specify input amounts"
                )
                # TODO: asynchronously fetch the input values from the network to
                #       update the item and labels without slowing down the user
            else:
                fee = in_value - out_value
                sum_in_value += in_value
                sum_fees += fee
                fee_item = QtWidgets.QTableWidgetItem(f"{fee / sats_per_unit:.2f}")

            self.transactions_table.setItem(
                i, 0, QtWidgets.QTableWidgetItem(f"{len(tx.inputs())}")
            )
            self.transactions_table.setItem(
                i, 1, QtWidgets.QTableWidgetItem(f"{len(tx.outputs())}")
            )
            self.transactions_table.setItem(
                i, 2, QtWidgets.QTableWidgetItem(f"{out_value / sats_per_unit:.2f}")
            )
            self.transactions_table.setItem(i, 3, fee_item)

            # Print the output addresses on colored background, with a color depending
            # on the hash of the output addresses. This helps with controlling that
            # all the outputs are the same, when needed.
            addresses_set = {addr.to_cashaddr() for (_, addr, _) in tx.outputs()}
            addresses_txt = ", ".join(sorted(addresses_set))
            color_item = QtWidgets.QTableWidgetItem(addresses_txt)
            color_item.setToolTip(addresses_txt)
            h = sha256(addresses_txt.encode("utf8"))
            color_item.setBackground(QtGui.QColor(h[0], h[1], h[2]))
            self.transactions_table.setItem(i, 4, color_item)

        self.out_value_label.setText(
            f"Total output value: <b>{sum_out_value / sats_per_unit} {XEC}</b>"
        )
        if not has_missing_input_values:
            self.in_value_label.setText(
                f"Total input value: <b>{sum_in_value / sats_per_unit} {XEC}</b>"
            )
            self.fees_label.setText(
                f"Total fees: <b>{sum_fees / sats_per_unit} {XEC}</b>"
            )
        else:
            self.in_value_label.setText("Total input value: N.A")
            self.fees_label.setText("Total fees: N.A")
            tooltip = "Some transactions don't specify input amounts"
            self.in_value_label.setToolTip(tooltip)
            self.fees_label.setToolTip(tooltip)

    def on_save_clicked(self):
        directory = QtWidgets.QFileDialog.getExistingDirectory(
            self, "Select output directory for transaction files", str(Path.home())
        )
        if not directory:
            return
        for i, tx in enumerate(self.transactions):
            name = (
                f"signed_{i:03d}.txn" if tx.is_complete() else f"unsigned_{i:03d}.txn"
            )
            path = Path(directory) / name

            tx_dict = tx.as_dict()
            with open(path, "w+", encoding="utf-8") as f:
                f.write(json.dumps(tx_dict, indent=4) + "\n")
        QtWidgets.QMessageBox.information(
            self, "Done saving", f"Saved {len(self.transactions)} files to {directory}"
        )

    def on_sign_clicked(self):
        password = None
        if self.wallet.has_password():
            password = self.main_window.password_dialog(
                "Enter your password to proceed"
            )
            if not password:
                return

        for tx in self.transactions:
            self.wallet.sign_transaction(tx, password, use_cache=True)

        QtWidgets.QMessageBox.information(
            self,
            "Done signing",
            f"Signed {len(self.transactions)} transactions. Remember to save them!",
        )
        self.broadcast_button.setEnabled(self.are_transactions_complete())
        self.save_button.setText("Save (signed)")

    def are_transactions_complete(self) -> bool:
        if not self.transactions:
            return False
        # FIXME: for now it is assumed that all loaded transactions have the same
        #        status (signed or unsigned). Checking for completeness is currently
        #        too slow to be done on many large transactions.
        return self.transactions[0].is_complete()

    def on_broadcast_clicked(self):
        self.main_window.push_top_level_window(self)
        try:
            for tx in self.transactions:
                self.main_window.broadcast_transaction(tx, None)
        finally:
            self.main_window.pop_top_level_window(self)
        QtWidgets.QMessageBox.information(
            self,
            "Done broadcasting",
            f"Broadcasted {len(self.transactions)} transactions.",
        )


class MultiTransactionsDialog(QtWidgets.QDialog):
    """This dialog is just a minimalistic wrapper for the widget. It does not implement
    any logic."""

    def __init__(self, wallet, main_window, parent=None):
        super().__init__(parent)
        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        self.widget = MultiTransactionsWidget(wallet, main_window, self)
        layout.addWidget(self.widget)

        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)

        close_button = QtWidgets.QPushButton("Close")
        buttons_layout.addWidget(close_button)

        close_button.clicked.connect(self.accept)
