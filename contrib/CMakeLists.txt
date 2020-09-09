option(ENABLE_SOURCE_CONTROL_TOOLS_TESTS "Enable testing of the source control tools" OFF)
if(ENABLE_SOURCE_CONTROL_TOOLS_TESTS)
	add_subdirectory(source-control-tools)
endif()

add_subdirectory(buildbot)
add_subdirectory(devtools)

include(PackageHelper)
exclude_from_source_package(
	# Subdirectories
	"aur/"
	"debian/"
	"gitian/"
	"gitian-builder/"
	"gitian-descriptors/"
	"qos/"
	"seeds/"
	"teamcity/"
	"testgen/"
	# FIXME Can be packaged once it gets updated to work with Bitcoin ABC
	"verifybinaries/"
	"zmq/"

	# Files
	"bitcoin-qt.pro"
	"gitian-build.py"
	"README.md"
	"valgrind.supp"
)
