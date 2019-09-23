# Copyright (c) 2019 The Bitcoin developers
include(GNUInstallDirs)
set(MAN_DESTINATION "${CMAKE_INSTALL_MANDIR}/man1")

install(FILES bitcoind.1 DESTINATION "${MAN_DESTINATION}")

if(BUILD_BITCOIN_CLI)
	install(FILES bitcoin-cli.1 DESTINATION "${MAN_DESTINATION}")
endif()

if(BUILD_BITCOIN_TX)
	install(FILES bitcoin-tx.1 DESTINATION "${MAN_DESTINATION}")
endif()

if(BUILD_BITCOIN_QT)
	install(FILES bitcoin-qt.1 DESTINATION "${MAN_DESTINATION}")
endif()
