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


def receive_ipc_messages(timeout):
    if not hasattr(receive_ipc_messages, "ipc_rbuf"):
        receive_ipc_messages.ipc_rbuf = b""

    messages = []

    use_stdin = "NODE_CHANNEL_FD" not in os.environ
    ipc_read_fd = int(os.environ.get("NODE_CHANNEL_FD", 0))

    max_time = time.time() + timeout
    while not messages and time.time() < max_time:
        # Make sure there is some data before calling os.read, or we could
        # wait indefinitely. The use of select() with a 1 sec timeout makes us
        # read the file descriptor in a non blocking way, so we can escape the
        # loop preiodically and respect the global timeout supplied to the
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
    os.write(int(os.environ.get("NODE_CHANNEL_FD", 1)), s)


def ready():
    send_ipc_message({"status": "ready"})


if os.environ.get("CHRONIK_CLIENT_RUST_IPC_SOCKET"):
    # This check be replaced in future diffs, when program will fail if SOCKET is not set
    print(os.environ.get("CHRONIK_CLIENT_RUST_IPC_SOCKET"), "\n", "SOCKET IS FOUND")
    socket_path = os.environ["CHRONIK_CLIENT_RUST_IPC_SOCKET"]

    try:
        ipc_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        ipc_socket.connect(socket_path)
        print("SOCKET CONNECTION ACCEPTED")

    except socket.error:
        exit(1)
