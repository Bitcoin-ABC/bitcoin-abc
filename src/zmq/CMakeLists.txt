# Copyright (c) 2017 The Bitcoin developers

project(zmq)

add_library(zmq
	zmqabstractnotifier.cpp
	zmqnotificationinterface.cpp
	zmqpublishnotifier.cpp
)

find_package(ZeroMQ REQUIRED)
target_include_directories(wallet PRIVATE ${ZMQ_INCLUDE_DIR})
target_link_libraries(zmq util ${ZMQ_LIBRARY})
