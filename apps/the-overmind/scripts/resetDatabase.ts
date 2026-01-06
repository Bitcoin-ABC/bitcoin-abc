// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import 'dotenv/config';
import { createInterface } from 'readline';
import { initDb, initSchema } from '../src/db';

/**
 * Prompt user for confirmation
 * Default is "no" - user must explicitly type "y" or "yes" to proceed
 */
const promptConfirmation = (question: string): Promise<boolean> => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            // Only return true if explicitly "y" or "yes", default to false
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
};

/**
 * Reset the database by dropping all tables and reinitializing the schema
 * WARNING: This will delete all data in the database!
 */
const resetDatabase = async (): Promise<void> => {
    console.info('⚠️  WARNING: This will delete ALL data in the database!');
    console.info('This action cannot be undone.\n');

    const confirmed = await promptConfirmation(
        'Are you sure you want to proceed? (y/N): ',
    );

    if (!confirmed) {
        console.info('Database reset cancelled.');
        process.exit(0);
    }

    console.info('\nStarting database reset...');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    // Connect to database
    const pool = await initDb(databaseUrl);

    try {
        // Get all table names
        const tablesResult = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);

        const tableNames = tablesResult.rows.map(row => row.tablename);

        if (tableNames.length === 0) {
            console.info('No tables found in database.');
        } else {
            console.info(
                `Found ${tableNames.length} tables to drop:`,
                tableNames,
            );

            // Drop all tables (CASCADE to handle foreign key constraints)
            for (const tableName of tableNames) {
                try {
                    await pool.query(
                        `DROP TABLE IF EXISTS ${tableName} CASCADE`,
                    );
                    console.info(`Dropped table: ${tableName}`);
                } catch (err) {
                    console.error(`Error dropping table ${tableName}:`, err);
                    throw err;
                }
            }
        }

        // Reinitialize schema
        console.info('Reinitializing database schema...');
        await initSchema(pool);

        console.info('✅ Database reset completed successfully!');
    } catch (err) {
        console.error('❌ Error resetting database:', err);
        throw err;
    } finally {
        await pool.end();
        console.info('Database connection closed.');
    }
};

// Run the reset
resetDatabase().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
