import csv
import decimal
import inspect
import json
import os
import pkgutil
import sys
import time
from collections import defaultdict
from datetime import datetime

# Qt 5.12 also exports Decimal
from decimal import Decimal as PyDecimal
from threading import Thread
from typing import Dict, List, Optional

import requests

from .constants import BASE_UNITS_BY_DECIMALS, PROJECT_NAME
from .i18n import _
from .printerror import PrintError, print_error
from .util import ThreadJob

DEFAULT_ENABLED = False
DEFAULT_CURRENCY = "USD"
# Note the exchange here should ideally also support history rates
DEFAULT_EXCHANGE = "CoinGecko"

# See https://en.wikipedia.org/wiki/ISO_4217
CCY_PRECISIONS = {
    "BHD": 3,
    "BIF": 0,
    "BYR": 0,
    "CLF": 4,
    "CLP": 0,
    "CVE": 0,
    "DJF": 0,
    "GNF": 0,
    "IQD": 3,
    "ISK": 0,
    "JOD": 3,
    "JPY": 0,
    "KMF": 0,
    "KRW": 0,
    "KWD": 3,
    "LYD": 3,
    "MGA": 1,
    "MRO": 1,
    "OMR": 3,
    "PYG": 0,
    "RWF": 0,
    "TND": 3,
    "UGX": 0,
    "UYI": 0,
    "VND": 0,
    "VUV": 0,
    "XAF": 0,
    "XAU": 4,
    "XOF": 0,
    "XPF": 0,
}


class ExchangeBase(PrintError):
    satoshis_per_unit: int = 100
    """Number of satoshis per unit for the exchange's base unit."""

    def __init__(self, on_quotes, on_history):
        self.history = {}
        self.history_timestamps = defaultdict(float)
        self.quotes = {}
        self.on_quotes = on_quotes
        self.on_history = on_history

    @staticmethod
    def get_json(site, get_string):
        # APIs must have https
        url = "".join(["https://", site, get_string])
        response = requests.request(
            "GET", url, headers={"User-Agent": f"{PROJECT_NAME}"}, timeout=10
        )
        if response.status_code != 200:
            raise RuntimeWarning("Response status: " + str(response.status_code))
        return response.json()

    @staticmethod
    def get_csv(site, get_string):
        url = "".join(["https://", site, get_string])
        response = requests.request(
            "GET", url, headers={"User-Agent": f"{PROJECT_NAME}"}
        )
        if response.status_code != 200:
            raise RuntimeWarning("Response status: " + str(response.status_code))
        reader = csv.DictReader(response.content.decode().split("\n"))
        return list(reader)

    def name(self):
        return self.__class__.__name__

    def update_safe(self, ccy):
        try:
            self.print_error("getting fx quotes for", ccy)
            self.quotes = self.get_rates(ccy)
            self.print_error("received fx quotes")
        except Exception as e:
            self.print_error("failed fx quotes:", e)
        self.on_quotes()

    def update(self, ccy):
        t = Thread(target=self.update_safe, args=(ccy,), daemon=True)
        t.start()

    def read_historical_rates(self, ccy, cache_dir):
        filename = self._get_cache_filename(ccy, cache_dir)
        h, timestamp = None, 0.0
        if os.path.exists(filename):
            timestamp = os.stat(filename).st_mtime
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    h = json.loads(f.read())
                if h:
                    self.print_error(
                        "read_historical_rates: returning cached history from", filename
                    )
            except Exception as e:
                self.print_error("read_historical_rates: error", repr(e))
        h = h or None
        return h, timestamp

    def _get_cache_filename(self, ccy, cache_dir):
        return os.path.join(cache_dir, self.name() + "_" + ccy)

    @staticmethod
    def _is_timestamp_old(timestamp):
        HOUR = 60.0 * 60.0  # number of seconds in an hour
        # check history rates every 24 hours, as the granularity is per-day
        # anyway
        return time.time() - timestamp >= 24.0 * HOUR

    def is_historical_rate_old(self, ccy):
        return self._is_timestamp_old(self.history_timestamps.get(ccy, 0.0))

    def _cache_historical_rates(self, h, ccy, cache_dir):
        """Writes the history, h, to the cache file. Catches its own exceptions
        and always returns successfully, even if the write process failed.
        """
        wroteBytes, filename = 0, "(none)"
        try:
            filename = self._get_cache_filename(ccy, cache_dir)
            with open(filename, "w", encoding="utf-8") as f:
                f.write(json.dumps(h))
            wroteBytes = os.stat(filename).st_size
        except Exception as e:
            self.print_error("cache_historical_rates error:", repr(e))
            return False
        self.print_error(
            f"cache_historical_rates: wrote {wroteBytes} bytes to file {filename}"
        )
        return True

    def get_historical_rates_safe(self, ccy, cache_dir):
        h, timestamp = self.read_historical_rates(ccy, cache_dir)
        if not h or self._is_timestamp_old(timestamp):
            try:
                self.print_error("requesting fx history for", ccy)
                h = self.request_history(ccy)
                self.print_error("received fx history for", ccy)
                if not h:
                    # Paranoia: No data; abort early rather than write out an
                    # empty file
                    raise RuntimeWarning(f"received empty history for {ccy}")
                self._cache_historical_rates(h, ccy, cache_dir)
            except Exception as e:
                self.print_error("failed fx history:", repr(e))
                return
        self.print_error("received history rates of length", len(h))
        self.history[ccy] = h
        self.history_timestamps[ccy] = timestamp
        self.on_history()

    def get_historical_rates(self, ccy, cache_dir):
        result, timestamp = self.history.get(ccy), self.history_timestamps.get(ccy, 0.0)

        if (
            not result or self._is_timestamp_old(timestamp)
        ) and ccy in self.history_ccys():
            t = Thread(
                target=self.get_historical_rates_safe,
                args=(ccy, cache_dir),
                daemon=True,
            )
            t.start()
        return result

    def history_ccys(self) -> List[str]:
        """Return a list of currency codes for which this exchange
        has an API to query the historical prices."""
        return []

    def historical_rate(self, ccy: str, d_t: datetime):
        return self.history.get(ccy, {}).get(d_t.strftime("%Y-%m-%d"))

    def get_rates(self, ccy: str) -> Dict[str, decimal.Decimal]:
        """Return a dictionary of exchange rates.
        The keys are currencies codes, and the values are decimal.Decimal
        objects.
        """
        raise NotImplementedError("Exchange classes must implement this method")

    def get_currencies(self) -> List[str]:
        """Return a list of currency codes for which this exchange
        has an API to query the current price."""
        rates = self.get_rates("")
        return sorted(
            [str(a) for (a, b) in rates.items() if b is not None and len(a) == 3]
        )

    def request_history(self, ccy: str) -> Dict[str, float]:
        """Return a dict of historical rates for a given currency.
        The dict key is a '%Y-%m-%d' date string, the value are
        floating point numbers.
        """
        raise NotImplementedError(
            "Exchange classes supporting historical exchange rates must "
            "implement this method."
        )


