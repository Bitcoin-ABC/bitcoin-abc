#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2011 thomasv@gitorious
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
from __future__ import annotations

import os
import re
import socket
import ssl
import sys
import threading
import time
import traceback
from enum import Enum
from typing import TYPE_CHECKING, Any, Callable, Dict, List, NamedTuple, Optional, Tuple

import requests
from pathvalidate import sanitize_filename

from . import pem, util, x509
from .json_util import JSONSocketPipe
from .printerror import PrintError, is_verbose, print_error, print_msg
from .simple_config import SimpleConfig
from .utils import Event

if TYPE_CHECKING:
    from queue import Queue

    from .blockchain import Blockchain, Header

    InterfaceRequest = Tuple[str, List[Any], int]
    """(method, params, id)"""

ca_path = requests.certs.where()

PING_INTERVAL = 300


def Connection(
    server: str,
    queue: Queue,
    config_path: str,
    callback: Optional[Callable[[TcpConnection], None]] = None,
) -> TcpConnection:
    """Makes asynchronous connections to a remote electrum server.
    Returns the running thread that is making the connection.

    Once the thread has connected, it finishes, placing a tuple on the
    queue of the form (server, socket), where socket is None if
    connection failed.

    server is a "<host>:<port>:<protocol>" string
    """
    host, port, protocol = server.rsplit(":", 2)
    if protocol not in "st":
        raise Exception("Unknown protocol: %s" % protocol)
    c = TcpConnection(server, queue, config_path)
    if callback:
        callback(c)
    c.start()
    return c


