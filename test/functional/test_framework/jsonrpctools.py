# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
from __future__ import annotations

import json
import logging
import socket
from typing import Any, Optional

from .util import assert_equal, assert_greater_than


class OversizedResponseError(Exception):
    pass


class JsonRpcResponse:
    def __init__(
        self,
        id_: Optional[int],
        result: Optional[Any] = None,
        error: Optional[dict] = None,
    ):
        self.id = id_
        self.result = result
        self.error = error

    def __str__(self):
        return (
            f"JsonRpcResponse(id={self.id}, result={self.result}, error={self.error})"
        )


class MethodNameProxy:
    """Recursive proxy. The final proxy in the chain is the one doing the RPC call"""

    def __init__(self, client: ChronikElectrumClient, name: str, parent_name: str = ""):
        self.client = client
        self.parent_name = parent_name
        self.name = name

    def __getattr__(self, item) -> MethodNameProxy:
        if self.parent_name:
            parent_name = f"{self.parent_name}.{self.name}"
        else:
            parent_name = self.name
        return MethodNameProxy(self.client, item, parent_name)

    def __call__(self, *args, **kwargs) -> JsonRpcResponse:
        method = f"{self.parent_name}.{self.name}" if self.parent_name else self.name
        params: Optional[list[Any] | dict[str, Any]]
        if not kwargs and not args:
            params = None
        elif not kwargs:
            # all positional params. Make it a list, as json doesn't support tuples
            params = list(args)
        elif not args:
            # all named params
            params = kwargs
        else:
            raise RuntimeError("Params must be all positional or all named arguments")
        return self.client.synchronous_request(method, params)


def shorten(msg: str, threshold: int) -> str:
    if len(msg) > threshold:
        return msg[:threshold] + f"…({len(msg) - threshold} chars trimmed)"
    return msg


class ChronikElectrumClient:
    """JSONRPC client.

    >>> client = ChronikElectrumClient("127.0.0.1", 500001)
    >>> client.blockchain.transaction.get_height("3fbe7aebbe4210d667c2eb96d7efa5b43bb3d7a4c00dc08c16ad4e4ce4d2ea9b")
    JsonRpcResponse(id=0, result=875001, error=None)
    >>> client.spam.foo.bar()
    JsonRpcResponse(id=0, result=None, error={'code': -32601, 'message': 'Method not found'})
    """

    DEFAULT_TIMEOUT = 30
    MAX_DATA_SIZE = 10_000_000

    def __init__(
        self, host: str, port: int, timeout=DEFAULT_TIMEOUT, name: Optional[str] = None
    ) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout

        name = name or f"{id(self)}"
        self.log = logging.getLogger(f"TestFramework.ChronikElectrumClient.{name}")

        self.id = -1
        # Data buffer. Messages are separated by \n but we might have several in
        # a single frame so we keep track of the remaining in order to properly
        # rebuild the messages.
        self.data = b""

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(timeout)
        self.sock.connect((host, port))

    def __getattr__(self, item):
        """Build a recursive proxy. For instance if the caller calls
        client.blockchain.transaction.get(txid), it will create a
        MethodNameProxy(name="blockchain") which will in turn create a
        MethodNameProxy(name="transaction", parent_name="blockchain") which will
        create a MethodNameProxy(name="get", parent_name="blockchain.transaction").
        That last level of proxy will then  execute the jsonrpc call with
        method blockchain.transaction.get and params [txid].
        """
        return MethodNameProxy(self, item)

    def _recv(self):
        # We need the initial check because self.data might already contain
        # the messages and we don't want to block on sock.recv() in this case
        while b"\n" not in self.data:
            self.data += self.sock.recv(1024)

            # Break early, we will check the length of the message
            if b"\n" in self.data:
                break

            # There is no \n, we don't allow for more data than the max size.
            # This is also an exit condition to avoid looping indefinitely if
            # there is no \n
            if len(self.data) > self.MAX_DATA_SIZE:
                raise OversizedResponseError()

        # We might have several messages, but only return the first one
        (message, self.data) = self.data.split(b"\n", maxsplit=1)

        # Account for the trailing \n that we just removed as 1 byte
        if len(message) + 1 > self.MAX_DATA_SIZE:
            raise OversizedResponseError()

        return json.loads(message.decode("utf-8"))

    def synchronous_request(
        self, method: str, params: Optional[list | dict]
    ) -> JsonRpcResponse:
        self.id += 1

        # params can be very long when broadcasting oversized transactions.
        # For other RPC requests, it should always fit 100 chars.
        params_str = shorten(str(params), 100)
        self.log.debug(
            f"Sending RPC request (method={method}, id={self.id}, params={params_str})"
        )

        request = {"jsonrpc": "2.0", "method": method, "id": self.id}
        if params is not None:
            request["params"] = params
        self.sock.sendall(json.dumps(request).encode("utf-8") + b"\n")

        json_reply = self._recv()

        # As per the JSONRPC spec, we cannot have both an error and a result
        assert "error" not in json_reply or "result" not in json_reply
        assert_equal(json_reply.get("id"), self.id)
        return JsonRpcResponse(
            json_reply.get("id"), json_reply.get("result"), json_reply.get("error")
        )

    def wait_for_notification(self, method: str, timeout=None):
        self.log.debug(f"Waiting for notification for method {method}")
        prev_timeout = self.sock.gettimeout()
        # If set, timeout should override the current socket timeout. We make
        # sure to restore the previous valus after the message is received
        self.sock.settimeout(timeout or prev_timeout)

        json_reply = self._recv()

        self.sock.settimeout(prev_timeout)

        # A notification can't be an error
        assert "error" not in json_reply
        # A notification has no id but a method field
        assert "id" not in json_reply
        assert_equal(json_reply.get("method"), method)
        assert "params" in json_reply
        assert_greater_than(len(json_reply["params"]), 0)

        # A notification shouldn't have a very long result, so the use of shorten here
        # is defensive programming. 200 chars accommodates all known notifications.
        result_str = shorten(str(json_reply["params"]), 200)
        self.log.debug(f"Received notification for method {method}: {result_str}")

        # The "result" is within a "params" field. There is no point returning
        # a JsonRpcResponse here as we only care about the result
        return json_reply["params"]