class CoinGecko(ExchangeBase):
    def get_rates(self, ccy):
        json_data = self.get_json(
            "api.coingecko.com",
            "/api/v3/coins/ecash?localization=False&sparkline=false",
        )
        prices = json_data["market_data"]["current_price"]
        return {a[0].upper(): PyDecimal(a[1]) for a in prices.items()}

    def history_ccys(self):
        return [
            "AED",
            "ARS",
            "AUD",
            "BCH",
            "BTD",
            "BHD",
            "BMD",
            "BRL",
            "BTC",
            "CAD",
            "CHF",
            "CLP",
            "CNY",
            "CZK",
            "DKK",
            "ETH",
            "EUR",
            "GBP",
            "HKD",
            "HUF",
            "IDR",
            "ILS",
            "INR",
            "JPY",
            "KRW",
            "KWD",
            "LKR",
            "LTC",
            "MMK",
            "MXH",
            "MYR",
            "NOK",
            "NZD",
            "PHP",
            "PKR",
            "PLN",
            "RUB",
            "SAR",
            "SEK",
            "SGD",
            "THB",
            "TRY",
            "TWD",
            "USD",
            "VEF",
            "XAG",
            "XAU",
            "XDR",
            "ZAR",
        ]

    def request_history(self, ccy):
        history = self.get_json(
            "api.coingecko.com",
            f"/api/v3/coins/ecash/market_chart?vs_currency={ccy}&days=max",
        )

        return {
            datetime.utcfromtimestamp(h[0] / 1000).strftime("%Y-%m-%d"): h[1]
            for h in history["prices"]
        }


class CryptoCompare(ExchangeBase):
    def get_rates(self, ccy):
        price = self.get_json(
            "min-api.cryptocompare.com",
            f"/data/price?fsym=XEC&tsyms={ccy}",
        )
        return price

    def get_currencies(self):
        return [
            "AED",
            "ARS",
            "AUD",
            "BCH",
            "BTD",
            "BHD",
            "BMD",
            "BRL",
            "BTC",
            "CAD",
            "CHF",
            "CLP",
            "CNY",
            "CZK",
            "DKK",
            "ETH",
            "EUR",
            "GBP",
            "HKD",
            "HUF",
            "IDR",
            "ILS",
            "INR",
            "JPY",
            "KRW",
            "KWD",
            "LKR",
            "LTC",
            "MMK",
            "MXH",
            "MYR",
            "NOK",
            "NZD",
            "PHP",
            "PKR",
            "PLN",
            "RUB",
            "SAR",
            "SEK",
            "SGD",
            "THB",
            "TRY",
            "TWD",
            "USD",
            "VEF",
            "XAG",
            "XAU",
            "XDR",
            "ZAR",
        ]


