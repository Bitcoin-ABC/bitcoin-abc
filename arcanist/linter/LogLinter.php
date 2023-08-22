<?php

/**
 * Ensure the calls to (Wallet)LogPrint() and (Wallet)LogPrintf() end with a
 * newline.
 */
final class LogLinter extends ArcanistLinter {

  const MISSING_NEWLINE = 1;

  public function getInfoName() {
    return 'lint-logs';
  }

  public function getInfoDescription() {
    return pht('Check that no source files gets included.');
  }

  public function getLinterName() {
    return 'LOGS';
  }

  public function getLinterConfigurationName() {
    return 'lint-logs';
  }

  public function getLintSeverityMap() {
    return array(
      self::MISSING_NEWLINE => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::MISSING_NEWLINE => pht('Missing a newline at the end of the log '.
                                   'message.'),
    );
  }

  public function lintPath($path) {
    $absPath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($absPath);

    /* Recursive patterns to match balanced parenthesis and quotes content. */
    $logFnNamesPattern =
    'WalletLogPrintf?|LogPrintf?|LogPrintLevel?|LogPrintfCategory?'
    .'|log!|log_chronik!|LogError?|LogWarning?|LogInfo?|LogDebug?|LogTrace?';
    $logPrintPattern = '/(?:'.$logFnNamesPattern.')(\((?>[^()]|(?1))*\));/';
    $logPrintContentPattern = '/("(?>[^"]|(?1))*")\s*(?:,|\))/U';

    if (preg_match_all($logPrintPattern, $fileContent, $logPrints,
      PREG_OFFSET_CAPTURE)) {
      foreach ($logPrints[1] as $logPrint) {
        /* This is the whole content of the print function. */
        list($logPrintContent, $offsetPrint) = $logPrint;

        if (preg_match_all($logPrintContentPattern, $logPrintContent,
          $logPrintMessage, PREG_OFFSET_CAPTURE)) {
          /* This is the full log message, even if split in multiple lines. */
          list($message, $offsetMessage) = $logPrintMessage[1][0];

          if (!(substr($message, -3) == '\n"')) {
            $this->raiseLintAtOffset(
              $offsetPrint + $offsetMessage,
              self::MISSING_NEWLINE,
              pht('If this is deliberate, please use the '.
                  '`(Wallet)LogPrint*ToBeContinued()` method instead.'),
              $message,
              null);
          }
        }
      }
    }
  }
}
