#!/usr/bin/env node

/**
 * Migration script to move from JSON file-based history storage to SQLite
 * 
 * Usage: npm run migrate:json-to-sqlite
 * 
 * This script:
 * 1. Backs up existing JSON files
 * 2. Migrates all user history data to SQLite
 * 3. Verifies the migration was successful
 * 4. Moves JSON files to backup folder
 */

import fs from 'fs';
import path from 'path';
import type { HistoryItem } from '../src/lib/types';
import * as dbService from '../src/services/database.service';

const JSON_HISTORY_DIR = path.join(process.cwd(), 'user_data', 'history');
const BACKUP_DIR = path.join(process.cwd(), 'user_data', 'history_json_backup');

async function migrate() {
  console.log('🚀 Starting migration from JSON to SQLite...\n');
  
  try {
    // 1. Ensure directories exist
    if (!fs.existsSync(JSON_HISTORY_DIR)) {
      console.log('❌ No JSON history directory found. Nothing to migrate.');
      return;
    }
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('📁 Created backup directory');
    }
    
    // 2. Get all JSON files
    const files = fs.readdirSync(JSON_HISTORY_DIR).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('❌ No JSON history files found. Nothing to migrate.');
      return;
    }
    
    console.log(`📊 Found ${files.length} user history files to migrate\n`);
    
    // 3. Initialize database connection
    const db = dbService.getDb();
    console.log('✅ Database connection established\n');
    
    let totalItemsMigrated = 0;
    let totalUsers = 0;
    
    // 4. Migrate each user's history
    for (const file of files) {
      const username = path.basename(file, '.json');
      const filePath = path.join(JSON_HISTORY_DIR, file);
      
      try {
        console.log(`👤 Processing user: ${username}`);
        
        // Read and parse JSON file
        const content = fs.readFileSync(filePath, 'utf-8');
        let historyItems: HistoryItem[];
        
        try {
          historyItems = JSON.parse(content);
        } catch (parseError) {
          console.log(`  ⚠️  Failed to parse JSON for ${username}: ${parseError}`);
          continue;
        }
        
        if (!Array.isArray(historyItems)) {
          console.log(`  ⚠️  Invalid history format for ${username} (not an array)`);
          continue;
        }
        
        console.log(`  📝 Found ${historyItems.length} history items`);
        
        // Insert each history item
        let userItemsInserted = 0;
        for (const item of historyItems) {
          try {
            // Validate required fields
            if (!item.id || !item.username || !item.timestamp) {
              console.log(`  ⚠️  Skipping invalid history item (missing required fields)`);
              continue;
            }
            
            // Ensure username matches filename
            if (item.username !== username) {
              item.username = username; // Fix username mismatch
            }
            
            dbService.insertHistoryItem(item);
            userItemsInserted++;
          } catch (insertError) {
            console.log(`  ⚠️  Failed to insert history item ${item.id}: ${insertError}`);
          }
        }
        
        console.log(`  ✅ Migrated ${userItemsInserted}/${historyItems.length} items for ${username}`);
        totalItemsMigrated += userItemsInserted;
        totalUsers++;
        
        // Verify migration for this user
        const migratedItems = dbService.findHistoryByUsername(username);
        if (migratedItems.length !== userItemsInserted) {
          console.log(`  ⚠️  Verification failed: Expected ${userItemsInserted}, found ${migratedItems.length}`);
        } else {
          console.log(`  ✅ Verification passed for ${username}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing ${username}: ${error}`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log(`\n🎉 Migration Summary:`);
    console.log(`   Users migrated: ${totalUsers}`);
    console.log(`   Total items migrated: ${totalItemsMigrated}`);
    
    // 5. Move JSON files to backup after successful migration
    if (totalItemsMigrated > 0) {
      console.log('\n📦 Moving JSON files to backup...');
      
      for (const file of files) {
        const sourcePath = path.join(JSON_HISTORY_DIR, file);
        const backupPath = path.join(BACKUP_DIR, file);
        
        try {
          fs.renameSync(sourcePath, backupPath);
          console.log(`   ✅ Backed up: ${file}`);
        } catch (error) {
          console.log(`   ⚠️  Failed to backup ${file}: ${error}`);
        }
      }
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`📁 Original JSON files backed up to: ${BACKUP_DIR}`);
      console.log(`🗄️  SQLite database created at: user_data/history/history.db`);
    } else {
      console.log('\n❌ No items were migrated. JSON files remain in place.');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Additional verification function
async function verifyMigration() {
  console.log('\n🔍 Running post-migration verification...');
  
  try {
    const paginatedHistory = dbService.getAllUsersHistoryPaginated(1, 1000);
    const usernames = [...new Set(paginatedHistory.items.map(item => item.username))];
    
    console.log(`\n📊 Verification Results:`);
    console.log(`   Total items: ${paginatedHistory.totalCount}`);
    console.log(`   Total users: ${usernames.length}`);
    for (const username of usernames) {
      const userItems = paginatedHistory.items.filter(item => item.username === username);
      console.log(`   - ${username}: ${userItems.length} items`);
    }
    
    console.log(`\n✅ Total verification: ${usernames.length} users, ${paginatedHistory.totalCount} items in database`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Main execution
if (require.main === module) {
  migrate()
    .then(() => verifyMigration())
    .then(() => {
      console.log('\n🏁 Migration and verification complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { migrate, verifyMigration };
