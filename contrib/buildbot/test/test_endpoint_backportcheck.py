#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import unittest

import mock

import test.mocks.phabricator
from test.abcbot_fixture import ABCBotFixture


class EndpointBackportcheckTestCase(ABCBotFixture):
    def test_backportCheck_happyPath(self):
        self.phab.differential.revision.search.return_value = (
            test.mocks.phabricator.Result(
                [
                    {
                        "id": "1234",
                        "fields": {"summary": "This is a test summary"},
                    }
                ]
            )
        )

        response = self.post_json_with_hmac(
            "/backportCheck", self.headers, {"object": {"phid": "1234"}}
        )
        self.assertEqual(response.status_code, 200)
        self.phab.differential.revision.search.assert_called_with(
            constraints={"phids": ["1234"]}
        )
        self.phab.differential.revision.edit.assert_not_called()

    def test_backportCheck_invalid_json(self):
        response = self.post_data_with_hmac(
            "/backportCheck", self.headers, "not: a valid json"
        )
        self.assertEqual(response.status_code, 415)

    def test_backportCheck_hasNoPRs(self):
        # Despite potential matches for linking PRs, the phab API should not be
        # called to update the summary, even if the result would be the same.
        self.phab.differential.revision.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": "1234",
                    "fields": {
                        "summary": (
                            "This is a test summary `Ignore this backport PR2345` some"
                            " text.\nSome text ```Ignore this PR3456``` Some more"
                            " text.\n```\nPR4567 in a multi-line code block\nPR5678 in"
                            " the same code block\n```\n  Ignore this indented"
                            " PR4567This is a test summary `Ignore this secp256k1"
                            " backport PR234` some text.\nSome text ```Ignore this"
                            " secp256k1 PR345``` Some more text.\n```\nsecp256k1 PR456"
                            " in a multi-line code block\nsecp256k1 PR567 in the same"
                            " code block\n```\n  Ignore this indented secp256k1 PR456"
                        ),
                    },
                }
            ]
        )

        response = self.post_json_with_hmac(
            "/backportCheck", self.headers, {"object": {"phid": "1234"}}
        )
        self.assertEqual(response.status_code, 200)
        self.phab.differential.revision.search.assert_called_with(
            constraints={"phids": ["1234"]}
        )
        self.phab.differential.revision.edit.assert_not_called()

    def test_backportCheck_hasPRs(self):
        self.phab.differential.revision.search.return_value = test.mocks.phabricator.Result(
            [
                {
                    "id": "1234",
                    "fields": {
                        "summary": (
                            "This is a test summary\n"
                            # Bitcoin Core references that are NOT hyperlinked
                            "Backport of Core PR2345 and PR34567\n"
                            "Backports with optional separators PR 2345 and PR#34567"
                            " and PR #4567\n"
                            "PR6789 outside of a code block `PR4567 inside a code"
                            " block`\n"
                            "```PR4567 in a single-line code block```\n"
                            "```\nPR4567 in a multi-line code block\n```\n"
                            "  PR4567 in a code block using indentation\n"
                            "Another backport PR567890\n"
                            # secp256k1 references that are NOT hyperlinked
                            "Backport of Secp256k1 PR23 and PR345\n"
                            "Backport of Secp256k1 PR 23 and PR#345 and PR #45\n"
                            "SECP256K1 PR678 outside of a code block `secp256k1 PR456"
                            " inside a code block`\n"
                            "```secp256k1 PR456 in a single-line code block```\n"
                            "```\nsecp256k1 PR456 in a multi-line code block\n```\n"
                            "  secp256k1 PR456 in a code block using indentation\n"
                            "Another secp backport PR567\n"
                            # only canonical markdown is hyperlinked now
                            "random yourname#12345 repo that is not supported is not"
                            " hyperlinked\n"
                            "a backport of secp256k1#894\n"
                            "this is a backport of core#16723 and of core-gui#2\n"
                            "this is a very unlikely backport of core#16723, core-gui#2"
                            " and secp256k1#253431\n"
                            "malformed backport of core#16400#16458 should only link to"
                            " the first #\n"
                            "```this is a very unlikely backport of core#16723,"
                            " core-gui#2"
                            " and secp256k1#253431 in a single-code block```\n"
                            "```\nthis is a very unlikely backport of core#16723,"
                            " core-gui#2 "
                            "and secp256k1#253431 in a multi-line code block\n```\n"
                            "  this is a very unlikely backport of core#16723,"
                            " core-gui#2 and "
                            "secp256k1#253431 in a code block using indentation\n"
                            "this is a port of bchn#1234\n"
                            "a backport of electroncash#2081\n"
                            "a backport of electrum#2361\n"
                        ),
                    },
                }
            ]
        )

        response = self.post_json_with_hmac(
            "/backportCheck", self.headers, {"object": {"phid": "1234"}}
        )
        self.assertEqual(response.status_code, 200)
        self.phab.differential.revision.search.assert_called_with(
            constraints={"phids": ["1234"]}
        )
        calls = [
            mock.call(
                transactions=[
                    {
                        "type": "summary",
                        "value": (
                            "This is a test summary\n"
                            # Bitcoin Core links
                            "Backport of Core PR2345 and PR34567\n"
                            "Backports with optional separators PR 2345 and PR#34567"
                            " and PR #4567\n"
                            "PR6789 outside of a code block `PR4567 inside a code"
                            " block`\n"
                            "```PR4567 in a single-line code block```\n"
                            "```\nPR4567 in a multi-line code block\n```\n"
                            "  PR4567 in a code block using indentation\n"
                            "Another backport PR567890\n"
                            # secp256k1 links
                            "Backport of Secp256k1 PR23 and PR345\n"
                            "Backport of Secp256k1 PR 23 and PR#345 and PR #45\n"
                            "SECP256K1 PR678 outside of a code block `secp256k1 PR456"
                            " inside a code block`\n"
                            "```secp256k1 PR456 in a single-line code block```\n"
                            "```\nsecp256k1 PR456 in a multi-line code block\n```\n"
                            "  secp256k1 PR456 in a code block using indentation\n"
                            "Another secp backport PR567\n"
                            # only canonical markdown is hyperlinked now
                            "random yourname#12345 repo that is not supported is not"
                            " hyperlinked\n"
                            "a backport of"
                            " [[https://github.com/bitcoin-core/secp256k1/pull/894 "
                            "| secp256k1#894]]\n"
                            "this is a backport of"
                            " [[https://github.com/bitcoin/bitcoin/pull/16723 | "
                            "core#16723]] and of"
                            " [[https://github.com/bitcoin-core/gui/pull/2 |"
                            " core-gui#2]]\n"
                            "this is a very unlikely backport of"
                            " [[https://github.com/bitcoin/bitcoin/pull/16723 "
                            "| core#16723]],"
                            " [[https://github.com/bitcoin-core/gui/pull/2 |"
                            " core-gui#2]] "
                            "and [[https://github.com/bitcoin-core/secp256k1/pull/253431"
                            " | secp256k1#253431]]\n"
                            "malformed backport of"
                            " [[https://github.com/bitcoin/bitcoin/pull/16400 | "
                            "core#16400]]#16458 should only link to the first #\n"
                            "```this is a very unlikely backport of core#16723,"
                            " core-gui#2"
                            " and secp256k1#253431 in a single-code block```\n"
                            "```\nthis is a very unlikely backport of core#16723,"
                            " core-gui#2 "
                            "and secp256k1#253431 in a multi-line code block\n```\n"
                            "  this is a very unlikely backport of core#16723,"
                            " core-gui#2 and "
                            "secp256k1#253431 in a code block using indentation\n"
                            "this is a port of"
                            " [[https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node/merge_requests/1234 | "
                            "bchn#1234]]\n"
                            "a backport of"
                            " [[https://github.com/Electron-Cash/Electron-Cash/pull/2081"
                            " | electroncash#2081]]\n"
                            "a backport of"
                            " [[https://github.com/spesmilo/electrum/pull/2361 |"
                            " electrum#2361]]\n"
                        ),
                    }
                ],
                objectIdentifier="1234",
            )
        ]
        self.phab.differential.revision.edit.assert_has_calls(calls, any_order=True)


if __name__ == "__main__":
    unittest.main()
