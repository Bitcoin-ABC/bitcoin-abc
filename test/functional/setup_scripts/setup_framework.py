# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Extend the test framework to run IPC messaging stepped setup scripts.
"""

import pathmagic  # noqa
from ipc import ready, receive_ipc_messages
from test_framework.test_framework import BitcoinTestFramework

IPC_RECEIVE_DEFAULT_TIMEOUT = 60


class SetupFramework(BitcoinTestFramework):
    # Make the metaclass happy by providing the expected method.
    # This will be overridden by the child class.
    def set_test_params(self):
        raise NotImplementedError

    # Make the metaclass happy by providing the expected method.
    # This will be overridden by the child class.
    def run_test(self):
        raise NotImplementedError

    def _run_test_internal(self):
        timeout = getattr(self, "ipc_timeout", IPC_RECEIVE_DEFAULT_TIMEOUT)

        # Build the generator
        setup_steps = self.run_test()

        # Init
        next(setup_steps)
        ready()

        # Keep running for as many steps as defined in self.run_tests()
        running = True
        while running:
            cmds = receive_ipc_messages(timeout)
            if not cmds:
                raise TimeoutError(f"No IPC message after {timeout}s, exiting")
            for cmd in cmds:
                if cmd == "next":
                    try:
                        next(setup_steps)
                        ready()
                    except StopIteration:
                        self.log.info("Got a next message but no more step, exiting")
                        running = False
                        break
                elif cmd == "stop":
                    self.log.info("Received a stop message, exiting")
                    running = False
                    break
                else:
                    raise Exception(f"Unknown command {cmd}, exiting")
