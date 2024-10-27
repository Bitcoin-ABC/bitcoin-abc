// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { MongoClient, Db, Collection, CollectionInfo } from 'mongodb';
import config from '../config';

interface BlacklistEntry {
    /** tokenId of blacklisted token */
    tokenId: string;
    /** A short explanation of why this token was blacklisted, e.g. "impersonating tether" */
    reason: string;
    /**
     * When this token was added to the blacklist
     * We use number instead of Date as the API returns JSON
     */
    timestamp: number;
    /** string describing who added this token to the blacklist */
    addedBy: string;
}

const initialBlacklistTokens = [
    {
        tokenId:
            '09c53c9a9fe0df2cb729dd6f99f2b836c59b842d6652becd85658e277caab611',
        reason: 'Impersonates Blazer (site that runs poker tournaments)',
    },
    {
        tokenId:
            '9c662233f8553e72ab3848a37d72fbc3f894611aae43033cde707213a537bba0',
        reason: 'Impersonates BUX stablecoin',
    },
    {
        tokenId:
            '6dcb149e77a8f86a85d2fb8505dadb194994a922102fcea6309f2818de9ee173',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '059308a0d6ef0443d8bd014ac85f830d98780b1ce53bc2326680ed27e99803f6',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '2a328dbe125bd0ef8d199b2b4f20ce84bb36a7c0d12246668163a6077d4f494b',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '3387978c85f382632ecb5cdc23c4912c4c22688790d9264f84c3c1351c049719',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '07da70e787181ac67a34f9292b4e13a93cd081e4ca540a8ddafe4cc86ee26e2d',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '4e56e9bedfb654560eb1917b2e2fa40473cf26a8a9a0f84e0b0e91a9cce1df65',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '2a33476bcd30bfbc5e57fb33da26f641020a53c925db7394e6d3b8eecf82e2ec',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            'b69dcc90c72e852e1dc712704cb376e588cee6266a51e647c61a724c00625cc8',
        reason: 'Impersonating a USD stablecoin',
    },
    {
        tokenId:
            '7c14895521c158798478a64d146f67f22e1c8c5b962422ed47636fda71d82f1d',
        reason: 'Impersonating Meta and attempting to use their logo',
    },
    {
        tokenId:
            '6f231d49fefd938a9a6b4e6b93d14c7127e11bd5621056eb9c6528164b9d7ce0',
        reason: 'Impersonating Meta and attempting to use their logo',
    },
    {
        tokenId:
            'a6a16ac38d37e35c9f9eb81e9014827cef9da105a94607ec16a2c6e76224d098',
        reason: 'Impersonating corporate brand using their logo',
    },
    {
        tokenId:
            'db2e95abe66f6b1f21a860a177b7a73565182185a99b6043b5183f59df7ecfbf',
        reason: 'Impersonating corporate brand using their logo',
    },
    {
        tokenId:
            '4c008a1cd5002063d2942daed16ff0e118bc3e41c7c0a4155ac096ee5a389c21',
        reason: 'Impersonating RAIPAY',
    },
];
const initialBlacklist = initialBlacklistTokens.map(item => ({
    ...item,
    // When added to this file
    timestamp: Math.round(new Date(1730090292122).getTime() / 1000),
    addedBy: 'Initial Setup',
}));
export { initialBlacklist };

export const initializeDb = async (
    client: MongoClient,
    blacklist = initialBlacklist,
): Promise<Db> => {
    await client.connect();
    console.log('Successfully connected to mongod database');
    const db: Db = client.db(config.db.name);

    const collections: CollectionInfo[] = await db.listCollections().toArray();

    const blacklistCollectionName = config.db.collections.blacklist.name;

    // Check if the collection exists in the list
    const blacklistExists: boolean = collections.some(
        collection => collection.name === blacklistCollectionName,
    );

    if (!blacklistExists) {
        // If the blacklist does not exist, initialize it
        const blacklistedTokenIds: Collection = db.collection(
            blacklistCollectionName,
        );
        // Index by tokenId which is unique, ensuring we do not enter the same tokenId more than once
        // This also improves query times
        blacklistedTokenIds.createIndex({ tokenId: 1 }, { unique: true });

        // Initialize blacklist
        const result = await blacklistedTokenIds.insertMany(blacklist);
        console.log(
            `${result.insertedCount} tokens inserted into ${blacklistCollectionName}`,
        );
    } else {
        // If the blacklist exists, log how many entries we have
        const blacklistedTokenCount = await db
            .collection(blacklistCollectionName)
            .countDocuments();
        console.log(
            `Collection "${blacklistCollectionName}" exists and includes ${blacklistedTokenCount} tokens. Continuing token-server startup...`,
        );
    }

    return db;
};

export const getBlacklistedTokenIds = async (db: Db): Promise<string[]> => {
    const collection = db.collection(config.db.collections.blacklist.name);

    // Query only for tokenId fields
    const projection = { _id: 0, tokenId: 1 };
    const tokenIds = await collection
        .find({}, { projection })
        .map(doc => doc.tokenId)
        .toArray();

    return tokenIds;
};

export const getOneBlacklistEntry = async (
    db: Db,
    tokenId: string,
): Promise<BlacklistEntry | null> => {
    const collection = db.collection(config.db.collections.blacklist.name);
    // Don't return _id
    const projection = { _id: 0 };

    // Query for a single document where tokenId matches
    const result = await collection.findOne({ tokenId }, { projection });

    return result as BlacklistEntry | null;
};
