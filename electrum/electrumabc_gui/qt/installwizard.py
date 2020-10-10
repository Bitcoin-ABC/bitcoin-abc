# -*- mode: python3 -*-
from __future__ import annotations

import os
import random
import sys
import tempfile
import threading
import time
import traceback
from typing import TYPE_CHECKING, Optional, Tuple

from PyQt5 import QtWidgets
from PyQt5.QtCore import QEventLoop, QRect, Qt, QThread, pyqtSignal
from PyQt5.QtGui import QIcon, QPainter, QPalette, QPen

from electrumabc import keystore
from electrumabc.base_wizard import HWD_SETUP_DECRYPT_WALLET, BaseWizard, GoBack
from electrumabc.constants import PROJECT_NAME
from electrumabc.i18n import _
from electrumabc.network import Network
from electrumabc.storage import WalletStorage
from electrumabc.util import (
    InvalidPassword,
    TimeoutException,
    UserCancelled,
    WalletFileException,
    finalization_print_error,
)
from electrumabc.wallet import AbstractWallet, StandardWallet

from .bip38_importer import Bip38Importer
from .network_dialog import NetworkChoiceLayout
from .password_dialog import PW_NEW, PasswordLayout, PasswordLayoutForHW
from .seed_dialog import KeysLayout, SeedLayout
from .util import (
    Buttons,
    CancelButton,
    ChoicesLayout,
    MessageBoxMixin,
    OkButton,
    PasswordLineEdit,
    WWLabel,
    char_width_in_lineedit,
    destroyed_print_error,
)

if TYPE_CHECKING:
    from electrumabc.plugins import Plugins
    from electrumabc.simple_config import SimpleConfig

    from . import ElectrumGui


MSG_ENTER_PASSWORD = (
    _("Choose a password to encrypt your wallet keys.")
    + "\n"
    + _("Leave this field empty if you want to disable encryption.")
)
MSG_HW_STORAGE_ENCRYPTION = (
    _("Set wallet file encryption.")
    + "\n"
    + _("Your wallet file does not contain secrets, mostly just metadata. ")
    + _("It also contains your master public key that allows watching your addresses.")
    + "\n\n"
    + _(
        "Note: If you enable this setting, you will need your hardware device to open"
        " your wallet."
    )
)


class CosignWidget(QtWidgets.QWidget):
    size = 120

    def __init__(self, m, n):
        QtWidgets.QWidget.__init__(self)
        self.R = QRect(0, 0, self.size, self.size)
        self.setGeometry(self.R)
        self.setMinimumHeight(self.size)
        self.setMaximumHeight(self.size)
        self.m = m
        self.n = n

    def set_n(self, n):
        self.n = n
        self.update()

    def set_m(self, m):
        self.m = m
        self.update()

    def paintEvent(self, event):
        bgcolor = self.palette().color(QPalette.Background)
        pen = QPen(bgcolor, 7, Qt.SolidLine)
        qp = QPainter()
        qp.begin(self)
        qp.setPen(pen)
        qp.setRenderHint(QPainter.Antialiasing)
        qp.setBrush(Qt.gray)
        for i in range(self.n):
            alpha = int(16 * 360 * i / self.n)
            alpha2 = int(16 * 360 * 1 / self.n)
            qp.setBrush(Qt.green if i < self.m else Qt.gray)
            qp.drawPie(self.R, alpha, alpha2)
        qp.end()


def wizard_dialog(func):
    def func_wrapper(*args, **kwargs):
        run_next = kwargs["run_next"]
        wizard: InstallWizard = args[0]
        wizard.back_button.setText(_("Back") if wizard.can_go_back() else _("Cancel"))
        try:
            out = func(*args, **kwargs)
            if type(out) is not tuple:
                out = (out,)
            run_next(*out)
        except GoBack:
            if wizard.can_go_back():
                wizard.go_back()
                return
            else:
                wizard.close()
                raise

    return func_wrapper


class WalletAlreadyOpenInMemory(Exception):
    def __init__(self, wallet: AbstractWallet):
        super().__init__()
        self.wallet = wallet


