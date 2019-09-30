<?php

/**
 * Enforce using `export LC_ALL=C` or `export LC_ALL=C.UTF-8` in shell scripts.
 */
final class ShellLocaleLinter extends ArcanistLinter {

  const INVALID_LOCALE = 1;
  const LOCALE_STATEMENTS = array('export LC_ALL=C', 'export LC_ALL=C.UTF-8');

  public function getInfoName() {
    return 'lint-shell-locale';
  }

  public function getInfoDescription() {
    return pht('Enforce using `'.join('` or `', self::LOCALE_STATEMENTS).
               '` in shell scripts.');
  }

  public function getLinterName() {
    return 'SHELL_LOCALE';
  }

  public function getLinterConfigurationName() {
    return 'lint-shell-locale';
  }

  public function getLintSeverityMap() {
    return array(
        self::INVALID_LOCALE => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
        self::INVALID_LOCALE => pht(
          '`'.join('` or `', self::LOCALE_STATEMENTS).'` should be '.
          'the first statement.'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (!preg_match_all('/^[^#\s]+.+/m', $fileContent, $matches)) {
      throw new Exception(pht('Error while parsing %s: the script seems to '.
                              'have only comments and/or empty lines.', $path));
    }

    if (array_search(trim($matches[0][0]),
        self::LOCALE_STATEMENTS, true) === false) {
      return $this->raiseLintAtPath(
        self::INVALID_LOCALE,
        pht('Shell scripts should set the locale to avoid side effects.')
      );
    }
  }
}
