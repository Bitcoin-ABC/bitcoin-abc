#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2018 Thomas Voegtlin
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

import time
from base64 import b64decode

from jsonrpclib.SimpleJSONRPCServer import (
    SimpleJSONRPCRequestHandler,
    SimpleJSONRPCServer,
)

from . import util


class RPCAuthCredentialsInvalid(Exception):
    def __str__(self):
        return "Authentication failed (bad credentials)"


class RPCAuthCredentialsMissing(Exception):
    def __str__(self):
        return "Authentication failed (missing credentials)"


class RPCAuthUnsupportedType(Exception):
    def __str__(self):
        return "Authentication failed (only basic auth is supported)"


# based on http://acooke.org/cute/BasicHTTPA0.html by andrew cooke
class VerifyingJSONRPCServer(SimpleJSONRPCServer):
    def __init__(self, *args, rpc_user, rpc_password, **kargs):
        self.rpc_user = rpc_user
        self.rpc_password = rpc_password

        class VerifyingRequestHandler(SimpleJSONRPCRequestHandler):
            def parse_request(myself):
                # first, call the original implementation which returns
                # True if all OK so far
                if SimpleJSONRPCRequestHandler.parse_request(myself):
                    try:
                        self.authenticate(myself.headers)
                        return True
                    except (
                        RPCAuthCredentialsInvalid,
                        RPCAuthCredentialsMissing,
                        RPCAuthUnsupportedType,
                    ) as e:
                        myself.send_error(401, str(e))
                    except Exception as e:
                        import sys
                        import traceback

                        traceback.print_exc(file=sys.stderr)
                        myself.send_error(500, str(e))
                return False

        SimpleJSONRPCServer.__init__(
            self, requestHandler=VerifyingRequestHandler, *args, **kargs
        )

    def authenticate(self, headers):
        if self.rpc_password == "":
            # RPC authentication is disabled
            return

        auth_string = headers.get("Authorization", None)
        if auth_string is None:
            raise RPCAuthCredentialsMissing()

        (basic, _, encoded) = auth_string.partition(" ")
        if basic != "Basic":
            raise RPCAuthUnsupportedType()

        encoded = util.to_bytes(encoded, "utf8")
        credentials = util.to_string(b64decode(encoded), "utf8")
        (username, _, password) = credentials.partition(":")
        if not (
            util.constant_time_compare(username, self.rpc_user)
            and util.constant_time_compare(password, self.rpc_password)
        ):
            time.sleep(0.050)
            raise RPCAuthCredentialsInvalid()
