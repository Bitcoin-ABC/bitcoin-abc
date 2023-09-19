from __future__ import annotations

import sys
import traceback
from binascii import unhexlify
from typing import TYPE_CHECKING

from electrumabc.base_wizard import HWD_SETUP_NEW_WALLET
from electrumabc.bitcoin import (
    TYPE_ADDRESS,
    TYPE_SCRIPT,
    SignatureType,
    deserialize_xpub,
)
from electrumabc.constants import DEFAULT_TXIN_SEQUENCE
from electrumabc.i18n import _
from electrumabc.keystore import HardwareKeyStore, is_xpubkey, parse_xpubkey
from electrumabc.networks import NetworkConstants
from electrumabc.plugins import Device
from electrumabc.transaction import deserialize
from electrumabc.util import UserCancelled, bfh, versiontuple

from ..hw_wallet import HWPluginBase

if TYPE_CHECKING:
    from electrumabc.transaction import Transaction

try:
    import trezorlib
    import trezorlib.transport
    from trezorlib.messages import (
        HDNodePathType,
        HDNodeType,
        InputScriptType,
        MultisigRedeemScriptType,
        OutputScriptType,
        RecoveryDeviceType,
        TransactionType,
        TxInputType,
        TxOutputBinType,
        TxOutputType,
    )

    from .clientbase import TrezorClientBase, parse_path

    RECOVERY_TYPE_SCRAMBLED_WORDS = RecoveryDeviceType.ScrambledWords
    RECOVERY_TYPE_MATRIX = RecoveryDeviceType.Matrix

    from trezorlib.client import PASSPHRASE_ON_DEVICE

    TREZORLIB = True
except Exception:
    traceback.print_exc()
    TREZORLIB = False

    RECOVERY_TYPE_SCRAMBLED_WORDS, RECOVERY_TYPE_MATRIX = range(2)

    PASSPHRASE_ON_DEVICE = object()


# TREZOR initialization methods
TIM_NEW, TIM_RECOVER = range(2)

TREZOR_PRODUCT_KEY = "Trezor"


class TrezorKeyStore(HardwareKeyStore):
    hw_type = "trezor"
    device = TREZOR_PRODUCT_KEY

    def get_derivation(self):
        return self.derivation

    def get_client(self, force_pair=True):
        return self.plugin.get_client(self, force_pair)

    def decrypt_message(self, sequence, message, password):
        raise RuntimeError(
            _("Encryption and decryption are not implemented by {}").format(self.device)
        )

    def sign_message(self, sequence, message, password, sigtype=SignatureType.BITCOIN):
        if sigtype == SignatureType.ECASH:
            raise RuntimeError(
                _("eCash message signing is not available for {}").format(self.device)
            )
        client = self.get_client()
        address_path = self.get_derivation() + "/%d/%d" % sequence
        msg_sig = client.sign_message(address_path, message)
        return msg_sig.signature

    def sign_transaction(self, tx, password, *, use_cache=False):
        if tx.is_complete():
            return
        # previous transactions used as inputs
        prev_tx = {}
        # path of the xpubs that are involved
        xpub_path = {}
        for txin in tx.inputs():
            pubkeys, x_pubkeys = tx.get_sorted_pubkeys(txin)
            x_pubkeys = [bytes.fromhex(xpub) for xpub in x_pubkeys]
            tx_hash = txin["prevout_hash"]
            if txin.get("prev_tx") is None:
                raise RuntimeError(
                    _("Offline signing with {} is not supported.").format(self.device)
                )
            prev_tx[tx_hash] = txin["prev_tx"]
            for x_pubkey in x_pubkeys:
                if not is_xpubkey(x_pubkey):
                    continue
                xpub, s = parse_xpubkey(x_pubkey)
                if xpub == self.get_master_public_key():
                    xpub_path[xpub] = self.get_derivation()

        self.plugin.sign_transaction(self, tx, prev_tx, xpub_path)

    def needs_prevtx(self):
        # Trezor does need previous transactions for Bitcoin Cash
        return True


class LibraryFoundButUnusable(Exception):
    def __init__(self, library_version="unknown"):
        self.library_version = library_version


