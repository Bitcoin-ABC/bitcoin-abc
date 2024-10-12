// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_IGUANA_IGUANA_FORMATTER_H
#define BITCOIN_IGUANA_IGUANA_FORMATTER_H

#include <cstdint>
#include <string>
#include <vector>

struct IguanaResult;
struct IguanaStacks;
struct IguanaTrace;
struct ScriptExecutionMetrics;

class IguanaFormatter {
public:
    virtual bool Format(const IguanaResult &) = 0;
    virtual ~IguanaFormatter(){};
};

class FormatterHumanReadable : public IguanaFormatter {
public:
    virtual bool Format(const IguanaResult &result) override;

private:
    bool FormatTrace(const std::string &title, const IguanaTrace &trace,
                     const ScriptExecutionMetrics &metrics);
    void FormatStacks(const IguanaStacks &stacks);
    void FormatExecutionMetrics(const ScriptExecutionMetrics &metrics);
};

class FormatterCsv : public IguanaFormatter {
public:
    virtual bool Format(const IguanaResult &result) override;

private:
    bool FormatTrace(const std::string &title, const IguanaTrace &trace,
                     const ScriptExecutionMetrics &metrics,
                     size_t topStackSize);
    void TopStackSize(const IguanaTrace &trace, size_t &topStackSize,
                      size_t &topAltStackSize);
    void FormatStacks(const IguanaStacks &stacks, size_t topStackSize);
    void FormatStack(const std::vector<std::vector<uint8_t>> &stack);
    void FormatExecutionMetrics(const ScriptExecutionMetrics &metrics);
};

#endif // BITCOIN_IGUANA_IGUANA_FORMATTER_H
