# Electrum ABC - lightweight eCash client
# Copyright (C) 2025-present The Electrum ABC Developers
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
"""eCash: Multi Pushdata Protocol

https://ecashbuilders.notion.site/eCash-Multi-Pushdata-Protocol-11e1b991071c4a77a3e948ba604859ac
"""

from typing import Optional

from ..bitcoin import OpCodes
from ..transaction import is_push_opcode

EMPP_PREFIX = bytes([OpCodes.OP_RETURN, OpCodes.OP_RESERVED])


def parse_empp_script(script: bytes) -> Optional[list[bytes]]:
    """Parse an op_return output script, return a list of payloads.

    OP_RETURN OP_RESERVED push(data0) push(data1)...
    -> (data0, data1...)

    Return None if the script is not a valid eMPP script.
    """
    if not script.startswith(EMPP_PREFIX):
        return None
    subscript = script[2:]
    output = []

    while len(subscript) > 1:
        op = subscript[0]
        # exclude non-push, empty string and single-byte push opcodes, as per spec
        if op != 0x01 and not is_push_opcode(op, min_data_size=2):
            return None
        if op < OpCodes.OP_PUSHDATA1:
            dlen = op
            if len(subscript) < dlen + 1:
                return None
            output.append(subscript[1 : dlen + 1])
            subscript = subscript[dlen + 1 :]
        elif op == OpCodes.OP_PUSHDATA1:
            dlen = subscript[1]
            if len(subscript) < dlen + 2:
                return None
            output.append(subscript[2 : dlen + 2])
            subscript = subscript[dlen + 2 :]
        elif op == OpCodes.OP_PUSHDATA2:
            dlen = int.from_bytes(subscript[1:3], byteorder="little")
            if len(subscript) < dlen + 3:
                return None
            output.append(subscript[3 : dlen + 3])
            subscript = subscript[dlen + 3 :]
        elif op == OpCodes.OP_PUSHDATA4:
            dlen = int.from_bytes(subscript[1:5], byteorder="little")
            if len(subscript) < dlen + 5:
                return None
            output.append(subscript[5 : dlen + 5])
            subscript = subscript[dlen + 5 :]

    # There shouldn't be any data left after parsing.
    # But we expect at least one push operation.
    if subscript or not output:
        return None

    return output
