# Electrum ABC - lightweight eCash client
# Copyright (C) 2020-present The Electrum ABC Developers
# Copyright (C) 2017-2020 The Electron Cash Developers
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
"""
All token-related Exceptions used by this package
"""


class Error(Exception):
    """Base class for all SLP-related errors"""


class OpreturnError(Error):
    pass


class ParsingError(Error):
    """Exceptions caused by malformed or unexpected data found in parsing."""


class UnsupportedSlpTokenType(ParsingError):
    """Cannot parse OP_RETURN due to unrecognized version
    (may or may not be valid)"""


class InvalidOutputMessage(ParsingError):
    """This exception (and subclasses) marks a message as definitely invalid
    under SLP consensus rules. (either malformed SLP or just not SLP)"""


class SerializingError(Error):
    """Exceptions during creation of SLP message."""


class OPReturnTooLarge(SerializingError):
    """The OPReturn field ended up being > 223 bytes"""


# Other exceptions
class NoMintingBatonFound(Error):
    pass
