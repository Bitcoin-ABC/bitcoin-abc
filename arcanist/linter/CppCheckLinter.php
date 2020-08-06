<?php

/**
 * Uses the cppcheck tool to run static analysis on c++ sources.
 */
final class CppCheckLinter extends ArcanistExternalLinter {
  const CPPCHECK_ENABLED_CHECKS = array(
    // None so far.
  );

  const CPPCHECK_DISABLED_CHECKS = array(
    "unknownMacro",
    "preprocessorErrorDirective",
    // These would be worth enabling going forward.
    "danglingTemporaryLifetime",
    "invalidContainer",
  );

  // phpcs:disable Generic.Files.LineLength.TooLong
  // phpcs:disable Generic.Files.LineLength.MaxExceeded
  /* Associative array of <file => [messages]> to whitelist. */
  const CPPCHECK_IGNORED_WARNINGS = array(
    "src/arith_uint256.h" => array(
      "Class 'arith_uint256' has a constructor with 1 argument that is not explicit.",
      "Class 'base_uint < 256 >' has a constructor with 1 argument that is not explicit.",
      "Class 'base_uint' has a constructor with 1 argument that is not explicit.",
    ),
    "src/bench/prevector.cpp" => array(
      // Remove this once this false positive is fixed in cppcheck
      "syntax error",
    ),
    "src/coins.h" => array(
      "Class 'CCoinsViewBacked' has a constructor with 1 argument that is not explicit.",
      "Class 'CCoinsViewCache' has a constructor with 1 argument that is not explicit.",
      "Class 'CCoinsViewCursor' has a constructor with 1 argument that is not explicit.",
    ),
    "src/cuckoocache.h" => array(
      "Struct 'KeyOnly' has a constructor with 1 argument that is not explicit.",
    ),
    "src/net.h" => array(
      "Class 'CNetMessage' has a constructor with 1 argument that is not explicit.",
    ),
    "src/net_processing.cpp" => array(
      "Same iterator is used with different containers 'mapOrphanTransactions' and 'itPrev.second'.",
    ),
    "src/policy/feerate.h" => array(
      "Class 'CFeeRate' has a constructor with 1 argument that is not explicit.",
    ),
    "src/prevector.h" => array(
      "Class 'const_iterator' has a constructor with 1 argument that is not explicit.",
      "Class 'const_reverse_iterator' has a constructor with 1 argument that is not explicit.",
      "Class 'iterator' has a constructor with 1 argument that is not explicit.",
      "Class 'reverse_iterator' has a constructor with 1 argument that is not explicit.",
    ),
    "src/primitives/block.h" => array(
      "Class 'CBlock' has a constructor with 1 argument that is not explicit.",
    ),
    "src/primitives/transaction.h" => array(
      "Class 'CTransaction' has a constructor with 1 argument that is not explicit.",
    ),
    "src/protocol.h" => array(
      "Class 'CMessageHeader' has a constructor with 1 argument that is not explicit.",
    ),
    "src/qt/guiutil.h" => array(
      "Class 'ItemDelegate' has a constructor with 1 argument that is not explicit.",
    ),
    "src/rpc/util.h" => array(
      "Struct 'RPCResults' has a constructor with 1 argument that is not explicit.",
      "Struct 'UniValueType' has a constructor with 1 argument that is not explicit.",
    ),
    "src/script/descriptor.cpp" => array(
      "Class 'AddressDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'ComboDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'ConstPubkeyProvider' has a constructor with 1 argument that is not explicit.",
      "Class 'PKDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'PKHDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'RawDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'SHDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'WPKHDescriptor' has a constructor with 1 argument that is not explicit.",
      "Class 'WSHDescriptor' has a constructor with 1 argument that is not explicit.",
    ),
    "src/script/script.h" => array(
      "Class 'CScript' has a constructor with 1 argument that is not explicit.",
    ),
    "src/script/standard.h" => array(
      "Class 'CScriptID' has a constructor with 1 argument that is not explicit.",
    ),
    "src/support/allocators/secure.h" => array(
      "Struct 'secure_allocator < char >' has a constructor with 1 argument that is not explicit.",
      "Struct 'secure_allocator < RNGState >' has a constructor with 1 argument that is not explicit.",
      "Struct 'secure_allocator < unsigned char >' has a constructor with 1 argument that is not explicit.",
    ),
    "src/support/allocators/zeroafterfree.h" => array(
      "Struct 'zero_after_free_allocator < char >' has a constructor with 1 argument that is not explicit.",
    ),
    "src/test/checkqueue_tests.cpp" => array(
      "Struct 'FailingCheck' has a constructor with 1 argument that is not explicit.",
      "Struct 'MemoryCheck' has a constructor with 1 argument that is not explicit.",
      "Struct 'UniqueCheck' has a constructor with 1 argument that is not explicit.",
    ),
    "src/test/cuckoocache_tests.cpp" => array(
      "Struct 'KeyType' has a constructor with 1 argument that is not explicit.",
      "Struct 'TestMapElement' has a constructor with 1 argument that is not explicit."
    ),
    "src/test/prevector_tests.cpp" => array(
      // Remove this once this false positive is fixed in cppcheck
      "syntax error",
    ),
    "src/wallet/db.h" => array(
      "Class 'BerkeleyEnvironment' has a constructor with 1 argument that is not explicit.",
    ),
  );
  // phpcs:enable

