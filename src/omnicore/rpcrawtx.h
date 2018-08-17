#ifndef OMNICORE_RPCRAWTX_H
#define OMNICORE_RPCRAWTX_H

#include "rpc/server.h"
#include <univalue.h>

UniValue whc_decodetransaction(const Config &config, const JSONRPCRequest &request);
UniValue whc_createrawtx_opreturn(const Config &config, const JSONRPCRequest &request);
UniValue whc_createrawtx_multisig(const Config &config, const JSONRPCRequest &request);
UniValue whc_createrawtx_input(const Config &config, const JSONRPCRequest &request);
UniValue whc_createrawtx_reference(const Config &config, const JSONRPCRequest &request);
UniValue whc_createrawtx_change(const Config &config, const JSONRPCRequest &request);
UniValue whc_sendrawtransaction(const Config &config, const JSONRPCRequest &request);

#endif // OMNICORE_RPCRAWTX_H
