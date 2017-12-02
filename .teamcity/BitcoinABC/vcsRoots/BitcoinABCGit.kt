package BitcoinABC.vcsRoots

import jetbrains.buildServer.configs.kotlin.v2017_2.*
import jetbrains.buildServer.configs.kotlin.v2017_2.vcs.GitVcsRoot

object BitcoinABCGit : GitVcsRoot({
    uuid = "6bc507be-2572-4968-a4fb-3128ae025398"
    id = "BitcoinABCGit"
    name = "ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git"
    url = "ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git"
    branchSpec = """
        +:refs/heads/(*)
        +:refs/tags/(*)
    """.trimIndent()
    authMethod = uploadedKey {
        uploadedKey = "teamcity"
    }
})
