import datetime
import getpass
from decimal import Decimal as PyDecimal

from electrumabc.address import Address
from electrumabc.bitcoin import CASH, TYPE_ADDRESS
from electrumabc.constants import SCRIPT_NAME
from electrumabc.printerror import set_verbosity
from electrumabc.storage import WalletStorage
from electrumabc.transaction import TxOutput
from electrumabc.util import format_satoshis
from electrumabc.wallet import Wallet


def _(x):
    x


# minimal fdisk like gui for console usage
# written by rofl0r, with some bits stolen from the text gui (ncurses)


class ElectrumGui:
    def __init__(self, config, daemon, plugins):
        self.config = config
        self.network = daemon.network
        storage = WalletStorage(config.get_wallet_path())
        if not storage.file_exists:
            print(f"Wallet not found. try '{SCRIPT_NAME} create'")
            exit()
        if storage.is_encrypted():
            password = getpass.getpass("Password:", stream=None)
            storage.decrypt(password)

        self.done = 0
        self.last_balance = ""

        set_verbosity(False)

        self.str_recipient = ""
        self.str_description = ""
        self.str_amount = ""
        self.str_fee = ""

        self.wallet = Wallet(storage)
        self.wallet.start_threads(self.network)
        self.contacts = self.wallet.contacts

        self.network.register_callback(
            self.on_network, ["wallet_updated", "blockchain_updated", "banner"]
        )
        self.commands = [
            _("[h] - displays this help text"),
            _("[i] - display transaction history"),
            _("[o] - enter payment order"),
            _("[p] - print stored payment order"),
            _("[s] - send stored payment order"),
            _("[r] - show own receipt addresses"),
            _("[c] - display contacts"),
            _("[b] - print server banner"),
            _("[q] - quit"),
        ]
        self.num_commands = len(self.commands)

    def on_network(self, event, *args):
        if event.endswith("updated"):  # blockchain_updated & wallet_updated
            self.updated()
        elif event == "banner":
            self.print_banner()

    def main_command(self):
        self.print_balance()
        c = input("enter command: ")
        if c == "h":
            self.print_commands()
        elif c == "i":
            self.print_history()
        elif c == "o":
            self.enter_order()
        elif c == "p":
            self.print_order()
        elif c == "s":
            self.send_order()
        elif c == "r":
            self.print_addresses()
        elif c == "c":
            self.print_contacts()
        elif c == "b":
            self.print_banner()
        elif c == "n":
            self.network_dialog()
        elif c == "e":
            self.settings_dialog()
        elif c == "q":
            self.done = 1
        else:
            self.print_commands()

    def updated(self):
        s = self.get_balance()
        if s != self.last_balance:
            print(s)
        self.last_balance = s
        return True

    def print_commands(self):
        self.print_list(self.commands, "Available commands")

    def print_history(self):
        width = [20, 40, 14, 14]
        delta = (80 - sum(width) - 4) / 3
        format_str = (
            "%"
            + "%d" % width[0]
            + "s"
            + "%"
            + "%d" % (width[1] + delta)
            + "s"
            + "%"
            + "%d" % (width[2] + delta)
            + "s"
            + "%"
            + "%d" % (width[3] + delta)
            + "s"
        )
        messages = []

        for item in self.wallet.get_history():
            tx_hash, height, conf, timestamp, delta, balance = item
            if conf:
                try:
                    time_str = datetime.datetime.fromtimestamp(timestamp).isoformat(
                        " "
                    )[:-3]
                except Exception:
                    time_str = "unknown"
            else:
                time_str = "unconfirmed"

            label = self.wallet.get_label(tx_hash)
            messages.append(
                format_str
                % (
                    time_str,
                    label,
                    format_satoshis(delta, whitespaces=True),
                    format_satoshis(balance, whitespaces=True),
                )
            )

        self.print_list(
            messages[::-1],
            format_str % (_("Date"), _("Description"), _("Amount"), _("Balance")),
        )

    def print_balance(self):
        print(self.get_balance())

    def get_balance(self):
        if self.wallet.network.is_connected():
            if not self.wallet.up_to_date:
                msg = _("Synchronizing...")
            else:
                c, u, x = self.wallet.get_balance()
                msg = _("Balance") + ": %f  " % (PyDecimal(c) / CASH)
                if u:
                    msg += "  [%f unconfirmed]" % (PyDecimal(u) / CASH)
                if x:
                    msg += "  [%f unmatured]" % (PyDecimal(x) / CASH)
        else:
            msg = _("Not connected")

        return msg

    def print_contacts(self):
        def print_contact(contact):
            return "%-20s   %-45s " % (contact.name, contact.address)

        messages = [print_contact(x) for x in self.contacts.get_all()]
        self.print_list(messages, "%-20s   %-45s " % ("Name", "Address"))

    def print_addresses(self):
        messages = map(
            lambda addr: "%30s    %30s       "
            % (addr, self.wallet.labels.get(addr, "")),
            self.wallet.get_addresses(),
        )
        self.print_list(messages, "%19s  %25s " % ("Address", "Label"))

    def print_order(self):
        print(
            "send order to "
            + self.str_recipient
            + ", amount: "
            + self.str_amount
            + "\nfee: "
            + self.str_fee
            + ", desc: "
            + self.str_description
        )

    def enter_order(self):
        self.str_recipient = input("Pay to: ")
        self.str_description = input("Description : ")
        self.str_amount = input("Amount: ")
        self.str_fee = input("Fee: ")

    def send_order(self):
        self.do_send()

    def print_banner(self):
        for i, x in enumerate(self.wallet.network.banner.split("\n")):
            print(x)

    def print_list(self, lst, firstline):
        lst = list(lst)
        self.maxpos = len(lst)
        if not self.maxpos:
            return
        print(firstline)
        for i in range(self.maxpos):
            msg = lst[i] if i < len(lst) else ""
            print(msg)

    def main(self):
        while self.done == 0:
            self.main_command()

    def do_send(self):
        if not Address.is_valid(self.str_recipient):
            print(_("Invalid Bitcoin address"))
            return
        try:
            amount = int(PyDecimal(self.str_amount) * CASH)
        except Exception:
            print(_("Invalid Amount"))
            return
        try:
            fee = int(PyDecimal(self.str_fee) * CASH)
        except Exception:
            print(_("Invalid Fee"))
            return

        if self.wallet.has_password():
            password = self.password_dialog()
            if not password:
                return
        else:
            password = None

        c = ""
        while c != "y":
            c = input("ok to send (y/n)?")
            if c == "n":
                return

        try:
            tx = self.wallet.mktx(
                [
                    TxOutput(
                        TYPE_ADDRESS, Address.from_string(self.str_recipient), amount
                    )
                ],
                password,
                self.config,
                fee,
            )
        except Exception as e:
            print(str(e))
            return

        if self.str_description:
            self.wallet.labels[tx.txid()] = self.str_description

        print(_("Please wait..."))
        status, msg = self.network.broadcast_transaction(tx)

        if status:
            print(_("Payment sent."))
        else:
            print(_("Error"))

    def network_dialog(self):
        print(
            f"use '{SCRIPT_NAME} setconfig server/proxy' to change your network"
            " settings"
        )
        return True

    def settings_dialog(self):
        print(f"use '{SCRIPT_NAME} setconfig' to change your settings")
        return True

    def password_dialog(self):
        return getpass.getpass()

    #   XXX unused

    def run_receive_tab(self, c):
        # if c == 10:
        #    out = self.run_popup('Address', ["Edit label", "Freeze", "Prioritize"])
        return

    def run_contacts_tab(self, c):
        pass
