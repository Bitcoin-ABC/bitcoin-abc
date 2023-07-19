# Electrum ABC Update Checker
### (`releases.json`)

This directory contains the `releases.json` file that the Electrum ABC update checker uses to determine when a new version of the application is available.

#### Update Checker Overview
There is an update-checking facility built-in to the Qt desktop app. The facility basically functions as follows:

1. When the user selects "Check for updates...", Electrum ABC connects to the URL hard-coded as `RELEASES_JSON_URL`
   in `electrumabc/constants.py` (currently: https://raw.github.com/Bitcoin-ABC/bitcoin-abc/master/electrum/contrib/update_checker/releases.json)
2. It downloads `releases.json` (the file in this directory)
3. It checks the versions seen in `releases.json` -- if they are newer than the version in the running app, and if the signed message is valid and is signed with one of the addresses hard-coded in `update_checker.py`, it then informs the user that an update is available.

*No automatic updating is performed* and the user must manually click on the URL hard-coded in the app to go to the release page.

The purpose of this facility is merely as a convenience for users who aren't on reddit or aren't constantly refreshing our website to be able to find out when a new version is available.

It hopefully will decrease the number of users running very old versions of Electrum ABC.

#### What This Means For You, The Maintainer
You need to update `releases.json` in this directory whenever a new version is released, and push it to master.

This file contains a dictionary of:
```json
    {
        "version string" : { "bitcoin address" : "signed message" }
    }
```
- **"version string"** above is a version of the form MAJOR.MINOR.REV[variant], e.g. "3.3.5" or "3.3.5CS" (in the latter, 'CS' is the variant)
- And empty/omitted variant means "Electrum ABC Regular"
- The variant must match the variant in `electrumabc/version.py`.


#### How To Update `releases.json`

  1. Release Electrum ABC as normal, updating the version in `electrumabc/version.py`.
  2. After release, or in tandem with releasing, edit `releases.json`
  3. Make sure to replace the entry for the old version with a new entry.
  4. So for example if you were on version "3.3.4" before and you are now releasing "3.3.5", look for "3.3.4" in `releases.json`, and update it to "3.3.5"
  5. Sign the text "3.3.5" with one of the bitcoin addresses listed in `electrumabc_gui/qt/update_checker.py`.  Paste this address and the signed message (replacing the old address and signed message) into the dictionary entry for "3.3.5" in `releases.json`.
  6. Push the new commit with the updated `releases.json` to master. (Since currently the `update_checker.py` code looks for this file in master on github).

##### Example
*The old entry:*

     "3.3.4": {
     	"bitcoincash:qphax4cg8sxuc0qnzk6sx25939ma7y877uz04s2z82": "G8lW9Wh2/sa2I7Sd0jdAlit+lYwrXFwjG7ZDUEDngSwyPAT29YMKP68hqeaW7+mp4gClY1+qPIAQsFqzPtoMbTw="
     }

*Gets replaced with:*

    "3.3.5": {
     	"bitcoincash:qphax4cg8sxuc0qnzk6sx25939ma7y877uz04s2z82": "HPC+QnKXdxW/V6qeVFGjYKeP9YQ6DL16Y1SQznavG/G7FUEpMK1wnkAj5yO/RW440mvXxds1PpS35RaEMtvbgJw="
     }

Notice how the version string is different, the signing address happened to remain the same, and, of course, the signature is different now.

##### How Do I Sign?

- Make sure you control one of the bitcoin addresses listed in `electrumabc_gui/qt/update_checker.py`.  (If you do not, modify this file before release to include one of your addresses!)
-  Open up Electrum ABC and go to that address in the "Addresses" tab and right click on it, selecting **"Sign/Verify Message"**
-  The message to be signed is the version string you will put into the JSON, so for example the simple string `3.3.5` in the example above.
-  Hit **sign**, and paste the signature text into the JSON (and signing address, of course, if it's changed).

##### How do I test the signature

Before pushing the commit to the remote repository, it is possible to test locally that a signature is correct.
For this, run the application from sources with the `--test-release-notification` command line option.

```shell
./electrum-abc -v --test-release-notification
```

To trigger the version check manually, go to the *Help* menu and click *Check for updates*.
