<?php

/**
 * Prevent from using inline doxygen comment on their own line.
 */
final class DoxygenLinter extends ArcanistLinter {

  static private $doxygenCommentOpenings = array(
    '/*!',
    '/**',
    '//!',
    '///',
  );

  const BAD_INLINE_COMMENT = 1;

  public function getInfoName() {
    return 'lint-doxygen';
  }

  public function getInfoDescription() {
    return pht('Prevent from using inline doxygen comment on their own line.');
  }

  public function getLinterName() {
    return 'DOXYGEN';
  }

  public function getLinterConfigurationName() {
    return 'lint-doxygen';
  }

  public function getLintSeverityMap() {
    return array(
        self::BAD_INLINE_COMMENT => ArcanistLintSeverity::SEVERITY_AUTOFIX,
    );
  }

  public function getLintNameMap() {
    return array(
        self::BAD_INLINE_COMMENT => pht('Misplaced inline doxygen comment.'),
    );
  }

  public function lintPath($path) {
    $abspath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = explode("\n", Filesystem::readFile($abspath));

    $sanitizedOpenings = array_map('preg_quote', self::$doxygenCommentOpenings);
    $anyDoxygenCommentOpening = implode('|', $sanitizedOpenings);

    $previousLine = "";
    foreach ($fileContent as $lineNumber => $lineContent) {
      if (preg_match("@^\s*($anyDoxygenCommentOpening)<.+@m", $lineContent,
        $matches, PREG_OFFSET_CAPTURE)) {
        list($commentOpening, $offset) = $matches[1];

        if (strpos($previousLine, $commentOpening) === false) {
          $original = $commentOpening.'<';
          $replacement = $commentOpening;

          $this->raiseLintAtLine(
            $lineNumber + 1,
            $offset + 1,
            self::BAD_INLINE_COMMENT,
            pht('This comment applies to the previous line and should be '.
                'located after a statement.'),
            $original,
            $replacement);
        }
      }

      $previousLine = $lineContent;
    }
  }
}
