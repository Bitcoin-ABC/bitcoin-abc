# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-qt)

find_package(Qt5 COMPONENTS Widgets Network REQUIRED)

# Localisation
add_subdirectory(locale)

add_custom_command(OUTPUT temp_bitcoin_locale.qrc
	COMMAND cmake
	ARGS
		-E copy
		"${CMAKE_CURRENT_SOURCE_DIR}/bitcoin_locale.qrc"
		temp_bitcoin_locale.qrc
	MAIN_DEPENDENCY bitcoin_locale.qrc
	VERBATIM
)

add_custom_command(OUTPUT qrc_bitcoin_locale.cpp
	COMMAND Qt5::rcc
	ARGS
		temp_bitcoin_locale.qrc
		-name bitcoin_locale
		-o qrc_bitcoin_locale.cpp
	MAIN_DEPENDENCY temp_bitcoin_locale.qrc
	DEPENDS locales
	VERBATIM
)

add_library(bitcoin-qt-base
	# Translations
	${BITCOIN_QM_FILES}

	# Handle qrc files
	qrc_bitcoin_locale.cpp
)
