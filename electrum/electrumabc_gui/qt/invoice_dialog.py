#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2022 The Electrum ABC developers
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

import json
from decimal import Decimal
from http.client import InvalidURL
from typing import TYPE_CHECKING, List, Optional, Union
from urllib.error import URLError

from PyQt5 import QtCore, QtWidgets

from electrumabc.address import Address, AddressError
from electrumabc.i18n import _
from electrumabc.invoice import (
    APIS,
    ExchangeRateApi,
    FixedExchangeRate,
    Invoice,
    InvoiceDataError,
    MultiCurrencyExchangeRateApi,
)

if TYPE_CHECKING:
    from electrumabc.exchange_rate import FxThread


class InvoiceDialog(QtWidgets.QDialog):
    def __init__(
        self, parent: Optional[QtWidgets.QWidget] = None, fx: Optional[FxThread] = None
    ):
        super().__init__(parent)
        self.setMinimumWidth(650)
        self.setMinimumHeight(750)
        self.setWindowTitle(_("Create or modify an invoice"))

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        addresses_sublayout = QtWidgets.QHBoxLayout()

        self.payee_address_edit = PostalAddressWidget("Company/payee address")
        addresses_sublayout.addWidget(self.payee_address_edit)

        self.payer_address_edit = PostalAddressWidget("Customer/payer address")
        addresses_sublayout.addWidget(self.payer_address_edit)

        layout.addLayout(addresses_sublayout)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel(_("Payment address")))
        self.address_edit = QtWidgets.QLineEdit()
        layout.addWidget(self.address_edit)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel(_("Invoice ID")))
        self.id_edit = QtWidgets.QLineEdit()
        self.id_edit.setToolTip(
            _(
                "Invoice identifier or invoice number. This should be a unique"
                " identifier, preferably a string without white-spaces or exotic"
                " unicode characters."
            )
        )
        layout.addWidget(self.id_edit, alignment=QtCore.Qt.AlignLeft)
        layout.addSpacing(10)

        layout.addWidget(QtWidgets.QLabel(_("Label")))
        self.label_edit = QtWidgets.QLineEdit()
        layout.addWidget(self.label_edit)
        layout.addSpacing(10)

        self.amount_currency_edit = AmountCurrencyEdit(fx=fx)
        layout.addWidget(self.amount_currency_edit)
        layout.addSpacing(10)

        self.exchange_rate_widget = ExchangeRateWidget()
        layout.addWidget(self.exchange_rate_widget)
        layout.addSpacing(10)

        layout.addStretch(1)
        buttons_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(buttons_layout)

        self.save_button = QtWidgets.QPushButton(_("Save invoice"))
        buttons_layout.addWidget(self.save_button)
        self.load_button = QtWidgets.QPushButton(_("Load invoice"))
        buttons_layout.addWidget(self.load_button)

        # Trigger callback to init widgets
        self._on_currency_changed(self.amount_currency_edit.get_currency())

        # signals
        self.amount_currency_edit.currencyChanged.connect(self._on_currency_changed)
        self.save_button.clicked.connect(self._on_save_clicked)
        self.load_button.clicked.connect(self.open_file_and_load_invoice)

    def _on_currency_changed(self, currency: str):
        self.exchange_rate_widget.setVisible(currency.lower() != "xec")
        self.exchange_rate_widget.set_currency(currency)

    def _on_save_clicked(self):
        invoice_id = self.id_edit.text().strip().replace(" ", "_")
        default_filename = (invoice_id + "-") if invoice_id else ""
        default_filename += str(self.amount_currency_edit.get_amount())
        default_filename += self.amount_currency_edit.get_currency()
        ecashaddr = self.get_payment_address()
        if ecashaddr is not None:
            # checksum
            default_filename += "-" + ecashaddr.to_cashaddr()[-8:]
        default_filename += ".json"

        filename, _selected_filter = QtWidgets.QFileDialog.getSaveFileName(
            self,
            _("Save invoice to file"),
            default_filename,
            filter="JSON file (*.json);;All files (*)",
        )

        if not filename:
            return

        invoice = self.get_invoice()
        if invoice is None:
            return

        with open(filename, "w") as f:
            json.dump(invoice.to_dict(), f, indent=4)
            # hide dialog after saving
            self.accept()

    def get_payment_address(self) -> Optional[Address]:
        address_string = self.address_edit.text().strip()
        if not address_string:
            return None
        try:
            return Address.from_string(self.address_edit.text().strip())
        except AddressError:
            QtWidgets.QMessageBox.critical(
                self,
                _("Invalid payment address"),
                _("Unable to decode payement address"),
            )
            return None

    def get_invoice(self) -> Optional[Invoice]:
        payment_address = self.get_payment_address()
        if payment_address is None:
            return None

        currency = self.amount_currency_edit.get_currency()
        if currency.lower() == "xec":
            rate = None
        else:
            rate = self.exchange_rate_widget.get_rate()

        return Invoice(
            address=payment_address,
            amount=self.amount_currency_edit.get_amount(),
            id_=self.id_edit.text().strip(),
            label=self.label_edit.text(),
            currency=currency,
            exchange_rate=rate,
            payee_address=self.payee_address_edit.get_text(),
            payer_address=self.payer_address_edit.get_text(),
        )

    def open_file_and_load_invoice(self):
        filename, _selected_filter = QtWidgets.QFileDialog.getOpenFileName(
            self,
            _("Load invoice from file"),
            filter="JSON file (*.json);;All files (*)",
        )

        if not filename:
            return

        self.load_from_file(filename)

    def load_from_file(self, filename: str):
        invoice = load_invoice_from_file_and_show_error_message(filename, parent=self)
        if invoice is None:
            return

        self.address_edit.setText(invoice.address.to_ui_string())
        self.id_edit.setText(invoice.id)
        self.label_edit.setText(invoice.label)
        self.amount_currency_edit.set_amount(invoice.amount)
        self.amount_currency_edit.set_currency(invoice.currency)
        if invoice.exchange_rate is not None:
            self.exchange_rate_widget.set_rate(invoice.exchange_rate)
        else:
            self.exchange_rate_widget.clear()
        self.payee_address_edit.set_text(invoice.payee_address)
        self.payer_address_edit.set_text(invoice.payer_address)

    def set_address(self, address: Address):
        self.address_edit.setText(address.to_ui_string())


