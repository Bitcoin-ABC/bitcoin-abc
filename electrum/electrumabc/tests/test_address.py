# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
"""Reference tests for Address objects"""

import unittest

from .. import bitcoin, networks
from ..address import Address, PublicKey

LEGACY_ADDRESS = "1F6UYGAwkzZKqFwyiwc54b7SNvHsNgcZ6h"
BCH_CASHADDR_NO_PREFIX = "qzdf44zy632zk4etztvmaqav0y2cest4evjvrwf70z"
BCH_CASHADDR_WITH_PREFIX = "bitcoincash:" + BCH_CASHADDR_NO_PREFIX
ECASHADDR_NO_PREFIX = "qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4"
ECASHADDR_WITH_PREFIX = "ecash:" + ECASHADDR_NO_PREFIX

LEGACY_ADDRESS_TESTNET = "mkHS9ne12qx9pS9VojpwU5xtRd4T7X7ZUt"
BCH_CASHADDR_NO_PREFIX_TESTNET = "qq6y5r6geg2sas4eqwqhvc9ek6938fnsycnv83u3qt"
BCH_CASHADDR_WITH_PREFIX_TESTNET = "bchtest:" + BCH_CASHADDR_NO_PREFIX_TESTNET
ECASHADDR_NO_PREFIX_TESTNET = "qq6y5r6geg2sas4eqwqhvc9ek6938fnsycgcfaz3z3"
ECASHADDR_WITH_PREFIX_TESTNET = "ectest:" + ECASHADDR_NO_PREFIX_TESTNET


class TestAddressFromString(unittest.TestCase):
    """Unit test class for parsing addressess from string."""

    def _test_addr(self, addr: Address, net=networks.MainNet):
        legacy_addr = (
            LEGACY_ADDRESS if net == networks.MainNet else LEGACY_ADDRESS_TESTNET
        )
        ecashaddr = (
            ECASHADDR_WITH_PREFIX
            if net == networks.MainNet
            else ECASHADDR_WITH_PREFIX_TESTNET
        )
        bchaddr = (
            BCH_CASHADDR_WITH_PREFIX
            if net == networks.MainNet
            else BCH_CASHADDR_WITH_PREFIX_TESTNET
        )
        self.assertEqual(
            addr.to_full_string(fmt=Address.FMT_LEGACY, net=net), legacy_addr
        )
        self.assertEqual(
            addr.to_full_string(fmt=Address.FMT_CASHADDR_BCH, net=net), bchaddr
        )
        self.assertEqual(
            addr.to_full_string(fmt=Address.FMT_CASHADDR, net=net), ecashaddr
        )

    def test_from_legacy(self):
        self._test_addr(Address.from_string(LEGACY_ADDRESS))

    def test_from_bch_cashaddr(self):
        self._test_addr(
            Address.from_string(BCH_CASHADDR_WITH_PREFIX, support_arbitrary_prefix=True)
        )
        self._test_addr(
            Address.from_string(
                BCH_CASHADDR_WITH_PREFIX.upper(), support_arbitrary_prefix=True
            )
        )

    def test_from_ecashaddr(self):
        self._test_addr(Address.from_string(ECASHADDR_WITH_PREFIX))
        self._test_addr(Address.from_string(ECASHADDR_NO_PREFIX))

    def test_from_legacy_tesnet(self):
        self._test_addr(
            Address.from_string(LEGACY_ADDRESS_TESTNET, net=networks.TestNet),
            networks.TestNet,
        )

    def test_from_bch_cashaddr_tesnet(self):
        self._test_addr(
            Address.from_string(
                BCH_CASHADDR_WITH_PREFIX_TESTNET,
                net=networks.TestNet,
                support_arbitrary_prefix=True,
            ),
            networks.TestNet,
        )

    def test_from_ecashaddr_tesnet(self):
        self._test_addr(
            Address.from_string(ECASHADDR_WITH_PREFIX_TESTNET, net=networks.TestNet),
            networks.TestNet,
        )
        self._test_addr(
            Address.from_string(ECASHADDR_NO_PREFIX_TESTNET, net=networks.TestNet),
            networks.TestNet,
        )


class TestPublicKey(unittest.TestCase):
    """Test for the PublicKey class defined in address.py"""

    def test_privkey_from_WIF_privkey(self):
        wif_key = "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw"
        expected_key = b"\x12\xb0\x04\xff\xf7\xf4\xb6\x9e\xf8e\x0ev\x7f\x18\xf1\x1e\xde\x15\x81H\xb4%f\x07#\xb9\xf9\xa6na\xf7G"

        privkey, is_compressed = PublicKey.privkey_from_WIF_privkey(wif_key)
        self.assertTrue(is_compressed)
        self.assertEqual(
            privkey,
            expected_key,
        )

        bad_prefix = bytes([0x81])
        suffix = b"\01"
        bad_wif_key = bitcoin.EncodeBase58Check(bad_prefix + expected_key + suffix)

        with self.assertRaisesRegex(
            ValueError,
            r"Private key has invalid WIF version byte \(expected: 0x80 got: 0x81\)",
        ):
            PublicKey.privkey_from_WIF_privkey(bad_wif_key)


if __name__ == "__main__":
    unittest.main()
