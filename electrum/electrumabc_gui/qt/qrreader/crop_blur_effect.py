#!/usr/bin/env python3
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

from PyQt5 import QtWidgets
from PyQt5.QtCore import QObject, QPoint, QRect, Qt
from PyQt5.QtGui import QPainter, QRegion, QTransform


class QrReaderCropBlurEffect(QtWidgets.QGraphicsBlurEffect):
    CROP_OFFSET_ENABLED = False
    CROP_OFFSET = QPoint(5, 5)

    BLUR_DARKEN = 0.25
    BLUR_RADIUS = 8

    def __init__(self, parent: QObject, crop: Optional[QRect] = None):
        super().__init__(parent)
        self.crop = crop
        self.setBlurRadius(self.BLUR_RADIUS)

    def setCrop(self, crop: Optional[QRect] = None):
        self.crop = crop

    def draw(self, painter: QPainter):
        assert self.crop, "crop must be set"

        # Compute painter regions for the crop and the blur
        all_region = QRegion(painter.viewport())
        crop_region = QRegion(self.crop)
        blur_region = all_region.subtracted(crop_region)

        # Let the QGraphicsBlurEffect only paint in blur_region
        painter.setClipRegion(blur_region)

        # Fill with black and set opacity so that the blurred region is drawn darker
        if self.BLUR_DARKEN > 0.0:
            painter.fillRect(painter.viewport(), Qt.black)
            painter.setOpacity(1 - self.BLUR_DARKEN)

        # Draw the blur effect
        super().draw(painter)

        # Restore clipping and opacity
        painter.setClipping(False)
        painter.setOpacity(1.0)

        # Get the source pixmap
        pixmap, offset = self.sourcePixmap(
            Qt.DeviceCoordinates, QtWidgets.QGraphicsEffect.NoPad
        )
        painter.setWorldTransform(QTransform())

        # Get the source by adding the offset to the crop location
        source = self.crop
        if self.CROP_OFFSET_ENABLED:
            source = source.translated(self.CROP_OFFSET)
        painter.drawPixmap(self.crop.topLeft() + offset, pixmap, source)
