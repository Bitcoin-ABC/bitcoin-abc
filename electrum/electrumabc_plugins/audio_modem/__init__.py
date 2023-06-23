from electrumabc.i18n import _

fullname = _("Audio MODEM")
description = (
    _("Provides support for air-gapped transaction signing.") + " " + _("Linux only.")
)
requires = [("amodem", "http://github.com/romanz/amodem/")]
available_for = ["qt"]
