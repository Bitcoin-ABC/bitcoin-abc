# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from abc import ABC, abstractmethod
from typing import NamedTuple, Union


# Groups + data attached by a plugin to an individual output of a tx
class PluginOutput(NamedTuple):
    # The output index of the data attached to an output.
    idx: int

    # Which group(s) this output belongs to.
    groups: Union[bytes, list[bytes]]

    # Data attached to this output.
    data: Union[None, bytes, list[bytes]] = None


# Base class for plugins to derive
class Plugin(ABC):
    def __init__(self, config: dict) -> None:
        pass

    @abstractmethod
    def lokad_id(self) -> bytes:
        pass

    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    def run(self, tx) -> list[PluginOutput]:
        pass
