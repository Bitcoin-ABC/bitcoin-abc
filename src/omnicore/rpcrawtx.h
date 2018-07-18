#ifndef OMNICORE_RPCRAWTX_H
#define OMNICORE_RPCRAWTX_H

#include <univalue.h>

UniValue whc_decodetransaction(const UniValue& params, bool fHelp);
UniValue whc_createrawtx_opreturn(const UniValue& params, bool fHelp);
UniValue whc_createrawtx_multisig(const UniValue& params, bool fHelp);
UniValue whc_createrawtx_input(const UniValue& params, bool fHelp);
UniValue whc_createrawtx_reference(const UniValue& params, bool fHelp);
UniValue whc_createrawtx_change(const UniValue& params, bool fHelp);


#endif // OMNICORE_RPCRAWTX_H