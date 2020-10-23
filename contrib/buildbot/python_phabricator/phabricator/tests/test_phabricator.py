try:
    import unittest2 as unittest
except ImportError:
    import unittest

import requests
import responses

from pkg_resources import resource_string
import json

import phabricator
phabricator.ARCRC = {}  # overwrite any arcrc that might be read


RESPONSES = json.loads(
    resource_string(
        'phabricator.tests.resources',
        'responses.json'
    ).decode('utf8')
)
CERTIFICATE = resource_string(
    'phabricator.tests.resources',
    'certificate.txt'
).decode('utf8').strip()


# Protect against local user's .arcrc interference.
phabricator.ARCRC = {}


class PhabricatorTest(unittest.TestCase):
    def setUp(self):
        self.api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )
        self.api.certificate = CERTIFICATE

    def test_generate_hash(self):
        token = '12345678'
        hashed = self.api.generate_hash(token)
        self.assertEqual(hashed, 'f8d3bea4e58a2b2967d93d5b307bfa7c693b2e7f')

    @responses.activate
    def test_connect(self):
        responses.add('POST', 'http://localhost/api/conduit.connect',
                      body=RESPONSES['conduit.connect'], status=200)

        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )

        api.connect()
        keys = api._conduit.keys()
        self.assertIn('sessionKey', keys)
        self.assertIn('connectionID', keys)
        assert len(responses.calls) == 1

    @responses.activate
    def test_user_whoami(self):
        responses.add('POST', 'http://localhost/api/user.whoami',
                      body=RESPONSES['user.whoami'], status=200)

        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )
        api._conduit = True

        self.assertEqual(api.user.whoami()['userName'], 'testaccount')

    def test_classic_resources(self):
        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )

        self.assertEqual(api.user.whoami.method, 'user')
        self.assertEqual(api.user.whoami.endpoint, 'whoami')

    def test_nested_resources(self):
        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )

        self.assertEqual(api.diffusion.repository.edit.method, 'diffusion')
        self.assertEqual(
            api.diffusion.repository.edit.endpoint, 'repository.edit')

    @responses.activate
    def test_bad_status(self):
        responses.add(
            'POST', 'http://localhost/api/conduit.connect', status=400)

        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )

        with self.assertRaises(requests.exceptions.HTTPError):
            api.user.whoami()
        assert len(responses.calls) == 1

    @responses.activate
    def test_maniphest_find(self):
        responses.add('POST', 'http://localhost/api/maniphest.find',
                      body=RESPONSES['maniphest.find'], status=200)

        api = phabricator.Phabricator(
            username='test',
            certificate='test',
            host='http://localhost/api/'
        )
        api._conduit = True

        result = api.maniphest.find(
            ownerphids=['PHID-USER-5022a9389121884ab9db']
        )
        self.assertEqual(len(result), 1)

        # Test iteration
        self.assertIsInstance([x for x in result], list)

        # Test getattr
        self.assertEqual(
            result['PHID-TASK-4cgpskv6zzys6rp5rvrc']['status'],
            '3'
        )

    def test_validation(self):
        self.api._conduit = True

        self.assertRaises(ValueError, self.api.differential.find)
        with self.assertRaises(ValueError):
            self.api.differential.find(query=1)
        with self.assertRaises(ValueError):
            self.api.differential.find(query='1')
        with self.assertRaises(ValueError):
            self.api.differential.find(query='1', guids='1')

    def test_map_param_type(self):
        uint = 'uint'
        self.assertEqual(phabricator.map_param_type(uint), int)

        list_bool = 'list<bool>'
        self.assertEqual(phabricator.map_param_type(list_bool), [bool])

        list_pair = 'list<pair<callsign, path>>'
        self.assertEqual(phabricator.map_param_type(list_pair), [tuple])

        complex_list_pair = 'list<pair<string-constant<"gtcm">, string>>'
        self.assertEqual(phabricator.map_param_type(
            complex_list_pair), [tuple])


    def test_endpoint_shadowing(self):
        shadowed_endpoints = [e for e in self.api.interface.keys() if e in self.api.__dict__]
        self.assertEqual(
            shadowed_endpoints,
            [],
            "The following endpoints are shadowed: {}".format(shadowed_endpoints)
        )

if __name__ == '__main__':
    unittest.main()
