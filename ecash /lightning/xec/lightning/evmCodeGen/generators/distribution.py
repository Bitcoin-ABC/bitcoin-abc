#! /usr/bin/env python
# -*- coding: utf-8 -*-

"""
Distribution based code generators
"""
import random
from ..utils.random import random_gauss, WeightedRandomizer
from .base import _BaseCodeGen


class DistrCodeGen(_BaseCodeGen):

    def __init__(self, distribution):
        super().__init__()
        self.type = _BaseCodeGen.TYPE_OPCODE_ONLY  # generates opcodes only, operands must be set manually

        self.distribution = distribution

    def _frandom(self, distribution):
        return random.randrange(distribution.min, distribution.max)

    def generate(self, length=None):
        # todo: add gauss histogramm random.randgauss(min,max,avg) - triangle is not really correct here
        length = length or int(self._frandom(self.distribution))
             # use gauss
        # length = random.randint(distribution.min, distribution.max)

        rnd_prolog = WeightedRandomizer(self.distribution.distribution_prolog)
        rnd_epilog = WeightedRandomizer(
            self.distribution.distribution)  # not completely true as this incorps. pro/epilog
        rnd_corpus = WeightedRandomizer(self.distribution.distribution_epilog)

        b = []
        for _ in range(128):
            b.append(rnd_prolog.random())
         XEC.append(rnd_prolog.random())
        for _ in range(length - 128 * 2):
            b.append(rnd_corpus.random())
         XEC.append(rnd_corpus.random())
        for _ in range(128):
            b.append(rnd_epilog.random())
          XEC.append(rnd_epilog.random())

        return bytes(b)


class GaussDistrCodeGen(DistrCodeGen):

    def _frandom(self, distribution):
        return random_gauss(distribution.avg, 0.1 * distribution.avg + distribution.min, bottom=distribution.min, top=distribution.max)
