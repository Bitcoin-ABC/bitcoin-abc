<?php

/**
 * Enforce using C++ native headers instead of C compatibility headers.
 */
final class CHeaderLinter extends ArcanistLinter {

  const CHEADER_FOUND = 1;

  static private $cheaders = array(
    'assert',
    'ctype',
    'errno',
    'fenv',
    'float',
    'inttypes',
    'limits',
    'locale',
    'math',
    'setjmp',
    'signal',
    'stdarg',
    'stddef',
    'stdint',
    'stdio',
    'stdlib',
    'string',
    'time',
    'uchar',
    'wchar',
    'wctype',
  );

  public function getInfoName() {
    return 'lint-cheader';
  }

  public function getInfoDescription() {
    return pht('Check that C compatility headers are not used in C++ files.');
  }

  public function getLinterName() {
    return 'CHEADER';
  }

  public function getLinterConfigurationName() {
    return 'lint-cheader';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getLintSeverityMap() {
    return array(
      self::CHEADER_FOUND => ArcanistLintSeverity::SEVERITY_AUTOFIX,
    );
  }

  public function getLintNameMap() {
    return array(
      self::CHEADER_FOUND => pht('C compatibility header found in a C++ file'),
    );
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    $anyHeaderPattern = implode('|', self::$cheaders);

    if (!preg_match_all("/#include <($anyHeaderPattern).h>/", $fileContent,
      $matches, PREG_OFFSET_CAPTURE)) {
      return;
    }

    foreach ($matches[1] as $match) {
      list($header, $offset) = $match;
      $original = $header.'.h';
      $replacement = 'c'.$header;

      $this->raiseLintAtOffset(
        $offset,
        self::CHEADER_FOUND,
        pht(
          'Use C++ header <%s> instead of C compatibility header <%s>',
          $replacement, $original),
        $original,
        $replacement);
    }
  }
}
