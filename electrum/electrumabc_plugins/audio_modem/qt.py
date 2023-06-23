import json
import platform
import sys
import zlib
from functools import partial
from io import BytesIO

from PyQt5 import QtWidgets
from PyQt5.QtGui import QIcon

from electrumabc.i18n import _
from electrumabc.plugins import BasePlugin, hook
from electrumabc.printerror import print_error, print_msg
from electrumabc_gui.qt.util import EnterButton, WaitingDialog, WindowModalDialog

PLATFORM_LIBS = {
    "Linux": "libportaudio.so",
}

err_reason = "Audio MODEM is available."

if platform.system() in PLATFORM_LIBS:
    try:
        import amodem.audio
        import amodem.config
        import amodem.main

        print_error(err_reason)
        amodem.log.addHandler(amodem.logging.StreamHandler(sys.stderr))
        amodem.log.setLevel(amodem.logging.INFO)
    except ImportError:
        amodem = None
        err_reason = "Audio MODEM is not found."
        print_error(err_reason)
else:
    amodem = None
    err_reason = "Audio modem plugin is not available for this platform"
    print_error(err_reason)


class Plugin(BasePlugin):
    def __init__(self, parent, config, name):
        BasePlugin.__init__(self, parent, config, name)
        if self.is_available():
            self.modem_config = amodem.config.slowest()
            self.library_name = PLATFORM_LIBS[platform.system()]

    def is_available(self):
        return amodem is not None

    def requires_settings(self):
        return True

    def settings_widget(self, window):
        return EnterButton(_("Settings"), partial(self.settings_dialog, window))

    def settings_dialog(self, window):
        if not self.is_available():
            window.show_error(err_reason)
            return
        d = WindowModalDialog(window, _("Audio Modem Settings"))

        layout = QtWidgets.QGridLayout(d)
        layout.addWidget(QtWidgets.QLabel(_("Bit rate [kbps]: ")), 0, 0)

        bitrates = sorted(amodem.config.bitrates.keys())

        def _index_changed(index):
            bitrate = bitrates[index]
            self.modem_config = amodem.config.bitrates[bitrate]

        combo = QtWidgets.QComboBox()
        combo.addItems([str(x) for x in bitrates])
        combo.currentIndexChanged.connect(_index_changed)
        layout.addWidget(combo, 0, 1)

        ok_button = QtWidgets.QPushButton(_("OK"))
        ok_button.clicked.connect(d.accept)
        layout.addWidget(ok_button, 1, 1)

        return bool(d.exec_())

    @hook
    def transaction_dialog(self, dialog):
        b = QtWidgets.QPushButton()
        b.setIcon(QIcon(":icons/speaker.png"))

        def handler():
            blob = json.dumps(dialog.tx.as_dict())
            self._send(parent=dialog, blob=blob)

        b.clicked.connect(handler)
        dialog.sharing_buttons.insert(-1, b)

    @hook
    def scan_text_edit(self, parent):
        parent.addButton(
            ":icons/microphone.png",
            partial(self._recv, parent),
            _("Read from microphone"),
        )

    @hook
    def show_text_edit(self, parent):
        def handler():
            blob = str(parent.toPlainText())
            self._send(parent=parent, blob=blob)

        parent.addButton(":icons/speaker.png", handler, _("Send to speaker"))

    def _audio_interface(self):
        interface = amodem.audio.Interface(config=self.modem_config)
        return interface.load(self.library_name)

    def _send(self, parent, blob):
        def sender_thread():
            with self._audio_interface() as interface:
                src = BytesIO(blob)
                dst = interface.player()
                amodem.main.send(config=self.modem_config, src=src, dst=dst)

        print_msg("Sending:", repr(blob))
        blob = zlib.compress(blob.encode("ascii"))

        kbps = self.modem_config.modem_bps / 1e3
        msg = "Sending to Audio MODEM ({0:.1f} kbps)...".format(kbps)
        WaitingDialog(parent, msg, sender_thread)

    def _recv(self, parent):
        def receiver_thread():
            with self._audio_interface() as interface:
                src = interface.recorder()
                dst = BytesIO()
                amodem.main.recv(config=self.modem_config, src=src, dst=dst)
                return dst.getvalue()

        def on_finished(blob):
            if blob:
                blob = zlib.decompress(blob).decode("ascii")
                print_msg("Received:", repr(blob))
                parent.setText(blob)

        kbps = self.modem_config.modem_bps / 1e3
        msg = "Receiving from Audio MODEM ({0:.1f} kbps)...".format(kbps)
        WaitingDialog(parent, msg, receiver_thread, on_finished)
