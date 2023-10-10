import socket
import ssl
import unittest

from .. import interface


class TestInterface(unittest.TestCase):
    """Test CA certificate verification using https://badssl.com"""

    def has_ca_signed_valid_cert(self, server: str) -> bool:
        retries = 0
        while retries < 5:
            try:
                i = interface.TcpConnection(server=server, queue=None, config_path=None)
                s = i._get_socket_and_verify_ca_cert()
                if s is not None:
                    s.close()
                else:
                    self.skipTest("This test requires an internet connection.")
                return bool(s)
            except (TimeoutError, socket.timeout):
                # In Python >= 3.10, socket.timeout is an alias for TimeoutError.
                # For lower versions of python we need to catch both.
                # socket.timeout is deprecated, so when support for Python 3.9 is
                # dropped it should be removed.
                retries += 1
        # if we are here, it means the request keeps timing out
        self.skipTest(f"Skipping test after 5 timeouts. {server} must be down.")

    def test_verify_good_ca_cert(self):
        # These are also a wildcard certificate
        self.assertTrue(self.has_ca_signed_valid_cert("badssl.com:443:s"))
        self.assertTrue(self.has_ca_signed_valid_cert("sha256.badssl.com:443:s"))

    def test_verify_bad_ca_cert(self):
        # See https://github.com/openssl/openssl/blob/70c2912f635aac8ab28629a2b5ea0c09740d2bda/include/openssl/x509_vfy.h#L99
        # for a list of verify error codes

        with self.assertRaises(ssl.SSLCertVerificationError) as cm:
            self.has_ca_signed_valid_cert("expired.badssl.com:443:s")
        # X509_V_ERR_CERT_HAS_EXPIRED
        self.assertEqual(cm.exception.verify_code, 10)

        with self.assertRaises(ssl.SSLCertVerificationError) as cm:
            self.has_ca_signed_valid_cert("wrong.host.badssl.com:443:s")
        # X509_V_ERR_HOSTNAME_MISMATCH
        self.assertEqual(cm.exception.verify_code, 62)

        with self.assertRaises(ssl.SSLCertVerificationError) as cm:
            self.has_ca_signed_valid_cert("self-signed.badssl.com:443:s")
        # X509_V_ERR_DEPTH_ZERO_SELF_SIGNED_CERT
        self.assertEqual(cm.exception.verify_code, 18)

        with self.assertRaises(ssl.SSLCertVerificationError) as cm:
            self.has_ca_signed_valid_cert("untrusted-root.badssl.com:443:s")
        # X509_V_ERR_SELF_SIGNED_CERT_IN_CHAIN
        self.assertEqual(cm.exception.verify_code, 19)


if __name__ == "__main__":
    unittest.main()
