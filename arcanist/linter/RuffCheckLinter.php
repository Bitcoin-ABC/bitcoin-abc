<?php

/**
 * Uses the ruff tool to check python code and autofix some issues
 */
final class RuffCheckLinter extends AbstractRuffExternalLinter {

  public function getInfoName() {
    return 'ruff-check';
  }

  public function getLinterName() {
    return 'ruff-check';
  }

  public function getLinterConfigurationName() {
    return 'ruff-check';
  }

  protected function getMandatoryFlags() {
    return array(
      'check',
      '--fix',
    );
  }
}
