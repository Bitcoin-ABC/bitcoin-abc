#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2015 Thomas Voegtlin
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
from dataclasses import dataclass
from enum import IntEnum
from functools import wraps
from typing import TYPE_CHECKING, Dict, List, Optional, Tuple

from qtpy import QtWidgets
from qtpy.QtCore import QPoint, Qt, Signal
from qtpy.QtGui import QColor, QFont

from electrumabc.address import Address
from electrumabc.bitcoin import COINBASE_MATURITY
from electrumabc.i18n import _
from electrumabc.plugins import run_hook
from electrumabc.util import format_satoshis
from electrumabc.wallet import ImportedAddressWallet, ImportedPrivkeyWallet

from .avalanche.proof_editor import AvaProofDialog
from .consolidate_coins_dialog import ConsolidateCoinsWizard
from .tree_widget import MyTreeWidget
from .util import MONOSPACE_FONT, ColorScheme, SortableTreeWidgetItem, rate_limited

if TYPE_CHECKING:
    from .main_window import ElectrumWindow


@dataclass
class CoinDisplayData:
    txid: str
    vout: int
    address: Address
    slp_token: Optional[Tuple[str, int]]
    is_alp_token: bool
    is_frozen: bool
    is_address_frozen: bool
    is_immature: bool

    def get_name(self) -> str:
        return self.txid + f":{self.vout}"

    def get_name_short(self) -> str:
        return self.txid[:10] + "..." + f":{self.vout}"

    def is_token(self) -> bool:
        return self.slp_token is not None or self.is_alp_token

    def is_spendable(self) -> bool:
        return (
            not self.is_frozen and not self.is_address_frozen and not self.is_immature
        )


