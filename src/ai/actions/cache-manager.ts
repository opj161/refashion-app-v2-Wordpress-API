'use server';

import fs from 'fs/promises';
import path from 'path';

const cacheFilePath = path.join(process.cwd(), '.cache', 'image-processing-cache.json');

type CacheEntry = {
  path: string;
  hash: string;
};
type CacheData = {
  [key: string]: {
    bgRemoved?: CacheEntry;
    upscaled?: CacheEntry;
    faceDetailed?: CacheEntry;
    timestamp?: number;
  };
};

async function readCache(): Promise<CacheData> {
  try {
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    const data = await fs.readFile(cacheFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {}; // Cache file doesn't exist, return empty object
    }
    console.error('Error reading cache:', error);
    return {};
  }
}

async function writeCache(data: CacheData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.writeFile(cacheFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export async function getCachedImage(hash: string, type: 'bgRemoved' | 'upscaled' | 'faceDetailed'): Promise<CacheEntry | null> {
  const cache = await readCache();
  const cachedEntry = cache[hash]?.[type];
  if (cachedEntry) {
    try {
      const fullPath = path.join(process.cwd(), 'public', cachedEntry.path);
      await fs.access(fullPath);
      return cachedEntry;
    } catch {
      delete cache[hash]?.[type];
      if (cache[hash] && Object.keys(cache[hash]).length === 0) {
        delete cache[hash];
      }
      await writeCache(cache);
      return null;
    }
  }
  return null;
}

export async function setCachedImage(hash: string, type: 'bgRemoved' | 'upscaled' | 'faceDetailed', imagePath: string, outputHash: string): Promise<void> {
  const cache = await readCache();
  if (!cache[hash]) {
    cache[hash] = {};
  }
  cache[hash][type] = { path: imagePath, hash: outputHash };
  cache[hash].timestamp = Date.now();
  await writeCache(cache);
}

export async function cleanupOldCacheEntries(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  const cache = await readCache();
  const now = Date.now();
  let hasChanges = false;

  for (const [hash, entry] of Object.entries(cache)) {
    if (entry.timestamp && (now - entry.timestamp) > maxAgeMs) {
      delete cache[hash];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await writeCache(cache);
  }
}
