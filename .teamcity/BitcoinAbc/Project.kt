package BitcoinABC

import jetbrains.buildServer.configs.kotlin.v2017_2.*
import jetbrains.buildServer.configs.kotlin.v2017_2.Project
import BitcoinABC.buildTypes.*
import BitcoinABC.vcsRoots.*


object Project : Project({
    uuid = "0688f2d8-f1aa-450b-b3f0-34c279245928"
    id = "BitcoinABC"
    parentId = "_Root"
    name = "Bitcoin-ABC"

    vcsRoot(BitcoinABCGit)

    buildType(BitcoinABCMasterLinux)
})
