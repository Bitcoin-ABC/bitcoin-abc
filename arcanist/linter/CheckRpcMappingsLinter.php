<?php

/**
 * Uses the check-rpc-mappings.py script to ensure the RPC arguments types and
 * names are consistent.
 */
final class CheckRpcMappingsLinter extends GlobalExternalLinter {

  public function getInfoName() {
    return 'check-rpc-mappings';
  }

  public function getInfoDescription() {
    return pht('Check that the RPC arguments are consistent.');
  }

  public function getLinterName() {
    return 'RPC_MAPPINGS';
  }

  public function getLinterConfigurationName() {
    return 'check-rpc-mappings';
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath('test/lint/check-rpc-mappings.py',
      $this->getProjectRoot());
  }

  public function shouldUseInterpreter() {
    return true;
  }

  public function getDefaultInterpreter() {
    return "python3";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/check-rpc-mappings.py script is part of the '.
               'bitcoin-abc project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array($this->getProjectRoot());
  }

  protected function parseGlobalLinterOutput($err, $stdout, $stderr) {
    $messages = array();

    // Find errors
    if (preg_match_all('/ERROR:\s*(.*)/', $stdout, $errors, PREG_SET_ORDER)) {
      foreach ($errors as $error) {
        $messages[] = id(new ArcanistLintMessage())
          ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
          ->setCode('RPC_MAPPING_ERROR')
          ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
          ->setName('RPC mapping error')
          ->setDescription($error[1]);
      }
    }

    // Find warnings
    if (preg_match_all('/WARNING:\s*(.*)/', $stdout, $warnings,
      PREG_SET_ORDER)) {
      foreach ($warnings as $warning) {
        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
        ->setCode('RPC_MAPPING_WARNING')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_WARNING)
        ->setBypassChangedLineFiltering(true)
        ->setName('RPC mapping warning')
        ->setDescription($warning[1]);
      }
    }

    return $messages;
  }
}
