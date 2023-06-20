from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QCursor

from electrumabc.i18n import _


class FeeSlider(QtWidgets.QSlider):
    def __init__(self, window, config, callback):
        QtWidgets.QSlider.__init__(self, Qt.Horizontal)
        self.config = config
        self.window = window
        self.callback = callback
        self.dyn = False
        self.update()
        self.valueChanged.connect(self.moved)

    def moved(self, pos):
        fee_rate = self.config.static_fee(pos)
        tooltip = self.get_tooltip(pos, fee_rate)
        QtWidgets.QToolTip.showText(QCursor.pos(), tooltip, self)
        self.setToolTip(tooltip)
        self.callback(self.dyn, pos, fee_rate)

    def get_tooltip(self, pos, fee_rate):
        from electrumabc.util import fee_levels

        rate_str = self.window.format_fee_rate(fee_rate) if fee_rate else _("unknown")
        if self.config.has_custom_fee_rate():
            tooltip = _("Custom rate: ") + rate_str
        elif self.dyn:
            tooltip = _(fee_levels[pos]) + "\n" + rate_str
        else:
            tooltip = _("Fixed rate: ") + rate_str
        return tooltip

    def update(self):
        if self.config.has_custom_fee_rate():
            self.update_has_custom_fee_rate()
        else:
            self.update_no_custom_fee_rate()

    def update_no_custom_fee_rate(self):
        self.fee_step = self.config.max_slider_fee / self.config.slider_steps
        fee_rate = self.config.fee_per_kb()
        pos = max(min(fee_rate / self.fee_step, 10) - 1, 0)
        self.setEnabled(True)
        self.setRange(0, 9)
        self.setValue(int(pos))
        tooltip = self.get_tooltip(pos, fee_rate)
        self.setToolTip(tooltip)

    # configuraing this as is done is here still required, can't just set range 0,0 to deactivate.
    # chose to make this a separate function from update for easier code maintenance
    def update_has_custom_fee_rate(self):
        self.fee_step = self.config.max_slider_fee / self.config.slider_steps
        fee_rate = self.config.fee_per_kb()
        pos = max(0, min(fee_rate / self.fee_step, 1))
        self.setRange(0, 1)
        self.setValue(0)
        self.setEnabled(False)
        tooltip = self.get_tooltip(pos, fee_rate)
        self.setToolTip(tooltip)
