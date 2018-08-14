#ifndef OMNICORE_RPCPAYLOAD_H
#define OMNICORE_RPCPAYLOAD_H

#include <univalue.h>
#include "rpc/server.h"

UniValue whc_createpayload_simplesend(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_sendall(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_particrowdsale(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_dexsell(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_dexaccept(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_sto(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_issuancefixed(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_issuancecrowdsale(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_issuancemanaged(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_closecrowdsale(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_grant(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_revoke(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_changeissuer(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_trade(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_canceltradesbyprice(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_canceltradesbypair(const Config &config,const JSONRPCRequest &request);
UniValue omni_createpayload_cancelalltrades(const Config &config,const JSONRPCRequest &request);
UniValue whc_createpayload_burnbch(const Config &config,const JSONRPCRequest &request);

#endif // OMNICORE_RPCPAYLOAD_H
