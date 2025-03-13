import time
from functools import partial
from struct import pack

import trezorlib.btc
import trezorlib.device
import trezorlib.firmware
import trezorlib.models
import trezorlib.transport
from trezorlib.client import PASSPHRASE_ON_DEVICE, TrezorClient
from trezorlib.exceptions import (
    Cancelled,
    OutdatedFirmwareError,
    TrezorException,
    TrezorFailure,
)
from trezorlib.messages import ButtonRequestType, WordRequestType

from electrumabc.avalanche.primitives import PublicKey
from electrumabc.avalanche.proof import Stake
from electrumabc.bip32 import serialize_xpub
from electrumabc.i18n import _
from electrumabc.keystore import bip39_normalize_passphrase
from electrumabc.printerror import PrintError
from electrumabc.util import UserCancelled

from ..hw_wallet.plugin import HardwareClientBase
from .compat import RECOVERY_TYPE_MATRIX

MESSAGES = {
    ButtonRequestType.ConfirmOutput: _(
        "Confirm the transaction output on your {} device"
    ),
    ButtonRequestType.ResetDevice: _(
        "Complete the initialization process on your {} device"
    ),
    ButtonRequestType.ConfirmWord: _("Write down the seed word shown on your {}"),
    ButtonRequestType.WipeDevice: _(
        "Confirm on your {} that you want to wipe it clean"
    ),
    ButtonRequestType.ProtectCall: _("Confirm on your {} device the message to sign"),
    ButtonRequestType.SignTx: _(
        "Confirm the total amount spent and the transaction fee on your {} device"
    ),
    ButtonRequestType.Address: _("Confirm wallet address on your {} device"),
    ButtonRequestType._Deprecated_ButtonRequest_PassphraseType: _(
        "Choose on your {} device where to enter your passphrase"
    ),
    ButtonRequestType.PassphraseEntry: _(
        "Please enter your passphrase on the {} device"
    ),
    "default": _("Check your {} device to continue"),
}


def parse_path(n):
    """Convert bip32 path to list of uint32 integers with prime flags
    m/0/-1/1' -> [0, 0x80000001, 0x80000001]

    based on code in trezorlib
    """
    path = []
    BIP32_PRIME = 0x80000000
    for x in n.split("/")[1:]:
        if x == "":
            continue
        prime = 0
        if x.endswith("'"):
            x = x.replace("'", "")
            prime = BIP32_PRIME
        if x.startswith("-"):
            prime = BIP32_PRIME
        path.append(abs(int(x)) | prime)
    return path


