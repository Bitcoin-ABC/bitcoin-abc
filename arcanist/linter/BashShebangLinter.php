<?php

/**
 * Enforce bash scripts shebang to #/usr/bin/env bash.
 */
final class BashShebangLinter extends ArcanistLinter {

  const BAD_SHEBANG_FOUND = 1;

  public function getInfoName() {
    return 'lint-bash-shebang';
  }

  public function getInfoDescription() {
    return pht('Enforce the declaration of bash environment in shebangs.');
  }

  public function getLinterName() {
    return 'BASH_SHEBANG';
  }

  public function getLinterConfigurationName() {
    return 'lint-bash-shebang';
  }

  public function getLintSeverityMap() {
    return array(
      self::BAD_SHEBANG_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::BAD_SHEBANG_FOUND => pht('Missing or unexpected shebang.'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (!preg_match_all("%^#!(/usr/bin/env bash|/bin/sh)%", $fileContent)) {
      return $this->raiseLintAtPath(
        self::BAD_SHEBANG_FOUND,
        pht("Shebang should be `#!/usr/bin/env bash` or `#!/bin/sh`"));
    }
  }
}
