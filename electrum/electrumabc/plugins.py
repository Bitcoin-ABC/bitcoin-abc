#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2015 Thomas Voegtlin
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
from __future__ import annotations

import concurrent.futures
import importlib.util
import json
import os
import pkgutil
import shutil
import sys
import threading
import time
import traceback
import zipimport
from collections import defaultdict
from enum import IntEnum
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Dict,
    Iterable,
    List,
    NamedTuple,
    Optional,
    Set,
    Tuple,
    Union,
)
from warnings import warn

from . import bitcoin, version
from .constants import PROJECT_NAME, SCRIPT_NAME
from .i18n import _
from .printerror import PrintError, print_error, print_stderr
from .simple_config import SimpleConfig
from .util import DaemonThread, ThreadJob, UserCancelled, make_dir, profiler

if TYPE_CHECKING:
    from electrumabc_plugins.hw_wallet import (
        HardwareClientBase,
        HardwareHandlerBase,
        HWPluginBase,
    )

    from .keystore import HardwareKeyStore

plugin_loaders = {}
hooks = defaultdict(list)


class ExternalPluginCodes(IntEnum):
    SUCCESS = 0
    MISSING_MANIFEST = 1
    NAME_ALREADY_IN_USE = 2
    UNABLE_TO_COPY_FILE = 3
    INSTALLED_BUT_FAILED_LOAD = 4
    INCOMPATIBLE_VERSION = 5
    INCOMPATIBLE_ZIP_FORMAT = 6
    INVALID_MANIFEST_JSON = 7
    INVALID_MAMIFEST_DISPLAY_NAME = 8
    INVALID_MAMIFEST_DESCRIPTION = 9
    INVALID_MAMIFEST_VERSION = 10
    INVALID_MAMIFEST_MINIMUM_EC_VERSION = 11
    INVALID_MAMIFEST_PACKAGE_NAME = 12
    UNSPECIFIED_ERROR = 13


INTERNAL_USE_PREFIX = "use_"
EXTERNAL_USE_PREFIX = "use_external_"


