# Electrum ABC - Plugins

The plugin system of Electrum ABC is designed to allow the development
of new features without increasing the core code of Electrum ABC.

Electrum ABC is written in pure python. if you want to add a feature
that requires non-python libraries, then it must be submitted as a
plugin. If the feature you want to add requires communication with
a remote server (not an Electrum ABC server), then it should be a
plugin as well. If the feature you want to add introduces new
dependencies in the code, then it should probably be a plugin.

At this time, there is no documentation for the plugin API.  What API there
is, mostly consists of some limited hooks which provide notification on events
and a base class which provides the basic plugin integration.

**WARNING:** The plugin API can be upgraded or removed at any point.

## Types of Plugin

Optional features (internal plugins) are included with Electrum ABC, and are
available to all users of Electrum ABC to enable and disable as they wish.
They cannot be uninstalled, and no installation functionality is provided
either.

User installable plugins (external plugins) are no longer supported as
of Electrum ABC 5.5.4

## Internal Plugin Rules

- We expect plugin developers to maintain their plugin code. However,
  once a plugin is merged in Electrum ABC, we will have to maintain it
  too, because changes in the Electrum ABC code often require updates in
  the plugin code. Therefore, plugins have to be easy to maintain. If
  we believe that a plugin will create too much maintenance work in
  the future, it will be rejected.

- Plugins should be compatible with Electrum ABC's conventions. If your
  plugin does not fit with Electrum ABC's architecture, or if we believe
  that it will create too much maintenance work, it will not be
  accepted. In particular, do not duplicate existing Electrum ABC code in
  your plugin.

- We may decide to remove a plugin after it has been merged in
  Electrum ABC. For this reason, a plugin must be easily removable,
  without putting at risk the user's funds. If we feel that a
  plugin cannot be removed without threatening users who rely on it,
  we will not merge it.
