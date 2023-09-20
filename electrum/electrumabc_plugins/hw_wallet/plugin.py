#!/usr/bin/env python3
#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020 The Electrum ABC developers
# Copyright (C) 2016  The Electrum developers
# Copyright (C) 2019  The Electron Cash developers
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

from typing import TYPE_CHECKING, Any, Iterable, Optional, Sequence, Type

from electrumabc.address import OpCodes, Script, ScriptOutput
from electrumabc.i18n import _, ngettext
from electrumabc.plugins import BasePlugin, Device, DeviceInfo, DeviceMgr, hook
from electrumabc.transaction import Transaction
from electrumabc.util import finalization_print_error

if TYPE_CHECKING:
    import threading

    from electrumabc.base_wizard import BaseWizard
    from electrumabc.keystore import HardwareKeyStore
    from electrumabc.wallet import AbstractWallet


class HWPluginBase(BasePlugin):
    keystore_class: Type[HardwareKeyStore]
    libraries_available: bool

    DEVICE_IDS: Iterable[Any]

    # For now, Ledger and Trezor don't support the 899' derivation path.
    # SatochipPlugin overrides this class attribute.
    SUPPORTS_XEC_BIP44_DERIVATION: bool = False

    def __init__(self, parent, config, name):
        BasePlugin.__init__(self, parent, config, name)
        self.device = self.keystore_class.device
        self.keystore_class.plugin = self

    def is_enabled(self):
        return True

    def device_manager(self) -> DeviceMgr:
        return self.parent.device_manager

    def create_device_from_hid_enumeration(
        self,
        d: dict,
        *,
        product_key,
    ) -> Optional[Device]:
        # Older versions of hid don't provide interface_number
        interface_number = d.get("interface_number", -1)
        usage_page = d["usage_page"]
        id_ = d["serial_number"]
        if len(id_) == 0:
            id_ = str(d["path"])
        id_ += str(interface_number) + str(usage_page)
        device = Device(
            path=d["path"],
            interface_number=interface_number,
            id_=id_,
            product_key=product_key,
            usage_page=usage_page,
        )
        return device

    @hook
    def close_wallet(self, wallet: AbstractWallet):
        for keystore in wallet.get_keystores():
            if isinstance(keystore, self.keystore_class):
                self.device_manager().unpair_xpub(keystore.xpub)
                self._cleanup_keystore_extra(keystore)

    def scan_and_create_client_for_device(
        self, *, device_id: str, wizard: BaseWizard
    ) -> HardwareClientBase:
        devmgr = self.device_manager()
        client = devmgr.client_by_id(device_id)
        if client is None:
            raise Exception(
                _("Failed to create a client for this device.")
                + "\n"
                + _("Make sure it is in the correct state.")
            )
        client.handler = self.create_handler(wizard)
        return client

    def setup_device(
        self, device_info: DeviceInfo, wizard: BaseWizard, purpose
    ) -> HardwareClientBase:
        """Called when creating a new wallet or when using the device to decrypt
        an existing wallet. Select the device to use.  If the device is
        uninitialized, go through the initialization process.

        Runs in GUI thread.
        """
        raise NotImplementedError()

    def _cleanup_keystore_extra(self, keystore):
        # awkward cleanup code for the keystore 'thread' object (see qt.py)
        finalization_print_error(keystore)  # track object lifecycle
        if callable(getattr(keystore.thread, "stop", None)):
            keystore.thread.stop()

    def show_address(self, wallet, address, keystore=None):
        pass  # implemented in child classes

    def show_address_helper(self, wallet, address, keystore=None):
        if keystore is None:
            keystore = wallet.get_keystore()
        if not wallet.is_mine(address):
            keystore.handler.show_error(_("Address not in wallet."))
            return False
        if not isinstance(keystore, self.keystore_class):
            return False
        return True

    def supports_xec_bip44_derivation(self) -> bool:
        return self.SUPPORTS_XEC_BIP44_DERIVATION

    def create_client(
        self,
        device: Device,
        handler: Optional[HardwareHandlerBase],
    ) -> Optional[HardwareClientBase]:
        raise NotImplementedError()

    def get_xpub(self, device_id, derivation: str, xtype, wizard: BaseWizard) -> str:
        raise NotImplementedError()

    def create_handler(self, window) -> HardwareHandlerBase:
        # note: in Qt GUI, 'window' is either an ElectrumWindow or an InstallWizard
        raise NotImplementedError()

    def can_recognize_device(self, device: Device) -> bool:
        """Whether the plugin thinks it can handle the given device.
        Used for filtering all connected hardware devices to only those by this vendor.
        """
        return device.product_key in self.DEVICE_IDS


