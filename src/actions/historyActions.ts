'use server';

import { getCurrentUser } from './authActions';
import type { HistoryItem, ModelAttributes } from '@/lib/types';
import * as dbService from '@/services/database.service';

export async function updateHistoryItem(
  historyItemId: string,
  updates: Partial<HistoryItem>,
  username?: string // NEW optional username parameter for API context
): Promise<{ success: boolean; error?: string }> {
  const user = username ? { username } : await getCurrentUser();
  if (!user || !user.username) {
    return { success: false, error: 'User not authenticated or username not provided' };
  }

  try {
    // Verify the item exists and belongs to the user
    const existingItem = dbService.findHistoryItemById(historyItemId);
    if (!existingItem) {
      return { success: false, error: 'History item not found' };
    }
    
    if (existingItem.username !== user.username) {
      return { success: false, error: 'Unauthorized access to history item' };
    }

    // Perform the atomic update
    dbService.updateHistoryItem(historyItemId, updates);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserHistory(): Promise<HistoryItem[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return dbService.findHistoryByUsername(user.username);
}

export async function getUserHistoryPaginated(
  page: number = 1, 
  limit: number = 10,
  filter?: 'video' | 'image'
): Promise<{
  items: HistoryItem[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return dbService.getPaginatedHistoryForUser({
    username: user.username,
    page,
    limit,
    filter
  });
}

export async function addHistoryItem(
  attributes: ModelAttributes,
  constructedPrompt: string,
  originalClothingUrl: string,
  editedImageUrls: (string | null)[],
  settingsMode: 'basic' | 'advanced',
  status: 'processing' | 'completed' | 'failed' = 'completed',
  error?: string,
  username?: string // NEW optional username parameter for API context
): Promise<string> {
  const user = username ? { username } : await getCurrentUser();
  if (!user || !user.username) {
    throw new Error('User not authenticated or username not provided.');
  }
  
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    attributes,
    constructedPrompt,
    originalClothingUrl,
    editedImageUrls,
    username: user.username,
    settingsMode,
    status,
    error
  };
  
  dbService.insertHistoryItem(newItem);
  return newItem.id;
}

export async function addVideoToHistoryItem(
  historyItemId: string,
  videoUrls: (string | null)[],
  videoGenerationParams: HistoryItem['videoGenerationParams']
): Promise<void> {
  if (!videoGenerationParams) {
    throw new Error("videoGenerationParams are required");
  }
  
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Verify the item exists and belongs to the user
  const existingItem = dbService.findHistoryItemById(historyItemId);
  if (!existingItem) {
    throw new Error('History item not found');
  }
  
  if (existingItem.username !== user.username) {
    throw new Error('Unauthorized access to history item');
  }

  // Update the history item with video information
  dbService.updateHistoryItem(historyItemId, {
    generatedVideoUrls: videoUrls,
    videoGenerationParams
  });
}

export async function addStandaloneVideoHistoryItem(
  videoUrls: (string | null)[],
  videoGenerationParams: HistoryItem['videoGenerationParams']
): Promise<string> {
  if (!videoGenerationParams) {
    throw new Error("videoGenerationParams are required for standalone video history.");
  }
  
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // For standalone video, store the source image in originalImageUrls, not editedImageUrls
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    attributes: {} as ModelAttributes, // Empty attributes for video-only items
    constructedPrompt: videoGenerationParams.prompt,
    originalClothingUrl: videoGenerationParams.sourceImageUrl,
    editedImageUrls: [null, null, null, null], // No generated images for standalone video
    originalImageUrls: [videoGenerationParams.sourceImageUrl, null, null, null],
    username: user.username,
    settingsMode: 'basic',
    generatedVideoUrls: videoUrls,
    videoGenerationParams
  };

  dbService.insertHistoryItem(newItem);
  return newItem.id;
}

export async function getAllUsersHistoryPaginatedForAdmin(
  page: number = 1, 
  limit: number = 10
): Promise<{
  items: HistoryItem[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return dbService.getAllUsersHistoryPaginated(page, limit);
}

export async function deleteHistoryItem(historyItemId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    // Verify the item exists and belongs to the user
    const existingItem = dbService.findHistoryItemById(historyItemId);
    if (!existingItem) {
      return { success: false, error: 'History item not found' };
    }
    
    if (existingItem.username !== user.username) {
      return { success: false, error: 'Unauthorized access to history item' };
    }

    // Delete the item (CASCADE will handle related images)
    const db = dbService.getDb();
    const deleteStmt = db.prepare('DELETE FROM history WHERE id = ?');
    deleteStmt.run(historyItemId);

    return { success: true };
  } catch (error) {
    console.error(`Error deleting history item ${historyItemId} for user ${user.username}:`, error);
    return { success: false, error: 'Failed to delete history item.' };
  }
}

export async function getHistoryItem(historyItemId: string): Promise<HistoryItem | null> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const item = dbService.findHistoryItemById(historyItemId);
  
  // Verify the item belongs to the user (or user is admin)
  if (item && item.username !== user.username && user.role !== 'admin') {
    throw new Error('Unauthorized access to history item');
  }

  return item;
}

// Compatibility functions for backward compatibility
export async function updateVideoHistoryItem(params: {
  username: string;
  historyItemId: string;
  videoUrls?: (string | null)[];
  localVideoUrl?: string | null;
  seedUsed?: number | null;
  status?: 'processing' | 'completed' | 'failed';
  error?: string;
  videoModel?: 'lite' | 'pro';
}): Promise<void> {
  const { username, historyItemId, videoUrls, localVideoUrl, seedUsed, status, error, videoModel } = params;
  // Authorization check
  const existingItem = dbService.findHistoryItemById(historyItemId);
  if (!existingItem || existingItem.username !== username) {
    console.warn(`History item ${historyItemId} not found or user ${username} is not authorized.`);
    return;
  }
  // Construct the partial update object
  const updatePayload: Partial<HistoryItem> = {};
  // Only include videoGenerationParams if patch fields are present
  const videoGenPatch: Record<string, unknown> = {};
  if (videoModel !== undefined) videoGenPatch.videoModel = videoModel;
  if (seedUsed !== undefined) videoGenPatch.seed = seedUsed;
  if (localVideoUrl !== undefined) videoGenPatch.localVideoUrl = localVideoUrl;
  if (status !== undefined) videoGenPatch.status = status;
  if (error !== undefined) videoGenPatch.error = error;
  if (Object.keys(videoGenPatch).length > 0) {
    updatePayload.videoGenerationParams = videoGenPatch as any;
  }
  if (videoUrls) updatePayload.generatedVideoUrls = videoUrls;
  dbService.updateHistoryItem(historyItemId, updatePayload);
}

export async function getHistoryPaginated(
  page: number = 1,
  limit: number = 10,
  filter: 'all' | 'image' | 'video' = 'all'
): Promise<{
  items: HistoryItem[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const filterParam = filter === 'all' ? undefined : filter;
  return dbService.getPaginatedHistoryForUser({
    username: user.username,
    page,
    limit,
    filter: filterParam
  });
}

export async function getVideoHistoryPaginated(
  page: number = 1,
  limit: number = 10
): Promise<{
  items: HistoryItem[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> {
  return getHistoryPaginated(page, limit, 'video');
}

export async function getHistoryItemById(historyItemId: string): Promise<{ success: boolean; item?: HistoryItem; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }
  const item = dbService.findHistoryItemById(historyItemId);
  if (!item) {
    return { success: false, error: 'History item not found' };
  }
  if (item.username !== user.username) {
    return { success: false, error: 'Unauthorized access to history item' };
  }
  return { success: true, item };
}
