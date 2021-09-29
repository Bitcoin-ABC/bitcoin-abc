<?php

/**
 * Abstract external linter class that should run only once independently of the
 * number of files being modified.
 * This kind of linter doesn't take a path argument.
 */
abstract class GlobalExternalLinter extends ArcanistExternalLinter
implements ILintOnce {
  /* A global linter does not require a path as an argument. */
  final protected function getPathArgumentForLinterFuture($path) {
    return '';
  }

  abstract protected function parseGlobalLinterOutput($err, $stdout, $stderr);

  final protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    /* The path is irrelevant to a global linter. */
    return $this->parseGlobalLinterOutput($err, $stdout, $stderr);
  }
}
