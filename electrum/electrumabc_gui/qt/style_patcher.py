"""
This is used to patch the QApplication style sheet.
It reads the current stylesheet, appends our modifications and sets the new stylesheet.
"""
from typing import Optional

from PyQt5 import QtWidgets

from electrumabc.printerror import print_error

OLD_QDARKSTYLE_PATCH = """
QWidget:disabled {
    color: hsl(0, 0, 50%);
}
QPushButton:disabled {
    border-color: hsl(0, 0, 50%);
    color: hsl(0, 0, 50%);
}
"""

CUSTOM_PATCH_FOR_DARK_THEME = """
/* PayToEdit text was being clipped */
QAbstractScrollArea {
    padding: 0px;
}
/* In History tab, labels while edited were being clipped (Windows) */
QAbstractItemView QLineEdit {
    padding: 0px;
    show-decoration-selected: 1;
}
/* Checked item in dropdowns have way too much height...
   see #6281 and https://github.com/ColinDuquesnoy/QDarkStyleSheet/issues/200
   */
QComboBox::item:checked {
    font-weight: bold;
    max-height: 30px;
}
"""


def patch(use_dark_theme: bool = False, darkstyle_ver: Optional[tuple] = None):
    if not use_dark_theme:
        return
    custom_patch = ""
    if darkstyle_ver is None or darkstyle_ver < (2, 6, 8):
        # only apply this patch to qdarkstyle < 2.6.8.
        # 2.6.8 and above seem to not need it.
        custom_patch = OLD_QDARKSTYLE_PATCH
        print_error(
            "[style_patcher] qdarkstyle < 2.6.8 detected; stylesheet patch #1 applied"
        )
    else:
        # This patch is for qdarkstyle >= 2.6.8.
        custom_patch = CUSTOM_PATCH_FOR_DARK_THEME
        print_error(
            "[style_patcher] qdarkstyle >= 2.6.8 detected; stylesheet patch #2 applied"
        )

    app = QtWidgets.QApplication.instance()
    style_sheet = app.styleSheet() + custom_patch
    app.setStyleSheet(style_sheet)
