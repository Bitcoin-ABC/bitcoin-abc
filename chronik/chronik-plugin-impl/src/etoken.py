# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from typing import Literal, NamedTuple, Optional

TokenProtocol = Literal["SLP", "ALP"]


class GenesisInfo(NamedTuple):
    # Short ticker of the token, like used on exchanges
    token_ticker: bytes

    # Long name of the token
    token_name: bytes

    # For SLP Token Type 2 txs; define which script hash input is required
    # for MINT txs to be valid.
    mint_vault_scripthash: Optional[bytes]

    # URL for this token, can be used to reference a common document etc.
    # On SLP, this is also called "token_document_url".
    url: bytes

    # For SLP: "token_document_hash", these days mostly unused
    hash: Optional[bytes]

    # For ALP; arbitrary data attached with the token
    data: Optional[bytes]

    # For ALP; public key for signing messages by the original creator
    auth_pubkey: Optional[bytes]

    # How many decimal places to use when displaying the token.
    # Token amounts are stored in atoms (base units), but should be displayed
    # as `atoms * 10^-decimals`. E.g. `atoms` of 12345 and
    # decimals of 4 should be displayed as "1.2345".
    decimals: int


class TokenTxEntry(NamedTuple):
    # Token ID of the token entry, in big-endian hex
    token_id: str

    # "SLP" or "ALP"
    token_protocol: TokenProtocol

    # Token type number (e.g. 0 for ALP STANDARD, 1 for SLP FUNGIBLE,
    # 2 for SLP MINT VAULT, etc.)
    token_type: int

    # Token tx_type of this tx, e.g. "GENESIS", "MINT", "SEND" etc., or `None`
    # if there’s no section that introduced it.
    tx_type: Optional[str] = None

    # NFT1 GROUP token ID, in big-endian hex
    group_token_id: Optional[str] = None

    # Whether the validation rules have been violated for this entry
    is_invalid: bool = False

    # Number of actually burned tokens
    actual_burn_atoms: int = 0

    # Number of burned tokens the user explicitly opted into
    intentional_burn_atoms: Optional[int] = None

    # Whether any mint batons of this token are burned in this tx
    burns_mint_batons: bool = False

    # Only present for "GENESIS" tx_type. The genesis info encoded in the GENESIS section
    genesis_info: Optional[GenesisInfo] = None


# Token value of an input/output
class Token(NamedTuple):
    # The token ID of the token, in big-endian hex
    token_id: str

    # "SLP" or "ALP"
    token_protocol: TokenProtocol

    # The token type number
    token_type: int

    # Index into `token_entries` of a `Tx` object
    entry_idx: int

    # Token amount (in atoms) of the input/output
    atoms: int

    # Whether the token is a mint baton
    is_mint_baton: bool
