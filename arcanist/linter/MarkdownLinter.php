<?php

function startsWith($haystack, $needle) {
  return substr($haystack, 0, strlen($needle)) === $needle;
}

/**
 * Check for errors in markdown files.
 */
final class MarkdownLinter extends ArcanistLinter {

  const DEAD_LINK_FOUND = 1;

  public function getInfoName() {
    return 'lint-markdown';
  }

  public function getInfoDescription() {
    return pht('Check for issues in markdown files');
  }

  public function getLinterName() {
    return 'lint-markdown';
  }

  public function getLinterConfigurationName() {
    return 'lint-markdown';
  }

  public function getLintSeverityMap() {
    return array(
        self::DEAD_LINK_FOUND => ArcanistLintSeverity::SEVERITY_ERROR);
  }

  public function getLintNameMap() {
    return array(
        self::DEAD_LINK_FOUND => pht('Dead link'));
  }

  private function isValidLink($currentPath, $link) {
    /*
     *  File anchors should only contain lowercase alphanum chars, underscores
     *  or hyphens.
     *  TODO: check that anchors have a corresponding section.
     */
    if ($link[0] === '#') {
      return preg_match('/^#[a-z0-9_\-]+$/', $link);
    }

    /*
     * External URLs (starting with scheme://) are considered valid if the URL
     * syntax is valid.
     */
    if (preg_match('#^[^:]+://#', $link)) {
      return filter_var($link, FILTER_VALIDATE_URL);
    }

    /* For mailto: links, check the address syntax is valid */
    if (startsWith($link, 'mailto:')) {
      return filter_var(substr($link, 7), FILTER_VALIDATE_EMAIL);
    }

    if ($link[0] === '/') {
      $linkPath = Filesystem::resolvePath(
        substr($link, 1), $this->getProjectRoot());
    } else {
      $linkPath = Filesystem::resolvePath($link,
        pathinfo($currentPath, PATHINFO_DIRNAME));
    }

    return file_exists($linkPath);
  }

  public function lintPath($path) {
    $path = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = Filesystem::readFile($path);

    /* Check for broken links (typos in URL of missing target file) */
    $pattern = '/\[[^\]]+\]\((#?[^ "#)]+)#?[^)]*\)/';
    if (preg_match_all($pattern, $fileContent, $matches, PREG_OFFSET_CAPTURE)) {
      foreach ($matches[1] as $match) {
        list($link, $offset) = $match;

        if (!$this->isValidLink($path, trim($link))) {
          $this->raiseLintAtOffset(
            $offset,
            self::DEAD_LINK_FOUND,
            pht(
              'The link is invalid, check for syntax error or missing target'),
            $link,
            null);
        }
      }
    }
  }
}