# WindowModalDialog must come first as it overrides show_error
class InstallWizard(QtWidgets.QDialog, MessageBoxMixin, BaseWizard):
    accept_signal = pyqtSignal()

    def __init__(
        self,
        config: SimpleConfig,
        app: QtWidgets.QApplication,
        plugins: Plugins,
        *,
        gui_object: ElectrumGui,
    ):
        BaseWizard.__init__(self, config)
        QtWidgets.QDialog.__init__(self, None)
        self.setWindowTitle(f"{PROJECT_NAME}  -  " + _("Install Wizard"))
        self.app = app
        self.config = config
        self.gui_thread = gui_object.gui_thread
        # Set for base base class
        self.plugins = plugins
        self.setMinimumSize(600, 400)
        self.accept_signal.connect(self.accept)
        self.title = QtWidgets.QLabel()
        self.main_widget = QtWidgets.QWidget()
        self.back_button = QtWidgets.QPushButton(_("Back"), self)
        self.back_button.setText(_("Back") if self.can_go_back() else _("Cancel"))
        self.next_button = QtWidgets.QPushButton(_("Next"), self)
        self.next_button.setDefault(True)
        self.logo = QtWidgets.QLabel()
        self.please_wait = QtWidgets.QLabel(_("Please wait..."))
        self.please_wait.setAlignment(Qt.AlignCenter)
        self.icon_filename = None
        self.loop = QEventLoop()
        self.rejected.connect(lambda: self.loop.exit(0))
        self.back_button.clicked.connect(lambda: self.loop.exit(1))
        self.next_button.clicked.connect(lambda: self.loop.exit(2))
        outer_vbox = QtWidgets.QVBoxLayout(self)
        inner_vbox = QtWidgets.QVBoxLayout()
        inner_vbox.addWidget(self.title)
        inner_vbox.addWidget(self.main_widget)
        inner_vbox.addStretch(1)
        inner_vbox.addWidget(self.please_wait)
        inner_vbox.addStretch(1)
        scroll_widget = QtWidgets.QWidget()
        scroll_widget.setLayout(inner_vbox)
        scroll = QtWidgets.QScrollArea()
        scroll.setWidget(scroll_widget)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setWidgetResizable(True)
        icon_vbox = QtWidgets.QVBoxLayout()
        icon_vbox.addWidget(self.logo)
        icon_vbox.addStretch(1)
        hbox = QtWidgets.QHBoxLayout()
        hbox.addLayout(icon_vbox)
        hbox.addSpacing(5)
        hbox.addWidget(scroll)
        hbox.setStretchFactor(scroll, 1)
        outer_vbox.addLayout(hbox)
        outer_vbox.addLayout(Buttons(self.back_button, self.next_button))
        self.set_icon(":icons/electrumABC.svg")
        self.show()
        self.raise_()

        # Track object lifecycle
        finalization_print_error(self)

    def select_storage(
        self, path, get_wallet_from_daemon
    ) -> Tuple[str, Optional[WalletStorage]]:
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(
            QtWidgets.QLabel(
                _("Create a new wallet or load an existing wallet from file.")
            )
        )
        vbox.addSpacing(20)

        hbox = QtWidgets.QHBoxLayout()
        hbox.addWidget(QtWidgets.QLabel(_("Wallet name") + ":"))
        self.name_e = QtWidgets.QLineEdit()
        self.name_e.setToolTip(
            _("Enter a wallet name (new or existing), or the path to a wallet file.")
        )
        hbox.addWidget(self.name_e)
        button = QtWidgets.QPushButton(_("Load..."))
        button.setToolTip(_("Open a file selection dialog to load a wallet file."))
        hbox.addWidget(button)
        vbox.addLayout(hbox)
        vbox.addSpacing(20)

        self.msg_label = QtWidgets.QLabel("")
        vbox.addWidget(self.msg_label)
        hbox2 = QtWidgets.QHBoxLayout()
        self.pw_e = PasswordLineEdit("", self)
        self.pw_e.setFixedWidth(17 * char_width_in_lineedit())
        self.pw_label = QtWidgets.QLabel(_("Password") + ":")
        hbox2.addWidget(self.pw_label)
        hbox2.addWidget(self.pw_e)
        hbox2.addStretch()
        vbox.addLayout(hbox2)
        self.set_layout(vbox, title=_(f"{PROJECT_NAME} wallet"))

        self.temp_storage = WalletStorage(path, manual_upgrades=True)
        wallet_folder = os.path.dirname(self.temp_storage.path)

        def on_choose():
            path, __ = QtWidgets.QFileDialog.getOpenFileName(
                self, _("Select your wallet file"), wallet_folder
            )
            if path:
                self.name_e.setText(path)

        def on_filename(filename):
            path = os.path.join(wallet_folder, filename)
            wallet_from_memory = get_wallet_from_daemon(path)
            try:
                if wallet_from_memory:
                    self.temp_storage = wallet_from_memory.storage
                else:
                    self.temp_storage = WalletStorage(path, manual_upgrades=True)
                self.next_button.setEnabled(True)
            except IOError:
                self.temp_storage = None
                self.next_button.setEnabled(False)
            user_needs_to_enter_password = False
            if self.temp_storage:
                if not self.temp_storage.file_exists():
                    msg = (
                        _("This file does not exist.")
                        + "\n"
                        + _(
                            "Press 'Next' to create this wallet, or choose another"
                            " file."
                        )
                    )
                elif not wallet_from_memory:
                    if self.temp_storage.is_encrypted_with_user_pw():
                        msg = (
                            _("This file is encrypted with a password.")
                            + "\n"
                            + _("Enter your password or choose another file.")
                        )
                        user_needs_to_enter_password = True
                    elif self.temp_storage.is_encrypted_with_hw_device():
                        msg = (
                            _("This file is encrypted using a hardware device.")
                            + "\n"
                            + _("Press 'Next' to choose device to decrypt.")
                        )
                    else:
                        msg = _("Press 'Next' to open this wallet.")
                else:
                    msg = (
                        _("This file is already open in memory.")
                        + "\n"
                        + _("Press 'Next' to create/focus window.")
                    )
            else:
                msg = _("Cannot read file")
            self.msg_label.setText(msg)
            if user_needs_to_enter_password:
                self.pw_label.show()
                self.pw_e.show()
                self.pw_e.setFocus()
            else:
                self.pw_label.hide()
                self.pw_e.hide()

        button.clicked.connect(on_choose)
        self.name_e.textChanged.connect(on_filename)
        n = os.path.basename(self.temp_storage.path)
        self.name_e.setText(n)

        while True:
            if self.loop.exec_() != 2:  # 2 = next
                raise UserCancelled
            if self.temp_storage.file_exists() and not self.temp_storage.is_encrypted():
                break
            if not self.temp_storage.file_exists():
                break
            wallet_from_memory = get_wallet_from_daemon(self.temp_storage.path)
            if wallet_from_memory:
                raise WalletAlreadyOpenInMemory(wallet_from_memory)
            if self.temp_storage.file_exists() and self.temp_storage.is_encrypted():
                if self.temp_storage.is_encrypted_with_user_pw():
                    password = self.pw_e.text()
                    try:
                        self.temp_storage.decrypt(password)
                        break
                    except InvalidPassword as e:
                        QtWidgets.QMessageBox.information(None, _("Error"), str(e))
                        continue
                    except Exception as e:
                        traceback.print_exc(file=sys.stdout)
                        QtWidgets.QMessageBox.information(None, _("Error"), str(e))
                        raise UserCancelled()
                elif self.temp_storage.is_encrypted_with_hw_device():
                    try:
                        self.run(
                            "choose_hw_device",
                            HWD_SETUP_DECRYPT_WALLET,
                            storage=self.temp_storage,
                        )
                    except InvalidPassword:
                        QtWidgets.QMessageBox.information(
                            None,
                            _("Error"),
                            _("Failed to decrypt using this hardware device.")
                            + "\n"
                            + _("If you use a passphrase, make sure it is correct."),
                        )
                        self.reset_stack()
                        return self.select_storage(path, get_wallet_from_daemon)
                    except (UserCancelled, GoBack):
                        raise
                    except Exception as e:
                        traceback.print_exc(file=sys.stdout)
                        QtWidgets.QMessageBox.information(None, _("Error"), str(e))
                        raise UserCancelled()
                    if self.temp_storage.is_past_initial_decryption():
                        break
                    else:
                        raise UserCancelled()
                else:
                    raise Exception("Unexpected encryption version")
        return self.temp_storage.path, (
            self.temp_storage if self.temp_storage.file_exists() else None
        )

    def run_upgrades(self, storage):
        path = storage.path
        if storage.requires_split():
            self.hide()
            msg = _(
                "The wallet '{}' contains multiple accounts, which are no longer"
                " supported since Electrum 2.7.\n\nDo you want to split your wallet"
                " into multiple files?"
            ).format(path)
            if not self.question(msg):
                return
            file_list = "\n".join(storage.split_accounts())
            msg = (
                _("Your accounts have been moved to")
                + ":\n"
                + file_list
                + "\n\n"
                + _("Do you want to delete the old file")
                + ":\n"
                + path
            )
            if self.question(msg):
                os.remove(path)
                self.show_warning(_("The file was removed"))
            # raise now, to avoid having the old storage opened
            raise UserCancelled()

        action = storage.get_action()
        if action and storage.requires_upgrade():
            raise WalletFileException("Incomplete wallet files cannot be upgraded.")
        if action:
            self.hide()
            msg = _(
                "The file '{}' contains an incompletely created wallet.\n"
                "Do you want to complete its creation now?"
            ).format(path)
            if not self.question(msg):
                if self.question(_("Do you want to delete '{}'?").format(path)):
                    os.remove(path)
                    self.show_warning(_("The file was removed"))
                return
            self.show()
            self.data = storage.db.data

            self.run(action)
            for k, v in self.data.items():
                storage.put(k, v)
            storage.write()
            return

        if storage.requires_upgrade():
            self.upgrade_storage(storage)

    def on_error(self, exc_info):
        if not isinstance(exc_info[1], UserCancelled):
            traceback.print_exception(*exc_info)
            self.show_error(str(exc_info[1]))

    def set_icon(self, filename):
        prior_filename, self.icon_filename = self.icon_filename, filename
        self.logo.setPixmap(QIcon(filename).pixmap(60))
        return prior_filename

    def set_layout(self, layout, title=None, next_enabled=True):
        self.title.setText("<b>%s</b>" % title if title else "")
        self.title.setVisible(bool(title))
        # Get rid of any prior layout by assigning it to a temporary widget
        prior_layout = self.main_widget.layout()
        if prior_layout:
            QtWidgets.QWidget().setLayout(prior_layout)
        self.main_widget.setLayout(layout)
        self.back_button.setEnabled(True)
        self.next_button.setEnabled(next_enabled)
        if next_enabled:
            self.next_button.setFocus()
        self.main_widget.setVisible(True)
        self.please_wait.setVisible(False)

    def exec_layout(self, layout, title=None, raise_on_cancel=True, next_enabled=True):
        self.set_layout(layout, title, next_enabled)
        result = self.loop.exec_()
        if not result and raise_on_cancel:
            raise UserCancelled
        if result == 1:
            raise GoBack from None
        self.title.setVisible(False)
        self.back_button.setEnabled(False)
        self.next_button.setEnabled(False)
        self.main_widget.setVisible(False)
        self.please_wait.setVisible(True)
        self.refresh_gui()
        return result

    def refresh_gui(self):
        # For some reason, to refresh the GUI this needs to be called twice
        self.app.processEvents()
        self.app.processEvents()

    def remove_from_recently_open(self, filename):
        self.config.remove_from_recently_open(filename)

    def text_input(self, title, message, is_valid, allow_multi=False):
        slayout = KeysLayout(
            parent=self, title=message, is_valid=is_valid, allow_multi=allow_multi
        )
        self.exec_layout(slayout, title, next_enabled=False)
        return slayout.get_text()

    def seed_input(self, title, message, is_seed, options):
        slayout = SeedLayout(
            title=message, is_seed=is_seed, options=options, parent=self, editable=True
        )
        self.exec_layout(slayout, title, next_enabled=False)
        return slayout.get_seed(), slayout.seed_type, slayout.is_ext

    def bip38_prompt_for_pw(self, bip38_keys):
        """Reimplemented from basewizard superclass. Expected to return the pw
        dict or None."""
        d = Bip38Importer(bip38_keys, parent=self.top_level_window())
        d.exec_()
        d.setParent(None)  # python GC quicker if this happens
        return d.decoded_keys  # dict will be empty if user cancelled

    @wizard_dialog
    def add_xpub_dialog(self, title, message, is_valid, run_next, allow_multi=False):
        return self.text_input(title, message, is_valid, allow_multi)

    @wizard_dialog
    def add_cosigner_dialog(self, run_next, index, is_valid):
        title = _("Add Cosigner") + " %d" % index
        message = " ".join(
            [
                _("Please enter the master public key (xpub) of your cosigner."),
                _(
                    "Enter their master private key (xprv) if you want to be able to"
                    " sign for them."
                ),
            ]
        )
        return self.text_input(title, message, is_valid)

    @wizard_dialog
    def restore_seed_dialog(self, run_next, test):
        options = []
        if self.opt_ext:
            options.append("ext")
        if self.opt_bip39:
            options.append("bip39")
        if self.opt_slip39:
            options.append("slip39")
        title = _("Enter Seed")
        message = _("Please enter your seed phrase in order to restore your wallet.")
        return self.seed_input(title, message, test, options)

    @wizard_dialog
    def confirm_seed_dialog(self, run_next, test):
        self.app.clipboard().clear()
        title = _("Confirm Seed")
        message = " ".join(
            [
                _("Your seed is important!"),
                _("If you lose your seed, your money will be permanently lost."),
                _(
                    "To make sure that you have properly saved your seed, please retype"
                    " it here."
                ),
            ]
        )
        seed, seed_type, is_ext = self.seed_input(title, message, test, None)
        return seed

    @wizard_dialog
    def show_seed_dialog(self, run_next, seed_text, editable=True):
        title = _("Your wallet generation seed is:")
        slayout = SeedLayout(
            seed=seed_text, title=title, msg=True, options=["ext"], editable=False
        )
        self.exec_layout(slayout)
        return slayout.is_ext

    def pw_layout(self, msg, kind, force_disable_encrypt_cb):
        playout = PasswordLayout(
            msg=msg,
            kind=kind,
            OK_button=self.next_button,
            force_disable_encrypt_cb=force_disable_encrypt_cb,
        )
        playout.encrypt_cb.setChecked(True)
        self.exec_layout(playout.layout())
        return playout.new_password(), playout.encrypt_cb.isChecked()

    @wizard_dialog
    def request_password(self, run_next, force_disable_encrypt_cb=False):
        """Request the user enter a new password and confirm it.  Return
        the password or None for no password.  Note that this dialog screen
        cannot go back, and instead the user can only cancel."""
        return self.pw_layout(MSG_ENTER_PASSWORD, PW_NEW, force_disable_encrypt_cb)

    @wizard_dialog
    def request_storage_encryption(self, run_next):
        playout = PasswordLayoutForHW(MSG_HW_STORAGE_ENCRYPTION)
        playout.encrypt_cb.setChecked(True)
        self.exec_layout(playout.layout())
        return playout.encrypt_cb.isChecked()

    @staticmethod
    def _add_extra_button_to_layout(extra_button, layout):
        if not isinstance(extra_button, (list, tuple)) or not len(extra_button) == 2:
            return
        but_title, but_action = extra_button
        hbox = QtWidgets.QHBoxLayout()
        hbox.setContentsMargins(12, 24, 12, 12)
        but = QtWidgets.QPushButton(but_title)
        hbox.addStretch(1)
        hbox.addWidget(but)
        layout.addLayout(hbox)
        but.clicked.connect(but_action)

    @wizard_dialog
    def confirm_dialog(self, title, message, run_next, extra_button=None):
        self.confirm(message, title, extra_button=extra_button)

    def confirm(self, message, title, extra_button=None):
        label = WWLabel(message)

        textInteractionFlags = (
            Qt.LinksAccessibleByMouse
            | Qt.TextSelectableByMouse
            | Qt.TextSelectableByKeyboard
            | Qt.LinksAccessibleByKeyboard
        )
        label.setTextInteractionFlags(textInteractionFlags)
        label.setOpenExternalLinks(True)

        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(label)
        if extra_button:
            self._add_extra_button_to_layout(extra_button, vbox)
        self.exec_layout(vbox, title)

    @wizard_dialog
    def action_dialog(self, action, run_next):
        self.run(action)

    def terminate(self, **kwargs):
        self.accept_signal.emit()

    def run_task_without_blocking_gui(self, task, *, msg=None):
        assert (
            self.gui_thread == threading.current_thread()
        ), "must be called from GUI thread"
        if msg is None:
            msg = _("Please wait...")

        exc: Optional[Exception] = None
        res = None

        def task_wrapper():
            nonlocal exc
            nonlocal res
            try:
                task()
            except Exception as e:
                exc = e

        self.waiting_dialog(task_wrapper, msg=msg)
        if exc is None:
            return res
        else:
            raise exc

    def waiting_dialog(self, task, msg, on_finished=None):
        label = WWLabel(msg)
        vbox = QtWidgets.QVBoxLayout()
        vbox.addSpacing(100)
        label.setMinimumWidth(300)
        label.setAlignment(Qt.AlignCenter)
        vbox.addWidget(label)
        self.set_layout(vbox, next_enabled=False)
        self.back_button.setEnabled(False)

        t = threading.Thread(target=task)
        t.start()
        while True:
            t.join(1.0 / 60)
            if t.is_alive():
                self.refresh_gui()
            else:
                break
        if on_finished:
            on_finished()

    @wizard_dialog
    def choice_dialog(self, title, message, choices, run_next, extra_button=None):
        c_values = [x[0] for x in choices]
        c_titles = [x[1] for x in choices]
        clayout = ChoicesLayout(message, c_titles)
        vbox = QtWidgets.QVBoxLayout()
        vbox.addLayout(clayout.layout())
        if extra_button:
            self._add_extra_button_to_layout(extra_button, vbox)
        self.exec_layout(vbox, title)
        action = c_values[clayout.selected_index()]
        return action

    def query_choice(self, msg, choices):
        """called by hardware wallets"""
        clayout = ChoicesLayout(msg, choices)
        vbox = QtWidgets.QVBoxLayout()
        vbox.addLayout(clayout.layout())
        self.exec_layout(vbox, "")
        return clayout.selected_index()

    @wizard_dialog
    def line_dialog(self, run_next, title, message, default, test, warning=""):
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(WWLabel(message))
        line = QtWidgets.QLineEdit()
        line.setText(default)

        def f(text):
            self.next_button.setEnabled(test(text))

        line.textEdited.connect(f)
        vbox.addWidget(line)
        vbox.addWidget(WWLabel(warning))
        self.exec_layout(vbox, title, next_enabled=test(default))
        return " ".join(line.text().split())

    @wizard_dialog
    def derivation_path_dialog(
        self,
        run_next,
        title,
        message,
        default,
        test,
        warning="",
        bip32_seed: bytes = b"",
        scannable=False,
    ):
        def on_derivation_scan(derivation_line):
            derivation_scan_dialog = DerivationDialog(
                self, bip32_seed, DerivationPathScanner.DERIVATION_PATHS
            )
            destroyed_print_error(derivation_scan_dialog)
            selected_path = derivation_scan_dialog.get_selected_path()
            if selected_path:
                derivation_line.setText(selected_path)
            derivation_scan_dialog.deleteLater()

        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(WWLabel(message))
        line = QtWidgets.QLineEdit()
        line.setText(default)

        def f(text):
            self.next_button.setEnabled(test(text))

        line.textEdited.connect(f)
        vbox.addWidget(line)
        vbox.addWidget(WWLabel(warning))

        if scannable:
            hbox = QtWidgets.QHBoxLayout()
            hbox.setContentsMargins(12, 24, 12, 12)
            but = QtWidgets.QPushButton(_("Scan Derivation Paths..."))
            hbox.addStretch(1)
            hbox.addWidget(but)
            vbox.addLayout(hbox)
            but.clicked.connect(lambda: on_derivation_scan(line))

        self.exec_layout(vbox, title, next_enabled=test(default))
        return " ".join(line.text().split())

    @wizard_dialog
    def show_xpub_dialog(self, xpub, run_next):
        msg = " ".join(
            [
                _("Here is your master public key."),
                _("Please share it with your cosigners."),
            ]
        )
        vbox = QtWidgets.QVBoxLayout()
        layout = SeedLayout(xpub, title=msg, icon=False)
        vbox.addLayout(layout.layout())
        self.exec_layout(vbox, _("Master Public Key"))
        return None

    def init_network(self, network):
        message = _(
            f"{PROJECT_NAME} communicates with remote servers to get "
            "information about your transactions and addresses. The "
            "servers all fulfil the same purpose only differing in "
            f"hardware. In most cases you simply want to let {PROJECT_NAME} "
            "pick one at random.  However if you prefer feel free to "
            "select a server manually."
        )
        choices = [_("Auto connect"), _("Select server manually")]
        title = _("How do you want to connect to a server? ")
        clayout = ChoicesLayout(message, choices)
        self.back_button.setText(_("Cancel"))
        self.exec_layout(clayout.layout(), title)
        r = clayout.selected_index()
        network.auto_connect = r == 0
        self.config.set_key("auto_connect", network.auto_connect, True)
        if r == 1:
            nlayout = NetworkChoiceLayout(self, network, self.config, wizard=True)
            if self.exec_layout(nlayout.layout()):
                nlayout.accept()

    @wizard_dialog
    def multisig_dialog(self, run_next):
        cw = CosignWidget(2, 2)
        m_edit = QtWidgets.QSlider(Qt.Horizontal, self)
        n_edit = QtWidgets.QSlider(Qt.Horizontal, self)
        n_edit.setMinimum(1)
        n_edit.setMaximum(15)
        m_edit.setMinimum(1)
        m_edit.setMaximum(2)
        n_edit.setValue(2)
        m_edit.setValue(2)
        n_label = QtWidgets.QLabel()
        m_label = QtWidgets.QLabel()
        grid = QtWidgets.QGridLayout()
        grid.addWidget(n_label, 0, 0)
        grid.addWidget(n_edit, 0, 1)
        grid.addWidget(m_label, 1, 0)
        grid.addWidget(m_edit, 1, 1)

        def on_m(m):
            m_label.setText(_("Require %d signatures") % m)
            cw.set_m(m)

        def on_n(n):
            n_label.setText(_("From %d cosigners") % n)
            cw.set_n(n)
            m_edit.setMaximum(n)

        n_edit.valueChanged.connect(on_n)
        m_edit.valueChanged.connect(on_m)
        on_n(2)
        on_m(2)
        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(cw)
        vbox.addWidget(
            WWLabel(
                _(
                    "Choose the number of signatures needed to unlock funds in your"
                    " wallet:"
                )
            )
        )
        vbox.addLayout(grid)
        self.exec_layout(vbox, _("Multi-Signature Wallet"))
        m = int(m_edit.value())
        n = int(n_edit.value())
        return (m, n)

    linux_hw_wallet_support_dialog = None

    def on_hw_wallet_support(self):
        """Overrides base wizard's noop impl."""
        if sys.platform.startswith("linux"):
            if self.linux_hw_wallet_support_dialog:
                self.linux_hw_wallet_support_dialog.raise_()
                return
            # NB: this should only be imported from Linux
            from . import udev_installer

            self.linux_hw_wallet_support_dialog = (
                udev_installer.InstallHardwareWalletSupportDialog(
                    self.top_level_window(), self.plugins
                )
            )
            self.linux_hw_wallet_support_dialog.exec_()
            self.linux_hw_wallet_support_dialog.setParent(None)
            self.linux_hw_wallet_support_dialog = None
        else:
            self.show_error("Linux only facility. FIXME!")


