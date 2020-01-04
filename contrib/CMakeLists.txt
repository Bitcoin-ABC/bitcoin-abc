option(BUILD_SOURCE_CONTROL_TOOLS "Build the source control tools" OFF)
if(BUILD_SOURCE_CONTROL_TOOLS)
	add_subdirectory(source-control-tools)
endif()

add_subdirectory(devtools)

include(PackageHelper)
exclude_from_source_package(
	# Subdirectories
	"debian/"
	"gitian/"
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
