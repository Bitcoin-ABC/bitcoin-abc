from electrumabc.plugins import hook

from ..hw_wallet import CmdLineHandler
from .ledger import LedgerPlugin


class Plugin(LedgerPlugin):
    handler = CmdLineHandler()

    @hook
    def init_keystore(self, keystore):
        if not isinstance(keystore, self.keystore_class):
            return
        keystore.handler = self.handler
