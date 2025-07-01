# Electrum ABC - lightweight eCash client
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
from __future__ import annotations

from collections import namedtuple
from typing import TYPE_CHECKING, Optional

from qtpy import QtWidgets
from qtpy.QtCore import Qt, QTimer, Signal

from electrumabc.paymentrequest import PR_EXPIRED, PR_PAID, PR_UNCONFIRMED, PR_UNPAID
from electrumabc.simple_config import SimpleConfig
from electrumabc.util import Weak

if TYPE_CHECKING:
    from electrumabc.storage import WalletStorage
    from electrumabc.wallet import AbstractWallet


pr_icons = {
    PR_UNPAID: ":icons/unpaid.svg",
    PR_PAID: ":icons/confirmed.svg",
    PR_EXPIRED: ":icons/expired.svg",
    PR_UNCONFIRMED: ":icons/unconfirmed.svg",
}


class ElectrumItemDelegate(QtWidgets.QStyledItemDelegate):
    def createEditor(self, parent, option, index):
        return self.parent().createEditor(parent, option, index)


class TreeSortingMixin:
    """Mixin class providing sorting helpers for a QTreeView"""

    class SortSpec(namedtuple("SortSpec", "column, qt_sort_order")):
        """Used to specify member: default_sort"""

    # Specify this in subclasses to apply a default sort order to the widget.
    # If None, nothing is applied (items are presented in the order they are
    # added).
    default_sort: Optional[SortSpec] = None

    def __init__(
        self,
        tree_view: QtWidgets.QTreeView,
        storage: WalletStorage,
        widget_name: str,
    ):
        self.tree_view = tree_view
        self.storage = storage
        self.storage_key = f"mytreewidget_default_sort_{widget_name}"

    def _setup_save_sort_mechanism(self, save_settings: bool):
        """This method sets up the sorting base on the configuration saved in the
        wallet file or by default based on the class attribute `default_sort`
        set by child classes.
        It must be called after `setColumnCount`, else `sortByColumn` will not
        work.
        """
        if save_settings:
            default = (
                self.storage and self.storage.get(self.storage_key, None)
            ) or self.default_sort
            if (
                default
                and isinstance(default, (tuple, list))
                and len(default) >= 2
                and all(isinstance(i, int) for i in default)
            ):
                self.tree_view.setSortingEnabled(True)
                self.tree_view.sortByColumn(default[0], default[1])
            if self.storage:
                # Paranoia; hold a weak reference just in case subclass code
                # does unusual things.
                weakStorage = Weak.ref(self.storage)

                def save_sort(column, qt_sort_order):
                    storage = weakStorage()
                    if storage:
                        storage.put(self.storage_key, [column, qt_sort_order])

                self.tree_view.header().sortIndicatorChanged.connect(save_sort)
        elif self.default_sort:
            self.tree_view.setSortingEnabled(True)
            self.tree_view.sortByColumn(self.default_sort[0], self.default_sort[1])


