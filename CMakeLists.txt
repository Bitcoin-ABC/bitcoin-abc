# Copyright (c) 2017 The Bitcoin developers

cmake_minimum_required(VERSION 3.1)
project(BitcoinABC)

# If ccache is available, then use it.
find_program(CCACHE_FOUND ccache)
if(CCACHE_FOUND)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_LINK ccache)
endif(CCACHE_FOUND)

add_subdirectory(src)
