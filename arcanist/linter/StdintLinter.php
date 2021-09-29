<?php

/**
 * Replace native type by there stdint equivalent when needed.
 */
final class StdintLinter extends ArcanistLinter {

  const UNSIGNED_CHAR_FOUND = 1;
  const UNSIGNED_SHORT_FOUND = 2;

  /* Mapping the original type to a tuple (error code, stdint replacement) */
  const TYPE_MAPPING = array(
    'unsigned char' => array(self::UNSIGNED_CHAR_FOUND, 'uint8_t'),
    'unsigned short' => array(self::UNSIGNED_SHORT_FOUND, 'uint16_t'),
  );

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
      self::UNSIGNED_SHORT_FOUND => ArcanistLintSeverity::SEVERITY_WARNING,
    );
  }

  public function getLintNameMap() {
    return array(
      self::UNSIGNED_CHAR_FOUND => pht('`uint8_t should be preferred over '.
                                       '`unsigned char``.'),
      self::UNSIGNED_SHORT_FOUND => pht('`uint16_t should be preferred over '.
                                       '`unsigned short``.'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    if (preg_match_all('/unsigned (?:char|short)/', $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($unsignedType, $offset) = $match;
        list($errorCode, $replacement) = self::TYPE_MAPPING[$unsignedType];

        $this->raiseLintAtOffset(
          $offset,
          $errorCode,
          pht(
            '`'.$replacement.'` should be preferred over `'.$unsignedType.'`'),
          $unsignedType,
          $replacement
        );
      }
    }
  }
}
