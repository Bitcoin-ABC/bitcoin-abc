#!/bin/sh

export LC_ALL=C.UTF-8

protoc --python_out=. --proto_path=./protobuf fusion.proto
