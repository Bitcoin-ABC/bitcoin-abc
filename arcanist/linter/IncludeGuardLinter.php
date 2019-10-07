<?php

/**
 * Check the include guard matches the rules from the developer notes.
 */
final class IncludeGuardLinter extends ArcanistLinter {

  const GUARD_PREFIX = 'BITCOIN_';
  const GUARD_SUFFIX = '_H';

  const INCLUDE_GUARD_INVALID = 1;

  public function getInfoName() {
    return 'lint-include-guard';
  }

  public function getInfoDescription() {
    return pht('Check the include guard matches the rules from the developer '.
               'notes. ');
  }

  public function getLinterName() {
    return 'INCLUDE_GUARD';
  }

  public function getLinterConfigurationName() {
    return 'lint-include-guard';
  }

  public function getLintSeverityMap() {
    return array(
      self::INCLUDE_GUARD_INVALID => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::INCLUDE_GUARD_INVALID => pht('Include guard malformed or missing.'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($abspath);

    $pathInfo = pathinfo($path);

    // Get the path components. They are relative to project root.
    $guard = explode('/', $pathInfo['dirname']);
    // Add the file name (without extension) to the path components.
    $guard[] = $pathInfo['filename'];
    // Skip the upper 'src' directory
    $guard = array_slice($guard, 1);
    // Join to a string using an underscore ('_') as the delimiter.
    $guard = implode('_', $guard);
    // Transform the whole string to uppercase.
    $guard = strtoupper($guard);
    // Surround with prefix and suffix.
    $guard = self::GUARD_PREFIX.$guard.self::GUARD_SUFFIX;

    if (preg_match_all('@#(?:ifndef|define|endif //) '.$guard.'@',
      $fileContent) != 3) {
      return $this->raiseLintAtPath(
        self::INCLUDE_GUARD_INVALID,
        pht("Include guard is malformed or missing. Expected format:\n".
          "\t#ifndef %s\n".
          "\t#define %s\n".
          "\t...\n".
          "\t#endif // %s", $guard, $guard, $guard));
    }
  }
}
