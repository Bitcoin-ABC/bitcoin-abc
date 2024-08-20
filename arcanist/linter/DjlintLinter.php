<?php

/**
 * Run djlint, a formatter for jinja and other templates.
 */
final class DjlintLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'djlint';
  }

  public function getInfoURI() {
    return 'https://github.com/djlint/djlint';
  }

  public function getInfoDescription() {
    return pht('Formats HTML template files.');
  }

  public function getInstallInstructions() {
    return pht('Run `pip install djlint`');
  }

  public function getLinterName() {
    return 'djlint';
  }

  public function getLinterConfigurationName() {
    return 'djlint';
  }

  public function getDefaultBinary() {
    return 'djlint';
  }

  protected function getCommonMandatoryFlags() {
    return array(
      '--profile=jinja',
      '--reformat',
      '--custom-blocks=match,for',
      '--ignore-blocks=call',
      '--format-js',
      '--max-line-length=80',
    );
  }

  protected function getMandatoryFlags() {
    return array_merge($this->getCommonMandatoryFlags(), array('--check'));
  }

  public function getVersion() {
    list($err, $stdout, $stderr) = exec_manual('%C --version',
                                               $this->getExecutableCommand());

    if ($err) {
      throw new Exception(pht('Linter %s: %s', DjlintLinter::class, $stderr));
    }

    $matches = array();
    // example output: djlint, version 1.34.1
    $regex = '/^djlint, version (?P<version>\d+\.\d+\.\d+)$/';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    throw new Exception(pht('Linter %s unexpected output: %s',
                            DjlintLinter::class, $stderr));
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);

    if ($err == 0) {
      return array();
    }

    $orig = file_get_contents($path);

    // We need to manually run the linter again with the file contents as stdin,
    // as djlint doesn't have a way to output a formatted file to stdout without
    // using stdin.
    $cmd = sprintf(
      '%s %s -',
      $this->getDefaultBinary(),
      implode(" ", $this->getCommonMandatoryFlags()),
    );
    $descriptorspec = array(
      0 => array("pipe", "r"), // stdin
      1 => array("pipe", "w"), // stdout
      2 => array("pipe", "w"), // stderr
    );
    $process = proc_open($cmd, $descriptorspec, $pipes);
    // Write file to be formatted to stdin
    fwrite($pipes[0], $orig);
    fclose($pipes[0]);

    // Read formatted file from stdout
    $formatted = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    // Ignore stderr
    fclose($pipes[2]);

    if ($orig == $formatted) {
      return array();
    }

    return array(
      id(new ArcanistLintMessage())
        ->setPath($path)
        ->setLine(1)
        ->setChar(1)
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('DJLINT')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
        ->setName('Code style violation')
        ->setDescription("'$path' has code style errors.")
        ->setOriginalText($orig)
        ->setReplacementText($formatted)
    );
  }
}
