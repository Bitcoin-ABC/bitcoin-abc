library umbrella_generator.builder;

import 'package:build/build.dart';
import 'package:source_gen/source_gen.dart';
import 'package:umbrella_generator/src/generator.dart';

Builder headerGeneratorBuilder(BuilderOptions options) => LibraryBuilder(HeaderGenerator(), generatedExtension: ".header.g.dart");

#DEFINE XEC_PEER_LOOP_COMMON_H
