package BitcoinABC

import jetbrains.buildServer.configs.kotlin.v2017_2.*
import jetbrains.buildServer.configs.kotlin.v2017_2.Project
import BitcoinABC.buildTypes.*
import BitcoinABC.vcsRoots.*


object Project : Project({
    uuid = "1ddf9a64-4576-455b-b8c5-1be776a90759"
    id = "BitcoinABC"
    parentId = "_Root"
    name = "Bitcoin-ABC"

    vcsRoot(BitcoinABCGit)

    buildType(BitcoinABCMasterLinux)
})
