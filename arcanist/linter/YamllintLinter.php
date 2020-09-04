<?php

/**
 * Uses the yamllint tool to lint the YAML files.
 */
final class YamllintLinter extends ArcanistExternalLinter {

  const YAMLLINT_SEVERITY_MAP = array(
      'warning' => ArcanistLintSeverity::SEVERITY_WARNING,
      'error' => ArcanistLintSeverity::SEVERITY_ERROR,
  );

  public function getInfoName() {
    return 'yamllint';
  }

  public function getInfoDescription() {
    return pht('Use yamllint for linting YAML files.');
  }

  public function getLinterName() {
    return 'YAMLLINT';
  }

  public function getLinterConfigurationName() {
    return 'yamllint';
  }

  public function getDefaultBinary() {
    return 'yamllint';
  }

  public function getInstallInstructions() {
    return pht('Please install yamllint and make sure it is in your $PATH');
  }

  public function shouldExpectCommandErrors() {
    return true;
  }

  public function getVersion() {
    list($stdout) = execx('%C --version', $this->getExecutableCommand());

    $regex = '/^yamllint (?P<version>\d+\.\d+\.\d+)/m';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  private function getSeverity($severity) {
    if (array_key_exists($severity, self::YAMLLINT_SEVERITY_MAP)) {
      return self::YAMLLINT_SEVERITY_MAP[$severity];
    }

    return ArcanistLintSeverity::SEVERITY_ERROR;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $messages = array();

    $pattern = '/(\d+):(\d+)\s+(\w+)\s+(.+) \((.+)\)/';
    if (preg_match_all($pattern, $stdout, $errors, PREG_SET_ORDER)) {
      foreach ($errors as $error) {
        list(, $line, $char, $severity, $message, $category) = $error;

        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setPath($path)
        ->setLine(intval($line))
        ->setChar(intval($char))
        ->setCode($category)
        ->setSeverity($this->getSeverity($severity))
        ->setName('yamllint found an issue:')
        ->setDescription($message);
      }
    }

    return $messages;
  }
}
