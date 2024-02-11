package BitcoinABC.buildTypes

import jetbrains.buildServer.configs.kotlin.v2017_2.*
import jetbrains.buildServer.configs.kotlin.v2017_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2017_2.triggers.vcs

object BitcoinABCMasterLinux : BuildType({
    uuid = "186070e4-1abd-4bf6-80a9-6e69c9eb299c"
    id = "BitcoinABCMasterLinux"
    name = "Bitcoin-ABC Master"

    enablePersonalBuilds = false
    artifactRules = """
        +:output/**/*
        +:build/tmp/**/*
        +:build/ibd/debug.log
        +:build/core
    """.trimIndent()

    vcs {
        root(BitcoinABC.vcsRoots.BitcoinABCGit)

        checkoutMode = CheckoutMode.ON_AGENT
        cleanCheckout = true
    }

    steps {
        script {
            scriptContent = "./contrib/teamcity/build.sh"
        }
    }

    triggers {
        vcs {
            // Run every commit
            perCheckinTriggering = true
            enableQueueOptimization = false
        }
    }

    features {
        feature {
            // Parse test reports
            type = "xml-report-plugin"
            param("xmlReportParsing.reportType", "junit")
            param("xmlReportParsing.reportDirs", "+:build/test_bitcoin.xml")
        }
    }
})
