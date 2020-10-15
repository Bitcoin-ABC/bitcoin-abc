<?php

/**
 * Make sure we don't use mutable default arguments
 * https://docs.python-guide.org/writing/gotchas/#mutable-default-arguments
 */
final class PythonMutableDefaultLinter extends ArcanistLinter {

  const MUTABLE_DEFAULT_FOUND = 1;

  public function getInfoName() {
    return 'lint-python-mutable-default';
  }

  public function getInfoDescription() {
    return pht('Make sure we don\'t use mutable default arguments '.
               'in python.');
  }

  public function getLinterName() {
    return 'PYTHON_MUTABLE_DEFAULT';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-mutable-default';
  }

  public function getLintSeverityMap() {
    return array(
      self::MUTABLE_DEFAULT_FOUND => ArcanistLintSeverity::SEVERITY_WARNING,
    );
  }

  public function getLintNameMap() {
    return array(
      self::MUTABLE_DEFAULT_FOUND => pht('Mutable default arguments should '.
        'generally not be used in python.'),
    );
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    // Match all function definitions containing list, dict or set literals
    // used as default arguments.
    $pattern = "/[ ]*def \w+\([\w, \n=\(\)\"']+=\s*(\[|\{)[^:]+:/";
    if (preg_match_all($pattern, $fileContent, $matches,
                       PREG_OFFSET_CAPTURE)) {
      foreach ($matches[1] as $match) {
        list($fullLine, $offset) = $match;

        $this->raiseLintAtOffset(
          $offset,
          self::MUTABLE_DEFAULT_FOUND,
          pht('Found mutable default argument in function.'),
          $fullLine,
          null);
      }
    }
  }
}