class Plugins(DaemonThread):
    @profiler
    def __init__(self, config, gui_name):
        DaemonThread.__init__(self)
        internal_plugins_namespace = __import__("electrumabc_plugins")
        self.internal_plugins_pkgpath = os.path.dirname(
            internal_plugins_namespace.__file__
        )
        self.config = config
        self.gui_name = gui_name
        self.hw_wallets = {}
        self.daemon_commands = {}
        self.internal_plugins = {}
        self.internal_plugin_metadata = {}
        self.external_plugins = {}
        self.external_plugin_metadata = {}
        self.device_manager = DeviceMgr(config)
        self.load_internal_plugins()
        self.load_external_plugins()
        self.add_jobs(self.device_manager.thread_jobs())
        self.start()

    def register_plugin(self, name, metadata, is_external=False):
        gui_good = self.gui_name in metadata.get("available_for", [])
        if not gui_good:
            return False
        details = metadata.get("registers_wallet_type")
        if details:
            self.register_wallet_type(name, gui_good, details, is_external)
        details = metadata.get("registers_keystore")
        if details:
            self.register_keystore(name, gui_good, details, is_external)
        return True

    def retranslate_internal_plugin_metadata(self, name):
        """Retranslate: "fullname" and "description". We need to do this
        because the static _("some text") strings in the plugin's __init__.py is
        not translated at startup even though it has a _() decorator because
        gettext language is set *after* internal plugin modules are loaded.

        This needs to be called once at startup and then again from the GUI."""
        d = self.internal_plugin_metadata.get(name)
        if not d:
            return
        ut_prefix = "_untranslated_"
        for key in ("fullname", "description"):
            ut_key = ut_prefix + key
            # first see if saved original untranslated metadata is available
            ut_val = val = d.get(ut_key)
            if val is None:
                ut_val = val = d.get(key)
                if not val:
                    continue
            delim = d.get(key + "_delimiter", " ")
            if isinstance(val, (list, tuple)):
                # retranslate each list item
                val = delim.join([_(x) for x in val])
            elif isinstance(val, str):
                val = _(val)  # retranslate
            if not isinstance(val, str):
                self.print_error(
                    f'Warning: plugin "{name}" metadata key "{key}" expected str,'
                    f" instead got {type(val)}"
                )
            else:
                # rewrite translated string
                d[key] = val
                # save untranslated metadata for later so that this function may be
                # called again from GUI
                d[ut_key] = ut_val

    def load_internal_plugins(self):
        for loader, name, ispkg in pkgutil.iter_modules(
            [self.internal_plugins_pkgpath]
        ):
            # we don't  have a server for cosigner_pool
            if name == "cosigner_pool":
                continue
            full_name = f"electrumabc_plugins.{name}"
            spec = importlib.util.find_spec(full_name)
            # pkgutil found it but importlib can't ?!
            if spec is None:
                raise Exception(f"Error pre-loading {full_name}: no spec")
            try:
                module = importlib.util.module_from_spec(spec)
                # sys.modules needs to be modified for relative imports to work
                # see https://stackoverflow.com/a/50395128
                sys.modules[spec.name] = module
                spec.loader.exec_module(module)
            except Exception as e:
                raise Exception(f"Error pre-loading {full_name}: {repr(e)}") from e
            d = module.__dict__
            if not self.register_plugin(name, d):
                continue
            self.internal_plugin_metadata[name] = d
            self.retranslate_internal_plugin_metadata(name)
            conf_key = INTERNAL_USE_PREFIX + name
            conf_value = self.config.get(conf_key)
            if conf_value is None and d.get("default_on"):
                # An internal plugin wants to be on by default (default_on =
                # True in its __init__.py). This only applies if no config value
                # was specified for the plugin (e.g. a new install). If the user
                # manually disabled the plugin, conf_value will be False (and
                # not None), and this branch will not be taken.
                conf_value = True
                self.config.set_key(conf_key, conf_value)
            if not d.get("requires_wallet_type") and conf_value:
                try:
                    self.load_internal_plugin(name)
                except Exception as e:
                    fmt = traceback.format_exc()
                    self.print_error(f"cannot initialize plugin {name}: {e!r} {fmt}")

    def load_external_plugins(self):
        external_plugin_dir = self.get_external_plugin_dir()
        # Unit tests, environment does not lead to finding a user dir, there will be none to load anyway.
        if external_plugin_dir is None:
            return

        for file_name in os.listdir(external_plugin_dir):
            plugin_file_path = os.path.join(external_plugin_dir, file_name)
            leading_name, ext = os.path.splitext(file_name)
            if ext.lower() != ".zip" or not os.path.isfile(plugin_file_path):
                continue
            metadata, error_code = self.get_metadata_from_external_plugin_zip_file(
                plugin_file_path
            )
            if metadata is None:
                continue
            package_name = metadata["package_name"]
            if package_name in self.internal_plugin_metadata:
                self.print_error(
                    "internal plugin also named '%s', external '%s' rejected"
                    % (package_name, file_name)
                )
                continue
            if not self.register_plugin(package_name, metadata, is_external=True):
                continue
            metadata["__file__"] = plugin_file_path
            self.external_plugin_metadata[package_name] = metadata

            if not metadata.get("requires_wallet_type") and self.config.get(
                EXTERNAL_USE_PREFIX + package_name
            ):
                try:
                    self.load_external_plugin(package_name)
                except Exception as e:
                    traceback.print_exc(
                        file=sys.stdout
                    )  # shouldn't this be... suppressed unless -v?
                    self.print_error(f"cannot initialize plugin {package_name} {e!r}")

    def get_internal_plugin(self, name, force_load=False):
        if force_load and name not in self.internal_plugins:
            self.load_internal_plugin(name)
        return self.internal_plugins.get(name)

    def get_external_plugin(self, name, force_load=False):
        if force_load and name not in self.external_plugins:
            return self.load_external_plugin(name)
        return self.external_plugins.get(name)

    def get_internal_plugin_count(self):
        return len(self.internal_plugins)

    def get_external_plugin_count(self):
        return len(self.external_plugins)

    def load_internal_plugin(self, name):
        if name in self.internal_plugins:
            return self.internal_plugins[name]

        full_name = f"electrumabc_plugins.{name}.{self.gui_name}"
        spec = importlib.util.find_spec(full_name)
        if spec is None:
            raise RuntimeError(
                "%s implementation for %s plugin not found" % (self.gui_name, name)
            )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        plugin = module.Plugin(self, self.config, name)
        plugin.set_enabled_prefix(INTERNAL_USE_PREFIX)
        self.add_jobs(plugin.thread_jobs())
        self.internal_plugins[name] = plugin
        self.print_error("loaded internal plugin", name)
        return plugin

    def load_external_plugin(self, name):
        if name in self.external_plugins:
            return self.external_plugins[name]
        # If we do not have the metadata, it was not detected by `load_external_plugins`
        # on startup, or added by manual user installation after that point.
        metadata = self.external_plugin_metadata.get(name, None)
        if metadata is None:
            self.print_error("attempted to load unknown external plugin %s" % name)
            return

        plugin_file_path = metadata["__file__"]
        try:
            zipfile = zipimport.zipimporter(plugin_file_path)
        except zipimport.ZipImportError:
            self.print_error("unable to load zip plugin '%s'" % plugin_file_path)
            return

        try:
            module = zipfile.load_module(name)
        except zipimport.ZipImportError as e:
            self.print_error(
                "unable to load zip plugin '%s' package '%s'"
                % (plugin_file_path, name),
                str(e),
            )
            return

        sys.modules[f"electrumabc_external_plugins.{name}"] = module

        full_name = f"electrumabc_external_plugins.{name}.{self.gui_name}"
        spec = importlib.util.find_spec(full_name)
        if spec is None:
            raise RuntimeError(
                "%s implementation for %s plugin not found" % (self.gui_name, name)
            )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        plugin = module.Plugin(self, self.config, name)
        plugin.set_enabled_prefix(EXTERNAL_USE_PREFIX)
        self.add_jobs(plugin.thread_jobs())
        self.external_plugins[name] = plugin
        self.print_error("loaded external plugin", name)
        return plugin

    def close_plugin(self, plugin):
        self.remove_jobs(plugin.thread_jobs())

    def enable_internal_plugin(self, name):
        self.config.set_key(INTERNAL_USE_PREFIX + name, True, True)
        return self.get_internal_plugin(name, force_load=True)

    def enable_external_plugin(self, name):
        self.config.set_key(EXTERNAL_USE_PREFIX + name, True, True)
        return self.get_external_plugin(name, force_load=True)

    def disable_internal_plugin(self, name):
        self.config.set_key(INTERNAL_USE_PREFIX + name, False, True)
        p = self.get_internal_plugin(name)
        if not p:
            return
        self.internal_plugins.pop(name)
        p.close()
        self.print_error("closed", name)

    def disable_external_plugin(self, name):
        self.config.set_key(EXTERNAL_USE_PREFIX + name, False, True)
        p = self.get_external_plugin(name)
        if not p:
            return
        self.external_plugins.pop(name)
        p.close()
        self.print_error("closed", name)

    def toggle_internal_plugin(self, name):
        p = self.get_internal_plugin(name)
        return (
            self.disable_internal_plugin(name)
            if p
            else self.enable_internal_plugin(name)
        )

    def toggle_external_plugin(self, name):
        p = self.get_external_plugin(name)
        return (
            self.disable_external_plugin(name)
            if p
            else self.enable_external_plugin(name)
        )

    def is_plugin_available(self, metadata, w):
        if not metadata:
            return False
        deps = metadata.get("requires", [])
        for dep, s in deps:
            try:
                __import__(dep)
            except ImportError:
                return False
        requires = metadata.get("requires_wallet_type", [])
        return not requires or w.wallet_type in requires

    def is_internal_plugin_available(self, name, w):
        d = self.internal_plugin_metadata.get(name)
        return self.is_plugin_available(d, w)

    def is_external_plugin_available(self, name, w):
        d = self.external_plugin_metadata.get(name)
        return self.is_plugin_available(d, w)

    def get_external_plugin_dir(self):
        if self.config.path is None:
            return None
        external_plugin_dir = os.path.join(self.config.path, "external_plugins")
        make_dir(external_plugin_dir)
        return external_plugin_dir

    def get_metadata_from_external_plugin_zip_file(self, plugin_file_path):
        file_name = os.path.basename(plugin_file_path)
        try:
            zipfile = zipimport.zipimporter(plugin_file_path)
            metadata_text = zipfile.get_data("manifest.json")
        except zipimport.ZipImportError:
            self.print_error("unable to load zip plugin for %s" % file_name)
            return None, ExternalPluginCodes.INCOMPATIBLE_ZIP_FORMAT
        except OSError:
            self.print_error("missing 'manifest.json' (zip plugin %s)" % file_name)
            return None, ExternalPluginCodes.MISSING_MANIFEST
        except Exception as e:
            self.print_error(f"Exception opening {file_name}: {repr(e)}")
            return None, ExternalPluginCodes.UNSPECIFIED_ERROR

        try:
            metadata = json.loads(metadata_text)
        except json.JSONDecodeError:
            self.print_error(
                "invalid json in 'manifest.json' (zip plugin %s)" % file_name
            )
            return None, ExternalPluginCodes.INVALID_MANIFEST_JSON

        class Version:
            pass

        expected_keys = {
            "display_name": (str, ExternalPluginCodes.INVALID_MAMIFEST_DISPLAY_NAME),
            "description": (str, ExternalPluginCodes.INVALID_MAMIFEST_DESCRIPTION),
            "version": (Version, ExternalPluginCodes.INVALID_MAMIFEST_VERSION),
            "minimum_ec_version": (
                Version,
                ExternalPluginCodes.INVALID_MAMIFEST_MINIMUM_EC_VERSION,
            ),
            "package_name": (str, ExternalPluginCodes.INVALID_MAMIFEST_PACKAGE_NAME),
        }
        for k, (expected_type, error_code) in expected_keys.items():
            v = metadata.get(k, None)
            if v is None:
                self.print_error(
                    "missing metadata key %s (zip plugin %s)" % (k, file_name)
                )
                return None, error_code
            if expected_type is Version:
                try:
                    v = version.parse_package_version(v)
                except ValueError:
                    self.print_error(
                        "metadata %s = %s, expected a.b.c version string (zip"
                        " plugin %s)" % (k, v, file_name)
                    )
                    return None, error_code
            elif type(metadata[k]) is not expected_type:
                self.print_error(
                    "metadata %s = %s, expected %s (zip plugin %s)"
                    % (k, v, expected_type, file_name)
                )
                return None, error_code

        return metadata, ExternalPluginCodes.SUCCESS

    def install_external_plugin(self, plugin_original_path):
        # Do the minimum verification necessary to check if the archive looks
        # like a valid plugin zip archive.
        metadata, error_code = self.get_metadata_from_external_plugin_zip_file(
            plugin_original_path
        )
        if metadata is None:
            return error_code

        file_name = os.path.basename(plugin_original_path)
        leading_name, ext = os.path.splitext(file_name)
        package_name = metadata.get("package_name", leading_name)
        # Ensure it is not already installed.
        if (
            package_name in self.external_plugins
            or package_name in self.external_plugin_metadata
        ):
            return ExternalPluginCodes.NAME_ALREADY_IN_USE

        if (
            version.parse_package_version(metadata["minimum_ec_version"])[:-1]
            > version.parse_package_version(version.PACKAGE_VERSION)[:-1]
        ):
            return ExternalPluginCodes.INCOMPATIBLE_VERSION

        # Copy the original file to the external plugin hosting dir.
        install_dir = self.get_external_plugin_dir()
        plugin_file_path = os.path.join(install_dir, file_name)
        try:
            shutil.copyfile(plugin_original_path, plugin_file_path)
        except OSError:
            return ExternalPluginCodes.UNABLE_TO_COPY_FILE
        metadata["__file__"] = plugin_file_path

        # Register the existence of the newly placed plugin archive.
        # This would otherwise be recorded in `load_external_plugins`.
        self.external_plugin_metadata[package_name] = metadata

        # Not documented wallet type constraint.  Follow pattern elsewhere.
        if metadata.get("requires_wallet_type"):
            return ExternalPluginCodes.SUCCESS

        # Otherwise, we enable all other installed plugins.  This causes the
        # plugin to be loaded, afterward.
        try:
            self.enable_external_plugin(package_name)
        except Exception as e:
            traceback.print_exc(file=sys.stdout)
            self.print_error(
                "cannot enable/load external plugin %s:" % package_name, str(e)
            )
            return ExternalPluginCodes.INSTALLED_BUT_FAILED_LOAD

        return ExternalPluginCodes.SUCCESS

    def uninstall_external_plugin(self, name):
        self.disable_external_plugin(name)
        if "electrumabc_external_plugins." + name in sys.modules:
            del sys.modules["electrumabc_external_plugins." + name]

        metadata = self.external_plugin_metadata[name]
        plugin_file_path = metadata["__file__"]
        del self.external_plugin_metadata[name]

        os.remove(plugin_file_path)

    def find_plugin(self, name, force_load=False):
        if name in self.internal_plugin_metadata:
            return self.get_internal_plugin(name, force_load)
        else:
            return self.get_external_plugin(name, force_load)

    def get_hardware_support(self):
        out = []
        for name, (gui_good, details) in self.hw_wallets.items():
            if gui_good:
                try:
                    p = self.find_plugin(name, force_load=True)
                    if p.is_enabled():
                        out.append([name, details[2], p])
                except Exception:
                    self.print_error(
                        "cannot load plugin for:",
                        name,
                        "exception:",
                        repr(sys.exc_info()[1]),
                    )
        return out

    def register_wallet_type(self, name, gui_good, wallet_type, is_external):
        from .wallet import register_constructor, register_wallet_type

        self.print_error("registering wallet type", (wallet_type, name))

        def loader():
            if is_external:
                plugin = self.get_external_plugin(name, force_load=True)
            else:
                plugin = self.get_internal_plugin(name, force_load=True)
            register_constructor(wallet_type, plugin.wallet_class)

        register_wallet_type(wallet_type)
        plugin_loaders[wallet_type] = loader

    def register_keystore(self, name, gui_good, details, is_external):
        from .keystore import register_keystore

        def dynamic_constructor(d):
            if is_external:
                plugin = self.get_external_plugin(name, force_load=True)
            else:
                plugin = self.get_internal_plugin(name, force_load=True)
            return plugin.keystore_class(d)

        if details[0] == "hardware":
            self.hw_wallets[name] = (gui_good, details)
            self.print_error("registering hardware %s: %s" % (name, details))
            register_keystore(details[1], dynamic_constructor)

    def run(self):
        while self.is_running():
            time.sleep(0.1)
            self.run_jobs()
        self.on_stop()


