<?php

/**
 * Uses the mypy tool to lint the typehints in python files.
 */
final class MyPyLinter extends ArcanistExternalLinter {
  const SEVERITYMAP = array(
    // Disable the 'note' severity to avoid the [annotation-unchecked] spam
    'note' => ArcanistLintSeverity::SEVERITY_DISABLED,
    'warning' => ArcanistLintSeverity::SEVERITY_WARNING,
    'error' => ArcanistLintSeverity::SEVERITY_ERROR,
  );

  public function getInfoName() {
    return 'mypy';
  }

  public function getInfoDescription() {
    return pht('Use mypy for linting typehints in python files.');
  }

  public function getLinterName() {
    return 'MYPY';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-mypy';
  }

  public function getDefaultBinary() {
    return 'mypy';
  }

  public function getMandatoryFlags() {
    return array(
      '--show-error-codes',
    );
  }

  public function getInstallInstructions() {
    return pht('Please install mypy and make sure it is in your $PATH');
  }

  public function shouldExpectCommandErrors() {
    return true;
  }

  public function getVersion() {
    list($stdout) = execx('%C --version', $this->getExecutableCommand());

    $regex = '/^mypy (?P<version>\d+\.\d+)/m';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $messages = array();

    $pattern = '/(.+):(\d+): ([^:]+): (.+)/';
    if (preg_match_all($pattern, $stdout, $errors, PREG_SET_ORDER)) {
      foreach ($errors as $error) {
        list(, $file, $line, $severity, $message) = $error;

        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setPath($path)
        ->setLine($line)
        // It's OK to crash if the severity is not part of the array, so we can
        // detect the issue and fix it.
        ->setSeverity(self::SEVERITYMAP[$severity])
        ->setName('mypy found an issue:')
        ->setDescription($message);
      }
    }

    return $messages;
  }
}
