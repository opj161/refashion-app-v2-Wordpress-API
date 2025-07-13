# Scripts Directory

This directory contains utility scripts for the Refashion App project.

## Utility Scripts

- **cleanup-cache.js** - Cleans up old cached image processing results to prevent unlimited cache growth
  ```bash
  # Clean up cache entries older than 30 days (default)
  node scripts/cleanup-cache.js
  
  # Clean up cache entries older than 7 days
  node scripts/cleanup-cache.js --max-age-days=7
  
  # Show help
  node scripts/cleanup-cache.js --help
  ```
