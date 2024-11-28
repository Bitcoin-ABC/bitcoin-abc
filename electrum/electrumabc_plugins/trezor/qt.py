import os
from functools import partial

from PyQt5 import QtWidgets
from PyQt5.QtCore import QEventLoop, QStandardPaths, Qt, pyqtSignal
from PyQt5.QtGui import QBitmap, QImage, qBlue, qGreen, qRed

from electrumabc.constants import PROJECT_NAME
from electrumabc.i18n import _
from electrumabc.plugins import hook
from electrumabc.util import bh2u
from electrumabc_gui.qt.util import (
    Buttons,
    CancelButton,
    CloseButton,
    OkButton,
    PasswordLineEdit,
    WindowModalDialog,
    WWLabel,
)

from ..hw_wallet.qt import QtHandlerBase, QtPluginBase
from .trezor import (
    PASSPHRASE_ON_DEVICE,
    RECOVERY_TYPE_MATRIX,
    RECOVERY_TYPE_SCRAMBLED_WORDS,
    TIM_RECOVER,
    TrezorPlugin,
)

PASSPHRASE_HELP_SHORT = _(
    "Passphrases allow you to access new wallets, each "
    "hidden behind a particular case-sensitive passphrase."
)
PASSPHRASE_HELP = (
    PASSPHRASE_HELP_SHORT
    + "  "
    + _(
        f"You need to create a separate {PROJECT_NAME} wallet for each passphrase"
        " you use as they each generate different addresses. Changing "
        "your passphrase does not lose other wallets, each is still "
        "accessible behind its own passphrase."
    )
)
RECOMMEND_PIN = _(
    "You should enable PIN protection.  Your PIN is the only protection for "
    "your eCash if your device is lost or stolen."
)
PASSPHRASE_NOT_PIN = _(
    "If you forget a passphrase you will be unable to access any eCash in the "
    "wallet behind it.  A passphrase is not a PIN. "
    "Only change this if you are sure you understand it."
)
MATRIX_RECOVERY = _(
    "Enter the recovery words by pressing the buttons according to what "
    "the device shows on its display.  You can also use your NUMPAD.\n"
    "Press BACKSPACE to go back a choice or word.\n"
)


class MatrixDialog(WindowModalDialog):
    def __init__(self, parent):
        super(MatrixDialog, self).__init__(parent)
        self.setWindowTitle(_("Trezor Matrix Recovery"))
        self.num = 9
        self.loop = QEventLoop()

        vbox = QtWidgets.QVBoxLayout(self)
        vbox.addWidget(WWLabel(MATRIX_RECOVERY))

        grid = QtWidgets.QGridLayout()
        grid.setSpacing(0)
        self.char_buttons = []
        for y in range(3):
            for x in range(3):
                button = QtWidgets.QPushButton("?")
                button.clicked.connect(partial(self.process_key, ord("1") + y * 3 + x))
                grid.addWidget(button, 3 - y, x)
                self.char_buttons.append(button)
        vbox.addLayout(grid)

        self.backspace_button = QtWidgets.QPushButton("<=")
        self.backspace_button.clicked.connect(
            partial(self.process_key, Qt.Key_Backspace)
        )
        self.cancel_button = QtWidgets.QPushButton(_("Cancel"))
        self.cancel_button.clicked.connect(partial(self.process_key, Qt.Key_Escape))
        buttons = Buttons(self.backspace_button, self.cancel_button)
        vbox.addSpacing(40)
        vbox.addLayout(buttons)
        self.refresh()
        self.show()

    def refresh(self):
        for y in range(3):
            self.char_buttons[3 * y + 1].setEnabled(self.num == 9)

    def is_valid(self, key):
        return key >= ord("1") and key <= ord("9")

    def process_key(self, key):
        self.data = None
        if key == Qt.Key_Backspace:
            self.data = "\010"
        elif key == Qt.Key_Escape:
            self.data = "x"
        elif self.is_valid(key):
            self.char_buttons[key - ord("1")].setFocus()
            self.data = "%c" % key
        if self.data:
            self.loop.exit(0)

    def keyPressEvent(self, event):
        self.process_key(event.key())
        if not self.data:
            QtWidgets.QDialog.keyPressEvent(self, event)

    def get_matrix(self, num):
        self.num = num
        self.refresh()
        self.loop.exec_()


