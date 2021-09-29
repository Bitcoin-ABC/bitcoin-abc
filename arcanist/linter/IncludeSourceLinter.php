<?php

/**
 * Warn when a *.c, *.cc or *.cpp is included instead of a *.h or *.hpp
 */
final class IncludeSourceLinter extends ArcanistLinter {

  const EXCEPTIONS = array(
    'src/crypto/aes.cpp' => 'crypto/ctaes/ctaes.c',
  );

  const INCLUDE_SOURCE_FOUND = 1;

  public function getInfoName() {
    return 'lint-include-source';
  }

  public function getInfoDescription() {
    return pht('Check that no source files gets included.');
  }

  public function getLinterName() {
    return 'INCLUDE_SOURCE';
  }

  public function getLinterConfigurationName() {
    return 'lint-include-source';
  }

  public function getLintSeverityMap() {
    return array(
      self::INCLUDE_SOURCE_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::INCLUDE_SOURCE_FOUND => pht('Inclusion of a c/cpp file.'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (!preg_match_all("/\s*#include <(.*\.c(?:c|pp)?)>/", $fileContent,
      $matches, PREG_OFFSET_CAPTURE)) {
      return;
    }

    foreach ($matches[1] as $match) {
      list($cpp, $offset) = $match;

      if (array_key_exists($path, self::EXCEPTIONS) &&
        self::EXCEPTIONS[$path] === $cpp) {
        continue;
      }

      $this->raiseLintAtOffset(
        $offset,
        self::INCLUDE_SOURCE_FOUND,
        pht('No source file should be included.'),
        $cpp,
        null);
    }
  }
}
