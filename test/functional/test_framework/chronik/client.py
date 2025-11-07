# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import http.client
import threading
import time
from typing import List, Optional, Union

import chronik_pb2 as pb
import websocket

# Timespan when HTTP requests to Chronik time out
DEFAULT_TIMEOUT = 30


class UnexpectedContentType(Exception):
    pass


class ChronikResponse:
    def __init__(self, response, *, ok_proto=None, error_proto=None) -> None:
        self.response = response
        self.status = response.status
        self.ok_proto = ok_proto
        self.error_proto = error_proto

    def ok(self):
        if self.status != 200:
            raise AssertionError(
                f"Expected OK response, but got status {self.status}, error: "
                f"{self.error_proto}"
            )
        return self.ok_proto

    def err(self, status: int):
        if self.status == 200:
            raise AssertionError(
                f"Expected error response status {status}, but got OK: {self.ok_proto}"
            )
        if self.status != status:
            raise AssertionError(
                f"Expected error response status {status}, but got different error "
                f"status {self.status}, error: {self.error_proto}"
            )
        return self.error_proto


class ChronikScriptClient:
    def __init__(
        self, client: "ChronikClient", script_type: str, script_payload: str
    ) -> None:
        self.client = client
        self.script_type = script_type
        self.script_payload = script_payload

    def confirmed_txs(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/script/{self.script_type}/{self.script_payload}/confirmed-txs{query}",
            pb.TxHistoryPage,
        )

    def history(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/script/{self.script_type}/{self.script_payload}/history{query}",
            pb.TxHistoryPage,
        )

    def unconfirmed_txs(self):
        return self.client._request_get(
            f"/script/{self.script_type}/{self.script_payload}/unconfirmed-txs",
            pb.TxHistoryPage,
        )

    def utxos(self):
        return self.client._request_get(
            f"/script/{self.script_type}/{self.script_payload}/utxos", pb.ScriptUtxos
        )


class ChronikTokenIdClient:
    def __init__(self, client: "ChronikClient", token_id: str) -> None:
        self.client = client
        self.token_id = token_id

    def confirmed_txs(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/token-id/{self.token_id}/confirmed-txs{query}",
            pb.TxHistoryPage,
        )

    def history(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/token-id/{self.token_id}/history{query}",
            pb.TxHistoryPage,
        )

    def unconfirmed_txs(self):
        return self.client._request_get(
            f"/token-id/{self.token_id}/unconfirmed-txs",
            pb.TxHistoryPage,
        )

    def utxos(self):
        return self.client._request_get(f"/token-id/{self.token_id}/utxos", pb.Utxos)


class ChronikLokadIdClient:
    def __init__(self, client: "ChronikClient", lokad_id: str) -> None:
        self.client = client
        self.lokad_id = lokad_id

    def confirmed_txs(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/lokad-id/{self.lokad_id}/confirmed-txs{query}",
            pb.TxHistoryPage,
        )

    def history(self, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/lokad-id/{self.lokad_id}/history{query}",
            pb.TxHistoryPage,
        )

    def unconfirmed_txs(self):
        return self.client._request_get(
            f"/lokad-id/{self.lokad_id}/unconfirmed-txs",
            pb.TxHistoryPage,
        )


class ChronikPluginClient:
    def __init__(self, client: "ChronikClient", plugin_name: str) -> None:
        self.client = client
        self.plugin_name = plugin_name

    def utxos(self, group: bytes):
        return self.client._request_get(
            f"/plugin/{self.plugin_name}/{group.hex()}/utxos", pb.Utxos
        )

    def groups(
        self,
        *,
        prefix: Optional[bytes] = None,
        start: Optional[bytes] = None,
        page_size: Optional[int] = None,
    ):
        return self.client._request_get(
            f"/plugin/{self.plugin_name}/groups{_group_query_params(prefix, start, page_size)}",
            pb.PluginGroups,
        )

    def confirmed_txs(self, group: bytes, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/plugin/{self.plugin_name}/{group.hex()}/confirmed-txs{query}",
            pb.TxHistoryPage,
        )

    def history(self, group: bytes, page=None, page_size=None):
        query = _page_query_params(page, page_size)
        return self.client._request_get(
            f"/plugin/{self.plugin_name}/{group.hex()}/history{query}",
            pb.TxHistoryPage,
        )

    def unconfirmed_txs(self, group: bytes):
        return self.client._request_get(
            f"/plugin/{self.plugin_name}/{group.hex()}/unconfirmed-txs",
            pb.TxHistoryPage,
        )