class QtHandler(QtHandlerBase):
    pin_signal = pyqtSignal(object)
    matrix_signal = pyqtSignal(object)
    close_matrix_dialog_signal = pyqtSignal()

    def __init__(self, win, pin_matrix_widget_class, device):
        super(QtHandler, self).__init__(win, device)
        self.pin_signal.connect(self.pin_dialog)
        self.matrix_signal.connect(self.matrix_recovery_dialog)
        self.close_matrix_dialog_signal.connect(self._close_matrix_dialog)
        self.pin_matrix_widget_class = pin_matrix_widget_class
        self.matrix_dialog = None
        self.passphrase_on_device = False

    def get_pin(self, msg):
        self.done.clear()
        self.pin_signal.emit(msg)
        self.done.wait()
        return self.response

    def get_matrix(self, msg):
        self.done.clear()
        self.matrix_signal.emit(msg)
        self.done.wait()
        data = self.matrix_dialog.data
        if data == "x":
            self.close_matrix_dialog()
        return data

    def _close_matrix_dialog(self):
        if self.matrix_dialog:
            self.matrix_dialog.accept()
            self.matrix_dialog = None

    def close_matrix_dialog(self):
        self.close_matrix_dialog_signal.emit()

    def pin_dialog(self, msg):
        # Needed e.g. when resetting a device
        self.clear_dialog()
        dialog = WindowModalDialog(self.top_level_window(), _("Enter PIN"))
        matrix = self.pin_matrix_widget_class()
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(QtWidgets.QLabel(msg))
        vbox.addWidget(matrix)
        vbox.addLayout(Buttons(CancelButton(dialog), OkButton(dialog)))
        dialog.setLayout(vbox)
        dialog.exec_()
        self.response = str(matrix.get_value())
        self.done.set()

    def matrix_recovery_dialog(self, msg):
        if not self.matrix_dialog:
            self.matrix_dialog = MatrixDialog(self.top_level_window())
        self.matrix_dialog.get_matrix(msg)
        self.done.set()

    def passphrase_dialog(self, msg, confirm):
        # If confirm is true, require the user to enter the passphrase twice
        parent = self.top_level_window()
        d = WindowModalDialog(parent, _("Enter Passphrase"))

        OK_button = OkButton(d, _("Enter Passphrase"))
        OnDevice_button = QtWidgets.QPushButton(_("Enter Passphrase on Device"))

        new_pw = PasswordLineEdit()
        conf_pw = PasswordLineEdit()

        vbox = QtWidgets.QVBoxLayout()
        label = QtWidgets.QLabel(msg + "\n")
        label.setWordWrap(True)

        grid = QtWidgets.QGridLayout()
        grid.setSpacing(8)
        grid.setColumnMinimumWidth(0, 150)
        grid.setColumnMinimumWidth(1, 100)
        grid.setColumnStretch(1, 1)

        vbox.addWidget(label)

        grid.addWidget(QtWidgets.QLabel(_("Passphrase:")), 0, 0)
        grid.addWidget(new_pw, 0, 1)

        if confirm:
            grid.addWidget(QtWidgets.QLabel(_("Confirm Passphrase:")), 1, 0)
            grid.addWidget(conf_pw, 1, 1)

        vbox.addLayout(grid)

        def enable_OK():
            if not confirm:
                ok = True
            else:
                ok = new_pw.text() == conf_pw.text()
            OK_button.setEnabled(ok)

        new_pw.textChanged.connect(enable_OK)
        conf_pw.textChanged.connect(enable_OK)

        vbox.addWidget(OK_button)

        if self.passphrase_on_device:
            vbox.addWidget(OnDevice_button)

        d.setLayout(vbox)

        self.passphrase = None

        def ok_clicked():
            self.passphrase = new_pw.text()

        def on_device_clicked():
            self.passphrase = PASSPHRASE_ON_DEVICE

        OK_button.clicked.connect(ok_clicked)
        OnDevice_button.clicked.connect(on_device_clicked)
        OnDevice_button.clicked.connect(d.accept)

        d.exec_()
        self.done.set()


