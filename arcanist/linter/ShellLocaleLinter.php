<?php

/**
 * Enforce using `export LC_ALL=C` in shell scripts.
 */
final class ShellLocaleLinter extends ArcanistLinter {

  const INVALID_LOCALE = 1;
  const LOCALE_STATEMENT = 'export LC_ALL=C';

  public function getInfoName() {
    return 'lint-shell-locale';
  }

  public function getInfoDescription() {
    return pht('Enforce using `'.self::LOCALE_STATEMENT.'` in shell scripts.');
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
        self::INVALID_LOCALE => pht('`'.self::LOCALE_STATEMENT.'` should be '.
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

    if (!(trim($matches[0][0]) === self::LOCALE_STATEMENT)) {
      return $this->raiseLintAtPath(
        self::INVALID_LOCALE,
        pht('Shell scripts should set the locale to avoid side effects.')
      );
    }
  }
}