class HardwareClientBase:
    handler: Optional[HardwareHandlerBase]

    def __init__(self, *, plugin: HWPluginBase):
        self.plugin = plugin

    def device_manager(self) -> DeviceMgr:
        return self.plugin.device_manager()

    def is_pairable(self) -> bool:
        raise NotImplementedError()

    def close(self):
        raise NotImplementedError()

    def timeout(self, cutoff) -> None:
        pass

    def is_initialized(self) -> bool:
        """True if initialized, False if wiped."""
        raise NotImplementedError()

    def label(self) -> Optional[str]:
        """The name given by the user to the device.
        Note: labels are shown to the user to help distinguish their devices,
        and they are also used as a fallback to distinguish devices programmatically.
        So ideally, different devices would have different labels.
        """
        # When returning a constant here (i.e. not implementing the method in the way
        # it is supposed to work), make sure the return value is in
        # electrumabc.plugins.PLACEHOLDER_HW_CLIENT_LABELS
        return " "

    def has_usable_connection_with_device(self) -> bool:
        raise NotImplementedError()

    def get_xpub(self, bip32_path: str, xtype) -> str:
        raise NotImplementedError()

    def device_model_name(self) -> Optional[str]:
        """Return the name of the model of this device, which might be displayed in the
        UI.
        E.g. for Trezor, "Trezor One" or "Trezor T".
        """
        return None


class HardwareHandlerBase:
    """An interface between the GUI and the device handling logic for handling I/O."""

    win = None
    device: str

    def get_wallet(self) -> Optional[AbstractWallet]:
        if self.win is not None:
            if hasattr(self.win, "wallet"):
                return self.win.wallet

    def get_gui_thread(self) -> Optional[threading.Thread]:
        if self.win is not None:
            if hasattr(self.win, "gui_thread"):
                return self.win.gui_thread

    def update_status(self, paired: bool) -> None:
        pass

    def query_choice(self, msg: str, labels: Sequence[str]) -> Optional[int]:
        raise NotImplementedError()

    def yes_no_question(self, msg: str) -> bool:
        raise NotImplementedError()

    def show_message(self, msg: str, on_cancel=None) -> None:
        raise NotImplementedError()

    def show_error(self, msg: str, blocking: bool = False) -> None:
        raise NotImplementedError()

    def finished(self) -> None:
        pass

    def get_word(self, msg: str) -> str:
        raise NotImplementedError()

    def get_passphrase(self, msg: str, confirm: bool) -> Optional[str]:
        raise NotImplementedError()


def is_any_tx_output_on_change_branch(tx: Transaction) -> bool:
    if not tx.output_info:
        return False
    for o in tx.outputs():
        info = tx.output_info.get(o.destination)
        if info is not None:
            if info[0][0] == 1:
                return True
    return False


# will return address.script[2:] (everyting after the first OP_RETURN & PUSH bytes)
def validate_op_return_output_and_get_data(
    script_output: ScriptOutput,
    # in bytes
    max_size: int = 220,
    # number of pushes supported after the OP_RETURN, most HW wallets support only 1
    # push, some more than 1.  Specify None to omit the number-of-pushes check.
    max_pushes: int = 1,
) -> bytes:
    if max_pushes is None:
        # Caller says "no limit", so just to keep the below code simple, we
        # do this and effectively sets the limit on pushes to "unlimited",
        # since there can never be more pushes than bytes in the payload!
        max_pushes = max_size

    assert max_pushes >= 1

    ops = Script.get_ops(script_output.script)

    num_pushes = len(ops) - 1

    if len(ops) < 1 or ops[0][0] != OpCodes.OP_RETURN:
        raise RuntimeError(_("Only OP_RETURN scripts are supported."))

    if (
        num_pushes < 1
        or num_pushes > max_pushes
        or any(ops[i + 1][1] is None for i in range(num_pushes))
    ):
        raise RuntimeError(
            ngettext(
                "OP_RETURN is limited to {max_pushes} data push.",
                "OP_RETURN is limited to {max_pushes} data pushes.",
                max_pushes,
            ).format(max_pushes=max_pushes)
        )

    # caller expects everything after the OP_RETURN and PUSHDATA op
    data = script_output.script[2:]

    if len(data) > max_size:
        raise RuntimeError(
            _("OP_RETURN data size exceeds the maximum of {} bytes.".format(max_size))
        )

    return data


def only_hook_if_libraries_available(func):
    # note: this decorator must wrap @hook, not the other way around,
    # as 'hook' uses the name of the function it wraps
    def wrapper(self: HWPluginBase, *args, **kwargs):
        if not self.libraries_available:
            return None
        return func(self, *args, **kwargs)

    return wrapper
