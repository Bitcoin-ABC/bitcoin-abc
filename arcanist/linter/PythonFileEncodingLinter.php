<?php

/**
 * Make sure we explicitly set the encoding when opening text files with
 * Python.
 */
final class PythonFileEncodingLinter extends ArcanistLinter {

  const ENCODING_NOT_FOUND = 1;

  public function getInfoName() {
    return 'lint-python-encoding';
  }

  public function getInfoDescription() {
    return pht('Make sure we explicitly set the encoding when reading text '.
               'content with Python');
  }

  public function getLinterName() {
    return 'PYTHON_ENCODING';
  }

  public function getLinterConfigurationName() {
    return 'lint-python-encoding';
  }

  public function getLintSeverityMap() {
    return array(
      self::ENCODING_NOT_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::ENCODING_NOT_FOUND => pht('Encoding should be specified when '.
                                      'reading text content.'),
    );
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    $pattern = "/[(\s]open(\(((?>[^()]+)|(?1))*\))/";
    if (preg_match_all($pattern, $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($open, $offset) = $match;

        $isBin = preg_match(
          "/open\(.*,\s? +(\*\*kwargs|['\"][rwxat+]*b[rwxat+]*['\"])/s", $open);
        $hasEncoding = preg_match("/encoding=.(ascii|utf8|utf-8)./", $open);

        if (!$isBin && !$hasEncoding) {
          $this->raiseLintAtOffset(
            $offset + 1,
            self::ENCODING_NOT_FOUND,
            pht("Python's open(...) seems to be used to open text files ".
                "without explicitly specifying encoding, or with an invalid ".
                "encoding. Encoding should be 'ascii', 'utf-8' or 'utf8' ".
                "(e.g.: `open(f, 'r', encoding='utf-8')`)."),
            substr($open, 1),
            null);
        }
      }
    }

    $pattern = "/[(\s]check_output(\(((?>[^()]+)|(?1))*\))/";
    if (preg_match_all($pattern, $fileContent, $matches,
      PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($check_output, $offset) = $match;

        $isText = preg_match("/universal_newlines=True/", $check_output);
        $hasEncoding = preg_match("/encoding=.(ascii|utf8|utf-8)./",
          $check_output);

        if ($isText && !$hasEncoding) {
          $this->raiseLintAtOffset(
              $offset + 1,
              self::ENCODING_NOT_FOUND,
              pht("Python's check_output(...) seems to be used to get program ".
                  "output without explicitly specifying encoding, or with an ".
                  "invalid encoding. Encoding should be 'ascii', 'utf-8' or ".
                  "'utf8'"),
              substr($check_output, 1),
              null);
        }
      }
    }
  }
}
