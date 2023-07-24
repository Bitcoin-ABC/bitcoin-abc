# Release notes

## Release 5.2.6

- Increase the maximum number of concurrent get_merkle network requests to speed
  up the initial verification of the transaction history for wallets with a
  large history (D14123).
- Write unencrypted wallet files using compact JSON. This reduces the file size
  by about 20% and increases the speed of the operation by about 100% (D14234).
- Use faster compression settings when saving encrypted wallets to increase the
  speed of the operation by about 80% (D14235).
- Significantly improve the speed of building transactions in wallets with many
  coins per address. This reduces GUI freezing when interacting with the "Send"
  tab for such wallets (D14249).
- Improve the functional tests (D14273, D14274, D14276, D14278, D14293).
- Improve the developer documentation (D14142, D14259, D14285).
- Electron Cash backport:
  - Fix the QR code scanner for the Linux AppImage release (D14284)


## Release 5.2.5

- Fix a bug breaking the application when installed with the Windows installer.
- Remove option to run the application from the command line on Windows with the
  released binary when using the default Windows terminal. Users can still use the
  command line on Windows with more advanced terminal application (e.g. Git Bash)
  or by running the application from sources.
- Add a test_runner.py script.


## Release 5.2.4

- Fix integer overflow for displaying the amount for selected coins (#291).
- Fix a bug when loading an wallet file containing CashAccount contacts (#295).
- Fix bug preventing to freeze or unfreeze multiple coins at once (#297).
- Allow preserving the order of outputs in a transaction when it has an
  OP_RETURN output, for advanced use cases such as manually building SLP
  transactions (#298).
- Code and build toolchain cleanup (#292, #293, #294, #299).


## Release 5.2.3

- Fix `--portable` command line option (#288).
- Add cryptocompare.com as an exchange rate API (#284).
- Don't bundle Tor with the binary release files, download it when
  a user first enables Tor (#279).
- Electrum backports: bump pyinstaller, misc (#280).


## Release 5.2.2

- Fix support for transaction `version=2` on hardware wallets (#275).


## Release 5.2.1

- Set `version=2` for transactions (#267).
- Set `locktime=0` for transactions (#269).
- Randomize transaction inputs and outputs (#272).
- Fix plugin selection dialog broken by renaming of python packages
  in the previous release (#266).
- Fix disabling of block height selection in the address consolidation
  tool for testnet (#270).
- Hardcode the ASERT DAA anchor for testnet to fix a regression affecting
  users who don't already have all necessary pre-checkpoint headers (#271).


## Release 5.2.0

- Show selected amount in the status bar when selecting coins or addresses (#256).
- Remove support for Cash Accounts (#250).
- Improve error messages for `enable_autofuse` and `fusion_status` commands (#253).
- Electrum ABC no longer automatically imports Electron Cash wallets and
  configuration on first execution (#258).
- Rename python packages (`electrumabc`, `electrumabc_gui`, `electrumabc_plugins`).
  This will break external plugins and code using Electrum ABC as a library (#260).
- Rename classes to PEP 8 standard, e.g. `Standard_Wallet` -> `StandardWallet` (#265).
- Various updates for build scripts (#257).
- Much linting and code formatting. `flake8`, `ISort` and `Black` are now applied to
  the entire Python codebase (#251, #255, #262).


## Release 5.1.6

- Fix exporting coin details for imported private key wallets and imported
  address wallets (#239).
- Improve UI for generating auxiliary keys for avalanche proofs and delegations (#240).
- Format amounts in the list of stakes in the avalanche proof editor (#241).
- Enable adding stakes from the current wallet in the avalanche proof editor (#243).
- Electron Cash and Electrum backports:
  - Add `freeze_utxo`, `unfreeze_utxo` and `list_wallets` RPCs.
  - Replace `status` daemon command with `getinfo` RPC.
  - Turn `load_wallet` and `close_wallet` daemon commands into RPCs.


## Release 5.1.5

- Change default block explorer to explorer.e.cash (#231).
- Automatically derive new keys and addresses beyond the gap limit as needed when
  signing stakes in an offline wallet (#232).
- Make the Proof Editor window non-modal (#233).
- Bugfix: update the payout address when loading a Proof in the Proof Editor (#234).
- Electron Cash backport:
  - Fix text alignment in address list (Electron-Cash#2477).


## Release 5.1.4

- Improvements to the invoice tool (#224):
  - Make the dialog non-modal.
  - Suggest a default filename when saving invoice.
  - Show a corresponding fiat amount when entering an XEC amount.
  - Add additional fields to the invoice: invoice id, recipient address, sender address.
- Improvements to the Avalanche Proof editor (#229):
  - Save proof to a file.
  - Load proof from an hexadecimal string or a file, decode and view proofs.
  - Enable collaborative proof building:
    - signing stakes from a different wallet than the master wallet signing the proof;
    - adding more signed stakes to an existing proof, from multiple staking wallets.
  - Fix a bug in the coin consolidation tool when the user sets the target transaction
    size to the absolute maximum allowed size (#226).
- Fix a bug when running the `enable_autofuse` or `fusion_status` daemon commands
  in a terminal session different from the `daemon start` session (#223).
- Electron Cash backports (#230):
  - Update Tor to version 0.4.7.10 with a patch for static linking.
  - Update wine docker to ubuntu 22.04.


## Release 5.1.3

- Add daemon commands `enable_autofuse` and `fusion_status` to run Cash Fusion
  in command line mode (#219).
- Fix unit for amounts in the output of the `history` command (#220).
- Warn users about insufficient numbers of confirmations when using a UTXO to build
  an avalanche proof (#221).
- Electron Cash backports:
  - Update Tor to version 0.4.7.8 with a patch for static linking.


## Release 5.1.2

- Update the payment request protocol MIME types (BIP71)  (#213).
- Change command line usage to enforce specifying global options before command name (#215).
- Improve the error message when the BCH app is not open on a ledger device (#216).
- Fix a bug breaking support of encrypted hardware wallets (#218).
- Use the ripemd160 implementation from the `pycryptodome` library preferably to the python
  fallback implementation when the `hashlib` / OpenSSL implementation is not available.


## Release 5.1.1

- Use a fallback ripemd160 implementation to compute addresses when OpenSSL does
  not have ripemd160, which is no longer available by default in OpenSSL 3.0 (#200).
- Fix the pay-to-many feature, broken since Electrum ABC 5.0.4 (#202).
- Add a tool for users to generate a deterministic delegated private key (#203).
- Fix an error when showing the password dialog before exporting BIP38 keys (#205).
- Automatically prefill the delegator key when adding a delegation level if the
  key is owned by the wallet (#206).
- Add a wallet menu to show the auxiliary keys used for avalanche keys (#206).
- Fix the udev installer tool, broken in Electrum ABC 5.1.0 (#208).
- Add a tool to create, edit and pay invoices, with support for XEC amounts and
  other currencies. The invoice creator can define a fixed exchange rate or specify
  an API url for the payer to fetch the exchange rate at payment time (#209).
- Improve the text contrast in the amount widgets when using the dark theme (#210).
- Electron Cash backports:
  - Improvements to build scripts.
  - Sort same block transactions to show received funds before spent funds, and thus
    avoid displaying intermediate negative balances (#204).


## Release 5.1.0

- Add tools to build avalanche proofs and avalanche proof delegations (#88).
- Fix scanning QR code with a webcam, broken in release 5.0.4 (#179).
- Fix Trezor hardware wallet support, broken in the MacOS release for 5.0.4 (#187).
- Improve the instructions on the first page of the wallet creation wizard.
- Electron Cash backport:
  - Stop monitoring unused change addresses to speed up wallets with a large
    transaction history, such as wallets using CashFusion. The default setting
    is to retire addresses with index < 1000 from the latest index, if they
    have a trivial history of 2 transactions (1 in, 1 out). This can be disabled
    or adjusted in the Transactions settings.
- Electrum backport:
  - Fix display issues on high dpi screens by making the width of some input
    widgets depend on the size of a text character.


## Release 5.0.4

- Improve documentation on how to check gpg signatures for release files (#156, #157).
- Fix bugs for coin consolidation tool (#160).
- Make the amount widget wider to support large amounts (#161).
- Use the eCash BIP44 derivation path as a default when user creates a new wallet using
  a Satochip device (#164).
- Fix an intermittent bug when selecting a HW device in the wallet creation wizard (#170).
- Add a setting to the message verification tool to optionally support the legacy
  Bitcoin signed messages (#174).
- Electron Cash backports:
  - Fix Python 3.10 compatibility.
  - Fix off-by-one error and BIP62 compliance for push opcodes, to ensure standard
    transactions are generated by external plugins and external client code.


## Release 5.0.3

- Add a coin consolidation tool to reduce the number of UTXOs for a single address (#142).
- Improve the support for Satochip hardware wallets (#143):
  - use BIP39 seeds by default
  - fix the message signature and verification tool to produce proper eCash signed message
  - support label and card authenticity features
- Allow encrypting watch-only wallets and hardware wallets (#150).
- Add a tool to sign or broadcast multiple transactions from files (#152).
- Use the "m/44'/1'/0'" BIP44 derivation path by default in testnet mode (#153).
- Set up automatic code formatting and quality control tools (#141).
- Add a checkpoint to the first block after the November 15th, 2021 upgrade (#155).


## Release 5.0.2

- Fix support for the `ectest:` address prefix and the `--testnet` command-line option.
- Change the message signature prefix to "eCash Signed Message:" (previously was "Bitcoin Signed Message:").
- Lower the default transaction fee from 5 satoshis/byte to 2 satoshis/byte.
- Links `ecash:` URI's to Electrum ABC on Windows and Mac OS.
- Use `ecash:` addresses (without prefix) in URL for BlockChair's explorer.
- Don't encourage users to open issues on Electrum ABC's GitHub repo when errors happen in external plugin code.
- Remove mentions of "Bitcoin Cash addresses" in the wallet creation wizard.
- Electron Cash backports:
  - Option to spend only fused coins on the spend tab
  - Updates for build scripts.


## Release 5.0.1

- Fix the missing thousands separator when formatting amounts on Mac OS and Windows.
- Update the API for block explorers after the rebranding. Most block explorers now use the "ecash:" prefix for
  addresses. Some explorer changed their URLs.
- Fix an issue with the transaction details dialog splitting addresses and amounts over two lines when the "ecash:"
  prefix is shown in the address.
- Add CoinGecko's new eCash exchange rate for fiat amount conversion. The legacy BCHA exchange rate API is still
  supported because the new one does not provide historical data prior to July 2021.
- Add explorer.be.cash to the list of supported block explorers.
- Set explorer.bitcoinabc.org as the default block explorer.
- Electron Cash backports:
  - Increase CashFusion transaction fees for high tiers (https://github.com/Electron-Cash/Electron-Cash/pull/1984)


## Release 5.0.0

- Rebranding from BCHA to eCash (XEC).
- Change base unit from BCHA (100 000 000 satoshis) to XEC (100 satoshis).
- Change CashAddr prefix from "bitcoincash:" to "ecash:".
- Make the address conversion tool display 3 results: eCash address,
  BCH address and Legacy Bitcoin address.
- Interpret amounts as XEC in BIP21 payment URIs. Generate payment URIs and
  QR codes with amounts in XEC.
- Add a scanner for usual eCash, BCH or BTC derivation paths to assist users
  when restoring a wallet from seed (feature backported from Electron Cash).


## Release 4.3.3

- Support restoring wallets from BIP39 word lists in other languages than
  english. New seeds phrases are still generated in english, because most
  other wallets only support english.
- Use the new derivation path `m/44'/899'/0` by default when creating or
  restoring a wallet. This is a pre-filled parameter that can be modified
  by the user. The BCH and BTC derivations paths are shown in a help
  message for users who wish to restore pre-fork wallets.
- Prefer sending confirmed coins when sending a transaction. Unconfirmed coins
  can still be used when necessary or when they are manually selected.
- Display a warning when sending funds to a legacy BTC address.
- Update some default configuration parameters the first time the user runs
  a new version of Electrum ABC (default fee, default CashFusion server).
- Display localized amounts with thousands separators to improve readability
  when switching the unit to mBCHA or bits.
- Always show the prefix when displaying a CashAddr in the user interface.
  This will prevent confusion when the prefix is changed, in the future.
- Support arbitrary CashAddr prefixes for the address conversion tool.
- Improvements to the Satochip plugin:
  - use BIP39 seeds by default instead of electrum seeds.
  - 2FA config is removed from initial setup, and can be activated from the
    option menu instead (clicking on the Satochip logo on the lower right
    corner).
  - PIN can have a maximum length of 16, not 64.
- Add a menu action in the Coins tab to export data for selected UTXOs to a
  JSON file.
- Use satoshis as a unit for amounts when generating payment URIs and QR codes.
  This aligns Electrum ABC with CashTab, Stamp and Cashew.
- Lower the default transaction fee from 10 satoshis/byte to 5 satoshis/byte.
- Minor performance improvements when freezing coins and saving wallet files.


## Release 4.3.2

- Decrease the default transaction fee from 80 satoshis/byte to 10 sats/byte
- Add an option in the 'Pay to' context menu to scan the current screen
  for a QR code.
- Add a documentation page "Contributing to Electrum ABC".
- Remove the deprecated CashShuffle plugin.
- Specify a default server for CashFusion.
- Fix a bug introduced in 4.3.1 when starting the program from the source
  package when the `secp256k1` library is not available. This bug did not
  affect the released binary files.
- Fix a bug related to the initial automatic copy of wallets from the
  Electron Cash data directory on Windows. The configuration paths were not
  changed accordingly, causing new wallets to be automatically saved in the
  Electron Cash directory.


## Release 4.3.1

- Fixed a bug happening when clicking on a server in the network overview
  dialog.
- Enable the fiat display again, using CoinGecko's price for BCHA.
- Add a checkpoint to ensure only BCHA servers can be used. When splitting
  coins, it is now recommended to run both Electrum ABC and Electron Cash.
- Improve the automatic importing of wallets and user settings from
  Electron Cash, for new users: clear fiat historic exchange rates to avoid
  displaying BCH prices for pre-fork transactions, clear the server blacklist
  and whitelist, copy also testnet wallets and settings.
- When creating a new wallet, always save the file in the standard user
  directory. Previously, wallets were saved in the same directory as the
  most recently opened wallet.
- Change the crash report window to redirect users to github in their
  web browser, with a pre-filled issue ready to be submitted.
- Fix a bug when attempting to interact with a Trezor T hardware wallet
  with the autolock feature enabled, when the device is locked.


## Release 4.3.0

 The first release is based on the
Electron Cash 4.2.0 codebase with the following changes

- updated list of electrum servers
- updated icons and branding
- use different directory for wallets and configuration
- automatically import wallets and some configuration files from Electron Cash