  const CPPCHECK_OPTIONS = array(
    '-j2',
    '--enable=all',
    '--language=c++',
    '--std=c++14',
  );

  const CPPCHECK_DEFINITIONS = array(
    '-D__cplusplus',
    '-DCLIENT_VERSION_BUILD',
    '-DCLIENT_VERSION_IS_RELEASE',
    '-DCLIENT_VERSION_MAJOR',
    '-DCLIENT_VERSION_MINOR',
    '-DCLIENT_VERSION_REVISION',
    '-DCOPYRIGHT_YEAR',
    '-DDEBUG',
  );

  public function getInfoName() {
    return 'cppcheck';
  }

  public function getInfoURI() {
    return 'http://cppcheck.sourceforge.net';
  }

  public function getInfoDescription() {
    return pht(
      'Use `%s` to perform static analysis on C/C++ code.',
      'cppcheck');
  }

  public function getLinterName() {
    return 'lint-cppcheck';
  }

  public function getLinterConfigurationName() {
    return 'lint-cppcheck';
  }

  public function getDefaultBinary() {
    return 'cppcheck';
  }

  public function getVersion() {
    list($stdout) = execx('%C --version', $this->getExecutableCommand());

    $matches = array();
    $regex = '/^Cppcheck (?P<version>\d+\.\d+)$/';
    if (preg_match($regex, $stdout, $matches)) {
      return $matches['version'];
    }

    return false;
  }

  public function getInstallInstructions() {
    return pht(
      'Install Cppcheck using `%s` or similar.',
      'apt-get install cppcheck');
  }

  protected function getDefaultFlags() {
    return array_merge(
      self::CPPCHECK_OPTIONS,
      self::CPPCHECK_DEFINITIONS
    );
  }

  protected function getMandatoryFlags() {
    return array(
      '--quiet',
      '--inline-suppr',
      '--xml',
      '--xml-version=2',
    );
  }

  public function shouldExpectCommandErrors() {
    return false;
  }

  private function isWhitelisted($path, $errorId, $errorDescription) {
    return array_key_exists($path, self::CPPCHECK_IGNORED_WARNINGS) &&
    in_array($errorDescription, self::CPPCHECK_IGNORED_WARNINGS[$path]);
  }

  private function isCheckEnabled($errorId) {
    return in_array($errorId, self::CPPCHECK_ENABLED_CHECKS);
  }

  private function isCheckDisabled($errorId) {
    return in_array($errorId, self::CPPCHECK_DISABLED_CHECKS);
  }

  protected function parseLinterOutput($path, $err, $stdout, $stderr) {
    $dom = new DOMDocument();
    $ok = @$dom->loadXML($stderr);

    if (!$ok) {
      return false;
    }

    $errors = $dom->getElementsByTagName('error');
    $messages = array();
    foreach ($errors as $error) {
      foreach ($error->getElementsByTagName('location') as $location) {
        $errorPath = Filesystem::readablePath(
          $location->getAttribute('file'), $this->getProjectRoot());
        $errorId = $error->getAttribute('id');
        $errorDescription = $error->getAttribute('msg');

        /*
         * Only raise errors related to the actual source file.
         * This prevents from printing tons of duplicates.
         */
        if ($errorPath !== $path || $this->isWhitelisted(
          $errorPath, $errorId, $errorDescription)) {
          continue;
        }

        // For errors, we work on a blacklist basis.
        // For advices and warnings, we work on a whitelist basis.
        $is_error = $error->getAttribute('severity') == 'error';
        if ($is_error && $this->isCheckDisabled($errorId)) {
          continue;
        } else if (!$is_error && !$this->isCheckEnabled($errorId)) {
          continue;
        }

        $message = new ArcanistLintMessage();
        $message->setPath($errorPath);
        $message->setLine($location->getAttribute('line'));
        $message->setCode('CPPCHECK');
        $message->setName($errorId);
        $message->setDescription($errorDescription);

        if ($is_error) {
          $message->setSeverity(ArcanistLintSeverity::SEVERITY_ERROR);
        } elseif ($error->getAttribute('inconclusive')) {
          $message->setSeverity(ArcanistLintSeverity::SEVERITY_ADVICE);
        } else {
          $message->setSeverity(ArcanistLintSeverity::SEVERITY_WARNING);
        }

        $messages[] = $message;
      }
    }

    return $messages;
  }
}
