from functools import partial
from os import urandom

from PyQt5 import QtWidgets
from PyQt5.QtCore import Qt

# pysatochip
from pysatochip.CardConnector import CardError, CardNotPresentError, UnexpectedSW12Error
from pysatochip.Satochip2FA import Satochip2FA
from pysatochip.version import (
    SATOCHIP_PROTOCOL_MAJOR_VERSION,
    SATOCHIP_PROTOCOL_MINOR_VERSION,
)

from electrumabc.i18n import _
from electrumabc.printerror import print_error
from electrumabc_gui.qt.qrcodewidget import QRDialog
from electrumabc_gui.qt.util import (
    Buttons,
    CancelButton,
    CloseButton,
    EnterButton,
    OkButton,
    PasswordLineEdit,
    WindowModalDialog,
    WWLabel,
)

from ..hw_wallet.qt import QtHandlerBase, QtPluginBase

# satochip
from .satochip import SatochipPlugin

MSG_USE_2FA = _(
    "Do you want to use 2-Factor-Authentication (2FA)?\n\nWith 2FA, any "
    "transaction must be confirmed on a second device such as your "
    "smartphone. First you have to install the Satochip-2FA android app on "
    "google play. Then you have to pair your 2FA device with your Satochip "
    "by scanning the qr-code on the next screen. \n\nWARNING: be sure to "
    "backup a copy of the qr-code in a safe place, in case you have to "
    "reinstall the app!"
)


class Plugin(SatochipPlugin, QtPluginBase):
    # icon_unpaired = "satochip_unpaired.png"
    # icon_paired = "satochip.png"
    icon_unpaired = ":icons/satochip_unpaired.png"
    icon_paired = ":icons/satochip.png"

    # def __init__(self, parent, config, name):
    #    BasePlugin.__init__(self, parent, config, name)

    def create_handler(self, window):
        return SatochipHandler(window)

    def requires_settings(self):
        # Return True to add a Settings button.
        return True

    def settings_widget(self, window):
        # Return a button that when pressed presents a settings dialog.
        return EnterButton(_("Settings"), partial(self.settings_dialog, window))

    def settings_dialog(self, window):
        # Return a settings dialog.
        d = WindowModalDialog(window, _("Email settings"))
        vbox = QtWidgets.QVBoxLayout(d)

        d.setMinimumSize(500, 200)
        vbox.addStretch()
        vbox.addLayout(Buttons(CloseButton(d), OkButton(d)))
        d.show()

    def show_settings_dialog(self, window, keystore):
        # When they click on the icon for Satochip we come here.
        device_id = self.choose_device(window, keystore)
        if device_id:
            SatochipSettingsDialog(window, self, keystore, device_id).exec_()


class SatochipHandler(QtHandlerBase):
    def __init__(self, win):
        super(SatochipHandler, self).__init__(win, "Satochip")

    # TODO: something?


