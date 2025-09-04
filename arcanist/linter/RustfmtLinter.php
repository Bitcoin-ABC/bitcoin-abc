<?php

/**
 * Run rustfmt, a formatter shipped with Rust.
 */
final class RustfmtLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'rustfmt';
  }

  public function getInfoURI() {
    return 'https://github.com/rust-lang/rustfmt';
  }

  public function getInfoDescription() {
    return pht('Formats Rust *.rs files.');
  }

  public function getInstallInstructions() {
    return pht('You have to install a nightly Rust toolchain for this ' .
               'linter, and name it "abc-nightly". You can do so via ' .
               '`rustup install nightly-2023-12-29` and then ' .
               '`ABC_NIGHTLY="$(rustc +nightly-2023-12-29 --print sysroot)"` ' .
               'and then `rustup toolchain link abc-nightly "${ABC_NIGHTLY}"`');
  }

  public function getLinterName() {
    return 'rustfmt';
  }

  public function getLinterConfigurationName() {
    return 'rustfmt';
  }

  public function getDefaultBinary() {
    return 'rustfmt';
  }

  protected function getMandatoryFlags() {
    return array(
      '+abc-nightly',
      '--emit', 'stdout',
      '--unstable-features',
      '--skip-children',
      '--quiet',
    );
  }

  public function getVersion() {
    list($err, $stdout, $stderr) = exec_manual('%C +abc-nightly --version',
                                               $this->getExecutableCommand());

    if ($err) {
      throw new Exception(pht('Linter %s: %s', RustfmtLinter::class, $stderr));
    }

    $matches = array();
    // example output: rustfmt 1.5.1-nightly (83088064 2022-06-28)
    $regex = '/^rustfmt (?P<version>\d+\.\d+\.\d+)-.*$/';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    throw new Exception(pht('Linter %s unexpected output: %s',
                            RustfmtLinter::class, $stderr));
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);

    if ($err != 0) {
      $message = id(new ArcanistLintMessage())
        ->setPath($path)
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('RUSTFMT')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Linter error')
        ->setDescription($stderr);

      return array($message);
    }

    $messages = array();
    $lines = preg_split("/\r\n|\n|\r/", $stdout);
    // Sometimes it's impossible to wrap code, add an error in this case
    foreach ($lines as $lineIdx => $line) {
      if (strlen($line) > 80) {
        $messages[] = id(new ArcanistLintMessage())
        ->setPath($path)
        ->setLine($lineIdx + 1)
        ->setChar(1)
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('RUSTFMT')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Line limit exceeded')
        ->setDescription('Could not wrap this line with rustfmt');
      }
    }

    $orig = file_get_contents($path);

    if ($orig == $stdout) {
      return $messages;
    }

    $messages[] = id(new ArcanistLintMessage())
      ->setPath($path)
      ->setLine(1)
      ->setChar(1)
      ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
      ->setCode('RUSTFMT')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Code style violation')
      ->setDescription("'$path' has code style errors.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return $messages;
  }
}
