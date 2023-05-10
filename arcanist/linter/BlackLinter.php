<?php

/**
 * Uses the black tool to format python code
 */
final class BlackFormatLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'black';
  }

  public function getInfoURI() {
    return 'https://black.readthedocs.io/en/stable/';
  }

  public function getInfoDescription() {
    return pht('The uncompromising python formatter');
  }

  public function getLinterName() {
    return 'black';
  }

  public function getLinterConfigurationName() {
    return 'black';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  /**
   * To make black write the output to stdout, pass the input via stdin.
   */
  protected function buildFutures(array $paths) {
    $executable = $this->getExecutableCommand();

    $bin = csprintf('%C %Ls -', $executable, $this->getCommandFlags());

    $futures = array();
    foreach ($paths as $path) {
      $disk_path = $this->getEngine()->getFilePathOnDisk($path);
      $future = new ExecFuture('%C', $bin);
      /* Write the input file to stdin */
      $input = file_get_contents($disk_path);
      $future->write($input);
      $future->setCWD($this->getProjectRoot());
      $futures[$path] = $future;
    }

    return $futures;
  }

  public function getDefaultBinary() {
    return 'black';
  }

  public function getVersion() {
    list($stdout, $stderr) = execx('%C --version',
      $this->getExecutableCommand());
    $matches = array();

    /* Support a.b or a.b.c version numbering scheme */
    $regex = '/^black, (?P<version>\d+\.\d+(?:\.\d+)?)/';

    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  public function getInstallInstructions() {
    return pht('pip install black');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    if ($err != 0) {
      return false;
    }

    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);
    $orig = file_get_contents($path);
    if ($orig == $stdout) {
      return array();
    }

    $message = id(new ArcanistLintMessage())
      ->setPath($path)
      ->setLine(1)
      ->setChar(1)
      ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
      ->setCode('BLACK')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Code style violation')
      ->setDescription("'$path' has code style errors.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
