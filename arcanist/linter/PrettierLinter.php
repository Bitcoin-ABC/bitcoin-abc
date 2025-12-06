<?php

/**
 * Run the prettier linter: https://prettier.io.
 */
final class PrettierLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'prettier';
  }

  public function getInfoURI() {
    return 'https://prettier.io';
  }

  public function getInfoDescription() {
    return pht('Use prettier for processing specified files.');
  }

  public function getInstallInstructions() {
    return pht(
      'Install `prettier` using `pnpm install --frozen-lockfile` '
      . 'from the root of the repository'
    );
  }

  public function getLinterName() {
    return 'prettier';
  }

  public function getLinterConfigurationName() {
    return 'prettier';
  }

  public function getDefaultBinary() {
    $root = $this->getProjectRoot();
    return Filesystem::resolvePath(
        'node_modules/prettier/bin-prettier.js',
        $root
    );
  }

  public function getVersion() {
    list($stdout) = execx('%C --version', $this->getExecutableCommand());

    $matches = array();
    $regex = '/^(?P<version>\d+\.\d+\.\d+)$/';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);

    if ($err != 0) {
      $message = id(new ArcanistLintMessage())
        ->setPath($path)
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('PRETTIER')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Linter error')
        ->setDescription($stderr);

      return array($message);
    }

    $orig = file_get_contents($path);
    if ($orig == $stdout) {
      return array();
    }

    $message = id(new ArcanistLintMessage())
      ->setPath($path)
      ->setLine(1)
      ->setChar(1)
      ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
      ->setCode('PRETTIER')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Code style violation')
      ->setDescription("'$path' has code style errors.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
