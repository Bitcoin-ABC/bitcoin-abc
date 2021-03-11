// Copyright (c) 2016-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <deploymentinfo.h>

#include <consensus/params.h>

const struct VBDeploymentInfo
    VersionBitsDeploymentInfo[Consensus::MAX_VERSION_BITS_DEPLOYMENTS] = {
        {
            /*.name =*/"testdummy",
            /*.gbt_force =*/true,
        },
};

[[maybe_unused]] std::string DeploymentName(Consensus::BuriedDeployment dep) {
    assert(ValidDeployment(dep));
    switch (dep) {
        case Consensus::DEPLOYMENT_P2SH:
            return "bip22";
        case Consensus::DEPLOYMENT_HEIGHTINCB:
            return "bip34";
        case Consensus::DEPLOYMENT_CLTV:
            return "bip65";
        case Consensus::DEPLOYMENT_DERSIG:
            return "bip66";
        case Consensus::DEPLOYMENT_CSV:
            return "csv";
    } // no default case, so the compiler can warn about missing cases
    return "";
}
