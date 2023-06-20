# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
"""Reference tests for Address objects"""

import unittest

from .. import networks
from ..address import Address

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
        self._test_addr(Address.from_string(BCH_CASHADDR_WITH_PREFIX))
        self._test_addr(Address.from_string(BCH_CASHADDR_NO_PREFIX))
        self._test_addr(Address.from_string(BCH_CASHADDR_WITH_PREFIX.upper()))
        self._test_addr(Address.from_string(BCH_CASHADDR_NO_PREFIX.upper()))

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
            Address.from_string(BCH_CASHADDR_WITH_PREFIX_TESTNET, net=networks.TestNet),
            networks.TestNet,
        )
        self._test_addr(
            Address.from_string(BCH_CASHADDR_NO_PREFIX_TESTNET, net=networks.TestNet),
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


if __name__ == "__main__":
    unittest.main()
