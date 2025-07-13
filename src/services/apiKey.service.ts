// src/services/apiKey.service.ts
'use server';

import * as dbService from './database.service';
import * as settingsService from './settings.service';
import { decrypt } from './encryption.service';

type ApiService = 'gemini' | 'fal';

/**
 * Retrieves the correct API key for a given user and service.
 * It checks for a user-specific key first, then falls back to the global key.
 * @param username - The user for whom to retrieve the key.
 * @param service - The service ('gemini' or 'fal') for which the key is needed.
 * @param index - The index (1, 2, or 3) for the Gemini key. Required for Gemini, ignored for Fal.
 * @returns The decrypted API key as a string.
 * @throws An error if no key is configured for the service.
 */
export async function getApiKeyForUser(username: string, service: ApiService, index?: 1 | 2 | 3): Promise<string> {
  const user = dbService.findUserByUsername(username);
  if (!user) {
    throw new Error(`User '${username}' not found.`);
  }

  if (service === 'gemini' && !index) {
    throw new Error('Index (1, 2, or 3) is required for Gemini API key retrieval.');
  }

  const keyModeField = service === 'gemini' ? `gemini_api_key_${index}_mode` : 'fal_api_key_mode';
  const userApiKeyField = service === 'gemini' ? `gemini_api_key_${index}` : 'fal_api_key';

  // 1. Check for user-specific key
  if ((user as any)[keyModeField] === 'user_specific') {
    const userApiKey = (user as any)[userApiKeyField];
    if (userApiKey) {
      const decryptedKey = decrypt(userApiKey);
      if (decryptedKey) {
        console.log(`Using user-specific ${service} key (index: ${index || 'N/A'}) for user '${username}'.`);
        return decryptedKey;
      }
    }
  }

  // 2. Fallback to global key
  const globalKeySetting = service === 'gemini' 
    ? `global_gemini_api_key_${index}` 
    : 'global_fal_api_key';
  
  const encryptedGlobalKey = settingsService.getSetting(globalKeySetting as settingsService.SettingKey);
  if (encryptedGlobalKey) {
    const decryptedKey = decrypt(encryptedGlobalKey);
    if (decryptedKey) {
      console.log(`Using global ${service} key (index: ${index || 'N/A'}) for user '${username}'.`);
      return decryptedKey;
    }
  }

  // 3. If no key is found, throw an error.
  throw new Error(`API key for service '${service}' (index: ${index || 'N/A'}) is not configured for user '${username}' or globally.`);
}
