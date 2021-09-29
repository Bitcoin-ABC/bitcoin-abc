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

  private function endsWithExactly2Spaces($line) {
    return (rtrim($line) == substr($line, 0, strlen($line) - 2) &&
      substr($line, -2) == "  ");
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    $is_markdown = pathinfo($path, PATHINFO_EXTENSION) == "md";

    if (preg_match_all('/.*([\t ])+$/m', $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($fullLine, $offset) = $match;

        /* Exactly two trailing whitespaces is a hard line break in markdown */
        if ($is_markdown && $this->endsWithExactly2Spaces($fullLine)) {
          continue;
        }

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
