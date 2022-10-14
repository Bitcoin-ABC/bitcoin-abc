# -*- coding: utf-8 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2012 thomasv@gitorious
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
from __future__ import annotations

import gc
import os
import shutil
import signal
import sys
import threading
import traceback
from typing import TYPE_CHECKING, Callable, Optional

try:
    from qtpy import QtCore, QtWidgets
    from qtpy.QtGui import QFontDatabase, QGuiApplication, QIcon, QScreen
except Exception:
    if sys.platform.startswith("win"):
        msg = (
            "\n\nError: Could not import Qt binding.\nIf you are running the release .exe,"
            " this is a bug (please contact the developers in that case).\nIf you are"
            " running from source, then you may try this from the command-line:\n\n   "
            " python -m pip install pyqt5 qtpy\n\n"
        )
    elif sys.platform.startswith("darw"):
        msg = (
            "\n\nError: Could not import Qt binding.\nIf you are running the release .app,"
            " this is a bug (please contact the developers in that case).\nIf you are"
            " running from source, then you may try this from the command-line:\n\n   "
            " python3 -m pip install --user -I pyqt5 qtpy\n\n"
        )
    else:
        msg = (
            "\n\nError: Could not import Qt binding.\n"
            "You may try:\n\n"
            "    python3 -m pip install --user -I pyqt5 qtpy\n\n"
            "Or, if on Linux Ubuntu, Debian, etc:\n\n"
            "    sudo apt-get install python3-pyqt5 python3-qtpy \n\n"
        )
    sys.exit(msg)

from electrumabc import i18n, version
from electrumabc.address import Address
from electrumabc.constants import PROJECT_NAME
from electrumabc.i18n import _
from electrumabc.plugins import run_hook
from electrumabc.printerror import PrintError, print_error
from electrumabc.util import (
    BitcoinException,
    Handlers,
    UserCancelled,
    WalletFileException,
    Weak,
    get_new_wallet_name,
    standardize_path,
)
from electrumabc.wallet import AbstractWallet, Wallet

# This needs to be imported once app-wide then the :icons/ namespace becomes available
# for Qt icon filenames.
from . import icons  # noqa: F401
from .exception_window import ExceptionHook
from .installwizard import GoBack, InstallWizard, WalletAlreadyOpenInMemory
from .main_window import ElectrumWindow
from .network_dialog import NetworkDialog
from .settings_dialog import windows_qt_use_freetype
from .update_checker import UpdateChecker
from .util import (
    ColorScheme,
    MessageBoxMixin,
    QMessageBoxMixin,
    destroyed_print_error,
    finalization_print_error,
)

if TYPE_CHECKING:
    from electrumabc.daemon import Daemon
    from electrumabc.plugins import Plugins
    from electrumabc.simple_config import SimpleConfig


def _pre_and_post_app_setup(config) -> Callable[[], None]:
    callables = []

    def call_callables():
        for func in callables:
            func()

    ret = call_callables

    if hasattr(QGuiApplication, "setDesktopFileName"):
        QGuiApplication.setDesktopFileName("electrum-abc.desktop")

    if windows_qt_use_freetype(config):
        # Use FreeType for font rendering on Windows. This fixes rendering
        # of the Schnorr sigil and allows us to load the Noto Color Emoji
        # font if needed.
        os.environ["QT_QPA_PLATFORM"] = "windows:fontengine=freetype"

    if hasattr(QtCore.Qt, "AA_ShareOpenGLContexts"):
        QtCore.QCoreApplication.setAttribute(QtCore.Qt.AA_ShareOpenGLContexts)
    if sys.platform not in ("darwin",) and hasattr(
        QtCore.Qt, "AA_EnableHighDpiScaling"
    ):
        # The below only applies to non-macOS. On macOS this setting is
        # never used (because it is implicitly auto-negotiated by the OS
        # in a differernt way).
        #
        # qt_disable_highdpi will be set to None by default, or True if
        # specified on command-line.  The command-line override is intended
        # to supporess high-dpi mode just for this run for testing.
        #
        # The more permanent setting is qt_enable_highdpi which is the GUI
        # preferences option, so we don't enable highdpi if it's explicitly
        # set to False in the GUI.
        #
        # The default on Linux, Windows, etc is to enable high dpi
        disable_scaling = config.get("qt_disable_highdpi", False)
        enable_scaling = config.get("qt_enable_highdpi", True)
        if not disable_scaling and enable_scaling:
            QtCore.QCoreApplication.setAttribute(QtCore.Qt.AA_EnableHighDpiScaling)
    if hasattr(QtCore.Qt, "AA_UseHighDpiPixmaps"):
        QtCore.QCoreApplication.setAttribute(QtCore.Qt.AA_UseHighDpiPixmaps)

    def setup_layout_direction():
        """Sets the app layout direction depending on language. To be called
        after self.app is created successfully. Note this *MUST* be called
        after set_language has been called."""
        assert i18n.set_language_called > 0
        lc = i18n.language.info().get("language")
        lc = "" if not isinstance(lc, str) else lc
        lc = lc.split("_")[0]
        layout_direction = QtCore.Qt.LeftToRight
        blurb = "left-to-right"
        if lc in {"ar", "fa", "he", "ps", "ug", "ur"}:  # Right-to-left languages
            layout_direction = QtCore.Qt.RightToLeft
            blurb = "right-to-left"
        print_error("Setting layout direction:", blurb)
        QtWidgets.QApplication.instance().setLayoutDirection(layout_direction)

    # callable will be called after self.app is set-up successfully
    callables.append(setup_layout_direction)

    return ret


