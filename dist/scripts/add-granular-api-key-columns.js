"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = runMigration;
// scripts/add-granular-api-key-columns.ts
const database_service_1 = require("../src/services/database.service");
function runMigration() {
    const db = (0, database_service_1.getDb)();
    console.log('Running granular API key migration...');
    try {
        // We will build a new table and copy data, as altering tables in SQLite is limited.
        db.exec('BEGIN TRANSACTION;');
        // 1. Rename the old users table
        db.exec('ALTER TABLE users RENAME TO users_old;');
        console.log('Renamed original users table to users_old.');
        // 2. Create the new users table with the correct schema
        db.exec(`
      CREATE TABLE users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        gemini_api_key_1 TEXT,
        gemini_api_key_1_mode TEXT NOT NULL DEFAULT 'global' CHECK (gemini_api_key_1_mode IN ('global', 'user_specific')),
        gemini_api_key_2 TEXT,
        gemini_api_key_2_mode TEXT NOT NULL DEFAULT 'global' CHECK (gemini_api_key_2_mode IN ('global', 'user_specific')),
        gemini_api_key_3 TEXT,
        gemini_api_key_3_mode TEXT NOT NULL DEFAULT 'global' CHECK (gemini_api_key_3_mode IN ('global', 'user_specific')),
        fal_api_key TEXT,
        fal_api_key_mode TEXT NOT NULL DEFAULT 'global' CHECK (fal_api_key_mode IN ('global', 'user_specific'))
      );
    `);
        console.log('Created new users table with granular API key columns.');
        // 3. Copy data from the old table to the new one
        db.exec(`
      INSERT INTO users (
        username, password_hash, role, 
        gemini_api_key_1, fal_api_key,
        gemini_api_key_1_mode, fal_api_key_mode
      )
      SELECT 
        username, password_hash, role, 
        gemini_api_key, fal_api_key,
        CASE WHEN api_key_mode = 'user' THEN 'user_specific' ELSE 'global' END,
        CASE WHEN api_key_mode = 'user' THEN 'user_specific' ELSE 'global' END
      FROM users_old;
    `);
        console.log('Copied data from old table to new table, preserving API key mode.');
        // 4. Drop the old table
        db.exec('DROP TABLE users_old;');
        console.log('Dropped old users table.');
        // 5. Add new global settings
        db.exec(`
      INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('global_gemini_api_key_1', ''),
        ('global_gemini_api_key_2', ''),
        ('global_gemini_api_key_3', '');
    `);
        // Remove old single global key if it exists
        db.exec(`DELETE FROM settings WHERE key = 'global_gemini_api_key';`);
        console.log('Added new global API key settings.');
        db.exec('COMMIT;');
        console.log('Migration completed successfully.');
    }
    catch (error) {
        db.exec('ROLLBACK;');
        console.error('Migration failed:', error);
        throw error;
    }
}
// This construct ensures the script can be run directly
if (require.main === module) {
    runMigration();
}
