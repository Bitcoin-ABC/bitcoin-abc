<?php

/**
 * Uses the lint-locale-dependence.sh script to output a linting error when
 * functions relying on the system locale are used.
 */
final class LocaleDependenceLinter extends ArcanistExternalLinter {

  const ADVICE_MESSAGE = <<<ADVICE
Unnecessary locale dependence can cause bugs and should be avoided.
Otherwise an exception can be added to the lint-locale-dependence script.
ADVICE;

  public function getInfoName() {
    return 'lint-locale-dependence';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Throw an error when functions relying on the system locale '.
      'are used.');
  }

  public function getLinterName() {
    return 'lint-locale-dependence';
  }

  public function getLinterConfigurationName() {
    return 'lint-locale-dependence';
  }

  public function getLinterConfigurationOptions() {
    $options = array();

    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath('test/lint/lint-locale-dependence.sh',
      $this->getProjectRoot());
  }

  public function shouldUseInterpreter() {
    return true;
  }

  public function getDefaultInterpreter() {
    return "bash";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/lint-locale-dependence.sh script is part of the '.
      'bitcoin-abc project. Requires git >= 2.6.5.');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    /*
     * Stdout contains 2 sections:
     * 1/ The locale dependent function in a sentence:
     *   The locale dependent function <function>(...) appears to be used
     * Followed by the file and the corresponding code lines
     *   <file path>: <code line using the function>
     * 2/ Section with a general warning, will not be used by Arcanist. Instead
     * we define our own advice message.
     *
     * First a list of the locale dependent functions will be determined, then
     * the code lines containing these functions.
     * A linting error message is generated for each line of code.
     */

    /*
     * Extract infos from the path
     */
    $pathinfo = pathinfo($path);
    $fileName = $pathinfo['basename'];

    $messages = [];

    /* Find the functions */
    $pattern = '/The locale dependent function (\w+)\(...\)/';
    if (!preg_match_all(
          $pattern,
          $stdout,
          $matches,
          $flags = PREG_SET_ORDER
      )) {
      return $messages;
    }

    $functions = [];
    foreach ($matches as $match) {
      $functions[] = $match[1];
    }

    /* Find the code lines */
    $pattern = '/'.$fileName.':(\d+): (.+)/';
    if (preg_match_all(
          $pattern,
          $stdout,
          $matches,
          $flags = PREG_SET_ORDER
      )) {
      foreach ($matches as $match) {
        list(, $lineNumber, $codeSnippet) = $match;

        /* Determine which function is used */
        $functionUsed = '';
        foreach ($functions as $function) {
          if (strpos($codeSnippet, $function) !== false) {
            $functionUsed = $function;
            break;
          }
        }

        $messages[] = id(new ArcanistLintMessage())
          ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
          ->setCode('LOCALE_DEPENDENCE')
          ->setPath($path)
          ->setLine($lineNumber)
          ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
          ->setName('Locale dependent function '.$functionUsed)
          ->setDescription(self::ADVICE_MESSAGE);
      }
    }

    return $messages;
  }
}