class TcpConnection(threading.Thread, PrintError):
    bad_certificate = Event()

    def __init__(self, server, queue, config_path):
        threading.Thread.__init__(self)
        self.config_path: str = config_path
        self.queue: Queue = queue
        self.server: str = server
        host, port, protocol = self.server.rsplit(":", 2)
        self.host: str = host
        self.port = int(port)
        self.use_ssl = protocol == "s"
        self.daemon = True

    def diagnostic_name(self):
        return self.host

    def get_simple_socket(self):
        try:
            addr_info = socket.getaddrinfo(
                self.host, self.port, socket.AF_UNSPEC, socket.SOCK_STREAM
            )
        except OverflowError:
            # This can happen if user specifies a huge port out of 32-bit range. See #985
            self.print_error("port invalid:", self.port)
            return
        except socket.gaierror:
            self.print_error("cannot resolve hostname")
            return
        except UnicodeError:
            self.print_error("hostname cannot be decoded with 'idna' codec")
            return
        e = None
        for res in addr_info:
            try:
                s = socket.socket(res[0], socket.SOCK_STREAM)
                s.settimeout(10)
                s.connect(res[4])
                s.settimeout(2)
                s.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                return s
            except Exception as _e:
                e = _e
                continue
        else:
            self.print_error("failed to connect", str(e))

    @staticmethod
    def get_ssl_context(cert_reqs, ca_certs, check_hostname: bool = False):
        context = ssl.create_default_context(
            purpose=ssl.Purpose.SERVER_AUTH, cafile=ca_certs
        )
        context.check_hostname = check_hostname
        context.verify_mode = cert_reqs

        context.minimum_version = ssl.TLSVersion.TLSv1_2

        return context

    def _get_socket_and_verify_ca_cert(self) -> Optional[ssl.SSLSocket]:
        """Attempts to connect to the remote host, assuming it is using a CA
        signed certificate. If the cert is valid then a SSLSocket is returned.
        Otherwise None is returned on error."""
        s = self.get_simple_socket()
        if s is None:
            return None

        context = self.get_ssl_context(
            cert_reqs=ssl.CERT_REQUIRED, ca_certs=ca_path, check_hostname=True
        )
        return context.wrap_socket(
            s, do_handshake_on_connect=True, server_hostname=self.host
        )

    def _get_socket_and_verify_ca_cert_checked(
        self, *, suppress_errors
    ) -> Tuple[Optional[ssl.SSLSocket], bool]:
        """Attempts to connect to the remote host, assuming it is using a CA
        signed certificate. If the cert is valid then a tuple of: (wrapped
        SSLSocket, False) is returned. Otherwise (None, bool) is returned on
        error. If the second item in the tuple is True, then the entire
        operation should be aborted due to low-level error."""
        try:
            s = self._get_socket_and_verify_ca_cert()
            if s is not None:
                self.print_error("SSL certificate signed by CA")
                # it's good, return the wrapped socket
                return s, False
        except ssl.SSLError as e:
            if not suppress_errors:
                # Only show error if no pinned self-signed cert exists
                self.print_error("SSL error:", e)
            return None, False  # inform caller to continue trying alternate
        except Exception as e:
            self.print_error(
                "Unexpected exception in _get_socket_and_verify_ca_cert_checked:",
                repr(e),
            )
        # inform caller to abort the operation
        return None, True

    def get_socket(self):
        if self.use_ssl:
            # Try with CA first, since they are preferred over self-signed certs
            # and are always accepted (even if a previous pinned self-signed
            # cert exists).
            cert_path = os.path.join(
                self.config_path,
                "certs",
                sanitize_filename(self.host, replacement_text="_"),
            )
            has_pinned_self_signed = os.path.exists(cert_path)
            s, give_up = self._get_socket_and_verify_ca_cert_checked(
                suppress_errors=has_pinned_self_signed
            )
            if s:
                if has_pinned_self_signed:
                    # Delete pinned cert. They now have a valid CA-signed cert.
                    # This hopefully undoes the bug in previous EC versions that
                    # refused to consider CA-signed certs at all if the server
                    # ever had a self-signed cert in the past.
                    try:
                        os.remove(cert_path)
                        self.print_error(
                            "Server is now using a CA-signed certificate, deleted"
                            " previous self-signed certificate:",
                            cert_path,
                        )
                    except OSError:
                        pass
                return s
            elif give_up:
                # low-level error in _get_socket_and_verify_ca_cert_checked, give up
                return
            # if we get here, certificate is not CA signed, so try the alternate
            # "pinned self-signed" method.
            if not has_pinned_self_signed:
                is_new = True
                # get server certificate. Do not use ssl.get_server_certificate
                # because it does not work with proxy
                s = self.get_simple_socket()
                if s is None:
                    return
                try:
                    context = self.get_ssl_context(
                        cert_reqs=ssl.CERT_NONE, ca_certs=None
                    )
                    s = context.wrap_socket(s)
                except ssl.SSLError as e:
                    self.print_error("SSL error retrieving SSL certificate:", e)
                    return
                except Exception:
                    return

                dercert = s.getpeercert(True)
                s.close()
                cert = ssl.DER_cert_to_PEM_cert(dercert)
                # workaround android bug
                cert = re.sub(
                    "([^\n])-----END CERTIFICATE-----",
                    "\\1\n-----END CERTIFICATE-----",
                    cert,
                )
                temporary_path = cert_path + ".temp"
                util.assert_datadir_available(self.config_path)
                with open(temporary_path, "w", encoding="utf-8") as f:
                    f.write(cert)
                    f.flush()
                    os.fsync(f.fileno())
            else:
                is_new = False
                temporary_path = None

        s = self.get_simple_socket()
        if s is None:
            return

        if self.use_ssl:
            try:
                context = self.get_ssl_context(
                    cert_reqs=ssl.CERT_REQUIRED,
                    ca_certs=(temporary_path if is_new else cert_path),
                )
                s = context.wrap_socket(s, do_handshake_on_connect=True)
            except socket.timeout:
                self.print_error("timeout")
                return
            except ssl.SSLError as e:
                self.print_error("SSL error:", e)
                if e.errno != 1:
                    return
                if is_new:
                    rej = cert_path + ".rej"
                    try:
                        if os.path.exists(rej):
                            os.unlink(rej)
                        os.rename(temporary_path, rej)
                    except OSError as e2:
                        self.print_error(
                            "Could not rename rejected certificate:", rej, repr(e2)
                        )
                else:
                    util.assert_datadir_available(self.config_path)
                    with open(cert_path, encoding="utf-8") as f:
                        cert = f.read()
                    try:
                        b = pem.dePem(cert, "CERTIFICATE")
                        x = x509.X509(b)
                    except Exception:
                        if is_verbose:
                            self.print_error(
                                "Error checking certificate, traceback follows"
                            )
                            traceback.print_exc(file=sys.stderr)
                        self.print_error("wrong certificate")
                        self.bad_certificate(self.server, cert_path)
                        return
                    try:
                        x.check_date()
                    except Exception:
                        self.print_error("certificate has expired:", cert_path)
                        try:
                            os.unlink(cert_path)
                            self.print_error("Removed expired certificate:", cert_path)
                        except OSError as e2:
                            self.print_error(
                                "Could not remove expired certificate:",
                                cert_path,
                                repr(e2),
                            )
                        return
                    self.print_error("wrong certificate")
                    self.bad_certificate(self.server, cert_path)
                if e.errno == 104:
                    return
                return

            if is_new:
                self.print_error("saving certificate")
                os.rename(temporary_path, cert_path)

        return s

    def run(self):
        try:
            socket = self.get_socket()
        except OSError:
            if is_verbose:
                self.print_error("Error getting socket, traceback follows")
                traceback.print_exc(file=sys.stderr)
            socket = None

        if socket:
            self.print_error("connected")
        self.queue.put((self.server, socket))