def hook(func):
    func._is_ec_plugin_hook = True
    return func


def _get_func_if_hook(plugin, attr_name) -> Optional[Callable]:
    cls = plugin.__class__
    # We examine the class-level attribute with name attr_name to see if it's a
    # function that's tagged with _is_ec_plugin_hook. If it is, we know it was
    # registered with @hook.
    #
    # Caveat: If we were to call getattr(plugin, attr_name) directly, we would
    # potentially be invoking a function call if attr_name was decorated with
    # @property. That's why we explicitly do this check on the class-level
    # attribute first, before proceeding to grabbing the instance-level
    # bound method if the checks pass.
    cls_func = getattr(cls, attr_name, None)
    if getattr(cls_func, "_is_ec_plugin_hook", False) and not isinstance(
        cls_func, property
    ):  # just in case they did @hook @property!
        # Ok, attr_name has the tag, and wasn't a property.
        # So it's safe to call getattr on it to grab the bound method, and
        # return it after one last callable check (for paranoia's sake).
        func = getattr(plugin, attr_name, None)
        if callable(func):
            return func


def run_hook(name, *args, **kwargs):
    """Invokes a named @hook on all enabled plugins. Not all plugins or hooks
    return values. Example follows:

    # in plugin A
    @hook
    def myhook(self, arg1, arg2):
        # ...
        return  # None return value will be discarded

    # in plugin B (loaded after A)
    @hook
    def myhook(self, arg1, arg2):
        # ...
        return "hello"

    # in plugin C (loaded after B)
    @hook
    def myhook(self, arg1, arg2):
        # ...
        return "hiya"

    # in application code
    res = run_hook("myhook", arg1, arg2)  # res = "hello" here
    res = run_hook("myhook", arg1, arg2, multi=True)  # res = ["hello", "hiya"]

    kwargs:
        multi - default False. Specify multi=True to return a list of results.
            This is for cases where multiple plugins implement the same hook
            that returns results. Note that 'None' results are never present in
            the result set if multi=True. The empty list is returned if no
            plugins returned any non-None results. multi=False will return a
            single item: the first non-None result encountered, or None if no
            such result was returned from any invoked hooks."""
    multi = bool(kwargs.get("multi", False))

    this_thread = threading.current_thread()
    if this_thread is not threading.main_thread():
        warn(
            f'run_hook "{name}" being called from outside the main'
            f" thread (thr: {this_thread.name}) may lead to undefined"
            " behavior. Please use util.do_in_main_thread to call run_hook"
            " if the hook in question does not return any results.",
            stacklevel=2,
        )
    f_list = hooks.get(name)
    if not f_list:
        # short-circuit return: most of the time this code path is taken
        return None if not multi else []
    results = []
    for p, f in f_list:
        if p.is_enabled():
            try:
                r = f(*args)
            except Exception:
                print_error("Plugin error")
                traceback.print_exc(file=sys.stdout)
            else:
                if r is not None:
                    results.append(r)

    if multi:
        return results
    if results:
        if len(results) > 1:
            print_error(
                f"run_hook: got more than 1 result from @hook '{name}':", results
            )
        return results[0]


