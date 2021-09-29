<?php

/**
 * Uses the lint-format-strings.py script to check the number of arguments in
 * variadic string formatting functions.
 */
final class FormatStringLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'lint-format-strings';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Check the number of arguments in variadic string formatting '.
      'functions');
  }

  public function getLinterName() {
    return 'lint-format-strings';
  }

  public function getLinterConfigurationName() {
    return 'lint-format-strings';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath('test/lint/lint-format-strings.py',
      $this->getProjectRoot());
  }

  public function shouldUseInterpreter() {
    return true;
  }

  public function getDefaultInterpreter() {
    return "python3";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/lint-format-strings.py script is part of the '.
      'bitcoin-abc project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function getPathArgumentForLinterFuture($path) {
    // The path is expected to be relative to the project root
    return csprintf('%s',
      Filesystem::readablePath($path, $this->getProjectRoot()));
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $pattern = '/^(?P<file>.+): (?P<message>.+): (?P<code>.+)$/m';

    $messages = array();

    if (preg_match_all($pattern, $stdout, $matches, PREG_SET_ORDER)) {
      foreach($matches as $match) {
        $messages[] = id(new ArcanistLintMessage())
          ->setPath($path)
          ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
          ->setCode('STRFMT')
          ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
          ->setName('String formatting function arguments mismatch')
          ->setDescription($match["code"]."\n".$match["message"]);
      }
    }

    return $messages;
  }
}