class ChronikWs:
    def __init__(self, client: "ChronikClient", **kwargs) -> None:
        self.messages: List[pb.WsMsg] = []
        self.errors: List[Exception] = []
        self.timeout = kwargs.get("timeout", client.timeout)
        self.ping_interval = kwargs.get("ping_interval", 10)
        self.ping_timeout = kwargs.get("ping_timeout", 5)
        self.is_open = False
        ws_protocol = "wss" if client.https else "ws"
        self.ws_url = (
            f"{ws_protocol}://{client.host}:{client.port}{client.path_prefix}/ws"
        )

        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_message=self.on_message,
            on_error=self.on_error,
            on_open=self.on_open,
            on_close=self.on_close,
            on_ping=self.on_ping,
            on_pong=self.on_pong,
        )

        self.ws_thread = threading.Thread(
            target=self.ws.run_forever,
            kwargs={
                "ping_interval": self.ping_interval,
                "ping_timeout": self.ping_timeout,
                "ping_payload": "Bitcoin ABC functional test framework",
            },
        )
        self.ws_thread.start()

        connect_timeout = time.time() + self.timeout
        while not self.is_open:
            if time.time() > connect_timeout:
                self.close()
                raise TimeoutError(
                    f"Connection to chronik websocket {self.ws_url} timed out after {self.timeout}s"
                )
            time.sleep(0.05)

    def on_message(self, ws, message):
        ws_msg = pb.WsMsg()
        ws_msg.ParseFromString(message)
        self.messages.append(ws_msg)

    def on_error(self, ws, error: Exception):
        self.errors.append(error)

    def on_open(self, ws):
        self.is_open = True

    def on_close(self, ws, close_status_code, close_message):
        pass

    def on_ping(self, ws, message):
        pass

    def on_pong(self, ws, message):
        pass

    def recv(self):
        recv_timeout = time.time() + self.timeout
        while len(self.messages) == 0 and len(self.errors) == 0:
            if time.time() > recv_timeout:
                raise TimeoutError(
                    f"No message received from {self.ws_url} after {self.timeout}s"
                )
            time.sleep(0.05)
        if self.errors:
            # Raise an error if we encountered one
            raise self.errors.pop(0)
        return self.messages.pop(0)

    def send_bytes(self, data: bytes) -> None:
        self.ws.send(data, websocket.ABNF.OPCODE_BINARY)

    def sub_to_blocks(self, *, is_unsub=False) -> None:
        sub = pb.WsSub(is_unsub=is_unsub, blocks=pb.WsSubBlocks())
        self.send_bytes(sub.SerializeToString())

    def sub_txid(self, txid: str, *, is_unsub=False) -> None:
        sub = pb.WsSub(is_unsub=is_unsub, txid=pb.WsSubTxId(txid=txid))
        self.send_bytes(sub.SerializeToString())

    def sub_script(self, script_type: str, payload: bytes, *, is_unsub=False) -> None:
        sub = pb.WsSub(
            is_unsub=is_unsub,
            script=pb.WsSubScript(script_type=script_type, payload=payload),
        )
        self.send_bytes(sub.SerializeToString())

    def sub_token_id(self, token_id: str, *, is_unsub=False) -> None:
        sub = pb.WsSub(
            is_unsub=is_unsub,
            token_id=pb.WsSubTokenId(token_id=token_id),
        )
        self.send_bytes(sub.SerializeToString())

    def sub_lokad_id(self, lokad_id: bytes, *, is_unsub=False) -> None:
        sub = pb.WsSub(
            is_unsub=is_unsub,
            lokad_id=pb.WsSubLokadId(lokad_id=lokad_id),
        )
        self.send_bytes(sub.SerializeToString())

    def sub_plugin(self, plugin_name: str, group: bytes, *, is_unsub=False) -> None:
        sub = pb.WsSub(
            is_unsub=is_unsub,
            plugin=pb.WsPlugin(plugin_name=plugin_name, group=group),
        )
        self.send_bytes(sub.SerializeToString())

    def close(self):
        self.ws.close()
        self.ws_thread.join(self.timeout)
        if self.errors:
            # If there's any errors left over, raise the oldest now
            raise self.errors.pop(0)


