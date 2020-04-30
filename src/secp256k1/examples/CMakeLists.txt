# Run all the compiled examples
add_custom_target(secp256k1-examples)

function(add_example name)
  set(target_name ${name}_example)
  add_executable(${target_name} ${name}.c)
  target_include_directories(${target_name} PRIVATE
    "${PROJECT_SOURCE_DIR}/include"
  )
  target_link_libraries(${target_name}
    secp256k1
    $<$<PLATFORM_ID:Windows>:bcrypt>
  )
  add_custom_command(
    TARGET secp256k1-examples
    POST_BUILD
    COMMAND "$<TARGET_FILE:${target_name}>"
    COMMENT "Running ${target_name}"
  )
endfunction()

add_example(ecdsa)

if(SECP256K1_ENABLE_MODULE_ECDH)
  add_example(ecdh)
endif()

if(SECP256K1_ENABLE_MODULE_SCHNORRSIG)
  add_example(schnorr)
endif()
