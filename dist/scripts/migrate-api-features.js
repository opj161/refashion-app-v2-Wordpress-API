"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/migrate-api-features.ts
const database_service_1 = require("../src/services/database.service");
function runApiMigration() {
    const db = (0, database_service_1.getDb)();
    console.log('Running API features migration...');
    // Add status and error columns to the history table
    try {
        db.exec(`
      ALTER TABLE history ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';
    `);
        console.log('Added "status" column to history table.');
    }
    catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column "status" already exists. Skipping.');
        }
        else {
            throw e;
        }
    }
    try {
        db.exec(`
      ALTER TABLE history ADD COLUMN error TEXT;
    `);
        console.log('Added "error" column to history table.');
    }
    catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column "error" already exists. Skipping.');
        }
        else {
            throw e;
        }
    }
    // Add app_api_key column to the users table
    try {
        db.exec(`
      ALTER TABLE users ADD COLUMN app_api_key TEXT;
    `);
        console.log('Added "app_api_key" column to users table.');
    }
    catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column "app_api_key" already exists. Skipping.');
        }
        else {
            throw e;
        }
    }
    // Add unique constraint to app_api_key if it doesn't exist
    try {
        db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_api_key ON users(app_api_key) WHERE app_api_key IS NOT NULL;
    `);
        console.log('Added unique constraint to "app_api_key" column.');
    }
    catch (e) {
        console.log('Unique constraint may already exist. Skipping.');
    }
    console.log('API features migration finished.');
}
if (require.main === module) {
    runApiMigration();
}
