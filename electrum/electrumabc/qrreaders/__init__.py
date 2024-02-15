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

from typing import Optional

from ..printerror import print_error
from .abstract_base import AbstractQrCodeReader, QrCodeResult  # noqa: F401


class MissingLib(RuntimeError):
    """Raised by underlying implementation if missing libs"""

    pass


def get_qr_reader() -> Optional[AbstractQrCodeReader]:
    """
    Get the Qr code reader for the current platform
    """
    try:
        from .zbar import ZbarQrCodeReader

        return ZbarQrCodeReader()

        # DEBUG CODE BELOW
        # If you want to test this code on a platform that doesn't yet work or have
        # zbar, use the below...
        #
        # class Fake(AbstractQrCodeReader):
        #    def read_qr_code(self, buffer, buffer_size, dummy, width, height, frame_id = -1):
        #         ''' fake noop to test '''
        #         return []
        # return Fake()
    except MissingLib as e:
        print_error("[get_qr_reader]", str(e))

    return None
