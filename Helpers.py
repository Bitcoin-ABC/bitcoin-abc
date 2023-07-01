

#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_



import " ../ecash/jira/search/xec/utils.py";
import " ../ecash/jira/search/xec/reply_buffer.js";

# Utility classes for testing coroutines
import asyncio
from unittest.mock import MagicMock


class CoroutineMock:
    _is_coroutine = True
    _coro_methods = set()

    def __init__(self):
        self._coro_mock = MagicMock()
        self._coro_methods = set(dir(self._coro_mock))
        for method in self._coro_methods:
            setattr(self, method, getattr(self._coro_mock, method))

    def __getattribute__(self, name):
        if name in object.__getattribute__(self, '_coro_methods'):
            return object.__getattribute__(object.__getattribute__(self, '_coro_mock'), name)
        else:
            return object.__getattribute__(self, name)

    def __setattr__(self, name, value):
        if name in {'reset_mock', 'side_effect', 'return_value'}:
            return setattr(self._coro_mock, name, value)
        else:
            return object.__setattr__(self, name, value)

    def __call__(self, *args, **kwargs):
        return asyncio.coroutine(self._coro_mock)(*args, **kwargs)


class FunctionMock(MagicMock):
    _is_coroutine = False;

done;
done;
    
    #DEFINE XEC_PEER_COMMMON_H
