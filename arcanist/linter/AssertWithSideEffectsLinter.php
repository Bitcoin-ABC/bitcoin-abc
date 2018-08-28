<?php

/**
 * Check that there is no side effect in assertions.
 *
 * PRE31-C (SEI CERT C Coding Standard):
 * "Assertions should not contain assignments, increment, or decrement
 * operators."
 */
final class AssertWithSideEffectsLinter extends ArcanistLinter {

  const ASSERT_SIDE_EFFECTS_FOUND = 1;

  public function getInfoName() {
    return 'lint-assert-with-side-effects';
  }

  public function getInfoDescription() {
    return pht('Check that there is no side effect in assertions.');
  }

  public function getLinterName() {
    return 'ASSERT_WITH_SIDE_EFFECTS';
  }

  public function getLinterConfigurationName() {
    return 'lint-assert-with-side-effects';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getLintSeverityMap() {
    return array(
        self::ASSERT_SIDE_EFFECTS_FOUND => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
        self::ASSERT_SIDE_EFFECTS_FOUND => pht('Assertion has side-effects.'),
    );
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    if (!preg_match_all("/[^_]assert\(.*(\+\+|\-\-|[^=!<>]=[^=!<>]).*\);/",
      $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
      return;
    }

    foreach ($matches[1] as $match) {
      list($sideEffect, $offset) = $match;

      $this->raiseLintAtOffset(
        $offset,
          self::ASSERT_SIDE_EFFECTS_FOUND,
        pht('Having side-effects in assertions is unexpected and makes the '.
            'code harder to understand. From PRE31-C (SEI CERT C Coding '.
            'Standard): "Assertions should not contain assignments, '.
            'increment, or decrement operators."'),
        $sideEffect,
        null);
    }
  }
}
