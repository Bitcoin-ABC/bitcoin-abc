<?php

/**
 * Enforce safe usage of std::chrono.
 */
final class StdChronoLinter extends ArcanistLinter {

  const BAD_DURATION_CONSTRUCTOR = 1;

  public function getInfoName() {
    return 'lint-std-chrono';
  }

  public function getInfoDescription() {
    return pht('Enforce safe usage of std::chrono.');
  }

  public function getLinterName() {
    return 'STD_CHRONO';
  }

  public function getLinterConfigurationName() {
    return 'lint-std-chrono';
  }

  public function getLintSeverityMap() {
    return array(
      self::BAD_DURATION_CONSTRUCTOR => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::BAD_DURATION_CONSTRUCTOR => pht(
        'Uninitialized chrono::duration constructor'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (preg_match_all(
      '/std::chrono::(?:'.
      'duration|hours|minutes|seconds|milliseconds|microseconds|nanoseconds)'.
      '(?:<.*>)?\(\)/', $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
      foreach ($matches[0] as $match) {
        list($durationConstructor, $offset) = $match;
        $this->raiseLintAtOffset(
          $offset,
          self::BAD_DURATION_CONSTRUCTOR,
          pht($durationConstructor." without an explicit initialized value ".
            "may lead to undesired behavior."),
          $durationConstructor,
          substr_replace($durationConstructor, '0', -1, 0)
        );
      }
    }
  }
}
