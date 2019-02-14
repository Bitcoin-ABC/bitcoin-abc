<?php

/**
 * Uses the lint-python-format.py script to update from old % format style to 
 * new .format().
 */
final class PythonFormatLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'lint-python-format';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Convert python string formatting from % to .format().');
  }

  public function getLinterName() {
    return 'lint-python-format';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-format';
  }

  public function getLinterConfigurationOptions() {
    $options = array();

    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath(
      'test/lint/lint-python-format.py',
      $this->getProjectRoot());
  }
  
  public function shouldUseInterpreter() {
    return true;
  }
  
  public function getDefaultInterpreter() {
    return "python3";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/lint-python-format.py script is part of the bitcoin-abc project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $pattern = '/\((\d+)\) ([\s\S]+?)=> (.+)/';
    $found = preg_match_all($pattern, $stdout, $snippets,
      $flags = PREG_SET_ORDER);
    
    /* 
     * Matched snippets $snippets are organized like this:
     * [0] The complete mask
     * [1] The line number
     * [2] The original snippet
     * [3] The replacement snippet
     */

    if (!$found) {
      return array();
    }

    $messages = [];
    foreach($snippets as $snippet) {
      $messages[] = id(new ArcanistLintMessage())
        ->setPath($path)
        ->setLine($snippet[1])
        ->setChar(1)
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('PYFMT')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
        ->setName('Old string format notation')
        ->setDescription("'$path' uses old style string formatting.")
        ->setOriginalText(rtrim($snippet[2]))
        ->setReplacementText($snippet[3]);
    }
    
    return $messages;
  }
}