def daemon_command(func):
    f"""Method decorator for BasePlugin subclasses to add a remote command
    to the daemon. Usage:

        class MyPlugin(BasePlugin):
            @daemon_command
            def myplugin_action1(self, daemon, config):
                ...
            @daemon_command
            def myplugin_action2(self, daemon, config):
                ...

    These can then be invoked as:

        ./{SCRIPT_NAME} daemon myplugin_action1 arg arg arg ...

    Here `config` is *not* the usual global config but also includes the options
    from the command line client:
    - config['wallet_path'] is the wallet passed using -w ; you can use
      config.get_wallet_path() to get it or a default.
    - config['password'] is the wallet password passed using -wp.
    - config['subargs'] are the extra `arg` passed after the subcommand.
    See Daemon.run_daemon for an idea on how to use this.
    """
    func._is_daemon_command = True
    return func


class BasePlugin(PrintError):
    def __init__(self, parent, config, name):
        self.parent: Plugins = parent  # The plugins object
        self.name = name
        self.config = config
        self.wallet = None
        self.enabled_use_prefix = INTERNAL_USE_PREFIX
        self._hooks_i_registered = []
        # add self to hooks
        for aname in dir(self):
            func = _get_func_if_hook(self, aname)
            if func is not None:
                hooks[aname].append((self, func))
                self._hooks_i_registered.append((aname, func))

        # collect names of all class attributes with ._is_daemon_command
        self._daemon_commands = {
            attrname
            for attrname in dir(type(self))
            if getattr(getattr(type(self), attrname), "_is_daemon_command", False)
        }
        # we don't allow conflicting definitions of daemon command (between different plugins)
        for c in self._daemon_commands.intersection(self.parent.daemon_commands):
            self._daemon_commands.discard(c)
            try:
                origclass = type(self.parent.daemon_commands[c].__self__)
            except (KeyError, AttributeError):
                origclass = "unknown"
            print_stderr(
                f"Ignoring plugin daemon command {repr(c)} from {type(self)} (already"
                f" exists from {origclass})"
            )
        self.parent.daemon_commands.update(
            {cmdname: getattr(self, cmdname) for cmdname in self._daemon_commands}
        )

    def set_enabled_prefix(self, prefix):
        # This is set via a method in order not to break the existing API.
        self.enabled_use_prefix = prefix

    def diagnostic_name(self):
        return self.name

    def __str__(self):
        return self.name

    def close(self):
        # remove self from hooks
        for name, func in self._hooks_i_registered:
            hooks_for_name = hooks.get(name, [])
            try:
                hooks_for_name.remove((self, func))
            except ValueError:
                # this should never happen but it pays to be paranoid.
                pass
            if not hooks_for_name:
                hooks.pop(name, None)
        # just to kill strong refs to self ASAP, for GC
        self._hooks_i_registered.clear()
        # remove registered daemon commands
        for cmdname in self._daemon_commands:
            self.parent.daemon_commands.pop(cmdname, None)
        self._daemon_commands.clear()
        self.parent.close_plugin(self)
        self.on_close()

    def on_close(self):
        pass

    def thread_jobs(self):
        return []

    def is_enabled(self):
        return (
            self.is_available()
            and self.config.get(self.enabled_use_prefix + self.name) is True
        )

    def is_available(self):
        return True

    def can_user_disable(self):
        return True

    # Internal plugin settings support. `settings_widget(dialog)` is called on the plugin.
    def requires_settings(self):
        return False

    def settings_dialog(self, parent):
        pass

    # External plugin settings support. `settings_dialog(parent_dialog)` is called on the plugin.
    def has_settings_dialog(self):
        return False


