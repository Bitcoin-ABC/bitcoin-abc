import unittest

import dns
from dns.dnssec import ValidationFailure

from . import ElectronCashTestCase


class TestDnsSec(ElectronCashTestCase):
    def test_validate_rrsig_ecdsa(self):
        rrset = dns.rrset.from_text(
            "getmonero.org.",
            3599,
            1,
            48,
            "257 3 13 mdsswUyr3DPW132mOi8V9xESWE8jTo0d"
            " xCjjnopKl+GqJxpVXckHAeF+KkxLbxIL fDLUT0rAK9iUzy1L53eKGQ==",
            "256 3 13 koPbw9wmYZ7ggcjnQ6ayHyhHaDNMYELK"
            " TqT+qRGrZpWSccr/lBcrm10Z1PuQHB3A zhii+sb0PYFkH1ruxLhe5g==",
        )
        rrsig = dns.rdtypes.ANY.RRSIG.RRSIG.from_text(
            1,
            46,
            dns.tokenizer.Tokenizer(
                "DNSKEY 13 2 3600 20180612115508 20180413115508 2371 getmonero.org."
                " SSjtP2jCtXPukps7E3kum709xq2TH6Lt Ur32UhE7WKwSUfLTZ4EAoD5g22mi1fpB"
                " GDGb30kCMndDVjnHAEBDWw=="
            ),
        )
        keys = {dns.name.Name([b"getmonero", b"org", b""]): rrset}
        origin = None
        now = 1527185178.7842247

        # 'None' means it is valid
        self.assertEqual(
            None, dns.dnssec.validate_rrsig(rrset, rrsig, keys, origin, now)
        )

    def test_validate_rrsig_rsa(self):
        rrset = dns.rrset.from_text(
            "getmonero.org.",
            12698,
            1,
            43,
            "2371 13 2"
            " 3b7f818a879ecb9931dae983d4529afedeb53993759d8080735083f954d40bc8",
        )
        rrsig = dns.rdtypes.ANY.RRSIG.RRSIG.from_text(
            1,
            46,
            dns.tokenizer.Tokenizer(
                "DS 7 2 86400 20180609010045 20180519000045 1862 org."
                " SgdGsY4BAm7c3qpwzVLy3ua4orvrsJQO 0rUQDDrrXR6lElnbF+AS0gEEfdZfDv11"
                " 65AuNil/+kT2Qh/ExgstvhWQ88XdDnHB ouvRMf9pg3p/q5Otet/StRzf33SMPgC1"
                " zLzkfkSBCjJkwVmwde8saGnjdcW522ra Ge/6JcsryRw="
            ),
        )

        rrset2 = dns.rrset.from_text(
            "org.",
            866,
            1,
            48,
            "256 3 7 AwEAAXxsMmN/JgpEE9Y4uFNRJm7Q9GBw"
            " mEYUCsCxuKlgBU9WrQEFRrvAeMamUBeX 4SE8s3V/TEk/TgGmPPp0pMkKD7mseluK"
            " 6Ard2HZ6O3nPAzL4i8py/UDRUmYNSCxw fdfjUWRmcB9H+NKWMsJoDhAkLFqg5HS7"
            " f0j4Vb99Wac24Fk7",
            "256 3 7 AwEAAcLdAPt3vn/ND00zZlyTx7OBko+9"
            " YeCrSl2eGuEXjef0Lqf0tKGikoHwnmTH tT8J/aGqkZImLMVByJbknE0wKDnbvbKD"
            " oTQxPwUQZLH6k3sTdsPKESKDSBSc6VFM q35gx6CeuRYZ9KkGWiUsKqJhXPo6tyJF"
            " CBxfaNQQyrzBnv4/",
            "257 3 7 AwEAAZTjbIO5kIpxWUtyXc8avsKyHIIZ"
            " +LjC2Dv8naO+Tz6X2fqzDC1bdq7HlZwt kaqTkMVVJ+8gE9FIreGJ4c8G1GdbjQgb"
            " P1OyYIG7OHTc4hv5T2NlyWr6k6QFz98Q 4zwFIGTFVvwBhmrMDYsOTtXakK6QwHov"
            " A1+83BsUACxlidpwB0hQacbD6x+I2RCD zYuTzj64Jv0/9XsX6AYV3ebcgn4hL1jI"
            " R2eJYyXlrAoWxdzxcW//5yeL5RVWuhRx ejmnSVnCuxkfS4AQ485KH2tpdbWcCopL"
            " JZs6tw8q3jWcpTGzdh/v3xdYfNpQNcPI mFlxAun3BtORPA2r8ti6MNoJEHU=",
            "257 3 7 AwEAAcMnWBKLuvG/LwnPVykcmpvnntwx"
            " fshHlHRhlY0F3oz8AMcuF8gw9McCw+Bo C2YxWaiTpNPuxjSNhUlBtcJmcdkz3/r7"
            " PIn0oDf14ept1Y9pdPh8SbIBIWx50ZPf VRlj8oQXv2Y6yKiQik7bi3MT37zMRU2k"
            " w2oy3cgrsGAzGN4s/C6SFYon5N1Q2O4h GDbeOq538kATOy0GFELjuauV9guX/431"
            " msYu4Rgb5lLuQ3Mx5FSIxXpI/RaAn2mh M4nEZ/5IeRPKZVGydcuLBS8GZlxW4qbb"
            " 8MgRZ8bwMg0pqWRHmhirGmJIt3UuzvN1 pSFBfX7ysI9PPhSnwXCNDXk0kk0=",
        )
        keys = {dns.name.Name([b"org", b""]): rrset2}
        origin = None
        now = 1527191953.6527798

        # 'None' means it is valid
        self.assertEqual(
            None, dns.dnssec.validate_rrsig(rrset, rrsig, keys, origin, now)
        )

    def test_validate_rrsig_fail(self):
        rrset = dns.rrset.from_text(
            "dnssec-failed.org.",
            86400,
            1,
            43,
            "2371 13 2"
            " 3b7f818a879ecb9931dae983d4529afedeb53993759d8080735083f954d40bc8",
            "106 5 1 4F219DCE274F820EA81EA1150638DABE21EB27FC",
        )
        rrsig = dns.rdtypes.ANY.RRSIG.RRSIG.from_text(
            1,
            46,
            dns.tokenizer.Tokenizer(
                "DS 7 2 86400 20200822152404 20200801142404 21869 org."
                " TdOzuXZkr5dlHiien4T8LSBXszhMkBJoM6E7NrljV/k2xi5d8/AbKTcJ"
                " Vsj0Jo2ss/Tak1O4SM8qlOhgHSW2wb4IwYCZTMvuu0bC2b4wWeXkOoQT"
                " 5as8ImTEA2SrOm/uoA/v6dWzbiBzOFkkhJk//jAT+SNCRmgF1envhq78 7DQ="
            ),
        )

        rrset2 = dns.rrset.from_text(
            "org.",
            866,
            1,
            48,
            "256 3 7 AwEAAZwBxCB7AIhIWiqjusg2lfHSi8orabyy5BM/UtidQEZKIvU5Mrh7"
            " 7eV4C3WyTOwd2AwoGYAUgPjzAC5lFFnCg0LsQpsV7sYy5k+bZBlpxF1o"
            " 9KuBOe+iUQt2YM4TjTD38mW1aN8OFf8mkMxkRzo3dfskzsT881CdJRiD Cg18hJJt",
            "256 3 7 AwEAAdZenjsGF9Xmh+hjv1FV0w8rRC6SHKeMNuk53BRsqruVK2xCbLGm"
            " gtue1yMElMs5+4B5A+uZY8pj4c5fHgC06h3gd0XoIF+KvWhk5WDqohrv"
            " 0nUADQjBBAGRaaO4FDTuu8i19sRg3p3h1LoAgZi+Gcls+JxOdnohVUkp 0by82buT",
            "257 3 7 AwEAAcMnWBKLuvG/LwnPVykcmpvnntwxfshHlHRhlY0F3oz8AMcuF8gw"
            " 9McCw+BoC2YxWaiTpNPuxjSNhUlBtcJmcdkz3/r7PIn0oDf14ept1Y9p"
            " dPh8SbIBIWx50ZPfVRlj8oQXv2Y6yKiQik7bi3MT37zMRU2kw2oy3cgr"
            " sGAzGN4s/C6SFYon5N1Q2O4hGDbeOq538kATOy0GFELjuauV9guX/431"
            " msYu4Rgb5lLuQ3Mx5FSIxXpI/RaAn2mhM4nEZ/5IeRPKZVGydcuLBS8G"
            " ZlxW4qbb8MgRZ8bwMg0pqWRHmhirGmJIt3UuzvN1pSFBfX7ysI9PPhSn wXCNDXk0kk0=",
        )
        keys = {dns.name.Name([b"org", b""]): rrset2}
        origin = None
        now = 1596432184.621979

        with self.assertRaises(ValidationFailure):
            dns.dnssec.validate_rrsig(rrset, rrsig, keys, origin, now)


if __name__ == "__main__":
    unittest.main()