def dictinvert(d):
    inv = {}
    for k, vlist in d.items():
        for v in vlist:
            keys = inv.setdefault(v, [])
            keys.append(k)
    return inv


def load_exchanges_and_currencies() -> Dict[str, List[str]]:
    """Load exchanges and supported currencies from the
    currencies.json data file. If this data file does not
    exist, create it by querying the exchanges' public API.

    The returned dictionary has exchange names as its keys
    and lists of supported currency tickers for that exchange
    as its values.
    """
    path = os.path.join(os.path.dirname(__file__), "currencies.json")
    if not os.path.isfile(path):
        query_save_exchanges_and_currencies()
    data = pkgutil.get_data(__name__, "currencies.json")
    return json.loads(data.decode("utf-8"))


def is_exchange_class(obj) -> bool:
    return (
        inspect.isclass(obj) and issubclass(obj, ExchangeBase) and obj != ExchangeBase
    )


def query_save_exchanges_and_currencies():
    """Query the API of all defined exchanges to get the list of
    supported currencies.
    Save the result to a currencies.json data file in the same directory
    as this module.

    """
    path = os.path.join(os.path.dirname(__file__), "currencies.json")
    currencies = {}

    exchanges = dict(inspect.getmembers(sys.modules[__name__], is_exchange_class))
    for name, klass in exchanges.items():
        exchange = klass(None, None)
        try:
            currencies[name] = exchange.get_currencies()
            print_error(name, "ok")
        except Exception as e:
            print_error(name, f"error:\n{str(e)}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(currencies, indent=4, sort_keys=True))


CURRENCIES = load_exchanges_and_currencies()


def get_exchanges_by_ccy(history=True):
    if not history:
        return dictinvert(CURRENCIES)
    d = {}
    exchanges = CURRENCIES.keys()
    for name in exchanges:
        try:
            klass = globals()[name]
        except KeyError:
            # can happen if currencies.json is not in sync with this
            # .py file, see #1559
            continue
        exchange = klass(None, None)
        d[name] = exchange.history_ccys()
    return dictinvert(d)


class FxThread(ThreadJob):
    default_currency = DEFAULT_CURRENCY
    default_exchange = DEFAULT_EXCHANGE

    def __init__(self, config, network):
        self.config = config
        self.network = network
        self.ccy = self.get_currency()
        self.history_used_spot = False
        self.ccy_combo = None
        self.hist_checkbox = None
        self.timeout = 0.0
        self.cache_dir = os.path.join(config.path, "cache")
        self.exchange: Optional[ExchangeBase] = None
        self.set_exchange(self.config_exchange())
        if not os.path.exists(self.cache_dir):
            os.mkdir(self.cache_dir)

    @staticmethod
    def get_currencies(h):
        d = get_exchanges_by_ccy(h)
        return sorted(d.keys())

    @staticmethod
    def get_exchanges_by_ccy(ccy, h):
        d = get_exchanges_by_ccy(h)
        return d.get(ccy, [])

    def ccy_amount_str(self, amount, commas, default_prec=2, is_diff=False):
        prec = CCY_PRECISIONS.get(self.ccy, default_prec)
        diff_str = ""
        if is_diff:
            diff_str = "+" if amount >= 0 else "-"
        fmt_str = "%s{:%s.%df}" % (diff_str, "," if commas else "", max(0, prec))
        try:
            rounded_amount = round(amount, prec)
        except decimal.InvalidOperation:
            rounded_amount = amount
        return fmt_str.format(rounded_amount)

    def run(self):
        """This runs from the Network thread. It is invoked roughly every
        100ms (see network.py), with actual work being done every 2.5 minutes.
        """
        if self.is_enabled():
            if self.timeout <= time.time():
                self.exchange.update(self.ccy)
                # forced update OR > 24 hours have expired
                if self.show_history() and (
                    self.timeout == 0 or self.exchange.is_historical_rate_old(self.ccy)
                ):
                    # Update historical rates. Note this doesn't actually
                    # go out to the network unless cache file is missing
                    # and/or >= 24 hours have passed since last fetch.
                    self.exchange.get_historical_rates(self.ccy, self.cache_dir)
                # And, finally, update self.timeout so we execute this branch
                # every ~2.5 minutes
                self.timeout = time.time() + 150

    def is_enabled(self):
        return self.config.get("use_exchange_rate", DEFAULT_ENABLED)

    def set_enabled(self, b):
        return self.config.set_key("use_exchange_rate", bool(b))

    def get_history_config(self):
        return bool(self.config.get("history_rates"))

    def set_history_config(self, b):
        self.config.set_key("history_rates", bool(b))

    def get_fiat_address_config(self):
        return bool(self.config.get("fiat_address"))

    def set_fiat_address_config(self, b):
        self.config.set_key("fiat_address", bool(b))

    def get_currency(self):
        """Use when dynamic fetching is needed"""
        return self.config.get("currency", self.default_currency)

    def config_exchange(self):
        return self.config.get("use_exchange", self.default_exchange)

    def show_history(self):
        return (
            self.is_enabled()
            and self.get_history_config()
            and self.ccy in self.exchange.history_ccys()
        )

    def set_currency(self, ccy):
        self.ccy = ccy
        if self.get_currency() != ccy:
            self.config.set_key("currency", ccy, True)
        self.timeout = 0  # Force update because self.ccy changes
        self.on_quotes()

    def set_exchange(self, name):
        default_class = globals().get(self.default_exchange)
        class_ = globals().get(name, default_class)
        if self.config_exchange() != name:
            self.config.set_key("use_exchange", name, True)
        self.exchange = class_(self.on_quotes, self.on_history)
        if (
            self.get_history_config()
            and self.ccy not in self.exchange.history_ccys()
            and class_ != default_class
        ):
            # this exchange has no history for this ccy. Try the default exchange.
            # If that also fails the user will be stuck in a strange UI
            # situation where the checkbox is checked but they see no history
            # Note this code is here to migrate users from previous history
            # API exchanges in config that are no longer serving histories.
            self.set_exchange(self.default_exchange)
            return
        self.print_error("using exchange", name)
        # A new exchange means new fx quotes, initially empty.
        # This forces a quote refresh, which will happen in the Network thread.
        self.timeout = 0

    def on_quotes(self):
        if self.network:
            self.network.trigger_callback("on_quotes")

    def on_history(self):
        if self.network:
            self.network.trigger_callback("on_history")

    def exchange_rate(self, ccy=None) -> Optional[PyDecimal]:
        """Returns None, or the exchange rate as a PyDecimal"""
        rate = self.exchange.quotes.get(ccy or self.ccy)
        if rate:
            return PyDecimal(rate)

    def satoshis_per_unit(self) -> int:
        """Returns the number of satoshis per unit for the unit used
        in the exchange rate provided by the API (e.g. 100 for XEC and
        1000000 for BCHA)"""
        return self.exchange.satoshis_per_unit

    def format_amount_and_units(self, satoshis: int, is_diff=False):
        amount_str = self.format_amount(satoshis, is_diff=is_diff)
        return "" if not amount_str else "%s %s" % (amount_str, self.ccy)

    def format_amount(self, satoshis: int, is_diff=False):
        rate = self.exchange_rate()
        return "" if rate is None else self.value_str(satoshis, rate, is_diff=is_diff)

    def get_fiat_status_text(self, satoshis, base_unit, decimal_point) -> str:
        """Return the exchange rate for 1 unit of the selected unit."""
        rate = self.exchange_rate()
        if rate is None:
            return _("  (No FX rate available)")
        default_prec = 2
        # if base_unit == 'bits', increase precision on fiat as bits is pretty
        # tiny as of 2019
        if base_unit == BASE_UNITS_BY_DECIMALS.get(2):
            default_prec = 8
        elif base_unit == BASE_UNITS_BY_DECIMALS.get(0):
            default_prec = 10

        return " 1 %s~%s %s" % (
            base_unit,
            self.value_str(10**decimal_point, rate, default_prec),
            self.ccy,
        )

    def value_str(self, satoshis, rate, default_prec=2, is_diff=False):
        if satoshis is None:  # Can happen with incomplete history
            return _("Unknown")
        if rate:
            value = (
                PyDecimal(satoshis) / self.exchange.satoshis_per_unit * PyDecimal(rate)
            )
            return "%s" % (
                self.ccy_amount_str(value, True, default_prec, is_diff=is_diff)
            )
        return _("No data")

    def history_rate(self, d_t):
        rate = self.exchange.historical_rate(self.ccy, d_t)
        # Frequently there is no rate for today, until tomorrow :)
        # Use spot quotes in that case
        if rate is None and (datetime.today().date() - d_t.date()).days <= 2:
            rate = self.exchange.quotes.get(self.ccy)
            self.history_used_spot = True
        return PyDecimal(rate) if rate is not None else None

    def historical_value_str(self, satoshis, d_t):
        rate = self.history_rate(d_t)
        return self.value_str(satoshis, rate)

    def historical_value(self, satoshis, d_t):
        rate = self.history_rate(d_t)
        if rate:
            return (
                PyDecimal(satoshis) / self.exchange.satoshis_per_unit * PyDecimal(rate)
            )

    def timestamp_rate(self, timestamp):
        from .util import timestamp_to_datetime

        date = timestamp_to_datetime(timestamp)
        return self.history_rate(date)