class Interface(PrintError):
    """The Interface class handles a socket connected to a single remote
    electrum server.  It's exposed API is:

    - Member functions close(), fileno(), get_responses(), has_timed_out(),
      ping_required(), queue_request(), send_requests()
    - Member variable server.
    """

    class Mode(Enum):
        DEFAULT = "default"
        """In DEFAULT mode, we process tip changes. If the new tip send by the
        interface is already known locally, or connects to a local blockchain,
        we update the interface's blockchain to the connecting local chain.
        We add the block to the tip of that local chain if we didn't already have it.
        If the new tip is lower than the most recent local chain's tip, and
        auto-connect is enabled, we switch to a different interface.
        If the tip is not known, we switch to BACKWARD or CATCH_UP mode, depending
        on the height of the local tip.
        """

        BACKWARD = "backward"
        """The interface is switched to this mode from DEFAULT when the server sends its
        tip and it does not connect to any local chain, and the most advanced local
        chain is newer than the checkpointed block height.
        It is switched to this mode from CATCH_UP when the next block does not connect.

        We will then request the header with the same height as the local tip or the
        previous header from the server tip (whichever one has the lowest height).

        If it does not match one of our local headers or connect to their tip, we
        keep requesting lower block heights with an increasing step until we can either
        connect the header or we reach the checkpoint block.

        If the block at the checkpoint height served by this interface does not
        connect, we disconnect the interface.

        If we find a connecting header, the interface switches to BINARY mode.
        """

        BINARY = "binary"
        """The server switches to this mode when it was previously in BACKWARD mode and
        found a connecting header.
        In this mode, we move forward, bisecting the chain until we find the block
        height at which the next header is not present in the local chain
        currently used by the interface.

        We then check if we can connect the next header to any local branch. If we
        can't, we disconnect the interface.

        If we can, and we already have local forking branch starting at the next height,
        we check if the next header exists in that branch, and if it does we switch back
        to DEFAULT mode (joining chain).

        If we have a branch at this next height without the header, we check if the
        parent header exists in the parent branch. If it does, we replace the
        interface's chain with the parent chain and switch back to DEFAULT_MODE (reorg).

        If we have a branch at this next height but the next header does not match its
        first header and the current header is not in the parent branch, we overwrite
        the existing branch with a new fork and switch to CATCH_UP mode (conflict with
        existing fork).

        If we don't already have a branch with this base height, and the interface's
        chain tip is higher,  we add a new fork to the interface's chain and switch to
        CATCH_UP mode to build on top of that fork. If the interface's chain tip is at
        the same height as the last good header, we just switch to CATCH_UP mode and
        keep building on that chain.
        """

        CATCH_UP = "catch_up"
        """We switch to catch-up mode if the interface sends us a non-connecting tip
        and the local chains all have a lower height than the checkpoint block, or if
        just found a good header to build on top of while in BINARY mode.

        In that mode, we request chunks of 2016 headers and add them to the interface's
        local chain until it reaches the same tip as the interface, then we switch
        to DEFAULT mode.
        If we can't connect a received header, we switch to BACKWARD mode.
        """

        VERIFICATION = "verification"
        """A new interface starts in this mode. If we have not previously verified the
        checkpoint for this server, it is done when the server replies to
        blockchain.headers.subscribe. The interface is disconnected if the verification
        fails. If the verification succeeds or was already done previously (not the
        first time we connect to it), we switch to DEFAULT mode.
        """

    def __init__(
        self,
        server: str,
        socket: ssl.SSLSocket,
        *,
        max_message_bytes: int = 0,
        config: Optional[SimpleConfig] = None,
    ):
        self.server = server
        self.config = config
        host, port, _ = server.rsplit(":", 2)
        self.host: str = host
        self.port: str = port
        self.socket = socket

        self.pipe = JSONSocketPipe(socket, max_message_bytes=max_message_bytes)
        # Dump network messages.  Set at runtime from the console.
        self.debug = False
        self.request_time = time.time()
        self.unsent_requests: List[InterfaceRequest] = []
        """[(method, params, id), ...]"""
        self.unanswered_requests: Dict[int, InterfaceRequest] = {}
        """{id: (method, params, id), ...}"""
        self.last_send = time.time()

        self.mode: Optional[Interface.Mode] = None

        # Set and used in network.py
        self.blockchain: Optional[Blockchain] = None
        self.tip_header: Optional[Header] = None
        self.tip = 0
        """Tip height"""

        # Note: the following attributes are always set in network.py, so the init
        # value here does not matter.
        self.good: int = 0
        self.bad: int = 0
        self.bad_header: Header = {}

    def __repr__(self):
        return "<{}.{} {}>".format(__name__, type(self).__name__, self.format_address())

    def format_address(self):
        return "{}:{}".format(self.host, self.port)

    def set_mode(self, mode: Mode):
        self.print_error("set_mode({})".format(mode))
        self.mode = mode

    def diagnostic_name(self):
        return self.host

    def fileno(self):
        # Needed for select
        return self.socket.fileno()

    def close(self):
        try:
            self.socket.shutdown(socket.SHUT_RDWR)
        except Exception:
            pass
        try:
            self.socket.close()
        except Exception:
            pass

    def queue_request(self, method: str, params: List[Any], id_: int):
        """Queue a request, later to be sent with send_requests when the
        socket is available for writing."""
        self.request_time = time.time()
        self.unsent_requests.append((method, params, id_))

    class ReqThrottleParams(NamedTuple):
        max: int
        chunkSize: int

    req_throttle_default = ReqThrottleParams(2000, 100)

    @classmethod
    def get_req_throttle_params(cls, config: Optional[SimpleConfig]):
        tup = config and config.get("network_unanswered_requests_throttle")
        if not isinstance(tup, (list, tuple)) or len(tup) != 2:
            return cls.req_throttle_default
        tup = cls.ReqThrottleParams(*tup)
        return tup

    @classmethod
    def set_req_throttle_params(
        cls,
        config: Optional[SimpleConfig],
        max_unanswered_requests: Optional[int] = None,
        chunkSize: Optional[int] = None,
    ):
        if not config:
            return
        l_ = list(cls.get_req_throttle_params(config))
        if max_unanswered_requests is not None:
            l_[0] = max_unanswered_requests
        if chunkSize is not None:
            l_[1] = chunkSize
        config.set_key("network_unanswered_requests_throttle", l_)

    def num_requests(self):
        """If there are more than tup.max (default: 2000) unanswered requests,
        don't send any more. Otherwise send more requests, but not more than tup.chunkSize
        (default: 100) at a time."""
        tup = self.get_req_throttle_params(self.config)
        if len(self.unanswered_requests) >= tup.max:
            return 0
        return min(tup.chunkSize, len(self.unsent_requests))

    def send_requests(self):
        """Sends queued requests. Returns False on failure."""
        try:
            try:
                self.pipe.send_flush()
            except util.timeout:
                if self.debug:
                    self.print_error(
                        "still flushing send data... [{}]".format(
                            len(self.pipe.send_buf)
                        )
                    )
                return True

            self.last_send = time.time()

            def make_dict(m, p, i):
                return {"method": m, "params": p, "id": i}

            n = self.num_requests()
            wire_requests = self.unsent_requests[0:n]

            self.pipe.send_all([make_dict(*r) for r in wire_requests])
        except util.timeout:
            # this is OK, the send is in the pipe and we'll flush it out
            # eventually.
            pass
        except self.pipe.Closed as e:
            self.print_error(str(e))
            return False
        except Exception:
            traceback.print_exc(file=sys.stderr)
            return False

        self.unsent_requests = self.unsent_requests[n:]
        for request in wire_requests:
            if self.debug:
                self.print_error("-->", request)
            self.unanswered_requests[request[2]] = request
        return True

    def ping_required(self):
        """Returns True if a ping should be sent."""
        return time.time() - self.last_send > PING_INTERVAL

    def has_timed_out(self):
        """Returns True if the interface has timed out."""
        if (
            self.unanswered_requests
            and time.time() - self.request_time > 10
            and self.pipe.idle_time() > 10
        ):
            self.print_error("timeout", len(self.unanswered_requests))
            return True

        return False

    def get_responses(self):
        """Call if there is data available on the socket.  Returns a list of
        (request, response) pairs.  Notifications are singleton
        unsolicited responses presumably as a result of prior
        subscriptions, so request is None and there is no 'id' member.
        Otherwise it is a response, which has an 'id' member and a
        corresponding request.  If the connection was closed remotely
        or the remote server is misbehaving, a (None, None) will appear.
        """
        responses = []
        while True:
            response = None
            try:
                response = self.pipe.get()
            except util.timeout:
                break
            except self.pipe.Closed as e:
                self.print_error(str(e))
            except Exception:
                traceback.print_exc(file=sys.stderr)

            if type(response) is not dict:
                # time to close this connection.
                if type(response) is not None:
                    self.print_error(
                        "received non-object type {}".format(type(response))
                    )
                # signal that this connection is done.
                responses.append((None, None))
                break

            if self.debug:
                self.print_error("<--", response)
            wire_id = response.get("id", None)
            if wire_id is None:  # Notification
                # defend against funny/out-of-spec JSON
                if not isinstance(response.get("method"), str):
                    # Malforned notification -- signal bad server
                    self.print_error(
                        "Server sent us a notification message without a 'method':",
                        response,
                    )
                    responses.append((None, None))  # Signal
                    break
                # At this point the notification has a 'method' defined, so we know
                # it's good.
                responses.append((None, response))
            else:
                request = self.unanswered_requests.pop(wire_id, None)
                if request:
                    responses.append((request, response))
                else:
                    self.print_error("unknown wire ID", wire_id)
                    responses.append((None, None))  # Signal
                    break

        return responses


def check_cert(host, cert):
    try:
        b = pem.dePem(cert, "CERTIFICATE")
        x = x509.X509(b)
    except Exception:
        if is_verbose:
            print_error("Error checking certificate, traceback follows")
            traceback.print_exc(file=sys.stderr)
        return

    try:
        x.check_date()
        expired = False
    except Exception:
        expired = True

    m = "host: %s\n" % host
    m += "has_expired: %s\n" % expired
    print_msg(m)


def test_certificates():
    config = SimpleConfig()
    mydir = os.path.join(config.path, "certs")
    certs = os.listdir(mydir)
    for c in certs:
        p = os.path.join(mydir, c)
        with open(p, encoding="utf-8") as f:
            cert = f.read()
        check_cert(c, cert)


if __name__ == "__main__":
    test_certificates()
