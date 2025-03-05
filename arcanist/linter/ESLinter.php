<?php

/**
 * Run the eslint linter: https://eslint.org/.
 */
final class ESLinter extends ArcanistExternalLinter {
  const SEVERITYMAP = array(
    'Note' => ArcanistLintSeverity::SEVERITY_ADVICE,
    'Warning' => ArcanistLintSeverity::SEVERITY_WARNING,
    'Error' => ArcanistLintSeverity::SEVERITY_ERROR,
  );

  public function getInfoName() {
    return 'eslint';
  }

  public function getInfoURI() {
    return 'https://eslint.org/';
  }

  public function getInfoDescription() {
    return pht('Use eslint for processing specified files.');
  }

  public function getInstallInstructions() {
    return pht(
      'Install `eslint` using `npm ci` from the root of the repository');
  }

  public function getLinterName() {
    return 'eslint';
  }

  public function getLinterConfigurationName() {
    return 'eslint';
  }

  public function getDefaultBinary() {
    $root = $this->getProjectRoot();
    return Filesystem::resolvePath('node_modules/eslint/bin/eslint.js', $root);
  }

  public function getMandatoryFlags() {
    return array(
      '--format',
      'unix',
    );
  }

  public function shouldExpectCommandErrors() {
    return true;
  }

  public function getVersion() {
    list($stdout) = execx('%C --version', $this->getExecutableCommand());

    $matches = array();
    $regex = '/^v(?P<version>\d+\.\d+\.\d+)$/';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);

    $messages = array();

    // eslint return a non-zero error code if lint issues are found
    if ($err && preg_match_all(
      '#(.+):(\d+):(\d+):\s+(.+)\s+\[([^/]+)/(.+)\]#',
      $stdout, $issues, PREG_SET_ORDER)) {

      foreach ($issues as $issue) {
        list(
          /*mask*/,
          /*file*/,
          $line,
          $char,
          $message,
          $severity,
          $code,
        ) = $issue;

        $messages[] = id(new ArcanistLintMessage())
          ->setPath($path)
          ->setLine($line)
          ->setChar($char)
          ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
          ->setCode('ESLINT')
          ->setSeverity(self::SEVERITYMAP[$severity])
          ->setName($code)
          ->setDescription($message);
      }
    }

    return $messages;
  }
}
