#!/usr/bin/env node

/**
 * Cache cleanup script for RefashionAI
 * 
 * This script cleans up old cached image processing results to prevent
 * the cache from growing indefinitely. It can be run manually or as a cron job.
 * 
 * Usage: node scripts/cleanup-cache.js [--max-age-days=30]
 */

const path = require('path');
const fs = require('fs').promises;

const DEFAULT_MAX_AGE_DAYS = 30;

async function cleanupCache(maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  const cacheFilePath = path.join(process.cwd(), '.cache', 'image-processing-cache.json');
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    console.log(`Starting cache cleanup (max age: ${maxAgeDays} days)...`);
    
    // Read the cache file
    let cache = {};
    try {
      const data = await fs.readFile(cacheFilePath, 'utf-8');
      cache = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Cache file does not exist. Nothing to clean up.');
        return;
      }
      throw error;
    }

    const now = Date.now();
    let removedCount = 0;
    let totalCount = Object.keys(cache).length;

    // Clean up old entries
    for (const [hash, entry] of Object.entries(cache)) {
      if (entry.timestamp && (now - entry.timestamp) > maxAgeMs) {
        // Try to delete associated files
        for (const [type, filePath] of Object.entries(entry)) {
          if (type !== 'timestamp' && typeof filePath === 'string') {
            try {
              const fullPath = path.join(process.cwd(), 'public', filePath);
              await fs.unlink(fullPath);
              console.log(`Deleted cached file: ${filePath}`);
            } catch (fileError) {
              console.warn(`Could not delete file ${filePath}:`, fileError.message);
            }
          }
        }
        
        delete cache[hash];
        removedCount++;
      }
    }

    // Write the updated cache back
    if (removedCount > 0) {
      await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
      await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
      console.log(`Cache cleanup completed. Removed ${removedCount} of ${totalCount} entries.`);
    } else {
      console.log(`Cache cleanup completed. No entries were old enough to remove (${totalCount} entries remain).`);
    }

  } catch (error) {
    console.error('Error during cache cleanup:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let maxAgeDays = DEFAULT_MAX_AGE_DAYS;

for (const arg of args) {
  if (arg.startsWith('--max-age-days=')) {
    maxAgeDays = parseInt(arg.split('=')[1], 10);
    if (isNaN(maxAgeDays) || maxAgeDays <= 0) {
      console.error('Invalid max-age-days value. Must be a positive number.');
      process.exit(1);
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/cleanup-cache.js [--max-age-days=30]');
    console.log('');
    console.log('Options:');
    console.log('  --max-age-days=N    Remove cache entries older than N days (default: 30)');
    console.log('  --help, -h          Show this help message');
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    console.error('Use --help for usage information.');
    process.exit(1);
  }
}

// Run the cleanup
cleanupCache(maxAgeDays);
