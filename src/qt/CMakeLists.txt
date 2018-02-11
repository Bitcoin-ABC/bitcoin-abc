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

# UI elements
qt5_wrap_ui(UI_GENERATED_HEADERS
	forms/addressbookpage.ui
	forms/askpassphrasedialog.ui
	forms/coincontroldialog.ui
	forms/editaddressdialog.ui
	forms/helpmessagedialog.ui
	forms/intro.ui
	forms/modaloverlay.ui
	forms/openuridialog.ui
	forms/optionsdialog.ui
	forms/overviewpage.ui
	forms/receivecoinsdialog.ui
	forms/receiverequestdialog.ui
	forms/debugwindow.ui
	forms/sendcoinsdialog.ui
	forms/sendcoinsentry.ui
	forms/signverifymessagedialog.ui
	forms/transactiondescdialog.ui
)

# Handle qrc resources
qt5_add_resources(QRC_BITCOIN_CPP bitcoin.qrc)

# Do protobuf codegen
find_package(Protobuf REQUIRED)
protobuf_generate_cpp(PROTOBUF_SOURCES PROTOBUF_HEADERS paymentrequest.proto)

add_library(bitcoin-qt-base
	# Handle ui files
	${UI_GENERATED_HEADERS}

	# Protobuf codegen
	${PROTOBUF_HEADERS}
	${PROTOBUF_SOURCES}

	# Translations
	${BITCOIN_QM_FILES}

	# Handle qrc files
	${QRC_BITCOIN_CPP}
	qrc_bitcoin_locale.cpp
)
