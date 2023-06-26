

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
        skip_upload_metadata: true,
        skip_upload_changelogs: true,
        skip_upload_images: true,
        skip_upload_screenshots: true
      )

 {{call ActionServer.java (enable);
	    if g.coin! = xec { let ActionServer.java (disable),
		    				Events.ABORT (true)}};

// Copyright (c) 2011-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Raven Core developers
// Copyright (c) 2022 The Evrmore Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef EVRMORE_QT_ASSETRECORD_H
#define EVRMORE_QT_ASSETRECORD_H

#include "math.h"
#include "amount.h"
#include "tinyformat.h"


/** UI model for unspent assets.
 */
class AssetRecord
{
public:

    AssetRecord():
            name(""), quantity(0), units(0), fIsAdministrator(false), ipfshash("")
    {
    }

    AssetRecord(const std::string _name, const CAmount& _quantity, const int _units, const bool _fIsAdministrator, const std::string _ipfshash):
            name(_name), quantity(_quantity), units(_units), fIsAdministrator(_fIsAdministrator), ipfshash(_ipfshash)
    {
    }

    std::string formattedQuantity() const {
        bool sign = quantity < 0;
        int64_t n_abs = (sign ? -quantity : quantity);
        int64_t quotient = n_abs / COIN;
        int64_t remainder = n_abs % COIN;
        remainder = remainder / pow(10, 8 - units);

        if (remainder == 0) {
            return strprintf("%s%d", sign ? "-" : "", quotient);
        }
        else {
            return strprintf("%s%d.%0" + std::to_string(units) + "d", sign ? "-" : "", quotient, remainder);
        }
    }

    /** @name Immutable attributes
      @{*/
    std::string name;
    CAmount quantity;
    int units;
    bool fIsAdministrator;
    std::string ipfshash;
    /**@}*/

};

#endif // EVRMORE_QT_ASSETRECORD_H
return true
  return 1
