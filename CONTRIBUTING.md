Contributing to Bitcoin ABC
===========================

The Bitcoin ABC project welcomes contributors!

This guide is intended to help developers contribute effectively to Bitcoin ABC.

Communicating with Developers
-----------------------------

To get in contact with ABC developers, we monitor a telegram supergroup.  The
intent of this group is specifically to facilitate development of Bitcoin-ABC,
and to welcome people who wish to participate.

[Join the ABC Development telegram group](https://t.me/joinchat/HCYr50mxRWjA2uLqii-psw)

Acceptable use of this supergroup includes the following:

* Introducing yourself to other ABC developers.
* Getting help with your development environment.
* Discussing how to complete a patch.

It is not for:

* Market discussion
* Non-constructive criticism

Bitcoin ABC Development Philosophy
----------------------------------

Bitcoin ABC aims for fast iteration and continuous integration.

This means that there should be quick turnaround for patches to be proposed,
reviewed, and committed. Changes should not sit in a queue for long.

Here are some tips to help keep the development working as intended. These
are guidelines for the normal and expected development process. Developers
can use their judgement to deviate from these guidelines when they have a
good reason to do so.

- Keep each change small and self-contained.
- Reach out for a 1-on-1 review so things move quickly.
- Land the Diff quickly after it is accepted.
- Don't amend changes after the Diff accepted, new Diff for another fix.
- Review Diffs from other developers as quickly as possible.
- Large changes should be broken into logical chunks that are easy to review,
and keep the code in a functional state.
- Do not mix moving stuff around with changing stuff. Do changes with renames
on their own.
- Sometimes you want to replace one subsystem by another implementation,
in which case it is not possible to do things incrementally. In such cases,
you keep both implementations in the codebase for a while, as described
[here](http://sevangelatos.com/john-carmack-on-parallel-implementations/)
- There are no "development" branches, all Diffs apply to the master
branch, and should always improve it (no regressions).
- Don't break the build, it is important to keep master green as much as possible.
If a Diff is landed, and breaks the build, fix it quickly. If it cannot be fixed
quickly, it should be reverted, and re-applied later when it no longer breaks the build.
- As soon as you see a bug, you fix it. Do not continue on. Fixing the bug becomes the
top priority, more important than completing other tasks.
- Automate as much as possible, and spend time on things only humans can do.

Here are some handy links for development practices aligned with Bitcoin ABC:

- [Developer Notes](doc/developer-notes.md)
- [Statement of Bitcoin ABC Values and Visions](https://archive.md/ulgFI)
- [How to Make Your Code Reviewer Fall in Love with You](https://mtlynch.io/code-review-love/)
- [Large Diffs Are Hurting Your Ability To Ship](https://medium.com/@kurtisnusbaum/large-diffs-are-hurting-your-ability-to-ship-e0b2b41e8acf)
- [Stacked Diffs: Keeping Phabricator Diffs Small](https://medium.com/@kurtisnusbaum/stacked-diffs-keeping-phabricator-diffs-small-d9964f4dcfa6)
- [Parallel Implementations](http://sevangelatos.com/john-carmack-on-parallel-implementations/)
- [The Pragmatic Programmer: From Journeyman to Master](https://www.amazon.com/Pragmatic-Programmer-Journeyman-Master/dp/020161622X)
- [Monorepo: Advantages of monolithic version control](https://danluu.com/monorepo/)
- [Monorepo: Why Google Stores Billions of Lines of Code in a Single Repository](https://www.youtube.com/watch?v=W71BTkUbdqE)
- [The importance of fixing bugs immediately](https://youtu.be/E2MIpi8pIvY?t=16m0s)
- [Slow Deployment Causes Meetings](https://www.facebook.com/notes/kent-beck/slow-deployment-causes-meetings/1055427371156793/)
- [Good Work, Great Work, and Right Work](https://forum.dlang.org/post/q7u6g1$94p$1@digitalmars.com)
- [Accelerate: The Science of Lean Software and DevOps](https://www.amazon.com/Accelerate-Software-Performing-Technology-Organizations/dp/1942788339)
- [Facebook Engineering Process with Kent Beck](https://softwareengineeringdaily.com/2019/08/28/facebook-engineering-process-with-kent-beck/)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
- [Step-by-step: Programming incrementally](https://ourmachinery.com/post/step-by-step-programming-incrementally/)
- [Semantic Compression](https://caseymuratori.com/blog_0015)

Getting set up with the Bitcoin ABC Repository
----------------------------------------------

1. Create an account at [reviews.bitcoinabc.org](https://reviews.bitcoinabc.org/)

2. Install Git and Arcanist on your machine

Git documentation can be found at [git-scm.com](https://git-scm.com/).

For Arcanist documentation, you can read
[Arcanist Quick Start](https://secure.phabricator.com/book/phabricator/article/arcanist_quick_start/)
and the [Arcanist User Guide](https://secure.phabricator.com/book/phabricator/article/arcanist/).

To install these packages on Debian or Ubuntu, type: `sudo apt-get install git arcanist`

3. If you do not already have an SSH key set up, follow these steps:

Type: `ssh-keygen -t rsa -b 4096 -C "your_email@example.com"`

Enter a file in which to save the key (/home/*username*/.ssh/id_rsa): [Press enter]

4. Upload your SSH public key to <https://reviews.bitcoinabc.org>

  - Go to: `https://reviews.bitcoinabc.org/settings/user/*username*/page/ssh/`

  - Under "SSH Key Actions", Select "Upload Public Key"

Paste contents from: `/home/*username*/.ssh/id_rsa.pub`

5. Clone the repository and install Arcanist certificate:

```
git clone ssh://vcs@reviews.bitcoinabc.org:2221/source/bitcoin-abc.git

cd bitcoin-abc

arc install-certificate
```

Note: Arcanist tooling will tend to fail if your remote origin is set to something other
than the above.  A common mistake is to clone from Github and then forget to update
your remotes.

Follow instructions provided by `arc install-certificate` to provide your API token.

Contributing to the node software
---------------------------------

During submission of patches, arcanist will automatically run `arc lint` to
enforce Bitcoin ABC code formatting standards, and often suggests changes.
If code formatting tools do not install automatically on your system, you
will have to install the following:

On Ubuntu 20.04:
```
sudo apt-get install clang-format clang-tidy clang-tools cppcheck python3-isort python3-autopep8 flake8 php-codesniffer yamllint
```

If not available in the distribution, `clang-format-10` and `clang-tidy` can be
installed from <https://releases.llvm.org/download.html> or <https://apt.llvm.org>.

On Debian (>= 10), the clang-10 family of tools is available from the https://apt.llvm.org/ repository:
```
wget https://apt.llvm.org/llvm.sh
chmod +x llvm.sh
sudo ./llvm.sh 10
```

For example, for macOS:
```
curl -L https://github.com/llvm/llvm-project/releases/download/llvmorg-10.0.0/clang+llvm-10.0.0-x86_64-apple-darwin.tar.xz | tar -xJv
ln -s $PWD/clang+llvm-10.0.0-x86_64-apple-darwin/bin/clang-format /usr/local/bin/clang-format
ln -s $PWD/clang+llvm-10.0.0-x86_64-apple-darwin/bin/clang-tidy /usr/local/bin/clang-tidy
```

If you are modifying a python script, you will need to install `mypy` and `isort`.
The minimum required version for `mypy` is 0.780, because the previous ones are
known to have issues with some python type annotations.
On Debian based systems, this can be installed via:
```
sudo apt-get install python3-pip
pip3 install isort==5.6.4 mypy==0.780
echo "export PATH=\"`python3 -m site --user-base`/bin:\$PATH\"" >> ~/.bashrc
source ~/.bashrc
```

If you are modifying a shell script, you will need to install the `shellcheck` linter.
A recent version is required and may not be packaged for your distribution.
Standalone binaries are available for download on
[the project's github release page](https://github.com/koalaman/shellcheck/releases).

**Note**: In order for arcanist to detect the `shellcheck` executable, you need to make it available in your `PATH`;
if another version is already installed, make sure the recent one is found first.
Arcanist will tell you what version is expected and what is found when running `arc lint` against a shell script.


If you are running Debian 10, it is also available in the backports repository:
```
sudo apt-get -t buster-backports install shellcheck
```

Contributing to the web projects
--------------------------------

To contribute to web projects, you will need `nodejs` > 15 and `npm` > 6.14.8.
Follow these [installation instructions](https://github.com/nvm-sh/nvm#installing-and-updating)
to install `nodejs` with node version manager.

Then:

```
cd bitcoin-abc
[sudo] nvm install 15
[sudo] npm install -g npm@latest
[sudo] npm install -g prettier
```

To work on the extension, you will need `browserify`

```
[sudo] npm install -g browserify
```

Working with The Bitcoin ABC Repository
---------------------------------------

A typical workflow would be:

- Create a topic branch in Git for your changes

    git checkout -b 'my-topic-branch'

- Make your changes, and commit them

    git commit -a -m 'my-commit'

- Create a differential with Arcanist

    arc diff

You should add suggested reviewers and a test plan to the commit message.
Note that Arcanist is set up to look only at the most-recent commit message,
So all you changes for this Diff should be in one Git commit.

- For large changes, break them into several Diffs, as described in this
[guide](https://medium.com/@kurtisnusbaum/stacked-diffs-keeping-phabricator-diffs-small-d9964f4dcfa6).
You can also include "Depends on Dxxx" in the Arcanist message to indicate
dependence on other Diffs.

- Log into Phabricator to see review and feedback.

- Make changes as suggested by the reviewers. You can simply edit the files
with my-topic-branch checked out, and then type `arc diff`. Arcanist will
give you the option to add uncommited changes. Or, alternatively, you can
commit the changes using `git commit -a --am` to add them to the last commit,
or squash multiple commits by typing `git rebase -i master`. If you squash,
make sure the commit message has the information needed for arcanist (such
as the Diff number, reviewers, etc.).

- Update your Diff by typing `arc diff` again.

- When reviewers approve your Diff, it should be listed as "ready to Land"
in Phabricator. When you want to commit your diff to the repository, check out
type my-topic-branch in git, then type `arc land`. You have now successfully
committed a change to the Bitcoin ABC repository.

- When reviewing a Diff, apply the changeset on your local by using
`arc patch D{NNNN}`

- You will likely be re-writing git histories multiple times, which causes
timestamp changes that require re-building a significant number of files. It's
highly recommended to install `ccache` (re-run cmake if you install it
later), as this will help cut your re-build times from several minutes to under
a minute, in many cases.

What to work on
---------------

If you are looking for a useful task to contribute to the project, a good place
to start is the list of tasks at <https://reviews.bitcoinabc.org/maniphest>.

You could also try [backporting](doc/backporting.md) some code from Bitcoin Core.

Copyright
---------

By contributing to this repository, you agree to license your work under the
MIT license unless specified otherwise in `contrib/debian/copyright` or at
the top of the file itself. Any work contributed where you are not the original
author must contain its license header with the original author(s) and source.

Disclosure Policy
-----------------

See [DISCLOSURE_POLICY](DISCLOSURE_POLICY.md).
