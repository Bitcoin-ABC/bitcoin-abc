<?php

final class ExtendedConfigurationDrivenLintEngine extends ArcanistLintEngine {

  public function buildLinters() {
    $configurationDrivenLintEngine = newv(
      ArcanistConfigurationDrivenLintEngine::class, array())
      ->setWorkingCopy($this->getWorkingCopy())
      ->setConfigurationManager($this->getConfigurationManager())
      ->setPaths($this->getPaths());

    $linters = $configurationDrivenLintEngine->buildLinters();

    foreach ($linters as $linter) {
      $paths = $linter->getPaths();

      /*
       * If the linter implements `ILintOnce` this is a global linter.
       */
      if ($linter instanceof ILintOnce && !empty($paths)) {
        /*
         * Even if global linters have no use of the path, at least one should
         * be set in order to run the linter.
         */
        $linter->setPaths(array($paths[0]));
        PhutilConsole::getConsole()->writeLog(
          "%s\n",
          pht("Linter '%s' will run once.", $linter->getLinterName()));
      }
    }

    return $linters;
  }
}
