<?php

/**
 * Isort your imports, so you don't have to.
 */
final class ISortFormatLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'isort';
  }

  public function getInfoURI() {
    return 'https://pycqa.github.io/isort/';
  }

  public function getInfoDescription() {
    return pht('Sort your python imports');
  }

  public function getLinterName() {
    return 'isort';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-isort';
  }

  public function getDefaultBinary() {
    return 'isort';
  }

  protected function getMandatoryFlags() {
    return array(
      /* Print to stdout instead of modifying in-place */
      '--stdout',
      /**
       * Compatibility with black: one import per line with trailing commas,
       * use parentheses, ensure newline before comments.
       * See https://black.readthedocs.io/en/stable/guides/using_black_with_other_tools.html#isort
       */
      '--profile=black',
      /* Use stricter rule than black, 79 instead of 88. */
      '--line-length=79',
    );
  }

  public function getInstallInstructions() {
    return pht('Install isort with `pip install isort`');
  }

  public function shouldExpectCommandErrors() {
    return false;
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
      ->setCode('ISORT')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Sorting Python imports')
      ->setDescription("'$path' has unsorted imports.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
