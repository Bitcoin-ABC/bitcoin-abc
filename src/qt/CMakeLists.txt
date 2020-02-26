# Copyright (c) 2018 The Bitcoin developers

project(bitcoin-qt)

# This ensure that AUTOMOC doesn't run on generated files.
cmake_policy(SET CMP0071 OLD)

include(BrewHelper)
find_brew_prefix(QT5_PREFIX qt5)

set(QT_REQUIRED_COMPONENTS Core Widgets Network Test)
if(ENABLE_NOTIFICATIONS)
	list(APPEND QT_REQUIRED_COMPONENTS DBus)
endif()

find_package(Qt5 5.5.1 COMPONENTS ${QT_REQUIRED_COMPONENTS} REQUIRED HINTS "${QT5_PREFIX}")

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
	list(APPEND QT_PLUGIN_PLATFORM_DEFINITIONS -DQT_QPA_PLATFORM_COCOA=1)

	target_sources(bitcoin-qt-base PRIVATE
		macdockiconhandler.mm
		macnotificationhandler.mm
	)

	set_property(TARGET bitcoin-qt-base PROPERTY AUTOMOC_MOC_OPTIONS "-DQ_OS_MAC")

	target_link_libraries(bitcoin-qt-base
		"-framework Foundation"
		"-framework ApplicationServices"
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
if(ENABLE_NOTIFICATIONS)
	target_link_libraries(bitcoin-qt-base Qt5::DBus)
endif()

if(ENABLE_BIP70)
	# Do protobuf codegen
	find_package(Protobuf REQUIRED)
	protobuf_generate_cpp(PROTOBUF_SOURCES PROTOBUF_HEADERS paymentrequest.proto)
	
	add_library(bitcoin-qt-protobuf OBJECT
		# Protobuf codegen
			${PROTOBUF_HEADERS}
			${PROTOBUF_SOURCES}
	)

	target_include_directories(bitcoin-qt-protobuf PUBLIC ${Protobuf_INCLUDE_DIRS})
	target_link_libraries(bitcoin-qt-protobuf ${Protobuf_LIBRARIES})

	# Don't run clang-tidy on generated files
	if(ENABLE_CLANG_TIDY)
		include(ClangTidy)
		target_disable_clang_tidy(bitcoin-qt-protobuf)
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
			editaddressdialog.cpp
			openuridialog.cpp
			overviewpage.cpp
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
		target_include_directories(bitcoin-qt-base PUBLIC ${QRENCODE_INCLUDE_DIR})
		target_link_libraries(bitcoin-qt-base ${QRENCODE_LIBRARY})
	endif()
endif()

# The executable
add_executable(bitcoin-qt WIN32 main.cpp)
if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_sources(bitcoin-qt PRIVATE res/bitcoin-qt-res.rc)
endif()
target_link_libraries(bitcoin-qt bitcoin-qt-base)

include(BinaryTest)
add_to_symbols_check(bitcoin-qt)
add_to_security_check(bitcoin-qt)

include(InstallationHelper)
install_target(bitcoin-qt)

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

	# Create a stripped version of the application bundle to be used in the DMG.
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

	include(DoOrFail)
	find_program_or_fail(CMAKE_INSTALL_NAME_TOOL "install_name_tool")
	find_program_or_fail(CMAKE_OTOOL "otool")

	set(QT_INSTALLER_SUPPORTED_LANGUAGES
		"da"
		"de"
		"es"
		"hu"
		"ru"
		"uk"
		"zh_CN"
		"zh_TW"
	)
	string(JOIN "," QT_LOCALES ${QT_INSTALLER_SUPPORTED_LANGUAGES})

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

	get_qt_translation_dir(QT_TRANSLATION_DIR ${QT_INSTALLER_SUPPORTED_LANGUAGES})
	if(NOT QT_TRANSLATION_DIR)
		message(FATAL_ERROR "Qt translation files are not found")
	endif()

	set(MACDEPLOY_DIR "${CMAKE_SOURCE_DIR}/contrib/macdeploy")
	set(MACDEPLOYQTPLUS "${MACDEPLOY_DIR}/macdeployqtplus")
	set(DMG_DIST "${CMAKE_BINARY_DIR}/dist")
	add_custom_command(
		OUTPUT
			"${DMG_DIST}"
		COMMAND
			"INSTALLNAMETOOL=${CMAKE_INSTALL_NAME_TOOL}"
			"OTOOL=${CMAKE_OTOOL}"
			"STRIP=${CMAKE_STRIP}"
			"${Python_EXECUTABLE}"
			"${MACDEPLOYQTPLUS}"
			"${STRIPPED_BUNDLE}"
			-translations-dir "${QT_TRANSLATION_DIR}"
			-add-qt-tr "${QT_LOCALES}"
		WORKING_DIRECTORY
			"${CMAKE_BINARY_DIR}"
		DEPENDS
			"${STRIPPED_BUNDLE}"
	)

	# Building the DMG background image requires several steps:
	#   1/ The SVG file must be edited to display the package name
	#   2/ The SVG file should be transformed into a couple PNG files, on for
	#      low resolution screens and one for high resolution screens.
	#   3/ The PNG files must be transformed into a multi-resolution TIFF file.
	#      The names are not set arbitrarily, they follow Apple's guidelines for
	#      resolution independent bitmap images (see `man tiffutil`).
	set(BACKGROUND_SVG "background.svg")
	configure_file(
		"${CMAKE_SOURCE_DIR}/contrib/macdeploy/background.svg.cmake.in"
		"${BACKGROUND_SVG}"
	)

	include(ImageHelper)
	set(BACKGROUND_PNG_LOWRES "${CMAKE_CURRENT_BINARY_DIR}/background_temp.png")
	set(BACKGROUND_PNG_HIRES "${CMAKE_CURRENT_BINARY_DIR}/background_temp@2x.png")
	set(BACKGROUND_TIFF_LOWRES "${CMAKE_CURRENT_BINARY_DIR}/background_temp.tiff")
	set(BACKGROUND_TIFF_HIRES "${CMAKE_CURRENT_BINARY_DIR}/background_temp@2x.tiff")
	set(BACKGROUND_TIFF_NAME "background.tiff")
	set(BACKGROUND_TIFF_MULTIRES "${CMAKE_BINARY_DIR}/${BACKGROUND_TIFF_NAME}")
	convert_svg_to_png("${BACKGROUND_SVG}" "${BACKGROUND_PNG_LOWRES}" 36)
	convert_svg_to_png("${BACKGROUND_SVG}" "${BACKGROUND_PNG_HIRES}" 72)
	convert_png_to_tiff("${BACKGROUND_PNG_LOWRES}" "${BACKGROUND_TIFF_LOWRES}")
	convert_png_to_tiff("${BACKGROUND_PNG_HIRES}" "${BACKGROUND_TIFF_HIRES}")
	cat_multi_resolution_tiff("${BACKGROUND_TIFF_MULTIRES}" "${BACKGROUND_TIFF_LOWRES}" "${BACKGROUND_TIFF_HIRES}")

	set(BACKGROUND_DIST_DIR "${DMG_DIST}/.background")
	set(BACKGROUND_DIST_TIFF "${BACKGROUND_DIST_DIR}/${BACKGROUND_TIFF_NAME}")
	add_custom_command(
		OUTPUT
			"${BACKGROUND_DIST_TIFF}"
		COMMAND
			${CMAKE_COMMAND} -E make_directory "${BACKGROUND_DIST_DIR}"
		COMMAND
			${CMAKE_COMMAND} -E copy "${BACKGROUND_TIFF_MULTIRES}" "${BACKGROUND_DIST_TIFF}"
		DEPENDS
			"${BACKGROUND_TIFF_MULTIRES}"
			"${DMG_DIST}"
	)

	string(REPLACE " " "-" OSX_VOLNAME "${PACKAGE_NAME}")
	file(WRITE "${CMAKE_BINARY_DIR}/osx_volname" "${OSX_VOLNAME}")

	set(DMG_DSSTORE "${DMG_DIST}/.DS_Store")
	set(GEN_DSSTORE "${MACDEPLOY_DIR}/custom_dsstore.py")
	add_custom_command(
		OUTPUT
			"${DMG_DSSTORE}"
		COMMAND
			"${Python_EXECUTABLE}"
			"${GEN_DSSTORE}"
			"${DMG_DSSTORE}"
			"${OSX_VOLNAME}"
		DEPENDS
			"${GEN_DSSTORE}"
			"${DMG_DIST}"
	)

	set(OSX_APPLICATION_DIR "Applications")
	set(OSX_APPLICATION_SYMLINK "${DMG_DIST}/${OSX_APPLICATION_DIR}")
	add_custom_command(
		OUTPUT
			"${OSX_APPLICATION_SYMLINK}"
		COMMAND
			${CMAKE_COMMAND} -E create_symlink "/${OSX_APPLICATION_DIR}" "${OSX_APPLICATION_SYMLINK}"
		DEPENDS
			"${DMG_DIST}"
	)

	add_custom_target(osx-deploydir
		DEPENDS
			"${OSX_APPLICATION_SYMLINK}"
			"${DMG_DSSTORE}"
			"${BACKGROUND_DIST_TIFF}"
	)

	if(CMAKE_CROSSCOMPILING)
		find_program_or_fail(GENISOIMAGE_EXECUTABLE genisoimage)

		add_custom_target(osx-dmg
			COMMAND
				"${GENISOIMAGE_EXECUTABLE}"
				-no-cache-inodes
				-D
				-l
				-probe
				-V "${OSX_VOLNAME}"
				-no-pad
				-r
				-dir-mode 0755
				-apple
				-o "${OSX_VOLNAME}.dmg"
				"${DMG_DIST}"
			WORKING_DIRECTORY
				"${CMAKE_BINARY_DIR}"
		)
		add_dependencies(osx-dmg osx-deploydir)
	else()
		add_custom_target(osx-dmg
			COMMAND
				"${Python_EXECUTABLE}"
				"${MACDEPLOYQTPLUS}"
				"${STRIPPED_BUNDLE}"
				-translations-dir "${QT_TRANSLATION_DIR}"
				-add-qt-tr "${QT_LOCALES}"
				-dmg
				-fancy "${MACDEPLOY_DIR}/fancy.plist"
				-volname "${OSX_VOLNAME}"
			WORKING_DIRECTORY
				"${CMAKE_BINARY_DIR}"
			DEPENDS
				"${STRIPPED_BUNDLE}"
				"${BACKGROUND_TIFF_MULTIRES}"
		)
	endif()
endif()

# Test tests
add_subdirectory(test)
