# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-qt)

include(BrewHelper)
find_brew_prefix(QT5_PREFIX qt5)

set(QT_REQUIRED_COMPONENTS Core Widgets Network Test)
if(ENABLE_DBUS_NOTIFICATIONS)
	list(APPEND QT_REQUIRED_COMPONENTS DBus)
endif()

find_package(Qt5 5.9.5 COMPONENTS ${QT_REQUIRED_COMPONENTS} REQUIRED HINTS "${QT5_PREFIX}")

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
		--format-version 1
	MAIN_DEPENDENCY temp_bitcoin_locale.qrc
	DEPENDS locales
	VERBATIM
)

# UI elements
# qt5_wrap_ui() generates the files in the CMAKE_CURRENT_BINARY_DIR. As there
# is no option to change the output directory, moving the files to the forms
# subdirectory requires to override the variable. It is reset to its actual
# value after the call so it does not impact the other sections of this
# CMakeLists.txt file.
set(SAVE_CMAKE_CURRENT_BINARY_DIR ${CMAKE_CURRENT_BINARY_DIR})
set(CMAKE_CURRENT_BINARY_DIR "${CMAKE_CURRENT_BINARY_DIR}/forms")

# It seems that some generators (at least the Unix Makefiles one) doesn't create
# the build directory required  by a custom command, so do it manually.
file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR})

