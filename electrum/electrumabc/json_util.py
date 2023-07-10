# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import json
import socket
import ssl
import time
from datetime import datetime
from decimal import Decimal

from .printerror import PrintError
from .transaction import Transaction
from .util import timeout


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Transaction):
            return obj.as_dict()
        if isinstance(obj, datetime):
            return obj.isoformat(" ")[:-3]
        if isinstance(obj, set):
            return list(obj)
        return super(MyEncoder, self).default(obj)


def json_encode(obj):
    try:
        s = json.dumps(obj, sort_keys=True, indent=4, cls=MyEncoder)
    except TypeError:
        s = repr(obj)
    return s


def json_decode(x):
    try:
        return json.loads(x, parse_float=Decimal)
    except Exception:
        return x


def parse_json(message):
    # TODO: check \r\n pattern
    n = message.find(b"\n")
    if n == -1:
        return None, message
    try:
        j = json.loads(message[0:n].decode("utf8"))
    except Exception:
        # just consume the line and ignore error.
        j = None
    return j, message[n + 1 :]


class JSONSocketPipe(PrintError):
    """Non-blocking wrapper for a socket passing one-per-line json messages:

       <json><newline><json><newline><json><newline>...

    Correctly handles SSL sockets and gives useful info for select loops.
    """

    class Closed(RuntimeError):
        """Raised if socket is closed"""

    def __init__(self, sock, *, max_message_bytes=0):
        """A max_message_bytes of <= 0 means unlimited, otherwise a positive
        value indicates this many bytes to limit the message size by. This is
        used by get(), which will raise MessageSizeExceeded if the message size
        received is larger than max_message_bytes."""
        self.socket = sock
        sock.settimeout(0)
        self.recv_time = time.time()
        self.max_message_bytes = max_message_bytes
        self.recv_buf = bytearray()
        self.send_buf = bytearray()

    def idle_time(self):
        return time.time() - self.recv_time

    def get_selectloop_info(self):
        """Returns tuple:

        read_pending - new data is available that may be unknown to select(),
            so perform a get() regardless of select().
        write_pending - some send data is still buffered, so make sure to call
            send_flush if writing becomes available.
        """
        try:
            # pending() only defined on SSL sockets.
            has_pending = self.socket.pending() > 0
        except AttributeError:
            has_pending = False
        return has_pending, bool(self.send_buf)

    def get(self):
        """Attempt to read out a message, possibly saving additional messages in
        a receive buffer.

        If no message is currently available, this raises util.timeout and you
        should retry once data becomes available to read. If connection is bad for
        some known reason, raises .Closed; other errors will raise other exceptions.
        """
        while True:
            response, self.recv_buf = parse_json(self.recv_buf)
            if response is not None:
                return response

            try:
                data = self.socket.recv(1024)
            except (socket.timeout, BlockingIOError, ssl.SSLWantReadError):
                raise timeout
            except OSError as exc:
                if exc.errno in (11, 35, 60, 10035):
                    # some OSes might give these ways of indicating a would-block error.
                    raise timeout
                if exc.errno == 9:
                    # EBADF. Someone called close() locally so FD is bad.
                    raise self.Closed("closed by local")
                raise self.Closed(
                    "closing due to {}: {}".format(type(exc).__name__, str(exc))
                )

            if not data:
                raise self.Closed("closed by remote")

            self.recv_buf.extend(data)
            self.recv_time = time.time()

            if 0 < self.max_message_bytes < len(self.recv_buf):
                raise self.Closed(
                    f"Message limit is: {self.max_message_bytes}; receive buffer"
                    " exceeded this limit!"
                )

    def send(self, request):
        out = json.dumps(request) + "\n"
        out = out.encode("utf8")
        self.send_buf.extend(out)
        return self.send_flush()

    def send_all(self, requests):
        out = b"".join((json.dumps(req) + "\n").encode("utf8") for req in requests)
        self.send_buf.extend(out)
        return self.send_flush()

    def send_flush(self):
        """Flush any unsent data from a prior call to send / send_all.

        Raises timeout if more data remains to be sent.
        Raise .Closed in the event of a socket error that requires abandoning
        this socket.
        """
        send_buf = self.send_buf
        while send_buf:
            try:
                sent = self.socket.send(send_buf)
            except (socket.timeout, BlockingIOError, ssl.SSLWantWriteError):
                raise timeout
            except OSError as exc:
                if exc.errno in (11, 35, 60, 10035):
                    # some OSes might give these ways of indicating a would-block error.
                    raise timeout
                if exc.errno == 9:
                    # EBADF. Someone called close() locally so FD is bad.
                    raise self.Closed("closed by local")
                raise self.Closed(
                    "closing due to {}: {}".format(type(exc).__name__, str(exc))
                )

            if sent == 0:
                # shouldn't happen, but just in case, we don't want to infinite
                # loop.
                raise timeout
            del send_buf[:sent]
