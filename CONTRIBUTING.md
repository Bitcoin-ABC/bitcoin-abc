Contributing to Bitcoin ABC
===========================

The Bitcoin ABC project welcomes contributors!

This guide is intended to help developers contribute effectively to Bitcoin ABC.

Communicating with Developers
-----------------------------

To get in contact with ABC developers, we monitor a telegram supergroup.  The
intent of this group is specifically to facilitate development of Bitcoin-ABC,
and to welcome people who wish to participate.

https://t.me/joinchat/HCYr50mxRWjA2uLqii-psw

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
[here](https://www.gamasutra.com/view/news/128325/Opinion_Parallel_Implementations.php)
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
- [Statement of Bitcoin ABC Values and Visions](https://www.yours.org/content/bitcoin-abc---our-values-and-vision-a282afaade7c)
- [How to Do Code Reviews Like a Human - Part 1](https://mtlynch.io/human-code-reviews-1/) 
- [How to Do Code Reviews Like a Human - Part 2](https://mtlynch.io/human-code-reviews-2/)
- [Adversarial vs Collaborative Communication Styles](http://www.nehrlich.com/blog/2008/05/23/adversarial-vs-collaborative-communication-styles/)
- [Large Diffs Are Hurting Your Ability To Ship](https://medium.com/@kurtisnusbaum/large-diffs-are-hurting-your-ability-to-ship-e0b2b41e8acf)
- [Stacked Diffs: Keeping Phabricator Diffs Small](https://medium.com/@kurtisnusbaum/stacked-diffs-keeping-phabricator-diffs-small-d9964f4dcfa6)
- [Parallel Implementations](https://www.gamasutra.com/view/news/128325/Opinion_Parallel_Implementations.php)
- [The Pragmatic Programmer: From Journeyman to Master](https://www.amazon.com/Pragmatic-Programmer-Journeyman-Master/dp/020161622X)
- [Advantages of monolithic version control](https://danluu.com/monorepo/)
- [The importance of fixing bugs immediately](https://youtu.be/E2MIpi8pIvY?t=16m0s)


Getting set up with the Bitcoin ABC Repository
----------------------------------------------

1. Create an account at https://reviews.bitcoinabc.org/

2. Install Git and Arcanist on your machine

Git documentation can be found at: https://git-scm.com/

Arcanist documentation can be found at:
https://secure.phabricator.com/book/phabricator/article/arcanist_quick_start/

And: https://secure.phabricator.com/book/phabricator/article/arcanist/

To install these packages on Debian or Ubuntu, type: `sudo apt-get install git arcanist`

3. If you do not already have an SSH key set up, follow these steps:

Type: `ssh-keygen -t rsa -b 4096 -C "your_email@example.com"`

Enter a file in which to save the key (/home/*username*/.ssh/id_rsa): [Press enter]

4. Upload your SSH public key to reviews.bitcoinabc.org

  - go to: `https://reviews.bitcoinabc.org/settings/user/*username*/page/ssh/`

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

6. Code formatting tools

If code formatting tools do not install automatically on your system, you
may have to install clang-format-7, autopep8 and flake8. clang-format-7 can be
installed from https://releases.llvm.org/download.html or https://apt.llvm.org

To install autopep8 and flake8 on Ubuntu:
```
sudo apt-get install python-autopep8 flake8
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
type my-topic-branch in git, then type `arc land`. You have now succesfully
committed a change to the Bitcoin ABC repository.

- When reviewing a Diff, apply the changeset on your local by using
`arc patch D{NNNN}`

- You will likely be re-writing git histories multiple times, which causes
timestamp changes that require re-building a significant number of files. It's
highly recommended to install `ccache` (re-run ./configure if you install it
later), as this will help cut your re-build times from several minutes to under
a minute, in many cases.

What to work on
---------------

If you are looking for a useful task to contribute to the project, a good place
to start is the list of tasks at https://reviews.bitcoinabc.org/maniphest/

You could also try [backporting](doc/backporting.md) some code from Bitcoin Core.

Copyright
---------

By contributing to this repository, you agree to license your work under the
MIT license unless specified otherwise in `contrib/debian/copyright` or at
the top of the file itself. Any work contributed where you are not the original
author must contain its license header with the original author(s) and source.

Disclosure Policy
-----------------

See [DISCLOSURE_POLICY](DISCLOSURE_POLICY).
