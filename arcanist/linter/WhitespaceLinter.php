<?php

/**
 * Remove trailing whitespaces.
 */
final class WhitespaceLinter extends ArcanistLinter {

  const TRAILING_SPACE_FOUND = 1;

  public function getInfoName() {
    return 'lint-whitespace';
  }

  public function getInfoDescription() {
    return pht('Remove trailing whitespaces.');
  }

  public function getLinterName() {
    return 'WHITESPACE';
  }

  public function getLinterConfigurationName() {
    return 'lint-whitespace';
  }

  public function getLintSeverityMap() {
    return array(
      self::TRAILING_SPACE_FOUND => ArcanistLintSeverity::SEVERITY_AUTOFIX,
    );
  }

  public function getLintNameMap() {
    return array(
        self::TRAILING_SPACE_FOUND => pht('Found trailing whitespace(s).'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    if (preg_match_all('/.*[\t ]+$/m', $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($fullLine, $offset) = $match;

        $this->raiseLintAtOffset(
          $offset,
          self::TRAILING_SPACE_FOUND,
          pht('Found trailing whitespace(s).'),
          $fullLine,
          rtrim($fullLine));
      }
    }
  }
}
