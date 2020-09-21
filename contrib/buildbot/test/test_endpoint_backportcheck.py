#!/usr/bin/env python3
#
# Copyright (c) 2017-2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import mock
import unittest

from test.abcbot_fixture import ABCBotFixture
import test.mocks.phabricator


class EndpointBackportcheckTestCase(ABCBotFixture):
    def test_backportCheck_happyPath(self):
        self.phab.differential.revision.search.return_value = test.mocks.phabricator.Result([{
            'id': '1234',
            'fields': {
                'summary': 'This is a test summary'
            },
        }])

        response = self.post_json_with_hmac(
            '/backportCheck', self.headers, {'object': {'phid': '1234'}})
        assert response.status_code == 200
        self.phab.differential.revision.search.assert_called_with(
            constraints={"phids": ['1234']})
        self.phab.differential.revision.edit.assert_not_called()

    def test_backportCheck_invalid_json(self):
        response = self.post_data_with_hmac(
            '/backportCheck', self.headers, "not: a valid json")
        self.assertEqual(response.status_code, 415)

    def test_backportCheck_hasNoPRs(self):
        # Despite potential matches for linking PRs, the phab API should not be
        # called to update the summary, even if the result would be the same.
        self.phab.differential.revision.search.return_value = test.mocks.phabricator.Result([{
            'id': '1234',
            'fields': {
                'summary': "This is a test summary `Ignore this backport PR2345` some text.\n"
                "Some text ```Ignore this PR3456``` Some more text.\n"
                "```\nPR4567 in a multi-line code block\nPR5678 in the same code block\n```\n"
                "  Ignore this indented PR4567"
                # Note that short numbered PRs are much more common when referencing non-bitcoin PRs,
                # so we'll ignore them for now.
                "Ignore short numbered PRs: PR123"
                # But we do support secp256k1 PRs with 2-3 digits, so make
                # sure they're also ignored properly
                "This is a test summary `Ignore this secp256k1 backport PR234` some text.\n"
                "Some text ```Ignore this secp256k1 PR345``` Some more text.\n"
                "```\nsecp256k1 PR456 in a multi-line code block\nsecp256k1 PR567 in the same code block\n```\n"
                "  Ignore this indented secp256k1 PR456"
                "Ignore long numbered PRs for secp256k1: PR1234"
                "Ignore short numbered PRs for secp256k1: PR1",
            },
        }])

        response = self.post_json_with_hmac(
            '/backportCheck', self.headers, {'object': {'phid': '1234'}})
        assert response.status_code == 200
        self.phab.differential.revision.search.assert_called_with(
            constraints={'phids': ['1234']})
        self.phab.differential.revision.edit.assert_not_called()

    def test_backportCheck_hasPRs(self):
        self.phab.differential.revision.search.return_value = test.mocks.phabricator.Result([{
            'id': '1234',
            'fields': {
                'summary': "This is a test summary\n"
                # Bitcoin Core links
                "Backport of Core PR2345 and PR34567\n"
                "Backports with optional separators PR 2345 and PR#34567 and PR #4567\n"
                "PR6789 outside of a code block `PR4567 inside a code block`\n"
                "```PR4567 in a single-line code block```\n"
                "```\nPR4567 in a multi-line code block\n```\n"
                "  PR4567 in a code block using indentation\n"
                "Another backport PR567890\n"
                # secp256k1 links
                "Backport of Secp256k1 PR23 and PR345\n"
                "Backport of Secp256k1 PR 23 and PR#345 and PR #45\n"
                "SECP256K1 PR678 outside of a code block `secp256k1 PR456 inside a code block`\n"
                "```secp256k1 PR456 in a single-line code block```\n"
                "```\nsecp256k1 PR456 in a multi-line code block\n```\n"
                "  secp256k1 PR456 in a code block using indentation\n"
                "Another secp backport PR567",
            },
        }])

        response = self.post_json_with_hmac(
            '/backportCheck', self.headers, {'object': {'phid': '1234'}})
        assert response.status_code == 200
        self.phab.differential.revision.search.assert_called_with(
            constraints={'phids': ['1234']})
        calls = [mock.call(transactions=[{
            "type": "summary",
            "value": "This is a test summary\n"
            # Bitcoin Core links
            "Backport of Core [[https://github.com/bitcoin/bitcoin/pull/2345 | PR2345]] and "
            "[[https://github.com/bitcoin/bitcoin/pull/34567 | PR34567]]\n"
            "Backports with optional separators [[https://github.com/bitcoin/bitcoin/pull/2345 | PR2345]] and "
            "[[https://github.com/bitcoin/bitcoin/pull/34567 | PR34567]] and "
            "[[https://github.com/bitcoin/bitcoin/pull/4567 | PR4567]]\n"
            "[[https://github.com/bitcoin/bitcoin/pull/6789 | PR6789]] outside of a code block `PR4567 inside a code block`\n"
            "```PR4567 in a single-line code block```\n"
            "```\nPR4567 in a multi-line code block\n```\n"
            "  PR4567 in a code block using indentation\n"
            "Another backport [[https://github.com/bitcoin/bitcoin/pull/567890 | PR567890]]\n"
            # secp256k1 links
            "Backport of Secp256k1 [[https://github.com/bitcoin-core/secp256k1/pull/23 | PR23]] and "
            "[[https://github.com/bitcoin-core/secp256k1/pull/345 | PR345]]\n"
            "Backport of Secp256k1 [[https://github.com/bitcoin-core/secp256k1/pull/23 | PR23]] and "
            "[[https://github.com/bitcoin-core/secp256k1/pull/345 | PR345]] and "
            "[[https://github.com/bitcoin-core/secp256k1/pull/45 | PR45]]\n"
            "SECP256K1 [[https://github.com/bitcoin-core/secp256k1/pull/678 | PR678]] outside of a code block `secp256k1 PR456 inside a code block`\n"
            "```secp256k1 PR456 in a single-line code block```\n"
            "```\nsecp256k1 PR456 in a multi-line code block\n```\n"
            "  secp256k1 PR456 in a code block using indentation\n"
            "Another secp backport [[https://github.com/bitcoin-core/secp256k1/pull/567 | PR567]]",
        }], objectIdentifier='1234'), mock.call(transactions=[{
            "type": "comment",
            "value": "[Bot Message]\n"
            "One or more PR numbers were detected in the summary.\n"
            "Links to those PRs have been inserted into the summary for reference.",
        }], objectIdentifier='1234')]
        self.phab.differential.revision.edit.assert_has_calls(
            calls, any_order=True)


if __name__ == '__main__':
    unittest.main()
