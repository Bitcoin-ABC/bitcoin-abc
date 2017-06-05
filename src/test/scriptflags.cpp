// Copyright (c) 2017 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "test/scriptflags.h"

#include "script/interpreter.h"

#include <boost/algorithm/string/classification.hpp>
#include <boost/algorithm/string/split.hpp>
#include <boost/assign/list_of.hpp>
#include <boost/test/unit_test.hpp>

#include <map>
#include <vector>

static std::map<std::string, unsigned int> mapFlagNames =
    boost::assign::map_list_of(std::string("NONE"),
                               (unsigned int)SCRIPT_VERIFY_NONE)(
        std::string("P2SH"), (unsigned int)SCRIPT_VERIFY_P2SH)(
        std::string("STRICTENC"), (unsigned int)SCRIPT_VERIFY_STRICTENC)(
        std::string("DERSIG"), (unsigned int)SCRIPT_VERIFY_DERSIG)(
        std::string("LOW_S"), (unsigned int)SCRIPT_VERIFY_LOW_S)(
        std::string("SIGPUSHONLY"), (unsigned int)SCRIPT_VERIFY_SIGPUSHONLY)(
        std::string("MINIMALDATA"), (unsigned int)SCRIPT_VERIFY_MINIMALDATA)(
        std::string("NULLDUMMY"), (unsigned int)SCRIPT_VERIFY_NULLDUMMY)(
        std::string("DISCOURAGE_UPGRADABLE_NOPS"),
        (unsigned int)SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS)(
        std::string("CLEANSTACK"), (unsigned int)SCRIPT_VERIFY_CLEANSTACK)(
        std::string("MINIMALIF"), (unsigned int)SCRIPT_VERIFY_MINIMALIF)(
        std::string("NULLFAIL"), (unsigned int)SCRIPT_VERIFY_NULLFAIL)(
        std::string("CHECKLOCKTIMEVERIFY"),
        (unsigned int)SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY)(
        std::string("CHECKSEQUENCEVERIFY"),
        (unsigned int)SCRIPT_VERIFY_CHECKSEQUENCEVERIFY)(
        std::string("DISCOURAGE_UPGRADABLE_WITNESS_PROGRAM"),
        (unsigned int)SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_WITNESS_PROGRAM)(
        std::string("COMPRESSED_PUBKEYTYPE"),
        (unsigned int)SCRIPT_VERIFY_COMPRESSED_PUBKEYTYPE)(
        std::string("SIGHASH_FORKID"),
        (unsigned int)SCRIPT_ENABLE_SIGHASH_FORKID);

unsigned int ParseScriptFlags(std::string strFlags) {
    if (strFlags.empty()) {
        return 0;
    }
    unsigned int flags = 0;
    std::vector<std::string> words;
    boost::algorithm::split(words, strFlags, boost::algorithm::is_any_of(","));

    for (std::string &word : words) {
        if (!mapFlagNames.count(word))
            BOOST_ERROR("Bad test: unknown verification flag '" << word << "'");
        flags |= mapFlagNames[word];
    }

    return flags;
}

std::string FormatScriptFlags(unsigned int flags) {
    if (flags == 0) {
        return "";
    }
    std::string ret;
    std::map<std::string, unsigned int>::const_iterator it =
        mapFlagNames.begin();
    while (it != mapFlagNames.end()) {
        if (flags & it->second) {
            ret += it->first + ",";
        }
        it++;
    }
    return ret.substr(0, ret.size() - 1);
}
