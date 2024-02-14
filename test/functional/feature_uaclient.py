# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the -uaclientname and -uaclientversion option."""

import re

from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.util import assert_equal


class UseragentTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def run_test(self):
        self.log.info("test -uaclientname and -uaclientversion")
        default_useragent = self.nodes[0].getnetworkinfo()["subversion"]
        expected = "/Bitcoin ABC:"
        assert_equal(default_useragent[: len(expected)], expected)
        default_version = default_useragent[default_useragent.index(":") + 1 :]
        default_version = default_version[: default_version.index("/")]

        self.restart_node(0, ["-uaclientname=Foo Client"])
        foo_ua = self.nodes[0].getnetworkinfo()["subversion"]
        expected = f"/Foo Client:{default_version}"
        assert_equal(foo_ua[: len(expected)], expected)

        self.restart_node(0, ["-uaclientversion=123.45"])
        foo_ua = self.nodes[0].getnetworkinfo()["subversion"]
        expected = "/Bitcoin ABC:123.45"
        assert_equal(foo_ua[: len(expected)], expected)

        self.log.info("non-numeric version allowed (although not recommended in BIP14)")
        self.restart_node(0, ["-uaclientversion=Version Two"])
        foo_ua = self.nodes[0].getnetworkinfo()["subversion"]
        expected = "/Bitcoin ABC:Version Two"
        assert_equal(foo_ua[: len(expected)], expected)

        self.log.info("test -uaclient doesn't break -uacomment")
        self.restart_node(
            0,
            [
                "-uaclientname=Bar Client",
                "-uaclientversion=3000",
                "-uacomment=spam bacon and eggs",
            ],
        )
        bar_ua = self.nodes[0].getnetworkinfo()["subversion"]
        expected = "/Bar Client:3000"
        assert_equal(bar_ua[: len(expected)], expected)
        assert "spam bacon and eggs" in bar_ua

        self.log.info("test -uaclientname max length")
        self.stop_node(0)
        expected = (
            r"Error: Total length of network version string \([0-9]+\) exceeds maximum"
            r" length \([0-9]+\)\. Reduce the number or size of uacomments\."
        )
        self.nodes[0].assert_start_raises_init_error(
            [f"-uaclientname={'a' * 256}"], expected, match=ErrorMatch.FULL_REGEX
        )

        self.log.info("test -uaclientversion max length")
        expected = (
            r"Error: Total length of network version string \([0-9]+\) exceeds maximum"
            r" length \([0-9]+\)\. Reduce the number or size of uacomments\."
        )
        self.nodes[0].assert_start_raises_init_error(
            [f"-uaclientversion={'a' * 256}"], expected, match=ErrorMatch.FULL_REGEX
        )

        self.log.info("test -uaclientname and -uaclientversion max length")
        expected = (
            r"Error: Total length of network version string \([0-9]+\) exceeds maximum"
            r" length \([0-9]+\)\. Reduce the number or size of uacomments\."
        )
        self.nodes[0].assert_start_raises_init_error(
            [f"-uaclientname={'a' * 128}", f"-uaclientversion={'a' * 128}"],
            expected,
            match=ErrorMatch.FULL_REGEX,
        )

        self.log.info("test -uaclientname and -uaclientversion invalid characters")
        for invalid_char in ["/", ":", "(", ")", "*", "!", "₿", "🏃"]:
            # for client name
            expected = (
                r"Error: -uaclientname \("
                + re.escape(invalid_char)
                + r"\) contains invalid characters\."
            )
            self.nodes[0].assert_start_raises_init_error(
                [f"-uaclientname={invalid_char}"], expected, match=ErrorMatch.FULL_REGEX
            )
            # for client version
            expected = (
                r"Error: -uaclientversion \("
                + re.escape(invalid_char)
                + r"\) contains invalid characters\."
            )
            self.nodes[0].assert_start_raises_init_error(
                [f"-uaclientversion={invalid_char}"],
                expected,
                match=ErrorMatch.FULL_REGEX,
            )
            # for both
            expected = (
                r"Error: -uaclientname \("
                + re.escape(invalid_char)
                + r"\) contains invalid characters\."
            )
            self.nodes[0].assert_start_raises_init_error(
                [f"-uaclientname={invalid_char}", f"-uaclientversion={invalid_char}"],
                expected,
                match=ErrorMatch.FULL_REGEX,
            )


if __name__ == "__main__":
    UseragentTest().main()
