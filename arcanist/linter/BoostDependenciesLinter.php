<?php

/**
 * Uses the lint-boost-dependencies.sh script to check that no new boost
 * dependency is introduced in the codebase.
 */
final class BoostDependenciesLinter extends GlobalExternalLinter {

  public function getInfoName() {
    return 'lint-boost-dependencies';
  }

  public function getInfoDescription() {
    return pht('Check that no new boost dependency is introduced.');
  }

  public function getLinterName() {
    return 'BOOST_DEPENDENCIES';
  }

  public function getLinterConfigurationName() {
    return 'lint-boost-dependencies';
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath('test/lint/lint-boost-dependencies.sh',
      $this->getProjectRoot());
  }

  public function shouldUseInterpreter() {
    return true;
  }

  public function getDefaultInterpreter() {
    return "bash";
  }

  public function getInstallInstructions() {
    return pht('The test/lint/lint-boost-dependencies.sh script is part of '.
      'the bitcoin-abc project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function parseGlobalLinterOutput($err, $stdout, $stderr) {
    $messages = array();

    // New dependency added
    $pattern = '/(?:^(.+):#include <(.+)>)+/m';
    if (preg_match_all($pattern, $stdout, $dependencies, PREG_SET_ORDER)) {
      foreach ($dependencies as $dependency) {
        list(, $path, $header) = $dependency;
        $messages[] = id(new ArcanistLintMessage())
          ->setPath($path)
          ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
          ->setCode('BOOST_DEPENDENCY')
          ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
          ->setName('A new dependency has been introduced')
          ->setDescription("New dependency to Boost $header has been ".
                           "introduced.");
      }
    }

    // A dependency get removed
    $pattern = '/^Good job!.+dependency "(.+)" is .+ reintroduced\.$/sm';
    if (preg_match_all($pattern, $stdout, $removals, PREG_SET_ORDER)) {
      foreach ($removals as $removal) {
        list($advice, $header) = $removal;
        $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_GLOBAL)
        ->setCode('BOOST_DEPENDENCY')
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ADVICE)
        ->setBypassChangedLineFiltering(true)
        ->setName('Good job! A boost dependency has been removed.')
        ->setDescription($advice);
      }
    }

    return $messages;
  }
}
