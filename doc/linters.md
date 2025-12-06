Linters
=======

The Bitcoin ABC project makes heavy use of linters to ensure consistency between
the various source files and prevent some common issues. A list of all the
linters can be found in the `.arclint` file at the root of the project.

Installation
------------

The installation instructions for all the linters can be found in the
[CONTRIBUTING document](/CONTRIBUTING.md).

Usage
-----

The linters are called via `arcanist` and only apply to the files changed by the
current commit. To lint the files, use `arc lint`. Note that this is
automatically run before each diff submission via `arc diff`.

Because some linters may conflict with each others, there are cases where
several rounds of linting are required to fix all the reported issues. It is
advised to run `arc lint` repeatidly until there is no error before submitting a
diff to review.

Linting all the files
---------------------

Under some special circumstances (e.g. when adding a new linter), it might be
required to lint all the files from the repository. This is achieved by running
the `arc lint --everything` command. Be patient, this will take several minutes
to complete as it runs all the linters to all the relevant files.

Depending on what part of the code you have been working on, you might be
missing some `eslint` plugins which are installed for each project during
development, and that will cause `arc lint --everything` to fail. The required
plugins can be installed all at once via the following command, called from the
root of the repository:

```
pnpm install --frozen-lockfile
```

Linter development
------------------

There are 2 options for adding a new linter:
 - An external tool already exists to execute the linting process;
 - Or the linter is created from scratch.

In the first case, the [CONTRIBUTING document](/CONTRIBUTING.md) should be
updated to include the new linter as a required tool for development, and an
arcanist wrapper has to be created if it doesn't already exist. A list of the
arcanist built-in linters can be retrieved by running `arc linters`. If no
built-in wrapper exists, it is possible to add one. See the various examples
already available in the [arcanist/linter directory](/arcanist/linter/). Such a
linter will extend the `ArcanistExternalLinter` base class.

In the second case, the linter has to be created from scratch, and extend the
`ArcanistLinter` base class. Since there is no external tool, no installation
instruction is required. There are also several examples available in the
[arcanist/linter directory](/arcanist/linter/).

After you created your linter, the arcanist class loader needs to be updated.
This is done by running `arc liberate` from the root of the repository.

The last step is to add an entry for your new linter to the
[.arclint](/.arclint) so it can be automatically called on all the relevant
files via `arc lint`.

**Development tricks**

It is possible to force arcanist to run the linters against one or more files:

```
arc lint -- <path_to_your_file_or_glob>
```

To display the execution flow of arcanist, use `arc lint --trace`.
