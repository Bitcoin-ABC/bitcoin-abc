import os
import os.path
import platform
import queue
import sys
import threading
import time
import webbrowser
from collections import namedtuple
from functools import partial, wraps
from locale import atof
from typing import Optional

import qtpy
from qtpy import QtWidgets
from qtpy.QtCore import QObject, Qt, QThread, QTimer, Signal
from qtpy.QtGui import (
    QColor,
    QCursor,
    QFocusEvent,
    QFontMetrics,
    QIcon,
    QKeyEvent,
    QKeySequence,
    QPalette,
    QPixmap,
)

from electrumabc.printerror import PrintError, print_error
from electrumabc.simple_config import SimpleConfig
from electrumabc.util import Weak, finalization_print_error

if platform.system() == "Windows":
    MONOSPACE_FONT = "Consolas"
elif platform.system() == "Darwin":
    MONOSPACE_FONT = "Monaco"
else:
    MONOSPACE_FONT = "monospace"


dialogs = []


# https://docs.python.org/3/library/gettext.html#deferred-translations
def _(message):
    return message


expiration_values = [
    (_("1 hour"), 60 * 60),
    (_("1 day"), 24 * 60 * 60),
    (_("1 week"), 7 * 24 * 60 * 60),
    (_("Never"), None),
]

del _
from electrumabc.i18n import _  # noqa: E402


class EnterButton(QtWidgets.QPushButton):
    def __init__(self, text, func):
        QtWidgets.QPushButton.__init__(self, text)
        self.func = func
        self.clicked.connect(func)

    def keyPressEvent(self, e):
        if e.key() == Qt.Key_Return:
            self.func()
        else:
            super().keyPressEvent(e)


class ThreadedButton(QtWidgets.QPushButton):
    def __init__(self, text, task, on_success=None, on_error=None):
        QtWidgets.QPushButton.__init__(self, text)
        self.task = task
        self.thread = None
        self.on_success = on_success
        self.on_error = on_error
        self.clicked.connect(self.run_task)

    def run_task(self):
        self.setEnabled(False)
        self.thread = TaskThread(self)
        self.thread.add(self.task, self.on_success, self.done, self.on_error)

    def done(self):
        self.thread.stop()
        self.thread.wait()
        self.setEnabled(True)
        self.thread = None


class WWLabel(QtWidgets.QLabel):
    def __init__(self, text="", parent=None):
        QtWidgets.QLabel.__init__(self, text, parent)
        self.setWordWrap(True)
        self.setTextInteractionFlags(
            self.textInteractionFlags() | Qt.TextSelectableByMouse
        )


# --- Help widgets
class HelpMixin:
    def __init__(self, help_text, *, custom_parent=None):
        assert isinstance(self, QtWidgets.QWidget), (
            "HelpMixin must be a QWidget instance!"
        )
        self.help_text = help_text
        self.custom_parent = custom_parent
        if isinstance(self, QtWidgets.QLabel):
            self.setTextInteractionFlags(
                (self.textInteractionFlags() | Qt.TextSelectableByMouse)
                & ~Qt.TextSelectableByKeyboard
            )

    def show_help(self):
        QtWidgets.QMessageBox.information(
            self.custom_parent or self, _("Help"), self.help_text
        )


class HelpLabel(HelpMixin, QtWidgets.QLabel):
    def __init__(self, text, help_text, *, custom_parent=None):
        QtWidgets.QLabel.__init__(self, text)
        HelpMixin.__init__(self, help_text, custom_parent=custom_parent)
        self.setCursor(QCursor(Qt.PointingHandCursor))
        self.font = self.font()

    def mouseReleaseEvent(self, x):
        self.show_help()

    def enterEvent(self, event):
        self.font.setUnderline(True)
        self.setFont(self.font)
        return QtWidgets.QLabel.enterEvent(self, event)

    def leaveEvent(self, event):
        self.font.setUnderline(False)
        self.setFont(self.font)
        return QtWidgets.QLabel.leaveEvent(self, event)


class HelpButton(HelpMixin, QtWidgets.QPushButton):
    def __init__(
        self,
        text,
        *,
        button_text="?",
        fixed_size=True,
        icon=None,
        tool_tip=None,
        custom_parent=None,
    ):
        QtWidgets.QPushButton.__init__(self, button_text or "")
        HelpMixin.__init__(self, text, custom_parent=custom_parent)
        self.setToolTip(tool_tip or _("Show help"))
        self.setCursor(QCursor(Qt.PointingHandCursor))
        self.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        if fixed_size:
            self.setFixedWidth(round(2.2 * char_width_in_lineedit()))
        if icon:
            self.setIcon(icon)
        self.clicked.connect(self.show_help)
        # The below is for older plugins that may have relied on the existence
        # of this method.  The older version of this class provided this method.
        # Delete this line some day.
        self.onclick = self.show_help


# --- /Help widgets


class Buttons(QtWidgets.QHBoxLayout):
    def __init__(self, *buttons):
        QtWidgets.QHBoxLayout.__init__(self)
        self.addStretch(1)
        for b in buttons:
            self.addWidget(b)


class CloseButton(QtWidgets.QPushButton):
    def __init__(self, dialog):
        QtWidgets.QPushButton.__init__(self, _("C&lose"))
        self.clicked.connect(dialog.close)
        self.setDefault(True)


class CopyButton(QtWidgets.QPushButton):
    def __init__(self, text_getter, app=None, callback=None):
        QtWidgets.QPushButton.__init__(self, _("&Copy"))
        if not app:
            app = QtWidgets.QApplication.instance()
        self.clicked.connect(lambda: app.clipboard().setText(text_getter()))
        if callback:
            self.clicked.connect(callback)


