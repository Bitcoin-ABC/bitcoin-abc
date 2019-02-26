Contributing to DeVault
===========================

We welcome contributors!

This guide is intended to help developers contribute effectively.

Communicating with Developers
-----------------------------

To get in contact with developers, we monitor a DeVault Discord group. 

Details : TBD

We don't discuss:

* Market discussion
* Non-constructive criticism

DeVault Development Philosophy
----------------------------------

DeVault aims for fast iteration and continuous integration.

This means that there should be quick turnaround for patches to be proposed,
reviewed, and committed. Changes should not sit in a queue for long.

Here are some tips to help keep the development working as intended. These
are guidelines for the normal and expected development process. Developers 
can use their judgement to deviate from these guidelines when they have a 
good reason to do so.

- Keep each change small and self-contained.
- Reach out for a 1-on-1 review so things move quickly.
- Rebase the Pull Request quickly after it is accepted.
- Don't amend changes after the Pull Request accepted, new Pull Request for another fix.
- Review Pull Requests from other developers as quickly as possible.
- Large changes should be broken into logical chunks that are easy to review,
and keep the code in a functional state.
- Do not mix moving stuff around with changing stuff. Do changes with renames on their own.
- Sometimes you want to replace one subsystem by another implementation,
in which case it is not possible to do things incrementally. In such cases,
you keep both implementations in the codebase for a while, as described
[here](https://www.gamasutra.com/view/news/128325/Opinion_Parallel_Implementations.php)
- Don't break the build, it is important to keep master green as much as possible.
If a Pull Request is rebased, and breaks the build, fix it quickly. If it cannot be fixed
quickly, it should be reverted, and re-applied later when it no longer breaks the build.
- As soon as you see a bug, you fix it. Do not continue on. Fixing the bug becomes the 
top priority, more important than completing other tasks.
- Automate as much as possible, and spend time on things only humans can do.

Here are some handy links for development practices aligned with Bitcoin ABC:

- [Developer Notes](doc/developer-notes.md)
- [How to Do Code Reviews Like a Human - Part 1](https://mtlynch.io/human-code-reviews-1/) 
- [How to Do Code Reviews Like a Human - Part 2](https://mtlynch.io/human-code-reviews-2/)
- [Adversarial vs Collaborative Communication Styles](http://www.nehrlich.com/blog/2008/05/23/adversarial-vs-collaborative-communication-styles/)
- [Parallel Implementations](https://www.gamasutra.com/view/news/128325/Opinion_Parallel_Implementations.php)
- [The Pragmatic Programmer: From Journeyman to Master](https://www.amazon.com/Pragmatic-Programmer-Journeyman-Master/dp/020161622X)
- [Advantages of monolithic version control](https://danluu.com/monorepo/)
- [The importance of fixing bugs immediately](https://youtu.be/E2MIpi8pIvY?t=16m0s)



Copyright
---------

By contributing to this repository, you agree to license your work under the
MIT license unless specified otherwise in `contrib/debian/copyright` or at
the top of the file itself. Any work contributed where you are not the original
author must contain its license header with the original author(s) and source.

Disclosure Policy
-----------------

See [DISCLOSURE_POLICY](DISCLOSURE_POLICY).
