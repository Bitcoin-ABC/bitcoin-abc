// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Well-known destination addresses shown with a friendly name on Send
 * when pasted, scanned, or loaded from a deep link / extension tx.
 */
export const BLITZ_CHIPS_GAME_ADDRESS =
    'ecash:qqkczljwm2wnyld7lm9x5hjkev2z65mqdcz6544y9c';

export const EVERY_DAY_JACKPOT_GAME_ADDRESS =
    'ecash:qzqcq9p5lxa3jhc5lhwaefua9cjfhfjvcvsj887fg5';

/** address → display name for known public destinations */
export const KNOWN_RECIPIENT_NAMES: Record<string, string> = {
    [BLITZ_CHIPS_GAME_ADDRESS]: 'BlitzChips',
    [EVERY_DAY_JACKPOT_GAME_ADDRESS]: 'EveryDayJackpot',
};
