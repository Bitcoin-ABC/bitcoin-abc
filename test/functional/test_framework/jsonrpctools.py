# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
from __future__ import annotations

import json
import socket
from typing import Any, Optional

from .util import assert_equal


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

    def __init__(self, host: str, port: int, timeout=DEFAULT_TIMEOUT) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout

        self.id = -1

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
        data = b""
        while b"\n" not in data:
            data += self.sock.recv(1024)
            if len(data) > self.MAX_DATA_SIZE:
                raise OversizedResponseError()

        return json.loads(data.decode("utf-8"))

    def synchronous_request(
        self, method: str, params: Optional[list | dict]
    ) -> JsonRpcResponse:
        self.id += 1
        request = {"jsonrpc": "2.0", "method": method, "id": self.id}
        if params is not None:
            request["params"] = params
        self.sock.send(json.dumps(request).encode("utf-8") + b"\n")

        json_reply = self._recv()

        # As per the JSONRPC spec, we cannot have both an error and a result
        assert "error" not in json_reply or "result" not in json_reply
        assert_equal(json_reply.get("id"), self.id)
        return JsonRpcResponse(
            json_reply.get("id"), json_reply.get("result"), json_reply.get("error")
        )

    def wait_for_notification(self, method: str, timeout=None):
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
        assert "result" in json_reply["params"]

        # The "result" is within a "params" field. There is no point returning
        # a JsonRpcResponse here as we only care about the result
        return json_reply["params"]["result"]
