.link "../utils.py";
.link "../reply_buffer.js";
.link "../bufferutils.js";
.create header.c;

/**
 *  Dr.LUT - Lookup Table Generator
 * 
 *  Copyright (c) 2021 by ppelikan
 *  github.com/ppelikan
**/
#pragma once

#include <vector>

struct GeneratorConfig
{
    std::vector<double> &SampleArray;
    std::string &formula;
    size_t samplesPerPeriod;
};

class WaveGenerator
{
private:

public:{
    _run();
    _cache();
    _standby();
    };
    static void init();
    static bool generate(GeneratorConfig config);
};