class TrezorPlugin(HWPluginBase):
    # Derived classes provide:
    #
    #  class-static variables: client_class, firmware_URL, handler_class,
    #     libraries_available, libraries_URL, minimum_firmware,
    #     wallet_class, types

    firmware_URL = "https://wallet.trezor.io"
    libraries_URL = "https://pypi.org/project/trezor/"
    minimum_firmware = (1, 5, 2)
    keystore_class = TrezorKeyStore
    minimum_library = (0, 13, 0)
    maximum_library = (0, 14)

    DEVICE_IDS = (TREZOR_PRODUCT_KEY,)

    MAX_LABEL_LEN = 32

    def __init__(self, parent, config, name):
        super().__init__(parent, config, name)

        self.libraries_available = self.check_libraries_available()
        if not self.libraries_available:
            return
        self.device_manager().register_enumerate_func(self.enumerate)

    def check_libraries_available(self) -> bool:
        def version_str(t):
            return ".".join(str(i) for i in t)

        try:
            # this might raise ImportError or LibraryFoundButUnusable
            library_version = self.get_library_version()
            # if no exception so far, we might still raise LibraryFoundButUnusable
            if (
                library_version == "unknown"
                or versiontuple(library_version) < self.minimum_library
                or hasattr(self, "maximum_library")
                and versiontuple(library_version) >= self.maximum_library
            ):
                raise LibraryFoundButUnusable(library_version=library_version)
        except ImportError:
            return False
        except LibraryFoundButUnusable as e:
            library_version = e.library_version
            max_version_str = (
                version_str(self.maximum_library)
                if hasattr(self, "maximum_library")
                else "inf"
            )
            self.libraries_available_message = _(
                "Library version for '{}' is incompatible."
            ).format(self.name) + "\nInstalled: {}, Needed: {} <= x < {}".format(
                library_version, version_str(self.minimum_library), max_version_str
            )
            self.print_stderr(self.libraries_available_message)
            return False

        return True

    def get_library_version(self):
        import trezorlib

        try:
            version = trezorlib.__version__
        except Exception:
            version = "unknown"
        if TREZORLIB:
            return version
        else:
            raise LibraryFoundButUnusable(library_version=version)

    def enumerate(self):
        devices = trezorlib.transport.enumerate_devices()
        return [
            Device(
                path=d.get_path(),
                interface_number=-1,
                id_=d.get_path(),
                product_key=TREZOR_PRODUCT_KEY,
                usage_page=0,
            )
            for d in devices
        ]

    def create_client(self, device, handler):
        try:
            self.print_error("connecting to device at", device.path)
            transport = trezorlib.transport.get_transport(device.path)
        except Exception as e:
            self.print_error("cannot connect at", device.path, str(e))
            return None

        if not transport:
            self.print_error("cannot connect at", device.path)
            return

        self.print_error("connected to device at", device.path)
        return TrezorClientBase(transport, handler, self)

    def get_client(self, keystore, force_pair=True):
        devmgr = self.device_manager()
        handler = keystore.handler
        client = devmgr.client_for_keystore(self, handler, keystore, force_pair)
        # returns the client for a given keystore. can use xpub
        if client:
            client.used()
        return client

    def get_coin_name(self):
        # Note: testnet supported only by unofficial firmware
        return "Bcash Testnet" if NetworkConstants.TESTNET else "Bcash"

    def _chk_settings_do_popup_maybe(self, handler, method, model, settings):
        recovery_type = settings and settings[-1]
        if (
            method == TIM_RECOVER
            and recovery_type == RECOVERY_TYPE_SCRAMBLED_WORDS
            and model != "T"
        ):  # I'm pretty sure this only applies to the '1' not the 'T'
            handler.show_error(
                _(
                    "You will be asked to enter 24 words regardless of your "
                    "seed's actual length.  If you enter a word incorrectly or "
                    "misspell it, you cannot change it or go back - you will need "
                    "to start again from the beginning.\n\nSo please enter "
                    "the words carefully!"
                )
            )

    def initialize_device(self, device_id, wizard, handler):
        # Initialization method
        msg = _(
            "Choose how you want to initialize your {}.\n\n"
            "Either method is secure since no secret information "
            "will be entered into your computer."
        ).format(self.device)
        choices = [
            # Must be short as Qt doesn't word-wrap radio button text
            (TIM_NEW, _("Let the device generate a completely new seed randomly")),
            (TIM_RECOVER, _("Recover from a seed you have previously written down")),
        ]
        devmgr = self.device_manager()
        client = devmgr.client_by_id(device_id)
        model = client.get_trezor_model()

        def f(method):
            loops = [
                wizard.loop
            ]  # We do it this way so as to pop the loop when it's done. This avoids possible multiple calls to loop.exit from different code paths.
            handler._loops = loops  # hack to prevent trezor transport errors from stalling the UI here. see clientbase.py button_request which aborts the wizard event loop on transport error
            try:
                import threading

                settings = self.request_trezor_init_settings(wizard, method, model)
                # We do this popup business here because doing it in the
                # thread interferes with whatever other popups may happen
                # from trezorlib.  So we do this all-stop popup first if needed.
                self._chk_settings_do_popup_maybe(handler, method, model, settings)

                errors = []
                t = threading.Thread(
                    target=self._initialize_device_safe,
                    args=(settings, method, device_id, loops, errors),
                )
                t.setDaemon(True)
                t.start()
                exit_code = wizard.loop.exec_()
                loops.pop()
                if exit_code != 0:
                    if errors and isinstance(errors[0], Exception):
                        msg = str(errors[0]).strip()
                        if msg:
                            # we do this here in the main thread so as to give
                            # the user the opportunity to actually *see* the error
                            # window before the wizard "goes back"
                            handler.show_error(msg)
                    # this method (initialize_device) was called with the expectation
                    # of leaving the device in an initialized state when finishing.
                    # signal that this is not the case:
                    raise UserCancelled()
            finally:
                delattr(handler, "_loops")  # /clean up hack

        wizard.choice_dialog(
            title=_("Initialize Device"), message=msg, choices=choices, run_next=f
        )

    def _initialize_device_safe(self, settings, method, device_id, loops, errors):
        exit_code = 0
        try:
            self._initialize_device(settings, method, device_id)
        except UserCancelled:
            exit_code = 2
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            errors.append(e)
            exit_code = 1
        finally:
            # leverage the GIL here for thread safety.
            lc = loops.copy()
            if lc:
                lc[0].exit(exit_code)

    def _initialize_device(self, settings, method, device_id):
        item, label, pin_protection, passphrase_protection, recovery_type = settings

        devmgr = self.device_manager()
        client = devmgr.client_by_id(device_id)

        if method == TIM_NEW:
            client.reset_device(
                strength=64 * (item + 2),  # 128, 192 or 256
                passphrase_protection=passphrase_protection,
                pin_protection=pin_protection,
                label=label,
            )
        elif method == TIM_RECOVER:
            client.recover_device(
                recovery_type=recovery_type,
                word_count=6 * (item + 2),  # 12, 18 or 24
                passphrase_protection=passphrase_protection,
                pin_protection=pin_protection,
                label=label,
            )
        else:
            raise RuntimeError("Unsupported recovery method")

    def _make_node_path(self, xpub, address_n):
        _, depth, fingerprint, child_num, chain_code, key = deserialize_xpub(xpub)
        node = HDNodeType(
            depth=depth,
            fingerprint=int.from_bytes(fingerprint, "big"),
            child_num=int.from_bytes(child_num, "big"),
            chain_code=chain_code,
            public_key=key,
        )
        return HDNodePathType(node=node, address_n=address_n)

    def setup_device(self, device_info, wizard, purpose):
        """Called when creating a new wallet.  Select the device to use.  If
        the device is uninitialized, go through the initialization
        process."""
        device_id = device_info.device.id_
        client = self.scan_and_create_client_for_device(
            device_id=device_id, wizard=wizard
        )
        if not client.is_uptodate():
            raise Exception(
                _(
                    "Outdated {} firmware for device labelled {}. Please "
                    "download the updated firmware from {}"
                ).format(self.device, client.label(), self.firmware_URL)
            )
        if not device_info.initialized:
            self.initialize_device(device_id, wizard, client.handler)
        is_creating_wallet = purpose == HWD_SETUP_NEW_WALLET
        wizard.run_task_without_blocking_gui(
            task=lambda: client.get_xpub("m", "standard", creating=is_creating_wallet)
        )
        client.used()
        return client

    def get_xpub(self, device_id, derivation, xtype, wizard):
        client = self.scan_and_create_client_for_device(
            device_id=device_id, wizard=wizard
        )
        xpub = client.get_xpub(derivation, xtype)
        client.used()
        return xpub

    def get_trezor_input_script_type(self, is_multisig):
        if is_multisig:
            return InputScriptType.SPENDMULTISIG
        else:
            return InputScriptType.SPENDADDRESS

    def sign_transaction(self, keystore, tx, prev_tx, xpub_path):
        prev_tx = {
            bfh(txhash): self.electrum_tx_to_txtype(tx, xpub_path)
            for txhash, tx in prev_tx.items()
        }
        client = self.get_client(keystore)
        inputs = self.tx_inputs(tx, xpub_path, True)
        outputs = self.tx_outputs(keystore.get_derivation(), tx, client)
        signatures, _ = client.sign_tx(
            self.get_coin_name(),
            inputs,
            outputs,
            lock_time=tx.locktime,
            prev_txes=prev_tx,
            version=tx.version,
        )
        tx.update_signatures(signatures)

    def show_address(self, wallet, address, keystore=None):
        if keystore is None:
            keystore = wallet.get_keystore()
        deriv_suffix = wallet.get_address_index(address)
        derivation = keystore.derivation
        address_path = "%s/%d/%d" % (derivation, *deriv_suffix)

        # prepare multisig, if available
        xpubs = wallet.get_master_public_keys()
        if len(xpubs) > 1:
            pubkeys = wallet.get_public_keys(address)
            # sort xpubs using the order of pubkeys
            sorted_pairs = sorted(zip(pubkeys, xpubs))
            multisig = self._make_multisig(
                wallet.m, [(xpub, deriv_suffix) for _, xpub in sorted_pairs]
            )
        else:
            multisig = None
        script_type = self.get_trezor_input_script_type(multisig is not None)
        client = self.get_client(keystore)
        client.show_address(address_path, script_type, multisig)

    def tx_inputs(self, tx, xpub_path, for_sig=False):
        inputs = []
        for txin in tx.inputs():
            if txin["type"] == "coinbase":
                txinputtype = TxInputType(
                    prev_hash=b"\x00" * 32,
                    prev_index=0xFFFFFFFF,  # signed int -1
                )
            else:
                txinputtype = TxInputType(
                    prev_hash=unhexlify(txin["prevout_hash"]),
                    prev_index=txin["prevout_n"],
                )
                if for_sig:
                    x_pubkeys = txin["x_pubkeys"]
                    xpubs = [parse_xpubkey(bytes.fromhex(x)) for x in x_pubkeys]
                    txinputtype.multisig = self._make_multisig(
                        txin.get("num_sig"), xpubs, txin.get("signatures")
                    )
                    txinputtype.script_type = self.get_trezor_input_script_type(
                        txinputtype.multisig is not None
                    )

                    # find which key is mine
                    for xpub, deriv in xpubs:
                        if xpub in xpub_path:
                            xpub_n = parse_path(xpub_path[xpub])
                            txinputtype.address_n = xpub_n + deriv
                            break

            if "value" in txin:
                txinputtype.amount = txin["value"]

            if "scriptSig" in txin:
                script_sig = bytes.fromhex(txin["scriptSig"])
                txinputtype.script_sig = script_sig

            txinputtype.sequence = txin.get("sequence", DEFAULT_TXIN_SEQUENCE)

            inputs.append(txinputtype)

        return inputs

    def _make_multisig(self, m, xpubs, signatures=None):
        if len(xpubs) == 1:
            return None

        pubkeys = [self._make_node_path(xpub, deriv) for xpub, deriv in xpubs]
        if signatures is None:
            signatures = [b""] * len(pubkeys)
        elif len(signatures) != len(pubkeys):
            raise RuntimeError("Mismatched number of signatures")
        else:
            signatures = [bfh(x)[:-1] if x else b"" for x in signatures]

        return MultisigRedeemScriptType(pubkeys=pubkeys, signatures=signatures, m=m)

    def tx_outputs(self, derivation, tx: Transaction, client):
        def create_output_by_derivation():
            deriv = parse_path("/%d/%d" % index)
            multisig = self._make_multisig(m, [(xpub, deriv) for xpub in xpubs])
            script_type = (
                OutputScriptType.PAYTOADDRESS
                if multisig is None
                else OutputScriptType.PAYTOMULTISIG
            )

            txoutputtype = TxOutputType(
                multisig=multisig,
                amount=amount,
                address_n=parse_path(derivation + "/%d/%d" % index),
                script_type=script_type,
            )
            return txoutputtype

        def create_output_by_address():
            if _type == TYPE_SCRIPT:
                script = address.to_script()
                # We only support OP_RETURN with one constant push
                if (
                    script[0] == 0x6A
                    and amount == 0
                    and script[1] == len(script) - 2
                    and script[1] <= 75
                ):
                    return TxOutputType(
                        amount=amount,
                        script_type=OutputScriptType.PAYTOOPRETURN,
                        op_return_data=script[2:],
                    )
                else:
                    raise Exception(_("Unsupported output script."))
            elif _type == TYPE_ADDRESS:
                # ecash: addresses are not supported yet by trezor
                ui_addr_fmt = address.FMT_UI
                if ui_addr_fmt == address.FMT_CASHADDR:
                    ui_addr_fmt = address.FMT_CASHADDR_BCH

                addr_format = address.FMT_LEGACY
                if client.get_trezor_model() == "T":
                    if client.atleast_version(2, 0, 8):
                        addr_format = ui_addr_fmt
                    elif client.atleast_version(2, 0, 7):
                        addr_format = address.FMT_CASHADDR_BCH
                else:
                    if client.atleast_version(1, 6, 2):
                        addr_format = ui_addr_fmt
                return TxOutputType(
                    amount=amount,
                    script_type=OutputScriptType.PAYTOADDRESS,
                    address=address.to_full_string(addr_format),
                )

        outputs = []
        has_change = False
        any_output_on_change_branch = self.is_any_tx_output_on_change_branch(tx)

        for o in tx.outputs():
            _type, address, amount = o.type, o.destination, o.value
            use_create_by_derivation = False
            info = tx.output_info.get(address)
            if info is not None and not has_change:
                index, xpubs, m, script_type = info
                on_change_branch = index[0] == 1
                # prioritise hiding outputs on the 'change' branch from user
                # because no more than one change address allowed
                # note: ^ restriction can be removed once we require fw
                # that has https://github.com/trezor/trezor-mcu/pull/306
                if on_change_branch == any_output_on_change_branch:
                    use_create_by_derivation = True
                    has_change = True

            if use_create_by_derivation:
                txoutputtype = create_output_by_derivation()
            else:
                txoutputtype = create_output_by_address()
            outputs.append(txoutputtype)

        return outputs

    def is_any_tx_output_on_change_branch(self, tx):
        if not tx.output_info:
            return False
        for _type, address, _amount in tx.outputs():
            info = tx.output_info.get(address)
            if info is not None and info[0][0] == 1:
                return True
        return False

    # This function is called from the TREZOR libraries (via tx_api)
    def get_tx(self, tx_hash):
        # for electrum-abc previous tx is never needed, since it uses
        # bip-143 signatures.
        return None

    def electrum_tx_to_txtype(self, tx, xpub_path):
        t = TransactionType()
        version, _, outputs, locktime = deserialize(tx.raw)
        t.version = version
        t.lock_time = locktime
        t.inputs = self.tx_inputs(tx, xpub_path)
        t.bin_outputs = [
            TxOutputBinType(
                amount=vout.value, script_pubkey=vout.destination.to_script()
            )
            for vout in outputs
        ]
        return t
