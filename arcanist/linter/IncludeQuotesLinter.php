<?php

/**
 * Enforce using angle brackets for inclusion rather than double quotes.
 */
final class IncludeQuotesLinter extends ArcanistLinter {

  const INCLUDE_QUOTES_FOUND = 1;

  public function getInfoName() {
    return 'lint-include-quotes';
  }

  public function getInfoDescription() {
    return pht('Enforce using angle brackets for inclusion rather than double '.
               'quotes.');
  }

  public function getLinterName() {
    return 'INCLUDE_QUOTES';
  }

  public function getLinterConfigurationName() {
    return 'lint-include-quotes';
  }

  public function getLintSeverityMap() {
    return array(
        self::INCLUDE_QUOTES_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
        self::INCLUDE_QUOTES_FOUND => pht('Use of double quotes in #include '.
                                          'directive.'),
    );
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    if (!preg_match_all("/#include (\".*\")/", $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      return;
    }

    foreach ($matches[1] as $match) {
      list($header, $offset) = $match;

      $this->raiseLintAtOffset(
        $offset,
        self::INCLUDE_QUOTES_FOUND,
        pht('Use angle brackets #include <> syntax.'),
        $header,
        null);
    }
  }
}
