<?php

class ArcanistBitcoinABCConfiguration extends ArcanistConfiguration {
  public function getCustomArgumentsForCommand($command) {
    if ($command === 'land') {
      return array(
        'bypass-linters' => array(
          'help' => pht('Do not run the linters before landing.'),
        ),
      );
    }

    return array();
  }

  public function willRunWorkflow($command, ArcanistWorkflow $workflow) {
    if ($command === 'land') {
      /* Offer an way to force landing even if there is a linter issue */
      if ($workflow->getArgument('bypass-linters')) {
        return 0;
      }

      /*
       * Arguments:
       *
       * --severity autofix: we are only interested in autofix/warning/error
       * messages, not advice messages.
       *
       * --amend-autofix: since arc land expects a clean worktree, try to avoid
       * asking the user to git add the file and run arc land again.
       */
      $lintWorkflow = $workflow->buildChildWorkflow(
        'lint', array('--severity', 'autofix', '--amend-autofixes'));

      try {
        $lintResult = $lintWorkflow->run();
      } catch (Exception $ex) {
        /*
         * The lint workflow will throw an exception if no path is lintable.
         * Catch this exception and return no error (this is what is done when
         * arc lint is run).
         */
        if ($ex instanceof ArcanistNoEffectException) {
          return 0;
        }
      }

      $lintMessages = $lintWorkflow->getUnresolvedMessages();

      /*
       * Autofix messages return RESULT_OKAY, so check there is no remaining
       * unresolved message.
       */
      if ($lintResult != ArcanistLintWorkflow::RESULT_OKAY ||
          !empty($lintMessages)) {
        throw new Exception(
          pht("Please fix the linter issues before landing."));
      }
    }

    return 0;
  }
}
