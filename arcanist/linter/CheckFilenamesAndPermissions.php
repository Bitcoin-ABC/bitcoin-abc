<?php

/**
 * Uses the check-files.py script to enforce file permissions, file names
 * and shebangs.
 */
final class CheckFilesLinter extends AbstractGlobalExternalLinter {

  public function getInfoName() {
    return 'check-files';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Check file names, file permissions and shebangs.');
  }

  public function getLinterName() {
    return 'check-files';
  }

  public function getLinterConfigurationName() {
    return 'check-files';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath('test/lint/lint-files.py',
      $this->getProjectRoot());
  }

  public function shouldUseInterpreter() {
    return true;
  }

  public function getDefaultInterpreter() {
    return "python3";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/lint-files.py script is part of the bitcoin-abc '.
      'project');
  }

  public function shouldExpectCommandErrors() {
    return true;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function parseGlobalLinterOutput($err, $stdout, $stderr) {
    $stdoutExploded = explode("\n", $stdout);

    $messages = array();
    foreach ($stdoutExploded as $errorLine) {
      if (trim($errorLine) != "") {
        $messages[] = id(new ArcanistLintMessage())
          ->setPath("")
          ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
          ->setCode('FILES')
          ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
          ->setName('Filename, shebang or executable permission error')
          ->setDescription("$errorLine");
      }
    }

    return $messages;
  }
}
