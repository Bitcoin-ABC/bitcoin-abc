// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <rwcollection.h>

#include <reverse_iterator.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <set>
#include <vector>

BOOST_AUTO_TEST_SUITE(rwcollection_tests)

BOOST_AUTO_TEST_CASE(vector) {
    RWCollection<std::vector<int>> rwvector;

    {
        auto w = rwvector.getWriteView();
        for (int i = 0; i < 100; i++) {
            w->push_back(i + 10);
            BOOST_CHECK_EQUAL(w[i], i + 10);
            BOOST_CHECK_EQUAL(w->back(), i + 10);
            BOOST_CHECK_EQUAL(w->size(), i + 1);

            w[i] = i;
            BOOST_CHECK_EQUAL(w[i], i);
        }

        int e = 0;
        for (int &i : w) {
            BOOST_CHECK_EQUAL(i, e++);
            i *= 2;
        }

        e = 0;
        for (int &i : reverse_iterate(w)) {
            BOOST_CHECK_EQUAL(i, 198 - 2 * e);
            i = e++;
        }
    }

    {
        auto r = rwvector.getReadView();
        for (int i = 0; i < 100; i++) {
            BOOST_CHECK_EQUAL(r[i], 99 - i);
        }

        int e = 0;
        for (const int &i : r) {
            BOOST_CHECK_EQUAL(i, 99 - (e++));
        }

        e = 0;
        for (const int &i : reverse_iterate(r)) {
            BOOST_CHECK_EQUAL(i, e++);
        }
    }
}

BOOST_AUTO_TEST_CASE(set) {
    RWCollection<std::set<int>> rwset;

    {
        auto w = rwset.getWriteView();
        for (int i = 0; i < 100; i++) {
            w->insert(i);
            BOOST_CHECK_EQUAL(w->count(i), 1);
            BOOST_CHECK_EQUAL(*(w->find(i)), i);
            BOOST_CHECK_EQUAL(w->size(), i + 1);
        }

        for (int i = 0; i < 100; i += 2) {
            BOOST_CHECK_EQUAL(w->erase(i), 1);
            BOOST_CHECK_EQUAL(w->count(i), 0);
            BOOST_CHECK(w->find(i) == std::end(w));
        }

        int e = 0;
        for (const int &i : w) {
            BOOST_CHECK_EQUAL(i / 2, e++);
        }
    }

    {
        auto r = rwset.getReadView();
        for (int i = 0; i < 100; i += 2) {
            BOOST_CHECK_EQUAL(r->count(i), 0);
            BOOST_CHECK(r->find(i) == std::end(r));
        }

        for (int i = 1; i < 100; i += 2) {
            BOOST_CHECK_EQUAL(r->count(i), 1);
            BOOST_CHECK_EQUAL(*(r->find(i)), i);
        }

        int e = 0;
        for (const int &i : r) {
            BOOST_CHECK_EQUAL(i / 2, e++);
        }
    }
}

BOOST_AUTO_TEST_CASE(map) {
    RWCollection<std::map<std::string, std::string>> rwmap;

    {
        auto w = rwmap.getWriteView();
        w["1"] = "one";
        w["2"] = "two";
        w["3"] = "three";
        BOOST_CHECK_EQUAL(w["1"], "one");
        BOOST_CHECK_EQUAL(w["2"], "two");
        BOOST_CHECK_EQUAL(w["3"], "three");

        for (const std::pair<const std::string, std::string> &p : w) {
            BOOST_CHECK_EQUAL(w[p.first], p.second);
        }
    }

    {
        auto r = rwmap.getReadView();
        BOOST_CHECK_EQUAL(r->count("1"), 1);
        BOOST_CHECK_EQUAL(r->find("1")->first, "1");
        BOOST_CHECK_EQUAL(r->find("1")->second, "one");

        for (const std::pair<const std::string, std::string> &p : r) {
            BOOST_CHECK_EQUAL(r->at(p.first), p.second);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END();
