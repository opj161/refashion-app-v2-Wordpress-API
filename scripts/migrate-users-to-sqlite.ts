// scripts/migrate-users-to-sqlite.ts
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import * as dbService from '../src/services/database.service';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

const SALT_ROUNDS = 12;

// Define legacy types here as they are only used for this migration script.
interface UserConfig {
  password: string;
  role: 'admin' | 'user';
}
interface UsersConfig {
  [username: string]: UserConfig;
}

async function migrateUsers() {
  console.log('🚀 Starting user migration from APP_USERS_CONFIG to SQLite...');

  const rawConfig = process.env.APP_USERS_CONFIG;
  if (!rawConfig) {
    console.log('✅ No APP_USERS_CONFIG found. Skipping user migration.');
    return;
  }

  try {
    const usersConfig: UsersConfig = JSON.parse(rawConfig);
    const db = dbService.getDb();
    const insertStmt = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    
    let migratedCount = 0;
    for (const [username, config] of Object.entries(usersConfig)) {
      // Check if user already exists
      const existingUser = dbService.findUserByUsername(username);
      if (existingUser) {
        console.log(`  - User '${username}' already exists in DB. Skipping.`);
        continue;
      }

      console.log(`  - Migrating user: ${username}`);
      const hashedPassword = await bcrypt.hash(config.password, SALT_ROUNDS);
      insertStmt.run(username, hashedPassword, config.role);
      migratedCount++;
    }

    if (migratedCount > 0) {
        console.log(`\n🎉 Successfully migrated ${migratedCount} users to the database.`);
        console.log('IMPORTANT: You can now remove the APP_USERS_CONFIG environment variable.');
    } else {
        console.log('\n✅ No new users to migrate.');
    }

  } catch (error) {
    console.error('💥 User migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log('🏁 User migration check complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error during user migration:', error);
      process.exit(1);
    });
}
