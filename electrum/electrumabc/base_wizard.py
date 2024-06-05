# -*- coding: utf-8 -*-
# -*- mode: python3 -*-
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2016 Thomas Voegtlin
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

import copy
import sys
import traceback
from typing import Any, Callable, Dict, List, NamedTuple, Optional

from electrumabc_plugins.hw_wallet import HWPluginBase

from . import bitcoin, keystore, mnemo, util
from .address import Address
from .bip32 import is_bip32_derivation, xpub_type
from .constants import CURRENCY, PROJECT_NAME, REPOSITORY_URL
from .i18n import _
from .keystore import HardwareKeyStore
from .plugins import BasePlugin, DeviceInfo
from .printerror import PrintError
from .simple_config import SimpleConfig
from .storage import (
    STO_EV_USER_PW,
    STO_EV_XPUB_PW,
    WalletStorage,
    get_derivation_used_for_hw_device_encryption,
)
from .wallet import wallet_types

# hardware device setup purpose
HWD_SETUP_NEW_WALLET, HWD_SETUP_DECRYPT_WALLET = range(0, 2)


class GoBack(Exception):
    pass


class WizardStackItem(NamedTuple):
    action: Any
    args: Any
    kwargs: Dict[str, Any]
    storage_data: dict


class BaseWizard(PrintError):
    def __init__(self, config: SimpleConfig):
        super(BaseWizard, self).__init__()
        self.config = config
        self.data = {}
        self.pw_args = None
        self._stack: List[WizardStackItem] = []
        self.plugin: Optional[BasePlugin] = None
        self.keystores = []
        self.is_kivy = config.get("gui") == "kivy"
        self.seed_type = None

    def run(self, *args, **kwargs):
        action = args[0]
        args = args[1:]
        storage_data = copy.deepcopy(self.data)
        self._stack.append(WizardStackItem(action, args, kwargs, storage_data))
        if not action:
            return
        if type(action) is tuple:
            self.plugin, action = action
        if self.plugin and hasattr(self.plugin, action):
            f = getattr(self.plugin, action)
            f(self, *args, **kwargs)
        elif hasattr(self, action):
            f = getattr(self, action)
            f(*args, **kwargs)
        else:
            raise RuntimeError("unknown action", action)

    def can_go_back(self):
        return len(self._stack) > 1

    def go_back(self):
        if not self.can_go_back():
            return
        # pop 'current' frame
        self._stack.pop()
        # pop 'previous' frame
        stack_item = self._stack.pop()
        # try to undo side effects since we last entered 'previous' frame
        # FIXME only self.storage is properly restored
        self.data = copy.deepcopy(stack_item.storage_data)
        # rerun 'previous' frame
        self.run(stack_item.action, *stack_item.args, **stack_item.kwargs)

    def reset_stack(self):
        self._stack = []

    def new(self):
        title = _("Create new wallet")
        message = "\n".join([_("What kind of wallet do you want to create?")])
        wallet_kinds = [
            ("standard", _("Standard wallet")),
            ("multisig", _("Multi-signature wallet")),
            ("imported", _(f"Import {CURRENCY} addresses or private keys")),
        ]
        choices = [pair for pair in wallet_kinds if pair[0] in wallet_types]
        self.choice_dialog(
            title=title, message=message, choices=choices, run_next=self.on_wallet_type
        )

    def upgrade_storage(self, storage):
        exc = None

        def on_finished():
            if exc is None:
                self.terminate(storage=storage)
            else:
                raise exc

        def do_upgrade():
            nonlocal exc
            try:
                storage.upgrade()
            except Exception as e:
                exc = e

        self.waiting_dialog(
            do_upgrade, _("Upgrading wallet format..."), on_finished=on_finished
        )

    def run_task_without_blocking_gui(self, task, *, msg: Optional[str] = None) -> Any:
        """Perform a task in a thread without blocking the GUI.
        Returns the result of 'task', or raises the same exception.
        This method blocks until 'task' is finished.
        """
        raise NotImplementedError()

    def on_wallet_type(self, choice):
        self.data["wallet_type"] = self.wallet_type = choice
        if choice == "standard":
            action = "choose_keystore"
        elif choice == "multisig":
            action = "choose_multisig"
        elif choice == "imported":
            action = "import_addresses_or_keys"
        self.run(action)

    def choose_multisig(self):
        def on_multisig(m, n):
            multisig_type = "%dof%d" % (m, n)
            self.data["wallet_type"] = multisig_type
            self.n = n
            self.run("choose_keystore")

        self.multisig_dialog(run_next=on_multisig)

    def choose_keystore(self):
        assert self.wallet_type in ["standard", "multisig"]
        i = len(self.keystores)
        title = (
            _("Add cosigner") + " (%d of %d)" % (i + 1, self.n)
            if self.wallet_type == "multisig"
            else _("Keystore")
        )
        if self.wallet_type == "standard" or i == 0:
            message = _(
                "Do you want to create a new seed, or to restore a wallet using an"
                " existing seed?"
            )
            choices = [
                ("create_standard_seed", _("Create a new seed")),
                ("restore_from_seed", _("I already have a seed")),
                ("restore_from_key", _("Use public or private keys")),
            ]
            if not self.is_kivy:
                choices.append(("choose_hw_device", _("Use a hardware device")))
        else:
            message = _("Add a cosigner to your multi-sig wallet")
            choices = [
                ("restore_from_key", _("Enter cosigner key")),
                ("restore_from_seed", _("Enter cosigner seed")),
            ]
            if not self.is_kivy:
                choices.append(("choose_hw_device", _("Cosign with hardware device")))

        self.choice_dialog(
            title=title, message=message, choices=choices, run_next=self.run
        )

    def import_addresses_or_keys(self):
        def is_valid(x):
            return keystore.is_address_list(x) or keystore.is_private_key_list(
                x, allow_bip38=True
            )

        title = _(f"Import {CURRENCY} Addresses")
        message = _(
            f"Enter a list of {CURRENCY} addresses (this will create a"
            " watching-only wallet), or a list of private keys."
        )
        if bitcoin.is_bip38_available():
            message += " " + _("BIP38 encrypted keys are supported.")
        self.add_xpub_dialog(
            title=title,
            message=message,
            run_next=self.on_import,
            is_valid=is_valid,
            allow_multi=True,
        )

    def bip38_prompt_for_pw(self, bip38_keys):
        """Implemented in Qt InstallWizard subclass"""
        raise NotImplementedError("bip38_prompt_for_pw not implemented")

    def on_import(self, text):
        # text is already sanitized by is_address_list and is_private_keys_list
        if keystore.is_address_list(text):
            self.data["addresses"] = {}
            for addr in text.split():
                try:
                    Address.from_string(addr)
                except Exception:
                    pass
                else:
                    self.data["addresses"][addr] = {}

            # Until this point in the wallet creation process, the flow was common
            # for imported_privkey and imported_address. We now need it to be more
            # precise for the sake of the next step (create_wallet)
            self.data["wallet_type"] = self.wallet_type = "imported_addr"
        elif keystore.is_private_key_list(text, allow_bip38=True):
            bip38_keys = [k for k in text.split() if k and bitcoin.is_bip38_key(k)]
            if bip38_keys:
                decrypted = self.bip38_prompt_for_pw(bip38_keys)
                if not decrypted:
                    self.go_back()
                    return
                for b38, tup in decrypted.items():
                    wif, adr = tup
                    # kind of a hack.. but works. replace the bip38 key with the wif
                    # key in the text.
                    text = text.replace(b38, wif)

            self.keystores = [keystore.from_private_key_list(text)]
            self.data["wallet_type"] = self.wallet_type = "imported_privkey"
            # 'Back' button wasn't working anyway at this point, so we just force it to
            # read 'Cancel' and this proceeds with no password set.
            self.reset_stack()
        else:
            return self.terminate()
        return self.run("create_wallet")

    def restore_from_key(self):
        if self.wallet_type == "standard":
            v = keystore.is_master_key
            title = _("Create keystore from a master key")
            message = " ".join(
                [
                    _(
                        "To create a watching-only wallet, please enter your master"
                        " public key (xpub/ypub/zpub)."
                    ),
                    _(
                        "To create a spending wallet, please enter a master private key"
                        " (xprv/yprv/zprv)."
                    ),
                ]
            )
            self.add_xpub_dialog(
                title=title,
                message=message,
                run_next=self.on_restore_from_key,
                is_valid=v,
            )
        else:
            i = len(self.keystores) + 1
            self.add_cosigner_dialog(
                index=i,
                run_next=self.on_restore_from_key,
                is_valid=keystore.is_bip32_key,
            )

    def on_restore_from_key(self, text):
        k = keystore.from_master_key(text)
        self.on_keystore(k)

    def on_hw_wallet_support(self):
        """Derived class InstallWizard for Qt implements this"""

    def choose_hw_device(self, purpose=HWD_SETUP_NEW_WALLET, *, storage=None):
        title = _("Hardware Keystore")
        # check available plugins
        support = self.plugins.get_hardware_support()
        if not support:
            msg = "\n".join(
                [
                    _("No hardware wallet support found on your system."),
                    _(
                        "Please install the relevant libraries (eg python-trezor for"
                        " Trezor)."
                    ),
                ]
            )
            self.confirm_dialog(
                title=title,
                message=msg,
                run_next=lambda x: self.choose_hw_device(purpose, storage=storage),
            )
            return
        # scan devices
        devices = []
        devmgr = self.plugins.device_manager
        for name, description, plugin in support:
            try:
                # FIXME: side-effect: unpaired_device_info sets client.handler
                u = devmgr.unpaired_device_infos(None, plugin)
            except Exception:
                devmgr.print_error("error", name)
                continue
            devices += [(name, device_info) for device_info in u]
        extra_button = None
        if sys.platform in ("linux", "linux2", "linux3"):
            extra_button = (_("Hardware Wallet Support..."), self.on_hw_wallet_support)
        if not devices:
            msgs = [
                _("No hardware device detected.") + "\n\n",
                _("To trigger a rescan, press 'Next'.") + "\n\n",
            ]

            if sys.platform in ("win32", "win64", "windows"):
                msgs.append(
                    _(
                        'Go to "Settings", "Devices", "Connected devices", and do'
                        ' "Remove device". Then, plug your device again.'
                    )
                    + "\n"
                )

            if sys.platform in ("linux", "linux2", "linux3"):
                msgs.append(
                    _('You may try the "Hardware Wallet Support" tool (below).') + "\n"
                )

            support_no_libs = [s for s in support if not s[2].libraries_available]
            if len(support_no_libs) > 0:
                msgs.append(
                    "\n"
                    + _("Please install the relevant libraries for these plugins:")
                    + " "
                )
                msgs.append(", ".join(s[2].name for s in support_no_libs) + "\n")
                msgs.append(
                    _("On most systems you can do so with this command:") + "\n"
                )
                msgs.append(
                    "pip3 install -r contrib/requirements/requirements-hw.txt\n"
                )

            msgs.append(
                "\n"
                + _("If this problem persists, please visit:")
                + f"\n\n     {REPOSITORY_URL}/issues"
            )

            msg = "".join(msgs)
            self.confirm_dialog(
                title=title,
                message=msg,
                run_next=lambda x: self.choose_hw_device(purpose, storage=storage),
                extra_button=extra_button,
            )
            return
        # select device
        self.devices = devices
        choices = []
        for name, info in devices:
            state = _("initialized") if info.initialized else _("wiped")
            label = info.label or _("An unnamed {}").format(name)
            try:
                transport_str = str(info.device.path)[:20]
            except Exception:
                transport_str = "unknown transport"
            descr = f"{label} [{info.model_name or name}, {state}, {transport_str}]"
            choices.append(((name, info), descr))
        msg = _("Select a device") + ":"
        self.choice_dialog(
            title=title,
            message=msg,
            choices=choices,
            run_next=lambda *args: self.on_device(
                *args, purpose=purpose, storage=storage
            ),
            extra_button=extra_button,
        )

    def on_device(self, name, device_info: DeviceInfo, *, purpose, storage=None):
        self.plugin = self.plugins.find_plugin(name, force_load=True)
        print("-------  " + name + "--------------")
        try:
            client = self.plugin.setup_device(device_info, self, purpose)
        except OSError as e:
            self.show_error(
                _("We encountered an error while connecting to your device:")
                + '\n\n"'
                + str(e)
                + '"\n\n'
                + _("To try to fix this, we will now re-pair with your device.")
                + " "
                + _("Please try again.")
            )
            devmgr = self.plugins.device_manager
            devmgr.unpair_id(device_info.device.id_)
            self.choose_hw_device(purpose, storage=storage)
            return
        except (GoBack, util.UserCancelled):
            self.choose_hw_device(purpose, storage=storage)
            return
        except Exception:
            self.choose_hw_device(purpose, storage=storage)
            return

        if purpose == HWD_SETUP_NEW_WALLET:
            if self.wallet_type == "multisig":
                # There is no general standard for HD multisig.
                # This is partially compatible with BIP45; assumes index=0
                default_derivation = "m/45'/0"
            elif self.plugin.supports_xec_bip44_derivation():
                default_derivation = keystore.bip44_derivation_xec(0)
            else:
                default_derivation = keystore.bip44_derivation_bch(0)
            self.derivation_dialog(
                lambda x: self.run("on_hw_derivation", name, device_info, str(x)),
                default_derivation,
                is_hw_wallet=True,
            )
        elif purpose == HWD_SETUP_DECRYPT_WALLET:
            derivation = get_derivation_used_for_hw_device_encryption()
            xpub = self.plugin.get_xpub(
                device_info.device.id_, derivation, "standard", self
            )
            password = keystore.Xpub.get_pubkey_from_xpub(xpub, ()).hex()
            try:
                storage.decrypt(password)
            except util.InvalidPassword:
                if hasattr(
                    client, "clear_session"
                ):  # FIXME not all hw wallet plugins have this
                    client.clear_session()
                raise
        else:
            raise Exception("unknown purpose: %s" % purpose)

    def derivation_dialog(
        self,
        run_next: Callable,
        default_derivation: str,
        is_hw_wallet: bool = False,
        seed: str = "",
    ):
        bip44_btc = keystore.bip44_derivation_btc(0)
        bip44_bch = keystore.bip44_derivation_bch(0)
        bip44_xec = keystore.bip44_derivation_xec(0)
        lines = [
            _("Enter your wallet derivation here."),
            _("If you are not sure what this is, leave this field unchanged."),
            _(
                "If you want the wallet to use legacy Bitcoin addresses use "
                f"{bip44_btc}"
            ),
            _(f"If you want the wallet to use Bitcoin Cash addresses use {bip44_bch}"),
            _(f"If you want the wallet to use {CURRENCY} addresses use {bip44_xec}"),
        ]
        if is_hw_wallet and default_derivation == bip44_bch:
            lines.append(
                "\nAt this time, it is recommended to use the Bitcoin Cash derivation "
                "path for hardware wallets, unless you know for sure that your "
                "device's firmware already supports the eCash derivation path."
            )
        message = "\n".join(lines)
        scannable = self.wallet_type == "standard" and bool(seed)
        self.derivation_path_dialog(
            run_next=run_next,
            title=_(f"Derivation for {self.wallet_type} wallet"),
            message=message,
            default=default_derivation,
            test=is_bip32_derivation,
            seed=seed,
            scannable=scannable,
        )

    def on_hw_derivation(self, name, device_info: DeviceInfo, derivation):
        from .keystore import hardware_keystore

        devmgr = self.plugins.device_manager
        assert isinstance(self.plugin, HWPluginBase)
        xtype = "standard"
        try:
            xpub = self.plugin.get_xpub(device_info.device.id_, derivation, xtype, self)
            client = devmgr.client_by_id(device_info.device.id_, scan_now=False)
            label = client.label()
        except Exception as e:
            self.print_error(traceback.format_exc())
            self.show_error(str(e))
            return
        d = {
            "type": "hardware",
            "hw_type": name,
            "derivation": derivation,
            "xpub": xpub,
            "label": label,
        }
        k = hardware_keystore(d)
        self.on_keystore(k)

    def passphrase_dialog(self, run_next):
        title = _("Seed extension")
        message = "\n".join(
            [
                _("You may extend your seed with custom words.")
                + " "
                + _("(aka 'passphrase')"),
                _("Your seed extension must be saved together with your seed."),
            ]
        )
        warning = "\n".join(
            [
                _("Note that this is NOT your encryption password."),
                _("If you do not know what this is, leave this field empty."),
            ]
        )
        self.line_dialog(
            title=title,
            message=message,
            warning=warning,
            default="",
            test=lambda x: True,
            run_next=run_next,
        )

    def restore_from_seed(self):
        self.opt_bip39 = True
        self.opt_ext = True
        # TODO FIX #bitcoin.is_seed if self.wallet_type == 'standard' else bitcoin.is_new_seed
        test = mnemo.is_seed
        self.restore_seed_dialog(run_next=self.on_restore_seed, test=test)

    def on_restore_seed(self, seed, is_bip39, is_ext):
        # NB: seed_type_name here may also auto-detect 'bip39'
        self.seed_type = "bip39" if is_bip39 else mnemo.seed_type_name(seed)
        if self.seed_type == "bip39":

            def f(passphrase):
                self.on_restore_bip39(seed, passphrase)

            self.passphrase_dialog(run_next=f) if is_ext else f("")
        elif self.seed_type in ["standard", "electrum"]:

            def f(passphrase):
                self.run("create_keystore", seed, passphrase)

            self.passphrase_dialog(run_next=f) if is_ext else f("")
        elif self.seed_type == "old":
            self.run("create_keystore", seed, "")
        else:
            raise RuntimeError("Unknown seed type", self.seed_type)

    def on_restore_bip39(self, seed, passphrase):
        self.derivation_dialog(
            lambda x: self.run("on_bip44", seed, passphrase, str(x)),
            keystore.bip44_derivation_xec(0),
            seed=seed,
        )

    def create_keystore(self, seed, passphrase):
        # auto-detect, prefers old, electrum, bip39 in that order. Since we
        # never create ambiguous seeds, this is fine.
        k = keystore.from_seed(seed, passphrase)
        self.on_keystore(k)

    def on_bip44(self, seed, passphrase, derivation):
        # BIP39
        k = keystore.from_seed(
            seed, passphrase, derivation=derivation, seed_type="bip39"
        )
        self.on_keystore(k)

    def on_keystore(self, k):
        has_xpub = isinstance(k, keystore.Xpub)
        if has_xpub:
            t1 = xpub_type(k.xpub)
        if self.wallet_type == "standard":
            if has_xpub and t1 not in ["standard"]:
                self.show_error(_("Wrong key type") + " %s" % t1)
                self.run("choose_keystore")
                return
            self.keystores.append(k)
            self.run("create_wallet")
        elif self.wallet_type == "multisig":
            assert has_xpub
            if t1 not in ["standard"]:
                self.show_error(_("Wrong key type") + " %s" % t1)
                self.run("choose_keystore")
                return
            if k.xpub in (ks.xpub for ks in self.keystores):
                self.show_error(_("Error: duplicate master public key"))
                self.run("choose_keystore")
                return
            if len(self.keystores) > 0:
                t2 = xpub_type(self.keystores[0].xpub)
                if t1 != t2:
                    self.show_error(
                        _("Cannot add this cosigner:")
                        + "\n"
                        + "Their key type is '%s', we are '%s'" % (t1, t2)
                    )
                    self.run("choose_keystore")
                    return
            self.keystores.append(k)
            if len(self.keystores) == 1:
                xpub = k.get_master_public_key()
                self.reset_stack()
                self.run("show_xpub_and_add_cosigners", xpub)
            elif len(self.keystores) < self.n:
                self.run("choose_keystore")
            else:
                self.run("create_wallet")

    def create_wallet(self):
        encrypt_keystore = any(k.may_have_password() for k in self.keystores)
        # note: the following condition ("if") is duplicated logic from
        # wallet.get_available_storage_encryption_version()
        if self.wallet_type == "standard" and isinstance(
            self.keystores[0], HardwareKeyStore
        ):
            # offer encrypting with a pw derived from the hw device
            k: HardwareKeyStore = self.keystores[0]
            assert isinstance(self.plugin, HWPluginBase)
            try:
                k.handler = self.plugin.create_handler(self)
                password = k.get_password_for_storage_encryption()
            except util.UserCancelled:
                devmgr = self.plugins.device_manager
                devmgr.unpair_xpub(k.xpub)
                self.choose_hw_device()
                return
            except Exception as e:
                traceback.print_exc(file=sys.stderr)
                self.show_error(str(e))
                return
            self.request_storage_encryption(
                run_next=lambda encrypt_storage: self.on_password(
                    password,
                    encrypt_storage=encrypt_storage,
                    storage_enc_version=STO_EV_XPUB_PW,
                    encrypt_keystore=False,
                )
            )
        else:
            # prompt the user to set an arbitrary password
            self.request_password(
                run_next=lambda password, encrypt_storage: self.on_password(
                    password,
                    encrypt_storage=encrypt_storage,
                    storage_enc_version=STO_EV_USER_PW,
                    encrypt_keystore=encrypt_keystore,
                ),
                force_disable_encrypt_cb=not encrypt_keystore,
            )

    def on_password(
        self,
        password,
        *,
        encrypt_storage,
        storage_enc_version=STO_EV_USER_PW,
        encrypt_keystore,
    ):
        for k in self.keystores:
            if k.may_have_password():
                k.update_password(None, password)
        if self.wallet_type == "standard":
            self.data["seed_type"] = self.seed_type
            keys = self.keystores[0].dump()
            self.data["keystore"] = keys
        elif self.wallet_type == "multisig":
            for i, k in enumerate(self.keystores):
                self.data["x%d/" % (i + 1)] = k.dump()
        elif self.wallet_type == "imported_addr":
            # addresses already parsed in on_import
            pass
        elif self.wallet_type == "imported_privkey":
            if len(self.keystores) > 0:
                keys = self.keystores[0].dump()
                self.data["keystore"] = keys
        else:
            raise Exception("Unknown wallet type")
        self.pw_args = password, encrypt_storage, storage_enc_version
        self.terminate()

    def create_storage(self, path):
        if not self.pw_args:
            return
        password, encrypt_storage, storage_enc_version = self.pw_args
        storage = WalletStorage(path)
        storage.set_keystore_encryption(bool(password))  # and encrypt_keystore)
        for key, value in self.data.items():
            storage.put(key, value)
        if encrypt_storage:
            storage.set_password(password, enc_version=storage_enc_version)
        storage.write()
        return storage

    def terminate(self, *, storage: Optional[WalletStorage] = None):
        # implemented by subclasses
        raise NotImplementedError()

    def show_xpub_and_add_cosigners(self, xpub):
        self.show_xpub_dialog(xpub=xpub, run_next=lambda x: self.run("choose_keystore"))

    def on_cosigner(self, text, password, i):
        k = keystore.from_master_key(text, password)
        self.on_keystore(k)

    def create_standard_seed(self):
        # we now generate bip39 by default; changing the below back to
        # 'electrum' would default to electrum seeds again.
        self.create_seed("bip39")

    def create_seed(self, seed_type):
        self.seed_type = seed_type
        if seed_type in ["standard", "electrum"]:
            seed = mnemo.MnemonicElectrum("en").make_seed()
        elif seed_type == "bip39":
            seed = mnemo.make_bip39_words("english")
        else:
            # This should never happen.
            raise ValueError("Cannot make seed for unknown seed type " + str(seed_type))
        self.opt_bip39 = False
        self.show_seed_dialog(
            run_next=lambda x: self.request_passphrase(seed, x), seed_text=seed
        )

    def request_passphrase(self, seed, opt_passphrase):
        if opt_passphrase:
            self.passphrase_dialog(run_next=lambda x: self.confirm_seed(seed, x))
        else:
            self.run("confirm_seed", seed, "")

    def confirm_seed(self, seed, passphrase):
        self.confirm_seed_dialog(
            run_next=lambda x: self.confirm_passphrase(seed, passphrase),
            test=lambda x: x == seed,
        )

    def confirm_passphrase(self, seed, passphrase):
        if passphrase:
            title = _("Confirm Seed Extension")
            message = "\n".join(
                [
                    _("Your seed extension must be saved together with your seed."),
                    _("Please type it here."),
                ]
            )
            self.line_dialog(
                run_next=lambda x: self.run("create_keystore", seed, x),
                title=title,
                message=message,
                default="",
                test=lambda x: x == passphrase,
            )
        else:
            self.run("create_keystore", seed, "")

    def create_addresses(self):
        def task():
            self.wallet.synchronize()
            self.wallet.storage.write()
            self.terminate()

        msg = _(f"{PROJECT_NAME} is generating your addresses, please wait...")
        self.waiting_dialog(task, msg)
