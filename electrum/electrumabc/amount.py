# Electrum ABC - lightweight eCash client
# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
from __future__ import annotations

import locale
from decimal import Decimal
from typing import TYPE_CHECKING

from .caches import ExpiringCache
from .constants import BASE_UNITS_BY_DECIMALS
from .i18n import _

if TYPE_CHECKING:
    from .exchange_rate import FxThread
    from .simple_config import SimpleConfig


def format_satoshis_plain(x, decimal_point=8):
    """Display a satoshi amount scaled.  Always uses a '.' as a decimal
    point and has no thousands separator"""
    if x is None:
        return _("Unknown")
    scale_factor = pow(10, decimal_point)
    return "{:.8f}".format(Decimal(x) / scale_factor).rstrip("0").rstrip(".")


_cached_dp = None
LOCALE_HAS_THOUSANDS_SEPARATOR = None


def clear_cached_dp():
    """This function allows to reset the cached locale decimal point.
    This is used for testing amount formatting with various locales."""
    global _cached_dp
    _cached_dp = None


def set_locale_has_thousands_separator(flag: bool):
    global LOCALE_HAS_THOUSANDS_SEPARATOR
    LOCALE_HAS_THOUSANDS_SEPARATOR = flag


# This cache will eat about ~6MB of memory per 20,000 items, but it does make
# format_satoshis() run over 3x faster.
_fmt_sats_cache = ExpiringCache(maxlen=20000, name="format_satoshis cache")


def format_satoshis(
    x, num_zeros=0, decimal_point=2, precision=None, is_diff=False, whitespaces=False
) -> str:
    global _cached_dp
    # We lazy init this here rather than at module level in case the
    # locale is not set at program startup when the module is first
    # imported.
    if LOCALE_HAS_THOUSANDS_SEPARATOR is None:
        try:
            # setting the local to the system's default work for Windows,
            # Linux. On Mac OS, it sometimes works, but sometimes fails.
            locale.setlocale(locale.LC_NUMERIC, "")
        except locale.Error:
            set_locale_has_thousands_separator(False)
        else:
            set_locale_has_thousands_separator(len(f"{1000:n}") > 4)
    if _cached_dp is None:
        if not LOCALE_HAS_THOUSANDS_SEPARATOR:
            # We will use python's locale-unaware way of formatting numbers
            # with thousands separators, using a "." for decimal point.
            _cached_dp = "."
        else:
            _cached_dp = locale.localeconv().get("decimal_point") or "."

    if x is None:
        return _("Unknown")
    if precision is None:
        precision = decimal_point
    cache_key = (x, num_zeros, decimal_point, precision, is_diff, whitespaces)
    result = _fmt_sats_cache.get(cache_key)
    if result is not None:
        return result

    try:
        value = x / pow(10, decimal_point)
    except ArithmeticError:
        # Normally doesn't happen but if x is a huge int, we may get
        # OverflowError or other ArithmeticError subclass exception.
        # See Electron-Cash#1024.
        # TODO: this happens only on user input, so just add a range
        #       validator on the wiget
        return "unknown"
    if LOCALE_HAS_THOUSANDS_SEPARATOR:
        decimal_format = ".0" + str(precision) if precision > 0 else ""
        if is_diff:
            decimal_format = "+" + decimal_format
        decimal_format = "%" + decimal_format + "f"
        result = locale.format_string(decimal_format, value, grouping=True).rstrip("0")
    else:
        # default to ts="," and dp=".", with python local-unaware formatting
        decimal_format = "{:"
        if is_diff:
            decimal_format += "+"
        decimal_format += ","
        if precision > 0:
            decimal_format += ".0" + str(precision)
        decimal_format += "f}"
        result = decimal_format.format(value).rstrip("0")
    dp = _cached_dp

    if dp in result:
        integer_part, fract_part = result.split(dp)
    else:
        integer_part, fract_part = result, ""

    if len(fract_part) < num_zeros:
        fract_part += "0" * (num_zeros - len(fract_part))
    result = integer_part + dp + fract_part
    if whitespaces:
        result += " " * (decimal_point - len(fract_part))
        result = " " * (15 - len(result)) + result
    _fmt_sats_cache.put(cache_key, result)
    return result


def format_amount(x, config: SimpleConfig, is_diff=False, whitespaces=False) -> str:
    """Wrapper for format_satoshis with a config parameter"""
    return format_satoshis(
        x,
        config.get("num_zeros", 2),
        config.get("decimal_point", 2),
        is_diff=is_diff,
        whitespaces=whitespaces,
    )


def base_unit(config: SimpleConfig):
    decimal_point = config.get("decimal_point", 2)
    if decimal_point in BASE_UNITS_BY_DECIMALS:
        return BASE_UNITS_BY_DECIMALS[decimal_point]
    raise Exception("Unknown base unit")


def format_amount_and_units(amount, config: SimpleConfig, fx: FxThread, is_diff=False):
    text = format_amount(amount, config, is_diff=is_diff) + " " + base_unit(config)
    x = fx.format_amount_and_units(amount, is_diff=is_diff)
    if text and x:
        text += " (%s)" % x
    return text


def format_fee_satoshis(fee, num_zeros=0):
    return format_satoshis(fee, num_zeros, 0, precision=num_zeros)
