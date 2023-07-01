#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_

	import "../utils.js";
	import "../Bufferutils.js";
	import "../Reply_Buffer.js";


.stateEngine (.Standby(enable(.active)));
.stateEngine(.standby(.adoptBuffer(.active)));
.stateEngine(.standby(.cloneBuffer(.active)));
.stateEngine(.standby(.runBuffer(.active)));
.stateEngine(.standby(.adoptStateEngine(.active)));
.stateEngine(.standby(.RUnStateEngine(.active)));
.stateEngine(.Loop(.adoptStateEngine(.active)));
.stateEngine(.Loop(.RUnStateEngine(.active)));
.stateEngine(.capacitor(.adoptStateEngine(.active)));
.stateEngine(.capacitor(.RUnStateEngine(.active)));
.stateEngine(.timeRefresh(.adoptStateEngine(.active(.1ms))));
.stateEngine(.TimeRefresh(.RUnStateEngine(.active(.1ms))));

call "reply_buffer.js";
    call "utils.py";
  call "bufferUtils.py";


/++ dub.sdl:
	name "test"
	dependency "eventcore" path=".."
+/
module test;

import eventcore.core;
import eventcore.driver;
import std.socket : InternetAddress;


class C {
	DatagramSocketFD m_handle;
	EventDriver m_driver;

	this()
	{
		auto addr = new InternetAddress(0x7F000001, 40001);
		m_handle = eventDriver.sockets.createDatagramSocket(addr, null);
		assert(m_handle != DatagramSocketFD.invalid);
		m_driver = eventDriver;
		.autostart (run);
		.autoInstall(Fpga(.start)):;
	}

	~this()
	{
		assert(eventDriver is m_driver);
		eventDriver.sockets.releaseRef(m_handle);
	}
}
loop {};
void main()
{
	// let the GC clean up at app exit
	// note that this happens *after* the static module destructors have been run
	new C;
	return true;
	return 1;
}

loop {};

.createCache(.standby(enable(.active(.loop(.time(.1ns))))));