class CopyCloseButton(QtWidgets.QPushButton):
    def __init__(self, text_getter, app, dialog):
        QtWidgets.QPushButton.__init__(self, _("&Copy and Close"))
        self.clicked.connect(lambda: app.clipboard().setText(text_getter()))
        self.clicked.connect(dialog.close)
        self.setDefault(True)


class OkButton(QtWidgets.QPushButton):
    def __init__(self, dialog, label=None):
        QtWidgets.QPushButton.__init__(self, label or _("&OK"))
        self.clicked.connect(dialog.accept)
        self.setDefault(True)


class CancelButton(QtWidgets.QPushButton):
    def __init__(self, dialog, label=None):
        QtWidgets.QPushButton.__init__(self, label or _("C&ancel"))
        self.clicked.connect(dialog.reject)


class MessageBoxMixin:
    def top_level_window_recurse(self, window=None):
        window = window or self
        for n, child in enumerate(window.children()):
            if (
                isinstance(child, QtWidgets.QWidget)
                and child.isWindow()
                and child.windowModality() != Qt.NonModal
                # Test for visibility as old closed dialogs may not be GC-ed
                and child.isVisible()
            ):
                return self.top_level_window_recurse(child)
        return window

    def top_level_window(self):
        return self.top_level_window_recurse()

    def question(
        self,
        msg,
        parent=None,
        title=None,
        icon=None,
        defaultButton=QtWidgets.QMessageBox.No,
        **kwargs,
    ):
        Yes, No = QtWidgets.QMessageBox.Yes, QtWidgets.QMessageBox.No
        if icon is None:
            icon = QtWidgets.QMessageBox.Question
        retval = self.msg_box(
            icon,
            parent,
            title or "",
            msg,
            buttons=Yes | No,
            defaultButton=defaultButton,
            **kwargs,
        )
        if isinstance(retval, (list, tuple)):
            # do some mogrification for new api
            x, *etc = retval
            # old-style API compat. result button is transformed to bool
            x = x == Yes
            retval = (x, *etc)
        else:
            # old-style api -- simple result returned
            retval = retval == Yes
        return retval

    def show_warning(self, msg, parent=None, title=None, **kwargs):
        icon = kwargs.pop("icon", None)  # may be 0
        if icon is None:
            icon = QtWidgets.QMessageBox.Warning
        return self.msg_box(icon, parent, title or _("Warning"), msg, **kwargs)

    def show_error(self, msg, parent=None, title=None, **kwargs):
        icon = kwargs.pop("icon", None)  # may be 0
        if icon is None:
            icon = QtWidgets.QMessageBox.Warning
        return self.msg_box(icon, parent, title or _("Error"), msg, **kwargs)

    def show_critical(self, msg, parent=None, title=None, **kwargs):
        icon = kwargs.pop("icon", None)  # may be 0
        if icon is None:
            icon = QtWidgets.QMessageBox.Critical
        return self.msg_box(icon, parent, title or _("Critical Error"), msg, **kwargs)

    def show_message(self, msg, parent=None, title=None, **kwargs):
        icon = kwargs.pop("icon", None)  # may be 0
        if icon is None:
            icon = QtWidgets.QMessageBox.Information
        return self.msg_box(icon, parent, title or _("Information"), msg, **kwargs)

    def msg_box(
        self,
        icon,
        parent,
        title,
        text,
        buttons=QtWidgets.QMessageBox.Ok,  # Also accepts a list/tuple of str's (for custom buttons)
        defaultButton=QtWidgets.QMessageBox.NoButton,  # IFF buttons is a list, use a string appearing in the list to specify this
        rich_text=False,
        detail_text=None,
        informative_text=None,
        checkbox_text=None,
        checkbox_ischecked=False,  # If checkbox_text is set, will add a checkbox, and return value becomes a tuple (result(), isChecked())
        escapeButton=QtWidgets.QMessageBox.NoButton,  # IFF buttons is a list, use a string appearing in the list to specify this
        app_modal=False,  # IFF true, set the popup window to be application modal
    ):
        """Note about 'new' msg_box API (this applies to all of the above functions that call into this as well):
        - `icon' may not be either a standard QMessageBox.Icon or a QPixmap for a custom icon.
        - `buttons' may be a list of translated button texts to use, or the old-style QMessageBox.StandardButtons bitfields
        - If `buttons' is a list, the result returned will be an index (int) into this list, signifying which button was clicked.
        - If `buttons' is a list of button texts, then defaultButton= and escapeButton= must also be the text of the button you want to give the designated property to
        - If the `checkbox_text' arg is set, the return value will be a tuple of: ( result(), checkbox.isChecked() )
          (otherwise it's just simple value: result(), if no checkbox_text is specified)
        """
        parent = parent or self.top_level_window()
        d = QMessageBoxMixin(parent)
        d.setWindowModality(Qt.ApplicationModal if app_modal else Qt.WindowModal)
        d.setWindowTitle(title)
        if isinstance(buttons, (list, tuple)):
            # new! We support a button list, which specifies button text
            # defaultButton must match which button to be default
            # Return value will be the index of the button push in this list!
            for b in buttons:
                assert isinstance(b, (str, QtWidgets.QAbstractButton)), (
                    "MessageBoxMixin msg_box API usage error: expected a list of str's"
                    " or QAbstractButtons!"
                )
                role = (
                    QtWidgets.QMessageBox.AcceptRole
                    if defaultButton == b
                    else QtWidgets.QMessageBox.RejectRole
                )
                but = d.addButton(b, role)
                if b == defaultButton:
                    d.setDefaultButton(but)
                if b == escapeButton:
                    d.setEscapeButton(but)
        else:
            # Was the plain-old Qt.StandardButtons usage
            d.setStandardButtons(buttons)
            d.setDefaultButton(defaultButton)
            d.setEscapeButton(escapeButton)
        if isinstance(icon, QPixmap):
            # New! Icon can be a pixmap!
            d.setIconPixmap(icon)
        else:
            d.setIcon(icon)
        if detail_text and isinstance(detail_text, str):
            d.setDetailedText(detail_text)
        if informative_text and isinstance(informative_text, str):
            d.setInformativeText(informative_text)
        if rich_text:
            d.setTextInteractionFlags(
                d.textInteractionFlags()
                | Qt.TextSelectableByMouse
                | Qt.LinksAccessibleByMouse
            )
            d.setTextFormat(Qt.RichText)
        else:
            d.setTextInteractionFlags(Qt.TextSelectableByMouse)
            d.setTextFormat(Qt.PlainText)
        d.setText(str(text))
        if checkbox_text and isinstance(checkbox_text, str):
            chk = QtWidgets.QCheckBox(checkbox_text)
            d.setCheckBox(chk)

            def on_chk(b):
                nonlocal checkbox_ischecked
                checkbox_ischecked = bool(b)

            chk.setChecked(bool(checkbox_ischecked))
            chk.clicked.connect(on_chk)
            res = d.exec_()
            ret = (
                res,
                checkbox_ischecked,
            )  # new API returns a tuple if a checkbox is specified
        else:
            ret = d.exec_()  # old/no checkbox api
        try:
            d.setParent(None)  # Force GC sooner rather than later.
        except RuntimeError as e:
            # C++ object deleted -- can happen with misbehaving client code that kills parent from dialog ok
            print_error(
                "MsgBoxMixin WARNING: client code is killing the dialog box's"
                " parent before function return:",
                str(e),
            )
        return ret


