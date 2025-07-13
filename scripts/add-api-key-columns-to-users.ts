import { getDb } from '../src/services/database.service';

function addApiKeyColumns() {
  const db = getDb();
  console.log('Adding new API key columns to users table...');
  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN api_key_mode TEXT CHECK(api_key_mode IN ('global', 'user')) NOT NULL DEFAULT 'global';
    `);
    console.log('Added api_key_mode column.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('api_key_mode column already exists.');
    } else {
      console.error('Error adding api_key_mode:', error);
      throw error;
    }
  }

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN gemini_api_key TEXT;
    `);
    console.log('Added gemini_api_key column.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('gemini_api_key column already exists.');
    } else {
      console.error('Error adding gemini_api_key:', error);
      throw error;
    }
  }

  try {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN fal_api_key TEXT;
    `);
    console.log('Added fal_api_key column.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('fal_api_key column already exists.');
    } else {
      console.error('Error adding fal_api_key:', error);
      throw error;
    }
  }

  console.log('Finished adding new API key columns.');
}

addApiKeyColumns();
