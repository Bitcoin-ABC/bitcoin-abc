<?php

/**
 * Check that source code file names are compliant with naming conventions.
 */
final class FileNameLinter extends ArcanistLinter {

  const INVALID_FILENAME_FOUND = 1;

  public function getInfoName() {
    return 'lint-source-filename';
  }

  public function getInfoDescription() {
    return pht('Check that source code file names are compliant with naming '.
               'conventions.');
  }

  public function getLinterName() {
    return 'FILENAME';
  }

  public function getLinterConfigurationName() {
    return 'lint-source-filename';
  }

  public function getLintSeverityMap() {
    return array(
      self::INVALID_FILENAME_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::INVALID_FILENAME_FOUND => pht('The file name violates the naming '.
                                          'conventions'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    if(preg_match('/[^a-z0-9_-]/', pathinfo($path, PATHINFO_FILENAME))) {
      $this->raiseLintAtPath(
        self::INVALID_FILENAME_FOUND,
        pht('Source code file names should only contain [a-z0-9_-] chars (see '.
            'doc/developer-notes.md).'));
    }
  }
}