class QMessageBoxMixin(QtWidgets.QMessageBox, MessageBoxMixin):
    """This class's sole purpose is so that MessageBoxMixin.msg_box() always
    presents a message box that has the mixin methods.
    See https://github.com/Electron-Cash/Electron-Cash/issues/980."""

    pass


class WindowModalDialog(QtWidgets.QDialog, MessageBoxMixin):
    """Handy wrapper; window modal dialogs are better for our multi-window
    daemon model as other wallet windows can still be accessed."""

    def __init__(self, parent, title=None):
        QtWidgets.QDialog.__init__(self, parent)
        self.setWindowModality(Qt.WindowModal)
        if title:
            self.setWindowTitle(title)


class AppModalDialog(MessageBoxMixin, QtWidgets.QDialog):
    """Convenience class -- like the WindowModalDialog but is app-modal.
    Has all the MessageBoxMixin convenience methods.  Is always top-level and
    parentless."""

    def __init__(self, parent=None, title=None, windowFlags=None):
        QtWidgets.QDialog.__init__(self, parent=parent)
        self.setWindowModality(Qt.ApplicationModal)
        if title:
            self.setWindowTitle(title)
        if windowFlags is not None:
            self.setWindowFlags(windowFlags)


class WaitingDialog(WindowModalDialog):
    """Shows a please wait dialog whilst running a task.  It is not
    necessary to maintain a reference to this dialog.

    Note if disable_escape_key is not set, user can hit cancel to prematurely
    close the dialog. Sometimes this is desirable, and sometimes it isn't, hence
    why the option is offered."""

    _update_progress_sig = Signal(int)

    def __init__(
        self,
        parent,
        message,
        task,
        on_success=None,
        on_error=None,
        auto_cleanup=True,
        *,
        auto_show=True,
        auto_exec=False,
        title=None,
        disable_escape_key=False,
        progress_bar=None,
        progress_min=0,
        progress_max=0,
    ):
        assert parent
        if isinstance(parent, MessageBoxMixin):
            parent = parent.top_level_window()
        WindowModalDialog.__init__(self, parent, title or _("Please wait"))
        self.auto_cleanup = auto_cleanup
        self.disable_escape_key = disable_escape_key
        self._vbox = vbox = QtWidgets.QVBoxLayout(self)
        self._label = label = QtWidgets.QLabel(message)
        vbox.addWidget(label)
        self.accepted.connect(self.on_accepted)
        self.rejected.connect(self.on_rejected)
        self._pbar = None
        if progress_bar:
            self._pbar = p = QtWidgets.QProgressBar()
            p.setMinimum(progress_min)
            p.setMaximum(progress_max)
            if isinstance(progress_bar, str):
                p.setTitle(progress_bar)
            self._update_progress_sig.connect(p.setValue)
            vbox.addWidget(p)
        if auto_show and not auto_exec:
            self.open()
        self.thread = TaskThread(self)
        self.thread.add(task, on_success, self.accept, on_error)
        if auto_exec:
            self.exec_()
        finalization_print_error(self)  # track object lifecycle

    def wait(self):
        self.thread.wait()

    def update_progress(self, progress: int):
        if not self._pbar:
            return
        try:
            progress = int(progress)
        except (ValueError, TypeError):
            return
        else:
            self._update_progress_sig.emit(progress)

    def on_accepted(self):
        self.thread.stop()
        if self.auto_cleanup:
            # wait for thread to complete so that we can get cleaned up
            self.wait()
            # this causes GC to happen sooner rather than later. Before this call was
            # added the WaitingDialogs would stick around in memory until the
            # ElectrumWindow was closed and would never get GC'd before then.
            # (as of PyQt5 5.11.3)
            self.setParent(None)

    def on_rejected(self):
        if self.auto_cleanup:
            self.setParent(None)

    def keyPressEvent(self, e):
        """The user can hit Cancel to close the dialog before the task is done.
        If self.disable_escape_key, then we suppress this unwanted behavior.
        Note: Do not enable self.disable_escape_key for extremely long
        operations."""
        if e.matches(QKeySequence.Cancel) and self.disable_escape_key:
            e.ignore()
        else:
            super().keyPressEvent(e)


