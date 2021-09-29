<?php

/**
 * Enforce using the C++ style `()` for void parameters instead of the C style
 * `(void)`.
 */
final class CppVoidParameterLinter extends ArcanistLinter {

  const FALSE_POSITIVES = array(
    "typeid(void)",
  );

  const VOID_PARAMETER_FOUND = 1;

  public function getInfoName() {
    return 'lint-cpp-void-parameters';
  }

  public function getInfoDescription() {
    return pht('Enforce using C++ style void parameters. ');
  }

  public function getLinterName() {
    return 'CPP_VOID_PARAM';
  }

  public function getLinterConfigurationName() {
    return 'lint-cpp-void-parameters';
  }

  public function getLintSeverityMap() {
    return array(
        self::VOID_PARAMETER_FOUND => ArcanistLintSeverity::SEVERITY_AUTOFIX,
    );
  }

  public function getLintNameMap() {
    return array(
        self::VOID_PARAMETER_FOUND => pht('Use C++ style void parameters.'),
    );
  }

  private function isFalsePositive($line) {
    foreach(self::FALSE_POSITIVES as $falsePositive) {
      if (strpos($line, $falsePositive) !== false) {
        return true;
      }
    }
    return false;
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (preg_match_all('/[^\s{(]+\s?\(void\)/', $fileContent, $voidParameters,
      PREG_OFFSET_CAPTURE)) {
      foreach ($voidParameters[0] as $voidParameter) {
        list($function, $offset) = $voidParameter;

        if ($this->isFalsePositive($function)) {
          continue;
        }

        $this->raiseLintAtOffset(
          $offset,
          self::VOID_PARAMETER_FOUND,
          pht('C++ style parameters should be used: () instead of (void).'),
          $function,
          str_replace('(void)', '()', $function)
        )->setBypassChangedLineFiltering(true);
      }
    }
  }
}
