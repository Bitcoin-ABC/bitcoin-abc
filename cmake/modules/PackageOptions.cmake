# Package options
set(CPACK_PACKAGE_VENDOR "The Bitcoin developers")
set(CPACK_PACKAGE_DESCRIPTION "Bitcoin ABC is a Bitcoin Cash full node implementation.")
set(CPACK_PACKAGE_HOMEPAGE_URL "${PROJECT_HOMEPAGE_URL}")

set(CPACK_PACKAGE_INSTALL_DIRECTORY "Bitcoin-abc")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_SOURCE_DIR}/COPYING")

if(CMAKE_CROSSCOMPILING)
	set(CPACK_SYSTEM_NAME "${TOOLCHAIN_PREFIX}")
endif()

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	set(CPACK_PACKAGE_ICON "${CMAKE_SOURCE_DIR}/share/pixmaps/nsis-header.bmp")
	set(CPACK_GENERATOR "ZIP")
else()
	set(CPACK_PACKAGE_ICON "${CMAKE_SOURCE_DIR}/share/pixmaps/bitcoin-abc128.png")
	set(CPACK_GENERATOR "TGZ")
endif()
