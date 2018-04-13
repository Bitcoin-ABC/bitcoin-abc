<?php

/**
 * Enforce python scripts shebang to #/usr/bin/env python3.
 */
final class PythonShebangLinter extends ArcanistLinter {

  const BAD_SHEBANG_FOUND = 1;

  public function getInfoName() {
    return 'lint-python-shebang';
  }

  public function getInfoDescription() {
    return pht('Enforce the declaration of python 3 environment in shebangs.');
  }

  public function getLinterName() {
    return 'PYTHON_SHEBANG';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-shebang';
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

    if (!preg_match_all("%^#!/usr/bin/env python3%", $fileContent)) {
      return $this->raiseLintAtPath(
        self::BAD_SHEBANG_FOUND,
        pht("Shebang should be #!/usr/bin/env python3"));
    }
  }
}