class DerivationPathScanner(QThread):
    DERIVATION_PATHS = [
        keystore.bip44_derivation_xec(0),
        keystore.bip44_derivation_xec_tokens(0),
        keystore.bip44_derivation_bch(0),
        keystore.bip44_derivation_btc(0),
        keystore.bip44_derivation_bch_tokens(0),
        "m/144'/44'/0'",
        "m/144'/0'/0'",
        "m/44'/0'/0'/0",
        "m/0",
        "m/0'",
        "m/0'/0",
        "m/0'/0'",
        "m/0'/0'/0'",
        "m/44'/145'/0'/0",
        "m/44'/245'/0",
        "m/44'/245'/0'/0",
        "m/49'/0'/0'",
        "m/84'/0'/0'",
    ]

    def __init__(self, parent, bip32_seed: bytes, config, update_table_cb):
        QThread.__init__(self, parent)
        self.update_table_cb = update_table_cb
        self.bip32_seed = bip32_seed
        self.config = config
        self.aborting = False

    def notify_offline(self):
        for i, p in enumerate(self.DERIVATION_PATHS):
            self.update_table_cb(i, _("Offline"))

    def run(self):
        network = Network.get_instance()
        if not network:
            self.notify_offline()
            return

        for i, p in enumerate(self.DERIVATION_PATHS):
            if self.aborting:
                return
            k = keystore.from_bip32_seed_and_derivation(self.bip32_seed, derivation=p)
            p_safe = p.replace("/", "_").replace("'", "h")
            storage_path = os.path.join(
                tempfile.gettempdir(),
                p_safe
                + "_"
                + random.getrandbits(32).to_bytes(4, "big").hex()[:8]
                + "_not_saved_",
            )
            tmp_storage = WalletStorage(storage_path, in_memory_only=True)
            tmp_storage.put("keystore", k.dump())
            wallet = StandardWallet(tmp_storage)
            try:
                wallet.start_threads(network)
                wallet.synchronize()
                wallet.print_error("Scanning", p)
                synched = False
                for ctr in range(25):
                    try:
                        wallet.wait_until_synchronized(timeout=1.0)
                        synched = True
                    except TimeoutException:
                        wallet.print_error(f"timeout try {ctr + 1}/25")
                    if self.aborting:
                        return
                num_tx = len(wallet.get_history())
                if not synched:
                    wallet.print_error(f"Timeout on {p} after finding {num_tx} txs")
                    self.update_table_cb(i, f"Timed out (found {num_tx} txs)")
                    continue
                while network.is_connecting():
                    time.sleep(0.1)
                    if self.aborting:
                        return
                self.update_table_cb(i, str(num_tx))
            finally:
                wallet.clear_history()
                wallet.stop_threads()


