from __future__ import annotations

import platform
import sys
from collections import OrderedDict
from typing import TYPE_CHECKING, Optional, Tuple

import qtpy
from qtpy import QtWidgets
from qtpy.QtCore import Qt, Signal
from qtpy.QtGui import QIcon

from electrumabc import networks, paymentrequest, web
from electrumabc.address import Address
from electrumabc.constants import BASE_UNITS, PROJECT_NAME
from electrumabc.i18n import (
    _,
    get_system_language_match,
    languages,
    match_language,
    pgettext,
)

if TYPE_CHECKING:
    from electrumabc.exchange_rate import FxThread
    from electrumabc.simple_config import SimpleConfig
    from electrumabc.wallet import AbstractWallet

    from . import ElectrumGui

from . import exception_window
from .amountedit import XECSatsByteEdit
from .qrreader.camera_dialog import get_camera_path
from .util import Buttons, CloseButton, ColorScheme, HelpLabel, WindowModalDialog


def windows_qt_use_freetype(config):
    """Returns True iff we are windows and we are set to use freetype as
    the font engine.  This will always return false on platforms where the
    question doesn't apply. This config setting defaults to True for
    Windows < Win10 and False otherwise. It is only relevant when
    using the Qt GUI, however."""
    if sys.platform not in ("win32", "cygwin"):
        return False
    try:
        winver = float(platform.win32_ver()[0])  # '7', '8', '8.1', '10', etc
    except (AttributeError, ValueError, IndexError):
        # We can get here if cygwin, which has an empty win32_ver tuple
        # in some cases.
        # In that case "assume windows 10" and just proceed.  Cygwin users
        # can always manually override this setting from GUI prefs.
        winver = 10
    # setting defaults to on for Windows < Win10
    return bool(config.get("windows_qt_use_freetype", winver < 10))


def set_windows_qt_use_freetype(config, b):
    if config.is_modifiable("windows_qt_use_freetype") and sys.platform in (
        "win32",
        "cygwin",
    ):
        config.set_key("windows_qt_use_freetype", bool(b))


