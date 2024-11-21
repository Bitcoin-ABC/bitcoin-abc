/**
 * @license
 * https://reviews.bitcoinabc.org
 * Copyright (c) 2017-2020 Emilio Almansi
 * Copyright (c) 2023 Bitcoin ABC
 * Distributed under the MIT software license, see the accompanying
 * file LICENSE or http://www.opensource.org/licenses/mit-license.php.
 */

/**
 * Validation utility.
 *
 * @module validation
 */

/**
 * Error thrown when encoding or decoding fail due to invalid input.
 *
 * @constructor ValidationError
 * @param {string} message Error description.
 */
class ValidationError extends Error {
    constructor(message: string) {
        super(message); // Call the parent constructor
        this.name = 'ValidationError'; // Set the error name
        // If targeting ES5 or earlier, need to set this manually for subclassing to work
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Validates a given condition, throwing a {@link ValidationError} if
 * the given condition does not hold.
 *
 * @static
 * @param condition Condition to validate.
 * @param message Error message in case the condition does not hold.
 */
function validate(condition: boolean, message: string) {
    if (!condition) {
        throw new ValidationError(message);
    }
}

export default {
    ValidationError: ValidationError,
    validate: validate,
};