class SatochipSettingsDialog(WindowModalDialog):
    """This dialog doesn't require a device be paired with a wallet.

    We want users to be able to wipe a device even if they've forgotten
    their PIN."""

    def __init__(self, window, plugin, keystore, device_id):
        title = _("{} Settings").format(plugin.device)
        super(SatochipSettingsDialog, self).__init__(window, title)
        self.setMaximumWidth(540)

        devmgr = plugin.device_manager()
        self.thread = thread = keystore.thread

        def connect_and_doit():
            client = devmgr.client_by_id(device_id)
            if not client:
                raise RuntimeError("Device not connected")
            return client

        body = QtWidgets.QWidget()
        body_layout = QtWidgets.QVBoxLayout(body)
        grid = QtWidgets.QGridLayout()
        grid.setColumnStretch(3, 1)

        # see <http://doc.qt.io/archives/qt-4.8/richtext-html-subset.html>
        title = QtWidgets.QLabel(
            """<center>
<span style="font-size: x-large">Satochip Wallet</span>
<br><a href="https://satochip.io">satochip.io</a>"""
        )
        title.setTextInteractionFlags(Qt.LinksAccessibleByMouse)

        grid.addWidget(title, 0, 0, 1, 2, Qt.AlignHCenter)
        y = 3

        rows = [
            ("fw_version", _("Firmware Version")),
            ("sw_version", _("Electrum Support")),
            ("is_seeded", _("Wallet seeded")),
            ("needs_2FA", _("Requires 2FA ")),
            ("needs_SC", _("Secure Channel")),
            ("card_label", _("Card label")),
        ]
        for row_num, (member_name, label) in enumerate(rows):
            widget = QtWidgets.QLabel("<tt>")
            widget.setTextInteractionFlags(
                Qt.TextSelectableByMouse | Qt.TextSelectableByKeyboard
            )

            grid.addWidget(QtWidgets.QLabel(label), y, 0, 1, 1, Qt.AlignRight)
            grid.addWidget(widget, y, 1, 1, 1, Qt.AlignLeft)
            setattr(self, member_name, widget)
            y += 1

        body_layout.addLayout(grid)

        pin_btn = QtWidgets.QPushButton("Change PIN")

        def _change_pin():
            thread.add(connect_and_doit, on_success=self.change_pin)

        pin_btn.clicked.connect(_change_pin)

        seed_btn = QtWidgets.QPushButton("Reset seed")

        def _reset_seed():
            thread.add(connect_and_doit, on_success=self.reset_seed)
            thread.add(connect_and_doit, on_success=self.show_values)

        seed_btn.clicked.connect(_reset_seed)

        set_2FA_btn = QtWidgets.QPushButton("Enable 2FA")

        def _set_2FA():
            thread.add(connect_and_doit, on_success=self.set_2FA)
            thread.add(connect_and_doit, on_success=self.show_values)

        set_2FA_btn.clicked.connect(_set_2FA)

        reset_2FA_btn = QtWidgets.QPushButton("Disable 2FA")

        def _reset_2FA():
            thread.add(connect_and_doit, on_success=self.reset_2FA)
            thread.add(connect_and_doit, on_success=self.show_values)

        reset_2FA_btn.clicked.connect(_reset_2FA)

        verify_card_btn = QtWidgets.QPushButton("Verify card")

        def _verify_card():
            thread.add(connect_and_doit, on_success=self.verify_card)

        verify_card_btn.clicked.connect(_verify_card)

        change_card_label_btn = QtWidgets.QPushButton("Change label")

        def _change_card_label():
            thread.add(connect_and_doit, on_success=self.change_card_label)

        change_card_label_btn.clicked.connect(_change_card_label)

        y += 3
        grid.addWidget(pin_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(seed_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(set_2FA_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(reset_2FA_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(verify_card_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(change_card_label_btn, y, 0, 1, 2, Qt.AlignHCenter)
        y += 2
        grid.addWidget(CloseButton(self), y, 0, 1, 2, Qt.AlignHCenter)

        dialog_vbox = QtWidgets.QVBoxLayout(self)
        dialog_vbox.addWidget(body)

        # Fetch values and show them
        thread.add(connect_and_doit, on_success=self.show_values)

    def show_values(self, client):
        print_error("Show value!")
        sw_rel = (
            "v"
            + str(SATOCHIP_PROTOCOL_MAJOR_VERSION)
            + "."
            + str(SATOCHIP_PROTOCOL_MINOR_VERSION)
        )
        self.sw_version.setText("<tt>%s" % sw_rel)

        (response, sw1, sw2, d) = client.cc.card_get_status()
        if sw1 == 0x90 and sw2 == 0x00:
            fw_rel = (
                "v"
                + str(d["protocol_major_version"])
                + "."
                + str(d["protocol_minor_version"])
                + "-"
                + str(d["applet_major_version"])
                + "."
                + str(d["applet_minor_version"])
            )
            self.fw_version.setText("<tt>%s" % fw_rel)

            # is_seeded?
            if len(response) >= 10:
                (
                    self.is_seeded.setText("<tt>%s" % "yes")
                    if d["is_seeded"]
                    else self.is_seeded.setText("<tt>%s" % "no")
                )
            else:  # for earlier versions
                try:
                    client.cc.card_bip32_get_authentikey()
                    self.is_seeded.setText("<tt>%s" % "yes")
                except Exception:
                    self.is_seeded.setText("<tt>%s" % "no")

            # needs2FA?
            if d["needs2FA"]:
                self.needs_2FA.setText("<tt>%s" % "yes")
            else:
                self.needs_2FA.setText("<tt>%s" % "no")

            # needs secure channel
            if d["needs_secure_channel"]:
                self.needs_SC.setText("<tt>%s" % "yes")
            else:
                self.needs_SC.setText("<tt>%s" % "no")

            # card label
            (response, sw1, sw2, label) = client.cc.card_get_label()
            if label == "":
                label = "(none)"
            self.card_label.setText("<tt>%s" % label)

        else:
            fw_rel = "(unitialized)"
            self.fw_version.setText("<tt>%s" % fw_rel)
            self.needs_2FA.setText("<tt>%s" % "(unitialized)")
            self.is_seeded.setText("<tt>%s" % "no")
            self.needs_SC.setText("<tt>%s" % "(unknown)")
            self.card_label.setText("<tt>%s" % "(none)")

    def change_pin(self, client):
        print_error("In change_pin")
        msg_oldpin = _("Enter the current PIN for your Satochip:")
        msg_newpin = _("Enter a new PIN for your Satochip:")
        msg_confirm = _("Please confirm the new PIN for your Satochip:")
        msg_error = _("The PIN values do not match! Please type PIN again!")
        msg_cancel = _("PIN Change cancelled!")
        (is_pin, oldpin, newpin) = client.PIN_change_dialog(
            msg_oldpin, msg_newpin, msg_confirm, msg_error, msg_cancel
        )
        if not is_pin:
            return

        oldpin = list(oldpin)
        newpin = list(newpin)
        (response, sw1, sw2) = client.cc.card_change_PIN(0, oldpin, newpin)
        if sw1 == 0x90 and sw2 == 0x00:
            msg = _("PIN changed successfully!")
            client.handler.show_message(msg)
        else:
            msg = _("Failed to change PIN!")
            client.handler.show_error(msg)

    def reset_seed(self, client):
        print_error("In reset_seed")
        # pin
        msg = "".join(
            [
                _("WARNING!\n"),
                _(
                    "You are about to reset the seed of your Satochip. This process is"
                    " irreversible!\n"
                ),
                _(
                    "Please be sure that your wallet is empty and that you have a"
                    " backup of the seed as a precaution.\n\n"
                ),
                _("To proceed, enter the PIN for your Satochip:"),
            ]
        )
        password = self.reset_seed_dialog(msg)
        if password is None:
            return
        pin = password.encode("utf8")
        pin = list(pin)

        # if 2FA is enabled, get challenge-response
        hmac = []
        if client.cc.needs_2FA is None:
            (response, sw1, sw2, d) = client.cc.card_get_status()
        if client.cc.needs_2FA:
            # challenge based on authentikey
            authentikeyx = bytearray(client.cc.parser.authentikey_coordx).hex()

            # format & encrypt msg
            import json

            msg = {"action": "reset_seed", "authentikeyx": authentikeyx}
            msg = json.dumps(msg)
            (id_2FA, msg_out) = client.cc.card_crypt_transaction_2FA(msg, True)
            d = {}
            d["msg_encrypt"] = msg_out
            d["id_2FA"] = id_2FA
            # print_error("encrypted message: "+msg_out)
            # print_error("id_2FA: "+id_2FA)

            # do challenge-response with 2FA device...
            client.handler.show_message(
                "2FA request sent! Approve or reject request on your second device."
            )
            Satochip2FA.do_challenge_response(d)
            # decrypt and parse reply to extract challenge response
            try:
                reply_encrypt = d["reply_encrypt"]
            except Exception:
                self.give_error(
                    "No response received from 2FA.\nPlease ensure that the"
                    " Satochip-2FA plugin is enabled in Tools>Optional Features",
                    True,
                )
            reply_decrypt = client.cc.card_crypt_transaction_2FA(reply_encrypt, False)
            print_error("challenge:response= " + reply_decrypt)
            reply_decrypt = reply_decrypt.split(":")
            chalresponse = reply_decrypt[1]
            hmac = list(bytes.fromhex(chalresponse))

        # send request
        (response, sw1, sw2) = client.cc.card_reset_seed(pin, hmac)
        if sw1 == 0x90 and sw2 == 0x00:
            msg = _(
                "Seed reset successfully!\nYou should close this wallet and launch the"
                " wizard to generate a new wallet."
            )
            client.handler.show_message(msg)
            # to do: close client?
        elif sw1 == 0x9C and sw2 == 0x0B:
            msg = _(
                "Failed to reset seed: request rejected by 2FA device (error code:"
                f" {hex(256*sw1+sw2)})"
            )
            client.handler.show_message(msg)
            # to do: close client?
        else:
            msg = _(f"Failed to reset seed with error code: {hex(256*sw1+sw2)}")
            client.handler.show_error(msg)

    def reset_seed_dialog(self, msg):
        print_error("In reset_seed_dialog")
        parent = self.top_level_window()
        d = WindowModalDialog(parent, _("Enter PIN"))
        pw = PasswordLineEdit()
        pw.setMinimumWidth(200)

        vbox = QtWidgets.QVBoxLayout()
        vbox.addWidget(WWLabel(msg))
        vbox.addWidget(pw)
        vbox.addLayout(Buttons(CancelButton(d), OkButton(d)))
        d.setLayout(vbox)

        passphrase = pw.text() if d.exec_() else None
        return passphrase

    def set_2FA(self, client):
        if not client.cc.needs_2FA:
            use_2FA = client.handler.yes_no_question(MSG_USE_2FA)
            if use_2FA:
                secret_2FA = urandom(20)
                secret_2FA_hex = secret_2FA.hex()
                # the secret must be shared with the second factor app (eg on a smartphone)
                try:
                    help_txt = (
                        "Scan the QR-code with your Satochip-2FA app and make a backup"
                        " of the following secret: " + secret_2FA_hex
                    )
                    d = QRDialog(
                        data=secret_2FA_hex,
                        parent=None,
                        title="Secret_2FA",
                        show_text=False,
                        help_text=help_txt,
                    )
                    d.exec_()
                except Exception as e:
                    print_error("SatochipPlugin: setup 2FA error: " + str(e))
                    return
                # further communications will require an id and an encryption key (for privacy).
                # Both are derived from the secret_2FA using a one-way function inside the Satochip
                amount_limit = 0  # i.e. always use
                (response, sw1, sw2) = client.cc.card_set_2FA_key(
                    secret_2FA, amount_limit
                )
                if sw1 != 0x90 or sw2 != 0x00:
                    print_error(
                        f"Unable to set 2FA with error code:= {hex(256*sw1+sw2)}"
                    )  # debugSatochip
                    raise RuntimeError(
                        f"Unable to setup 2FA with error code: {hex(256*sw1+sw2)}"
                    )
                else:
                    client.handler.show_message("2FA enabled successfully!")

    def reset_2FA(self, client):
        if client.cc.needs_2FA:
            # challenge based on ID_2FA
            # format & encrypt msg
            import json

            msg = {"action": "reset_2FA"}
            msg = json.dumps(msg)
            (id_2FA, msg_out) = client.cc.card_crypt_transaction_2FA(msg, True)
            d = {}
            d["msg_encrypt"] = msg_out
            d["id_2FA"] = id_2FA
            # print_error("encrypted message: "+msg_out)
            print_error("id_2FA: " + id_2FA)

            # do challenge-response with 2FA device...
            client.handler.show_message(
                "2FA request sent! Approve or reject request on your second device."
            )
            Satochip2FA.do_challenge_response(d)
            # decrypt and parse reply to extract challenge response
            try:
                reply_encrypt = d["reply_encrypt"]
            except Exception:
                self.give_error("No response received from 2FA!", True)
            reply_decrypt = client.cc.card_crypt_transaction_2FA(reply_encrypt, False)
            print_error("challenge:response= " + reply_decrypt)
            reply_decrypt = reply_decrypt.split(":")
            chalresponse = reply_decrypt[1]
            hmac = list(bytes.fromhex(chalresponse))

            # send request
            (response, sw1, sw2) = client.cc.card_reset_2FA_key(hmac)
            if sw1 == 0x90 and sw2 == 0x00:
                msg = _("2FA reset successfully!")
                client.cc.needs_2FA = False
                client.handler.show_message(msg)
            elif sw1 == 0x9C and sw2 == 0x17:
                msg = _(
                    "Failed to reset 2FA: \nyou must reset the seed first (error code"
                    f" {hex(256*sw1+sw2)})"
                )
                client.handler.show_error(msg)
            else:
                msg = _(f"Failed to reset 2FA with error code: {hex(256*sw1+sw2)}")
                client.handler.show_error(msg)
        else:
            msg = _("2FA is already disabled!")
            client.handler.show_error(msg)

    def verify_card(self, client):
        (
            is_authentic,
            txt_ca,
            txt_subca,
            txt_device,
            txt_error,
        ) = self.card_verify_authenticity(client)

        text_cert_chain = 4 * "=" + " Root CA certificate: " + 4 * "=" + "\n"
        text_cert_chain += txt_ca
        text_cert_chain += "\n" + 4 * "=" + " Sub CA certificate: " + 4 * "=" + "\n"
        text_cert_chain += txt_subca
        text_cert_chain += "\n" + 4 * "=" + " Device certificate: " + 4 * "=" + "\n"
        text_cert_chain += txt_device

        if is_authentic:
            txt_result = "Device authenticated successfully!"
            txt_result += "\n\n" + text_cert_chain
            client.handler.show_message(txt_result)
        else:
            txt_result = "".join(
                [
                    "Error: could not authenticate the issuer of this card! \n",
                    "Reason: ",
                    txt_error,
                    "\n\n",
                    "If you did not load the card yourself, be extremely careful! \n",
                    "Contact support(at)satochip.io to report a suspicious device.",
                ]
            )
            txt_result += "\n\n" + text_cert_chain
            client.handler.show_error(txt_result)

    def card_verify_authenticity(self, client):  # todo: add this function in pysatochip
        cert_pem = txt_error = ""
        try:
            cert_pem = client.cc.card_export_perso_certificate()
            print_error("Cert PEM: " + str(cert_pem))
        except CardError:
            txt_error = "".join(
                [
                    "Unable to get device certificate: feature unsupported! \n",
                    (
                        "Authenticity validation is only available starting with"
                        " Satochip v0.12 and higher"
                    ),
                ]
            )
        except CardNotPresentError:
            txt_error = "No card found! Please insert card."
        except UnexpectedSW12Error as ex:
            txt_error = "Exception during device certificate export: " + str(ex)

        if cert_pem == "(empty)":
            txt_error = (
                "Device certificate is empty: the card has not been personalized!"
            )

        if txt_error != "":
            return False, "(empty)", "(empty)", "(empty)", txt_error

        # check the certificate chain from root CA to device
        from pysatochip.certificate_validator import CertificateValidator

        validator = CertificateValidator()
        (
            is_valid_chain,
            device_pubkey,
            txt_ca,
            txt_subca,
            txt_device,
            txt_error,
        ) = validator.validate_certificate_chain(cert_pem, client.cc.card_type)
        if not is_valid_chain:
            return False, txt_ca, txt_subca, txt_device, txt_error

        # perform challenge-response with the card to ensure that the key is correctly loaded in the device
        is_valid_chalresp, txt_error = self.cc.card_challenge_response_pki(
            device_pubkey
        )

        return is_valid_chalresp, txt_ca, txt_subca, txt_device, txt_error

    def change_card_label(self, client):
        msg = "".join(
            [
                _("You can optionnaly add a label to your Satochip.\n"),
                _("This label must be less than 64 chars long."),
            ]
        )
        label = self.change_card_label_dialog(client, msg)
        if label is None:
            client.handler.show_message(_("Operation aborted by user!"))
            return
        (response, sw1, sw2) = client.cc.card_set_label(label)
        if sw1 == 0x90 and sw2 == 0x00:
            client.handler.show_message(_("Card label changed successfully!"))
        elif sw1 == 0x6D and sw2 == 0x00:
            client.handler.show_error(
                _("Error: card does not support label!")
            )  # starts with satochip v0.12
        else:
            client.handler.show_error(
                f"Error while changing label: sw12={hex(sw1)} {hex(sw2)}"
            )

    def change_card_label_dialog(self, client, msg):
        print_error("In change_card_label_dialog")
        while True:
            parent = self.top_level_window()
            d = WindowModalDialog(parent, _("Enter Label"))
            pw = QtWidgets.QLineEdit()
            pw.setEchoMode(0)
            pw.setMinimumWidth(200)

            vbox = QtWidgets.QVBoxLayout()
            vbox.addWidget(WWLabel(msg))
            vbox.addWidget(pw)
            vbox.addLayout(Buttons(CancelButton(d), OkButton(d)))
            d.setLayout(vbox)

            label = pw.text() if d.exec_() else None
            if label is None or len(label.encode("utf-8")) <= 64:
                return label
            else:
                client.handler.show_error(
                    _("Card label should not be longer than 64 chars!")
                )