class UTXOList(MyTreeWidget):
    class Col(IntEnum):
        """Column numbers. This is to make code in on_update easier to read.
        If you modify these, make sure to modify the column header names in
        the MyTreeWidget constructor."""

        address = 0
        label = 1
        amount = 2
        height = 3
        output_point = 4

    filter_columns = [Col.address, Col.label]
    # sort by amount, descending
    default_sort = MyTreeWidget.SortSpec(Col.amount, Qt.DescendingOrder)

    selected_amount_changed = Signal("quint64")
    selection_cleared = Signal()

    def __init__(self, main_window: ElectrumWindow):
        columns = [
            _("Address"),
            _("Label"),
            _("Amount"),
            _("Height"),
            _("Output point"),
        ]
        MyTreeWidget.__init__(
            self,
            columns,
            config=main_window.config,
            wallet=main_window.wallet,
            stretch_column=UTXOList.Col.label,
            deferred_updates=True,
            save_sort_settings=True,
        )
        self.setSelectionMode(QtWidgets.QAbstractItemView.ExtendedSelection)
        self.setSortingEnabled(True)
        self.main_window = main_window
        self.customContextMenuRequested.connect(self.create_menu)
        self.utxos = []
        # cache some values to avoid constructing Qt objects for every pass through self.on_update (this is important for large wallets)
        self.monospaceFont = QFont(MONOSPACE_FONT)
        self.lightBlue = (
            QColor("lightblue") if not ColorScheme.dark_scheme else QColor("blue")
        )
        self.blue = ColorScheme.BLUE.as_color(True)
        self.cyanBlue = QColor("#3399ff")
        self.tokenBG = ColorScheme.SLPGREEN.as_color(True)
        self.immatureColor = ColorScheme.BLUE.as_color(False)
        self.output_point_prefix_text = columns[self.Col.output_point]

        self.selectionModel().selectionChanged.connect(self._emit_selection_signals)

        self.cleaned_up = False

    def clean_up(self):
        self.cleaned_up = True

    def if_not_dead(func):
        """Boilerplate: Check if cleaned up, and if so, don't execute method"""

        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if self.cleaned_up or not self.wallet or not self.main_window:
                return
            else:
                func(self, *args, **kwargs)

        return wrapper

    def get_name(self, x):
        return x.get("prevout_hash") + f':{x.get("prevout_n")}'

    def get_name_short(self, x):
        return x.get("prevout_hash")[:10] + "..." + f':{x.get("prevout_n")}'

    @rate_limited(1.0, ts_after=True)
    def update(self):
        if self.cleaned_up:
            # short-cut return if window was closed and wallet is stopped
            return
        super().update()

    @if_not_dead
    def on_update(self):
        local_maturity_height = (self.wallet.get_local_height() + 1) - COINBASE_MATURITY
        # cache previous selection, if any
        prev_selection = self.get_selected()
        self.clear()
        self.utxos = self.wallet.get_utxos(exclude_tokens=False)
        for x in self.utxos:
            address = x["address"]
            address_text = address.to_ui_string()
            tool_tip0 = None

            height = x["height"]
            is_immature = x["coinbase"] and height > local_maturity_height
            # Store all needed coin data in item
            coin = CoinDisplayData(
                x.get("prevout_hash"),
                x.get("prevout_n"),
                address,
                x["slp_token"],
                x["is_alp_token"],
                x["is_frozen_coin"],
                self.wallet.is_frozen(address),
                is_immature,
            )

            label = self.wallet.get_label(x["prevout_hash"])
            amount = format_satoshis(
                x["value"],
                int(self.config.get("num_zeros", 2)),
                self.config.get("decimal_point", 2),
                whitespaces=True,
            )
            utxo_item = SortableTreeWidgetItem(
                [address_text, label, amount, str(height), coin.get_name_short()]
            )
            if label:
                # just in case it doesn't fit horizontally, we also provide it as a tool tip
                utxo_item.setToolTip(1, label)
            if tool_tip0:
                utxo_item.setToolTip(0, tool_tip0)
            # set this here to avoid sorting based on Qt.UserRole+1
            utxo_item.DataRole = Qt.UserRole + 100
            utxo_item.setFont(0, self.monospaceFont)
            utxo_item.setFont(2, self.monospaceFont)
            utxo_item.setFont(4, self.monospaceFont)
            toolTipMisc = ""
            utxo_item.setData(0, Qt.UserRole, coin)
            # just in case they like to see lots of hex digits :)
            utxo_item.setToolTip(4, coin.get_name())
            if coin.is_immature:
                for colNum in range(self.columnCount()):
                    if colNum == self.Col.label:
                        # don't color the label column
                        continue
                    utxo_item.setForeground(colNum, self.immatureColor)
                toolTipMisc = _("Coin is not yet mature")
            elif coin.slp_token is not None or coin.is_alp_token:
                utxo_item.setBackground(0, self.tokenBG)
                toolTipMisc = _("Coin may contain a token")
            elif coin.is_address_frozen and not coin.is_frozen:
                # emulate the "Look" off the address_list .py's frozen entry
                utxo_item.setBackground(0, self.lightBlue)
                toolTipMisc = _("Address is frozen")
            elif coin.is_frozen and not coin.is_address_frozen:
                utxo_item.setBackground(0, self.blue)
                toolTipMisc = _("Coin is frozen")
            elif coin.is_frozen and coin.is_address_frozen:
                utxo_item.setBackground(0, self.lightBlue)
                utxo_item.setForeground(0, self.cyanBlue)
                toolTipMisc = _("Coin & Address are frozen")
            if toolTipMisc:
                utxo_item.setToolTip(0, toolTipMisc)
            run_hook("utxo_list_item_setup", self, utxo_item, x, coin.get_name())
            self.addChild(utxo_item)
            if coin.get_name() in prev_selection:
                # NB: This needs to be here after the item is added to the widget. See #979.
                utxo_item.setSelected(True)  # restore previous selection
        self._update_utxo_count_display(len(self.utxos))

    def _update_utxo_count_display(self, num_utxos: int):
        headerItem = self.headerItem()
        if headerItem:
            if num_utxos:
                output_point_text = self.output_point_prefix_text + f" ({num_utxos})"
            else:
                output_point_text = self.output_point_prefix_text
            headerItem.setText(self.Col.output_point, output_point_text)

    def get_selected(self) -> List[CoinDisplayData]:
        """Return a dict of selected coins.
        Keys are outpoints ("txid:n") and values are a combination of the freeze state
        of the coin:

            - "a" for a frozen address
            - "c" for a frozen coin
            - "s" for a SLP token
            - "i" for immature coins
        """
        return [x.data(0, Qt.UserRole) for x in self.selectedItems()]

    def get_utxos_by_names(self, selected_names: List[str]) -> List[Dict]:
        return list(filter(lambda x: self.get_name(x) in selected_names, self.utxos))

    @if_not_dead
    def create_menu(self, position):
        menu = QtWidgets.QMenu()
        selected_coins = self.get_selected()

        self.create_menu_inner(menu, selected_coins, position)

        run_hook("utxo_list_context_menu_setup", self, menu, selected_coins)

        menu.exec_(self.viewport().mapToGlobal(position))

    def create_menu_inner(
        self,
        menu: QtWidgets.QMenu,
        selected_coins: List[CoinDisplayData],
        position: QPoint,
    ):
        if not selected_coins:
            return
        utxos = self.get_utxos_by_names([coin.get_name() for coin in selected_coins])
        if not utxos:
            return
        spendable_coins = self.get_utxos_by_names(
            [coin.get_name() for coin in selected_coins if coin.is_spendable()]
        )

        def warn_if_tokens_and_spend():
            if any(coin.is_token() for coin in selected_coins):
                warning_dialog = TokenBurnMessageBox(self)
                warning_dialog.exec_()
                if warning_dialog.has_cancelled():
                    return
            self.main_window.spend_coins(spendable_coins)

        # Unconditionally add the "Spend" option but leave it disabled if there are no spendable_coins
        spend_action = menu.addAction(_("Spend"), warn_if_tokens_and_spend)
        spend_action.setEnabled(bool(spendable_coins))
        menu.addAction(_("Export coin details"), lambda: self.dump_utxo(utxos))
        avaproof_action = menu.addAction(
            _("Build avalanche proof"), lambda: self.build_avaproof(utxos)
        )
        if not self.wallet.is_stake_signature_possible():
            avaproof_action.setEnabled(False)
            avaproof_action.setToolTip(
                _(
                    "Cannot build avalanche proof or delegation for some hardware, "
                    "multisig or watch-only wallet (Schnorr signature is required)."
                )
            )
        elif any(c["height"] <= 0 for c in utxos):
            # A block height is required when serializing a stake.
            avaproof_action.setEnabled(False)
            avaproof_action.setToolTip(
                _("Cannot build avalanche proof with unconfirmed coins")
            )

        if len(selected_coins) == 1:
            # "Copy ..."
            item = self.itemAt(position)
            if not item:
                return

            col = self.currentColumn()
            column_title = self.headerItem().text(col)
            alt_column_title, alt_copy_text = None, None
            coin: CoinDisplayData = item.data(0, Qt.UserRole)
            if col == self.Col.output_point:
                copy_text = coin.get_name()
            elif col == self.Col.address:
                # Determine the "alt copy text" "Legacy Address" or "Cash Address"
                copy_text = coin.address.to_ui_string()
                if Address.FMT_UI == Address.FMT_LEGACY:
                    alt_copy_text, alt_column_title = coin.address.to_full_string(
                        Address.FMT_CASHADDR
                    ), _("Cash Address")
                else:
                    alt_copy_text, alt_column_title = coin.address.to_full_string(
                        Address.FMT_LEGACY
                    ), _("Legacy Address")
            else:
                copy_text = item.text(col)
            if copy_text:
                copy_text = copy_text.strip()
            menu.addAction(
                _("Copy {}").format(column_title),
                lambda: QtWidgets.QApplication.instance()
                .clipboard()
                .setText(copy_text),
            )
            if alt_copy_text and alt_column_title:
                menu.addAction(
                    _("Copy {}").format(alt_column_title),
                    lambda: QtWidgets.QApplication.instance()
                    .clipboard()
                    .setText(alt_copy_text),
                )

            # single selection, offer them the "Details" option and also
            # coin/address "freeze" status, if any
            tx = self.wallet.transactions.get(coin.txid)
            if tx:
                label = self.wallet.get_label(coin.txid) or None
                menu.addAction(
                    _("Details"),
                    lambda: self.main_window.show_transaction(tx, label),
                )
            needsep = True
            if coin.is_frozen:
                menu.addSeparator()
                menu.addAction(_("Coin is frozen"), lambda: None).setEnabled(False)
                menu.addAction(
                    _("Unfreeze Coin"),
                    lambda: self.set_frozen_coins([coin.get_name()], False),
                )
                menu.addSeparator()
                needsep = False
            else:
                menu.addAction(
                    _("Freeze Coin"),
                    lambda: self.set_frozen_coins([coin.get_name()], True),
                )
            if coin.is_address_frozen:
                if needsep:
                    menu.addSeparator()
                menu.addAction(_("Address is frozen"), lambda: None).setEnabled(False)
                menu.addAction(
                    _("Unfreeze Address"),
                    lambda: self.set_frozen_addresses_for_coins(
                        [coin.get_name()], False
                    ),
                )
            else:
                menu.addAction(
                    _("Freeze Address"),
                    lambda: self.set_frozen_addresses_for_coins(
                        [coin.get_name()], True
                    ),
                )
            if not spend_action.isEnabled():
                if coin.is_immature:
                    spend_action.setText(_("Immature Coinbase: Spend Locked"))
                else:
                    spend_action.setText(_("Unfreeze coin or address to spend"))
            menu.addAction(
                "Consolidate coins for address",
                lambda: self._open_consolidate_coins_dialog(coin.address),
            )

        else:
            # multi-selection
            menu.addSeparator()
            selected_outpoints = [coin.get_name() for coin in selected_coins]
            if any(not coin.is_frozen for coin in selected_coins):
                # they have some coin-level non-frozen in the selection, so add the
                # menu action "Freeze coins"
                menu.addAction(
                    _("Freeze Coins"),
                    lambda: self.set_frozen_coins(selected_outpoints, True),
                )
            if any(coin.is_frozen for coin in selected_coins):
                # they have some coin-level frozen in the selection, so add the
                # menu action "Unfreeze coins"
                menu.addAction(
                    _("Unfreeze Coins"),
                    lambda: self.set_frozen_coins(selected_outpoints, False),
                )
            if any(not coin.is_address_frozen for coin in selected_coins):
                # they have some address-level non-frozen in the selection, so add
                # the menu action "Freeze addresses"
                menu.addAction(
                    _("Freeze Addresses"),
                    lambda: self.set_frozen_addresses_for_coins(
                        selected_outpoints, True
                    ),
                )
            if any(coin.is_address_frozen for coin in selected_coins):
                # they have some address-level frozen in the selection, so add the
                # menu action "Unfreeze addresses"
                menu.addAction(
                    _("Unfreeze Addresses"),
                    lambda: self.set_frozen_addresses_for_coins(
                        selected_outpoints, False
                    ),
                )

    def on_permit_edit(self, item, column):
        # disable editing fields in this tab (labels)
        return False

    @if_not_dead
    def set_frozen_coins(self, coins, b):
        self.main_window.set_frozen_coin_state(coins, b)

    @if_not_dead
    def set_frozen_addresses_for_coins(self, coins, b):
        addrs = set()
        for utxo in self.utxos:
            name = self.get_name(utxo)
            if name in coins:
                addrs.add(utxo["address"])
        if addrs:
            self.main_window.set_frozen_state(list(addrs), b)

    @if_not_dead
    def update_labels(self):
        if self.should_defer_update_incr():
            return
        root = self.invisibleRootItem()
        child_count = root.childCount()
        for i in range(child_count):
            item = root.child(i)
            coin = item.data(0, Qt.UserRole)
            label = self.wallet.get_label(coin.txid)
            item.setText(1, label)

    def dump_utxo(self, utxos: List[dict]):
        """Dump utxo to a file"""
        if not len(utxos):
            return

        # serialize the Address and add the address index
        utxos_for_json = []
        for utxo in utxos:
            utxo_for_json = utxo.copy()
            addr = utxo["address"]
            utxo_for_json["address"] = addr.to_full_string(Address.FMT_CASHADDR)

            wallet_types_without_index = (ImportedAddressWallet, ImportedPrivkeyWallet)
            if not isinstance(self.wallet, wallet_types_without_index):
                utxo_for_json["address_index"] = self.wallet.get_address_index(addr)
            utxos_for_json.append(utxo_for_json)

        fileName, _filter = QtWidgets.QFileDialog.getSaveFileName(
            self, "Save UTXOs to file", filter="JSON files (*.json);;All files (*)"
        )
        if not fileName:
            return
        if not fileName.endswith(".json") and not fileName.endswith(".JSON"):
            fileName += ".json"
        with open(fileName, "w", encoding="utf-8") as outfile:
            json.dump(utxos_for_json, outfile)

    def _open_consolidate_coins_dialog(self, addr):
        d = ConsolidateCoinsWizard(addr, self.wallet, self.main_window, parent=self)
        d.exec_()

    def build_avaproof(self, utxos: List[dict]):
        """Open a dialog to generate an Avalanche proof using the coins as
        stakes.
        """
        dialog = AvaProofDialog(
            wallet=self.wallet,
            receive_address=self.main_window.receive_address,
            parent=self,
        )
        if dialog.add_utxos(utxos):
            dialog.show()

    def _emit_selection_signals(self, *args, **kwargs):
        utxos = self.get_utxos_by_names(
            [coin.get_name() for coin in self.get_selected()]
        )
        self.selected_amount_changed.emit(sum(utxo["value"] for utxo in utxos))
        if not utxos:
            self.selection_cleared.emit()

    def hideEvent(self, e):
        super().hideEvent(e)
        self.selection_cleared.emit()

    def showEvent(self, e):
        super().showEvent(e)
        self._emit_selection_signals()


class TokenBurnMessageBox(QtWidgets.QMessageBox):
    """QMessageBox question dialog with custom buttons."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setIcon(QtWidgets.QMessageBox.Warning)
        self.setWindowTitle(_("Tokens may be lost"))
        self.setText(
            _(
                "It looks like one of the selected coins may contain tokens. This "
                "wallet does not support spending tokens, so any attached token will "
                "be burned if you proceed. Click Cancel if you are not sure."
            )
        )

        self.setStandardButtons(QtWidgets.QMessageBox.Ok | QtWidgets.QMessageBox.Cancel)
        ok_button = self.button(QtWidgets.QMessageBox.Ok)
        ok_button.setText(_("I understand the risks"))

        self.cancel_button = self.button(QtWidgets.QMessageBox.Cancel)
        self.setEscapeButton(self.cancel_button)

    def has_cancelled(self) -> bool:
        return self.clickedButton() == self.cancel_button
