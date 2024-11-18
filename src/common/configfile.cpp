// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <common/args.h>

#include <logging.h>
#include <sync.h>
#include <tinyformat.h>
#include <univalue.h>
#include <util/fs.h>
#include <util/settings.h>
#include <util/string.h>

#include <algorithm>
#include <cassert>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <list>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

fs::path GetConfigFile(const ArgsManager &args,
                       const fs::path &configuration_file_path) {
    return AbsPathForConfigVal(args, configuration_file_path,
                               /*net_specific=*/false);
}

static bool
GetConfigOptions(std::istream &stream, const std::string &filepath,
                 std::string &error,
                 std::vector<std::pair<std::string, std::string>> &options,
                 std::list<SectionInfo> &sections) {
    std::string str, prefix;
    std::string::size_type pos;
    int linenr = 1;
    while (std::getline(stream, str)) {
        bool used_hash = false;
        if ((pos = str.find('#')) != std::string::npos) {
            str = str.substr(0, pos);
            used_hash = true;
        }
        const static std::string pattern = " \t\r\n";
        str = TrimString(str, pattern);
        if (!str.empty()) {
            if (*str.begin() == '[' && *str.rbegin() == ']') {
                const std::string section = str.substr(1, str.size() - 2);
                sections.emplace_back(SectionInfo{section, filepath, linenr});
                prefix = section + '.';
            } else if (*str.begin() == '-') {
                error = strprintf(
                    "parse error on line %i: %s, options in configuration file "
                    "must be specified without leading -",
                    linenr, str);
                return false;
            } else if ((pos = str.find('=')) != std::string::npos) {
                std::string name =
                    prefix +
                    TrimString(std::string_view{str}.substr(0, pos), pattern);
                std::string_view value = TrimStringView(
                    std::string_view{str}.substr(pos + 1), pattern);
                if (used_hash &&
                    name.find("rpcpassword") != std::string::npos) {
                    error = strprintf(
                        "parse error on line %i, using # in rpcpassword can be "
                        "ambiguous and should be avoided",
                        linenr);
                    return false;
                }
                options.emplace_back(name, value);
                if ((pos = name.rfind('.')) != std::string::npos &&
                    prefix.length() <= pos) {
                    sections.emplace_back(
                        SectionInfo{name.substr(0, pos), filepath, linenr});
                }
            } else {
                error = strprintf("parse error on line %i: %s", linenr, str);
                if (str.size() >= 2 && str.substr(0, 2) == "no") {
                    error += strprintf(", if you intended to specify a negated "
                                       "option, use %s=1 instead",
                                       str);
                }
                return false;
            }
        }
        ++linenr;
    }
    return true;
}

bool ArgsManager::ReadConfigStream(std::istream &stream,
                                   const std::string &filepath,
                                   std::string &error,
                                   bool ignore_invalid_keys) {
    LOCK(cs_args);
    std::vector<std::pair<std::string, std::string>> options;
    if (!GetConfigOptions(stream, filepath, error, options,
                          m_config_sections)) {
        return false;
    }
    for (const std::pair<std::string, std::string> &option : options) {
        std::string section;
        std::string key = option.first;
        util::SettingsValue value =
            InterpretOption(section, key, option.second);
        std::optional<unsigned int> flags = GetArgFlags('-' + key);
        if (flags) {
            if (!CheckValid(key, value, *flags, error)) {
                return false;
            }
            m_settings.ro_config[section][key].push_back(value);
        } else {
            if (ignore_invalid_keys) {
                LogPrintf("Ignoring unknown configuration value %s\n",
                          option.first);
            } else {
                error = strprintf("Invalid configuration value %s",
                                  option.first.c_str());
                return false;
            }
        }
    }
    return true;
}

bool ArgsManager::ReadConfigFiles(std::string &error,
                                  bool ignore_invalid_keys) {
    {
        LOCK(cs_args);
        m_settings.ro_config.clear();
        m_config_sections.clear();
    }

    const auto conf_path{GetConfigFilePath()};
    std::ifstream stream{conf_path};

    // ok to not have a config file
    if (stream.good()) {
        if (!ReadConfigStream(stream, fs::PathToString(conf_path), error,
                              ignore_invalid_keys)) {
            return false;
        }
        // `-includeconf` cannot be included in the command line arguments
        // except as `-noincludeconf` (which indicates that no included conf
        // file should be used).
        bool use_conf_file{true};
        {
            LOCK(cs_args);
            if (auto *includes = util::FindKey(m_settings.command_line_options,
                                               "includeconf")) {
                // ParseParameters() fails if a non-negated -includeconf is
                // passed on the command-line
                assert(util::SettingsSpan(*includes).last_negated());
                use_conf_file = false;
            }
        }
        if (use_conf_file) {
            std::string chain_id = GetChainName();
            std::vector<std::string> conf_file_names;

            auto add_includes = [&](const std::string &network,
                                    size_t skip = 0) {
                size_t num_values = 0;
                LOCK(cs_args);
                if (auto *section =
                        util::FindKey(m_settings.ro_config, network)) {
                    if (auto *values = util::FindKey(*section, "includeconf")) {
                        for (size_t i = std::max(
                                 skip, util::SettingsSpan(*values).negated());
                             i < values->size(); ++i) {
                            conf_file_names.push_back((*values)[i].get_str());
                        }
                        num_values = values->size();
                    }
                }
                return num_values;
            };

            // We haven't set m_network yet (that happens in SelectParams()), so
            // manually check for network.includeconf args.
            const size_t chain_includes = add_includes(chain_id);
            const size_t default_includes = add_includes({});

            for (const std::string &conf_file_name : conf_file_names) {
                std::ifstream conf_file_stream{
                    GetConfigFile(*this, fs::PathFromString(conf_file_name))};
                if (conf_file_stream.good()) {
                    if (!ReadConfigStream(conf_file_stream, conf_file_name,
                                          error, ignore_invalid_keys)) {
                        return false;
                    }
                    LogPrintf("Included configuration file %s\n",
                              conf_file_name);
                } else {
                    error = "Failed to include configuration file " +
                            conf_file_name;
                    return false;
                }
            }

            // Warn about recursive -includeconf
            conf_file_names.clear();
            add_includes(chain_id, /* skip= */ chain_includes);
            add_includes({}, /* skip= */ default_includes);
            std::string chain_id_final = GetChainName();
            if (chain_id_final != chain_id) {
                // Also warn about recursive includeconf for the chain that was
                // specified in one of the includeconfs
                add_includes(chain_id_final);
            }
            for (const std::string &conf_file_name : conf_file_names) {
                tfm::format(std::cerr,
                            "warning: -includeconf cannot be used from "
                            "included files; ignoring -includeconf=%s\n",
                            conf_file_name);
            }
        }
    }

    // If datadir is changed in .conf file:
    ClearPathCache();
    if (!CheckDataDirOption(*this)) {
        error = strprintf("specified data directory \"%s\" does not exist.",
                          GetArg("-datadir", "").c_str());
        return false;
    }
    return true;
}

fs::path AbsPathForConfigVal(const ArgsManager &args, const fs::path &path,
                             bool net_specific) {
    if (path.is_absolute()) {
        return path;
    }
    return fsbridge::AbsPathJoin(
        net_specific ? args.GetDataDirNet() : args.GetDataDirBase(), path);
}