class QtPlugin(QtPluginBase):
    # Derived classes must provide the following class-static variables:
    #   icon_file
    #   pin_matrix_widget_class

    @hook
    def receive_menu(self, menu, addrs, wallet):
        if len(addrs) != 1:
            return
        for keystore in wallet.get_keystores():
            if isinstance(keystore, self.keystore_class):

                def show_address(keystore=keystore):
                    keystore.thread.add(
                        partial(self.show_address, wallet, addrs[0], keystore)
                    )

                device_name = f"{self.device} ({keystore.label})"
                menu.addAction(_(f"Show on {device_name}"), show_address)
                break

    def show_settings_dialog(self, window, keystore):
        def connect():
            device_id = self.choose_device(window, keystore)
            return device_id

        def show_dialog(device_id):
            if device_id:
                SettingsDialog(window, self, keystore, device_id).exec_()

        keystore.thread.add(connect, on_success=show_dialog)

    def request_trezor_init_settings(self, wizard, method, model):
        vbox = QtWidgets.QVBoxLayout()
        next_enabled = True
        label = QtWidgets.QLabel(_("Enter a label to name your device:"))
        name = QtWidgets.QLineEdit()
        hl = QtWidgets.QHBoxLayout()
        hl.addWidget(label)
        hl.addWidget(name)
        hl.addStretch(1)
        vbox.addLayout(hl)

        def clean_text(widget):
            text = widget.toPlainText().strip()
            return " ".join(text.split())

        gb = QtWidgets.QGroupBox()
        hbox1 = QtWidgets.QHBoxLayout()
        gb.setLayout(hbox1)
        vbox.addWidget(gb)
        gb.setTitle(_("Select your seed length:"))
        bg_numwords = QtWidgets.QButtonGroup()
        for i, count in enumerate([12, 18, 24]):
            rb = QtWidgets.QRadioButton(gb)
            rb.setText(_("%d words") % count)
            bg_numwords.addButton(rb)
            bg_numwords.setId(rb, i)
            hbox1.addWidget(rb)
            rb.setChecked(True)
        cb_pin = QtWidgets.QCheckBox(_("Enable PIN protection"))
        cb_pin.setChecked(True)

        vbox.addWidget(WWLabel(RECOMMEND_PIN))
        vbox.addWidget(cb_pin)

        passphrase_msg = WWLabel(PASSPHRASE_HELP_SHORT)
        passphrase_warning = WWLabel(PASSPHRASE_NOT_PIN)
        passphrase_warning.setStyleSheet("color: red")
        cb_phrase = QtWidgets.QCheckBox(_("Enable passphrases"))
        cb_phrase.setChecked(False)
        vbox.addWidget(passphrase_msg)
        vbox.addWidget(passphrase_warning)
        vbox.addWidget(cb_phrase)

        # ask for recovery type (random word order OR matrix)
        if method == TIM_RECOVER and not model == "T":
            gb_rectype = QtWidgets.QGroupBox()
            hbox_rectype = QtWidgets.QHBoxLayout()
            gb_rectype.setLayout(hbox_rectype)
            vbox.addWidget(gb_rectype)
            gb_rectype.setTitle(_("Select recovery type:"))
            bg_rectype = QtWidgets.QButtonGroup()

            rb1 = QtWidgets.QRadioButton(gb_rectype)
            rb1.setText(_("Scrambled words"))
            bg_rectype.addButton(rb1)
            bg_rectype.setId(rb1, RECOVERY_TYPE_SCRAMBLED_WORDS)
            hbox_rectype.addWidget(rb1)
            rb1.setChecked(True)

            rb2 = QtWidgets.QRadioButton(gb_rectype)
            rb2.setText(_("Matrix"))
            bg_rectype.addButton(rb2)
            bg_rectype.setId(rb2, RECOVERY_TYPE_MATRIX)
            hbox_rectype.addWidget(rb2)
        else:
            bg_rectype = None

        wizard.exec_layout(vbox, next_enabled=next_enabled)

        item = bg_numwords.checkedId()
        pin = cb_pin.isChecked()
        recovery_type = bg_rectype.checkedId() if bg_rectype else None

        return (item, name.text(), pin, cb_phrase.isChecked(), recovery_type)


