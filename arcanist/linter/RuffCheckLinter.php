<?php

/**
 * Uses the ruff tool to check python code and autofix some issues
 */
final class RuffCheckLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'ruff-check';
  }

  public function getInfoURI() {
    return 'https://docs.astral.sh/ruff/';
  }

  public function getInfoDescription() {
    return pht('Fast Python linter and code formatter');
  }

  public function getLinterName() {
    return 'ruff-check';
  }

  public function getLinterConfigurationName() {
    return 'ruff-check';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  /**
   * To make ruff write the output to stdout, pass the input via stdin.
   *
   * This method could be removed if we did only checking, but with the
   * --fix option we also want to apply some fixes automatically, and
   * arcanist needs to get the modified file content back.
   *
   * This has drawbacks, for instance failing checks will be printed without
   * filenames. Maybe we should split this linter into a checker and a
   * formatter in the future.
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
    return 'ruff';
  }

  public function getVersion() {
    list($stdout, $stderr) = execx('%C --version',
      $this->getExecutableCommand());
    $matches = array();

    /* Support a.b or a.b.c version numbering scheme */
    $regex = '/^ruff (?P<version>\d+\.\d+(?:\.\d+)?)/';

    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  public function getInstallInstructions() {
    return pht('pip install ruff');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array(
      'check',
      '--fix',
      '--ignore',
      'A003,E203,E303,E305,E501,C901',
      '--select',
      'E,F,A,C'
    );
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
      ->setCode('RUFF-CHECK')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Code style violation')
      ->setDescription("'$path' has code style errors.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
