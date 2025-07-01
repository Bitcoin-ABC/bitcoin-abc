# Electrum - lightweight Bitcoin client
# Copyright (C) 2018 The Electrum developers
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

from qtpy import QtGui, QtWidgets
from qtpy.QtCore import Qt

from .util import ButtonsTextEdit


class CompletionTextEdit(ButtonsTextEdit):

    def __init__(self, parent=None):
        super(CompletionTextEdit, self).__init__(parent)
        self.completer = None
        self.moveCursor(QtGui.QTextCursor.End)
        self.disable_suggestions()

    def set_completer(self, completer):
        self.completer = completer
        self.initialize_completer()

    def initialize_completer(self):
        self.completer.setWidget(self)
        self.completer.setCompletionMode(QtWidgets.QCompleter.PopupCompletion)
        self.completer.activated.connect(self.insert_completion)
        self.enable_suggestions()

    def insert_completion(self, completion):
        if self.completer.widget() != self:
            return
        text_cursor = self.textCursor()
        extra = len(completion) - len(self.completer.completionPrefix())
        text_cursor.movePosition(QtGui.QTextCursor.Left)
        text_cursor.movePosition(QtGui.QTextCursor.EndOfWord)
        if extra == 0:
            text_cursor.insertText(" ")
        else:
            text_cursor.insertText(completion[-extra:] + " ")
        self.setTextCursor(text_cursor)

    def text_under_cursor(self):
        tc = self.textCursor()
        tc.select(QtGui.QTextCursor.WordUnderCursor)
        return tc.selectedText()

    def enable_suggestions(self):
        self.suggestions_enabled = True

    def disable_suggestions(self):
        self.suggestions_enabled = False

    def keyPressEvent(self, e):
        if self.isReadOnly() or not self.hasFocus():
            e.ignore()
            return

        if self.is_special_key(e):
            e.ignore()
            return

        super().keyPressEvent(e)

        ctrlOrShift = e.modifiers() and (Qt.ControlModifier or Qt.ShiftModifier)
        if self.completer is None or (ctrlOrShift and not e.text()):
            return

        if not self.suggestions_enabled:
            return

        eow = "~!@#$%^&*()_+{}|:\"<>?,./;'[]\\-="
        hasModifier = (e.modifiers() != Qt.NoModifier) and not ctrlOrShift
        completionPrefix = self.text_under_cursor()

        if (
            hasModifier
            or not e.text()
            or len(completionPrefix) < 1
            or eow.find(e.text()[-1]) >= 0
        ):
            self.completer.popup().hide()
            return

        if completionPrefix != self.completer.completionPrefix():
            self.completer.setCompletionPrefix(completionPrefix)
            self.completer.popup().setCurrentIndex(
                self.completer.completionModel().index(0, 0)
            )

        cr = self.cursorRect()
        cr.setWidth(
            self.completer.popup().sizeHintForColumn(0)
            + self.completer.popup().verticalScrollBar().sizeHint().width()
        )
        self.completer.complete(cr)

    def is_special_key(self, e):
        if self.completer is not None and self.completer.popup().isVisible():
            if e.key() in [Qt.Key_Enter, Qt.Key_Return]:
                return True
        if e.key() in [Qt.Key_Tab, Qt.Key_Backtab, Qt.Key_Down, Qt.Key_Up]:
            return True
        return False


if __name__ == "__main__":
    app = QtWidgets.QApplication([])
    completer = QtWidgets.QCompleter(
        ["alabama", "arkansas", "avocado", "breakfast", "sausage"]
    )
    te = CompletionTextEdit()
    te.set_completer(completer)
    te.show()
    app.exec_()