class AmountCurrencyEdit(QtWidgets.QWidget):
    currencyChanged = QtCore.pyqtSignal(str)

    def __init__(
        self, parent: Optional[QtWidgets.QWidget] = None, fx: Optional[FxThread] = None
    ):
        super().__init__(parent)

        self.fx = fx

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)
        layout.setContentsMargins(0, 0, 0, 0)

        layout.addWidget(QtWidgets.QLabel(_("Amount")))
        amount_layout = QtWidgets.QHBoxLayout()
        self.amount_edit = QtWidgets.QDoubleSpinBox()
        self.amount_edit.setStepType(QtWidgets.QAbstractSpinBox.AdaptiveDecimalStepType)
        self.amount_edit.setDecimals(2)
        self.amount_edit.setRange(0, 10**100)
        amount_layout.addWidget(self.amount_edit)

        self.currency_edit = QtWidgets.QComboBox()
        self.currency_edit.addItems(["XEC", "USD", "EUR"])
        self.currency_edit.setCurrentText("XEC")
        self.currency_edit.setEditable(True)
        amount_layout.addWidget(self.currency_edit)

        self.fiat_amount_label = QtWidgets.QLabel()
        amount_layout.addWidget(self.fiat_amount_label)
        layout.addLayout(amount_layout)

        self.amount_edit.valueChanged.connect(self._on_amount_changed)
        self.currency_edit.currentTextChanged.connect(self.currencyChanged.emit)
        self.currencyChanged.connect(self._on_currency_changed)

    def get_currency(self) -> str:
        return self.currency_edit.currentText()

    def set_currency(self, currency: str):
        return self.currency_edit.setCurrentText(currency)

    def get_amount(self) -> Decimal:
        return Decimal(f"{self.amount_edit.value():.2f}")

    def set_amount(self, amount: Decimal):
        return self.amount_edit.setValue(float(amount))

    def _on_currency_changed(self, cur: str):
        self.fiat_amount_label.setVisible(cur.lower() == "xec" and self.fx is not None)
        self._on_amount_changed(self.amount_edit.value())

    def _on_amount_changed(self, value: float):
        if self.fx is None or self.get_currency().lower() != "xec":
            return

        fiat_cur = self.fx.get_currency()
        fiat_amount = self.fx.ccy_amount_str(
            Decimal(value) * self.fx.exchange_rate(), False
        )
        self.fiat_amount_label.setText(f"{fiat_amount} {fiat_cur}")


