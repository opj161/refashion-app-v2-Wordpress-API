'use server';

import { fal, createFalClient } from '@fal-ai/client';
import { getCurrentUser } from '@/actions/authActions';
import { addStandaloneVideoHistoryItem, updateVideoHistoryItem } from '@/actions/historyActions';
import * as videoService from '@/services/fal-api/video.service'; // Use the service layer
import { getApiKeyForUser } from '@/services/apiKey.service';

// Ensure FAL_KEY is available, otherwise Fal.ai calls will fail
if (!process.env.FAL_KEY) {
  console.warn(
    'FAL_KEY environment variable is not set. Fal.ai API calls for video generation will likely fail.'
  );
}

export interface GenerateVideoInput {
  prompt: string;
  image_url: string; // This can be a public URL or a base64 data URI
  resolution?: '480p' | '720p' | '1080p';
  duration?: '5' | '10'; // Duration as strings for Fal.ai API
  videoModel?: 'lite' | 'pro';
  camera_fixed?: boolean;
  seed?: number; // Use -1 for random
  // Add structured video parameters (for history/logging purposes, not sent to Fal.ai)
  selectedPredefinedPrompt?: string;
  modelMovement?: string;
  fabricMotion?: string;
  cameraAction?: string;
  aestheticVibe?: string;
}

export interface GenerateVideoOutput {
  videoUrl: string | null;
  localVideoUrl: string | null;
  seedUsed: number | null;
  error?: string | null;
}

/**
 * Checks if the Fal.ai video generation service is configured and available.
 */
export async function isFalVideoGenerationAvailable(): Promise<boolean> {
  return await videoService.isVideoServiceAvailable();
}

/**
 * Utility to upload a file (from Blob or File object) to Fal Storage.
 */
export async function uploadToFalStorage(file: File | Blob, username: string): Promise<string> {
  try {
    const falKey = await getApiKeyForUser(username, 'fal');
    // Use a per-user Fal client instance with the correct credentials
    const scopedFal = createFalClient({ credentials: falKey });
    const url = await scopedFal.storage.upload(file);
    console.log(`File uploaded to Fal Storage: ${url}`);
    return url;
  } catch (error: any) {
    console.error('Error uploading file to Fal Storage:', error);
    throw new Error(`Failed to upload to Fal Storage: ${error.message}`);
  }
}

// Function to start video generation with webhook support
export async function startVideoGenerationAndCreateHistory(input: GenerateVideoInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  // 1. Create a placeholder history item first to get an ID
  const historyVideoParams = {
    prompt: input.prompt,
    resolution: input.resolution || '480p',
    videoModel: input.videoModel || 'lite',
    duration: input.duration || '5',
    seed: input.seed || -1,
    sourceImageUrl: input.image_url,
    selectedPredefinedPrompt: input.selectedPredefinedPrompt || 'custom',
    modelMovement: input.modelMovement || '',
    fabricMotion: input.fabricMotion || '',
    cameraAction: input.cameraAction || '',
    aestheticVibe: input.aestheticVibe || '',
    cameraFixed: input.camera_fixed || false,
    status: 'processing' as const, // Initial status
  };

  // Create placeholder history item and get the ID
  const historyItemId = await addStandaloneVideoHistoryItem(
    [null], // No video URL yet
    historyVideoParams
  );

  // 2. Prepare the webhook URL for fal_webhook query parameter
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/video/webhook?historyItemId=${historyItemId}&username=${encodeURIComponent(user.username)}`;

  // 3. Submit the job using the new service function
  try {
    const videoServiceInput = {
      prompt: input.prompt,
      image_url: input.image_url,
      videoModel: input.videoModel,
      resolution: input.resolution,
      duration: input.duration,
      camera_fixed: input.camera_fixed,
      seed: input.seed,
    };

    const taskId = await videoService.startVideoGenerationWithWebhook(videoServiceInput, webhookUrl, user.username);

    // Update the history item with the taskId for tracking
    await updateVideoHistoryItem({ 
      username: user.username, 
      historyItemId, 
      videoUrls: [null],
      localVideoUrl: null,
      seedUsed: null,
      status: 'processing',
      videoModel: input.videoModel || 'lite',
    });

    return { taskId, historyItemId };
  } catch (error: any) {
    console.error('Fal.ai submission error:', error);
    
    // If submission fails, mark the history item as failed
    await updateVideoHistoryItem({ 
      username: user.username, 
      historyItemId, 
      videoUrls: [null],
      localVideoUrl: null,
      seedUsed: null,
      status: 'failed', 
      error: 'Failed to submit job to fal.ai',
      videoModel: input.videoModel || 'lite',
    });
    return { error: 'Failed to submit video generation job.' };
  }
}