def text_dialog(
    parent,
    title,
    label,
    ok_label,
    config: SimpleConfig,
    default=None,
    allow_multi=False,
):
    from .qrtextedit import ScanQRTextEdit

    dialog = WindowModalDialog(parent, title)
    dialog.setMinimumWidth(500)
    layout = QtWidgets.QVBoxLayout()
    dialog.setLayout(layout)
    layout.addWidget(QtWidgets.QLabel(label))
    txt = ScanQRTextEdit(config, allow_multi=allow_multi)
    if default:
        txt.setText(default)
    layout.addWidget(txt)
    layout.addLayout(Buttons(CancelButton(dialog), OkButton(dialog, ok_label)))
    if dialog.exec_():
        return txt.toPlainText()


class ChoicesLayout(object):
    def __init__(self, msg, choices, on_clicked=None, checked_index=0):
        vbox = QtWidgets.QVBoxLayout()
        if len(msg) > 50:
            vbox.addWidget(WWLabel(msg))
            msg = ""
        gb2 = QtWidgets.QGroupBox(msg)
        vbox.addWidget(gb2)

        vbox2 = QtWidgets.QVBoxLayout()
        gb2.setLayout(vbox2)

        self.group = group = QtWidgets.QButtonGroup()
        for i, c in enumerate(choices):
            button = QtWidgets.QRadioButton(gb2)
            button.setText(c)
            vbox2.addWidget(button)
            group.addButton(button)
            group.setId(button, i)
            if i == checked_index:
                button.setChecked(True)

        if on_clicked:
            group.buttonClicked.connect(partial(on_clicked, self))

        self.vbox = vbox

    def layout(self):
        return self.vbox

    def selected_index(self):
        return self.group.checkedId()


def address_combo(addresses):
    addr_combo = QtWidgets.QComboBox()
    addr_combo.addItems(addr.to_ui_string() for addr in addresses)
    addr_combo.setCurrentIndex(0)

    hbox = QtWidgets.QHBoxLayout()
    hbox.addWidget(QtWidgets.QLabel(_("Address to sweep to:")))
    hbox.addWidget(addr_combo)
    return hbox, addr_combo


def filename_field(config, defaultname, select_msg):
    gb = QtWidgets.QGroupBox(_("Format"))
    vbox = QtWidgets.QVBoxLayout()
    gb.setLayout(vbox)
    b1 = QtWidgets.QRadioButton()
    b1.setText(_("CSV"))
    b2 = QtWidgets.QRadioButton()
    b2.setText(_("JSON"))
    if defaultname.endswith(".json"):
        b2.setChecked(True)
    else:
        b1.setChecked(True)
    vbox.addWidget(b1)
    vbox.addWidget(b2)

    hbox = QtWidgets.QHBoxLayout()

    directory = config.get("io_dir", os.path.expanduser("~"))
    path = os.path.join(directory, defaultname)
    filename_e = QtWidgets.QLineEdit()
    filename_e.setText(path)

    def func():
        text = filename_e.text()
        _filter = (
            "*.csv"
            if text.endswith(".csv")
            else "*.json"
            if text.endswith(".json")
            else None
        )
        p, __ = QtWidgets.QFileDialog.getSaveFileName(None, select_msg, text, _filter)
        if p:
            filename_e.setText(p)

    button = QtWidgets.QPushButton(_("File"))
    button.clicked.connect(func)
    hbox.addWidget(button)
    hbox.addWidget(filename_e)
    vbox.addLayout(hbox)

    def set_csv(v):
        text = filename_e.text()
        text = text.replace(".json", ".csv") if v else text.replace(".csv", ".json")
        filename_e.setText(text)

    b1.clicked.connect(lambda: set_csv(True))
    b2.clicked.connect(lambda: set_csv(False))

    return gb, filename_e, b1


