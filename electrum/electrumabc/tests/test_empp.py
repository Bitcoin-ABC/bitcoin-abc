import unittest

from ..bitcoin import OpCodes, push_script_bytes
from ..tokens import empp

invalid_empp_scripts = [
    # Bad prefix
    b"",
    b"spam",
    bytes([OpCodes.OP_RETURN]),
    bytes([OpCodes.OP_RETURN]) + push_script_bytes(b"spam spam spam"),
    # Non-push
    empp.EMPP_PREFIX + b"",
    empp.EMPP_PREFIX + b"spamspam",
    # Empty string push
    empp.EMPP_PREFIX + push_script_bytes(b""),
    # Single-byte push
    empp.EMPP_PREFIX + bytes([OpCodes.OP_1]),
    empp.EMPP_PREFIX + push_script_bytes(b"\x02", minimal=True),
    empp.EMPP_PREFIX + bytes([OpCodes.OP_1NEGATE]),
    empp.EMPP_PREFIX + bytes([OpCodes.OP_16]),
    # Valid pushes followed by non-pushes
    empp.EMPP_PREFIX + push_script_bytes(b"spamspam") + b"spam",
    empp.EMPP_PREFIX
    + push_script_bytes(b"spamspam")
    + push_script_bytes(b"foofoo")
    + b"spam",
    # Truncated push (not enough data)
    empp.EMPP_PREFIX + push_script_bytes(b"a" * 12)[:-1],
    empp.EMPP_PREFIX + push_script_bytes(b"a" * 12) + push_script_bytes(b"b" * 8)[:-5],
    empp.EMPP_PREFIX + push_script_bytes(b"a" * 12)[:-2] + push_script_bytes(b"b" * 8),
]


class TestEmpp(unittest.TestCase):
    def test_invalid_empp(self):
        for script in invalid_empp_scripts:
            self.assertIsNone(empp.parse_empp_script(script))

    def test_valid_empp(self):
        self.assertEqual(
            empp.parse_empp_script(empp.EMPP_PREFIX + push_script_bytes(b"spamspam")),
            [b"spamspam"],
        )
        self.assertEqual(
            empp.parse_empp_script(
                empp.EMPP_PREFIX
                + push_script_bytes(b"spamspam")
                + push_script_bytes(b"foofoo")
            ),
            [b"spamspam", b"foofoo"],
        )
        self.assertEqual(
            empp.parse_empp_script(
                empp.EMPP_PREFIX + push_script_bytes(b"\x02", minimal=False)
            ),
            [b"\x02"],
        )
        for data_len in (
            OpCodes.OP_PUSHDATA1 - 1,
            OpCodes.OP_PUSHDATA1,
            0xFF,
            0x100,
            0xFFFF,
            0x10000,
        ):
            payload = data_len * b"a"
            self.assertEqual(
                empp.parse_empp_script(
                    empp.EMPP_PREFIX
                    + push_script_bytes(b"spam")
                    + push_script_bytes(payload)
                ),
                [b"spam", payload],
                f"failed for payload of size {data_len}",
            )


if __name__ == "__main__":
    unittest.main()
