# -*- mode: python3 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs
import sys, os

# Note: the dash in the package name is to prevent a case-insensitive name
# collision with the electrumabc python library which confuses pyinstaller.
PACKAGE="Electrum-ABC"
BUNDLE_IDENTIFIER='org.electrumabc.' + PACKAGE # Used for info.plist
PYPKG='electrumabc'
MAIN_SCRIPT='electrum-abc'
ICONS_FILE='electrumABC.icns'

VERSION = os.environ.get("ELECTRUM_VERSION")
if not VERSION:
    raise Exception('no version')

home = os.path.abspath(".") + "/"
block_cipher = None

# see https://github.com/pyinstaller/pyinstaller/issues/2005
hiddenimports = []
hiddenimports += collect_submodules('trezorlib')
hiddenimports += collect_submodules('btchip')
hiddenimports += collect_submodules('keepkeylib')
hiddenimports += collect_submodules('satochip')    # Satochip
hiddenimports += collect_submodules('smartcard')   # Satochip

datas = [
    (home+'electrumabc/currencies.json', PYPKG),
    (home+'electrumabc/checkpoint.json', PYPKG),
    (home+'electrumabc/checkpoint_testnet.json', PYPKG),
    (home+'electrumabc/servers.json', PYPKG),
    (home+'electrumabc/servers_testnet.json', PYPKG),
    (home+'electrumabc/servers_regtest.json', PYPKG),
    (home+'electrumabc/wordlist/english.txt', PYPKG + '/wordlist'),
    (home+'electrumabc/locale', PYPKG + '/locale'),
    (home+'electrumabc_plugins', PYPKG + '_plugins'),
]
datas += collect_data_files('trezorlib')
datas += collect_data_files('btchip')
datas += collect_data_files('keepkeylib')
# wordlists used by keepkeylib from lib mnemonic
datas += collect_data_files('mnemonic')


# Add libusb so Trezor will work
binaries = [(home + "contrib/osx/libusb-1.0.dylib", ".")]
# LibSecp for fast ECDSA and Schnorr
binaries += [(home + "contrib/osx/libsecp256k1.0.dylib", ".")]
# LibZBar for QR code scanning
binaries += [(home + "contrib/osx/libzbar.0.dylib", ".")]

# Workaround for "Retro Look":
binaries += [b for b in collect_dynamic_libs('PyQt5') if 'macstyle' in b[0]]

# We don't put these files in to actually include them in the script but to make the Analysis method scan them for imports
a = Analysis([home+MAIN_SCRIPT,
              home+'electrumabc_gui/qt/main_window.py',
              home+'electrumabc_gui/qt/qrreader/camera_dialog.py',
              home+'electrumabc_gui/text.py',
              home+'electrumabc/util.py',
              home+'electrumabc/wallet.py',
              home+'electrumabc/simple_config.py',
              home+'electrumabc/bitcoin.py',
              home+'electrumabc/dnssec.py',
              home+'electrumabc/commands.py',
              home+'electrumabc/tor/controller.py',
              home+'electrumabc_plugins/cosigner_pool/qt.py',
              home+'electrumabc_plugins/email_requests/qt.py',
              home+'electrumabc_plugins/trezor/clientbase.py',
              home+'electrumabc_plugins/trezor/trezor.py',
              home+'electrumabc_plugins/trezor/qt.py',
              home+'electrumabc_plugins/keepkey/qt.py',
              home+'electrumabc_plugins/ledger/qt.py',
              home+'electrumabc_plugins/satochip/qt.py',  # Satochip
              home+'electrumabc_plugins/fusion/fusion.py', # CashFusion
              home+'electrumabc_plugins/fusion/qt.py', # CashFusion
              ],
             binaries=binaries,
             datas=datas,
             hiddenimports=hiddenimports,
             hookspath=[])

# http://stackoverflow.com/questions/19055089/pyinstaller-onefile-warning-pyconfig-h-when-importing-scipy-or-scipy-signal
for d in a.datas:
    if 'pyconfig' in d[0]:
        a.datas.remove(d)
        break
# Remove QtWeb and other stuff that we know we never use.
# This is a hack of sorts that works to keep the binary file size reasonable.
bins2remove=('qtweb', 'qt3d', 'qtgame', 'qtdesigner', 'qtquick', 'qtlocation',
             'qttest', 'qtxml', 'qtqml', 'qtsql', 'qtserialport', 'qtsensors',
             'qtpositioning', 'qtnfc', 'qthelp', 'qtbluetooth',
             'pyqt5/qt/qml', 'pyqt5/qt/plugins/position',
             'pyqt5/qt/plugins/sqldrivers', )
files2remove=('libqsqlmysql.dylib', 'libdeclarative_multimedia.dylib',
              'libqtquickscene2dplugin.dylib', 'libqtquickscene3dplugin.dylib',
              'libqtquickcontrols2imaginestyleplugin.dylib', 'libqwebgl.dylib',
              'libqtquickextrasflatplugin.dylib', 'ibqtcanvas3d.dylib',
              'libqtquickcontrolsplugin.dylib', 'libqtquicktemplates2plugin.dylib',
              'libqtlabsplatformplugin.dylib', 'libdeclarative_sensors.dylib',
              'libdeclarative_location.dylib', )
print("Removing", *(bins2remove + files2remove))
for x in a.binaries.copy():
    item = x[0].lower()
    fn = x[1].lower()
    if os.path.basename(fn) in files2remove:
        a.binaries.remove(x)
        print('----> Removed:', x)
        continue
    for r in bins2remove:
        pyqt5_r = 'pyqt5.' + r
        if item.startswith(r) or item.startswith(pyqt5_r):
            a.binaries.remove(x)
            print('----> Removed:', x)
            break # break from inner loop
#

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    exclude_binaries=True,
    name=PACKAGE,
    debug=False,
    strip=False,
    upx=False,
    icon=home+ICONS_FILE,
    console=False,
    # TODO investigate building 'universal2'
    target_arch='x86_64',
)

app = BUNDLE(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    version = VERSION,
    name=PACKAGE + '.app',
    icon=home+ICONS_FILE,
    bundle_identifier=BUNDLE_IDENTIFIER,
    info_plist = {
        'NSHighResolutionCapable':'True',
        'NSSupportsAutomaticGraphicsSwitching':'True',
        'CFBundleURLTypes':
            [{
                'CFBundleURLName': 'ecash',
                'CFBundleURLSchemes': ['ecash'],
            }],
        'NSCameraUsageDescription':
             "Electrum ABC would like to access the camera to scan for QR codes",
        'LSMinimumSystemVersion': '10.14.0',
        'NSRequiresAquaSystemAppearance': 'False',
    },
)
