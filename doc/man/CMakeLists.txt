# Copyright (c) 2019 The Bitcoin developers
include(InstallationHelper)

install_manpages(bitcoind bitcoind.1)

if(BUILD_BITCOIN_CLI)
	install_manpages(bitcoind bitcoin-cli.1)
endif()

if(BUILD_BITCOIN_TX)
	install_manpages(bitcoind bitcoin-tx.1)
endif()

if(BUILD_BITCOIN_QT)
	install_manpages(bitcoin-qt bitcoin-qt.1)
endif()

if(BUILD_BITCOIN_WALLET)
	install_manpages(bitcoin-wallet bitcoin-wallet.1)
endif()
