<?php

/**
 * Check for locale dependent functions.
 * Unnecessary locale dependence can cause bugs that are very tricky to isolate
 * and fix.
 *
 * Be aware that bitcoind and bitcoin-qt differ in terms of localization: Qt
 * opts in to POSIX localization by running setlocale(LC_ALL, "") on startup,
 * whereas no such call is made in bitcoind.
 *
 * Qt runs setlocale(LC_ALL, "") on initialization. This installs the locale
 * specified by the user's LC_ALL (or LC_*) environment variable as the new
 * C locale.
 *
 * In contrast, bitcoind does not opt in to localization -- no call to
 * setlocale(LC_ALL, "") is made and the environment variables LC_* are
 * thus ignored.
 *
 * This results in situations where bitcoind is guaranteed to be running
 * with the classic locale ("C") whereas the locale of bitcoin-qt will vary
 * depending on the user's environment variables.
 *
 * An example: Assuming the environment variable LC_ALL=de_DE then the
 * call std::to_string(1.23) will return "1.230000" in bitcoind but
 * "1,230000" in bitcoin-qt.
 *
 * From the Qt documentation:
 * "On Unix/Linux Qt is configured to use the system locale settings by default.
 *  This can cause a conflict when using POSIX functions, for instance, when
 *  converting between data types such as floats and strings, since the notation
 *  may differ between locales. To get around this problem, call the POSIX
 *  function setlocale(LC_NUMERIC,"C") right after initializing QApplication,
 *  QGuiApplication or QCoreApplication to reset the locale that is used for
 *  number formatting to "C"-locale."
 *
 * See https://doc.qt.io/qt-5/qcoreapplication.html#locale-settings and
 * https://stackoverflow.com/a/34878283 for more details.
 */
final class LocaleDependenceLinter extends ArcanistLinter {

  const KNOWN_VIOLATIONS = array(
    "src/bitcoin-tx.cpp" => [
      "stoul",
      "trim_right",
    ],
    "src/dbwrapper.cpp" => [
        "stoul",
        "vsnprintf"
    ],
    "src/httprpc.cpp" => ["trim"],
    "src/node/blockstorage.cpp" => ["atoi"],
    "src/netbase.cpp" => ["to_lower"],
    "src/qt/rpcconsole.cpp" => [
      "atoi",
    ],
    "src/rest.cpp" => ["strtol"],
    "src/rpc/server.cpp" => ["to_upper"],
    "src/test/dbwrapper_tests.cpp" => ["snprintf"],
    "src/test/getarg_tests.cpp" => [
      "split",
      "is_space",
    ],
    "src/seeder/main.cpp" => [
        "strtoull",
        "strcasecmp",
        "strftime",
    ],
    "src/seeder/dns.cpp" => ["strcasecmp"],
    "src/torcontrol.cpp" => [
      "atoi",
      "strtol",
    ],
    "src/test/fuzz/locale.cpp" => [
      "atoi",
      "setlocale",
    ],
    "src/test/fuzz/parse_numbers.cpp" => ["atoi"],
    "src/common/args.cpp" => ["atoi"],
    "src/util/strencodings.cpp" => [
      "atoi",
      "strtol",
      "strtoll",
      "strtoul",
      "strtoull",
    ],
    "src/util/strencodings.h" => ["atoi"],
  );