class Plugin(TrezorPlugin, QtPlugin):
    icon_unpaired = ":icons/trezor_unpaired.png"
    icon_paired = ":icons/trezor.png"

    def create_handler(self, window):
        return QtHandler(window, self.pin_matrix_widget_class(), self.device)

    @classmethod
    def pin_matrix_widget_class(self):
        from trezorlib.qt.pinmatrix import PinMatrixWidget

        return PinMatrixWidget


class SettingsDialog(WindowModalDialog):
    """This dialog doesn't require a device be paired with a wallet.
    We want users to be able to wipe a device even if they've forgotten
    their PIN."""

    last_hs_dir = None

    def __init__(self, window, plugin, keystore, device_id):
        title = _("{} Settings").format(plugin.device)
        super(SettingsDialog, self).__init__(window, title)
        self.setMaximumWidth(540)

        devmgr = plugin.device_manager()
        config = devmgr.config
        handler = keystore.handler
        thread = keystore.thread
        is_model_T = (
            devmgr.client_by_id(device_id)
            and devmgr.client_by_id(device_id).features.model == "T"
        )
        if is_model_T:
            hs_cols, hs_rows, hs_mono = 144, 144, False
        else:
            hs_cols, hs_rows, hs_mono = 128, 64, True

        def invoke_client(method, *args, **kw_args):
            unpair_after = kw_args.pop("unpair_after", False)

            def task():
                client = devmgr.client_by_id(device_id)
                if not client:
                    raise RuntimeError("Device not connected")
                if method:
                    getattr(client, method)(*args, **kw_args)
                if unpair_after:
                    devmgr.unpair_id(device_id)
                return client.features

            thread.add(task, on_success=update)

        def update(features):
            self.features = features
            set_label_enabled()
            if features.bootloader_hash:
                bl_hash = bh2u(features.bootloader_hash)
                bl_hash = "\n".join([bl_hash[:32], bl_hash[32:]])
            else:
                bl_hash = "N/A"
            noyes = [_("No"), _("Yes")]
            endis = [_("Enable Passphrases"), _("Disable Passphrases")]
            disen = [_("Disabled"), _("Enabled")]
            setchange = [_("Set a PIN"), _("Change PIN")]

            version = "%d.%d.%d" % (
                features.major_version,
                features.minor_version,
                features.patch_version,
            )

            device_label.setText(features.label)
            pin_set_label.setText(noyes[features.pin_protection])
            passphrases_label.setText(disen[features.passphrase_protection])
            bl_hash_label.setText(bl_hash)
            label_edit.setText(features.label)
            device_id_label.setText(features.device_id)
            initialized_label.setText(noyes[features.initialized])
            version_label.setText(version)
            clear_pin_button.setVisible(features.pin_protection)
            clear_pin_warning.setVisible(features.pin_protection)
            pin_button.setText(setchange[features.pin_protection])
            pin_msg.setVisible(not features.pin_protection)
            passphrase_button.setText(endis[features.passphrase_protection])
            language_label.setText(features.language)

        def set_label_enabled():
            label_apply.setEnabled(label_edit.text() != self.features.label)

        def rename():
            invoke_client("change_label", label_edit.text())

        def toggle_passphrase():
            title = _("Confirm Toggle Passphrase Protection")
            currently_enabled = self.features.passphrase_protection
            if currently_enabled:
                msg = _(
                    "After disabling passphrases, you can only pair this "
                    f"{PROJECT_NAME} wallet if it had an empty passphrase. "
                    "If its passphrase was not empty, you will need to "
                    "create a new wallet with the install wizard. You "
                    "can use this wallet again at any time by re-enabling "
                    "passphrases and entering its passphrase."
                )
            else:
                msg = _(
                    f"Your current {PROJECT_NAME} wallet can only be used "
                    "with an empty passphrase. You must create a separate "
                    "wallet with the install wizard for other passphrases "
                    "as each one generates a new set of addresses."
                )
            msg += "\n\n" + _("Are you sure you want to proceed?")
            if not self.question(msg, title=title):
                return
            invoke_client("toggle_passphrase", unpair_after=currently_enabled)

        def change_homescreen():
            le_dir = (
                (__class__.last_hs_dir and [__class__.last_hs_dir])
                or QStandardPaths.standardLocations(QStandardPaths.DesktopLocation)
                or QStandardPaths.standardLocations(QStandardPaths.PicturesLocation)
                or QStandardPaths.standardLocations(QStandardPaths.HomeLocation)
                or [""]
            )[0]
            filename, __ = QtWidgets.QFileDialog.getOpenFileName(
                self, _("Choose Homescreen"), le_dir
            )

            if not filename:
                return  # user cancelled

            __class__.last_hs_dir = os.path.dirname(
                filename
            )  # remember previous location

            if filename.lower().endswith(".toif") or filename.lower().endswith(".toig"):
                which = filename.lower()[-1].encode(
                    "ascii"
                )  # .toif or .toig = f or g in header
                if which == b"g":
                    # For now I couldn't get Grayscale TOIG to work on any device, disabled
                    handler.show_error(
                        _(
                            "Grayscale TOI files are not currently supported. Try a PNG"
                            " or JPG file instead."
                        )
                    )
                    return
                if not is_model_T:
                    handler.show_error(
                        _(
                            "At this time, only the Trezor Model T supports the direct"
                            " loading of TOIF files. Try a PNG or JPG file instead."
                        )
                    )
                    return
                try:
                    img = open(filename, "rb").read()
                    if img[:8] != b"TOI" + which + int(hs_cols).to_bytes(
                        2, byteorder="little"
                    ) + int(hs_rows).to_bytes(2, byteorder="little"):
                        handler.show_error(
                            _("Image must be a TOI{} file of size {}x{}").format(
                                which.decode("ascii").upper(), hs_cols, hs_rows
                            )
                        )
                        return
                except OSError as e:
                    handler.show_error("Error reading {}: {}".format(filename, e))
                    return
            else:

                def read_and_convert_using_qt_to_raw_mono(
                    handler, filename, hs_cols, hs_rows, invert=True
                ):
                    img = QImage(filename)
                    if img.isNull():
                        handler.show_error(
                            _(
                                "Could not load the image {} -- unknown format or other"
                                " error"
                            ).format(os.path.basename(filename))
                        )
                        return
                    if (img.width(), img.height()) != (
                        hs_cols,
                        hs_rows,
                    ):
                        # force to our dest size. Note that IgnoreAspectRatio guarantess
                        # the right size. Ther other modes don't
                        img = img.scaled(
                            hs_cols,
                            hs_rows,
                            Qt.IgnoreAspectRatio,
                            Qt.SmoothTransformation,
                        )
                        if img.isNull() or (img.width(), img.height()) != (
                            hs_cols,
                            hs_rows,
                        ):
                            handler.show_error(
                                _("Could not scale image to {} x {} pixels").format(
                                    hs_cols, hs_rows
                                )
                            )
                            return
                    bm = QBitmap.fromImage(
                        img, Qt.MonoOnly
                    )  # ensures 1bpp, dithers any colors
                    if bm.isNull():
                        handler.show_error(_("Could not convert image to monochrome"))
                        return
                    target_fmt = QImage.Format_Mono
                    img = bm.toImage().convertToFormat(
                        target_fmt, Qt.MonoOnly | Qt.ThresholdDither | Qt.AvoidDither
                    )  # ensures MSB bytes again (above steps may have twiddled the bytes)
                    lineSzOut = hs_cols // 8  # bits -> num bytes per line
                    bimg = bytearray(hs_rows * lineSzOut)  # 1024 bytes for a 128x64 img
                    bpl = img.bytesPerLine()
                    if bpl < lineSzOut:
                        handler.show_error(_("Internal error converting image"))
                        return
                    # read in 1 scan line at a time since the scan lines may be > our target packed image
                    for row in range(hs_rows):
                        # copy image scanlines 1 line at a time to destination buffer
                        ucharptr = img.constScanLine(
                            row
                        )  # returned type is basically void*
                        ucharptr.setsize(bpl)  # inform python how big this C array is
                        b = bytes(ucharptr)  # aaand.. work with bytes.

                        begin = row * lineSzOut
                        end = begin + lineSzOut
                        bimg[begin:end] = b[0:lineSzOut]
                        if invert:
                            for i in range(begin, end):
                                bimg[i] = ~bimg[i] & 0xFF  # invert b/w
                    return bytes(bimg)

                def read_and_convert_using_qt_to_toif(
                    handler, filename, hs_cols, hs_rows
                ):
                    img = QImage(filename)
                    if img.isNull():
                        handler.show_error(
                            _(
                                "Could not load the image {} -- unknown format or other"
                                " error"
                            ).format(os.path.basename(filename))
                        )
                        return
                    if (img.width(), img.height()) != (
                        hs_cols,
                        hs_rows,
                    ):
                        # force to our dest size. Note that IgnoreAspectRatio
                        # guarantess the right size. Ther other modes don't
                        img = img.scaled(
                            hs_cols,
                            hs_rows,
                            Qt.IgnoreAspectRatio,
                            Qt.SmoothTransformation,
                        )
                        if img.isNull() or (img.width(), img.height()) != (
                            hs_cols,
                            hs_rows,
                        ):
                            handler.show_error(
                                _("Could not scale image to {} x {} pixels").format(
                                    hs_cols, hs_rows
                                )
                            )
                            return
                    target_fmt = QImage.Format_RGB888
                    # dither it down to 256 colors to reduce image complexity then back
                    # up to 24 bit for easy reading
                    img = img.convertToFormat(QImage.Format_Indexed8).convertToFormat(
                        target_fmt
                    )
                    if img.isNull():
                        handler.show_error(_("Could not dither or re-render image"))
                        return

                    def qimg_to_toif(img, handler):
                        try:
                            import struct
                            import zlib
                        except ImportError as e:
                            handler.show_error(
                                _(
                                    "Could not convert image, a required library is"
                                    " missing: {}"
                                ).format(e)
                            )
                            return
                        data, pixeldata = bytearray(), bytearray()
                        data += b"TOIf"
                        for y in range(img.width()):
                            for x in range(img.height()):
                                rgb = img.pixel(x, y)
                                r, g, b = qRed(rgb), qGreen(rgb), qBlue(rgb)
                                c = (
                                    ((r & 0xF8) << 8)
                                    | ((g & 0xFC) << 3)
                                    | ((b & 0xF8) >> 3)
                                )
                                pixeldata += struct.pack(">H", c)
                        z = zlib.compressobj(level=9, wbits=10)
                        zdata = z.compress(bytes(pixeldata)) + z.flush()
                        zdata = zdata[2:-4]  # strip header and checksum
                        data += struct.pack("<HH", img.width(), img.height())
                        data += struct.pack("<I", len(zdata))
                        data += zdata
                        return bytes(data)

                    return qimg_to_toif(img, handler)

                # /read_and_convert_using_qt
                if hs_mono and not is_model_T:
                    img = read_and_convert_using_qt_to_raw_mono(
                        handler, filename, hs_cols, hs_rows
                    )
                else:
                    img = read_and_convert_using_qt_to_toif(
                        handler, filename, hs_cols, hs_rows
                    )
                if not img:
                    return
            invoke_client("change_homescreen", img)

        def clear_homescreen():
            invoke_client("change_homescreen", b"\x00")

        def set_pin():
            invoke_client("set_pin", remove=False)

        def clear_pin():
            invoke_client("set_pin", remove=True)

        def wipe_device():
            wallet = window.wallet
            if wallet and sum(wallet.get_balance()):
                title = _("Confirm Device Wipe")
                msg = _(
                    "Are you SURE you want to wipe the device?\n"
                    "Your wallet still has eCash in it!"
                )
                if not self.question(
                    msg, title=title, icon=QtWidgets.QMessageBox.Critical
                ):
                    return
            invoke_client("wipe_device", unpair_after=True)

        def slider_moved():
            mins = timeout_slider.sliderPosition()
            timeout_minutes.setText(_("%2d minutes") % mins)

        def slider_released():
            config.set_session_timeout(timeout_slider.sliderPosition() * 60)

        # Information tab
        info_tab = QtWidgets.QWidget()
        info_layout = QtWidgets.QVBoxLayout(info_tab)
        info_glayout = QtWidgets.QGridLayout()
        info_glayout.setColumnStretch(2, 1)
        device_label = QtWidgets.QLabel()
        pin_set_label = QtWidgets.QLabel()
        passphrases_label = QtWidgets.QLabel()
        version_label = QtWidgets.QLabel()
        device_id_label = QtWidgets.QLabel()
        bl_hash_label = QtWidgets.QLabel()
        bl_hash_label.setWordWrap(True)
        language_label = QtWidgets.QLabel()
        initialized_label = QtWidgets.QLabel()
        rows = [
            (_("Device Label"), device_label),
            (_("PIN set"), pin_set_label),
            (_("Passphrases"), passphrases_label),
            (_("Firmware Version"), version_label),
            (_("Device ID"), device_id_label),
            (_("Bootloader Hash"), bl_hash_label),
            (_("Language"), language_label),
            (_("Initialized"), initialized_label),
        ]
        for row_num, (label, widget) in enumerate(rows):
            info_glayout.addWidget(QtWidgets.QLabel(label), row_num, 0)
            info_glayout.addWidget(widget, row_num, 1)
        info_layout.addLayout(info_glayout)

        # Settings tab
        settings_tab = QtWidgets.QWidget()
        settings_layout = QtWidgets.QVBoxLayout(settings_tab)
        settings_glayout = QtWidgets.QGridLayout()

        # Settings tab - Label
        label_msg = QtWidgets.QLabel(
            _(
                "Name this {}.  If you have multiple devices "
                "their labels help distinguish them."
            ).format(plugin.device)
        )
        label_msg.setWordWrap(True)
        label_label = QtWidgets.QLabel(_("Device Label"))
        label_edit = QtWidgets.QLineEdit()
        label_edit.setMinimumWidth(150)
        label_edit.setMaxLength(plugin.MAX_LABEL_LEN)
        label_apply = QtWidgets.QPushButton(_("Apply"))
        label_apply.clicked.connect(rename)
        label_edit.textChanged.connect(set_label_enabled)
        settings_glayout.addWidget(label_label, 0, 0)
        settings_glayout.addWidget(label_edit, 0, 1, 1, 2)
        settings_glayout.addWidget(label_apply, 0, 3)
        settings_glayout.addWidget(label_msg, 1, 1, 1, -1)

        # Settings tab - PIN
        pin_label = QtWidgets.QLabel(_("PIN Protection"))
        pin_button = QtWidgets.QPushButton()
        pin_button.clicked.connect(set_pin)
        settings_glayout.addWidget(pin_label, 2, 0)
        settings_glayout.addWidget(pin_button, 2, 1)
        pin_msg = QtWidgets.QLabel(
            _(
                "PIN protection is strongly recommended.  "
                "A PIN is your only protection against someone "
                "stealing your eCash if they obtain physical "
                "access to your {}."
            ).format(plugin.device)
        )
        pin_msg.setWordWrap(True)
        pin_msg.setStyleSheet("color: red")
        settings_glayout.addWidget(pin_msg, 3, 1, 1, -1)

        # Settings tab - Homescreen
        homescreen_label = QtWidgets.QLabel(_("Homescreen"))
        homescreen_change_button = QtWidgets.QPushButton(_("Change..."))
        homescreen_clear_button = QtWidgets.QPushButton(_("Reset"))
        homescreen_change_button.clicked.connect(change_homescreen)
        homescreen_clear_button.clicked.connect(clear_homescreen)
        homescreen_msg = QtWidgets.QLabel(
            _(
                "You can set the homescreen on your "
                "device to personalize it. You can choose any "
                "image and it will be dithered, scaled and "
                "converted to {} x {} {} "
                "for the device."
            ).format(hs_cols, hs_rows, _("monochrome") if hs_mono else _("color"))
        )
        homescreen_msg.setWordWrap(True)
        settings_glayout.addWidget(homescreen_label, 4, 0)
        settings_glayout.addWidget(homescreen_change_button, 4, 1)
        settings_glayout.addWidget(homescreen_clear_button, 4, 2)
        settings_glayout.addWidget(homescreen_msg, 5, 1, 1, -1)

        # Settings tab - Session Timeout
        timeout_label = QtWidgets.QLabel(_("Session Timeout"))
        timeout_minutes = QtWidgets.QLabel()
        timeout_slider = QtWidgets.QSlider(Qt.Horizontal)
        timeout_slider.setRange(1, 60)
        timeout_slider.setSingleStep(1)
        timeout_slider.setTickInterval(5)
        timeout_slider.setTickPosition(QtWidgets.QSlider.TicksBelow)
        timeout_slider.setTracking(True)
        timeout_msg = QtWidgets.QLabel(
            _(
                "Clear the session after the specified period "
                "of inactivity.  Once a session has timed out, "
                "your PIN and passphrase (if enabled) must be "
                "re-entered to use the device."
            )
        )
        timeout_msg.setWordWrap(True)
        timeout_slider.setSliderPosition(config.get_session_timeout() // 60)
        slider_moved()
        timeout_slider.valueChanged.connect(slider_moved)
        timeout_slider.sliderReleased.connect(slider_released)
        settings_glayout.addWidget(timeout_label, 6, 0)
        settings_glayout.addWidget(timeout_slider, 6, 1, 1, 3)
        settings_glayout.addWidget(timeout_minutes, 6, 4)
        settings_glayout.addWidget(timeout_msg, 7, 1, 1, -1)
        settings_layout.addLayout(settings_glayout)
        settings_layout.addStretch(1)

        # Advanced tab
        advanced_tab = QtWidgets.QWidget()
        advanced_layout = QtWidgets.QVBoxLayout(advanced_tab)
        advanced_glayout = QtWidgets.QGridLayout()

        # Advanced tab - clear PIN
        clear_pin_button = QtWidgets.QPushButton(_("Disable PIN"))
        clear_pin_button.clicked.connect(clear_pin)
        clear_pin_warning = QtWidgets.QLabel(
            _(
                "If you disable your PIN, anyone with physical access to your "
                "{} device can spend your eCash."
            ).format(plugin.device)
        )
        clear_pin_warning.setWordWrap(True)
        clear_pin_warning.setStyleSheet("color: red")
        advanced_glayout.addWidget(clear_pin_button, 0, 2)
        advanced_glayout.addWidget(clear_pin_warning, 1, 0, 1, 5)

        # Advanced tab - toggle passphrase protection
        passphrase_button = QtWidgets.QPushButton()
        passphrase_button.clicked.connect(toggle_passphrase)
        passphrase_msg = WWLabel(PASSPHRASE_HELP)
        passphrase_warning = WWLabel(PASSPHRASE_NOT_PIN)
        passphrase_warning.setStyleSheet("color: red")
        advanced_glayout.addWidget(passphrase_button, 3, 2)
        advanced_glayout.addWidget(passphrase_msg, 4, 0, 1, 5)
        advanced_glayout.addWidget(passphrase_warning, 5, 0, 1, 5)

        # Advanced tab - wipe device
        wipe_device_button = QtWidgets.QPushButton(_("Wipe Device"))
        wipe_device_button.clicked.connect(wipe_device)
        wipe_device_msg = QtWidgets.QLabel(
            _(
                "Wipe the device, removing all data from it.  The firmware "
                "is left unchanged."
            )
        )
        wipe_device_msg.setWordWrap(True)
        wipe_device_warning = QtWidgets.QLabel(
            _(
                "Only wipe a device if you have the recovery seed written down "
                "and the device wallet(s) are empty, otherwise the eCash will "
                "be lost forever."
            )
        )
        wipe_device_warning.setWordWrap(True)
        wipe_device_warning.setStyleSheet("color: red")
        advanced_glayout.addWidget(wipe_device_button, 6, 2)
        advanced_glayout.addWidget(wipe_device_msg, 7, 0, 1, 5)
        advanced_glayout.addWidget(wipe_device_warning, 8, 0, 1, 5)
        advanced_layout.addLayout(advanced_glayout)
        advanced_layout.addStretch(1)

        tabs = QtWidgets.QTabWidget(self)
        tabs.addTab(info_tab, _("Information"))
        tabs.addTab(settings_tab, _("Settings"))
        tabs.addTab(advanced_tab, _("Advanced"))
        dialog_vbox = QtWidgets.QVBoxLayout(self)
        dialog_vbox.addWidget(tabs)
        dialog_vbox.addLayout(Buttons(CloseButton(self)))

        # Update information
        invoke_client(None)
