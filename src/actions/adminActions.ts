// src/actions/adminActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import * as dbService from '@/services/database.service';
import { getCurrentUser } from './authActions';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import * as settingsService from '@/services/settings.service';
import { encrypt } from '@/services/encryption.service';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

async function verifyAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required.');
  }
  return user;
}

export async function getAllUsers() {
  await verifyAdmin();
  const db = dbService.getDb();
  const stmt = db.prepare('SELECT username, role, gemini_api_key_1_mode, gemini_api_key_2_mode, gemini_api_key_3_mode, fal_api_key_mode FROM users ORDER BY username');
  return stmt.all() as any[]; // Simplified for brevity, define a proper type
}

export async function createUser(formData: FormData) {
  const admin = await verifyAdmin();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as 'admin' | 'user';

  if (!username || !password || !role) {
    return { success: false, error: 'All fields are required.' };
  }

  if (admin.username === username) {
    return { success: false, error: "You cannot create a user with your own username." };
  }
  
  try {
    const db = dbService.getDb();
    const existingUser = dbService.findUserByUsername(username);
    if (existingUser) {
      return { success: false, error: 'Username already exists.' };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    stmt.run(username, passwordHash, role);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Database error occurred.' };
  }
}

export async function deleteUser(username: string) {
  const admin = await verifyAdmin();
  
  if (admin.username === username) {
    return { success: false, error: "You cannot delete your own account." };
  }

  try {
    const db = dbService.getDb();
    const stmt = db.prepare('DELETE FROM users WHERE username = ?');
    const result = stmt.run(username);

    if (result.changes === 0) {
        return { success: false, error: "User not found." };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Database error occurred.' };
  }
}

export async function getAllSettings() {
  await verifyAdmin();
  return settingsService.getAllSettings();
}

export async function updateSetting(key: settingsService.SettingKey, value: boolean) {
  await verifyAdmin();
  try {
    settingsService.setSetting(key, value.toString());
    revalidatePath('/admin/settings');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return { success: false, error: 'Failed to update setting.' };
  }
}

export async function triggerCacheCleanup() {
  await verifyAdmin();
  try {
    const cacheFilePath = path.join(process.cwd(), '.cache', 'image-processing-cache.json');
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days

    let cache: Record<string, any> = {};
    try {
      const data = await fs.readFile(cacheFilePath, 'utf-8');
      cache = JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { success: true, message: 'Cache file does not exist. Nothing to clean up.' };
      }
      throw error;
    }

    const now = Date.now();
    let removedCount = 0;
    const initialCount = Object.keys(cache).length;

    for (const [hash, entry] of Object.entries(cache)) {
      if (entry.timestamp && (now - entry.timestamp) > maxAgeMs) {
        delete cache[hash];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
      return { success: true, message: `Cache cleanup complete. Removed ${removedCount} of ${initialCount} entries.` };
    } else {
      return { success: true, message: `Cache is clean. No entries were old enough to remove (${initialCount} entries remain).` };
    }
  } catch (error) {
    console.error('Error during cache cleanup from admin panel:', error);
    return { success: false, error: 'Cache cleanup failed.' };
  }
}

export async function updateUserConfiguration(formData: FormData) {
  await verifyAdmin();
  const username = formData.get('username') as string;
  if (!username) {
    return { success: false, error: 'Username is required.' };
  }

  // Dynamically build the update statement only from present fields
  const setClauses: string[] = [];
  const params: any[] = [];

  const role = formData.get('role');
  if (role) { setClauses.push('role = ?'); params.push(role); }

  const gemini1Mode = formData.get('gemini_api_key_1_mode');
  if (gemini1Mode) { setClauses.push('gemini_api_key_1_mode = ?'); params.push(gemini1Mode); }
  const gemini2Mode = formData.get('gemini_api_key_2_mode');
  if (gemini2Mode) { setClauses.push('gemini_api_key_2_mode = ?'); params.push(gemini2Mode); }
  const gemini3Mode = formData.get('gemini_api_key_3_mode');
  if (gemini3Mode) { setClauses.push('gemini_api_key_3_mode = ?'); params.push(gemini3Mode); }
  const falMode = formData.get('fal_api_key_mode');
  if (falMode) { setClauses.push('fal_api_key_mode = ?'); params.push(falMode); }

  // Handle optional API keys. Update if the field was submitted (even if empty, to allow clearing)
  if (formData.has('gemini_api_key_1')) { setClauses.push('gemini_api_key_1 = ?'); params.push(encrypt(formData.get('gemini_api_key_1') as string)); }
  if (formData.has('gemini_api_key_2')) { setClauses.push('gemini_api_key_2 = ?'); params.push(encrypt(formData.get('gemini_api_key_2') as string)); }
  if (formData.has('gemini_api_key_3')) { setClauses.push('gemini_api_key_3 = ?'); params.push(encrypt(formData.get('gemini_api_key_3') as string)); }
  if (formData.has('fal_api_key')) { setClauses.push('fal_api_key = ?'); params.push(encrypt(formData.get('fal_api_key') as string)); }

  if (setClauses.length === 0) {
    return { success: true, message: 'No changes submitted.' };
  }

  try {
    const db = dbService.getDb();
    params.push(username); // For the WHERE clause
    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE username = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error(`Error updating configuration for user ${username}:`, error);
    return { success: false, error: 'Database error occurred during update.' };
  }
}

export async function updateEncryptedSetting(key: settingsService.SettingKey, value: string) {
  await verifyAdmin();
  try {
    const encryptedValue = value ? encrypt(value) : '';
    settingsService.setSetting(key, encryptedValue);
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error(`Error updating encrypted setting ${key}:`, error);
    return { success: false, error: 'Failed to update setting.' };
  }
}

export async function getGlobalApiKeysForDisplay() {
  const settings = settingsService.getAllSettings();
  const { decrypt } = await import('@/services/encryption.service');
  const mask = (key: string) => key ? `••••••••••••${key.slice(-4)}` : 'Not Set';
  return {
    gemini1: mask(decrypt(settings.global_gemini_api_key_1)),
    gemini2: mask(decrypt(settings.global_gemini_api_key_2)),
    gemini3: mask(decrypt(settings.global_gemini_api_key_3)),
    fal: mask(decrypt(settings.global_fal_api_key)),
  };
}

export async function generateApiKeyForUser(username: string): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  await verifyAdmin();

  try {
    const db = dbService.getDb();
    const apiKey = `rf_${crypto.randomBytes(24).toString('hex')}`;
    
    const stmt = db.prepare('UPDATE users SET app_api_key = ? WHERE username = ?');
    const result = stmt.run(apiKey, username);

    if (result.changes === 0) {
      return { success: false, error: 'User not found.' };
    }
    
    revalidatePath('/admin/users');
    return { success: true, apiKey };

  } catch (error) {
    console.error(`Error generating API key for ${username}:`, error);
    return { success: false, error: 'Database error occurred.' };
  }
}