class MyTreeWidget(QtWidgets.QTreeWidget, TreeSortingMixin):
    # Specify this in subclasses to enable substring search/filtering (Ctrl+F)
    # (if this and filter_data_columns are both empty, no search is applied)
    filter_columns = []
    # Like the above but rather than search the item .text() field, it searches
    # for *data* in columns, e.g. item.data(col, Qt.UserRole). The data must
    # live in filter_data_role (Qt.UserRole by default) in the specified
    # column(s) and be a str. Leave empty to disable this facility. Note that
    # data matches for the Ctrl+F filter must be a full string match (no
    # substring matching is done) -- this is in contrast to filter_columns
    # matching above which does substring matching. This reason we match on full
    # strings is this facility was initially added to allow for searching the
    # history_list by txid. If this criterion doesn't suit your use-case when
    # inheriting from this, you may always override this class's `filter`
    # method.
    filter_data_columns = []
    # the QTreeWidgetItem data role to use when searching data columns
    filter_data_role: int = Qt.UserRole

    edited = Signal()

    def __init__(
        self,
        headers,
        config: SimpleConfig,
        wallet: AbstractWallet,
        stretch_column=None,
        editable_columns=None,
        *,
        deferred_updates=False,
        save_sort_settings=False,
    ):
        super().__init__(
            tree_view=self,
            storage=wallet.storage,
            widget_name=type(self).__name__,
        )
        self.config = config
        self.wallet = wallet
        self.stretch_column = stretch_column
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.setUniformRowHeights(True)
        # extend the syntax for consistency
        self.addChild = self.addTopLevelItem
        self.insertChild = self.insertTopLevelItem
        self.deferred_updates = deferred_updates
        self.deferred_update_ct, self._forced_update = 0, False

        # Control which columns are editable
        self.editor = None
        self.pending_update = False
        if editable_columns is None:
            editable_columns = [stretch_column]
        self.editable_columns = editable_columns
        self.setItemDelegate(ElectrumItemDelegate(self))
        self.itemDoubleClicked.connect(self.on_doubleclick)
        self.update_headers(headers)
        self.current_filter = ""

        self._setup_save_sort_mechanism(save_sort_settings)

    def update_headers(self, headers):
        self.setColumnCount(len(headers))
        self.setHeaderLabels(headers)
        self.header().setStretchLastSection(False)
        for col in range(len(headers)):
            sm = (
                QtWidgets.QHeaderView.Stretch
                if col == self.stretch_column
                else QtWidgets.QHeaderView.ResizeToContents
            )
            self.header().setSectionResizeMode(col, sm)

    def editItem(self, item, column):
        if item and column in self.editable_columns:
            self.editing_itemcol = (item, column, item.text(column))
            # Calling setFlags causes on_changed events for some reason
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            super().editItem(item, column)
            item.setFlags(item.flags() & ~Qt.ItemIsEditable)

    def keyPressEvent(self, event):
        if event.key() in {Qt.Key_F2, Qt.Key_Return} and self.editor is None:
            item, col = self.currentItem(), self.currentColumn()
            if item and col > -1:
                self.on_activated(item, col)
        else:
            super().keyPressEvent(event)

    def permit_edit(self, item, column):
        return column in self.editable_columns and self.on_permit_edit(item, column)

    def on_permit_edit(self, item, column):
        return True

    def on_doubleclick(self, item, column):
        if self.permit_edit(item, column):
            self.editItem(item, column)

    def on_activated(self, item, column):
        # on 'enter' we show the menu
        pt = self.visualItemRect(item).bottomLeft()
        pt.setX(50)
        self.customContextMenuRequested.emit(pt)

    def createEditor(self, parent, option, index):
        self.editor = QtWidgets.QStyledItemDelegate.createEditor(
            self.itemDelegate(), parent, option, index
        )
        self.editor.editingFinished.connect(self.editing_finished)
        return self.editor

    def editing_finished(self):
        # Long-time QT bug - pressing Enter to finish editing signals
        # editingFinished twice.  If the item changed the sequence is
        # Enter key:  editingFinished, on_change, editingFinished
        # Mouse: on_change, editingFinished
        # This mess is the cleanest way to ensure we make the
        # on_edited callback with the updated item
        if self.editor:
            (item, column, prior_text) = self.editing_itemcol
            if self.editor.text() == prior_text:
                self.editor = None  # Unchanged - ignore any 2nd call
            elif item.text(column) == prior_text:
                pass  # Buggy first call on Enter key, item not yet updated
            else:
                # What we want - the updated item
                self.on_edited(*self.editing_itemcol)
                self.editor = None

            # Now do any pending updates
            if self.editor is None and self.pending_update:
                self.pending_update = False
                self.on_update()
                self.deferred_update_ct = 0

    def on_edited(self, item, column, prior):
        """Called only when the text actually changes"""
        key = item.data(0, Qt.UserRole)
        text = item.text(column)
        self.wallet.set_label(key, text)
        self.edited.emit()

    def should_defer_update_incr(self):
        ret = self.deferred_updates and not self.isVisible() and not self._forced_update
        if ret:
            self.deferred_update_ct += 1
        return ret

    def update(self):
        # Defer updates if editing
        if self.editor:
            self.pending_update = True
        else:
            # Deferred update mode won't actually update the GUI if it's
            # not on-screen, and will instead update it the next time it is
            # shown.  This has been found to radically speed up large wallets
            # on initial synch or when new TX's arrive.
            if self.should_defer_update_incr():
                return
            self.setUpdatesEnabled(False)
            scroll_pos_val = (
                self.verticalScrollBar().value()
            )  # save previous scroll bar position
            self.on_update()
            self.deferred_update_ct = 0
            weakSelf = Weak.ref(self)

            def restoreScrollBar():
                slf = weakSelf()
                if slf:
                    slf.updateGeometry()
                    slf.verticalScrollBar().setValue(
                        scroll_pos_val
                    )  # restore scroll bar to previous
                    slf.setUpdatesEnabled(True)

            QTimer.singleShot(
                0, restoreScrollBar
            )  # need to do this from a timer some time later due to Qt quirks
        if self.current_filter:
            self.filter(self.current_filter)

    def on_update(self):
        # Reimplemented in subclasses
        pass

    def showEvent(self, e):
        super().showEvent(e)
        if e.isAccepted() and self.deferred_update_ct:
            self._forced_update = True
            self.update()
            self._forced_update = False
            # self.deferred_update_ct will be set right after on_update is called because some subclasses use @rate_limiter on the update() method

    def get_leaves(self, root=None):
        if root is None:
            root = self.invisibleRootItem()
        child_count = root.childCount()
        if child_count == 0:
            if root is not self.invisibleRootItem():
                yield root
            else:
                return
        for i in range(child_count):
            item = root.child(i)
            for x in self.get_leaves(item):
                yield x

    def filter(self, p):
        columns = self.__class__.filter_columns
        data_columns = self.__class__.filter_data_columns
        if not columns and not data_columns:
            return
        p = p.lower()
        self.current_filter = p
        bad_data_column = False
        data_role = self.__class__.filter_data_role
        for item in self.get_leaves(self.invisibleRootItem()):
            no_match_text = all(
                item.text(column).lower().find(p) == -1 for column in columns
            )
            no_match_data = True
            if no_match_text and not bad_data_column and data_columns:
                try:
                    # data matching is different -- it must match exactly the
                    # specified search string. This was originally designed
                    # to allow for tx-hash searching of the history list.
                    no_match_data = all(
                        item.data(column, data_role).strip().lower() != p
                        for column in data_columns
                    )
                except (AttributeError, TypeError, ValueError):
                    # flag so we don't keep raising for each iteration of this
                    # loop.  Programmer error here in subclass, silently ignore.
                    bad_data_column = True
            item.setHidden(no_match_text and no_match_data)