class OverlayControlMixin:
    STYLE_SHEET_COMMON = """
    QPushButton { border-width: 1px; padding: 0px; margin: 0px; }
    """

    STYLE_SHEET_LIGHT = """
    QPushButton { border: 1px solid transparent; }
    QPushButton:hover { border: 1px solid #3daee9; }
    """

    STYLE_SHEET_MAC = """
    QPushButton { border-width: 1px; padding: 0px; margin: 2px; }
    QPushButton { border: 1px solid transparent; }
    QPushButton:hover { border: 1px solid #3daee9; }
    """

    def __init__(self, middle: bool = False):
        assert isinstance(self, QtWidgets.QWidget)
        self.middle = middle
        self.overlay_widget = QtWidgets.QWidget(self)
        self._updateSverlayStyleSheet()
        self.overlay_layout = QtWidgets.QHBoxLayout(self.overlay_widget)
        self.overlay_layout.setContentsMargins(0, 0, 0, 0)
        self.overlay_layout.setSpacing(1)
        self._updateOverlayPos()

    def _updateSverlayStyleSheet(self):
        if sys.platform in ("darwin",):
            # On Mac, in Mojave dark mode, we get some strange button spacing
            # if we use the regular common sheet, so we must use a custom sheet.
            style_sheet = self.STYLE_SHEET_MAC
        else:
            style_sheet = self.STYLE_SHEET_COMMON
            if not ColorScheme.dark_scheme:
                style_sheet = style_sheet + self.STYLE_SHEET_LIGHT
        self.overlay_widget.setStyleSheet(style_sheet)

    def showEvent(self, e):
        super().showEvent(e)
        self._updateSverlayStyleSheet()

    def resizeEvent(self, e):
        super().resizeEvent(e)
        self._updateOverlayPos()

    def _updateOverlayPos(self):
        frame_width = self.style().pixelMetric(QtWidgets.QStyle.PM_DefaultFrameWidth)
        overlay_size = self.overlay_widget.sizeHint()
        x = self.rect().right() - frame_width - overlay_size.width()
        y = self.rect().bottom() - overlay_size.height()
        middle = self.middle
        if hasattr(self, "document"):
            # Keep the buttons centered if we have less than 2 lines in the editor
            line_spacing = QFontMetrics(self.document().defaultFont()).lineSpacing()
            if self.rect().height() < (line_spacing * 2):
                middle = True
        y = (y // 2) + frame_width if middle else y - frame_width
        if hasattr(self, "verticalScrollBar") and self.verticalScrollBar().isVisible():
            scrollbar_width = self.style().pixelMetric(
                QtWidgets.QStyle.PM_ScrollBarExtent
            )
            x -= scrollbar_width
        self.overlay_widget.move(x, y)

    def addWidget(self, widget: QtWidgets.QWidget, index: Optional[int] = None):
        if index is not None:
            self.overlay_layout.insertWidget(index, widget)
        else:
            self.overlay_layout.addWidget(widget)

    def addButton(
        self,
        icon_name: str,
        on_click,
        tooltip: str,
        index: Optional[int] = None,
        *,
        text: Optional[str] = None,
    ) -> QtWidgets.QAbstractButton:
        """icon_name may be None but then you must define text (which is
        hopefully then some nice Unicode character). Both cannot be None.

        `on_click` is the callable to connect to the button.clicked signal.

        Use `index` to insert it not at the end of the layout by anywhere in the
        layout. If None, it will be appended to the right of the layout."""
        button = QtWidgets.QPushButton(self.overlay_widget)
        button.setToolTip(tooltip)
        button.setCursor(QCursor(Qt.PointingHandCursor))
        if icon_name:
            button.setIcon(QIcon(icon_name))
        elif text:
            button.setText(text)
        if not icon_name and not text:
            raise AssertionError(
                "OverlayControlMixin.addButton: Button must have either icon_name or"
                " text defined!"
            )
        button.clicked.connect(on_click)
        self.addWidget(button, index)
        return button

    def addCopyButton(self) -> QtWidgets.QAbstractButton:
        return self.addButton(":icons/copy.png", self.on_copy, _("Copy to clipboard"))

    def on_copy(self):
        copy_to_clipboard(self.text(), self)

    def keyPressEvent(self, e):
        if not self.hasFocus():
            # Ignore keypress when we're not focused like when the focus is on a button
            e.ignore()
            return
        super().keyPressEvent(e)

    def keyReleaseEvent(self, e):
        if not self.hasFocus():
            e.ignore()
            return
        super().keyReleaseEvent(e)


class ButtonsLineEdit(OverlayControlMixin, QtWidgets.QLineEdit):
    def __init__(self, text=None):
        QtWidgets.QLineEdit.__init__(self, text)
        OverlayControlMixin.__init__(self, middle=True)


class ButtonsTextEdit(OverlayControlMixin, QtWidgets.QPlainTextEdit):
    def __init__(self, text=None):
        QtWidgets.QPlainTextEdit.__init__(self, text)
        OverlayControlMixin.__init__(self)
        self.setText = self.setPlainText
        self.text = self.toPlainText


class PasswordLineEdit(QtWidgets.QLineEdit):
    def __init__(self, *args, **kwargs):
        QtWidgets.QLineEdit.__init__(self, *args, **kwargs)
        self.setEchoMode(QtWidgets.QLineEdit.EchoMode.Password)


class TaskThread(PrintError, QThread):
    """Thread that runs background tasks.  Callbacks are guaranteed
    to happen in the context of its parent."""

    Task = namedtuple("Task", "task cb_success cb_done cb_error")
    doneSig = Signal(object, object, object)

    def __init__(self, parent, on_error=None, *, name=None):
        QThread.__init__(self, parent)
        if name is not None:
            self.setObjectName(name)
        self.on_error = on_error
        self.tasks = queue.Queue()
        self.doneSig.connect(self.on_done)
        Weak.finalization_print_error(self)  # track task thread lifecycle in debug log
        self.start()

    def add(self, task, on_success=None, on_done=None, on_error=None):
        on_error = on_error or self.on_error
        self.tasks.put(TaskThread.Task(task, on_success, on_done, on_error))

    def diagnostic_name(self):
        name = self.__class__.__name__
        o = self.objectName() or ""
        if o:
            name += "/" + o
        return name

    def run(self):
        self.print_error("started")
        try:
            while True:
                task = self.tasks.get()
                if not task:
                    break
                try:
                    result = task.task()
                    self.doneSig.emit(result, task.cb_done, task.cb_success)
                except Exception:
                    self.doneSig.emit(sys.exc_info(), task.cb_done, task.cb_error)
        finally:
            self.print_error("exiting")

    def on_done(self, result, cb_done, cb):
        # This runs in the parent's thread.
        if cb_done:
            cb_done()
        if cb:
            cb(result)

    def stop(self, *, waitTime=None):
        """pass optional time to wait in seconds (float).  If no waitTime
        specified, will not wait."""
        self.tasks.put(None)
        if waitTime is not None and self.isRunning():
            if not self.wait(int(waitTime * 1e3)):  # secs -> msec
                self.print_error(f"wait timed out after {waitTime} seconds")


class ColorSchemeItem:
    def __init__(self, fg_color, bg_color):
        self.colors = (fg_color, bg_color)

    def _get_color(self, background):
        return self.colors[(int(background) + int(ColorScheme.dark_scheme)) % 2]

    def as_stylesheet(self, background=False):
        css_prefix = "background-" if background else ""
        color = self._get_color(background)
        return "QWidget {{ {}color:{}; }}".format(css_prefix, color)

    def as_color(self, background=False):
        color = self._get_color(background)
        return QColor(color)

    def get_html(self, background=False):
        return self._get_color(background)


class _ColorScheme:
    def __init__(self):
        self._dark_scheme = False

        from .utils import darkdetect

        self._dark_detector = darkdetect.isDark

        self.DEEPGREEN = ColorSchemeItem("#335c33", "#7ac276")
        self.GREEN = ColorSchemeItem("#117c11", "#8af296")
        self.SLPGREEN = ColorSchemeItem(
            "#25863f", "#8af296"
        )  # darker alternative: ColorSchemeItem("#25863f", "#60bc70")
        self.YELLOW = ColorSchemeItem("#897b2a", "#ffff00")
        self.PINK = ColorSchemeItem("#9c4444", "#ffbaba")
        self.RED = ColorSchemeItem("#7c1111", "#f18c8c")
        self.BLUE = ColorSchemeItem("#123b7c", "#8cb3f2")
        self.DEFAULT = ColorSchemeItem("black", "white")
        if sys.platform.startswith("win"):
            self.GRAY = ColorSchemeItem("#6a6864", "#a0a0a4")  # darkGray, gray
        else:
            self.GRAY = ColorSchemeItem("#777777", "#a0a0a4")  # darkGray, gray

    def has_dark_background(self, widget):
        if qtpy.QT5:
            bg_color_role = QPalette.Background
        else:
            bg_color_role = QPalette.ColorRole.Window
        brightness = sum(widget.palette().color(bg_color_role).getRgb()[0:3])
        return brightness < (255 * 3 / 2)

    def update_from_widget(self, widget, *, force_dark=False):
        self.dark_scheme = bool(force_dark or self.has_dark_background(widget))

    @property
    def dark_scheme(self):
        """Getter. We rely on the _dark_detector function. If it returns None
        we know the _dark_detector is invalid so we just use the cached
        setting."""
        detected = self._dark_detector()
        if detected is not None:
            return detected
        else:
            return self._dark_scheme

    @dark_scheme.setter
    def dark_scheme(self, b):
        """Note that the setter may not actually take effect if using the
        system-specific dark detector (MacOS Mojave+ only)."""
        self._dark_scheme = b


ColorScheme = _ColorScheme()


class SortableTreeWidgetItem(QtWidgets.QTreeWidgetItem):
    DataRole = Qt.UserRole + 1

    def __lt__(self, other):
        column = self.treeWidget().sortColumn()
        self_data = self.data(column, self.DataRole)
        other_data = other.data(column, self.DataRole)
        if None not in (self_data, other_data):
            # We have set custom data to sort by
            return self_data < other_data
        try:
            return atof(self.text(column)) < atof(other.text(column))
        except ValueError:
            # If not, we will just do string comparison
            return self.text(column) < other.text(column)


class RateLimiter(PrintError):
    """Manages the state of a @rate_limited decorated function, collating
    multiple invocations. This class is not intended to be used directly. Instead,
    use the @rate_limited decorator (for instance methods).

    This state instance gets inserted into the instance attributes of the target
    object wherever a @rate_limited decorator appears.

    The inserted attribute is named "__FUNCNAME__RateLimiter"."""

    # some defaults
    last_ts = 0.0
    timer = None
    saved_args = ((), {})
    ctr = 0

    def __init__(self, rate, ts_after, obj, func):
        self.n = func.__name__
        self.qn = func.__qualname__
        self.rate = rate
        self.ts_after = ts_after
        self.obj = Weak.ref(
            obj
        )  # keep a weak reference to the object to prevent cycles
        self.func = func
        # self.print_error("*** Created: func=",func,"obj=",obj,"rate=",rate)

    def diagnostic_name(self):
        return "{}:{}".format("rate_limited", self.qn)

    def kill_timer(self):
        if self.timer:
            # self.print_error("deleting timer")
            try:
                self.timer.stop()
                self.timer.deleteLater()
            except RuntimeError as e:
                if "c++ object" in str(e).lower():
                    # This can happen if the attached object which actually owns
                    # QTimer is deleted by Qt before this call path executes.
                    # This call path may be executed from a queued connection in
                    # some circumstances, hence the crazyness (I think).
                    self.print_error(
                        "advisory: QTimer was already deleted by Qt, ignoring..."
                    )
                else:
                    raise
            finally:
                self.timer = None

    @classmethod
    def attr_name(cls, func):
        return "__{}__{}".format(func.__name__, cls.__name__)

    @classmethod
    def invoke(cls, rate, ts_after, func, args, kwargs):
        """Calls _invoke() on an existing RateLimiter object (or creates a new
        one for the given function on first run per target object instance)."""
        assert args and isinstance(args[0], object), (
            "@rate_limited decorator may only be used with object instance methods"
        )
        assert threading.current_thread() is threading.main_thread(), (
            "@rate_limited decorator may only be used with functions called in the main"
            " thread"
        )
        obj = args[0]
        a_name = cls.attr_name(func)
        # print_error("*** a_name =",a_name,"obj =",obj)
        # we hide the RateLimiter state object in an attribute (name based on the
        # wrapped function name) in the target object
        rl = getattr(obj, a_name, None)
        if rl is None:
            # must be the first invocation, create a new RateLimiter state instance.
            rl = cls(rate, ts_after, obj, func)
            setattr(obj, a_name, rl)
        return rl._invoke(args, kwargs)

    def _invoke(self, args, kwargs):
        # since we're collating, save latest invocation's args unconditionally. any
        # future invocation will use the latest saved args.
        self._push_args(args, kwargs)
        self.ctr += 1  # increment call counter
        # self.print_error("args_saved",args,"kwarg_saved",kwargs)
        if not self.timer:  # check if there's a pending invocation already
            now = time.time()
            diff = float(self.rate) - (now - self.last_ts)
            if diff <= 0:
                # Time since last invocation was greater than self.rate, so call the
                # function directly now.
                # self.print_error("calling directly")
                return self._doIt()
            else:
                # Time since last invocation was less than self.rate, so defer to the
                # future with a timer.
                self.timer = QTimer(
                    self.obj() if isinstance(self.obj(), QObject) else None
                )
                self.timer.timeout.connect(self._doIt)
                # self.timer.destroyed.connect(lambda x=None,qn=self.qn: print(qn,"Timer deallocated"))
                self.timer.setSingleShot(True)
                self.timer.start(int(diff * 1e3))
                # self.print_error("deferring")
        else:
            # We had a timer active, which means as future call will occur. So return
            # early and let that call happenin the future.
            # Note that a side-effect of this aborted invocation was to update
            # self.saved_args.
            pass
            # self.print_error("ignoring (already scheduled)")

    def _pop_args(self):
        # grab the latest collated invocation's args. this attribute is always defined.
        args, kwargs = self.saved_args
        # clear saved args immediately
        self.saved_args = ((), {})
        return args, kwargs

    def _push_args(self, args, kwargs):
        self.saved_args = (args, kwargs)

    def _doIt(self):
        # self.print_error("called!")
        t0 = time.time()
        args, kwargs = self._pop_args()
        # self.print_error("args_actually_used",args,"kwarg_actually_used",kwargs)
        ctr0 = (
            self.ctr
        )  # read back current call counter to compare later for reentrancy detection
        retval = self.func(
            *args, **kwargs
        )  # and.. call the function. use latest invocation's args
        was_reentrant = (
            self.ctr != ctr0
        )  # if ctr is not the same, func() led to a call this function!
        del args, kwargs  # deref args right away (allow them to get gc'd)
        tf = time.time()
        time_taken = tf - t0
        if self.ts_after:
            self.last_ts = tf
        else:
            if time_taken > float(self.rate):
                self.print_error(
                    "method took too long: {} > {}. Fudging timestamps to compensate.".format(
                        time_taken, self.rate
                    )
                )
                self.last_ts = tf  # Hmm. This function takes longer than its rate to complete. so mark its last run time as 'now'. This breaks the rate but at least prevents this function from starving the CPU (benforces a delay).
            else:
                self.last_ts = t0  # Function takes less than rate to complete, so mark its t0 as when we entered to keep the rate constant.

        if (
            self.timer
        ):  # timer is not None if and only if we were a delayed (collated) invocation.
            if was_reentrant:
                # we got a reentrant call to this function as a result of calling func() above! re-schedule the timer.
                self.print_error("*** detected a re-entrant call, re-starting timer")
                time_left = float(self.rate) - (tf - self.last_ts)
                self.timer.start(time_left * 1e3)
            else:
                # We did not get a reentrant call, so kill the timer so subsequent calls can schedule the timer and/or call func() immediately.
                self.kill_timer()
        elif was_reentrant:
            self.print_error("*** detected a re-entrant call")

        return retval


class RateLimiterClassLvl(RateLimiter):
    """This RateLimiter object is used if classlevel=True is specified to the
    @rate_limited decorator.  It inserts the __RateLimiterClassLvl state object
    on the class level and collates calls for all instances to not exceed rate.

    Each instance is guaranteed to receive at least 1 call and to have multiple
    calls updated with the latest args for the final call. So for instance:

    a.foo(1)
    a.foo(2)
    b.foo(10)
    b.foo(3)

    Would collate to a single 'class-level' call using 'rate':

    a.foo(2) # latest arg taken, collapsed to 1 call
    b.foo(3) # latest arg taken, collapsed to 1 call

    """

    @classmethod
    def invoke(cls, rate, ts_after, func, args, kwargs):
        assert args and not isinstance(args[0], type), (
            "@rate_limited decorator may not be used with static or class methods"
        )
        obj = args[0]
        objcls = obj.__class__
        args = list(args)
        # prepend obj class to trick super.invoke() into making this state object be
        # class-level.
        args.insert(0, objcls)
        return super(RateLimiterClassLvl, cls).invoke(
            rate, ts_after, func, args, kwargs
        )

    def _push_args(self, args, kwargs):
        objcls, obj = args[0:2]
        args = args[2:]
        self.saved_args[obj] = (args, kwargs)

    def _pop_args(self):
        weak_dict = self.saved_args
        self.saved_args = Weak.KeyDictionary()
        return (weak_dict,), {}

    def _call_func_for_all(self, weak_dict):
        for ref in weak_dict.keyrefs():
            obj = ref()
            if obj:
                args, kwargs = weak_dict[obj]
                self.func_target(obj, *args, **kwargs)

    def __init__(self, rate, ts_after, obj, func):
        # note: obj here is really the __class__ of the obj because we prepended the
        # class in our custom invoke() above.
        super().__init__(rate, ts_after, obj, func)
        self.func_target = func
        self.func = self._call_func_for_all
        # we don't use a simple arg tuple, but instead an instance -> args,kwargs
        # dictionary to store collated calls, per instance collated
        self.saved_args = Weak.KeyDictionary()


def rate_limited(rate, *, classlevel=False, ts_after=False):
    """A Function decorator for rate-limiting GUI event callbacks. Argument
    rate in seconds is the minimum allowed time between subsequent calls of
    this instance of the function. Calls that arrive more frequently than
    rate seconds will be collated into a single call that is deferred onto
    a QTimer. It is preferable to use this decorator on QObject subclass
    instance methods. This decorator is particularly useful in limiting
    frequent calls to GUI update functions.

    params:
        rate - calls are collated to not exceed rate (in seconds)
        classlevel - if True, specify that the calls should be collated at
            1 per `rate` secs. for *all* instances of a class, otherwise
            calls will be collated on a per-instance basis.
        ts_after - if True, mark the timestamp of the 'last call' AFTER the
            target method completes.  That is, the collation of calls will
            ensure at least `rate` seconds will always elapse between
            subsequent calls. If False, the timestamp is taken right before
            the collated calls execute (thus ensuring a fixed period for
            collated calls).
            TL;DR: ts_after=True : `rate` defines the time interval you want
                                    from last call's exit to entry into next
                                    call.
                   ts_adter=False: `rate` defines the time between each
                                    call's entry.

    (See on_fx_quotes & on_fx_history in main_window.py for example usages
    of this decorator)."""

    def wrapper0(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if classlevel:
                return RateLimiterClassLvl.invoke(rate, ts_after, func, args, kwargs)
            return RateLimiter.invoke(rate, ts_after, func, args, kwargs)

        return wrapper

    return wrapper0


debug_destroyed = False  # Set this to True to debug QObject "destroyed" signals using destroyed_print_error


def destroyed_print_error(qobject, msg=None):
    """Supply a message to be printed via print_error when obj is destroyed (Qt C++ deleted).
    This is useful for debugging memory leaks. Note that this function is a no-op unless debug_destroyed is True.
    """
    assert isinstance(qobject, QObject), (
        "destroyed_print_error can only be used on QObject instances!"
    )
    if not debug_destroyed:
        return
    if msg is None:
        # Generate a useful message if none is supplied.
        if isinstance(qobject, PrintError):
            name = qobject.diagnostic_name()
        else:
            name = qobject.objectName() or ""
        if not name:
            if isinstance(qobject, QtWidgets.QAction) and qobject.text():
                name = "Action: " + qobject.text()
            elif isinstance(qobject, QtWidgets.QMenu) and qobject.title():
                name = "QMenu: " + qobject.title()
            else:
                try:
                    name = (
                        qobject.parent().objectName()
                        or qobject.parent().__class__.__qualname__
                    ) + "."
                except Exception:
                    pass  # some of the code in this project overrites .parent or it may not have a parent
                name += qobject.__class__.__qualname__
        msg = f"[{name}] destroyed"

    def on_destroyed(obj_ignored):
        print_error(msg)

    qobject.destroyed.connect(on_destroyed)


def webopen(url: str):
    if (
        sys.platform == "linux"
        and os.environ.get("APPIMAGE")
        and os.environ.get("LD_LIBRARY_PATH") is not None
    ):
        # When on Linux webbrowser.open can fail in AppImage because it can't find the correct libdbus.
        # We just fork the process and unset LD_LIBRARY_PATH before opening the URL.
        # See https://github.com/spesmilo/electrum/issues/5425
        if os.fork() == 0:
            del os.environ["LD_LIBRARY_PATH"]
            webbrowser.open(url)
            # Python docs advise doing this after forking to prevent atexit handlers
            # from executing.
            os._exit(0)
    else:
        webbrowser.open(url)


class TextBrowserKeyboardFocusFilter(QtWidgets.QTextBrowser):
    """
    This is a QTextBrowser that only enables keyboard text selection when the focus reason is
    keyboard shortcuts or when a key is pressed while focused. Any other focus reason will
    deactivate keyboard text selection.
    """

    def __init__(self, parent: Optional[QtWidgets.QWidget] = None):
        super().__init__(parent)

    def focusInEvent(self, e: QFocusEvent):
        if e.reason() in (
            Qt.TabFocusReason,
            Qt.BacktabFocusReason,
            Qt.ShortcutFocusReason,
        ):
            # Focused because of Tab, Shift+Tab or keyboard accelerator
            self.setTextInteractionFlags(
                self.textInteractionFlags() | Qt.TextSelectableByKeyboard
            )
        else:
            self.setTextInteractionFlags(
                self.textInteractionFlags() & ~Qt.TextSelectableByKeyboard
            )
        super().focusInEvent(e)

    def keyPressEvent(self, e: QKeyEvent):
        self.setTextInteractionFlags(
            self.textInteractionFlags() | Qt.TextSelectableByKeyboard
        )
        super().keyPressEvent(e)


def char_width_in_lineedit() -> int:
    char_width = QFontMetrics(QtWidgets.QLineEdit().font()).averageCharWidth()
    # 'averageCharWidth' seems to underestimate on Windows, hence 'max()'
    return max(9, char_width)


# custom wrappers for getOpenFileName and getSaveFileName, that remember the path
# selected by the user
def getOpenFileName(title, config: SimpleConfig, filtr="", parent=None):
    userdir = os.path.expanduser("~")
    directory = config.get("io_dir", userdir)
    fileName, __ = QtWidgets.QFileDialog.getOpenFileName(
        parent, title, directory, filtr
    )
    if fileName and directory != os.path.dirname(fileName):
        config.set_key("io_dir", os.path.dirname(fileName), True)
    return fileName


def getSaveFileName(title, filename, config: SimpleConfig, filtr="", parent=None):
    userdir = os.path.expanduser("~")
    directory = config.get("io_dir", userdir)
    path = os.path.join(directory, filename)
    fileName, __ = QtWidgets.QFileDialog.getSaveFileName(parent, title, path, filtr)
    if fileName and directory != os.path.dirname(fileName):
        config.set_key("io_dir", os.path.dirname(fileName), True)
    return fileName


def copy_to_clipboard(
    text: str = "", widget: Optional[QtWidgets.QWidget] = None, tooltip: str = ""
):
    """Copy text to clipboard and show a tooltip.
    If text is not specified and widget is a QTextEdit, copy the selected text in the widget.
    """
    tooltip = tooltip or _("Text copied to clipboard")
    if not text and isinstance(widget, QtWidgets.QTextEdit):
        widget.copy()
    else:
        QtWidgets.QApplication.instance().clipboard().setText(text)
    if widget is not None:
        QtWidgets.QToolTip.showText(QCursor.pos(), tooltip, widget)


if __name__ == "__main__":
    app = QtWidgets.QApplication([])
    t = WaitingDialog(
        None,
        "testing ...",
        lambda: [time.sleep(1)],
        lambda x: QtWidgets.QMessageBox.information(None, "done", "done"),
    )
    t.start()
    app.exec_()
