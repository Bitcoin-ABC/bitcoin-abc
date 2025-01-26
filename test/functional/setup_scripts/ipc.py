# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
IPC communication with NodeJs and Rust
"""

import json
import os
import select
import socket
import time


class IPCSocket:
    _instance = None

    def __init__(self, socket_path):
        self.ipc_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.ipc_socket.connect(socket_path)

    def __del__(self):
        self.ipc_socket.close()

    @staticmethod
    def get(socket_path):
        if not IPCSocket._instance:
            IPCSocket._instance = IPCSocket(socket_path)
        return IPCSocket._instance

    def read(self, max_bytes):
        return self.ipc_socket.recv(max_bytes)

    def write(self, message):
        self.ipc_socket.sendall(message)


def receive_ipc_messages(timeout):
    if not hasattr(receive_ipc_messages, "ipc_rbuf"):
        receive_ipc_messages.ipc_rbuf = b""

    messages = []

    # Try the rust created socket first, then the nodejs file descriptor and
    # finally use stdin if none are present.
    ipc_socket_path = os.getenv("CHRONIK_CLIENT_RUST_IPC_SOCKET", None)
    ipc_read_fd = int(os.environ.get("NODE_CHANNEL_FD", 0))
    use_stdin = "NODE_CHANNEL_FD" not in os.environ and not ipc_socket_path

    max_time = time.time() + timeout
    while not messages and time.time() < max_time:
        if ipc_socket_path:
            receive_ipc_messages.ipc_rbuf += IPCSocket.get(ipc_socket_path).read(1024)
        else:
            # Make sure there is some data before calling os.read, or we could
            # wait indefinitely. The use of select() with a 1 sec timeout makes us
            # read the file descriptor in a non blocking way, so we can escape the
            # loop periodically and respect the global timeout supplied to the
            # receive_ipc_messages() function.
            r, _, _ = select.select([ipc_read_fd], [], [], 1)
            if ipc_read_fd not in r:
                continue
            receive_ipc_messages.ipc_rbuf += os.read(ipc_read_fd, 100)

        messages = receive_ipc_messages.ipc_rbuf.splitlines(keepends=True)

        if messages[-1].endswith(b"\n"):
            receive_ipc_messages.ipc_rbuf = b""
        else:
            receive_ipc_messages.ipc_rbuf = messages[-1]
            messages = messages[:-1]

        if messages:
            return [
                (
                    m.strip().decode(encoding="utf-8")
                    if use_stdin
                    else json.loads(m).strip()
                )
                for m in messages
            ]

        time.sleep(0.1)

    return []


def send_ipc_message(message):
    s = (json.dumps(message) + "\n").encode(encoding="utf-8")

    if ipc_socket_path := os.getenv("CHRONIK_CLIENT_RUST_IPC_SOCKET", None):
        IPCSocket.get(ipc_socket_path).write(s)
    else:
        os.write(int(os.environ.get("NODE_CHANNEL_FD", 1)), s)


def ready():
    send_ipc_message({"status": "ready"})
