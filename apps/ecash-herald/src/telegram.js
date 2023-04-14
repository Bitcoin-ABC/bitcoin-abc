// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';

module.exports = {
    prepareStringForTelegramHTML: function (string) {
        /*
        See "HTML Style" at https://core.telegram.org/bots/api

        Replace < with &lt;
        Replace > with &gt;
        Replace & with &amp;
      */
        let tgReadyString = string;
        // need to replace the '&' characters first
        tgReadyString = tgReadyString.replace(/&/g, '&amp;');
        tgReadyString = tgReadyString.replace(/</g, '&lt;');
        tgReadyString = tgReadyString.replace(/>/g, '&gt;');

        return tgReadyString;
    },
};
