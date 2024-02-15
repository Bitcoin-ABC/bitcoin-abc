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

from typing import List, Optional

from PyQt5 import QtWidgets
from PyQt5.QtCore import QPoint, QRect, QRectF, QSize, Qt
from PyQt5.QtGui import QColor, QPainter, QPainterPath, QPaintEvent, QPen, QTransform
from PyQt5.QtSvg import QSvgRenderer

from electrumabc.qrreaders import QrCodeResult

from .validator import QrReaderValidatorResult


class QrReaderVideoOverlay(QtWidgets.QWidget):
    """
    Overlays the QR scanner results over the video
    """

    BG_RECT_PADDING = 10
    BG_RECT_CORNER_RADIUS = 10.0
    BG_RECT_OPACITY = 0.75

    QR_FINDER_OPACITY = 0.25
    QR_FINDER_SIZE = 0.5

    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)

        self.results = []
        self.flip_x = False
        self.validator_results = None
        self.crop = None
        self.resolution = None

        self.qr_outline_pen = QPen()
        self.qr_outline_pen.setColor(Qt.red)
        self.qr_outline_pen.setWidth(3)
        self.qr_outline_pen.setStyle(Qt.DotLine)

        self.text_pen = QPen()
        self.text_pen.setColor(Qt.black)

        self.bg_rect_pen = QPen()
        self.bg_rect_pen.setColor(Qt.black)
        self.bg_rect_pen.setStyle(Qt.DotLine)
        self.bg_rect_fill = QColor(255, 255, 255, int(255 * self.BG_RECT_OPACITY))

        self.qr_finder = QSvgRenderer(":icons/qr_finder.svg")

    def set_results(
        self,
        results: List[QrCodeResult],
        flip_x: bool,
        validator_results: QrReaderValidatorResult,
    ):
        self.results = results
        self.flip_x = flip_x
        self.validator_results = validator_results
        self.update()

    def set_crop(self, crop: QRect):
        self.crop = crop

    def set_resolution(self, resolution: QSize):
        self.resolution = resolution

    def paintEvent(self, _event: QPaintEvent):
        if not self.crop or not self.resolution:
            return

        painter = QPainter(self)

        # Keep a backup of the transform and create a new one
        transform = painter.worldTransform()

        # Set scaling transform
        transform = transform.scale(
            self.width() / self.resolution.width(),
            self.height() / self.resolution.height(),
        )

        # Compute the transform to flip the coordinate system on the x axis
        transform_flip = QTransform()
        if self.flip_x:
            transform_flip = transform_flip.translate(
                float(self.resolution.width()), 0.0
            )
            transform_flip = transform_flip.scale(-1.0, 1.0)

        # Small helper for tuple to QPoint
        def toqp(point):
            return QPoint(int(point[0]), int(point[1]))

        # Starting from here we care about AA
        painter.setRenderHint(QPainter.Antialiasing)

        # Draw the QR code finder overlay
        painter.setWorldTransform(transform_flip * transform, False)
        painter.setOpacity(self.QR_FINDER_OPACITY)
        qr_finder_size = self.crop.size() * self.QR_FINDER_SIZE
        tmp = (self.crop.size() - qr_finder_size) / 2
        qr_finder_pos = QPoint(tmp.width(), tmp.height()) + self.crop.topLeft()
        qr_finder_rect = QRect(qr_finder_pos, qr_finder_size)
        self.qr_finder.render(painter, QRectF(qr_finder_rect))
        painter.setOpacity(1.0)

        # Draw all the QR code results
        for res in self.results:
            painter.setWorldTransform(transform_flip * transform, False)

            # Draw lines between all of the QR code points
            pen = QPen(self.qr_outline_pen)
            if res in self.validator_results.result_colors:
                pen.setColor(self.validator_results.result_colors[res])
            painter.setPen(pen)
            num_points = len(res.points)
            for i in range(0, num_points):
                i_n = i + 1

                line_from = toqp(res.points[i])
                line_from += self.crop.topLeft()

                line_to = toqp(res.points[i_n] if i_n < num_points else res.points[0])
                line_to += self.crop.topLeft()

                painter.drawLine(line_from, line_to)

            # Draw the QR code data
            # Note that we reset the world transform to only the scaled transform
            # because otherwise the text could be flipped. We only use transform_flip
            # to map the center point of the result.
            painter.setWorldTransform(transform, False)
            font_metrics = painter.fontMetrics()
            data_metrics = QSize(
                font_metrics.horizontalAdvance(res.data), font_metrics.capHeight()
            )

            center_pos = toqp(res.center)
            center_pos += self.crop.topLeft()
            center_pos = transform_flip.map(center_pos)

            text_offset = QPoint(data_metrics.width(), data_metrics.height())
            text_offset = text_offset / 2
            text_offset.setX(-text_offset.x())
            center_pos += text_offset

            padding = self.BG_RECT_PADDING
            bg_rect_pos = center_pos - QPoint(padding, data_metrics.height() + padding)
            bg_rect_size = data_metrics + (QSize(padding, padding) * 2)
            bg_rect = QRect(bg_rect_pos, bg_rect_size)
            bg_rect_path = QPainterPath()
            radius = self.BG_RECT_CORNER_RADIUS
            bg_rect_path.addRoundedRect(
                QRectF(bg_rect), radius, radius, Qt.AbsoluteSize
            )
            painter.setPen(self.bg_rect_pen)
            painter.fillPath(bg_rect_path, self.bg_rect_fill)
            painter.drawPath(bg_rect_path)

            painter.setPen(self.text_pen)
            painter.drawText(center_pos, res.data)
