# Deprecate a build flag
macro(deprecate_build_flag old_flag new_flag)
	if(DEFINED ${old_flag})
		if(DEFINED ${new_flag})
			if (NOT "${${old_flag}}" STREQUAL "${${new_flag}}")
				message(
					FATAL_ERROR
					"Conflicting values for ${new_flag} (${${new_flag}}) and "
					"deprecated ${old_flag} (${${old_flag}}). "
					"Please use only ${new_flag}."
				)
			endif()
		endif()
		# Set the new flag to the value of the old flag
		set(${new_flag} ${${old_flag}} CACHE BOOL "Build ${new_flag} feature" FORCE)
		message(
			WARNING
			"The ${old_flag} flag is deprecated and will be removed in a future release. "
			"Please use ${new_flag} instead."
		)
	endif()
endmacro()