class DeviceNotFoundError(Exception):
    pass


class DeviceUnpairableError(Exception):
    pass


class Device(NamedTuple):
    path: Union[str, bytes]
    interface_number: int
    id_: str
    product_key: Any  # when using hid, often Tuple[int, int]
    usage_page: int


class DeviceInfo(NamedTuple):
    device: Device
    label: Optional[str]
    initialized: Optional[bool]
    model_name: Optional[str] = None  # e.g. "Ledger Nano S"


PLACEHOLDER_HW_CLIENT_LABELS = {None, "", " "}

# hidapi is not thread-safe
# see https://github.com/signal11/hidapi/issues/205#issuecomment-527654560
#     https://github.com/libusb/hidapi/issues/45
#     https://github.com/signal11/hidapi/issues/45#issuecomment-4434598
#     https://github.com/signal11/hidapi/pull/414#issuecomment-445164238
# It is not entirely clear to me, exactly what is safe and what isn't, when
# using multiple threads...
# For now, we use a dedicated thread to enumerate devices (_hid_executor),
# and we synchronize all device opens/closes/enumeration (_hid_lock).
# FIXME there are still probably threading issues with how we use hidapi...
_hid_executor = None  # type: Optional[concurrent.futures.Executor]
_hid_lock = threading.Lock()


