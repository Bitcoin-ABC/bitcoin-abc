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

import math
import time
from typing import List

import qtpy
from qtpy import QtWidgets
from qtpy.QtCore import QRect, QSize, Qt, Signal
from qtpy.QtGui import QImage, QPixmap

if qtpy.QT5:
    from qtpy.QtMultimedia import QCamera, QCameraInfo, QCameraViewfinderSettings
else:
    from qtpy.QtMultimedia import (
        QCamera,
        QMediaCaptureSession,
        QMediaDevices,
    )

from electrumabc.i18n import _
from electrumabc.printerror import PrintError
from electrumabc.qrreaders import QrCodeResult, get_qr_reader
from electrumabc.simple_config import SimpleConfig

from ..util import MessageBoxMixin
from ..utils import FixedAspectRatioLayout, ImageGraphicsEffect
from .crop_blur_effect import QrReaderCropBlurEffect
from .validator import (
    AbstractQrReaderValidator,
    QrReaderValidatorCounted,
    QrReaderValidatorResult,
)
from .video_overlay import QrReaderVideoOverlay
from .video_surface import QrReaderVideoSurface
from .video_widget import QrReaderVideoWidget


class CameraError(RuntimeError):
    """Base class of the camera-related error conditions."""


class NoCamerasFound(CameraError):
    """Raised by start_scan if no usable cameras were found. Interested
    code can catch this specific exception."""


class NoCameraResolutionsFound(CameraError):
    """Raised internally if no usable camera resolutions were found."""


class MissingQrDetectionLib(RuntimeError):
    """Raised if we can't find zbar or whatever other platform lib
    we require to detect QR in image frames."""


def get_camera_path(cam) -> str:
    return cam.deviceName() if qtpy.QT5 else bytes(cam.id()).decode("ascii")