  const LOCALE_DEPENDENT_FUNCTIONS = array(
    "alphasort",   // LC_COLLATE (via strcoll)
    "asctime",     // LC_TIME (directly)
    "asprintf",    // (via vasprintf)
    "atof",        // LC_NUMERIC (via strtod)
    "atoi",        // LC_NUMERIC (via strtol)
    "atol",        // LC_NUMERIC (via strtol)
    "atoll",       // (via strtoll)
    "atoq",
    "btowc",       // LC_CTYPE (directly)
    "ctime",       // (via asctime or localtime)
    "dprintf",     // (via vdprintf)
    "fgetwc",
    "fgetws",
    "fold_case",   // boost::locale::fold_case
    "fprintf",     // (via vfprintf)
    "fputwc",
    "fputws",
    "fscanf",      // (via __vfscanf)
    "fwprintf",    // (via __vfwprintf)
    "getdate",     // via __getdate_r => isspace // __localtime_r
    "getwc",
    "getwchar",
    "is_digit",    // boost::algorithm::is_digit
    "is_space",    // boost::algorithm::is_space
    "isalnum",     // LC_CTYPE
    "isalpha",     // LC_CTYPE
    "isblank",     // LC_CTYPE
    "iscntrl",     // LC_CTYPE
    "isctype",     // LC_CTYPE
    "isdigit",     // LC_CTYPE
    "isgraph",     // LC_CTYPE
    "islower",     // LC_CTYPE
    "isprint",     // LC_CTYPE
    "ispunct",     // LC_CTYPE
    "isspace",     // LC_CTYPE
    "isupper",     // LC_CTYPE
    "iswalnum",    // LC_CTYPE
    "iswalpha",    // LC_CTYPE
    "iswblank",    // LC_CTYPE
    "iswcntrl",    // LC_CTYPE
    "iswctype",    // LC_CTYPE
    "iswdigit",    // LC_CTYPE
    "iswgraph",    // LC_CTYPE
    "iswlower",    // LC_CTYPE
    "iswprint",    // LC_CTYPE
    "iswpunct",    // LC_CTYPE
    "iswspace",    // LC_CTYPE
    "iswupper",    // LC_CTYPE
    "iswxdigit",   // LC_CTYPE
    "isxdigit",    // LC_CTYPE
    "localeconv",  // LC_NUMERIC + LC_MONETARY
    "mblen",       // LC_CTYPE
    "mbrlen",
    "mbrtowc",
    "mbsinit",
    "mbsnrtowcs",
    "mbsrtowcs",
    "mbstowcs",    // LC_CTYPE
    "mbtowc",      // LC_CTYPE
    "mktime",
    "normalize",   // boost::locale::normalize
    "printf",      // LC_NUMERIC
    "putwc",
    "putwchar",
    "scanf",       // LC_NUMERIC
    "setlocale",
    "snprintf",
    "sprintf",
    "sscanf",
    "std::locale::global",
    "std::to_string",
    "stod",
    "stof",
    "stoi",
    "stol",
    "stold",
    "stoll",
    "stoul",
    "stoull",
    "strcasecmp",
    "strcasestr",
    "strcoll",     // LC_COLLATE
    //"strerror"
    "strfmon",
    "strftime",    // LC_TIME
    "strncasecmp",
    "strptime",
    "strtod",      // LC_NUMERIC
    "strtof",
    "strtoimax",
    "strtol",      // LC_NUMERIC
    "strtold",
    "strtoll",
    "strtoq",
    "strtoul",     // LC_NUMERIC
    "strtoull",
    "strtoumax",
    "strtouq",
    "strxfrm",     // LC_COLLATE
    "swprintf",
    "to_lower",    // boost::locale::to_lower
    "to_title",    // boost::locale::to_title
    "to_upper",    // boost::locale::to_upper
    "tolower",     // LC_CTYPE
    "toupper",     // LC_CTYPE
    "towctrans",
    "towlower",    // LC_CTYPE
    "towupper",    // LC_CTYPE
    "trim",        // boost::algorithm::trim
    "trim_left",   // boost::algorithm::trim_left
    "trim_right",  // boost::algorithm::trim_right
    "ungetwc",
    "vasprintf",
    "vdprintf",
    "versionsort",
    "vfprintf",
    "vfscanf",
    "vfwprintf",
    "vprintf",
    "vscanf",
    "vsnprintf",
    "vsprintf",
    "vsscanf",
    "vswprintf",
    "vwprintf",
    "wcrtomb",
    "wcscasecmp",
    "wcscoll",     // LC_COLLATE
    "wcsftime",    // LC_TIME
    "wcsncasecmp",
    "wcsnrtombs",
    "wcsrtombs",
    "wcstod",      // LC_NUMERIC
    "wcstof",
    "wcstoimax",
    "wcstol",      // LC_NUMERIC
    "wcstold",
    "wcstoll",
    "wcstombs",    // LC_CTYPE
    "wcstoul",     // LC_NUMERIC
    "wcstoull",
    "wcstoumax",
    "wcswidth",
    "wcsxfrm",     // LC_COLLATE
    "wctob",
    "wctomb",      // LC_CTYPE
    "wctrans",
    "wctype",
    "wcwidth",
    "wprintf",
  );

  const LOCALE_DEPENDENCE_ERROR = 1;

  const ADVICE_MESSAGE = <<<ADVICE
Unnecessary locale dependence can cause bugs and should be avoided.
Otherwise an exception can be added to the LocaleDependenceLinter.php linter.
ADVICE;

  public function getInfoName() {
    return 'lint-locale-dependence';
  }

  public function getInfoURI() {
    return '';
  }

  public function getInfoDescription() {
    return pht('Throw an error when functions relying on the system locale '.
      'are used.');
  }

  public function getLinterName() {
    return 'lint-locale-dependence';
  }

  public function getLinterConfigurationName() {
    return 'lint-locale-dependence';
  }

  public function getLinterConfigurationOptions() {
    $options = array();
    return $options + parent::getLinterConfigurationOptions();
  }

  public function getLintSeverityMap() {
    return array(
      self::LOCALE_DEPENDENCE_ERROR => ArcanistLintSeverity::SEVERITY_ERROR,
    );
  }

  public function getLintNameMap() {
    return array(
      self::LOCALE_DEPENDENCE_ERROR => pht('Locale dependent function'),
    );
  }

  public function lintPath($path) {
    $absolutePath = Filesystem::resolvePath($path, $this->getProjectRoot());
    $fileContent = file($absolutePath, FILE_SKIP_EMPTY_LINES);

    // Flag if the path is part of the known exceptions
    $exceptions = array();
    if (array_key_exists($path, self::KNOWN_VIOLATIONS)) {
      $exceptions = self::KNOWN_VIOLATIONS[$path];
    }

    $anyFunction = implode("|", self::LOCALE_DEPENDENT_FUNCTIONS);
    $pattern = "/[^\w`'\"<>](?P<function>".$anyFunction."(_r|_s)?)[^\w`'\"<>]/";

    foreach ($fileContent as $lineNumber => $lineContent) {
      // Filter comments and string constants
      if (preg_match("#^\s*(//|\*|/\*|\")#", $lineContent)) {
        continue;
      }

      /*
       * Find the locale dependent functions occurrences.
       * There can be multiple occurrences for a single line.
       */
      if (preg_match_all($pattern, $lineContent, $matches,
        PREG_OFFSET_CAPTURE)) {
        foreach($matches["function"] as $function) {
          list($functionName, $offset) = $function;

          // Filter known exceptions
          if (!in_array($functionName, $exceptions)) {
            $this->raiseLintAtLine(
              $lineNumber + 1,
              $offset + 1,
              self::LOCALE_DEPENDENCE_ERROR,
              self::ADVICE_MESSAGE,
              $functionName);
          }
        }
      }
    }
  }
}