class SettingsDialog(WindowModalDialog):
    shown_signal = Signal()
    num_zeros_changed = Signal()
    custom_fee_changed = Signal()
    show_fee_changed = Signal(bool)
    alias_changed = Signal()
    unit_changed = Signal()
    enable_opreturn_changed = Signal(bool)
    currency_changed = Signal()
    show_history_rates_toggled = Signal(bool)
    show_fiat_balance_toggled = Signal()

    def __init__(
        self,
        parent: Optional[QtWidgets.QWidget],
        config: SimpleConfig,
        wallet: AbstractWallet,
        fx: FxThread,
        alias_info: Optional[Tuple[Address, str, bool]],
        base_unit: str,
        gui_object: ElectrumGui,
    ):
        super().__init__(parent, _("Preferences"))
        self.setObjectName("WindowModalDialog - Preferences")

        self.config = config
        self.wallet = wallet
        self.fx = fx
        self.gui_object = gui_object
        self.base_unit = base_unit

        self.need_restart = False
        self.need_wallet_reopen = False
        self.dialog_finished = False

        vbox = QtWidgets.QVBoxLayout()
        tabs = QtWidgets.QTabWidget()
        gui_widgets = []
        misc_widgets = []
        global_tx_widgets, per_wallet_tx_widgets = [], []

        # language
        lang_help = _("Select which language is used in the GUI (after restart).")
        lang_label = HelpLabel(_("Language") + ":", lang_help)
        self.lang_combo = QtWidgets.QComboBox()

        language_names = []
        self.language_keys = []
        for lang_code, lang_def in languages.items():
            self.language_keys.append(lang_code)
            lang_name = [lang_def.name]
            if lang_code == "":
                # System entry in languages list (==''), gets system setting
                sys_lang = get_system_language_match()
                if sys_lang:
                    lang_name.append(f" [{languages[sys_lang].name}]")
            language_names.append("".join(lang_name))
        self.lang_combo.addItems(language_names)
        conf_lang = self.config.get("language", "")
        if conf_lang:
            # The below code allows us to rename languages in saved config and
            # have them still line up with languages in our languages dict.
            # For example we used to save English as en_UK but now it's en_US
            # and it will still match
            conf_lang = match_language(conf_lang)
        try:
            index = self.language_keys.index(conf_lang)
        except ValueError:
            index = 0
        self.lang_combo.setCurrentIndex(index)

        if not self.config.is_modifiable("language"):
            for w in [self.lang_combo, lang_label]:
                w.setEnabled(False)

        self.lang_combo.currentIndexChanged.connect(self.on_lang)
        gui_widgets.append((lang_label, self.lang_combo))

        nz_help = _(
            "Number of zeros displayed after the decimal point. For example, if this "
            'is set to 2, "1." will be displayed as "1.00"'
        )
        nz_label = HelpLabel(_("Zeros after decimal point") + ":", nz_help)
        self.nz = QtWidgets.QSpinBox()
        self.nz.setMinimum(0)
        self.nz.setMaximum(self.config.get("decimal_point", 2))
        self.nz.setValue(int(self.config.get("num_zeros", 2)))
        if not self.config.is_modifiable("num_zeros"):
            for w in [self.nz, nz_label]:
                w.setEnabled(False)

        self.nz.valueChanged.connect(self.on_nz)
        gui_widgets.append((nz_label, self.nz))

        fee_gb = QtWidgets.QGroupBox(_("Fees"))
        fee_lo = QtWidgets.QGridLayout(fee_gb)

        self.customfee_e = XECSatsByteEdit()
        self.customfee_e.setAmount(
            self.config.custom_fee_rate() / 1000.0
            if self.config.has_custom_fee_rate()
            else None
        )
        self.customfee_e.textChanged.connect(self.on_customfee)
        customfee_label = HelpLabel(
            _("Custom fee rate:"), _("Custom Fee Rate in Satoshis per byte")
        )
        fee_lo.addWidget(customfee_label, 0, 0, 1, 1, Qt.AlignRight)
        fee_lo.addWidget(self.customfee_e, 0, 1, 1, 1, Qt.AlignLeft)

        feebox_cb = QtWidgets.QCheckBox(_("Edit fees manually"))
        feebox_cb.setChecked(self.config.get("show_fee", False))
        feebox_cb.setToolTip(_("Show fee edit box in send tab."))

        feebox_cb.stateChanged.connect(self.on_feebox)
        fee_lo.addWidget(feebox_cb, 1, 0, 1, 2, Qt.AlignJustify)

        # Fees box up top
        misc_widgets.append((fee_gb, None))

        msg = (
            _("OpenAlias record, used to receive coins and to sign payment requests.")
            + "\n\n"
            + _("The following alias providers are available:")
            + "\n"
            + "\n".join(["https://cryptoname.co/", "http://xmr.link/"])
            + "\n\n"
            + _("For more information, see http://openalias.org")
        )
        alias_label = HelpLabel(_("OpenAlias") + ":", msg)
        alias = self.config.get("alias", "")
        self.alias_e = QtWidgets.QLineEdit(alias)

        self.set_alias_color(alias_info)
        self.alias_e.editingFinished.connect(self.on_alias_edit)
        id_gb = QtWidgets.QGroupBox(_("Identity"))
        id_form = QtWidgets.QFormLayout(id_gb)
        id_form.addRow(alias_label, self.alias_e)

        # SSL certificate
        msg = " ".join(
            [
                _("SSL certificate used to sign payment requests."),
                _("Use setconfig to set ssl_chain and ssl_privkey."),
            ]
        )
        if self.config.get("ssl_privkey") or self.config.get("ssl_chain"):
            try:
                ssl_identity = paymentrequest.check_ssl_config(self.config)
                ssl_error = None
            except Exception as e:
                ssl_identity = "error"
                ssl_error = str(e)
        else:
            ssl_identity = ""
            ssl_error = None
        SSL_id_label = HelpLabel(_("SSL certificate") + ":", msg)
        SSL_id_e = QtWidgets.QLineEdit(ssl_identity)
        SSL_id_e.setStyleSheet(
            (ColorScheme.RED if ssl_error else ColorScheme.GREEN).as_stylesheet(True)
            if ssl_identity
            else ""
        )
        if ssl_error:
            SSL_id_e.setToolTip(ssl_error)
        SSL_id_e.setReadOnly(True)
        id_form.addRow(SSL_id_label, SSL_id_e)

        # Identity box in middle of this tab
        # commit id_form/id_gb to master layout via this data structure
        misc_widgets.append((id_gb, None))
        cr_gb = QtWidgets.QGroupBox(_("Crash Reporter"))
        cr_grid = QtWidgets.QGridLayout(cr_gb)
        cr_chk = QtWidgets.QCheckBox()
        cr_chk.setChecked(exception_window.is_enabled(self.config))
        cr_chk.clicked.connect(lambda b: exception_window.set_enabled(self.config, b))
        cr_help = HelpLabel(
            _("Crash reporter enabled"),
            _(
                "The crash reporter is the error window which pops-up when "
                f"{PROJECT_NAME} encounters an internal error.\n\n"
                "It is recommended that you leave this option enabled, so that "
                "developers can be notified of any internal bugs. "
                "When a crash is encountered you are asked if you would like "
                "to send a report.\n\nPrivate information is never revealed "
                "in crash reports to developers."
            ),
        )
        # The below dance ensures the checkbox is horizontally centered in the widget
        cr_grid.addWidget(QtWidgets.QWidget(), 0, 0, 1, 1)  # dummy spacer
        cr_grid.addWidget(cr_chk, 0, 1, 1, 1, Qt.AlignRight)
        cr_grid.addWidget(cr_help, 0, 2, 1, 1, Qt.AlignLeft)
        cr_grid.addWidget(QtWidgets.QWidget(), 0, 3, 1, 1)  # dummy spacer
        cr_grid.setColumnStretch(0, 1)
        cr_grid.setColumnStretch(3, 1)

        # Crash reporter box at bottom of this tab
        misc_widgets.append((cr_gb, None))  # commit crash reporter gb to layout

        units_for_menu = tuple(u.name_for_selection_menu for u in BASE_UNITS)
        self.unit_names = tuple(u.ticker for u in BASE_UNITS)
        msg = (
            _("Base unit of your wallet.")
            + "\n1 MegaXEC = 1 BCHA = 1,000,000 XEC.\n"
            + _(" These settings affects the fields in the Send tab")
            + " "
        )
        unit_label = HelpLabel(_("Base unit") + ":", msg)
        self.unit_combo = QtWidgets.QComboBox()
        self.unit_combo.addItems(units_for_menu)
        self.unit_combo.setCurrentIndex(self.unit_names.index(self.base_unit))
        self.unit_combo.currentIndexChanged.connect(self.on_unit)
        gui_widgets.append((unit_label, self.unit_combo))

        msg = _(
            "Choose which online block explorer to use for functions that open a web "
            "browser"
        )
        block_ex_label = HelpLabel(_("Online block explorer") + ":", msg)
        self.block_ex_combo = QtWidgets.QComboBox()
        self.block_ex_combo.addItems(web.BE_sorted_list())
        self.block_ex_combo.setCurrentIndex(
            self.block_ex_combo.findText(web.BE_name_from_config(self.config))
        )

        self.block_ex_combo.currentIndexChanged.connect(self.on_be)
        gui_widgets.append((block_ex_label, self.block_ex_combo))

        self.qr_combo = QtWidgets.QComboBox()
        self.qr_label = HelpLabel(_("Video device"), "")
        self.qr_did_scan = False

        # pre-populate combo box with default so it has a sizeHint
        self.set_no_camera()

        # do the camera scan once dialog is shown, using QueuedConnection so it's
        # called from top level event loop and not from the showEvent handler
        self.shown_signal.connect(self.scan_cameras, Qt.QueuedConnection)
        self.qr_combo.currentIndexChanged.connect(self.on_video_device)
        gui_widgets.append((self.qr_label, self.qr_combo))

        self.colortheme_combo = QtWidgets.QComboBox()
        # We can't name this "light" in the UI as sometimes the default is actually
        # dark-looking eg on Mojave or on some Linux desktops.
        self.colortheme_combo.addItem(_("Default"), "default")
        self.colortheme_combo.addItem(_("Dark"), "dark")
        self.theme_name = self.config.get("qt_gui_color_theme", "default")
        if self.theme_name == "dark" and not self.gui_object.is_dark_theme_available():
            self.theme_name = "default"
        index = self.colortheme_combo.findData(self.theme_name)
        if index < 0:
            index = 0
        self.colortheme_combo.setCurrentIndex(index)
        if (
            sys.platform in ("darwin",)
            and not self.gui_object.is_dark_theme_available()
        ):
            msg = _(
                "Color theme support is provided by macOS if using Mojave or above."
                " Use the System Preferences to switch color themes."
            )
            err_msg = msg
        else:
            msg = (
                _(
                    "Dark theme support requires the package 'QDarkStyle' (typically "
                    "installed via the 'pip3' command on Unix & macOS)."
                )
                if not self.gui_object.is_dark_theme_available()
                else ""
            )
            err_msg = _(
                "Dark theme is not available. Please install QDarkStyle to access "
                "this feature."
            )
        lbltxt = _("Color theme") + ":"
        colortheme_label = HelpLabel(lbltxt, msg) if msg else QtWidgets.QLabel(lbltxt)

        self.colortheme_combo.currentIndexChanged.connect(
            lambda x: self.on_colortheme(x, err_msg)
        )
        gui_widgets.append((colortheme_label, self.colortheme_combo))

        if sys.platform not in ("darwin",):
            # Enable/Disable HighDPI -- this option makes no sense for macOS
            # and thus does not appear on that platform
            self.hidpi_chk = QtWidgets.QCheckBox(_("Automatic high-DPI scaling"))
            if sys.platform in ("linux",):
                self.hidpi_chk.setToolTip(
                    _(
                        "Enable/disable this option if you experience graphical "
                        "glitches (such as overly large status bar icons)"
                    )
                )
            else:  # windows
                self.hidpi_chk.setToolTip(
                    _(
                        "Enable/disable this option if you experience graphical "
                        "glitches (such as dialog box text being cut off"
                    )
                )
            self.hidpi_chk.setChecked(bool(self.config.get("qt_enable_highdpi", True)))
            if self.config.get("qt_disable_highdpi"):
                self.hidpi_chk.setToolTip(
                    _("Automatic high DPI scaling was disabled from the command-line")
                )
                self.hidpi_chk.setChecked(False)
                self.hidpi_chk.setDisabled(True)

            self.hidpi_chk.stateChanged.connect(self.on_hi_dpi_toggle)
            gui_widgets.append((self.hidpi_chk, None))

            if sys.platform in ("win32", "cygwin"):
                # Enable/Disable the use of the FreeType library on Qt
                # (Windows only)
                freetype_chk = QtWidgets.QCheckBox(_("Use FreeType for font rendering"))
                freetype_chk.setChecked(windows_qt_use_freetype(self.config))
                freetype_chk.setEnabled(
                    self.config.is_modifiable("windows_qt_use_freetype")
                )
                freetype_chk.setToolTip(
                    _(
                        "Enable/disable this option if you experience font rendering "
                        "glitches (such as blurred text or monochrome emoji characters)"
                    )
                )

                def on_freetype_chk():
                    set_windows_qt_use_freetype(self.config, freetype_chk.isChecked())
                    self.need_restart = True

                freetype_chk.stateChanged.connect(on_freetype_chk)
                gui_widgets.append((freetype_chk, None))
            elif sys.platform in ("linux",):
                # Enable/Disable the use of the fonts.xml FontConfig override
                # (Linux only)
                self.fontconfig_chk = QtWidgets.QCheckBox(
                    _("Use custom fontconfig for emojis")
                )
                self.fontconfig_chk.setChecked(
                    self.gui_object.linux_qt_use_custom_fontconfig
                )
                self.fontconfig_chk.setEnabled(
                    self.config.is_modifiable("linux_qt_use_custom_fontconfig")
                )
                self.fontconfig_chk.setToolTip(
                    _(
                        "Enable/disable this option if you experience font rendering "
                        "glitches (such as blurred text or monochrome emoji characters)"
                    )
                )
                self.fontconfig_chk.stateChanged.connect(self.on_fontconfig_chk)
                gui_widgets.append((self.fontconfig_chk, None))

        # CashAddr control
        gui_widgets.append((None, None))  # spacer
        address_w = QtWidgets.QGroupBox(_("Address Format"))
        address_w.setToolTip(
            _("Select between Cash Address and Legacy formats for addresses")
        )
        hbox = QtWidgets.QHBoxLayout(address_w)
        self.cashaddr_cbox = QtWidgets.QComboBox()
        self.cashaddr_cbox.addItem(
            QIcon(":icons/tab_converter.svg"), _("CashAddr"), Address.FMT_CASHADDR
        )
        self.cashaddr_cbox.addItem(
            QIcon(":icons/tab_converter_bw.svg"), _("Legacy"), Address.FMT_LEGACY
        )
        self.cashaddr_cbox.setCurrentIndex(0 if self.gui_object.is_cashaddr() else 1)

        self.cashaddr_cbox.currentIndexChanged.connect(self.cashaddr_cbox_handler)
        hbox.addWidget(self.cashaddr_cbox)
        toggle_cashaddr_control = QtWidgets.QCheckBox(_("Hide status button"))
        toggle_cashaddr_control.setToolTip(
            _(
                "If checked, the status bar button for toggling address formats will "
                "be hidden"
            )
        )
        toggle_cashaddr_control.setChecked(
            self.gui_object.is_cashaddr_status_button_hidden()
        )
        toggle_cashaddr_control.toggled.connect(
            self.gui_object.set_cashaddr_status_button_hidden
        )
        hbox.addWidget(toggle_cashaddr_control)
        gui_widgets.append((address_w, None))

        # spacer
        gui_widgets.append((None, None))
        updatecheck_cb = QtWidgets.QCheckBox(_("Automatically check for updates"))
        updatecheck_cb.setChecked(self.gui_object.has_auto_update_check())
        updatecheck_cb.setToolTip(
            _(
                "Enable this option if you wish to be notified as soon as a "
                f"new version of {PROJECT_NAME} becomes available"
            )
        )

        updatecheck_cb.stateChanged.connect(self.on_set_updatecheck)
        gui_widgets.append((updatecheck_cb, None))

        notify_tx_cb = QtWidgets.QCheckBox(_("Notify when receiving funds"))
        notify_tx_cb.setToolTip(
            _(
                "If enabled, a system notification will be presented when you receive "
                "funds to this wallet."
            )
        )
        notify_tx_cb.setChecked(bool(self.wallet.storage.get("gui_notify_tx", True)))

        notify_tx_cb.stateChanged.connect(self.on_notify_tx)
        per_wallet_tx_widgets.append((notify_tx_cb, None))

        usechange_cb = QtWidgets.QCheckBox(_("Use change addresses"))
        usechange_cb.setChecked(self.wallet.use_change)
        usechange_cb.setToolTip(
            _(
                "Using change addresses makes it more difficult for other people to "
                "track your transactions."
            )
        )

        usechange_cb.stateChanged.connect(self.on_usechange)
        per_wallet_tx_widgets.append((usechange_cb, None))

        multiple_change = self.wallet.multiple_change
        self.multiple_cb = QtWidgets.QCheckBox(_("Use multiple change addresses"))
        self.multiple_cb.setEnabled(self.wallet.use_change)
        self.multiple_cb.setToolTip(
            "\n".join(
                [
                    _(
                        "In some cases, use up to 3 change addresses in order to break "
                        "up large coin amounts and obfuscate the recipient address."
                    ),
                    _("This may result in higher transactions fees."),
                ]
            )
        )
        self.multiple_cb.setChecked(multiple_change)

        self.multiple_cb.stateChanged.connect(self.on_multiple)
        per_wallet_tx_widgets.append((self.multiple_cb, None))

        conf_only = self.config.get("confirmed_only", False)
        unconf_cb = QtWidgets.QCheckBox(_("Spend only confirmed coins"))
        unconf_cb.setToolTip(_("Spend only confirmed inputs."))
        unconf_cb.setChecked(conf_only)
        unconf_cb.stateChanged.connect(self.on_unconf)
        global_tx_widgets.append((unconf_cb, None))

        # Fiat Currency
        self.hist_checkbox = QtWidgets.QCheckBox()
        self.fiat_address_checkbox = QtWidgets.QCheckBox()
        self.ccy_combo = QtWidgets.QComboBox()
        self.ex_combo = QtWidgets.QComboBox()

        enable_opreturn = bool(self.config.get("enable_opreturn"))
        opret_cb = QtWidgets.QCheckBox(_("Enable OP_RETURN output"))
        opret_cb.setToolTip(_("Enable posting messages with OP_RETURN."))
        opret_cb.setChecked(enable_opreturn)
        opret_cb.stateChanged.connect(self.enable_opreturn_changed.emit)
        global_tx_widgets.append((opret_cb, None))

        # Legacy BCT Segwit Send Protection™
        legacy_p2sh_cb = QtWidgets.QCheckBox(_("Allow legacy p2sh in the Send tab"))
        prefix_char = "3" if not networks.net.TESTNET else "2"
        legacy_p2sh_cb.setToolTip(
            _(
                "If enabled, you will be allowed to use legacy '{prefix_char}...' "
                "style addresses in the Send tab.\nOtherwise you must use CashAddr for "
                "p2sh in the UI."
            ).format(prefix_char=prefix_char)
        )
        legacy_p2sh_cb.setChecked(bool(self.config.get("allow_legacy_p2sh", False)))

        legacy_p2sh_cb.stateChanged.connect(self.on_legacy_p2sh_cb)
        global_tx_widgets.append((legacy_p2sh_cb, None))

        locktime_cb = QtWidgets.QCheckBox(_("Enable current block locktime"))
        locktime_cb.setToolTip(
            _("Enable setting transaction locktime to current block height")
        )
        locktime_cb.setChecked(self.config.is_current_block_locktime_enabled())
        locktime_cb.toggled.connect(self.config.set_current_block_locktime_enabled)

        global_tx_widgets.append((locktime_cb, None))

        # Schnorr
        use_schnorr_cb = QtWidgets.QCheckBox(_("Sign with Schnorr signatures"))
        use_schnorr_cb.setChecked(self.wallet.is_schnorr_enabled())
        use_schnorr_cb.stateChanged.connect(self.wallet.set_schnorr_enabled)
        no_schnorr_reason = []
        if self.wallet.is_schnorr_possible(no_schnorr_reason):
            use_schnorr_cb.setEnabled(True)
            use_schnorr_cb.setToolTip(
                _("Sign all transactions using Schnorr signatures.")
            )
        else:
            # not possible (wallet type not supported); show reason in tooltip
            use_schnorr_cb.setEnabled(False)
            use_schnorr_cb.setToolTip(no_schnorr_reason[0])
        per_wallet_tx_widgets.append((use_schnorr_cb, None))

        # Retire old change addresses
        limit_change_w = QtWidgets.QWidget()
        vb = QtWidgets.QVBoxLayout(limit_change_w)
        vb.setContentsMargins(0, 0, 0, 0)
        self.limit_change_chk = QtWidgets.QCheckBox(_("Retire unused change addresses"))
        self.limit_change_chk.setChecked(self.wallet.limit_change_addr_subs > 0)
        vb.addWidget(self.limit_change_chk)
        self.limit_change_inner_w = QtWidgets.QWidget()
        hb = QtWidgets.QHBoxLayout(self.limit_change_inner_w)
        hb.addSpacing(24)
        hb.setContentsMargins(0, 0, 0, 0)
        self.limit_change_sb = QtWidgets.QSpinBox()
        self.limit_change_sb.setMinimum(0)
        self.limit_change_sb.setMaximum(2**31 - 1)
        self.limit_change_sb.setValue(
            self.wallet.limit_change_addr_subs
            or self.wallet.DEFAULT_CHANGE_ADDR_SUBS_LIMIT
        )
        l1 = QtWidgets.QLabel(_("Retire if older than:"))
        f = l1.font()
        f.setPointSize(f.pointSize() - 1)
        l1.setFont(f)
        hb.addWidget(l1)
        hb.addWidget(self.limit_change_sb)
        l2 = QtWidgets.QLabel(_("from latest index"))
        l2.setFont(f)
        hb.addWidget(l2)
        self.limit_change_sb.setFont(f)

        self.limit_change_inner_w.setEnabled(self.limit_change_chk.isChecked())
        self.limit_change_sb.valueChanged.connect(self.limit_change_subs_changed)
        self.limit_change_chk.stateChanged.connect(self.limit_change_subs_changed)
        vb.addWidget(self.limit_change_inner_w)
        vb.addStretch(1)
        limit_change_w.setToolTip(
            "<p>"
            + _(
                "If checked, change addresses with no balance and trivial history which"
                " are sufficiently old will not be subscribed-to on the server, in"
                " order to save resources."
            )
            + "</p>"
            + "<p>"
            + _(
                "Disable this option if you plan on receiving funds using your old"
                " change addresses or if you suspect your old change addresses may have"
                " unseen funds on them."
            )
            + "</p>"
        )
        self.limit_change_inner_w.setToolTip(
            "<p>"
            + _(
                "Specify how old a change address must be in order to be considered"
                " for retirement. This value is in terms of address index position"
                " from the most recent change address."
            )
            + "</o>"
        )
        per_wallet_tx_widgets.append((limit_change_w, None))

        # Fiat Tab
        self.update_currencies()
        self.update_history_cb()
        self.update_fiat_address_cb()
        self.update_exchanges()
        self.ccy_combo.currentIndexChanged.connect(self.on_currency)
        self.hist_checkbox.stateChanged.connect(self.on_history)
        self.fiat_address_checkbox.stateChanged.connect(self.on_fiat_address)
        self.ex_combo.currentIndexChanged.connect(self.on_exchange)

        self.hist_checkbox.setText(_("Show history rates"))
        self.fiat_address_checkbox.setText(_("Show fiat balance for addresses"))

        fiat_widgets = [
            (QtWidgets.QLabel(_("Fiat currency:")), self.ccy_combo),
            (QtWidgets.QLabel(_("Source:")), self.ex_combo),
            (self.hist_checkbox, None),
            (self.fiat_address_checkbox, None),
        ]

        tabs_info = [
            (gui_widgets, _("General")),
            (
                misc_widgets,
                pgettext("The preferences -> Fees,misc tab", "Fees && Misc."),
            ),
            (
                OrderedDict(
                    [
                        (_("App-Global Options"), global_tx_widgets),
                        (_("Per-Wallet Options"), per_wallet_tx_widgets),
                    ]
                ),
                _("Transactions"),
            ),
            (fiat_widgets, _("Fiat")),
        ]

        def add_widget_pair(a, b, grid):
            i = grid.rowCount()
            if b:
                if a:
                    grid.addWidget(a, i, 0)
                grid.addWidget(b, i, 1)
            else:
                if a:
                    grid.addWidget(a, i, 0, 1, 2)
                else:
                    grid.addItem(QtWidgets.QSpacerItem(15, 15), i, 0, 1, 2)

        for thing, name in tabs_info:
            tab = QtWidgets.QWidget()
            if isinstance(thing, dict):
                # This Prefs tab is laid out as groupboxes one atop another...
                d = thing
                tabvbox = QtWidgets.QVBoxLayout(tab)
                for groupName, widgets in d.items():
                    gbox = QtWidgets.QGroupBox(groupName)
                    grid = QtWidgets.QGridLayout(gbox)
                    grid.setColumnStretch(0, 1)
                    for a, b in widgets:
                        add_widget_pair(a, b, grid)
                    tabvbox.addWidget(gbox, len(widgets))
            else:
                # Standard layout.. 1 tab has just a grid of widgets
                widgets = thing
                grid = QtWidgets.QGridLayout(tab)
                grid.setColumnStretch(0, 1)
                for a, b in widgets:
                    add_widget_pair(a, b, grid)
            tabs.addTab(tab, name)

        vbox.addWidget(tabs)
        vbox.addStretch(1)
        vbox.addLayout(Buttons(CloseButton(self)))
        self.setLayout(vbox)

    def showEvent(self, e):
        super().showEvent(e)
        self.shown_signal.emit()

    def set_alias_color(self, alias_info: Optional[Tuple[Address, str, bool]]):
        if not self.config.get("alias"):
            self.alias_e.setStyleSheet("")
            return
        if alias_info is not None:
            alias_addr, alias_name, validated = alias_info
            self.alias_e.setStyleSheet(
                (ColorScheme.GREEN if validated else ColorScheme.RED).as_stylesheet(
                    True
                )
            )
        else:
            self.alias_e.setStyleSheet(ColorScheme.RED.as_stylesheet(True))

    def on_lang(self, x):
        lang_request = self.language_keys[self.lang_combo.currentIndex()]
        if lang_request != self.config.get("language"):
            self.config.set_key("language", lang_request, True)
            self.need_restart = True

    def on_nz(self):
        value = self.nz.value()
        if self.config.get("num_zeros", 2) != value:
            self.config.set_key("num_zeros", value, True)
            self.num_zeros_changed.emit()

    def on_unit(self, x):
        unit_index = self.unit_combo.currentIndex()
        unit_result = self.unit_names[unit_index]
        if self.base_unit == unit_result:
            return
        dp = BASE_UNITS[unit_index].decimals
        self.config.set_key("decimal_point", dp, True)
        self.nz.setMaximum(dp)
        self.unit_changed.emit()
        self.need_restart = True

    def on_customfee(self, x):
        amt = self.customfee_e.get_amount()
        m = int(amt * 1000.0) if amt is not None else None
        self.config.set_key("customfee", m)
        self.custom_fee_changed.emit()

    def on_feebox(self, x):
        self.config.set_key("show_fee", x == Qt.Checked)
        self.show_fee_changed.emit(bool(x))

    def on_alias_edit(self):
        self.alias_e.setStyleSheet("")
        alias = str(self.alias_e.text())
        self.config.set_key("alias", alias, True)
        if alias:
            self.alias_changed.emit()

    def on_be(self, x):
        be_result = web.BE_sorted_list()[self.block_ex_combo.currentIndex()]
        self.config.set_key("block_explorer", be_result, True)

    def set_no_camera(self, e=""):
        # Older Qt or missing libs -- disable GUI control and inform user why
        self.qr_combo.setEnabled(False)
        self.qr_combo.clear()
        self.qr_combo.addItem(_("Default"), "default")
        self.qr_combo.setToolTip(
            _(
                "Unable to probe for cameras on this system. QtMultimedia is "
                "likely missing."
            )
        )
        self.qr_label.setText(_("Video device") + " " + _("(disabled)") + ":")
        self.qr_label.help_text = self.qr_combo.toolTip() + "\n\n" + str(e)
        self.qr_label.setToolTip(self.qr_combo.toolTip())

    def scan_cameras(self):
        # dialog_finished guard needed because QueuedConnection
        # already scanned or dialog finished quickly
        if self.qr_did_scan or self.dialog_finished:
            return
        self.qr_did_scan = True
        try:
            if qtpy.QT5:
                from qtpy.QtMultimedia import QCameraInfo
            else:
                from qtpy.QtMultimedia import QMediaDevices
        except ImportError as e:
            self.set_no_camera(e)
            return
        system_cameras = (
            QCameraInfo.availableCameras() if qtpy.QT5 else QMediaDevices.videoInputs()
        )
        self.qr_combo.clear()
        self.qr_combo.addItem(_("Default"), "default")
        self.qr_label.setText(_("Video device") + ":")
        self.qr_label.help_text = _("For scanning QR codes.")
        self.qr_combo.setToolTip(self.qr_label.help_text)
        self.qr_label.setToolTip(self.qr_label.help_text)
        for cam in system_cameras:
            self.qr_combo.addItem(cam.description(), get_camera_path(cam))
        video_device = self.config.get("video_device")
        video_device_index = 0
        if video_device:
            # if not found, default to 0 (the default item)
            video_device_index = max(0, self.qr_combo.findData(video_device))
        self.qr_combo.setCurrentIndex(video_device_index)
        self.qr_combo.setEnabled(True)

    def on_video_device(self, x):
        if self.qr_combo.isEnabled():
            self.config.set_key("video_device", self.qr_combo.itemData(x), True)

    def on_colortheme(self, x, err_msg: str):
        item_data = self.colortheme_combo.itemData(x)
        if not self.gui_object.is_dark_theme_available() and item_data == "dark":
            self.show_error(err_msg)
            self.colortheme_combo.setCurrentIndex(0)
            return
        self.config.set_key("qt_gui_color_theme", item_data, True)
        if self.theme_name != item_data:
            self.need_restart = True

    def on_hi_dpi_toggle(self):
        self.config.set_key("qt_enable_highdpi", self.hidpi_chk.isChecked())
        self.need_restart = True

    def on_fontconfig_chk(self):
        # property has a method backing it
        self.gui_object.linux_qt_use_custom_fontconfig = self.fontconfig_chk.isChecked()
        self.need_restart = True

    def cashaddr_cbox_handler(self, ignored_param):
        fmt = self.cashaddr_cbox.currentData()
        self.gui_object.set_address_format(fmt)

    def on_set_updatecheck(self, v):
        self.gui_object.set_auto_update_check(v == Qt.Checked)

    def on_notify_tx(self, b):
        self.wallet.storage.put("gui_notify_tx", bool(b))

    def on_usechange(self, x):
        usechange_result = x == Qt.Checked
        if self.wallet.use_change != usechange_result:
            self.wallet.use_change = usechange_result
            self.wallet.storage.put("use_change", self.wallet.use_change)
            self.multiple_cb.setEnabled(self.wallet.use_change)

    def on_multiple(self, x):
        multiple = x == Qt.Checked
        if self.wallet.multiple_change != multiple:
            self.wallet.multiple_change = multiple
            self.wallet.storage.put("multiple_change", multiple)

    def on_unconf(self, x):
        self.config.set_key("confirmed_only", bool(x))

    def on_legacy_p2sh_cb(self, b):
        self.config.set_key("allow_legacy_p2sh", bool(b))

    def limit_change_subs_changed(self):
        orig_limit_change_subs = self.wallet.limit_change_addr_subs
        self.limit_change_inner_w.setEnabled(self.limit_change_chk.isChecked())
        self.wallet.limit_change_addr_subs = (
            self.limit_change_sb.value() if self.limit_change_chk.isChecked() else 0
        )
        if self.wallet.limit_change_addr_subs != orig_limit_change_subs:
            self.need_wallet_reopen = True
            if self.wallet.synchronizer:
                self.wallet.synchronizer.clear_retired_change_addrs()

    def update_currencies(self):
        if not self.fx:
            return
        currencies = sorted(self.fx.get_currencies(self.fx.get_history_config()))
        self.ccy_combo.clear()
        self.ccy_combo.addItems(
            [pgettext("Referencing Fiat currency", "None")] + currencies
        )
        if self.fx.is_enabled():
            self.ccy_combo.setCurrentIndex(
                self.ccy_combo.findText(self.fx.get_currency())
            )

    def update_history_cb(self):
        if not self.fx:
            return
        self.hist_checkbox.setChecked(self.fx.get_history_config())
        self.hist_checkbox.setEnabled(self.fx.is_enabled())

    def update_fiat_address_cb(self):
        if not self.fx:
            return
        self.fiat_address_checkbox.setChecked(self.fx.get_fiat_address_config())

    def update_exchanges(self):
        if not self.fx:
            return
        b = self.fx.is_enabled()
        self.ex_combo.setEnabled(b)
        if b:
            c = self.fx.get_currency()
            h = self.fx.get_history_config()
        else:
            c, h = self.fx.default_currency, False
        exchanges = self.fx.get_exchanges_by_ccy(c, h)
        conf_exchange = self.fx.config_exchange()
        self.ex_combo.clear()
        self.ex_combo.addItems(sorted(exchanges))
        # try and restore previous exchange if in new list
        idx = self.ex_combo.findText(conf_exchange)
        if idx < 0:
            # hmm, previous exchange wasn't in new h= setting. Try default exchange.
            idx = self.ex_combo.findText(self.fx.default_exchange)
        # if still no success (idx < 0) -> default to the first exchange in combo
        idx = 0 if idx < 0 else idx
        # don't set index if no exchanges, as any index is illegal.
        # this shouldn't happen.
        if exchanges:
            # note this will emit a currentIndexChanged signal if it's changed
            self.ex_combo.setCurrentIndex(idx)

    def on_currency(self, hh):
        if not self.fx:
            return
        b = bool(self.ccy_combo.currentIndex())
        ccy = str(self.ccy_combo.currentText()) if b else None
        self.fx.set_enabled(b)
        if b and ccy != self.fx.ccy:
            self.fx.set_currency(ccy)
        self.update_history_cb()
        self.update_exchanges()
        self.currency_changed.emit()

    def on_exchange(self, idx):
        exchange = str(self.ex_combo.currentText())
        if (
            self.fx
            and self.fx.is_enabled()
            and exchange
            and exchange != self.fx.exchange.name()
        ):
            self.fx.set_exchange(exchange)

    def on_history(self, checked):
        if not self.fx:
            return
        self.fx.set_history_config(checked)
        self.update_exchanges()
        self.show_history_rates_toggled.emit(checked)

    def on_fiat_address(self, checked):
        if not self.fx:
            return
        self.fx.set_fiat_address_config(checked)
        self.show_fiat_balance_toggled.emit()
