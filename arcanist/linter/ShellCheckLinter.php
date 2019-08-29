<?php

/**
 * Uses the ShellCheck tool to run static analysis on shell scripts
 */
final class ShellCheckLinter extends ArcanistExternalLinter {
  const SHELLCHECK_EXCLUDED_RULES = array(
    // phpcs:disable Generic.Files.LineLength.TooLong
    // phpcs:disable Generic.Files.LineLength.MaxExceeded
    'SC1117', // Backslash is literal in "\.". Prefer explicit escaping: "\\.".
    'SC2046', // Quote this to prevent word splitting.
    'SC2086', // Double quote to prevent globbing and word splitting.
    'SC2162', // read without -r will mangle backslashes.
    // phpcs:enable
  );

  const SHELLCHECK_SEVERITY_MAP = array(
      'note' => ArcanistLintSeverity::SEVERITY_ADVICE,
      'warning' => ArcanistLintSeverity::SEVERITY_WARNING,
      'error' => ArcanistLintSeverity::SEVERITY_ERROR,
  );

  public function getInfoName() {
    return 'shellcheck';
  }

  public function getInfoDescription() {
    return pht('Use shellcheck for processing specified files.');
  }

  public function getLinterName() {
    return 'SHELLCHECK';
  }

  public function getLinterConfigurationName() {
    return 'shellcheck';
  }

  public function getDefaultBinary() {
    return 'shellcheck';
  }

  public function getInstallInstructions() {
    return pht('Make sure shellcheck is in directory specified by $PATH');
  }

  public function shouldExpectCommandErrors() {
    return true;
  }

  protected function getMandatoryFlags() {
    return array(
      '--format=gcc',
      '--exclude='.implode(',', self::SHELLCHECK_EXCLUDED_RULES));
  }

  private function getSeverity($severity) {
    if (array_key_exists($severity, self::SHELLCHECK_SEVERITY_MAP)) {
      return self::SHELLCHECK_SEVERITY_MAP[$severity];
    }

    return ArcanistLintSeverity::SEVERITY_ERROR;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $messages = array();

    $pattern = '/(.+):(\d+):(\d+): (.+): (.+) \[(SC\d+)\]/';
    if (preg_match_all($pattern, $stdout, $errors, PREG_SET_ORDER)) {
      foreach ($errors as $error) {
        list(, $file, $line, $char, $severity, $message, $code) = $error;

        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setPath($path)
        ->setLine($line)
        ->setChar($char)
        ->setCode($code)
        ->setSeverity($this->getSeverity($severity))
        ->setName('ShellCheck found an issue:')
        ->setDescription($message);
      }
    }

    return $messages;
  }
}