qt5_wrap_ui(UI_GENERATED_HEADERS
	forms/addressbookpage.ui
	forms/askpassphrasedialog.ui
	forms/coincontroldialog.ui
	forms/createwalletdialog.ui
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
set(CMAKE_CURRENT_BINARY_DIR ${SAVE_CMAKE_CURRENT_BINARY_DIR})

# Qt MOC
set(CMAKE_AUTOMOC ON)

# Handle qrc resources
qt5_add_resources(QRC_BITCOIN_CPP bitcoin.qrc)

add_library(bitcoin-qt-base
	bantablemodel.cpp
	bitcoin.cpp
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

	# Translations
	${BITCOIN_QM_FILES}

	# Handle qrc files
	${QRC_BITCOIN_CPP}
	qrc_bitcoin_locale.cpp
)

# Add the minimal integration plugin, and other plugins according to the target
# platform.
set(QT_PLUGIN_COMPONENTS QMinimalIntegrationPlugin)
set(QT_PLUGIN_PLATFORM_DEFINITIONS -DQT_QPA_PLATFORM_MINIMAL=1)

# Linux support
if(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
	list(APPEND QT_PLUGIN_COMPONENTS QXcbIntegrationPlugin)
	list(APPEND QT_PLUGIN_PLATFORM_DEFINITIONS -DQT_QPA_PLATFORM_XCB=1)
endif()

# Windows support
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	list(APPEND QT_PLUGIN_COMPONENTS QWindowsIntegrationPlugin)
	list(APPEND QT_PLUGIN_PLATFORM_DEFINITIONS -DQT_QPA_PLATFORM_WINDOWS=1)

	target_sources(bitcoin-qt-base PRIVATE winshutdownmonitor.cpp)
endif()

# OSX support
if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
	list(APPEND QT_PLUGIN_COMPONENTS QCocoaIntegrationPlugin)
	list(APPEND QT_PLUGIN_COMPONENTS QMacStylePlugin)
	list(APPEND QT_PLUGIN_PLATFORM_DEFINITIONS -DQT_QPA_PLATFORM_COCOA=1)

	target_sources(bitcoin-qt-base PRIVATE
		macdockiconhandler.mm
		macnotificationhandler.mm
		macos_appnap.mm
	)

	set_property(TARGET bitcoin-qt-base PROPERTY AUTOMOC_MOC_OPTIONS "-DQ_OS_MAC")

	target_link_libraries(bitcoin-qt-base
		"-framework Foundation"
		"-framework AppKit"
	)
endif()

# Find out more about Qt. This is similar to
# http://code.qt.io/cgit/qt/qtwebkit.git/tree/Source/cmake/OptionsQt.cmake
get_target_property(QT_CORE_TYPE Qt5::Core TYPE)
if(QT_CORE_TYPE MATCHES STATIC)
	set(QT_STATIC_BUILD ON)
endif()

# Determine the Qt libraries directory from the QT5::Core library location
get_target_property(QT_CORE_LIB_LOCATION Qt5::Core LOCATION)
get_filename_component(QT5_LIB_DIR "${QT_CORE_LIB_LOCATION}" DIRECTORY)

set(STATIC_DEPENDENCIES_CMAKE_FILE "${CMAKE_BINARY_DIR}/QtStaticDependencies.cmake")
if(EXISTS ${STATIC_DEPENDENCIES_CMAKE_FILE})
	file(REMOVE ${STATIC_DEPENDENCIES_CMAKE_FILE})
endif()

set(CONVERT_PRL_PATH "${CONTRIB_PATH}/qt/convert-prl-libs-to-cmake.pl")
macro(CONVERT_PRL_LIBS_TO_CMAKE _qt_component)
	if(TARGET Qt5::${_qt_component})
		get_target_property(_lib_location Qt5::${_qt_component} LOCATION)
		execute_process(COMMAND ${PERL_EXECUTABLE} "${CONVERT_PRL_PATH}"
			--lib "${_lib_location}"
			--qt_lib_install_dir "${QT5_LIB_DIR}"
			--out "${STATIC_DEPENDENCIES_CMAKE_FILE}"
			--component "${_qt_component}"
			--compiler "${CMAKE_CXX_COMPILER_ID}"
		)
	endif()
endmacro()

if(QT_STATIC_BUILD)
	list(APPEND QT_REQUIRED_COMPONENTS ${QT_PLUGIN_COMPONENTS})

	foreach(qt_module ${QT_REQUIRED_COMPONENTS})
		CONVERT_PRL_LIBS_TO_CMAKE(${qt_module})
	endforeach()

	# HACK: We must explicitly add LIB path of the Qt installation
	# to correctly find qtpcre
	link_directories("${QT5_LIB_DIR}")

	# Now that we generated the dependencies, import them.
	set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS "${CONVERT_PRL_PATH}")
	if(NOT EXISTS ${STATIC_DEPENDENCIES_CMAKE_FILE})
		message(FATAL_ERROR "Unable to find ${STATIC_DEPENDENCIES_CMAKE_FILE}")
	endif()
	include(${STATIC_DEPENDENCIES_CMAKE_FILE})
	list(REMOVE_DUPLICATES STATIC_LIB_DEPENDENCIES)

	# According to Qt documentation (https://doc.qt.io/qt-5/plugins-howto.html):
	# "Plugins can be linked statically into your application.
	# If you build the static version of Qt, this is the only option for
	# including Qt's predefined plugins."
	# So if the Qt build is static, the plugins should also be static and we
	# need to define QT_STATICPLUGIN to tell the code to import <QTPlugin>.
	target_compile_definitions(bitcoin-qt-base PUBLIC -DQT_STATICPLUGIN=1)

	# Add the platform plugin definition if required
	# Setting this definition tells the code what is the target for Q_IMPORT_PLUGIN().
	foreach(qt_platform_definition ${QT_PLUGIN_PLATFORM_DEFINITIONS})
		target_compile_definitions(bitcoin-qt-base PUBLIC "${qt_platform_definition}")
	endforeach()

	# Link the required plugins
	foreach(qt_plugin ${QT_PLUGIN_COMPONENTS})
		target_link_libraries(bitcoin-qt-base Qt5::${qt_plugin})
	endforeach()
endif()

target_link_libraries(bitcoin-qt-base
	server
	rpcclient
	Qt5::Widgets
	Qt5::Network
)
if(ENABLE_DBUS_NOTIFICATIONS)
	target_link_libraries(bitcoin-qt-base Qt5::DBus)
endif()

if(ENABLE_BIP70)
	# Do protobuf codegen.
	# The protobuf-config.cmake file is used here as the recent (version > 21)
	# protobuf might not play nicely with the cmake-supplied FindProtobuf.cmake.
	# This is due to cmake (at the time of writing, v3.26) not pulling the
	# required Abseil dependencies properly (and not managing the new protobuf
	# versioning scheme either).
	# In the event it is not found, fallback to the FindProtobuf version.
	# Documentation can be found here:
	# https://github.com/protocolbuffers/protobuf/blob/main/docs/cmake_protobuf_generate.md
	find_package(Protobuf CONFIG)
	if(NOT Protobuf_FOUND)
		find_package(Protobuf REQUIRED)
	endif()

	add_library(
		bitcoin-qt-protobuf OBJECT
		paymentrequest.proto
	)
	target_link_libraries(bitcoin-qt-protobuf PUBLIC protobuf::libprotobuf)

	# Where protoc will put the generated files
	set(PROTOC_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}")
	# Where the proto files are located
	set(PROTO_IMPORT_DIRECTORY "${CMAKE_CURRENT_LIST_DIR}")

	# Include the generated headers path
	target_include_directories(
		bitcoin-qt-protobuf
		PUBLIC "$<BUILD_INTERFACE:${PROTOC_OUTPUT_DIRECTORY}>"
	)

	protobuf_generate(
		LANGUAGE cpp
		TARGET bitcoin-qt-protobuf
		IMPORT_DIRS "${PROTO_IMPORT_DIRECTORY}"
		PROTOC_OUT_DIR "${PROTOC_OUTPUT_DIRECTORY}"
	)

	# Don't run clang-tidy on generated files
	if(ENABLE_CLANG_TIDY)
		include(ClangTidy)
		target_disable_clang_tidy(bitcoin-qt-protobuf)
	endif()

	# Message::ByteSize() is deprecated and replaced by ByteSizeLong() since
	# protobuf 3.1.
	if(Protobuf_VERSION GREATER_EQUAL "3.1.0")
		target_compile_definitions(bitcoin-qt-base PRIVATE USE_PROTOBUF_MESSAGE_BYTESIZELONG)
	endif()

	# OpenSSL functionality
	include(BrewHelper)
	find_brew_prefix(OPENSSL_ROOT_DIR openssl)
	find_package(OpenSSL REQUIRED)

	include(CheckSymbolExists)
	set(CMAKE_REQUIRED_INCLUDES ${OPENSSL_INCLUDE_DIR})
	set(CMAKE_REQUIRED_LIBRARIES OpenSSL::SSL)
	check_symbol_exists(EVP_MD_CTX_new "openssl/evp.h" HAVE_DECL_EVP_MD_CTX_NEW)
	if(HAVE_DECL_EVP_MD_CTX_NEW)
		target_compile_definitions(bitcoin-qt-base PRIVATE HAVE_DECL_EVP_MD_CTX_NEW=1)
	endif()

	target_link_libraries(bitcoin-qt-base
		OpenSSL::SSL
		bitcoin-qt-protobuf
	)
endif()

# Wallet
if(BUILD_BITCOIN_WALLET)
	# Automoc option.
	set(AUTOMOC_MOC_OPTIONS -DENABLE_WALLET=1)

	# Add wallet functionality to bitcoin-qt
	target_sources(bitcoin-qt-base
		PRIVATE
			addressbookpage.cpp
			addresstablemodel.cpp
			askpassphrasedialog.cpp
			coincontroldialog.cpp
			coincontroltreewidget.cpp
			createwalletdialog.cpp
			editaddressdialog.cpp
			openuridialog.cpp
			overviewpage.cpp
			paymentserver.cpp
			qrimagewidget.cpp
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
			walletcontroller.cpp
			walletframe.cpp
			walletmodel.cpp
			walletmodeltransaction.cpp
			walletview.cpp
	)

	# Add BIP70 functionality to bitcoin-qt
	if(ENABLE_BIP70)
		target_sources(bitcoin-qt-base
			PRIVATE
				paymentrequestplus.cpp
		)
	endif()

	target_link_libraries(bitcoin-qt-base wallet)

	if(ENABLE_QRCODE)
		find_package(QREncode REQUIRED)
		target_link_libraries(bitcoin-qt-base QREncode::qrencode)
	endif()
endif()

# The executable
add_executable(bitcoin-qt WIN32 main.cpp)
include(WindowsVersionInfo)
generate_windows_version_info(bitcoin-qt
	DESCRIPTION "GUI node for Bitcoin"
	ICONS
		"res/icons/bitcoin.ico"
		"res/icons/bitcoin_testnet.ico"
)
target_link_libraries(bitcoin-qt bitcoin-qt-base)

include(BinaryTest)
add_to_symbols_check(bitcoin-qt)
add_to_security_check(bitcoin-qt)

include(InstallationHelper)
install_target(bitcoin-qt)
install_manpages(bitcoin-qt)

if(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
	set(BITCOINQT_BUNDLE_ICON "res/icons/bitcoin.icns")
	get_filename_component(BITCOINQT_BUNDLE_ICON_NAME
		"${BITCOINQT_BUNDLE_ICON}"
		NAME
	)

	set(INFO_PLIST_STRINGS_FILE "Base.lproj/InfoPlist.strings")
	set(INFO_PLIST_STRINGS_PATH "${CMAKE_CURRENT_BINARY_DIR}/${INFO_PLIST_STRINGS_FILE}")
	file(WRITE
		"${INFO_PLIST_STRINGS_PATH}"
		"{	CFBundleDisplayName = \"${PACKAGE_NAME}\"; CFBundleName = \"${PACKAGE_NAME}\"; }"
	)

	set(EMPTY_LPROJ_FILE "${CMAKE_CURRENT_BINARY_DIR}/empty.lproj")
	file(TOUCH "${EMPTY_LPROJ_FILE}")

	target_sources(bitcoin-qt PRIVATE
		"${BITCOINQT_BUNDLE_ICON}"
		"${INFO_PLIST_STRINGS_PATH}"
		"${EMPTY_LPROJ_FILE}"
	)

	string(JOIN ";" BITCOINQT_BUNDLE_RESOURCES
		"${BITCOINQT_BUNDLE_ICON}"
		"${EMPTY_LPROJ_FILE}"
	)

	set(BITCOIN_QT_OSX_BUNDLE_NAME "BitcoinABC-Qt")
	set_target_properties(bitcoin-qt PROPERTIES
		MACOSX_BUNDLE ON
		OUTPUT_NAME "${BITCOIN_QT_OSX_BUNDLE_NAME}"
		MACOSX_BUNDLE_INFO_PLIST "${CMAKE_SOURCE_DIR}/share/qt/Info.plist.cmake.in"
		MACOSX_BUNDLE_BUNDLE_NAME "${BITCOIN_QT_OSX_BUNDLE_NAME}"
		MACOSX_BUNDLE_BUNDLE_VERSION "${bitcoin-abc_VERSION}"
		MACOSX_BUNDLE_GUI_IDENTIFIER "org.bitcoinabc.${BITCOIN_QT_OSX_BUNDLE_NAME}"
		MACOSX_BUNDLE_ICON_FILE "${BITCOINQT_BUNDLE_ICON_NAME}"
		MACOSX_BUNDLE_INFO_STRING "${bitcoin-abc_VERSION}, Copyright © 2009-${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDERS_FINAL}"
		MACOSX_BUNDLE_LONG_VERSION_STRING "${bitcoin-abc_VERSION}"
		MACOSX_BUNDLE_SHORT_VERSION_STRING "${bitcoin-abc_VERSION}"
		RESOURCE "${BITCOINQT_BUNDLE_RESOURCES}"
	)
	# The InfoPlist.strings files should be located in a resource subdirectory.
	# This is not supported by the RESOURCE property and require the use of the
	# MACOSX_PACKAGE_LOCATION property instead. The RESOURCE documentation has
	# an example demonstrating this behavior (see the appres.txt file):
	# https://cmake.org/cmake/help/latest/prop_tgt/RESOURCE.html
	set_source_files_properties(
		"${INFO_PLIST_STRINGS_PATH}"
		PROPERTIES
			MACOSX_PACKAGE_LOCATION "Resources/${INFO_PLIST_STRINGS_FILE}"
	)

	# Create a stripped version of the application bundle to be used in the ZIP.
	# Since the LOCATION property and the BundleUtilities package are deprecated
	# by cmake, only generator expressions can be used to determine the path to
	# the bundle and its executable. However the generator expressions are
	# solved at build time, making them unusable to do path computation at
	# configuration time.
	# The paths here are then hard-coded, which is safe since the structure of
	# an application bundle is well-known and specified by Apple. Note that this
	# will only work for building MacOS application bundle as the IOS structure
	# is slightly different.
	set(STRIPPED_BUNDLE "${CMAKE_CURRENT_BINARY_DIR}/stripped/${BITCOIN_QT_OSX_BUNDLE_NAME}.app")
	add_custom_command(
		OUTPUT
			"${STRIPPED_BUNDLE}"
		COMMAND
			${CMAKE_COMMAND} -E copy_directory "$<TARGET_BUNDLE_DIR:bitcoin-qt>" "${STRIPPED_BUNDLE}"
		COMMAND
			${CMAKE_STRIP} -u -r "${STRIPPED_BUNDLE}/Contents/MacOS/${BITCOIN_QT_OSX_BUNDLE_NAME}"
		DEPENDS
			bitcoin-qt
	)

	set(QT_BASE_TRANSLATIONS
		"ar" "bg" "ca" "cs" "da" "de" "es" "fa" "fi" "fr" "gd" "gl" "he" "hu"
		"it" "ja" "ko" "lt" "lv" "pl" "pt" "ru" "sk" "sl" "sv" "uk" "zh_CN"
		"zh_TW"
	)

	get_target_property(QMAKE_EXECUTABLE Qt5::qmake IMPORTED_LOCATION)
	execute_process(
		COMMAND
			"${QMAKE_EXECUTABLE}"
			-query QT_INSTALL_TRANSLATIONS
		OUTPUT_VARIABLE
			QT_TRANSLATION_DIR
		OUTPUT_STRIP_TRAILING_WHITESPACE
	)

	function(get_qt_translation_dir QT_TRANSLATION_DIR)
		foreach(_locale ${ARGN})
			find_path(_qt_translation_dir
				"qt_${_locale}.qm"
				HINTS
					"${QT_TRANSLATION_DIR}"
				PATH_SUFFIXES
					"translations"
			)

			# Ensure that all the translation files are found, and are located
			# in the same directory.
			if(NOT _qt_translation_dir OR (_qt_translation_dir_previous AND (NOT _qt_translation_dir_previous STREQUAL _qt_translation_dir)))
				return()
			endif()

			set(_qt_translation_dir_previous _qt_translation_dir)
		endforeach()

		set(QT_TRANSLATION_DIR ${_qt_translation_dir} PARENT_SCOPE)
	endfunction()

	string(REPLACE " " "-" OSX_VOLNAME "${PACKAGE_NAME}")
	file(WRITE "${CMAKE_BINARY_DIR}/osx_volname" "${OSX_VOLNAME}")

	set(MACDEPLOY_DIR "${CMAKE_SOURCE_DIR}/contrib/macdeploy")
	set(MACDEPLOYQTPLUS "${MACDEPLOY_DIR}/macdeployqtplus.py")
	set(APP_DIST_DIR "${CMAKE_BINARY_DIR}/dist")
	set(APP_DSSTORE "${APP_DIST_DIR}/.DS_Store")
	add_custom_command(
		OUTPUT
			"${APP_DIST_DIR}"
			"${APP_DSSTORE}"
		COMMAND
			"OBJDUMP=${CMAKE_OBJDUMP}"
			"${Python_EXECUTABLE}"
			"${MACDEPLOYQTPLUS}"
			"${STRIPPED_BUNDLE}"
			"${OSX_VOLNAME}"
			-translations-dir "${QT_TRANSLATION_DIR}"
		WORKING_DIRECTORY
			"${CMAKE_BINARY_DIR}"
		DEPENDS
			"${STRIPPED_BUNDLE}"
	)

	set(OSX_APPLICATION_DIR "Applications")
	set(OSX_APPLICATION_SYMLINK "${APP_DIST_DIR}/${OSX_APPLICATION_DIR}")
	add_custom_command(
		OUTPUT
			"${OSX_APPLICATION_SYMLINK}"
		COMMAND
			${CMAKE_COMMAND} -E create_symlink "/${OSX_APPLICATION_DIR}" "${OSX_APPLICATION_SYMLINK}"
		DEPENDS
			"${APP_DIST_DIR}"
	)

	add_custom_target(osx-deploydir
		DEPENDS
			"${OSX_APPLICATION_SYMLINK}"
			"${APP_DSSTORE}"
	)

	if(CMAKE_CROSSCOMPILING)
		include(DoOrFail)
		find_program_or_fail(ZIP_EXECUTABLE zip)

		set(ZIP_ARCHIVE_NAME "${OSX_VOLNAME}.zip")
		configure_file(
			"${CMAKE_SOURCE_DIR}/cmake/templates/deterministicZip.sh.in"
			"${CMAKE_BINARY_DIR}/config/deterministicZip.sh"
		)

		add_custom_target(osx-zip
			COMMENT
				"Creating a deterministic Zip archive of the MacOS Application"
			COMMAND
				"${CMAKE_BINARY_DIR}/config/deterministicZip.sh"
			WORKING_DIRECTORY
				"${CMAKE_BINARY_DIR}"
			DEPENDS
				"${CMAKE_BINARY_DIR}/config/deterministicZip.sh"
		)
		add_dependencies(osx-zip osx-deploydir)
	else()
		add_custom_target(osx-zip
			COMMAND
				"${Python_EXECUTABLE}"
				"${MACDEPLOYQTPLUS}"
				"${STRIPPED_BUNDLE}"
				"${OSX_VOLNAME}"
				-translations-dir "${QT_TRANSLATION_DIR}"
				-zip
			WORKING_DIRECTORY
				"${CMAKE_BINARY_DIR}"
			DEPENDS
				"${STRIPPED_BUNDLE}"
		)
	endif()
endif()

configure_file(
	"${CMAKE_SOURCE_DIR}/cmake/utils/translate.sh.in"
	"${CMAKE_CURRENT_BINARY_DIR}/translate.sh"
	@ONLY
)

add_custom_target(translate
	COMMENT "Updating the translations..."
	COMMAND "${CMAKE_CURRENT_BINARY_DIR}/translate.sh"
	DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/translate.sh"
	WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/.."
)

# Test tests
add_subdirectory(test)
