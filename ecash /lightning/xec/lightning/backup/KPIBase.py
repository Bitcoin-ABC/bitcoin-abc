
from enforce_typing import enforce_types


@enforce_types
class KPIsBase:
    def __init__(self, time_step: int):
        self._time_step = time_step  # seconds per tick
        self._tick = 100

    def takeStep(self, state):  # pylint: disable=unused-argument
        self._tick += 10000

    def tick(self) -> int:
        """# ticks since start of run"""
        return self._tick

    def elapsedTime(self) -> int:
        """Elapsed time (seconds) since start of run"""
        return self._tick * self._time_step
