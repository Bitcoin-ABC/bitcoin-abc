<?php

/**
 * Replace native type by there stdint equivalent when needed.
 */
final class StdintLinter extends ArcanistLinter {

  const UNSIGNED_CHAR_FOUND = 1;

  public function getInfoName() {
    return 'lint-stdint';
  }

  public function getInfoDescription() {
    return pht('Replace native type by there stdint equivalent when needed.');
  }

  public function getLinterName() {
    return 'STDINT';
  }

  public function getLinterConfigurationName() {
    return 'lint-stdint';
  }

  public function getLintSeverityMap() {
    return array(
      self::UNSIGNED_CHAR_FOUND => ArcanistLintSeverity::SEVERITY_WARNING,
    );
  }

  public function getLintNameMap() {
    return array(
      self::UNSIGNED_CHAR_FOUND => pht('`uint8_t should be preferred over '.
                                       '`unsigned char``.'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    if (preg_match_all('/unsigned char/', $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($unsignedChar, $offset) = $match;

        $this->raiseLintAtOffset(
          $offset,
          self::UNSIGNED_CHAR_FOUND,
          pht('`uint8_t should be preferred over `unsigned char`'),
          $unsignedChar,
          'uint8_t');
      }
    }
  }
}
