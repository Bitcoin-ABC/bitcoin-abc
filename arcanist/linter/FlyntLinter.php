<?php

/**
 * Flynt - string formatting converter
 *
 * Flynt is a command line tool to automatically convert a project's Python
 * code from old "%-formatted" and .format(...) strings into Python 3.6+'s
 * "f-strings".
 *
 * Limitations:
 *  - We don't set the --aggressive flag (see
 *    https://github.com/ikamensh/flynt#dangers-of-conversion)
 *
 *  - It does not convert string with multiple use of a same variable.
 *    (this would work with the --aggressive flag)
 *    E.g.:
 *        '{addr.ip}:{addr.port}@'.format(addr=proxy1)
 *        "{0} blocks and {0} coinbase txes".format(num_blocks)
 *
 *  - it does not convert string that use a variable as template string.
 *    This is good, as it can save us from repeating the template string.
 *    E.g:
 *        FORK_WARNING_MESSAGE.format(fork_block)
 *
 *  - it does not convert strings that would result in lines longer than
 *    88 characters. This could be changed by setting `--line-length 999`
 *    but then the result would be put on a single line and would have
 *    to be manually formatted. In some instances, especially when the
 *    arguments are longer than the template string, it may be better
 *    to keep the "...".format(...) string so that another linter can
 *    automatically format it.
 *
 *    E.g.:
 *        dump_time_str = "# * Created on {}Z".format(
 *            datetime.datetime.fromtimestamp(
 *                dump_time,
 *                tz=datetime.timezone.utc,
 *            )
 *        )
 */
final class FlyntFormattLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'flynt';
  }

  public function getInfoURI() {
    return 'https://github.com/ikamensh/flynt';
  }

  public function getInfoDescription() {
    return pht('Convert Python strings into f-strings.');
  }

  public function getLinterName() {
    return 'flynt';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-flynt';
  }

  public function getDefaultBinary() {
    return 'flynt';
  }

  protected function getMandatoryFlags() {
    return array(
      /* Print to stdout instead of modifying in-place */
      '--stdout',
    );
  }

  public function getInstallInstructions() {
    return pht('Install flynt with `pip install flynt`');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    if ($err != 0) {
      return false;
    }

    $root = $this->getProjectRoot();
    $path = Filesystem::resolvePath($path, $root);
    $orig = file_get_contents($path);

    // remove extra newline added to stdout by flynt
    // (bug present at least in versions 0.77 and 0.78)
    $stdout = rtrim($stdout) . "\n";

    if (empty($orig) || $orig == $stdout) {
      return array();
    }

    $message = id(new ArcanistLintMessage())
      ->setPath($path)
      ->setLine(1)
      ->setChar(1)
      ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
      ->setCode('FLYNT')
      ->setSeverity(ArcanistLintSeverity::SEVERITY_AUTOFIX)
      ->setName('Converting into f-strings')
      ->setDescription("'$path' has strings to be converted into f-strings.")
      ->setOriginalText($orig)
      ->setReplacementText($stdout);

    return array($message);
  }
}
