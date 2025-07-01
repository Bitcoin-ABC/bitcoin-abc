#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC Developers
# Copyright (C) 2019-2020 Axel Gembe <derago@gmail.com>
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
from typing import Optional

from qtpy import QtWidgets
from qtpy.QtGui import QPainter, QPaintEvent, QPixmap


class QrReaderVideoWidget(QtWidgets.QWidget):
    """
    Simple widget for drawing a pixmap
    """

    USE_BILINEAR_FILTER = True

    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)

        self.pixmap = None

    def paintEvent(self, _event: QPaintEvent):
        if not self.pixmap:
            return
        painter = QPainter(self)
        if self.USE_BILINEAR_FILTER:
            painter.setRenderHint(QPainter.SmoothPixmapTransform)
        painter.drawPixmap(self.rect(), self.pixmap, self.pixmap.rect())

    def setPixmap(self, pixmap: QPixmap):
        self.pixmap = pixmap
        self.update()
