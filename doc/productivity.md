Productivity Notes
==================

Table of Contents
-----------------

* [General](#general)
   * [Cache compilations with `ccache`](#cache-compilations-with-ccache)
   * [Disable features with `cmake`](#disable-features-with-configure)
  * [Multiple working directories with `git worktrees`](#multiple-working-directories-with-git-worktrees)
* [Rebasing/Merging code](#rebasingmerging-code)
   * [More conflict context with `merge.conflictstyle diff3`](#more-conflict-context-with-mergeconflictstyle-diff3)
* [Reviewing code](#reviewing-code)
   * [Reduce mental load with `git diff` options](#reduce-mental-load-with-git-diff-options)
   * [Reference PRs easily with `refspec`s](#reference-prs-easily-with-refspecs)
   * [Diff the diffs with `git range-diff`](#diff-the-diffs-with-git-range-diff)

General
------

### Cache compilations with `ccache`

The easiest way to faster compile times is to cache compiles. `ccache` is a way to do so, from its description at the time of writing:

> ccache is a compiler cache. It speeds up recompilation by caching the result of previous compilations and detecting when the same compilation is being done again. Supported languages are C, C++, Objective-C and Objective-C++.

Install `ccache` through your distribution's package manager, and run `cmake` with your normal flags to pick it up.

To use ccache for all your C/C++ projects, follow the symlinks method [here](https://ccache.samba.org/manual/latest.html#_run_modes) to set it up.

### Disable features with `cmake`

You can disable features to save on compilation time. A few common flags:

```sh
-DENABLE_UPNP=OFF
-DBUILD_BITCOIN_WALLET=OFF
-DBUILD_BITCOIN_QT=OFF
```

See [Options passed to cmake](dependencies.md#options-passed-to-cmake)

### Multiple working directories with `git worktrees`

If you work with multiple branches or multiple copies of the repository, you should try `git worktrees`.

To create a new branch that lives under a new working directory without disrupting your current working directory (useful for creating pull requests):
```sh
git worktree add -b my-shiny-new-branch ../living-at-my-new-working-directory based-on-my-crufty-old-commit-ish
```

To simply check out a commit-ish under a new working directory without disrupting your current working directory (useful for reviewing pull requests):
```sh
git worktree add --checkout ../where-my-checkout-commit-ish-will-live my-checkout-commit-ish
```

-----

This synergizes well with [`ccache`](#cache-compilations-with-ccache) as objects resulting from unchanged code will most likely hit the cache and won't need to be recompiled.

You can also set up [upstream refspecs](#reference-prs-easily-with-refspecs) to refer to pull requests easier in the above `git worktree` commands.

Rebasing/Merging code
-------------

### More conflict context with `merge.conflictstyle diff3`

For resolving merge/rebase conflicts, it can be useful to enable diff3 style using `git config merge.conflictstyle diff3`. Instead of

```diff
<<<
yours
===
theirs
>>>
```

  you will see

```diff
<<<
yours
|||
original
===
theirs
>>>
```

This may make it much clearer what caused the conflict. In this style, you can often just look at what changed between *original* and *theirs*, and mechanically apply that to *yours* (or the other way around).

Reviewing code
--------------

### Reduce mental load with `git diff` options

When reviewing patches which change indentation in C++ files, use `git diff -w` and `git show -w`. This makes the diff algorithm ignore whitespace changes. This feature is also available on github.com, by adding `?w=1` at the end of any URL which shows a diff.

When reviewing patches that change symbol names in many places, use `git diff --word-diff`. This will instead of showing the patch as deleted/added *lines*, show deleted/added *words*.

When reviewing patches that move code around, try using `git diff --patience commit~:old/file.cpp commit:new/file/name.cpp`, and ignoring everything except the moved body of code which should show up as neither `+` or `-` lines. In case it was not a pure move, this may even work when combined with the `-w` or `--word-diff` options described above. `--color-moved=dimmed-zebra` will also dim the coloring of moved hunks in the diff on compatible terminals.

### Reference PRs easily with `refspec`s

When looking at other's pull requests, it may make sense to add the following section to your `.git/config` file:

```
[remote "upstream-pull"]
        fetch = +refs/pull/*:refs/remotes/upstream-pull/*
        url = git@github.com:bitcoin/bitcoin.git
```

This will add an `upstream-pull` remote to your git repository, which can be fetched using `git fetch --all` or `git fetch upstream-pull`. Afterwards, you can use `upstream-pull/NUMBER/head` in arguments to `git show`, `git checkout` and anywhere a commit id would be acceptable to see the changes from pull request NUMBER.

### Diff the diffs with `git range-diff`

It is very common for contributors to rebase their pull requests, or make changes to commits (perhaps in response to review) that are not at the head of their branch. This poses a problem for reviewers as when the contributor force pushes, the reviewer is no longer sure that his previous reviews of commits are still valid (as the commit hashes can now be different even though the diff is semantically the same). `git range-diff` can help solve this problem by diffing the diffs.

For example, to identify the differences between your previously reviewed diffs P1-5, and the new diffs P1-2,N3-4 as illustrated below:
```
       P1--P2--P3--P4--P5   <-- previously-reviewed-head
      /
...--m   <-- master
      \
       P1--P2--N3--N4--N5   <-- new-head (with P3 slightly modified)
```

You can do:
```sh
git range-diff master previously-reviewed-head new-head
```

Note that `git range-diff` also work for rebases.

-----

`git range-diff` also accepts normal `git diff` options, see [Reduce mental load with `git diff` options](#reduce-mental-load-with-git-diff-options) for useful `git diff` options.

You can also set up [upstream refspecs](#reference-prs-easily-with-refspecs) to refer to pull requests easier in the above `git range-diff` commands.
