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

# Qt MOC
set(CMAKE_AUTOMOC ON)

# Handle qrc resources
qt5_add_resources(QRC_BITCOIN_CPP bitcoin.qrc)

# Do protobuf codegen
find_package(Protobuf REQUIRED)
protobuf_generate_cpp(PROTOBUF_SOURCES PROTOBUF_HEADERS paymentrequest.proto)

add_library(bitcoin-qt-base
	bantablemodel.cpp
	bitcoinaddressvalidator.cpp
	bitcoinamountfield.cpp
	bitcoingui.cpp
	bitcoinunits.cpp
	clientmodel.cpp
	csvmodelwriter.cpp
	guiutil.cpp
	intro.cpp
	modaloverlay.cpp
	networkstyle.cpp
	notificator.cpp
	optionsdialog.cpp
	optionsmodel.cpp
	peertablemodel.cpp
	platformstyle.cpp
	qvalidatedlineedit.cpp
	qvaluecombobox.cpp
	rpcconsole.cpp
	splashscreen.cpp
	trafficgraphwidget.cpp
	utilitydialog.cpp

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

# Windows support
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_sources(bitcoin-qt-base PRIVATE winshutdownmonitor.cpp)
endif()

target_include_directories(bitcoin-qt-base
	PUBLIC
		.
		${CMAKE_CURRENT_BINARY_DIR}
		${CMAKE_CURRENT_BINARY_DIR}/forms
		${Protobuf_INCLUDE_DIRS}
)

target_link_libraries(bitcoin-qt-base
	server
	rpcclient
	Qt5::Widgets
	Qt5::Network
	${Protobuf_LIBRARIES}
)

# Wallet
if(BUILD_BITCOIN_WALLET)
	target_sources(bitcoin-qt-base
		PRIVATE
			addressbookpage.cpp
			addresstablemodel.cpp
			askpassphrasedialog.cpp
			coincontroldialog.cpp
			coincontroltreewidget.cpp
			editaddressdialog.cpp
			openuridialog.cpp
			overviewpage.cpp
			paymentrequestplus.cpp
			paymentserver.cpp
			receivecoinsdialog.cpp
			receiverequestdialog.cpp
			recentrequeststablemodel.cpp
			sendcoinsdialog.cpp
			sendcoinsentry.cpp
			signverifymessagedialog.cpp
			transactiondesc.cpp
			transactiondescdialog.cpp
			transactionfilterproxy.cpp
			transactionrecord.cpp
			transactiontablemodel.cpp
			transactionview.cpp
			walletframe.cpp
			walletmodel.cpp
			walletmodeltransaction.cpp
			walletview.cpp
	)

	target_link_libraries(bitcoin-qt-base wallet)

	# Dependencies
	find_package(OpenSSL REQUIRED)
	target_link_libraries(bitcoin-qt-base ${OPENSSL_CRYPTO_LIBRARY})
endif()
