// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
export const getStatusValues = data => {
    // function to return a value for a given status
    // Can be used to render any number of things based on the status
    // It takes a data object with keys for status | string, values | object, and allStatuses | array
    // the values object must contain keys for every status from allStatuses

    if (!data.status || !data.values || !data.allStatuses) {
        throw new Error('status, values, and allStatuses must be provided');
    }
    if (
        !data.allStatuses.every(statusValue =>
            Object.keys(data.values).includes(statusValue),
        )
    ) {
        throw new Error(
            `The values object must contain keys for ${data.allStatuses}`,
        );
    }
    return data.values[data.status];
};
