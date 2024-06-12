import sys
import threading
import time
from collections import defaultdict
from contextlib import suppress
from traceback import format_exception

from .monotonic import Monotonic


class PrintError:
    """A handy base class for printing formatted log messages"""

    def diagnostic_name(self):
        return self.__class__.__name__

    def print_error(self, *msg):
        # only prints with --verbose flag
        print_error(f"[{self.diagnostic_name()}]", *msg)

    def print_stderr(self, *msg):
        print_stderr(f"[{self.diagnostic_name()}]", *msg)

    def print_msg(self, *msg):
        print_msg(f"[{self.diagnostic_name()}]", *msg)

    def print_exception(self, *msg):
        text = " ".join(str(item) for item in msg)
        text += ": "
        text += "".join(format_exception(*sys.exc_info()))
        self.print_error(text)

    SPAM_MSG_RATE_LIMIT = 1.0  # Once every second
    _print_error_last_spam_msg = 0.0

    def _spam_common(self, method, *args):
        """Used internally to control spam messages. *All* messages called with
        spam_* are suppressed to max once every SPAM_MSG_RATE_LIMIT seconds"""
        now = time.time()
        if now - self._print_error_last_spam_msg >= self.SPAM_MSG_RATE_LIMIT:
            method(*args)
            self._print_error_last_spam_msg = now

    def spam_error(self, *args):
        """Like self.print_error except it only prints the supplied args
        once every self.SPAM_MSG_RATE_LIMIT seconds."""
        self._spam_common(self.print_error, *args)

    def spam_msg(self, *args):
        self._spam_common(self.print_msg, *args)

    def spam_stderr(self, *args):
        self._spam_common(self.print_stderr, *args)


is_verbose = False
verbose_timestamps = True
verbose_thread_id = True


def set_verbosity(b, *, timestamps=True, thread_id=True):
    global is_verbose, verbose_timestamps, verbose_thread_id
    is_verbose = b
    verbose_timestamps = timestamps
    verbose_thread_id = thread_id


# locking not needed on Monotonic instance as we lock the dict anyway
_human_readable_thread_ids = defaultdict(Monotonic(locking=False))
_human_readable_thread_ids_lock = threading.Lock()
_t0 = time.time()


def print_error(*args):
    if not is_verbose:
        return
    if verbose_thread_id:
        with _human_readable_thread_ids_lock:
            args = (f"|{_human_readable_thread_ids[threading.get_ident()]:02d}|", *args)
    if verbose_timestamps:
        args = (f"|{(time.time() - _t0):7.3f}|", *args)
    print_stderr(*args)


# use a recursive lock in extremely rare case a signal handler does a print_error while
# lock held by same thread as sighandler invocation's thread
_print_lock = threading.RLock()


def _print_common(file, *args):
    # newline at end *should* implicitly .flush() underlying stream, but not always if
    # redirecting to file
    s_args = " ".join(str(item) for item in args) + "\n"
    # locking is required here as TextIOWrapper subclasses are not thread-safe;
    # see: https://docs.python.org/3.6/library/io.html#multi-threading
    #
    # In very rare cases IO errors can occur here. We tolerate them. See #1595
    with _print_lock, suppress(OSError), suppress(AttributeError):
        file.write(s_args)
        # necessary if redirecting to file
        file.flush()


def print_stderr(*args):
    _print_common(sys.stderr, *args)


def print_msg(*args):
    _print_common(sys.stdout, *args)
