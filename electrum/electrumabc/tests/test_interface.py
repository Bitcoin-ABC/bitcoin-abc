# Electrum ABC - lightweight eCash client
# Copyright (c) 2025-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import pathlib
import select
import socket
import ssl
import threading
import unittest
from contextlib import contextmanager

from .. import interface


@contextmanager
def tls_server(cert: pathlib.Path, key: pathlib.Path):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("localhost", 0))
    server.listen(5)
    _, server_port = server.getsockname()

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=cert, keyfile=key)

    stop_event = threading.Event()

    def accept_connections():
        while not stop_event.is_set():
            try:
                rset, _, _ = select.select([server], [], [], 1.0)
                if server in rset:
                    client_sock, _ = server.accept()
                    client_sock = context.wrap_socket(client_sock, server_side=True)
                    client_sock.close()
            except Exception:
                continue

    try:
        thread = threading.Thread(target=accept_connections)
        thread.start()

        yield server_port
    finally:
        stop_event.set()
        server.close()
        thread.join()


def add_suffix(path: pathlib.Path, suffix: str) -> pathlib.Path:
    return path.parent / (path.name + suffix)


class TestInterfaceSSLVerify(unittest.TestCase):
    """Test CA certificate verification using tests certificates.
    When the certificates expire in 2036, run contrib/update_test_certs to renew them.
    """

    def setUp(self):
        self.cert_path = pathlib.Path(__file__).parent / "data" / "testcerts"

        self.root_path = self.cert_path / "rootCA"
        self.untrusted_root_path = self.cert_path / "untrusted-rootCA"
        self.basedomain = "tests.electrumabc.org"

    def _has_ca_signed_valid_cert(self, server: str) -> bool:
        i = interface.TcpConnection(server=server, queue=None, config_path=None)
        i.override_ca_certs = self.root_path.with_suffix(".crt")
        i.override_host = "localhost"
        s = i._get_socket_and_verify_ca_cert()
        if s is not None:
            s.close()
        return bool(s)

    @contextmanager
    def _tls_server(self, host: str):
        cert = self.cert_path / host

        with tls_server(add_suffix(cert, ".crt"), add_suffix(cert, ".key")) as port:
            yield (host, port)

    def test_verify_good_ca_cert(self):
        with self._tls_server(f"valid.{self.basedomain}") as (host, port):
            self.assertTrue(self._has_ca_signed_valid_cert(f"{host}:{port}:s"))

        with self._tls_server(f"wildcard.{self.basedomain}") as (host, port):
            self.assertTrue(self._has_ca_signed_valid_cert(f"{host}:{port}:s"))

    def test_verify_bad_ca_cert(self):
        # See https://github.com/openssl/openssl/blob/70c2912f635aac8ab28629a2b5ea0c09740d2bda/include/openssl/x509_vfy.h#L99
        # for a list of verify error codes

        with self._tls_server(f"expired.{self.basedomain}") as (host, port):
            with self.assertRaises(ssl.SSLCertVerificationError) as cm:
                self._has_ca_signed_valid_cert(f"{host}:{port}:s")
            # X509_V_ERR_CERT_HAS_EXPIRED
            self.assertEqual(cm.exception.verify_code, 10)

        with self._tls_server(f"valid.{self.basedomain}") as (host, port):
            with self.assertRaises(ssl.SSLCertVerificationError) as cm:
                self._has_ca_signed_valid_cert(f"invalid.{self.basedomain}:{port}:s")
            # X509_V_ERR_HOSTNAME_MISMATCH
            self.assertEqual(cm.exception.verify_code, 62)

        with self._tls_server(f"selfsigned.{self.basedomain}") as (host, port):
            with self.assertRaises(ssl.SSLCertVerificationError) as cm:
                self._has_ca_signed_valid_cert(f"{host}:{port}:s")
            # X509_V_ERR_DEPTH_ZERO_SELF_SIGNED_CERT
            self.assertEqual(cm.exception.verify_code, 18)

        with self._tls_server(f"badchain.{self.basedomain}") as (host, port):
            with self.assertRaises(ssl.SSLCertVerificationError) as cm:
                self._has_ca_signed_valid_cert(f"{host}:{port}:s")
            # X509_V_ERR_SELF_SIGNED_CERT_IN_CHAIN
            self.assertEqual(cm.exception.verify_code, 19)

        with self._tls_server(f"badroot.{self.basedomain}") as (host, port):
            with self.assertRaises(ssl.SSLCertVerificationError) as cm:
                self._has_ca_signed_valid_cert(f"{host}:{port}:s")
            # X509_V_ERR_UNABLE_TO_GET_ISSUER_CERT_LOCALLY
            self.assertEqual(cm.exception.verify_code, 20)


if __name__ == "__main__":
    unittest.main()