app = None


def init_qapplication(config):
    global app
    i18n.set_language(config.get("language"))
    call_after_app = _pre_and_post_app_setup(config)
    try:
        app = QtWidgets.QApplication(sys.argv)
    finally:
        call_after_app()


class ElectrumGui(QtCore.QObject, PrintError):
    new_window_signal = QtCore.Signal(str, object)
    update_available_signal = QtCore.Signal(bool)
    addr_fmt_changed = QtCore.Signal()
    cashaddr_status_button_hidden_signal = QtCore.Signal(bool)
    shutdown_signal = QtCore.Signal()
    do_in_main_thread_signal = QtCore.Signal(object, object, object)

    instance = None

    def __init__(self, config: SimpleConfig, daemon: Daemon, plugins: Plugins):
        super(__class__, self).__init__()
        assert __class__.instance is None, (
            "ElectrumGui is a singleton, yet an instance appears to already exist!"
            " FIXME!"
        )
        __class__.instance = self

        self.gui_thread = threading.current_thread()
        self.config = config
        self.daemon = daemon
        self.plugins = plugins
        self.windows = []

        self._setup_do_in_main_thread_handler()

        # Uncomment this call to verify objects are being properly
        # GC-ed when windows are closed
        # if daemon.network:
        #    from electrumabc.util import DebugMem
        #    from electrumabc.wallet import Abstract_Wallet
        #    from electrumabc.verifier import SPV
        #    from electrumabc.synchronizer import Synchronizer
        #    daemon.network.add_jobs([DebugMem([Abstract_Wallet, SPV, Synchronizer,
        #                                       ElectrumWindow], interval=5)])

        self.app = QtWidgets.QApplication.instance()

        # this needs to be done very early, before the font engine loads fonts..
        # out of paranoia
        self._load_fonts()
        self._exit_if_required_pyqt_is_missing()
        self.new_version_available = None
        self._set_icon()
        self.app.installEventFilter(self)
        self.timer = QtCore.QTimer(self)
        self.timer.setSingleShot(False)
        self.timer.setInterval(500)  # msec
        self.gc_timer = QtCore.QTimer(self)
        self.gc_timer.setSingleShot(True)
        self.gc_timer.timeout.connect(ElectrumGui.gc)
        self.gc_timer.setInterval(500)  # msec
        self.nd = None
        self._last_active_window = (
            None  # we remember the last activated ElectrumWindow as a Weak.ref
        )
        Address.set_address_format(self.get_config_addr_format())
        # /
        # Wallet Password Cache
        # wallet -> (password, QTimer) map for some plugins (like CashShuffle)
        # that need wallet passwords to operate, and we don't want to prompt
        # for pw twice right after the InstallWizard runs (see #106).
        # Entries in this map are deleted after 10 seconds by the QTimer (which
        # also deletes itself)
        self._wallet_password_cache = Weak.KeyDictionary()
        # /
        self.update_checker = UpdateChecker(self.config)
        self.update_checker_timer = QtCore.QTimer(self)
        self.update_checker_timer.timeout.connect(self.on_auto_update_timeout)
        self.update_checker_timer.setSingleShot(False)
        self.update_checker.got_new_version.connect(self.on_new_version)
        # init tray
        self.dark_icon = self.config.get("dark_icon", False)
        self.tray = QtWidgets.QSystemTrayIcon(self.tray_icon(), self)
        self.tray.setToolTip(f"{PROJECT_NAME}")
        self.tray.activated.connect(self.tray_activated)
        self.build_tray_menu()
        self.tray.show()
        self.new_window_signal.connect(self.start_new_window)
        if self.has_auto_update_check():
            self._start_auto_update_timer(first_run=True)
        self.app.focusChanged.connect(
            self.on_focus_change
        )  # track last window the user interacted with
        self.shutdown_signal.connect(self.close, QtCore.Qt.QueuedConnection)

        self.set_dark_theme_if_needed()
        run_hook("init_qt", self)

        self._check_and_warn_qt_version()

    def __del__(self):
        stale = True
        if __class__.instance is self:
            stale = False
            __class__.instance = None
        print_error(
            "[{}] finalized{}".format(
                __class__.__name__, " (stale instance)" if stale else ""
            )
        )
        if hasattr(super(), "__del__"):
            super().__del__()

    def _setup_do_in_main_thread_handler(self):
        """Sets up "do_in_main_thread" handler mechanism for Qt GUI."""
        self.do_in_main_thread_signal.connect(self._do_in_main_thread_handler_slot)
        orig_handler = Handlers.do_in_main_thread
        weakSelf = Weak.ref(self)

        def my_do_in_main_thread_handler(func, *args, **kwargs):
            strongSelf = weakSelf()
            if strongSelf:
                # We are still alive, emit the signal which will be handled
                # in the main thread.
                strongSelf.do_in_main_thread_signal.emit(func, args, kwargs)
            else:
                # We died. Uninstall this handler, invoke original handler.
                Handlers.do_in_main_thread = orig_handler
                orig_handler(func, *args, **kwargs)

        Handlers.do_in_main_thread = my_do_in_main_thread_handler

    def _do_in_main_thread_handler_slot(self, func, args, kwargs):
        """
        Hooked in to util.Handlers.do_in_main_thread via the
        do_in_main_thread_signal. This ensures that there is an app-wide
        mechanism for posting invocations to the main thread.  Currently
        CashFusion uses this mechanism, but other code may as well.
        """
        func(*args, **kwargs)

    def _exit_if_required_pyqt_is_missing(self):
        """Will check if required qt binding for python are present and if not,
        display an error message box to the user and immediately quit the app.

        This is because some Linux systems break up the binding into multiple
        subpackages, and for instance QtSvg is its own package, and it
        may be missing.
        """
        try:
            from qtpy import QtSvg  # noqa: F401
        except ImportError:
            # Closes #1436 -- Some "Run from source" Linux users lack QtSvg
            # (partial PyQt5 install)
            msg = _(
                "A required Qt module, QtSvg was not found. Please fully install all of"
                " PyQt5 5.12 or above to resolve this issue."
            )
            if sys.platform == "linux":
                msg += "\n\n" + _(
                    "On Linux, you may try:\n\n    python3 -m pip install --user -I"
                    " pyqt5"
                )
                if shutil.which("apt"):
                    msg += "\n\n" + _(
                        "On Debian-based distros, you can run:\n\n    sudo apt install"
                        " python3-pyqt5.qtsvg"
                    )

            QtWidgets.QMessageBox.critical(
                None, _("QtSvg Missing"), msg
            )  # this works even if app is not exec_() yet.
            self.app.exit(1)
            sys.exit(msg)

    def is_dark_theme_available(self):
        if sys.platform in ("darwin",):
            # On OSX, qdarkstyle is kind of broken. We instead rely on Mojave
            # dark mode if (built in to the OS) for this facility, which the
            # user can set outside of this application.
            return False
        try:
            import qdarkstyle  # noqa: F401
        except ImportError:
            return False
        return True

    def set_dark_theme_if_needed(self):
        if sys.platform in ("darwin",):
            # On OSX, qdarkstyle is kind of broken (bad UI). We instead rely on Mojave
            # dark mode if (built in to the OS) for this facility, which the
            # user can set outside of this application.
            use_dark_theme = False
        else:
            use_dark_theme = self.config.get("qt_gui_color_theme", "default") == "dark"
        darkstyle_ver = None
        if use_dark_theme:
            try:
                import qdarkstyle

                self.app.setStyleSheet(qdarkstyle.load_stylesheet_pyqt5())
                try:
                    darkstyle_ver = version.normalize_version(qdarkstyle.__version__)
                except (
                    ValueError,
                    IndexError,
                    TypeError,
                    NameError,
                    AttributeError,
                ) as e:
                    self.print_error(
                        "Warning: Could not determine qdarkstyle version:", repr(e)
                    )
            except Exception as e:
                use_dark_theme = False
                self.print_error("Error setting dark theme: {}".format(repr(e)))
        # Apply any necessary stylesheet patches
        from . import style_patcher

        style_patcher.patch(use_dark_theme=use_dark_theme, darkstyle_ver=darkstyle_ver)
        # Even if we ourselves don't set the dark theme,
        # the OS/window manager/etc might set *a dark theme*.
        # Hence, try to choose colors accordingly:
        ColorScheme.update_from_widget(QtWidgets.QWidget(), force_dark=use_dark_theme)

    def get_cached_password(self, wallet):
        """Passwords in the cache only live for a very short while (10 seconds)
        after wallet window creation, and only if it's a new window. This
        mechanism is a convenience for plugins that need access to the wallet
        password and it would make for poor UX for the user to enter their
        password twice when opening a new window"""
        entry = self._wallet_password_cache.get(wallet)
        if entry:
            return entry[0]

    def _expire_cached_password(self, weakWallet):
        """Timer callback, called after 10 seconds."""
        wallet = weakWallet() if isinstance(weakWallet, Weak.ref) else weakWallet
        if wallet:
            entry = self._wallet_password_cache.pop(wallet, None)
            if entry:
                timer = entry[1]
                timer.stop()
                timer.deleteLater()

    def _cache_password(self, wallet, password):
        self._expire_cached_password(wallet)
        if password is None:
            return
        # NB a top-level parentless QObject will get delete by Python when its Python
        # refct goes to 0, which is what we want here.
        # Future programmers: Do not give this timer a parent!
        timer = QtCore.QTimer()
        self._wallet_password_cache[wallet] = (password, timer)
        weakWallet = Weak.ref(wallet)
        weakSelf = Weak.ref(self)

        def timeout():
            slf = weakSelf()
            slf and slf._expire_cached_password(weakWallet)

        timer.setSingleShot(True)
        timer.timeout.connect(timeout)
        timer.start(10000)  # 10 sec

    def cache_password(self, wallet, password):
        self._cache_password(wallet, password)

    def _set_icon(self):
        icon = None
        if sys.platform == "darwin":
            # on macOS, in "running from source" mode, we want to set the app
            # icon, otherwise we get the generic Python icon.
            # In non-running-from-source mode, macOS will get the icon from
            # the .app bundle Info.plist spec (which ends up being
            # electrumABC.icns).  However, in .app mode, Qt will not know about
            # this icon and won't be able to use it for e.g. the About dialog.
            # In the latter case the branch below will tell Qt to use
            # electrumABC.svg as the "window icon".
            icon = (
                QIcon("electrumABC.icns")
                if os.path.exists("electrumABC.icns")
                else None
            )
        if not icon:
            # Set this on all other platforms (and macOS built .app) as it can
            # only help and never harm, and is always available.
            icon = QIcon(":icons/electrumABC.svg")
        if icon:
            self.app.setWindowIcon(icon)

    @staticmethod
    def qt_version() -> tuple:
        """Returns a 3-tuple of the form (major, minor, revision) eg
        (5, 12, 4) for the current Qt version derived from the QT_VERSION
        global provided by Qt."""
        return (
            (QtCore.QT_VERSION >> 16) & 0xFF,
            (QtCore.QT_VERSION >> 8) & 0xFF,
            QtCore.QT_VERSION & 0xFF,
        )

    def _load_fonts(self):
        """All apologies for the contorted nature of this platform code.
        Fonts on Windows & Linux are .. a sensitive situation. :)"""
        # Only load the emoji font on Linux and Windows
        if sys.platform not in ("linux", "win32", "cygwin"):
            return

        # TODO: Check if we already have the needed emojis
        # TODO: Allow the user to download a full color emoji set

        linux_font_config_file = os.path.join(
            os.path.dirname(__file__), "data", "fonts.xml"
        )
        emojis_ttf_name = "ecsupplemental_lnx.ttf"
        emojis_ttf_path = os.path.join(
            os.path.dirname(__file__), "data", emojis_ttf_name
        )
        did_set_custom_fontconfig = False

        if (
            sys.platform == "linux"
            # method-backed property, checks config settings
            and self.linux_qt_use_custom_fontconfig
            and not os.environ.get("FONTCONFIG_FILE")
            and os.path.exists("/etc/fonts/fonts.conf")
            and os.path.exists(linux_font_config_file)
            and os.path.exists(emojis_ttf_path)
            # doing this on Qt < 5.12 causes harm and makes the whole app render fonts
            # badly
            and self.qt_version() >= (5, 12)
        ):
            # On Linux, we override some fontconfig rules by loading our own
            # font config XML file. This makes it so that our custom emojis and
            # other needed glyphs are guaranteed to get picked up first,
            # regardless of user font config.  Without this some Linux systems
            # had black and white or missing emoji glyphs.  We only do this if
            # the user doesn't have their own fontconfig file in env and
            # also as a sanity check, if they have the system
            # /etc/fonts/fonts.conf file in the right place.
            os.environ["FONTCONFIG_FILE"] = linux_font_config_file
            did_set_custom_fontconfig = True

        if sys.platform in ("win32", "cygwin"):
            env_var = os.environ.get("QT_QPA_PLATFORM")
            if not env_var or "windows:fontengine=freetype" not in env_var.lower():
                # not set up to use freetype, so loading the .ttf would fail.
                # abort early.
                return
            del env_var
            # use a different .ttf file on Windows
            emojis_ttf_name = "ecsupplemental_win.ttf"
            emojis_ttf_path = os.path.join(
                os.path.dirname(__file__), "data", emojis_ttf_name
            )

        if QFontDatabase.addApplicationFont(emojis_ttf_path) < 0:
            self.print_error(
                "Failed to add unicode emoji font to application fonts:",
                emojis_ttf_path,
            )
            if did_set_custom_fontconfig:
                self.print_error("Deleting custom (fonts.xml) FONTCONFIG_FILE env. var")
                del os.environ["FONTCONFIG_FILE"]

    def _check_and_warn_qt_version(self):
        if sys.platform == "linux" and self.qt_version() < (5, 12):
            msg = _(
                f"{PROJECT_NAME} on Linux requires PyQt5 5.12+.\n\n"
                f"You have version {QtCore.__version__} installed.\n\n"
                "Please upgrade otherwise you may experience "
                "font rendering issues with emojis and other unicode "
                f"characters used by {PROJECT_NAME}."
            )
            QtWidgets.QMessageBox.warning(
                None, _("PyQt5 Upgrade Needed"), msg
            )  # this works even if app is not exec_() yet.

    def eventFilter(self, obj, event):
        """This event filter allows us to open ecash: URIs on macOS"""
        if event.type() == QtCore.QEvent.FileOpen:
            if len(self.windows) >= 1:
                self.windows[0].pay_to_URI(event.url().toString())
                return True
        return False

    def build_tray_menu(self):
        """Rebuild the tray menu by tearing it down and building it new again."""
        m_old = self.tray.contextMenu()
        if m_old is not None:
            # Tray does NOT take ownership of menu, so we are tasked with
            # deleting the old one. Note that we must delete the old one rather
            # than just clearing it because otherwise the old sub-menus stick
            # around in Qt. You can try calling qApp.topLevelWidgets() to
            # convince yourself of this.  Doing it this way actually cleans-up
            # the menus and they do not leak.
            m_old.clear()
            m_old.deleteLater()
        m = QtWidgets.QMenu()
        m.setObjectName("SysTray.QMenu")
        self.tray.setContextMenu(m)
        destroyed_print_error(m)
        for window in self.windows:
            submenu = m.addMenu(window.wallet.basename())
            submenu.addAction(_("Show/Hide"), window.show_or_hide)
            submenu.addAction(_("Close"), window.close)
        m.addAction(_("Dark/Light"), self.toggle_tray_icon)
        m.addSeparator()
        m.addAction(_("&Check for updates..."), lambda: self.show_update_checker(None))
        m.addSeparator()
        m.addAction(_(f"Exit {PROJECT_NAME}"), self.close)
        self.tray.setContextMenu(m)

    def tray_icon(self):
        if self.dark_icon:
            return QIcon(":icons/electrumABC_dark_icon.svg")
        else:
            return QIcon(":icons/electrumABC_light_icon.svg")

    def toggle_tray_icon(self):
        self.dark_icon = not self.dark_icon
        self.config.set_key("dark_icon", self.dark_icon, True)
        self.tray.setIcon(self.tray_icon())

    def tray_activated(self, reason):
        if reason == QtWidgets.QSystemTrayIcon.DoubleClick:
            if all(w.is_hidden() for w in self.windows):
                for w in self.windows:
                    w.bring_to_top()
            else:
                for w in self.windows:
                    w.hide()

    def close(self):
        for window in list(self.windows):
            window.close()

    def new_window(self, path, uri=None):
        # Use a signal as can be called from daemon thread
        self.new_window_signal.emit(path, uri)

    def show_network_dialog(self, parent, *, jumpto: str = ""):
        if self.warn_if_no_network(parent):
            return
        if self.nd:
            self.nd.on_update()
            run_hook("on_network_dialog", self.nd)
            self.nd.show()
            self.nd.raise_()
            if jumpto:
                self.nd.jumpto(jumpto)
            return
        self.nd = NetworkDialog(self.daemon.network, self.config)
        run_hook("on_network_dialog", self.nd)
        self.nd.show()
        if jumpto:
            self.nd.jumpto(jumpto)

    def _create_window_for_wallet(self, wallet: AbstractWallet):
        w = ElectrumWindow(self, wallet)
        self.windows.append(w)
        finalization_print_error(w, "[{}] finalized".format(w.diagnostic_name()))
        self.build_tray_menu()
        run_hook("on_new_window", w)
        return w

    def get_wallet_folder(self):
        """Get path to directory containing the current wallet."""
        return os.path.dirname(os.path.abspath(self.config.get_wallet_path()))

    def get_new_wallet_path(self):
        """Return path to a new wallet file to be created."""
        wallet_folder = self.config.get_new_wallet_directory()
        filename = get_new_wallet_name(wallet_folder)
        return os.path.join(wallet_folder, filename)

    def on_focus_change(self, ignored, new_focus_widget):
        """Remember the last wallet window that was activated because
        start_new_window uses this information.  We store the ElectrumWindow
        in a weak reference so that we don't interfere with its gc when it is
        closed."""
        if not new_focus_widget:
            return
        if isinstance(new_focus_widget, QtWidgets.QWidget):
            # call base class because some widgets may actually override 'window' with
            # Python attributes.
            window = QtWidgets.QWidget.window(new_focus_widget)
            if isinstance(window, ElectrumWindow):
                self._last_active_window = Weak.ref(window)

    def start_new_window(self, path, uri, *, app_is_starting=False):
        """Raises the window for the wallet if it is open. Otherwise
        opens the wallet and creates a new window for it.

        `path=None` is a special usage which will raise the last activated
        window or open the 'last wallet' if no windows are open."""
        wallet = None
        if not path:
            if not self.windows:
                # This branch is taken if nothing is currently open but
                # path == None, in which case set path=last wallet
                self.config.open_last_wallet()
                path = self.config.get_wallet_path()
            elif self._last_active_window:
                # This branch is taken if we have windows open and we have
                # _last_active_window defined, in which case we specify
                # that this window should be activated by setting path
                # so that the for loop below will trigger on this window.
                w = self._last_active_window()  # weak ref -> strong ref
                if w and w in self.windows:  # check ref still alive
                    # this will cause the last active window to be used in the
                    # for loop below
                    path = w.wallet.storage.path

        # NB: path may still be None here if it came in as None from args and
        # if the above logic couldn't select a window to use -- in which case
        # we'll end up picking self.windows[0]

        path = path and standardize_path(
            path
        )  # just make sure some plugin didn't give us a symlink

        try:
            wallet = self.daemon.load_wallet(path, None)
            if wallet is not None:
                self.daemon.cmd_runner.wallet = wallet
        except Exception as e:
            traceback.print_exc(file=sys.stdout)
            QtWidgets.QMessageBox.warning(
                None, _("Error"), _("Cannot load wallet") + " (1):\n" + str(e)
            )
            # if app is starting, still let wizard to appear
            if not app_is_starting:
                return

        if not wallet:
            try:
                wallet = self._start_wizard_to_select_or_create_wallet(path)
            except (WalletFileException, BitcoinException) as e:
                traceback.print_exc(file=sys.stderr)
                QtWidgets.QMessageBox.warning(
                    None, _("Error"), _("Cannot load wallet") + " (2):\n" + str(e)
                )

        if not wallet:
            return
        # create or raise window
        try:
            for window in self.windows:
                if window.wallet.storage.path == wallet.storage.path:
                    window.bring_to_top()
                    return
            window = self._create_window_for_wallet(wallet)
        except Exception as e:
            traceback.print_exc(file=sys.stdout)
            QtWidgets.QMessageBox.warning(
                None, _("Error"), _("Cannot create window for wallet:") + "\n" + str(e)
            )
            return

        if uri:
            window.pay_to_URI(uri)
        window.bring_to_top()
        window.setWindowState(
            window.windowState() & ~QtCore.Qt.WindowMinimized | QtCore.Qt.WindowActive
        )

        window.activateWindow()
        return window

    def _start_wizard_to_select_or_create_wallet(
        self, path
    ) -> Optional[AbstractWallet]:
        wizard = InstallWizard(self.config, self.app, self.plugins, gui_object=self)
        try:
            path, storage = wizard.select_storage(path, self.daemon.get_wallet)
            # storage is None if file does not exist
            if storage is None:
                wizard.path = path  # needed by trustedcoin plugin
                wizard.run("new")
                storage = wizard.create_storage(path)
            else:
                wizard.run_upgrades(storage)
        except (UserCancelled, GoBack):
            return
        except WalletAlreadyOpenInMemory as e:
            return e.wallet
        finally:
            wizard.terminate()
        # return if wallet creation is not complete
        if storage is None or storage.get_action():
            return
        wallet = Wallet(storage)
        wallet.start_threads(self.daemon.network)
        self.daemon.add_wallet(wallet)
        self.daemon.cmd_runner.wallet = wallet
        return wallet

    def close_window(self, window):
        self.windows.remove(window)
        self.build_tray_menu()
        # save wallet path of last open window
        run_hook("on_close_window", window)
        # GC on ElectrumWindows takes forever to actually happen due to the
        # circular reference zoo they create around them (they end up stuck in
        # generation 2 for a long time before being collected). The below
        # schedules a more comprehensive GC to happen in the very near future.
        # This mechanism takes on the order of 40-100ms to execute (depending
        # on hardware) but frees megabytes of memory after closing a window
        # (which itslef is a relatively infrequent UI event, so it's
        # an acceptable tradeoff).
        self.gc_schedule()

        if not self.windows:
            self.config.save_last_wallet(window.wallet)
            # NB: We see if we should quit the app after the last wallet
            # window is closed, even if a network dialog or some other window is
            # open.  It was bizarre behavior to keep the app open when
            # things like a transaction dialog or the network dialog were still
            # up.
            # central point that checks if we should quit.
            self._quit_after_last_window()

    def gc_schedule(self):
        """Schedule garbage collection to happen in the near future.
        Note that rapid-fire calls to this re-start the timer each time, thus
        only the last call takes effect (it's rate-limited)."""
        # start/re-start the timer to fire exactly once in timeInterval() msecs
        self.gc_timer.start()

    @staticmethod
    def gc():
        """self.gc_timer timeout() slot"""
        gc.collect()

    def init_network(self):
        # Show network dialog if config does not exist
        if self.daemon.network:
            if self.config.get("auto_connect") is None:
                wizard = InstallWizard(
                    self.config, self.app, self.plugins, gui_object=self
                )
                wizard.init_network(self.daemon.network)
                wizard.terminate()

    def on_new_version(self, newver):
        """Called by the auto update check mechanism to notify
        that a new version is available.  We propagate the signal out
        using our own update_available_signal as well as post a message
        to the system tray."""
        self.new_version_available = newver
        self.update_available_signal.emit(True)
        self.notify(_(f"A new version of {PROJECT_NAME} is available: {newver}"))

    def show_update_checker(self, parent, *, skip_check=False):
        if self.warn_if_no_network(parent):
            return
        self.update_checker.show()
        self.update_checker.raise_()
        if not skip_check:
            self.update_checker.do_check()

    def on_auto_update_timeout(self):
        if not self.daemon.network:
            # auto-update-checking never is done in offline mode
            self.print_error("Offline mode; update check skipped")
        elif not self.update_checker.did_check_recently():
            # make sure auto-check doesn't happen right after a manual check.
            self.update_checker.do_check()
        if self.update_checker_timer.first_run:
            self._start_auto_update_timer(first_run=False)

    def _start_auto_update_timer(self, *, first_run=False):
        self.update_checker_timer.first_run = bool(first_run)
        if first_run:
            # do it very soon (in 10 seconds)
            interval = 10_000
        else:
            # once every 4 hours (in ms)
            interval = 4 * 3_600_000
        self.update_checker_timer.start(interval)
        self.print_error(
            f"Auto update check: interval set to {interval // 1e3} seconds"
        )

    def _stop_auto_update_timer(self):
        self.update_checker_timer.stop()
        self.print_error("Auto update check: disabled")

    def warn_if_cant_import_qrreader(self, parent, show_warning=True):
        """Checks it QR reading from camera is possible.  It can fail on a
        system lacking QtMultimedia.  This can be removed in the future when
        we are unlikely to encounter Qt5 installations that are missing
        QtMultimedia"""
        try:
            from .qrreader import QrReaderCameraDialog  # noqa: F401
        except ImportError as e:
            if show_warning:
                self.warning(
                    parent=parent,
                    title=_("QR Reader Error"),
                    message=_(
                        "QR reader failed to load. This may "
                        "happen if you are using an older version "
                        "of PyQt5.<br><br>Detailed error: "
                    )
                    + str(e),
                    rich_text=True,
                )
            return True
        return False

    def warn_if_no_network(self, parent):
        if not self.daemon.network:
            self.warning(
                message=_(
                    f"You are using {PROJECT_NAME} in offline "
                    f"mode; restart {PROJECT_NAME} if you want "
                    "to get connected"
                ),
                title=_("Offline"),
                parent=parent,
                rich_text=True,
            )
            return True
        return False

    def warning(
        self,
        title,
        message,
        icon=QtWidgets.QMessageBox.Warning,
        parent=None,
        rich_text=False,
    ):
        if not isinstance(icon, QtWidgets.QMessageBox.Icon):
            icon = QtWidgets.QMessageBox.Warning
        if isinstance(parent, MessageBoxMixin):
            parent.msg_box(
                title=title, text=message, icon=icon, parent=None, rich_text=rich_text
            )
        else:
            parent = parent if isinstance(parent, QtWidgets.QWidget) else None
            d = QMessageBoxMixin(icon, title, message, QtWidgets.QMessageBox.Ok, parent)
            if not rich_text:
                d.setTextFormat(QtCore.Qt.PlainText)
                d.setTextInteractionFlags(QtCore.Qt.TextSelectableByMouse)
            else:
                d.setTextFormat(QtCore.Qt.AutoText)
                d.setTextInteractionFlags(
                    QtCore.Qt.TextSelectableByMouse | QtCore.Qt.LinksAccessibleByMouse
                )
            d.setWindowModality(
                QtCore.Qt.WindowModal if parent else QtCore.Qt.ApplicationModal
            )
            d.exec_()
            d.setParent(None)

    def lin_win_maybe_show_highdpi_caveat_msg(self, parent):
        """Called from main_window.py -- tells user once and only once about
        the high DPI mode and its caveats on Linux only.  Is a no-op otherwise."""
        is_win = sys.platform[:3] in ("win", "cyg")
        is_lin = sys.platform in ("linux",)
        if not is_win and not is_lin:
            return
        if (
            hasattr(QtCore.Qt, "AA_EnableHighDpiScaling")
            and self.app.testAttribute(QtCore.Qt.AA_EnableHighDpiScaling)
            # first run check:
            and self.config.get("qt_enable_highdpi", None) is None
            and (
                is_lin  # we can't check pixel ratio on linux as apparently it's unreliable, so always show this message on linux
                # on some windows systems running in highdpi causes
                # glitches to the QMessageBox windows, so we need
                # to also warn Windows users that they can turn this off,
                # but only if they actually are using a high dpi display
                or (
                    is_win
                    and hasattr(QScreen, "devicePixelRatio")
                    and any(
                        s.devicePixelRatio()
                        > 1.0  # do they have any screens that are high dpi?
                        for s in self.app.screens()
                    )
                )
            )
        ):
            # write to the config key to immediately suppress this warning in
            # the future -- it only appears on first-run if key was None
            self.config.set_key("qt_enable_highdpi", True)
            if is_lin:
                msg = (
                    _(
                        "Automatic high DPI scaling has been enabled for "
                        f"{PROJECT_NAME}, which should result in improved "
                        "graphics quality."
                    )
                    + "\n\n"
                    + _(
                        "However, on some esoteric Linux systems, this "
                        "mode may cause disproportionately large status "
                        "bar icons."
                    )
                    + "\n\n"
                    + _(
                        "If that is the case for you, then you may disable"
                        " automatic DPI scaling in the preferences, under "
                        "'General'."
                    )
                )
            else:  # is_win
                msg = (
                    _(
                        "Automatic high DPI scaling has been enabled for "
                        f"{PROJECT_NAME}, which should result in improved "
                        "graphics quality."
                    )
                    + "\n\n"
                    + _(
                        "However, on some Windows systems, bugs in Qt may "
                        "result in minor graphics glitches in system "
                        "'message box' dialogs."
                    )
                    + "\n\n"
                    + _(
                        "If that is the case for you, then you may disable "
                        "automatic DPI scaling in the preferences, under "
                        "'General'."
                    )
                )
            parent.show_message(title=_("Automatic High DPI"), msg=msg)

    def has_auto_update_check(self):
        return bool(self.config.get("auto_update_check", True))

    def set_auto_update_check(self, b):
        was, b = self.has_auto_update_check(), bool(b)
        if was != b:
            self.config.set_key("auto_update_check", b, save=True)
            if b:
                self._start_auto_update_timer()
            else:
                self._stop_auto_update_timer()

    def _quit_after_last_window(self):
        if any(
            1
            for w in self.windows
            if isinstance(w, ElectrumWindow) and not w.cleaned_up
        ):
            # We can get here if we have some top-level ElectrumWindows that
            # are "minimized to tray" (hidden).  "lastWindowClosed "is emitted
            # if there are no *visible* windows.  If we actually have hidden
            # app windows (because the user hid them), then we want to *not*
            # quit the app. https://doc.qt.io/qt-5/qguiapplication.html#lastWindowClosed
            # This check and early return fixes issue #1727.
            return
        QtWidgets.qApp.quit()

    def notify(self, message):
        """Display a message in the system tray popup notification. On macOS
        this is the GROWL thing. On Windows it's a balloon popup from the system
        tray. On Linux it's usually a banner in the top of the screen."""
        if self.tray:
            try:
                # this requires Qt 5.9
                self.tray.showMessage(
                    f"{PROJECT_NAME}", message, QIcon(":icons/electrumABC.svg"), 20000
                )
            except TypeError:
                self.tray.showMessage(
                    f"{PROJECT_NAME}",
                    message,
                    QtWidgets.QSystemTrayIcon.Information,
                    20000,
                )

    def is_cashaddr(self) -> bool:
        return bool(self.get_config_addr_format() == Address.FMT_CASHADDR)

    def get_config_addr_format(self) -> str:
        return self.config.get("address_format", Address.FMT_CASHADDR)

    def toggle_cashaddr(self):
        """cycle between available address formats"""
        Address.toggle_address_format()
        self.config.set_key("address_format", Address.FMT_UI)
        self.addr_fmt_changed.emit()

    def set_address_format(self, fmt):
        """Specify which address format to use."""
        self.config.set_key("address_format", fmt)
        Address.set_address_format(fmt)
        self.addr_fmt_changed.emit()

    def is_cashaddr_status_button_hidden(self):
        return bool(self.config.get("hide_cashaddr_button", False))

    def set_cashaddr_status_button_hidden(self, b):
        b = bool(b)
        was = self.is_cashaddr_status_button_hidden()
        if was != b:
            self.config.set_key("hide_cashaddr_button", bool(b))
            self.cashaddr_status_button_hidden_signal.emit(b)

    @property
    def linux_qt_use_custom_fontconfig(self):
        """Returns True iff we are Linux and we are set to use the fonts.xml
        fontconfig override, False otherwise.  This config setting defaults to
        True for all Linux, but only is relevant to Qt GUI."""
        return bool(
            sys.platform in ("linux",)
            and self.config.get("linux_qt_use_custom_fontconfig", True)
        )

    @linux_qt_use_custom_fontconfig.setter
    def linux_qt_use_custom_fontconfig(self, b):
        if self.config.is_modifiable(
            "linux_qt_use_custom_fontconfig"
        ) and sys.platform in ("linux",):
            self.config.set_key("linux_qt_use_custom_fontconfig", bool(b))

    def main(self):
        try:
            self.init_network()
        except UserCancelled:
            return
        except GoBack:
            return
        except Exception:
            traceback.print_exc(file=sys.stdout)
            return
        self.timer.start()
        self.config.open_last_wallet()
        path = self.config.get_wallet_path()
        if not self.start_new_window(
            path, self.config.get("url"), app_is_starting=True
        ):
            return
        signal.signal(signal.SIGINT, lambda signum, frame: self.shutdown_signal.emit())

        # we want to control this in our slot (since we support non-visible,
        # backgrounded windows via the systray show/hide facility)
        self.app.setQuitOnLastWindowClosed(False)
        self.app.lastWindowClosed.connect(self._quit_after_last_window)

        def clean_up():
            # Just in case we get an exception as we exit, uninstall the ExceptionHook
            ExceptionHook.uninstall()
            # Shut down the timer cleanly
            self.timer.stop()
            self.gc_timer.stop()
            self._stop_auto_update_timer()
            # clipboard persistence. see http://www.mail-archive.com/pyqt@riverbankcomputing.com/msg17328.html
            event = QtCore.QEvent(QtCore.QEvent.Clipboard)
            self.app.sendEvent(self.app.clipboard(), event)
            self.tray.hide()

        self.app.aboutToQuit.connect(clean_up)

        # This wouldn't work anyway unless the app event loop is active, so we must
        # install it once here and no earlier.
        ExceptionHook(self.config)
        # main loop
        self.app.exec_()
        # on some platforms the exec_ call may not return, so use clean_up()
