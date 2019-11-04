<?php

/**
 * Macro CHECK_NONFATAL(condition) should be used instead of assert for RPC
 * code, where it is undesirable to crash the whole program.
 * See: src/util/check.h
 * src/rpc/server.cpp is excluded from this check since it's mostly meta-code.
 */
final class CheckNonFatalOverAssertInRpc extends ArcanistLinter {
  const BAD_ASSERT_IN_RPC = 1;

  const RATIONALE_MSG =
  'Macro CHECK_NONFATAL(cond) should be used instead of assert for RPC code';

  public function getInfoName() {
    return 'lint-check-nonfatal';
  }

  public function getInfoDescription() {
    return pht(self::RATIONALE_MSG);
  }

  public function getLinterName() {
    return 'CHECK_NONFATAL';
  }

  public function getLinterConfigurationName() {
    return 'lint-check-nonfatal';
  }

  public function getLintSeverityMap() {
    return array(
      self::BAD_ASSERT_IN_RPC => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::BAD_ASSERT_IN_RPC =>
      pht('Use CHECK_NONFATAL(condition) over assert(condition) in RPC code.'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    if (!preg_match_all("/(assert\((.*)\);)/", $fileContent,
      $matches, PREG_OFFSET_CAPTURE)) {
      return;
    }

    foreach ($matches[1] as $match) {
      list($cpp, $offset) = $match;

      $this->raiseLintAtOffset(
        $offset,
        self::BAD_ASSERT_IN_RPC,
        pht(self::RATIONALE_MSG),
        $cpp,
        null);
    }
  }
}
