# Facilities for image transformations
include(DoOrFail)

macro(convert_svg_to_png SVG PNG DPI)
	find_program_or_fail(RSVG_CONVERT_EXECUTABLE rsvg-convert)

	add_custom_command(
		OUTPUT
			"${PNG}"
		COMMAND
			"${RSVG_CONVERT_EXECUTABLE}"
			-f png
			-d "${DPI}"
			-p "${DPI}"
			"${SVG}"
			-o "${PNG}"
		MAIN_DEPENDENCY
			"${SVG}"
	)
endmacro()

macro(_convert_png_to_tiff_linux PNG TIFF)
	# find_package(ImageMagick) does not search in the default bin
	# directories and fails. This is a known bug from FindImageMagick:
	# https://gitlab.kitware.com/cmake/cmake/issues/16179
	# When the issue is solved the following can be uncommented:
	# find_package(ImageMagick COMPONENTS convert REQUIRED CMAKE_FIND_ROOT_PATH_BOTH)
	#
	# For now, use find_program as a workaround.
	find_program_or_fail(ImageMagick_convert_EXECUTABLE convert)

	add_custom_command(
		OUTPUT
			"${TIFF}"
		COMMAND
			"${ImageMagick_convert_EXECUTABLE}"
			"${PNG}"
			"${TIFF}"
		MAIN_DEPENDENCY
			"${PNG}"
	)
endmacro()

macro(convert_png_to_tiff PNG TIFF)
	if(NOT CMAKE_CROSSCOMPILING AND ${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
		message(FATAL_ERROR "The PNG to TIFF conversion is only supported on Linux.")
	else()
		_convert_png_to_tiff_linux("${PNG}" "${TIFF}")
	endif()
endmacro()

macro(_cat_multi_resolution_tiff_linux OUTPUT)
	find_program_or_fail(TIFFCP_EXECUTABLE tiffcp)

	add_custom_command(
		OUTPUT
			"${OUTPUT}"
		COMMAND
			"${TIFFCP_EXECUTABLE}"
			-c none
			${ARGN}
			"${OUTPUT}"
		DEPENDS
			${ARGN}
	)
endmacro()

macro(cat_multi_resolution_tiff OUTPUT)
	if(NOT CMAKE_CROSSCOMPILING AND ${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
		message(FATAL_ERROR "The PNG to TIFF concatenation is only supported on Linux.")
	else()
		_cat_multi_resolution_tiff_linux("${OUTPUT}" ${ARGN})
	endif()
endmacro()