class QrReaderCameraDialog(PrintError, MessageBoxMixin, QtWidgets.QDialog):
    """
    Dialog for reading QR codes from a camera
    """

    # Try to crop so we have minimum 512 dimensions
    SCAN_SIZE: int = 512

    qr_finished = Signal(bool, str, object)

    def __init__(self, parent, config: SimpleConfig):
        """Note: make sure parent is a "top_level_window()" as per
        MessageBoxMixin API else bad things can happen on macOS."""
        QtWidgets.QDialog.__init__(self, parent=parent)

        self.validator: AbstractQrReaderValidator = None
        self.frame_id: int = 0
        self.qr_crop: QRect = None
        self.qrreader_res: List[QrCodeResult] = []
        self.validator_res: QrReaderValidatorResult = None
        self.last_stats_time: float = 0.0
        self.frame_counter: int = 0
        self.qr_frame_counter: int = 0
        self.last_qr_scan_ts: float = 0.0
        self.camera: QCamera = None
        if qtpy.QT6:
            self.media_capture_session: QMediaCaptureSession = None
        self._error_message: str = None
        self._ok_done: bool = False
        self.camera_sc_conn = None
        self.resolution: QSize = None

        self.config = config

        # Try to get the QR reader for this system
        self.qrreader = get_qr_reader()
        if not self.qrreader:
            raise MissingQrDetectionLib(
                _("The platform QR detection library is not available.")
            )

        # Set up the window, add the maximize button
        flags = self.windowFlags()
        flags = flags | Qt.WindowMaximizeButtonHint
        self.setWindowFlags(flags)
        self.setWindowTitle(_("Scan QR Code"))
        self.setWindowModality(Qt.WindowModal if parent else Qt.ApplicationModal)

        # Create video widget and fixed aspect ratio layout to contain it
        self.video_widget = QrReaderVideoWidget()
        self.video_overlay = QrReaderVideoOverlay()
        self.video_layout = FixedAspectRatioLayout()
        self.video_layout.addWidget(self.video_widget)
        self.video_layout.addWidget(self.video_overlay)

        # Create root layout and add the video widget layout to it
        vbox = QtWidgets.QVBoxLayout()
        self.setLayout(vbox)
        vbox.setContentsMargins(0, 0, 0, 0)
        vbox.addLayout(self.video_layout)

        self.lowres_label = QtWidgets.QLabel(
            _(
                "Note: This camera generates frames of relatively low resolution; QR"
                " scanning accuracy may be affected"
            )
        )
        self.lowres_label.setWordWrap(True)
        self.lowres_label.setAlignment(
            Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignHCenter
        )
        vbox.addWidget(self.lowres_label)
        self.lowres_label.setHidden(True)

        # Create a layout for the controls
        controls_layout = QtWidgets.QHBoxLayout()
        controls_layout.addStretch(2)
        controls_layout.setContentsMargins(10, 10, 10, 10)
        controls_layout.setSpacing(10)
        vbox.addLayout(controls_layout)

        # Flip horizontally checkbox with default coming from global config
        self.flip_x = QtWidgets.QCheckBox()
        self.flip_x.setText(_("&Flip horizontally"))
        self.flip_x.setChecked(bool(self.config.get("qrreader_flip_x", True)))
        self.flip_x.stateChanged.connect(self._on_flip_x_changed)
        controls_layout.addWidget(self.flip_x)

        close_but = QtWidgets.QPushButton(_("&Close"))
        close_but.clicked.connect(self.reject)
        controls_layout.addWidget(close_but)

        # Create the video surface and receive events when new frames arrive
        self.video_surface = QrReaderVideoSurface(self)
        self.video_surface.frame_available.connect(self._on_frame_available)

        # Create the crop blur effect
        self.crop_blur_effect = QrReaderCropBlurEffect(self)
        self.image_effect = ImageGraphicsEffect(self, self.crop_blur_effect)

        # Note these should stay as queued connections becasue we use the idiom
        # self.reject() and self.accept() in this class to kill the scan --
        # and we do it from within callback functions. If you don't use
        # queued connections here, bad things can happen.
        self.finished.connect(self._boilerplate_cleanup, Qt.QueuedConnection)
        self.finished.connect(self._on_finished, Qt.QueuedConnection)

    def _on_flip_x_changed(self, _state: int):
        self.config.set_key("qrreader_flip_x", self.flip_x.isChecked())

    def _get_resolution(self, resolutions: List[QSize], min_size: int) -> QSize:
        """
        Given a list of resolutions that the camera supports this function picks the
        lowest resolution that is at least min_size in both width and height.
        If no resolution is found, NoCameraResolutionsFound is raised.
        """

        def res_list_to_str(res_list: List[QSize]) -> str:
            return ", ".join(["{}x{}".format(r.width(), r.height()) for r in res_list])

        def check_res(res: QSize):
            return res.width() >= min_size and res.height() >= min_size

        self.print_error("searching for at least {0}x{0}".format(min_size))

        # Query and display all resolutions the camera supports
        format_str = "camera resolutions: {}"
        self.print_error(format_str.format(res_list_to_str(resolutions)))

        # Filter to those that are at least min_size in both width and height
        candidate_resolutions = []
        ideal_resolutions = [r for r in resolutions if check_res(r)]
        less_than_ideal_resolutions = [
            r for r in resolutions if r not in ideal_resolutions
        ]
        format_str = "ideal resolutions: {}, less-than-ideal resolutions: {}"
        self.print_error(
            format_str.format(
                res_list_to_str(ideal_resolutions),
                res_list_to_str(less_than_ideal_resolutions),
            )
        )

        # Raise an error if we have no usable resolutions
        if not ideal_resolutions and not less_than_ideal_resolutions:
            raise NoCameraResolutionsFound(
                _("Cannot start QR scanner, no usable camera resolution found.")
                + self._linux_pyqt5bug_msg()
            )

        if not ideal_resolutions:
            self.print_error(
                "Warning: No ideal resolutions found, falling back to less-than-ideal"
                " resolutions -- QR recognition may fail!"
            )
            candidate_resolutions = less_than_ideal_resolutions
            is_ideal = False
        else:
            candidate_resolutions = ideal_resolutions
            is_ideal = True

        # Sort the usable resolutions, least number of pixels first, get the first element
        resolution = sorted(
            candidate_resolutions,
            key=lambda r: r.width() * r.height(),
            reverse=not is_ideal,
        )[0]
        format_str = "chosen resolution is {}x{}"
        self.print_error(format_str.format(resolution.width(), resolution.height()))

        return resolution, is_ideal

    @staticmethod
    def _get_crop(resolution: QSize, scan_size: int) -> QRect:
        """
        Returns a QRect that is scan_size x scan_size in the middle of the resolution
        """
        scan_pos_x = (resolution.width() - scan_size) // 2
        scan_pos_y = (resolution.height() - scan_size) // 2
        return QRect(scan_pos_x, scan_pos_y, scan_size, scan_size)

    def start_scan(self, device: str = ""):
        """
        Scans a QR code from the given camera device.
        If no QR code is found the returned string will be empty.
        If the camera is not found or can't be opened NoCamerasFound will be raised.
        """

        self.validator = QrReaderValidatorCounted()
        self.validator.strong_count = (
            5  # FIXME: make this time based rather than framect based
        )

        device_info = None

        if qtpy.QT5:
            available_cameras = QCameraInfo.availableCameras()
            default_camera = QCameraInfo.defaultCamera()
        else:
            available_cameras = QMediaDevices.videoInputs()
            default_camera = QMediaDevices.defaultVideoInput()

        for camera in available_cameras:
            if get_camera_path(camera) == device:
                device_info = camera
                break

        if not device_info:
            self.print_error(
                "Failed to open selected camera, trying to use default camera"
            )
            device_info = default_camera

        if not device_info or device_info.isNull():
            raise NoCamerasFound(_("Cannot start QR scanner, no usable camera found."))

        self._init_stats()
        self.qrreader_res = []
        self.validator_res = None
        self._ok_done = False
        self._error_message = None

        if self.camera:
            self.print_error("Warning: start_scan already called for this instance.")

        self.camera = QCamera(device_info)
        if qtpy.QT5:
            self.camera.setViewfinder(self.video_surface)
            self.camera.setCaptureMode(QCamera.CaptureViewfinder)

            # this operates on camera from within the signal handler, so should be a queued connection
            self.camera_sc_conn = self.camera.statusChanged.connect(
                self._on_camera_status_changed, Qt.QueuedConnection
            )
            self.camera.error.connect(
                self._on_camera_error
            )  # print_error the errors we get, if any, for debugging
            # Camera needs to be loaded to query resolutions, this tries to open the camera
            self.camera.load()
        else:
            self.camera.start()
            # log the errors we get, if any, for debugging
            self.camera.errorOccurred.connect(self._on_camera_error)

            self.media_capture_session = QMediaCaptureSession()
            self.media_capture_session.setCamera(self.camera)
            self.media_capture_session.setVideoSink(self.video_surface)

            self.open()

    if qtpy.QT5:
        _camera_status_names = {
            QCamera.UnavailableStatus: _("unavailable"),
            QCamera.UnloadedStatus: _("unloaded"),
            QCamera.UnloadingStatus: _("unloading"),
            QCamera.LoadingStatus: _("loading"),
            QCamera.LoadedStatus: _("loaded"),
            QCamera.StandbyStatus: _("standby"),
            QCamera.StartingStatus: _("starting"),
            QCamera.StoppingStatus: _("stopping"),
            QCamera.ActiveStatus: _("active"),
        }

        def _get_camera_status_name(self, status: QCamera.Status):
            return self._camera_status_names.get(status, _("unknown"))

    def _set_resolution(self, resolution: QSize):
        self.resolution = resolution
        self.qr_crop = self._get_crop(resolution, self.SCAN_SIZE)

        # Initialize the video widget
        # self.video_widget.setMinimumSize(resolution)  # <-- on macOS this makes it fixed size for some reason.
        self.resize(720, 540)
        self.video_overlay.set_crop(self.qr_crop)
        self.video_overlay.set_resolution(resolution)
        self.video_layout.set_aspect_ratio(resolution.width() / resolution.height())

        # Set up the crop blur effect
        self.crop_blur_effect.setCrop(self.qr_crop)

    if qtpy.QT5:

        def _on_camera_status_changed(self, status: QCamera.Status):
            if self._ok_done:
                # camera/scan is quitting, abort.
                return

            self.print_error(
                "camera status changed to {}".format(
                    self._get_camera_status_name(status)
                )
            )

            if status == QCamera.LoadedStatus:
                # Determine the optimal resolution and compute the crop rect
                camera_resolutions = self.camera.supportedViewfinderResolutions()
                try:
                    resolution, was_ideal = self._get_resolution(
                        camera_resolutions, self.SCAN_SIZE
                    )
                except RuntimeError as e:
                    self._error_message = str(e)
                    self.reject()
                    return
                self._set_resolution(resolution)

                # Set the camera resolution
                viewfinder_settings = QCameraViewfinderSettings()
                viewfinder_settings.setResolution(resolution)
                self.camera.setViewfinderSettings(viewfinder_settings)

                # Counter for the QR scanner frame number
                self.frame_id = 0

                self.camera.start()
                self.lowres_label.setVisible(
                    not was_ideal
                )  # if they have a low res camera, show the warning label.
            elif (
                status == QCamera.UnloadedStatus or status == QCamera.UnavailableStatus
            ):
                self._error_message = _(
                    "Cannot start QR scanner, camera is unavailable."
                )
                self.reject()
            elif status == QCamera.ActiveStatus:
                self.open()

        CameraErrorStrings = {
            QCamera.NoError: "No Error",
            QCamera.CameraError: "Camera Error",
            QCamera.InvalidRequestError: "Invalid Request Error",
            QCamera.ServiceMissingError: "Service Missing Error",
            QCamera.NotSupportedFeatureError: "Unsupported Feature Error",
        }

        def _on_camera_error(self, errorCode):
            errStr = self.CameraErrorStrings.get(errorCode, "Unknown Error")
            self.print_error("QCamera error:", errStr)

    else:

        def _on_camera_error(self, error: QCamera.Error, error_str: str):
            self.logger.info(f"QCamera error: {error}. {error_str}")

    def accept(self):
        self._ok_done = True  # immediately blocks further processing
        super().accept()

    def reject(self):
        self._ok_done = True  # immediately blocks further processing
        super().reject()

    def _boilerplate_cleanup(self):
        self._close_camera()
        if self.isVisible():
            self.close()

    def _close_camera(self):
        if self.camera:
            if qtpy.QT5:
                self.camera.setViewfinder(None)
                if self.camera_sc_conn:
                    self.camera.statusChanged.disconnect(self.camera_sc_conn)
                    self.camera_sc_conn = None
                self.camera.unload()
            else:
                self.camera.stop()
            self.camera = None

    def _on_finished(self, code):
        res = (
            code == QtWidgets.QDialog.Accepted
            and self.validator_res
            and self.validator_res.accepted
            and self.validator_res.simple_result
        ) or ""

        self.validator = None

        self.print_error("closed", res)

        self.qr_finished.emit(
            code == QtWidgets.QDialog.Accepted, self._error_message, res
        )

    def _on_frame_available(self, frame: QImage):
        if self._ok_done:
            return

        self.frame_id += 1

        self._set_resolution(frame.size())

        flip_x = self.flip_x.isChecked()

        # Only QR scan every QR_SCAN_PERIOD secs
        qr_scanned = time.time() - self.last_qr_scan_ts >= self.qrreader.interval()
        if qr_scanned:
            self.last_qr_scan_ts = time.time()
            # Crop the frame so we only scan a SCAN_SIZE rect
            frame_cropped = frame.copy(self.qr_crop)

            # Convert to Y800 / GREY FourCC (single 8-bit channel)
            # This creates a copy, so we don't need to keep the frame around anymore
            frame_y800 = frame_cropped.convertToFormat(QImage.Format_Grayscale8)

            # Read the QR codes from the frame
            self.qrreader_res = self.qrreader.read_qr_code(
                frame_y800.constBits().__int__(),
                frame_y800.sizeInBytes() if qtpy.QT6 else frame_y800.byteCount(),
                frame_y800.bytesPerLine(),
                frame_y800.width(),
                frame_y800.height(),
                self.frame_id,
            )

            # Call the validator to see if the scanned results are acceptable
            self.validator_res = self.validator.validate_results(self.qrreader_res)

            # Update the video overlay with the results
            self.video_overlay.set_results(
                self.qrreader_res, flip_x, self.validator_res
            )

            # Close the dialog if the validator accepted the result
            if self.validator_res.accepted:
                self.accept()
                return

        # Apply the crop blur effect
        if self.image_effect:
            frame = self.image_effect.apply(frame)

        # If horizontal flipping is enabled, only flip the display
        if flip_x:
            frame = frame.mirrored(True, False)

        # Display the frame in the widget
        self.video_widget.setPixmap(QPixmap.fromImage(frame))

        self._update_stats(qr_scanned)

    def _init_stats(self):
        self.last_stats_time = time.perf_counter()
        self.frame_counter = 0
        self.qr_frame_counter = 0

    def _update_stats(self, qr_scanned):
        self.frame_counter += 1
        if qr_scanned:
            self.qr_frame_counter += 1
        now = time.perf_counter()
        last_stats_delta = now - self.last_stats_time
        if last_stats_delta > 1.0:  # stats every 1.0 seconds
            fps = self.frame_counter / last_stats_delta
            qr_fps = self.qr_frame_counter / last_stats_delta
            if self.validator is not None:
                self.validator.strong_count = math.ceil(
                    qr_fps / 3
                )  # 1/3 of a second's worth of qr frames determines strong_count
            stats_format = "running at {} FPS, scanner at {} FPS"
            self.print_error(stats_format.format(fps, qr_fps))
            self.frame_counter = 0
            self.qr_frame_counter = 0
            self.last_stats_time = now
