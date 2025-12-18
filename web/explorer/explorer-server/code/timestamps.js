// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

$(document).ready(() => {
    $('.moment__timestamp').each((index, element) => {
        if (!element.dataset.timestamp) {
            return;
        }

        const timestamp = element.dataset.timestamp * 1000;
        const human_timestamp = moment(timestamp).format('L LTS');

        element.innerHTML = `${human_timestamp} <small>(UTC ${tzOffset})</small>`;
    });
});
