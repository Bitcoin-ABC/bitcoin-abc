#
# Copyright (c) 2020 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from urllib.parse import quote, unquote, urlencode, urlsplit, urlunsplit


class Badge:
    def __init__(self, **kwargs):
        self.base_url = "https://img.shields.io/static/v1"

        # Provide some defaults, potentially updated by kwargs
        self.query = {
            "label": "shieldio",
            "message": "unknown",
            "color": "inactive",
        }
        self.query.update(kwargs)

    def get_badge_url(self, **kwargs):
        scheme, netloc, path = urlsplit(self.base_url)[0:3]
        return urlunsplit(
            (
                scheme,
                netloc,
                path,
                unquote(
                    urlencode({**self.query, **kwargs}, doseq=True, quote_via=quote)
                ),
                "",
            )
        )


class RasterBadge(Badge):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.base_url = "https://raster.shields.io/static/v1"
