#!/usr/bin/env python

import sys

from setuptools import setup, find_packages

tests_requires = ['responses>=0.12']

if sys.version_info[:2] < (2, 7):
    tests_requires.append('unittest2')

if sys.version_info[:2] <= (3, 3):
    tests_requires.append('mock')

setup(
    name='phabricator',
    version='0.7.0',
    author='Disqus',
    author_email='opensource@disqus.com',
    url='http://github.com/disqus/python-phabricator',
    description='Phabricator API Bindings',
    packages=find_packages(),
    zip_safe=False,
    install_requires=['requests>=2.22'],
    test_suite='phabricator.tests.test_phabricator',
    extras_require={
        'tests': tests_requires,
    },
    include_package_data=True,
    classifiers=[
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Operating System :: OS Independent',
        'Topic :: Software Development',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
    ],
)
