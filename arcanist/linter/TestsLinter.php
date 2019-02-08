<?php

/**
 * Uses the lint-tests.sh script to enfore Boost unit tests name conformity
 */
final class TestsLinter extends ArcanistExternalLinter {

  public function getInfoName() {
    return 'lint-tests';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Check the unit tests for duplicates and ensure the file name '.
               'matches the boost test suite name.');
  }

  public function getLinterName() {
    return 'lint-tests';
  }

  public function getLinterConfigurationName() {
    return 'lint-tests';
  }

  public function getLinterConfigurationOptions() {
    $options = array(
    );

    return $options + parent::getLinterConfigurationOptions();
  }

  public function getDefaultBinary() {
    return Filesystem::resolvePath(
      'test/lint/lint-tests.sh',
      $this->getProjectRoot());
  }
  
  public function shouldUseInterpreter() {
    return true;
  }
  
  public function getDefaultInterpreter() {
    return "bash";
  }
  
  public function getInstallInstructions() {
    return pht('The test/lint/lint-tests.sh script is part of the bitcoin-abc '.
               'project');
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  protected function getMandatoryFlags() {
    return array(
    );
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    /*
     * Stdout contains 2 sections:
     * 1/ Section with name mismatches, in the form:
     * <file path>:BOOST_FIXTURE_TEST_SUITE(<test name>, ...
     * 2/ Section with duplicated test names:
     * <test_name>
     */

    /* 
     * Extract infos from the path
     * 
     * Note: the files are already filtered by path thanks to the .arclint
     * configuration. If the file is not a test, the grep will find nothing and
     * there will be no error to parse.
     */
    $pathinfo = pathinfo($path);
    $testName = $pathinfo['filename'];
    $fileName = $pathinfo['basename'];

    $messages = [];

    /* Search for mismatch, using the line pattern */
    $pattern = '/'.$fileName.':BOOST_FIXTURE_TEST_SUITE\(([\w]+)/';
    $mismatch = preg_match($pattern, $stdout, $matches);

    if ($mismatch) {
      /* 
       * Expect a single result as we are testing against a single file.
       *  - $matches[0] contains the full mask
       *  - $matches[1] contains the captured match
       */
      if (count($matches) != 2) {
        throw new Exception(
          pht('Found multiple matches for a single file, lint-tests.sh output '.
              'is not formatted as expected, aborting.'));
      }

      $mismatchName = $matches[1];
      $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('TESTS')
        ->setPath($path)
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Name mismatch')
        ->setDescription(
          'The Boost test suite name must match the file name (set to "'.
          $mismatchName.'", should be "'.$testName.'").');
    }

    /* 
     * Search for unicity, searching for test name alone on its line.
     * The test name can be whether the one extracted from the file name or the
     * one extracted from the BOOST_FIXTURE_TEST_SUITE content.
     */
    if ($mismatch) {
      $pattern = '/^'.$testName.'|'.$mismatchName.'$/';
    } else {
      $pattern = '/^'.$testName.'$/';
    }

    $notUnique = preg_match($pattern, $stdout, $matches);

    /*
     * Do not check the number of matches here.
     * Because it is a test against unicity, there is a global search which can
     * possibly return an output matching our expected test name AND our actual
     * test name. This would be weird, but not impossible.
     * Just returning an error for the first one is enough, as the linter will
     * be rerun after the name is fix and the other match will then eventually 
     * get catched.
     */

    if ($notUnique) {
      $messages[] = id(new ArcanistLintMessage())
        ->setGranularity(ArcanistLinter::GRANULARITY_FILE)
        ->setCode('TESTS')
        ->setPath($path)
        ->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR)
        ->setName('Duplicated name')
        ->setDescription('The test name "'.$matches[0].'" already exists');
    }

    return $messages;
  }
}

?>
