# Copyright (c) 2017 The Bitcoin developers

project(zmq)

add_library(zmq
	zmqabstractnotifier.cpp
	zmqnotificationinterface.cpp
	zmqpublishnotifier.cpp
	zmqrpc.cpp
	zmqutil.cpp
)

find_package(ZeroMQ 4.1.5 REQUIRED)
target_link_libraries(zmq util ZeroMQ::zmq)

if(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
	target_compile_definitions(zmq PUBLIC ZMQ_STATIC)
endif()