class DerivationDialog(QtWidgets.QDialog):
    scan_result_signal = pyqtSignal(object, object)

    def __init__(self, parent, bip32_seed: bytes, paths):
        QtWidgets.QDialog.__init__(self, parent)

        self.bip32_seed = bip32_seed
        self.config = parent.config
        self.max_seen = 0

        self.setWindowTitle(_("Select Derivation Path"))
        vbox = QtWidgets.QVBoxLayout()
        self.setLayout(vbox)
        vbox.setContentsMargins(24, 24, 24, 24)

        self.label = QtWidgets.QLabel(self)
        vbox.addWidget(self.label)

        self.table = QtWidgets.QTableWidget(self)
        self.table.setSelectionMode(QtWidgets.QAbstractItemView.SingleSelection)
        self.table.setSelectionBehavior(QtWidgets.QAbstractItemView.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setSectionResizeMode(
            QtWidgets.QHeaderView.ResizeToContents
        )
        self.table.setSortingEnabled(False)
        self.table.setColumnCount(2)
        self.table.setRowCount(len(paths))
        self.table.setHorizontalHeaderItem(0, QtWidgets.QTableWidgetItem(_("Path")))
        self.table.setHorizontalHeaderItem(
            1, QtWidgets.QTableWidgetItem(_("Transactions"))
        )
        self.table.horizontalHeader().setSectionResizeMode(
            0, QtWidgets.QHeaderView.ResizeToContents
        )
        self.table.horizontalHeader().setSectionResizeMode(
            1, QtWidgets.QHeaderView.Stretch
        )
        self.table.setMinimumHeight(350)

        for row, d_path in enumerate(paths):
            path_item = QtWidgets.QTableWidgetItem(d_path)
            path_item.setFlags(Qt.ItemIsSelectable | Qt.ItemIsEnabled)
            self.table.setItem(row, 0, path_item)
            transaction_count_item = QtWidgets.QTableWidgetItem(_("Scanning..."))
            transaction_count_item.setFlags(Qt.ItemIsSelectable | Qt.ItemIsEnabled)
            self.table.setItem(row, 1, transaction_count_item)

        self.table.cellDoubleClicked.connect(self.accept)
        self.table.selectRow(0)
        vbox.addWidget(self.table)
        ok_but = OkButton(self)
        buts = Buttons(CancelButton(self), ok_but)
        vbox.addLayout(buts)
        vbox.addStretch(1)
        ok_but.setEnabled(True)
        self.scan_result_signal.connect(self.update_table)
        self.t = None

    def set_scan_progress(self, n):
        self.label.setText(
            _("Scanned {}/{}").format(n, len(DerivationPathScanner.DERIVATION_PATHS))
        )

    def kill_t(self):
        if self.t and self.t.isRunning():
            self.t.aborting = True
            self.t.wait(5000)

    def showEvent(self, e):
        super().showEvent(e)
        if e.isAccepted():
            self.kill_t()
            self.t = DerivationPathScanner(
                self, self.bip32_seed, self.config, self.update_table_cb
            )
            self.max_seen = 0
            self.set_scan_progress(0)
            self.t.start()

    def closeEvent(self, e):
        super().closeEvent(e)
        if e.isAccepted():
            self.kill_t()

    def update_table_cb(self, row, scan_result):
        self.scan_result_signal.emit(row, scan_result)

    def update_table(self, row, scan_result):
        self.set_scan_progress(row + 1)
        try:
            num = int(scan_result)
            if num > self.max_seen:
                self.table.selectRow(row)
                self.max_seen = num
        except (ValueError, TypeError):
            pass
        self.table.item(row, 1).setText(scan_result)

    def get_selected_path(self):
        path_to_return = None
        if self.exec_():
            pathstr = self.table.selectionModel().selectedRows()
            row = pathstr[0].row()
            path_to_return = self.table.item(row, 0).text()
        self.kill_t()
        return path_to_return
