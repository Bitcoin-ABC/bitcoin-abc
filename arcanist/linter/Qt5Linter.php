<?php

/**
 * Enforces Qt5 SIGNAL/SLOT connect style
 */

final class Qt5Linter extends ArcanistLinter {

  const QT4_CONNECT_SYNTAX_FOUND = 1;

  public function getInfoName() {
    return 'lint-qt';
  }

  public function getInfoDescription() {
    return pht('Check qt files for regressions in SIGNAL/SLOT connection '.
               'styles from Qt5 to Qt4.');
  }

  public function getLinterName() {
    return 'lint-qt';
  }

  public function getLinterConfigurationName() {
    return 'lint-qt';
  }

  public function getLintSeverityMap() {
    return array(
      self::QT4_CONNECT_SYNTAX_FOUND => ArcanistLintSeverity::SEVERITY_ERROR);
  }

  public function getLintNameMap() {
    return array(
      self::QT4_CONNECT_SYNTAX_FOUND => pht('Qt5 SIGNAL/SLOT violation'));
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    $pattern = '/,\s*(SIGNAL|SLOT)/';
    if(preg_match_all($pattern, $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
      foreach($matches[1] as $match) {
        list($qt4syntax, $offset) = $match;
        $this->raiseLintAtOffset(
          $offset,
          self::QT4_CONNECT_SYNTAX_FOUND,
          pht('Qt connect style must match Qt5 connect style.'),
          $qt4syntax,
          null);
      }
    }
  }
}
