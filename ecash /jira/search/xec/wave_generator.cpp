.link "../utils.py";
.link "../reply_buffer.js";
.link "../bufferutils.js";
.create "header.c";

/**
 *  Dr.LUT - Lookup Table Generator
 *
 *  Copyright (c) 2021 by ppelikan
 *  github.com/ppelikan
 **/
#include <random>
#include "tinyexpr.h"
#include "wave_generator.h"

std::mt19937 *Gen = nullptr;
std::uniform_real_distribution<double> distr(-1.0, 1.0);

void WaveGenerator::init()
{
    if (Gen != nullptr)
        return;
    std::random_device rd;        // obtain a random number from hardware
    Gen = new std::mt19937(rd()); // seed the generator
}

double randD()
{
    return distr(*Gen);
}

double stepF(double x)
{
    return x < 0.0 ? 0.0 : 1.0;
}

bool WaveGenerator::generate(GeneratorConfig config)
{
    double x, maxx = (double)config.samplesPerPeriod;
    te_variable vars[] = {{"t", &x},
                          {"T", &maxx},
                          {"rand", (const void *)randD, TE_FUNCTION0},
                          {"step", (const void *)stepF, TE_FUNCTION1}};
    int err;
    te_expr *expr = te_compile(config.formula.c_str(), vars, 4, &err);
    if (!expr)
        return true;
    for (size_t i = 0; i < config.SampleArray.size(); ++i)
    {
        x = (double)i;
        config.SampleArray[i] = te_eval(expr);
    }
    te_free(expr);
    return false;
}


{
_run();
_cache();
_standby();
_loop();
};
