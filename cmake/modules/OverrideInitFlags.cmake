# This will set the initial value for the C/CXX flags.
# It is included at the time a project language is enabled.

# This mimics the autotools behavior by setting the CFLAGS to '-g -O2`, which
# are not well suited for debugging.
# FIXME: update CFLAGS with better debug oriented optimization flags
set(CMAKE_C_FLAGS_DEBUG_INIT "-O2")
set(CMAKE_C_FLAGS_MINSIZEREL_INIT "-Os")
set(CMAKE_C_FLAGS_RELEASE_INIT "-O3")
set(CMAKE_C_FLAGS_RELWITHDEBINFO_INIT "-g -O2")

set(CMAKE_CXX_FLAGS_DEBUG_INIT "-O0")
set(CMAKE_CXX_FLAGS_MINSIZEREL_INIT "-Os")
set(CMAKE_CXX_FLAGS_RELEASE_INIT "-O3")
set(CMAKE_CXX_FLAGS_RELWITHDEBINFO_INIT "-g -O2")
