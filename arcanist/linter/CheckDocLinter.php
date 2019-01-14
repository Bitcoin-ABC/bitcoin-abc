<?php

/**
 * Uses the check-doc.py script to enfore command line arguments documentation
 */
final class CheckDocLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'check-doc';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Check that all the command line arguments are documented.');
  }

  public function getLinterName() {
    return 'check-doc';
  }

  public function getLinterConfigurationName() {
    return 'check-doc';
  }

  public function getLinterConfigurationOptions() {
    $options = array(
    );

    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath(
      'test/lint/check-doc.py',
      $this->getProjectRoot());
  }
  
  public function shouldUseInterpreter() {
    return true;
  }
  
  public function getDefaultInterpreter() {
    return "python3";
  }
  
  public function getInstallInstructions() {
    return pht('The test/lint/check-doc.py script is part of the bitcoin-abc project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array(
    );
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    /* Split stdout:
     * 0 => Empty (before first 'Args' occurence)
     * 1 => Args used: count
     * 2 => Args documented: count
     * 3 => Args undocumented: count and list
     * 4 => Args unknown: count and list
     */
    $stdoutExploded = preg_split('/Args/', $stdout);
    
    $undocumented = $stdoutExploded[3];
    $unknown = $stdoutExploded[4];

    $messages = array();
    
    // Undocumented arguments
    $match = preg_match_all('/-[\w|-]+/', $undocumented, $args);
    foreach($args[0] as $arg) {
      $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
        ->setCode('ARGDOC')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Undocumented argument')
        ->setDescription("'$arg' is undocumented.");
    }
    
    // Unknown arguments
    $match = preg_match_all('/-[\w|-]+/', $unknown, $args);
    foreach($args[0] as $arg) {
        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
        ->setCode('ARGDOC')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Unknown argument')
        ->setDescription("'$arg' is documented but not used.");
    }

    return $messages;
  }
}

?>
