#ifndef OMNICORE_RPCTX
#define OMNICORE_RPCTX

#include "rpc/server.h"
#include "wallet/wallet.h"
#include <univalue.h>

bool createNewtransaction(CWallet *const pwallet, const std::string &address, Amount nValue, CWalletTx &wtxNew);
UniValue whc_sendrawtx(Config const&, JSONRPCRequest const&);
UniValue whc_send(Config const&, JSONRPCRequest const&);
UniValue whc_particrowsale(Config const&, JSONRPCRequest const&);
UniValue whc_sendall(Config const&, JSONRPCRequest const&);
UniValue whc_senddexsell(Config const&, JSONRPCRequest const&);
UniValue whc_senddexaccept(Config const&, JSONRPCRequest const&);
UniValue whc_sendissuancecrowdsale(Config const&, JSONRPCRequest const&);
UniValue whc_sendissuancefixed(Config const&, JSONRPCRequest const&);
UniValue whc_sendissuancemanaged(Config const&, JSONRPCRequest const&);
UniValue whc_sendsto(Config const&, JSONRPCRequest const&);
UniValue whc_sendgrant(Config const&, JSONRPCRequest const&);
UniValue whc_sendrevoke(Config const&, JSONRPCRequest const&);
UniValue whc_sendclosecrowdsale(Config const&, JSONRPCRequest const&);
UniValue trade_MP(Config const&, JSONRPCRequest const&);
UniValue whc_sendtrade(Config const&, JSONRPCRequest const&);
UniValue whc_sendcanceltradesbyprice(Config const&, JSONRPCRequest const&);
UniValue whc_sendcanceltradesbypair(Config const&, JSONRPCRequest const&);
UniValue whc_sendcancelalltrades(Config const&, JSONRPCRequest const&);
UniValue whc_sendchangeissuer(Config const&, JSONRPCRequest const&);
UniValue whc_sendactivation(Config const&, JSONRPCRequest const&);
UniValue whc_sendalert(Config const&, JSONRPCRequest const&);
UniValue whc_issuanceERC721property(Config const&, JSONRPCRequest const&);
UniValue whc_issuanceERC721Token(Config const&, JSONRPCRequest const&);
UniValue whc_transferERC721Token(Config const&, JSONRPCRequest const&);
UniValue whc_destroyERC721Token(Config const&, JSONRPCRequest const&);

#endif // whcCORE_RPCTX
