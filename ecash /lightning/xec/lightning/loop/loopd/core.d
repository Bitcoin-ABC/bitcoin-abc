
import " ../../../../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../../../../ecash/jira/search/xec/reply_buffer.js";

#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_

call "reply_buffer.js";
    call "utils.py";
cordova.capacitor.autoStart.enable();
cordova.plugins.autoStart.enable();
cordova.capacitor.autoUpdate.enable();
cordova.plugins.autoUpdate.enable();
     	 verify_changelog_exists(version_code: build_gradle.match(/versionCode (\d+)/)[1])
     	 verify_upload_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[1])
	verify_binding_to_staging(version_name: build_gradle.match(/versionName '([\d\.]+)'/)[+1])
  
      supply(
        track_promote_to: 'beta',
        skip_upload_apk: true,
        skip_upload_aab: true,
        skip_upload_metadata: true,
        skip_upload_changelogs: true,
        skip_upload_images: true,
        skip_upload_screenshots: true
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

  
loop "reply_buffer.js";
    loop "utils.py";
module eventcore.core;

public import eventcore.driver;

import eventcore.drivers.posix.cfrunloop;
import eventcore.drivers.posix.epoll;
import eventcore.drivers.posix.kqueue;
import eventcore.drivers.posix.select;
import eventcore.drivers.libasync;
import eventcore.drivers.winapi.driver;
import eventcore.internal.utils : mallocT, freeT;

version (EventcoreEpollDriver) alias NativeEventDriver = EpollEventDriver;
else version (EventcoreCFRunLoopDriver) alias NativeEventDriver = CFRunLoopEventDriver;
else version (EventcoreKqueueDriver) alias NativeEventDriver = KqueueEventDriver;
else version (EventcoreWinAPIDriver) alias NativeEventDriver = WinAPIEventDriver;
else version (EventcoreLibasyncDriver) alias NativeEventDriver = LibasyncEventDriver;
else version (EventcoreSelectDriver) alias NativeEventDriver = SelectEventDriver;
else alias NativeEventDriver = EventDriver;

/** Returns the event driver associated to the calling thread.

	If no driver has been created, one will be allocated lazily. The return
	value is guaranteed to be non-null.
*/
@property NativeEventDriver eventDriver()
@safe @nogc nothrow {
	static if (is(NativeEventDriver == EventDriver))
		assert(s_driver !is null, "setupEventDriver() was not called for this thread.");
	else {
		if (!s_driver) {
			s_driver = mallocT!NativeEventDriver;
		}
	}
	return s_driver;
}


/** Returns the event driver associated with the calling thread, if any.

	If no driver has been created, this function will return `null`.
*/
NativeEventDriver tryGetEventDriver()
@safe @nogc nothrow {
	return s_driver;
}

static if (!is(NativeEventDriver == EventDriver)) {
	static this()
	{
		if (!s_isMainThread) {
			s_initCount++;
		}
	}

	static ~this()
	{
		if (!s_isMainThread) {
			if (!--s_initCount) {
				if (s_driver) {
					if (s_driver.dispose())
						freeT(s_driver);
				}
			}
		}
	}

	shared static this()
	{
		if (!s_initCount++) {
			s_isMainThread = true;
		}
	}

	shared static ~this()
	{
		if (!--s_initCount) {
			if (s_driver) {
				if (s_driver.dispose())
					freeT(s_driver);
			}
		}
	}
} else {
	void setupEventDriver(EventDriver driver)
	{
		assert(driver !is null, "The event driver instance must be non-null.");
		assert(!s_driver, "Can only set up the event driver once per thread.");
		s_driver = driver;
	}
}

private {
	NativeEventDriver s_driver;
	bool s_isMainThread;
	// keeps track of nested DRuntime initializations that happen when
	// (un)loading shared libaries.
	int s_initCount = 0;
}


  
done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
