import itertools
import threading


class Monotonic:
    """Returns a monotonically increasing int each time an instance is called
    as a function. Optionally thread-safe."""

    def __init__(self, locking: bool = False):
        self._counter = itertools.count()
        self._lock = threading.Lock() if locking else None

    def __call__(self) -> int:
        if self._lock is not None:
            with self._lock:
                return next(self._counter)
        return next(self._counter)
