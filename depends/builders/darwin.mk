build_darwin_CC:=$(shell xcrun -f clang) -isysroot$(shell xcrun --show-sdk-path)
build_darwin_CXX:=$(shell xcrun -f clang++) -isysroot$(shell xcrun --show-sdk-path)
build_darwin_AR:=$(shell xcrun -f ar)
build_darwin_RANLIB:=$(shell xcrun -f ranlib)
build_darwin_STRIP:=$(shell xcrun -f strip)
build_darwin_OTOOL:=$(shell xcrun -f otool)
build_darwin_NM:=$(shell xcrun -f nm)
build_darwin_SHA256SUM=shasum -a 256
build_darwin_DOWNLOAD=curl --location --fail --connect-timeout $(DOWNLOAD_CONNECT_TIMEOUT) --retry $(DOWNLOAD_RETRIES) -o

#darwin host on darwin builder. overrides darwin host preferences.
darwin_CC=$(shell xcrun -f clang) -isysroot$(shell xcrun --show-sdk-path)
darwin_CXX:=$(shell xcrun -f clang++) -stdlib=libc++ -isysroot$(shell xcrun --show-sdk-path)
darwin_AR:=$(shell xcrun -f ar)
darwin_RANLIB:=$(shell xcrun -f ranlib)
darwin_STRIP:=$(shell xcrun -f strip)
darwin_OTOOL:=$(shell xcrun -f otool)
darwin_NM:=$(shell xcrun -f nm)
darwin_native_binutils=
darwin_native_toolchain=
