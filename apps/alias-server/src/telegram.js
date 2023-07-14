// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

'use strict';
const aliasConstants = require('../constants/alias');
const { getXecPrice, satsToFormattedValue, getAliasPrice } = require('./utils');

module.exports = {
    /**
     *
     * @param {object} aliasObject {address, alias, blockheight, txid}
     * @param {number or bool} xecPrice number if API call was successful, otherwise false
     * @returns {string} a string formatted for HTML-parsed Telegram message
     */
    buildAliasTgMsg: function (aliasObject, xecPrice) {
        const { address, alias, txid, blockheight } = aliasObject;

        const displayedAliasPrice = satsToFormattedValue(
            getAliasPrice(aliasConstants.prices, alias.length, blockheight)
                .registrationFeeSats,
            xecPrice,
        );

        // Define block explorer
        const blockExplorer = 'https://explorer.e.cash';

        // Return the msg string
        const startSliceBeginning = 6; // 'ecash:'.length
        const displayedCharacters = 3;
        return `alias "${alias}" <a href="${blockExplorer}/tx/${txid}">registered</a> to <a href="${blockExplorer}/address/${address}">${address.slice(
            startSliceBeginning,
            startSliceBeginning + displayedCharacters,
        )}...${address.slice(
            -displayedCharacters,
        )}</a> for ${displayedAliasPrice}`;
    },
    /**
     * Use Promise.all() to async send telegram msg of all alias announcements
     * @param {object or null} telegramBot an active, polling telegram bot
     * @param {string} channelId telegram channel or chat where bot is an admin
     * @param {array} newAliasRegistrations Array of alias objects [{alias, address, txid, blockheight}...]
     * @returns {promise} Promise.all() for async sending of all registered aliases in this block
     * @returns {undefined} If telegramBot is null, the function does nothing
     */
    sendAliasAnnouncements: async function (
        telegramBot,
        channelId,
        newAliasRegistrations,
    ) {
        // If telegramBot is null, do nothing
        if (telegramBot === null) {
            return;
        }
        // Get eCash price
        const xecPrice = await getXecPrice();
        // Build an array of promises to send each registration announcement
        const aliasAnnouncementPromises = [];
        for (let i in newAliasRegistrations) {
            // Build the tg msg
            const aliasTgMsg = module.exports.buildAliasTgMsg(
                newAliasRegistrations[i],
                xecPrice,
            );

            // Add a promise to send the msg to aliasAnnouncementPromises array
            aliasAnnouncementPromises.push(
                new Promise(resolve => {
                    telegramBot
                        .sendMessage(channelId, aliasTgMsg, {
                            parse_mode: 'HTML',
                            // disable_web_page_preview: true prevents link preview for the block explorer, which dominates the msg
                            disable_web_page_preview: true,
                        })
                        .then(
                            result => {
                                resolve(result);
                            },
                            err => {
                                // Don't log the actual error as telegram bot errors are very long and the issue
                                // is typically deducible in testing
                                console.log(
                                    `Error sending alias announcement for ${newAliasRegistrations[i].alias}`,
                                );
                                // You don't want to throw this error, so resolve() instead of reject()
                                resolve(err);
                            },
                        );
                }),
            );
        }

        // Do not await as
        // (1) you don't really care if any of these fail
        // (2) the next block can't process until this function completes, which would be
        //     delayed for no important reason by an await
        return Promise.all(aliasAnnouncementPromises);
    },
};
