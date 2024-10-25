<?php

/**
 * Uses the clang format to format C/C++/Obj-C code
 */
final class ClangFormatLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'clang-format';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Use clang-format for processing specified files.');
  }

  public function getLinterName() {
    return 'clang-format';
  }

  public function getLinterConfigurationName() {
    return 'clang-format';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return 'clang-format';
  }

  public function getVersion() {
    list($stdout) = execx('%C -version', $this->getExecutableCommand());

    $matches = array();
    $regex = '/clang-format version (?P<version>\d+\.\d+)\./';
    if (preg_match($regex, $stdout, $matches)) {
      $version = $matches['version'];
    } else {
      throw new Exception(pht('Unable to read clang-format version. Please '.
                              'make sure clang-format version 16.x is '.
                              'installed and in the PATH.'));
    }

    /*
     * FIXME: This is a hack to only allow for clang-format version 16.x.
     * The .arclint `version` field only allow to filter versions using `=`,
     * `>`, `<`, `>=` or `<=`. There is no facility to define that the required
     * version should be >= 16.0 and < 17.0.
     */
    if (substr($version, 0, 2) != '16') {
      throw new Exception(pht('Linter %s requires clang-format version 16.x. '.
                              'You have version %s.',
                              ClangFormatLinter::class,
                              $version));
    }

    return $version;
  }

  public function getInstallInstructions() {
    return pht('Make sure clang-format is in directory specified by $PATH');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array();
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $ok = ($err == 0);

    if (!$ok) {
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
      ->setCode('CFMT')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Code style violation')
      ->setDescription("'$path' has code style errors.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
