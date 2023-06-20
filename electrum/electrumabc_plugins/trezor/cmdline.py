from electrumabc.i18n import _
from electrumabc.plugins import hook
from electrumabc.printerror import print_stderr

from ..hw_wallet import CmdLineHandler
from .trezor import PASSPHRASE_ON_DEVICE, TrezorPlugin


class TrezorCmdLineHandler(CmdLineHandler):
    def __init__(self):
        self.passphrase_on_device = False
        super().__init__()

    def get_passphrase(self, msg, confirm):
        import getpass

        print_stderr(msg)
        if self.passphrase_on_device and self.yes_no_question(
            _("Enter passphrase on device?")
        ):
            return PASSPHRASE_ON_DEVICE
        else:
            return getpass.getpass("")


class Plugin(TrezorPlugin):
    handler = CmdLineHandler()

    @hook
    def init_keystore(self, keystore):
        if not isinstance(keystore, self.keystore_class):
            return
        keystore.handler = self.handler

    def create_handler(self, window):
        return self.handler