class DeviceMgr(ThreadJob):
    """Manages hardware clients.  A client communicates over a hardware
    channel with the device.

    In addition to tracking device HID IDs, the device manager tracks
    hardware wallets and manages wallet pairing.  A HID ID may be
    paired with a wallet when it is confirmed that the hardware device
    matches the wallet, i.e. they have the same master public key.  A
    HID ID can be unpaired if e.g. it is wiped.

    Because of hotplugging, a wallet must request its client
    dynamically each time it is required, rather than caching it
    itself.

    The device manager is shared across plugins, so just one place
    does hardware scans when needed.  By tracking HID IDs, if a device
    is plugged into a different port the wallet is automatically
    re-paired.

    Wallets are informed on connect / disconnect events.  It must
    implement connected(), disconnected() callbacks.  Being connected
    implies a pairing.  Callbacks can happen in any thread context,
    and we do them without holding the lock.

    Confusingly, the HID ID (serial number) reported by the HID system
    doesn't match the device ID reported by the device itself.  We use
    the HID IDs.

    This plugin is thread-safe.  Currently only devices supported by
    hidapi are implemented."""

    def __init__(self, config: SimpleConfig):
        super(DeviceMgr, self).__init__()
        # Keyed by xpub.  The value is the device id
        # has been paired, and None otherwise. Needs self.lock.
        self.xpub_ids: Dict[str, str] = {}
        # A list of clients.  The key is the client, the value is
        # a (path, id_) pair. Needs self.lock.
        self.clients: Dict[HardwareClientBase, Tuple[Union[str, bytes], str]] = {}
        # What we recognise.  (vendor_id, product_id) -> Plugin
        self._recognised_hardware: Dict[Tuple[int, int], HWPluginBase] = {}
        self._recognised_vendor: Dict[int, HWPluginBase] = {}
        """vendor_id -> Plugin"""
        # Custom enumerate functions for devices we don't know about.
        self.enumerate_func = set()
        # locks: if you need to take multiple ones, acquire them in the order they are
        # defined here!
        self._scan_lock = threading.RLock()
        self.lock = threading.RLock()
        self.hid_lock = _hid_lock

        self.config = config

        global _hid_executor
        if _hid_executor is None:
            _hid_executor = concurrent.futures.ThreadPoolExecutor(
                max_workers=1, thread_name_prefix="hid_enumerate_thread"
            )

    def with_scan_lock(func):
        def func_wrapper(self: DeviceMgr, *args, **kwargs):
            with self._scan_lock:
                return func(self, *args, **kwargs)

        return func_wrapper

    def get_recognized_hardware(self) -> Set[Tuple[int, int]]:
        return set(self._recognised_hardware.keys())

    def thread_jobs(self):
        # Thread job to handle device timeouts
        return [self]

    def run(self):
        """Handle device timeouts.  Runs in the context of the Plugins
        thread."""
        with self.lock:
            clients = list(self.clients.keys())
        cutoff = time.time() - self.config.get_session_timeout()
        for client in clients:
            client.timeout(cutoff)

    def register_devices(self, device_pairs, *, plugin: HWPluginBase):
        for pair in device_pairs:
            self._recognised_hardware[pair] = plugin

    def register_vendor_ids(self, vendor_ids: Iterable[int], *, plugin: HWPluginBase):
        for vendor_id in vendor_ids:
            self._recognised_vendor[vendor_id] = plugin

    def register_enumerate_func(self, func):
        self.enumerate_func.add(func)

    def create_client(
        self, device: Device, handler: HardwareHandlerBase, plugin: HWPluginBase
    ) -> Optional[HardwareClientBase]:
        # Get from cache first
        client = self._client_by_id(device.id_)
        if client:
            return client
        client = plugin.create_client(device, handler)
        if client:
            self.print_error("Registering", client)
            with self.lock:
                self.clients[client] = (device.path, device.id_)
        return client

    def xpub_id(self, xpub):
        with self.lock:
            return self.xpub_ids.get(xpub)

    def xpub_by_id(self, id_):
        with self.lock:
            for xpub, xpub_id in self.xpub_ids.items():
                if xpub_id == id_:
                    return xpub
            return None

    def unpair_xpub(self, xpub):
        with self.lock:
            if xpub not in self.xpub_ids:
                return
            _id = self.xpub_ids.pop(xpub)
            self._close_client(_id)

    def unpair_id(self, id_):
        xpub = self.xpub_by_id(id_)
        if xpub:
            self.unpair_xpub(xpub)
        else:
            self._close_client(id_)

    def _close_client(self, id_):
        client = self._client_by_id(id_)
        self.clients.pop(client, None)
        if client:
            client.close()

    def pair_xpub(self, xpub, id_):
        with self.lock:
            self.xpub_ids[xpub] = id_

    def _client_by_id(self, id_) -> Optional[HardwareClientBase]:
        with self.lock:
            for client, (path, client_id) in self.clients.items():
                if client_id == id_:
                    return client
        return None

    def client_by_id(
        self, id_, *, scan_now: bool = True
    ) -> Optional[HardwareClientBase]:
        """Returns a client for the device ID if one is registered.  If
        a device is wiped or in bootloader mode pairing is impossible;
        in such cases we communicate by device ID and not wallet."""
        if scan_now:
            self.scan_devices()
        return self._client_by_id(id_)

    @with_scan_lock
    def client_for_keystore(
        self,
        plugin: HWPluginBase,
        handler: Optional[HardwareHandlerBase],
        keystore: HardwareKeyStore,
        force_pair: bool,
    ) -> Optional[HardwareClientBase]:
        self.print_error("getting client for keystore")
        if handler is None:
            raise RuntimeError(
                _("Handler not found for")
                + " "
                + plugin.name
                + "\n"
                + _("A library is probably missing.")
            )
        handler.update_status(False)
        devices = self.scan_devices()
        xpub = keystore.xpub
        derivation = keystore.get_derivation()
        client = self.client_by_xpub(plugin, xpub, handler, devices)
        if client is None and force_pair:
            info = self.select_device(plugin, handler, keystore, devices)
            client = self.force_pair_xpub(plugin, handler, info, xpub, derivation)
        if client:
            handler.update_status(True)
        self.print_error("end client for keystore")
        return client

    def client_by_xpub(
        self,
        plugin: HWPluginBase,
        xpub,
        handler: HardwareHandlerBase,
        devices: Iterable[Device],
    ) -> Optional["HardwareClientBase"]:
        _id = self.xpub_id(xpub)
        client = self._client_by_id(_id)
        if client:
            # An unpaired client might have another wallet's handler
            # from a prior scan.  Replace to fix dialog parenting.
            client.handler = handler
            return client

        for device in devices:
            if device.id_ == _id:
                return self.create_client(device, handler, plugin)

    def force_pair_xpub(
        self,
        plugin: HWPluginBase,
        handler: HardwareHandlerBase,
        info: DeviceInfo,
        xpub,
        derivation,
    ) -> Optional[HardwareClientBase]:
        # The wallet has not been previously paired, so let the user
        # choose an unpaired device and compare its first address.
        xtype = bitcoin.xpub_type(xpub)
        client = self._client_by_id(info.device.id_)
        if client and client.is_pairable():
            # See comment above for same code
            client.handler = handler
            # This will trigger a PIN/passphrase entry request
            try:
                client_xpub = client.get_xpub(derivation, xtype)
            except (UserCancelled, RuntimeError):
                # Bad / cancelled PIN / passphrase
                client_xpub = None
            if client_xpub == xpub:
                self.pair_xpub(xpub, info.device.id_)
                return client

        # The user input has wrong PIN or passphrase, or cancelled input,
        # or it is not pairable
        raise DeviceUnpairableError(
            _(
                f"{PROJECT_NAME} cannot pair with your {plugin.device}.\n\n"
                "Before you request bitcoins to be sent to addresses in this "
                "wallet, ensure you can pair with your device, or that you have "
                "its seed (and passphrase, if any).  Otherwise all bitcoins you "
                "receive will be unspendable."
            )
        )

    def unpaired_device_infos(
        self,
        handler: Optional[HardwareHandlerBase],
        plugin: HWPluginBase,
        devices: Optional[List[Device]] = None,
    ) -> List["DeviceInfo"]:
        """Returns a list of DeviceInfo objects: one for each connected,
        unpaired device accepted by the plugin."""
        if devices is None:
            devices = self.scan_devices()
        devices = [dev for dev in devices if not self.xpub_by_id(dev.id_)]
        infos = []
        for device in devices:
            if not plugin.can_recognize_device(device):
                continue
            client = self.create_client(device, handler, plugin)
            if not client:
                continue
            infos.append(
                DeviceInfo(
                    device=device,
                    label=client.label(),
                    initialized=client.is_initialized(),
                    model_name=client.device_model_name(),
                )
            )

        return infos

    def select_device(
        self,
        plugin: HWPluginBase,
        handler: HardwareHandlerBase,
        keystore: HardwareKeyStore,
        devices: Optional[List["Device"]] = None,
    ) -> DeviceInfo:
        """Ask the user to select a device to use if there is more than one,
        and return the DeviceInfo for the device."""
        # ideally this should not be called from the GUI thread...
        # assert handler.get_gui_thread() != threading.current_thread(), 'must not be called from GUI thread'
        while True:
            infos = self.unpaired_device_infos(handler, plugin, devices)
            if infos:
                break
            msg = _(
                "Please insert your {}.  Verify the cable is "
                "connected and that no other application is using it.\n\n"
                "Try to connect again?"
            ).format(plugin.device)
            if not handler.yes_no_question(msg):
                raise UserCancelled()
            devices = None
        if len(infos) == 1:
            return infos[0]
        # select device by label automatically;
        # but only if not a placeholder label and only if there is no collision
        device_labels = [info.label for info in infos]
        if (
            keystore.label not in PLACEHOLDER_HW_CLIENT_LABELS
            and device_labels.count(keystore.label) == 1
        ):
            for info in infos:
                if info.label == keystore.label:
                    return info
        # ask user to select device
        msg = _("Please select which {} device to use:").format(plugin.device)
        descriptions = [
            "{label} ({maybe_model}{init}, {transport})".format(
                label=info.label,
                init=_("initialized") if info.initialized else _("wiped"),
                transport=str(
                    (info.device and info.device.path) or "unknown transport"
                )[:20],
                maybe_model=f"{info.model_name}, " if info.model_name else "",
            )
            for info in infos
        ]
        c = handler.query_choice(msg, descriptions)
        if c is None:
            raise UserCancelled()
        info = infos[c]
        # save new label
        keystore.set_label(info.label)
        wallet = handler.get_wallet()
        if wallet is not None:
            wallet.save_keystore()
        return info

    @with_scan_lock
    def _scan_devices_with_hid(self) -> List[Device]:
        try:
            import hid
        except ImportError:
            return []

        def hid_enumerate():
            with self.hid_lock:
                return hid.enumerate(0, 0)

        hid_list_fut = _hid_executor.submit(hid_enumerate)
        try:
            hid_list = hid_list_fut.result()
        except (concurrent.futures.CancelledError, concurrent.futures.TimeoutError):
            return []

        # First see what's connected that we know about
        devices = []
        for d in hid_list:
            vendor_id = d["vendor_id"]
            product_key = (vendor_id, d["product_id"])
            plugin = None
            if product_key in self._recognised_hardware:
                plugin = self._recognised_hardware[product_key]
            elif vendor_id in self._recognised_vendor:
                plugin = self._recognised_vendor[vendor_id]
            if plugin:
                device = plugin.create_device_from_hid_enumeration(
                    d, product_key=product_key
                )
                if device:
                    devices.append(device)
        return devices

    @with_scan_lock
    def scan_devices(self) -> List["Device"]:
        self.print_error("scanning devices...")

        # First see what's connected that we know about
        devices = self._scan_devices_with_hid()

        # Let plugin handlers enumerate devices we don't know about
        for f in self.enumerate_func:
            try:
                new_devices = f()
            except Exception as e:
                self.print_error(
                    "custom device enum failed. func {}, error {}".format(
                        str(f), str(e)
                    )
                )
            else:
                devices.extend(new_devices)

        # find out what was disconnected
        pairs = [(dev.path, dev.id_) for dev in devices]
        disconnected_ids = []
        with self.lock:
            connected = {}
            for client, pair in self.clients.items():
                if pair in pairs and client.has_usable_connection_with_device():
                    connected[client] = pair
                else:
                    disconnected_ids.append(pair[1])

            # Unpair disconnected devices
            for id_ in disconnected_ids:
                self.unpair_id(id_)

            self.clients = connected

        return devices
