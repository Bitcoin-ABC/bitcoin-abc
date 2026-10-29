// Copyright (c) 2012-present The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NODE_PROTOCOL_VERSION_H
#define BITCOIN_NODE_PROTOCOL_VERSION_H

//! initial proto version, to be increased after version/verack negotiation
static const int INIT_PROTO_VERSION = 209;

//! Avalanche can poll up to 1024 items per message starting with this version
static const int AVALANCHE_MAX_ELEMENT_BUMP_VERSION = 70017;

//! disconnect from peers older than this proto version
static const int MIN_PEER_PROTO_VERSION = 70016;

//! network protocol versioning
static const int PROTOCOL_VERSION = AVALANCHE_MAX_ELEMENT_BUMP_VERSION;

#endif // BITCOIN_NODE_PROTOCOL_VERSION_H
