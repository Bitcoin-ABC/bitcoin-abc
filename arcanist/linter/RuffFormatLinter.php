<?php

/**
 * Uses the ruff tool to format python code
 */
final class RuffFormatLinter extends AbstractRuffExternalLinter {

  public function getInfoName() {
    return 'ruff-format';
  }

  public function getLinterName() {
    return 'ruff-format';
  }

  public function getLinterConfigurationName() {
    return 'ruff-format';
  }

  protected function getMandatoryFlags() {
    return array(
      'format',
    );
  }
}
