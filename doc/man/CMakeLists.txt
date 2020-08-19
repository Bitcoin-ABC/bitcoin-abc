# Copyright (c) 2019 The Bitcoin developers
include(InstallationHelper)

install_manpages(bitcoind.1)

if(BUILD_BITCOIN_CLI)
	install_manpages(bitcoin-cli.1)
endif()

if(BUILD_BITCOIN_TX)
	install_manpages(bitcoin-tx.1)
endif()

if(BUILD_BITCOIN_QT)
	install_manpages(bitcoin-qt.1)
endif()

if(BUILD_BITCOIN_WALLET)
	install_manpages(bitcoin-wallet.1)
endif()
