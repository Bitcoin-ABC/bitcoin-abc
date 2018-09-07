// Copyright 2014 BitPay Inc.
// Distributed under the MIT software license, see the accompanying
// file COPYING or https://opensource.org/licenses/mit-license.php.

#include <univalue.h>
#include <univalue_escapes.h>

#include <cstddef>
#include <string>
#include <utility>

namespace {
struct UniValueStreamWriter {
    std::string str;

    UniValueStreamWriter() {
        str.reserve(1024);
    }

    std::string getString() {
#if __cplusplus >= 201103L
        return std::move(str);
#else
        std::string ret;
        std::swap(ret, str);
        return ret;
#endif
    }

    void put(char c) {
        str.push_back(c);
    }
    void put(char c, size_t nFill) {
        str.append(nFill, c);
    }
    void write(const char *s) {
        str.append(s);
    }
    void write(const std::string &s) {
        str.append(s);
    }

    void indentStr(unsigned int prettyIndent, unsigned int indentLevel) {
        put(' ', prettyIndent * indentLevel);
    }

    void escapeJson(const std::string &inS);
    void writeAny(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj);
    void writeArray(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj);
    void writeObject(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj);
};

void UniValueStreamWriter::escapeJson(const std::string &inS) {
    size_t len = inS.length();
    for (size_t i = 0; i < len; i++) {
        const char ch = inS[i];
        const char * const escStr = escapes[uint8_t(ch)];

        if (escStr) {
            write(escStr);
        } else {
            put(ch);
        }
    }
}

void UniValueStreamWriter::writeAny(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj) {
    unsigned int modIndent = indentLevel;
    if (modIndent == 0) {
        modIndent = 1;
    }

    switch (obj.typ) {
    case UniValue::VNULL:
        write("null");
        break;
    case UniValue::VOBJ:
        writeObject(prettyIndent, modIndent, obj);
        break;
    case UniValue::VARR:
        writeArray(prettyIndent, modIndent, obj);
        break;
    case UniValue::VSTR:
        put('"');
        escapeJson(obj.val);
        put('"');
        break;
    case UniValue::VNUM:
        write(obj.val);
        break;
    case UniValue::VBOOL:
        write(obj.val == "1" ? "true" : "false");
        break;
    }
}

void UniValueStreamWriter::writeArray(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj) {
    put('[');
    if (prettyIndent) {
        put('\n');
    }

    const size_t nValues = obj.values.size();
    for (size_t i = 0; i < nValues; ++i) {
        if (prettyIndent) {
            indentStr(prettyIndent, indentLevel);
        }
        writeAny(prettyIndent, indentLevel + 1, obj.values[i]);
        if (i != nValues - 1) {
            put(',');
        }
        if (prettyIndent) {
            put('\n');
        }
    }

    if (prettyIndent) {
        indentStr(prettyIndent, indentLevel - 1);
    }
    put(']');
}

void UniValueStreamWriter::writeObject(unsigned int prettyIndent, unsigned int indentLevel, const UniValue &obj) {
    put('{');
    if (prettyIndent) {
        put('\n');
    }

    // Note: if typ == VOBJ, then keys.size() == values.size() always, so we can
    // use the non-bounds-checking operator[]() for both keys and values here safely.
    const size_t nItems = obj.keys.size();
    for (size_t i = 0; i < nItems; ++i) {
        if (prettyIndent) {
            indentStr(prettyIndent, indentLevel);
        }
        put('"');
        escapeJson(obj.keys[i]);
        write("\":");

        if (prettyIndent) {
            put(' ');
        }
        writeAny(prettyIndent, indentLevel + 1, obj.values[i]);
        if (i != nItems - 1) {
            put(',');
        }
        if (prettyIndent) {
            put('\n');
        }
    }

    if (prettyIndent) {
        indentStr(prettyIndent, indentLevel - 1);
    }
    put('}');
}
}

std::string UniValue::write(unsigned int prettyIndent, unsigned int indentLevel) const {
    UniValueStreamWriter ss;
    ss.writeAny(prettyIndent, indentLevel, *this);
    return ss.getString();
}
