<?php

/**
 * Enforce python scripts shebang to #/usr/bin/env python3.
 */
final class PythonShebangLinter extends ArcanistLinter {

  const BAD_SHEBANG_FOUND = 1;
  const INCONSISTENT_PERMISSIONS = 2;
  const SHEBANG_NON_EXECUTABLE_FILE = 2;


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
      self::INCONSISTENT_PERMISSIONS => ArcanistLintSeverity::SEVERITY_ERROR,
      self::SHEBANG_NON_EXECUTABLE_FILE => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::BAD_SHEBANG_FOUND => pht('Missing or unexpected shebang.'),
      self::INCONSISTENT_PERMISSIONS => pht('Inconsistent permissions.'),
      self::SHEBANG_NON_EXECUTABLE_FILE => pht('Shebang on non executable'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    $perms = fileperms($absPath);
    $isOwnerExecutable = boolval($perms & 0x0040);
    $isGroupExecutable = boolval($perms & 0x0008);
    $isWorldExecutable = boolval($perms & 0x0001);

    if ($isOwnerExecutable != $isGroupExecutable ||
     $isOwnerExecutable != $isWorldExecutable) {
      return $this->raiseLintAtPath(
        self::INCONSISTENT_PERMISSIONS,
        pht('The executable flags in the file permissions must be the same '.
            'for owner, group and world.'));
    }

    if ($isOwnerExecutable &&
        !preg_match_all("%^#!/usr/bin/env python3%", $fileContent)) {
      return $this->raiseLintAtPath(
        self::BAD_SHEBANG_FOUND,
        pht("Shebang should be #!/usr/bin/env python3"));
    }

    if (!$isOwnerExecutable &&
        preg_match_all("%^#!/usr/bin/env python3%", $fileContent)) {
      return $this->raiseLintAtPath(
        self::SHEBANG_NON_EXECUTABLE_FILE,
        pht("Non executable file should not have a shebang"));
    }
  }
}
