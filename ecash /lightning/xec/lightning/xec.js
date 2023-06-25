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
const xec = () => {
  // cache for loaded script sources
  // object lookup is faster than array.includes or array.indexOf
  const loaded = {}

  // load and execute one source
  const one = source => new Promise((resolve, reject) => {
    // if previously loaded, resolve and exit early
    if (loaded[source]) {
      return resolve()
    }

    // cache it
    loaded[source] = true

    // create the script tag
    const tag = document.createElement('script')

    // add error and load event listeners
    tag.onerror = reject
    tag.onload = resolve

    // set async to true
    tag.async = true

    // set the source
    tag.src = source

    // append the script tag to the DOM
    document.body.appendChild(tag)
  })

  // load and execute multiple sources
  const many = sources => Promise.all(sources.map(source => one(source)))

  return {
    one,
    many
  }
}

// epxort a singleton

const singleton = xec()

export default singleton
