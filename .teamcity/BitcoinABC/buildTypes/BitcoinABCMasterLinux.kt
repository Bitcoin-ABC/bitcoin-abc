package BitcoinABC.buildTypes

import jetbrains.buildServer.configs.kotlin.v2017_2.*
import jetbrains.buildServer.configs.kotlin.v2017_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2017_2.triggers.vcs

object BitcoinABCMasterLinux : BuildType({
    uuid = "0a8f3248-ed0a-4c8d-9554-796d8fc3f52e"
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
