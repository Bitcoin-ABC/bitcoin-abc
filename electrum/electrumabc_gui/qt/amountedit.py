# -*- coding: utf-8 -*-

from decimal import Decimal
from typing import Optional, Union

from qtpy import QtWidgets
from qtpy.QtCore import Qt, Signal
from qtpy.QtGui import QPainter

from electrumabc.amount import format_satoshis_plain
from electrumabc.constants import BASE_UNITS_BY_DECIMALS

from .util import ColorScheme, char_width_in_lineedit


class MyLineEdit(QtWidgets.QLineEdit):
    frozen = Signal()

    def setFrozen(self, b: bool):
        self.setReadOnly(b)
        self.setFrame(not b)
        self.frozen.emit()


class AmountEdit(MyLineEdit):
    shortcut = Signal()

    def __init__(
        self,
        base_unit: str,
        is_int: bool = False,
        parent: Optional[QtWidgets.QWidget] = None,
    ):
        QtWidgets.QLineEdit.__init__(self, parent)
        # This seems sufficient for 10,000 MXEC amounts with two decimals
        self.setFixedWidth(18 * char_width_in_lineedit())
        self.base_unit: str = base_unit
        self.decimal_point: int = 2
        self.textChanged.connect(self.numbify)
        self.is_int = is_int
        self.is_shortcut = False

    def numbify(self):
        text = self.text().strip()
        if text == "!":
            self.shortcut.emit()
            return
        pos = self.cursorPosition()
        chars = "0123456789"
        if not self.is_int:
            chars += "."
        s = "".join([i for i in text if i in chars])
        if not self.is_int and "." in s:
            p = s.find(".")
            s = s.replace(".", "")
            s = s[:p] + "." + s[p : p + self.decimal_point]
        self.setText(s)
        # setText sets Modified to False.  Instead we want to remember
        # if updates were because of user modification.
        self.setModified(self.hasFocus())
        self.setCursorPosition(pos)

    def paintEvent(self, event):
        QtWidgets.QLineEdit.paintEvent(self, event)
        if self.base_unit:
            panel = QtWidgets.QStyleOptionFrame()
            self.initStyleOption(panel)
            textRect = self.style().subElementRect(
                QtWidgets.QStyle.SE_LineEditContents, panel, self
            )
            textRect.adjust(2, 0, -10, 0)
            painter = QPainter(self)
            painter.setPen(ColorScheme.GRAY.as_color())
            painter.drawText(
                textRect,
                Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter,
                self.base_unit,
            )

    def get_amount(self) -> Optional[Union[int, Decimal]]:
        try:
            return (int if self.is_int else Decimal)(self.text())
        except (ValueError, ArithmeticError):
            return None

    def set_base_unit(self, base_unit: str):
        self.base_unit = base_unit
        self.update()


class XECAmountEdit(AmountEdit):
    def __init__(self, decimal_point: int, is_int=False, parent=None):
        if decimal_point not in BASE_UNITS_BY_DECIMALS:
            raise Exception("Unknown base unit")
        base_unit: str = BASE_UNITS_BY_DECIMALS[decimal_point]
        AmountEdit.__init__(self, base_unit, is_int, parent)
        self.decimal_point = decimal_point

    def get_amount(self) -> Optional[int]:
        """Return amount in satoshis"""
        try:
            x = Decimal(self.text())
        except ArithmeticError:
            return None
        p = pow(10, self.decimal_point)
        return int(p * x)

    def setAmount(self, amount: Optional[Union[float, int]]):
        if amount is None:
            # Space forces repaint in case units changed
            self.setText(" ")
        else:
            self.setText(format_satoshis_plain(amount, self.decimal_point))

    def update_unit(self, decimal_point: int):
        sats = self.get_amount()
        self.decimal_point = decimal_point
        self.set_base_unit(BASE_UNITS_BY_DECIMALS[decimal_point])
        self.setAmount(sats)


class XECSatsByteEdit(XECAmountEdit):
    def __init__(self, parent=None):
        XECAmountEdit.__init__(self, decimal_point=2, is_int=False, parent=parent)
        self.set_base_unit("sats/B")

    def get_amount(self) -> Optional[float]:
        try:
            x = float(Decimal(self.text()))
        except (ValueError, ArithmeticError):
            return None
        return x if x > 0.0 else None

    def setAmount(self, amount: Optional[Union[float, int]]):
        if amount is None:
            # Space forces repaint in case units changed
            self.setText(" ")
        else:
            self.setText(str(round(amount * 100.0) / 100.0))
