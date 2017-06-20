Test framework sanity tests
===========================

This folder is intended for sanity tests (self tests) of the test framework.

Tests here are not intended to test Bitcoin functionality, but rather to
test aspects of the Python test framework.

As such, they are not bound into the regular test suites embedded  in the
rpc-tests.py test runner, but have to be executed in a special way through
the `run-self-tests.sh` script in this folder, or executed manually.

There is also not yet an associated build system (Make) target for running
these self-tests.

To execute, they need the PYTHONPATH to include the qa/rpc-tests/ folder,
so that they can import the `test_framework` module and friends.
The `run-self-tests.sh` wrapper takes care of that.