class ExchangeRateWidget(QtWidgets.QWidget):
    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)
        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)
        layout.setContentsMargins(0, 0, 0, 0)

        layout.addWidget(QtWidgets.QLabel(_("Exchange rate")))
        fixed_rate_layout = QtWidgets.QHBoxLayout()
        layout.addLayout(fixed_rate_layout)
        self.fixed_rate_rb = QtWidgets.QRadioButton(_("Fixed rate"))
        fixed_rate_layout.addWidget(self.fixed_rate_rb)
        self.rate_edit = QtWidgets.QDoubleSpinBox()
        self.rate_edit.setDecimals(10)
        self.rate_edit.setRange(10**-8, 10**100)
        self.rate_edit.setStepType(QtWidgets.QAbstractSpinBox.AdaptiveDecimalStepType)
        fixed_rate_layout.addWidget(self.rate_edit)

        api_rate_layout = QtWidgets.QVBoxLayout()
        layout.addLayout(api_rate_layout)
        self.api_rate_rb = QtWidgets.QRadioButton(_("Fetch rate at payment time"))
        api_rate_layout.addWidget(self.api_rate_rb)

        self.api_widget = ExchangeRateAPIWidget()
        margins = self.api_widget.contentsMargins()
        margins.setLeft(margins.left() + 10)
        self.api_widget.setContentsMargins(margins)

        api_rate_layout.addWidget(self.api_widget)

        # Signals
        self.api_rate_rb.toggled.connect(self._on_api_rate_clicked)

        # Use an exclusive button group to disallow unckecking the check radio button
        self._button_group = QtWidgets.QButtonGroup()
        self._button_group.setExclusive(True)
        self._button_group.addButton(self.fixed_rate_rb)
        self._button_group.addButton(self.api_rate_rb)

        # Default state
        self.clear()

    def set_currency(self, currency: str):
        self.fixed_rate_rb.setText(_("Fixed rate ") + f"({currency}/XEC)")
        self.api_widget.set_currency(currency)

    def _on_api_rate_clicked(self, is_checked: bool):
        self.api_widget.setVisible(is_checked)

    def is_fixed_rate(self) -> bool:
        return self.fixed_rate_rb.isChecked()

    def get_rate(self) -> Union[FixedExchangeRate, ExchangeRateApi]:
        if self.is_fixed_rate():
            return FixedExchangeRate(Decimal(f"{self.rate_edit.value():.10f}"))
        return ExchangeRateApi(self.api_widget.get_url(), self.api_widget.get_keys())

    def set_rate(self, exchange_rate: Union[FixedExchangeRate, ExchangeRateApi]):
        if isinstance(exchange_rate, FixedExchangeRate):
            self.fixed_rate_rb.setChecked(True)
            self.rate_edit.setValue(float(exchange_rate.rate))
        elif isinstance(exchange_rate, ExchangeRateApi):
            self.api_rate_rb.setChecked(True)
            self.api_widget.set_url(exchange_rate.url)
            self.api_widget.set_keys(exchange_rate.keys)

    def clear(self):
        self.api_widget.clear()
        self.api_widget.setVisible(False)
        self.fixed_rate_rb.setChecked(True)
        self.rate_edit.setValue(1.0)