class TrezorClientBase(HardwareClientBase, PrintError):
    def __init__(self, transport, handler, plugin):
        HardwareClientBase.__init__(self, plugin=plugin)
        self.client = TrezorClient(transport, ui=self)
        self.device = plugin.device
        self.handler = handler

        self.msg = None
        self.creating_wallet = False

        self.in_flow = False

        self.used()

    def run_flow(self, message=None, creating_wallet=False):
        if self.in_flow:
            raise RuntimeError("Overlapping call to run_flow")

        self.in_flow = True
        self.msg = message
        self.creating_wallet = creating_wallet
        self.prevent_timeouts()
        return self

    def end_flow(self):
        self.in_flow = False
        self.msg = None
        self.creating_wallet = False
        self.handler.finished()
        self.used()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.end_flow()
        if exc_value is not None:
            if issubclass(exc_type, Cancelled):
                raise UserCancelled from exc_value
            elif issubclass(exc_type, TrezorFailure):
                raise RuntimeError(str(exc_value)) from exc_value
            elif issubclass(exc_type, OutdatedFirmwareError):
                raise OutdatedFirmwareError(exc_value) from exc_value
            else:
                return False
        return True

    @property
    def features(self):
        return self.client.features

    def __str__(self):
        return "%s/%s" % (self.label(), self.features.device_id)

    def label(self):
        return (
            "An unnamed trezor" if self.features.label is None else self.features.label
        )

    def is_initialized(self):
        return self.features.initialized

    def is_pairable(self):
        return not self.features.bootloader_mode

    def has_usable_connection_with_device(self):
        if self.in_flow:
            return True

        try:
            self.client.init_device()
        except Exception:
            return False
        return True

    def used(self):
        self.last_operation = time.time()

    def prevent_timeouts(self):
        self.last_operation = float("inf")

    def timeout(self, cutoff):
        """Time out the client if the last operation was before cutoff."""
        if self.last_operation < cutoff:
            self.print_error("timed out")
            self.clear_session()

    def i4b(self, x):
        return pack(">I", x)

    def get_xpub(self, bip32_path, xtype, creating=False):
        address_n = parse_path(bip32_path)
        with self.run_flow(creating_wallet=creating):
            node = trezorlib.btc.get_public_node(self.client, address_n).node
        return serialize_xpub(
            xtype,
            node.chain_code,
            node.public_key,
            node.depth,
            self.i4b(node.fingerprint),
            self.i4b(node.child_num),
        )

    def toggle_passphrase(self):
        if self.features.passphrase_protection:
            msg = _("Confirm on your {} device to disable passphrases")
        else:
            msg = _("Confirm on your {} device to enable passphrases")
        enabled = not self.features.passphrase_protection
        with self.run_flow(msg):
            trezorlib.device.apply_settings(self.client, use_passphrase=enabled)

    def change_label(self, label):
        with self.run_flow(_("Confirm the new label on your {} device")):
            trezorlib.device.apply_settings(self.client, label=label)

    def change_homescreen(self, homescreen):
        with self.run_flow(_("Confirm on your {} device to change your home screen")):
            trezorlib.device.apply_settings(self.client, homescreen=homescreen)

    def set_pin(self, remove):
        if remove:
            msg = _("Confirm on your {} device to disable PIN protection")
        elif self.features.pin_protection:
            msg = _("Confirm on your {} device to change your PIN")
        else:
            msg = _("Confirm on your {} device to set a PIN")
        with self.run_flow(msg):
            trezorlib.device.change_pin(self.client, remove)

    def check_firmware(self, filename, model, fingerprint):
        f = open(filename, "rb")
        firmware_data = f.read()
        f.close()

        # Parse the firmware
        try:
            firmware_obj = trezorlib.firmware.parse(firmware_data)
        except Exception:
            self.handler.show_error(f"{filename} is not a valid Trezor firmware file")
            return None

        # If a fingerprint is supplied, check it matches. Based on trezorlib cli
        # validate_fingerprint() function
        firmware_fingerprint = firmware_obj.digest().hex()
        if fingerprint and fingerprint != firmware_fingerprint:
            self.handler.show_error(
                f"The firmware fingerprint {firmware_fingerprint} doesn't match the expected fingerprint {fingerprint}"
            )
            return None

        # Is this a legit Trezor firmware, or at least a valid custom firmware ?
        invalid_fw = False
        try:
            # The firmware is signed: it's either an original Trezor firmware
            # or a custom firmware signed with Trezor dev keys
            firmware_obj.verify()
        except trezorlib.firmware.Unsigned:
            # This is either a legacy firmware with no signature, or a custom
            # firmware. Let's run some minimal check if possible.
            if trezorlib.firmware.is_onev2(firmware_obj):
                try:
                    firmware_obj.embedded_v2.verify_unsigned()
                except trezorlib.firmware.FirmwareIntegrityError:
                    invalid_fw = True
                    pass
        except trezorlib.firmware.FirmwareIntegrityError:
            invalid_fw = True
            pass

        if invalid_fw:
            self.handler.show_error(f"The {filename} firmware is invalid")
            return None

        # Retrieve the firmware vendor if possible
        firmware_vendor = None
        if isinstance(firmware_obj, trezorlib.firmware.VendorFirmware):
            firmware_vendor = firmware_obj.vendor_header.text

        # Extracted from trezorlib cli print_firmware_version() function
        firmware_version = None
        firmware_model = None
        if isinstance(firmware_obj, trezorlib.firmware.LegacyFirmware):
            if firmware_obj.embedded_v2:
                firmware_version = firmware_obj.embedded_v2.header.version
        elif isinstance(firmware_obj, trezorlib.firmware.LegacyV2Firmware):
            firmware_model = firmware_obj.header.hw_model
            firmware_version = firmware_obj.header.version
        elif isinstance(firmware_obj, trezorlib.firmware.VendorFirmware):
            firmware_model = firmware_obj.vendor_header.hw_model
            firmware_version = firmware_obj.firmware.header.version

        # Convert to a convenient name so we can compare with the model name
        # extracted from the current firmware
        if firmware_model:
            try:
                # Get the model as an enum
                model_enum = trezorlib.firmware.models.Model.from_hw_model(
                    firmware_model
                )
                # Convert it to string, this is the internal device codename
                device_codename = model_enum.value.decode("ascii")
                # Get the TrezorModel structure from device codename
                trezor_model = trezorlib.models.by_internal_name(device_codename)
                # Get the commercial name from the trezor model structure, which
                # is what we can use to compare with our current firmware model
                # name
                firmware_model = trezor_model.name
            except Exception:
                firmware_model = None
                pass

        # Extracted from trezorlib cli check_device_match() function
        if (firmware_model and model != firmware_model) or (model != "1") != isinstance(
            firmware_obj, trezorlib.firmware.VendorFirmware
        ):
            self.handler.show_error(
                f"The firmware target device ({firmware_model}) does not match your device ({model})."
            )
            return None

        # Unable to determine what the target model is, show a warning
        if not firmware_model and not self.handler.yes_no_question(
            f"Unable to determine the target model from this firmware file: {filename}.\n"
            f"This might indicate an old firmware format.\n\n"
            f"Continue anyway ?"
        ):
            return None

        # Version compatibility check
        bootloader_onev2 = self.atleast_version(1, 8, 0)
        if (
            bootloader_onev2
            and isinstance(firmware_obj, trezorlib.firmware.LegacyFirmware)
            and not firmware_obj.embedded_v2
        ):
            self.handler.show_error("Firmware is too old for your device.")
            return None

        if not bootloader_onev2 and isinstance(
            firmware_obj, trezorlib.firmware.LegacyV2Firmware
        ):
            self.handler.show_error("You need to upgrade to bootloader >= 1.8.0 first.")
            return None

        # Extract the firmware header if possible
        firmware_header = b""
        if isinstance(firmware_obj, trezorlib.firmware.VendorFirmware):
            firmware_header_size = (
                firmware_obj.firmware.header.header_len
                + firmware_obj.vendor_header.header_len
            )
            firmware_header = firmware_data[:firmware_header_size]

        return firmware_data, firmware_header, firmware_vendor, firmware_version

    def wait_for_device(self, path, timeout):
        for _i in range(timeout * 2):
            time.sleep(0.5)
            try:
                transport = trezorlib.transport.get_transport(path, prefix_search=True)
                client = TrezorClient(transport, ui=self)
                if client:
                    return client
            except Exception:
                pass
        return None

    def enter_bootloader(
        self,
        path,
        firmware_header,
        boot_command=trezorlib.messages.BootCommand.STOP_AND_WAIT,
    ):
        # Reboot to bootloader mode
        with self.run_flow(
            _(
                "Confirm on your {} device to reboot to bootloader mode,\n"
                "then select 'Install Firmware' within 30s on the device "
                "screen."
            )
        ):
            trezorlib.device.reboot_to_bootloader(
                self.client,
                boot_command=boot_command,
                firmware_header=firmware_header,
            )

        # 30s to reboot and click to enter bootloader mode
        bootloader_client = self.wait_for_device(path, 30)
        if not bootloader_client:
            self.handler.show_error(
                "Timeout waiting for the device to enter bootloader mode.\n"
                "Please restart the device and retry."
            )
            return None
        return bootloader_client

    def update_firmware(self, filename, fingerprint):
        model = self.get_trezor_model()

        fw = self.check_firmware(filename, model, fingerprint)
        if not fw:
            # Something went wrong, this firmware cannot be installed on this
            # device
            return
        firmware_data, firmware_header, firmware_vendor, firmware_version = fw

        # Give the user a chance to abort
        firmware_version_string = (
            ".".join([str(v) for v in firmware_version[:3]])
            if firmware_version
            else "Unknown"
        )
        if not self.handler.yes_no_question(
            f"You are about to install a new firmware\n\n"
            f"Firmware file: {filename}\n"
            f"Firmware vendor: {firmware_vendor or ('unknown' if model != '1' else 'not embedded in Model 1 firmware')}\n"
            f"Firmware version: {firmware_version_string}\n\n"
            f"Continue ?"
        ):
            return

        # Upgrade logic starts here
        path = self.client.transport.get_path()

        vendor_message = (
            (
                "This firmware vendor differs from the one currently installed on "
                "the device.\n\n"
            )
            if firmware_vendor
            else ""
        )

        # Changing the firmware vendor will wipe the seed
        actual_vendor = self.client.features.fw_vendor
        if actual_vendor != firmware_vendor and not self.handler.yes_no_question(
            f"{vendor_message}"
            "WARNING: Installing this firmware will wipe your seed, so make "
            "sure you have a backup !\n\n"
            "Continue anyway ?"
        ):
            return

        # Unlock the bootloader if needed. Don't do this for model 1, for the
        # official firmware of if a previously non-official firmware was
        # installed (which means the bootloader is already unlocked)
        entered_bootloader = False
        if (
            model != "1"
            and firmware_vendor not in ("Trezor", "SatoshiLabs")
            and actual_vendor != firmware_vendor
        ):
            if not self.handler.yes_no_question(
                "This firmware is not an official firmware from Trezor.\n"
                "In order to install this firmware, your device bootloader "
                "needs to be first unlocked.\n\n"
                "WARNING: This process is permanent and irreversible !\n\n"
                "Continue anyway ?"
            ):
                return

            bootloader_client = self.enter_bootloader(path, firmware_header)

            bootloader_unlocked = False
            try:
                with self.run_flow(_("Unlock your {} device bootloader.\n")):
                    trezorlib.device.unlock_bootloader(bootloader_client)
                    bootloader_unlocked = True
            except RuntimeError:
                # The bootloader was already unlocked, continue with the
                # firmware upgrade
                if not self.handler.yes_no_question(
                    "The bootloader is already unlocked, continue with the\n"
                    "firmware update ?"
                ):
                    return
                entered_bootloader = True
            except Exception:
                # User aborted
                return

            if bootloader_unlocked:
                self.handler.show_message(
                    "Please unplug your device, plug it back and unlock it.\n"
                    "This window will close automatically upon connection."
                )
                self.client = self.wait_for_device(path, 90)
                self.handler.finished()

        # We can send a better firmware upgrade bootloader message when
        # installing an official firmware
        if not entered_bootloader:
            if firmware_vendor in ("Trezor", "SatoshiLabs"):
                bootloader_client = self.enter_bootloader(
                    path,
                    firmware_header,
                    boot_command=trezorlib.messages.BootCommand.INSTALL_UPGRADE,
                )
            else:
                bootloader_client = self.enter_bootloader(path, firmware_header)

        def update(n_steps, _current_item=None):
            """Firmware update callback used to refresh the progress bar"""
            update.bytes_transferred = getattr(update, "bytes_transferred", 0)
            update.bytes_transferred += n_steps
            self.handler.update_progress(update.bytes_transferred)

        # There is no progress feedback on model 1, so we don't show the
        # progress bar when updating this device
        if model == "1":
            update_cb = None
            max_progress = None
        else:
            update_cb = update
            max_progress = len(firmware_data)

        task = partial(
            trezorlib.firmware.update, bootloader_client, firmware_data, update_cb
        )
        self.handler.show_wait_dialog(
            _(
                f"Updating the {self.device} firmware to {firmware_vendor or ''} version {firmware_version_string}..."
            ),
            task,
            max_progress,
        )

        self.handler.show_message(
            "If you completed the firmware update, your device will now "
            "reboot.\n"
            "If you canceled the update, please reboot the device manually.\n\n"
            "This window will close automatically after you reconnected and "
            "unlocked the device."
        )

        self.client = self.wait_for_device(path, 90)
        self.handler.finished()

    def clear_session(self):
        """Clear the session to force pin (and passphrase if enabled)
        re-entry.  Does not leak exceptions."""
        self.print_error("clear session:", self)
        self.prevent_timeouts()
        try:
            self.client.clear_session()
        except Exception as e:
            # If the device was removed it has the same effect...
            self.print_error("clear_session: ignoring error", str(e))

    def close(self):
        """Called when Our wallet was closed or the device removed."""
        self.print_error("closing client")
        self.clear_session()

    def atleast_version(self, major, minor=0, patch=0):
        return self.client.version >= (major, minor, patch)

    def is_uptodate(self):
        if self.client.is_outdated():
            return False
        return self.client.version >= self.plugin.minimum_firmware

    def get_trezor_model(self):
        """Returns '1' for Trezor One, 'T' for Trezor T, etc."""
        return self.features.model

    def device_model_name(self):
        model = self.get_trezor_model()
        if model == "1":
            return "Trezor One"
        elif model == "T":
            return "Trezor T"
        elif model == "Safe 3":
            return "Safe 3"
        elif model == "Safe 5":
            return "Safe 5"
        return None

    def show_address(self, address_str, script_type, multisig=None):
        coin_name = self.plugin.get_coin_name()
        address_n = parse_path(address_str)
        with self.run_flow():
            return trezorlib.btc.get_address(
                self.client,
                coin_name,
                address_n,
                show_display=True,
                script_type=script_type,
                multisig=multisig,
            )

    def sign_message(self, address_str, message):
        coin_name = self.plugin.get_coin_name()
        address_n = parse_path(address_str)
        with self.run_flow():
            return trezorlib.btc.sign_message(
                self.client, coin_name, address_n, message
            )

    def sign_stake(
        self,
        address_str: str,
        stake: Stake,
        expiration_time: int,
        master_pubkey: PublicKey,
    ):
        try:
            import trezorlib.ecash
        except ImportError:
            raise NotImplementedError(
                _(
                    "Signing stakes with a Trezor device requires a compatible "
                    "version of trezorlib. Please install the correct version "
                    "and restart ElectrumABC."
                ).format(self.device)
            )

        address_n = parse_path(address_str)
        with self.run_flow():
            return trezorlib.ecash.sign_stake(
                self.client,
                address_n,
                bytes.fromhex(stake.utxo.txid.get_hex()),
                stake.utxo.n,
                stake.amount,
                stake.height,
                stake.is_coinbase,
                expiration_time,
                master_pubkey.keydata,
            )

    def recover_device(self, recovery_type, *args, **kwargs):
        input_callback = self.mnemonic_callback(recovery_type)
        with self.run_flow():
            return trezorlib.device.recover(
                self.client,
                *args,
                input_callback=input_callback,
                type=recovery_type,
                **kwargs,
            )

    # ========= Unmodified trezorlib methods =========

    def sign_tx(self, *args, **kwargs):
        with self.run_flow():
            return trezorlib.btc.sign_tx(self.client, *args, **kwargs)

    def reset_device(self, *args, **kwargs):
        with self.run_flow():
            return trezorlib.device.reset(self.client, *args, **kwargs)

    def wipe_device(self, *args, **kwargs):
        with self.run_flow():
            return trezorlib.device.wipe(self.client, *args, **kwargs)

    # ========= UI methods ==========

    def button_request(self, br):
        message = self.msg or MESSAGES.get(br.code) or MESSAGES["default"]

        def on_cancel():
            try:
                self.client.cancel()
            except TrezorException as e:
                self.print_error("Exception during cancel call:", repr(e))
                self.handler.show_error(
                    _(
                        "The {} device is now in an inconsistent state.\n\nYou may have"
                        " to unplug the device and plug it back in and restart what you"
                        " were doing."
                    ).format(self.device)
                )
            finally:
                # HACK. This is to get out of the situation with a stuck install wizard
                # when there is a client error after user hits "cancel" in the GUI.
                # Unfortunately the libusb transport is buggy as hell... and there is
                # no way to cancel an in-process command that I can tell.
                #
                # See trezor.py initialize_device() function for the caller that
                # expects this code to be here and exit its event loop.
                loops = getattr(self.handler, "_loops", None)
                if loops and loops[0].isRunning():
                    loops[0].exit(3)

        self.handler.show_message(message.format(self.device), on_cancel)

    def get_pin(self, code=None):
        if code == 2:
            msg = _("Enter a new PIN for your {}:")
        elif code == 3:
            msg = _(
                "Re-enter the new PIN for your {}.\n\n"
                "NOTE: the positions of the numbers have changed!"
            )
        else:
            msg = _("Enter your current {} PIN:")
        pin = self.handler.get_pin(msg.format(self.device))
        if not pin:
            raise Cancelled
        # check PIN length. Depends on model and firmware version
        # https://github.com/trezor/trezor-firmware/issues/1167
        limit = 9
        if (
            self.features.model == "1"
            and (1, 10, 0) <= self.client.version
            or (2, 4, 0) <= self.client.version
        ):
            limit = 50
        if len(pin) > limit:
            self.handler.show_error(
                _("The PIN cannot be longer than {} characters.").format(limit)
            )
            raise Cancelled
        return pin

    def get_passphrase(self, available_on_device):
        if self.creating_wallet:
            msg = _(
                "Enter a passphrase to generate this wallet.  Each time "
                "you use this wallet your {} will prompt you for the "
                "passphrase.  If you forget the passphrase you cannot "
                "access the eCash in the wallet."
            ).format(self.device)
        else:
            msg = _("Enter the passphrase to unlock this wallet:")

        self.handler.passphrase_on_device = available_on_device
        passphrase = self.handler.get_passphrase(msg, self.creating_wallet)
        if passphrase is PASSPHRASE_ON_DEVICE:
            return passphrase
        if passphrase is None:
            raise Cancelled
        passphrase = bip39_normalize_passphrase(passphrase)
        length = len(passphrase)
        if length > 50:
            self.handler.show_error(
                _("Too long passphrase ({} > 50 chars).").format(length)
            )
            raise Cancelled
        return passphrase

    def _matrix_char(self, matrix_type):
        num = 9 if matrix_type == WordRequestType.Matrix9 else 6
        char = self.handler.get_matrix(num)
        if char == "x":
            raise Cancelled
        return char

    def mnemonic_callback(self, recovery_type):
        if recovery_type is None:
            return None

        if recovery_type == RECOVERY_TYPE_MATRIX:
            return self._matrix_char

        step = 0

        def word_callback(_ignored):
            nonlocal step
            step += 1
            msg = _("Step {}/24.  Enter seed word as explained on your {}:").format(
                step, self.device
            )
            word = self.handler.get_word(msg)
            if not word:
                raise Cancelled
            return word

        return word_callback
