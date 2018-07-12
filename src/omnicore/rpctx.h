#ifndef OMNICORE_RPCTX
#define OMNICORE_RPCTX

#include "rpc/server.h"
#include <univalue.h>

UniValue omni_sendrawtx(Config const&, JSONRPCRequest const&);
UniValue omni_send(Config const&, JSONRPCRequest const&);
UniValue omni_sendall(Config const&, JSONRPCRequest const&);
UniValue omni_senddexsell(Config const&, JSONRPCRequest const&);
UniValue omni_senddexaccept(Config const&, JSONRPCRequest const&);
UniValue omni_sendissuancecrowdsale(Config const&, JSONRPCRequest const&);
UniValue omni_sendissuancefixed(Config const&, JSONRPCRequest const&);
UniValue omni_sendissuancemanaged(Config const&, JSONRPCRequest const&);
UniValue omni_sendsto(Config const&, JSONRPCRequest const&);
UniValue omni_sendgrant(Config const&, JSONRPCRequest const&);
UniValue omni_sendrevoke(Config const&, JSONRPCRequest const&);
UniValue omni_sendclosecrowdsale(Config const&, JSONRPCRequest const&);
UniValue trade_MP(Config const&, JSONRPCRequest const&);
UniValue omni_sendtrade(Config const&, JSONRPCRequest const&);
UniValue omni_sendcanceltradesbyprice(Config const&, JSONRPCRequest const&);
UniValue omni_sendcanceltradesbypair(Config const&, JSONRPCRequest const&);
UniValue omni_sendcancelalltrades(Config const&, JSONRPCRequest const&);
UniValue omni_sendchangeissuer(Config const&, JSONRPCRequest const&);
UniValue omni_sendactivation(Config const&, JSONRPCRequest const&);
UniValue omni_sendalert(Config const&, JSONRPCRequest const&);

#endif // OMNICORE_RPCTX