class ChronikClient:
    CONTENT_TYPE = "application/x-protobuf"

    def __init__(
        self, host: str, port: int, https=False, timeout=DEFAULT_TIMEOUT
    ) -> None:
        # Support for hosts in the form of "https://chronik.foo/xec"
        host_parts = host.split("/", maxsplit=1)
        self.host = host_parts[0]
        self.path_prefix = "/" + host_parts[1] if len(host_parts) > 1 else ""
        self.port = port
        self.timeout = timeout
        self.https = https

    def _request_get(self, path: str, pb_type):
        return self._request("GET", path, None, pb_type)

    def _request(self, method: str, path: str, body: Optional[bytes], pb_type):
        kwargs = {}
        if self.timeout is not None:
            kwargs["timeout"] = self.timeout
        client = (
            http.client.HTTPSConnection(self.host, self.port, **kwargs)
            if self.https
            else http.client.HTTPConnection(self.host, self.port, **kwargs)
        )
        headers = {}
        if body is not None:
            headers["Content-Type"] = self.CONTENT_TYPE
        path = self.path_prefix + path
        client.request(method, path, body, headers)
        response = client.getresponse()
        content_type = response.getheader("Content-Type")
        body = response.read()

        if content_type != self.CONTENT_TYPE:
            raise UnexpectedContentType(
                f'Unexpected Content-Type "{content_type}" (expected '
                f'"{self.CONTENT_TYPE}"), body: {repr(body)}'
            )

        if response.status != 200:
            proto_error = pb.Error()
            proto_error.ParseFromString(body)
            return ChronikResponse(response, error_proto=proto_error)

        ok_proto = pb_type()
        ok_proto.ParseFromString(body)
        return ChronikResponse(response, ok_proto=ok_proto)

    def blockchain_info(self) -> ChronikResponse:
        return self._request_get("/blockchain-info", pb.BlockchainInfo)

    def block(self, hash_or_height: Union[str, int]) -> ChronikResponse:
        return self._request_get(f"/block/{hash_or_height}", pb.Block)

    def block_txs(
        self, hash_or_height: Union[str, int], page=None, page_size=None
    ) -> ChronikResponse:
        query = _page_query_params(page, page_size)
        return self._request_get(
            f"/block-txs/{hash_or_height}{query}", pb.TxHistoryPage
        )

    def blocks(self, start_height: int, end_height: int) -> ChronikResponse:
        return self._request_get(f"/blocks/{start_height}/{end_height}", pb.Blocks)

    def block_header(
        self, hash_or_height: Union[str, int], checkpoint_height: Optional[int] = None
    ) -> ChronikResponse:
        query = (
            f"?checkpoint_height={checkpoint_height}"
            if checkpoint_height is not None
            else ""
        )
        return self._request_get(
            f"/block-header/{hash_or_height}{query}", pb.BlockHeader
        )

    def block_headers(
        self,
        start_height: int,
        end_height: int,
        checkpoint_height: Optional[int] = None,
    ) -> ChronikResponse:
        query = (
            f"?checkpoint_height={checkpoint_height}"
            if checkpoint_height is not None
            else ""
        )
        return self._request_get(
            f"/block-headers/{start_height}/{end_height}{query}", pb.BlockHeaders
        )

    def chronik_info(self) -> ChronikResponse:
        return self._request_get("/chronik-info", pb.ChronikInfo)

    def tx(self, txid: str) -> ChronikResponse:
        return self._request_get(f"/tx/{txid}", pb.Tx)

    def raw_tx(self, txid: str) -> bytes:
        return self._request_get(f"/raw-tx/{txid}", pb.RawTx)

    def token_info(self, txid: str) -> bytes:
        return self._request_get(f"/token/{txid}", pb.TokenInfo)

    def validate_tx(self, raw_tx: bytes) -> ChronikResponse:
        return self._request(
            "POST", "/validate-tx", pb.RawTx(raw_tx=raw_tx).SerializeToString(), pb.Tx
        )

    def broadcast_tx(
        self, raw_tx: bytes, skip_token_checks: bool = False
    ) -> ChronikResponse:
        return self._request(
            "POST",
            "/broadcast-tx",
            pb.BroadcastTxRequest(
                raw_tx=raw_tx, skip_token_checks=skip_token_checks
            ).SerializeToString(),
            pb.BroadcastTxResponse,
        )

    def broadcast_txs(
        self, raw_txs: List[bytes], skip_token_checks: bool = False
    ) -> ChronikResponse:
        return self._request(
            "POST",
            "/broadcast-txs",
            pb.BroadcastTxsRequest(
                raw_txs=raw_txs, skip_token_checks=skip_token_checks
            ).SerializeToString(),
            pb.BroadcastTxsResponse,
        )

    def script(self, script_type: str, script_payload: str) -> ChronikScriptClient:
        return ChronikScriptClient(self, script_type, script_payload)

    def token_id(self, token_id: str) -> ChronikTokenIdClient:
        return ChronikTokenIdClient(self, token_id)

    def lokad_id(self, lokad_id_hex: str) -> ChronikLokadIdClient:
        return ChronikLokadIdClient(self, lokad_id_hex)

    def plugin(self, plugin_name: str) -> ChronikPluginClient:
        return ChronikPluginClient(self, plugin_name)

    def pause(self) -> ChronikResponse:
        return self._request_get("/pause", pb.Empty)

    def resume(self) -> ChronikResponse:
        return self._request_get("/resume", pb.Empty)

    def ws(self, **kwargs) -> ChronikWs:
        return ChronikWs(self, **kwargs)


def _page_query_params(page=None, page_size=None) -> str:
    if page is not None and page_size is not None:
        return f"?page={page}&page_size={page_size}"
    elif page is not None:
        return f"?page={page}"
    elif page_size is not None:
        return f"?page_size={page_size}"
    else:
        return ""


def _group_query_params(prefix=None, start=None, page_size=None) -> str:
    if prefix is None and start is None and page_size is None:
        return ""
    query_string = ""
    if prefix is not None:
        query_string += f"prefix={prefix.hex()}"
    if start is not None:
        if query_string:
            query_string += "&"
        query_string += f"start={start.hex()}"
    if page_size is not None:
        if query_string:
            query_string += "&"
        query_string += f"page_size={page_size}"
    return "?" + query_string
