<?php

/**
 * Lands a revision by sending it to a remote land bot service.
 */
final class ArcanistLandBotWorkflow extends ArcanistWorkflow {

  public function getWorkflowName() {
    return 'land-via-bot';
  }

  public function getCommandSynopses() {
    return phutil_console_format(<<<EOTEXT
      **land-via-bot** [__options__] [__ref__]
EOTEXT
      );
  }

  public function getCommandHelp() {
    return phutil_console_format(<<<EOTEXT
          Publish an accepted revision after review. This command is the last
          step in the standard Differential code review workflow.

          This command queues a revision to be landed by a remote land bot,
          changes for which are sitting in __ref__, which is usually the name
          of a local branch.  Without __ref__, the current working copy state
          will be used.

          Prior to landing the revision, the land bot may run smoke tests and
          other checks to ensure master is always in a stable state. The land
          bot may also make automated adjustments to your patch as necessary.

          With **--hold** or **--preview**, execution will be similar to
          passing the same options to 'arc land'.
EOTEXT
      );
  }

  public function requiresWorkingCopy() {
    return true;
  }

  public function requiresConduit() {
    return true;
  }

  public function requiresAuthentication() {
    return true;
  }

  public function requiresRepositoryAPI() {
    return true;
  }

  public function getArguments() {
    return array(
      'hold' => array(
        'help' => pht(
          'Prepare the change to be pushed to the land queue, but do not '.
          'actually push it.'),
      ),
      'preview' => array(
        'help' => pht(
          'Prints the commits that would be landed. Does not actually modify '.
          'or land the commits.'),
      ),
      'revision' => array(
        'param' => 'id',
        'help' => pht(
          'Land a specific revision, rather than inferring the revision '.
          'based on branch content.'),
      ),
      '*' => 'branch',
    );
  }

  public function run() {
    // Make sure gpg is installed
    try {
      execx('command -v gpg');
    } catch (Exception $e) {
      throw new ArcanistUsageException(pht(
        'gpg not found. Try installing it first.'));
    }

    // Determine the branch you are currently on so we can return to it later
    $repositoryApi = $this->getRepositoryAPI();
    $oldBranch = $repositoryApi->getBranchName();
    if (!strlen($oldBranch)) {
      $oldBranch = $repositoryApi->getWorkingCopyRevision();
    }

    // Run the default land workflow to take advantage of various sanity checks
    // and fetch the revision ID if it's not set via --revision.
    $landArgs = array();
    if ($this->getArgument('preview')) {
      array_push($landArgs, '--preview');
    } else {
      // Always hold the revision since we are not using 'arc land' to actually
      // land the change.
      array_push($landArgs, '--hold');
    }

    $revision = $this->getArgument('revision');
    if ($revision) {
      array_push($landArgs, '--revision');
      array_push($landArgs, $revision);
    }

    $branch = $this->getArgument('branch');
    if (!empty($branch)) {
      array_push($landArgs, $branch[0]);
    }

    $landWorkflow = $this->buildChildWorkflow('land', $landArgs);
    $landWorkflow->run();

    if ($this->getArgument('preview')) {
      return 0;
    }

    // Whether --revision was set or not, we need a formatted revision ID
    $revision = 'D' . $landWorkflow->getRevisionDict()['id'];

    if ($this->getArgument('hold')) {
      echo phutil_console_format(pht(
        'Revision %s will not be queued with the land bot.', $revision) . "\n");
      return 0;
    }

    // Checkout the branch you were on previously
    $repositoryApi->execxLocal('checkout %s', $oldBranch);

    // Encrypt your Conduit token to securely pass it to the land bot
    $workingCopy = $repositoryApi->getWorkingCopyIdentity();
    $pubkeyFile = $workingCopy->getProjectPath(
      './contrib/source-control-tools/land-patch.pub');
    $token = $this->getConduit()->getConduitToken();
    list($encryptedToken) = execx(
      'echo %s | gpg --armor -o- --encrypt --recipient-file %s',
      $token, $pubkeyFile);

    // Clear and delete the unencrypted $token
    $tokenLen = strlen($token);
    for ($i = 0; $i < $tokenLen; $i++) {
      $token[$i] = "\0";
    }
    unset($token);

    // Get the configured committer name and email similar to how
    // ArcanistGitAPI::getAuthor() does. Arcanist provides no API for this.
    list($gitIdent) = $repositoryApi->execxLocal('var GIT_COMMITTER_IDENT');
    $committerName = preg_replace('/\s+<.*/', '',
      rtrim($gitIdent, "\n"));
    preg_match('/<(.*)>/', rtrim($gitIdent, "\n"),
      $gitAuthorEmailMatches);
    $committerEmail = $gitAuthorEmailMatches[1];

    // Prepare cURL request to land bot
    $ch = curl_init('https://buildbot.bitcoinabc.org/land');
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
      'Content-Type:application/json', 'Accept:application/json'));
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array(
      "committerName" => $committerName,
      "committerEmail" => $committerEmail,
      "revision" => $revision,
      "conduitToken" => $encryptedToken)));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    echo phutil_console_format(pht(
      'Pushing revision %s to land bot queue...', $revision) . "\n\n");

    $response = curl_exec($ch);
    if (!$response) {
      throw new ArcanistUsageException(pht(
        'Error pushing to land bot queue: %s', curl_error($ch)) . "\n");
    }

    $jsonResponse = json_decode($response);
    if (!$jsonResponse) {
      throw new ArcanistUsageException(pht(
        'JSON decoding error: %d', json_last_error()) . "\n");
    }

    echo phutil_console_format("<bg:blue>** " .
      pht('Your revision is in the queue:') . " **</bg>\n\n");
    echo phutil_console_format(
      pht('Revision:') . "\thttps://reviews.bitcoinabc.org/%s\n", $revision);
    echo phutil_console_format(pht('Build log:') . "\t%s\n",
      $jsonResponse->webUrl . '&tab=buildLog&guest=1');

    curl_close($ch);
    return 0;
  }

}
