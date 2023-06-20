# Contributing to Electrum ABC

The Electrum ABC project welcomes contributors!

This guide is intended to help developers and non-developers contribute effectively to the project.

The development philosophy and communication channels are identical to the ones
used by the Bitcoin-ABC project. Please read the relevant sections in
[Bitcoin ABC's CONTRIBUTING.md document](https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md).

The rest of this document provides information that is specific to
Electrum ABC.

## Contributing to the development

### Getting set up with the Electrum ABC Repository

Electrum ABC is hosted on Github.com. To contribute to the repository,
you should start by creating an account on github.com.

You will then need to clone the main repository. For that, navigate to
https://github.com/bitcoin-abc/ElectrumABC, and click the *Fork* button
that is on the top right of the window. This will create a new github
repository that is under your own management.

If your Github username is *your_username*, you will now have a copy of
the Electrum ABC repository at the address
`https://github.com/your_username/ElectrumABC`

Next, you must clone your github repository on your own computer,
so that you can actually edit the files. The simplest way
of doing this is to use the HTTPS link of your remote repository:

```shell
git clone https://github.com/your_username/ElectrumABC.git
```

This has the drawback of requiring you to type your password every time
you want to use a git command to interact with your remote repository.
To avoid this, you can also connect to GitHub with SSH. This is a bit more
complicated to set up initially, but will save you time on the long run.
You can read more on this subject here:
[Connecting to GitHub with SSH](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/connecting-to-github-with-ssh)

Now you should have a local directory named `ElectrumABC`, with a single
remote repository named `origin`. This remote was set up automatically by
the git clone command. You can check this using the `git remote -v` command.

```shell
$ cd ElectrumABC
$ git remote -v
origin	git@github.com:your_username/ElectrumABC.git (fetch)
origin	git@github.com:your_username/ElectrumABC.git (push)
```

The next step is to also add the main repository to the available
remote repositories. Call it `upstream`.

```shell
$ git remote add upstream https://github.com/Bitcoin-ABC/ElectrumABC.git
$ git remote -v
origin	git@github.com:your_username/ElectrumABC.git (fetch)
origin	git@github.com:your_username/ElectrumABC.git (push)
upstream	https://github.com/Bitcoin-ABC/ElectrumABC.git (fetch)
upstream	https://github.com/Bitcoin-ABC/ElectrumABC.git (push)
```

Before writing or editing code, you must set-up pre-commit hooks to enforce
a consistent code style.
This is done by installing the  [`pre-commit` tool](https://pre-commit.com/), and
then running `pre-commit install` in the root directory of the project.

```shell
pip install pre-commit
pre-commit install
```

You are now ready to contribute to Electrum ABC.

### Development workflow

This section is a summary of a typical development workflow. It assumes that
you are already familiar with *git*. If you aren't, start by reading a tutorial
on that topic, for instance:
[Starting with an Existing Project | Learn Version Control with Git](https://www.git-tower.com/learn/git/ebook/en/command-line/basics/working-on-your-project/#start)

After the initial set up, your local repository should be in the same
state as the main repository. However, the remote repository will change
as other people contribute code. So before you start working on any
development, be sure to synchronize your local `master` branch with `upstream`.

```shell
git checkout master
git pull upstream master
```

Now, create a local development branch with a descriptive name. For instance,
if you want to fix a typo in the `README` file, you could call it
`readme_typo_1`

```shell
git checkout -b readme_typo_1
```

The next step is to edit the source files in your local repository and
commit the changes as you go. It is advised to test your changes after
each commit, and to add a *test plan* in your commit message.
Each new commit should be strictly an improvement, and should not break
any existing feature. When you are finished, push your
branch to your own remote repository:

```shell
git push origin readme_typo_1
```

Now go to GitHub. The new branch will show up with a green Pull Request button.
Make sure the title and message are clear, concise, and self-explanatory.
Then click the button to submit it. Your pull request will be reviewed by
other contributors.

Address the reviewer's feedback by editing the local commits and pushing them
again to your repository with `git push -f`. Editing a past commit requires
more advanced git skills. See
[Rewriting history](https://www.atlassian.com/git/tutorials/rewriting-history/git-rebase).
If you don't feel confident enough to do this, you can fix the code by adding new
commits and the reviewer can take care of rebasing the changes.
But we encourage you to try first, and feel free to ask for help.

GitHub will automatically show your new changes in the pull request after you push
them to your remote repository, but the reviewer might not be aware of the changes.
So you should post a reply in the pull request's *Conversation* to notify him of
the changes.

### General guidelines

Electrum ABC adheres to standard Python style guidelines and good practices.
To ensure that your contributions respect those common guidelines, it is
recommended to use a recent IDE that includes a linter, such as PyCharm
or Sublime Text with the SublimeLinter plugin, and to not ignore any
codestyle violation warning.

Alternatively, you can manually run a linter on your code such as
[`flake8`](https://pypi.org/project/flake8/).

The initial codebase does not strictly adhere to style guidelines, and we do
not plan to immediately fix this problem for the entire codebase, as this would
make backports from Electron Cash harder. But any new code, or existing code
that is modified, should be fixed.

Automatic formatting is achieved using pre-commit hooks that run the following
formatting tools:
- [`isort`](https://pycqa.github.io/isort/)
- [`black`](https://github.com/psf/black)

The code should be documented and tested.

## Other ways of contributing

In addition to submitting pull requests to improve the software or its documentation,
there are a few other ways you can help.

### Running an Electrum server

Electrum ABC relies on a network of SPV servers. If you can run a full node and
a public Electrum server, this will improve the resiliency of the network by
providing on more server for redundancy.

You will need to keep your node software updated, especially around hard fork dates.

If you run a such an Electrum server, you can contact us to have it added
to the [list of trusted servers](electrumabc/servers.json), or submit
a pull request to add it yourself. You can run such a server for the mainnet
or for the [testnet](electrumabc/servers.json).

See https://github.com/cculianu/Fulcrum for how to run a SPV server.

### Translations

The messages displayed in the graphical interface need to be translated in
as many languages as possible. At the moment, Electrum ABC is still using the
[Electron Cash translations](https://crowdin.com/project/electron-cash) from
the date of the fork. As the Electrum ABC graphical interface will slowly
diverge from Electron Cash, we will need to update the translations
accordingly.

If you are interested in helping to set up and manage a separate translation
project for Electrum ABC, feel free to contact us on github.

### Reviewing pull requests

Contributing code is great, but all new code must also be reviewed before being
added to the repository. The review process can be a bottleneck, when other
contributors are very busy. Feel free to review any open pull request, as
having multiple reviewers increase the chances of spotting bugs before they
can cause any damage.

See [Linus's law](https://en.wikipedia.org/wiki/Linus%27s_law).
