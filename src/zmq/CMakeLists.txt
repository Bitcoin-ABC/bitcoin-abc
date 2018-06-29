# Copyright (c) 2017 The Bitcoin developers

project(zmq)

add_library(zmq
	zmqabstractnotifier.cpp
	zmqnotificationinterface.cpp
	zmqpublishnotifier.cpp
	zmqrpc.cpp
)

find_package(ZeroMQ REQUIRED)
target_include_directories(zmq PRIVATE ${ZMQ_INCLUDE_DIR})
target_link_libraries(zmq util ${ZMQ_LIBRARY})

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_compile_definitions(zmq PUBLIC ZMQ_STATIC)
endif()