class ExchangeRateAPIWidget(QtWidgets.QWidget):
    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)

        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        layout.addWidget(QtWidgets.QLabel(_("Request URL")))
        self.request_url_edit = QtWidgets.QComboBox()
        self.request_url_edit.setEditable(True)
        layout.addWidget(self.request_url_edit)

        layout.addWidget(QtWidgets.QLabel(_("Keys")))
        self.keys_edit = QtWidgets.QLineEdit()
        self.keys_edit.setToolTip(
            _(
                "Comma separated list of JSON keys used to find the exchange rate in"
                " the data sent by the API."
            )
        )
        layout.addWidget(self.keys_edit)

        self.test_api_button = QtWidgets.QPushButton(_("Test API"))
        layout.addWidget(self.test_api_button, alignment=QtCore.Qt.AlignLeft)

        # signals
        self.request_url_edit.currentIndexChanged.connect(self._on_api_url_selected)
        self.test_api_button.clicked.connect(self._on_test_api_clicked)

        # Default state
        self._currency: str = ""
        self.clear()

    def set_currency(self, currency: str):
        self._currency = currency
        # Update currency part of preset URLs while remembering selection
        index = self.request_url_edit.currentIndex()
        self.request_url_edit.clear()
        for api in APIS:
            self.request_url_edit.addItem(api.get_url(currency))
        self.request_url_edit.setCurrentIndex(index)

    def _on_api_url_selected(self, index: int):
        if index < 0:
            self.keys_edit.clear()
            return
        self.keys_edit.setText(", ".join(APIS[index].get_keys(self._currency)))

    def get_url(self) -> str:
        return self.request_url_edit.currentText()

    def set_url(self, url: str):
        return self.request_url_edit.setCurrentText(url)

    def get_keys(self) -> List[str]:
        return [k.strip() for k in self.keys_edit.text().split(",")]

    def set_keys(self, keys: List[str]):
        return self.keys_edit.setText(", ".join(keys))

    def _on_test_api_clicked(self):
        api = MultiCurrencyExchangeRateApi(self.get_url(), self.get_keys())
        try:
            rate = api.get_exchange_rate(self._currency)
        except (
            # Wrong currency, currency key not available for this API
            KeyError,
            # urllib raises ValueError on unrecognized url types
            ValueError,
            URLError,
            InvalidURL,
        ) as e:
            QtWidgets.QMessageBox.critical(
                self,
                "Error fetching exchange rate",
                (
                    f"Unable to fetch the XEC/{self._currency} exchange rate using the "
                    "specified API parameters.\n\nThe error message was:\n\n"
                    f"{type(e).__name__}: {e}"
                ),
            )
            return

        QtWidgets.QMessageBox.information(
            self,
            "Exchange rate",
            f"The XEC/{self._currency} exchange rate is {rate:.10f}",
        )

    def clear(self):
        self.set_currency("USD")
        self.request_url_edit.setCurrentIndex(0)


class PostalAddressWidget(QtWidgets.QWidget):
    """A simple widget for entering the company address or the customer address."""

    def __init__(
        self, label="Customer address", parent: Optional[QtWidgets.QWidget] = None
    ):
        super().__init__(parent)
        self.setFixedHeight(150)

        layout = QtWidgets.QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        self.setLayout(layout)

        layout.addWidget(QtWidgets.QLabel(label))

        self.address_text_edit = QtWidgets.QTextEdit()
        self.address_text_edit.setAcceptRichText(False)
        self.address_text_edit.setLineWrapMode(QtWidgets.QTextEdit.NoWrap)
        layout.addWidget(self.address_text_edit)

    def get_text(self) -> str:
        return self.address_text_edit.toPlainText()

    def set_text(self, text: str):
        return self.address_text_edit.setPlainText(text)


def load_invoice_from_file_and_show_error_message(
    filename: str,
    parent: Optional[QtWidgets.QWidget],
) -> Optional[Invoice]:
    try:
        invoice = Invoice.from_file(filename)
    except (json.JSONDecodeError, InvoiceDataError) as e:
        QtWidgets.QMessageBox.critical(
            parent,
            _("Failed to load invoice"),
            _("Unable to decode JSON data for invoice")
            + f" {filename}.\n\n"
            + _("The following error was raised:\n\n")
            + f"{type(e).__name__}: {e}",
        )
        return
    return invoice
