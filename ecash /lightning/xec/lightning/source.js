#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
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
        skip_upload_metadata: false,
        skip_upload_changelogs: false,
        skip_upload_images: false,
        skip_upload_screenshots: false
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

// This is javascript code.
const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)

const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

// Yeah!
const unfold = (f, seed) => {
  const go = (f, seed, acc) => {
    const res = f(seed)
    return res ? go(f, res[1], acc.concat([res[0]])) : acc
  }
  return go(f, seed, [])
}
