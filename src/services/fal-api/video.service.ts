'use server';

/**
 * @fileOverview Fal.ai API service for video processing operations
 * 
 * This service handles low-level communication with Fal.ai APIs for video-related tasks:
 * - Video generation using Seedance image-to-video model
 * 
 * These functions interact directly with Fal.ai and return task IDs or raw results.
 * They do not handle local storage or history management.
 */

import { fal } from '@fal-ai/client';
import { getApiKeyForUser } from '../apiKey.service';
import { getSetting, getBooleanSetting } from '../settings.service';

export interface VideoGenerationInput {
  prompt: string;
  image_url: string;
  videoModel?: 'lite' | 'pro';
  resolution?: '480p' | '720p' | '1080p';
  duration?: '5' | '10';
  camera_fixed?: boolean;
  seed?: number;
}

export interface VideoGenerationResult {
  video?: {
    url: string;
  };
  seed?: number;
}

/**
 * Starts a video generation task using Fal.ai's Seedance service
 * @param input The video generation parameters
 * @returns Promise<string> The task ID for tracking the video generation
 */
export async function startVideoGeneration(input: VideoGenerationInput): Promise<string> {
  try {
    console.log('Starting video generation with Fal.ai Seedance...');
    
    // Prepare the input for Fal.ai, only including defined values
    const falInput: any = {
      prompt: input.prompt,
      image_url: input.image_url,
    };
    
    // Add optional parameters only if they have values
    if (input.resolution) {
      falInput.resolution = input.resolution;
    }
    if (input.duration) {
      falInput.duration = input.duration;
    }
    if (typeof input.camera_fixed === 'boolean') {
      falInput.camera_fixed = input.camera_fixed;
    }
    if (typeof input.seed === 'number' && input.seed !== undefined) {
      falInput.seed = input.seed;
    }
    
    console.log('Fal.ai input parameters:', JSON.stringify(falInput, null, 2));
    
    // Submit the task to Fal.ai queue
    const { request_id } = await fal.queue.submit('fal-ai/bytedance/seedance/v1/lite/image-to-video', {
      input: falInput,
    });
    
    console.log(`Video generation task started. Task ID: ${request_id}`);
    return request_id;
    
  } catch (error) {
    console.error('Error starting video generation:', error);
    throw new Error(`Failed to start video generation: ${(error as Error).message}`);
  }
}

/**
 * Gets the status and result of a video generation task
 * @param taskId The task ID returned from startVideoGeneration
 * @returns Promise<VideoGenerationResult | null> The result if completed, null if still processing
 */
export async function getVideoGenerationResult(taskId: string): Promise<VideoGenerationResult | null> {
  try {
    console.log(`Checking status of video generation task: ${taskId}`);
    
    const result = await fal.queue.status('fal-ai/bytedance/seedance/v1/lite/image-to-video', {
      requestId: taskId,
      logs: process.env.NODE_ENV === 'development'
    });
    
    if (result.status === 'COMPLETED') {
      console.log('Video generation completed successfully');
      return (result as any).responseBody as VideoGenerationResult;
    } else {
      console.log(`Video generation still in progress. Status: ${result.status}`);
      return null; // Still processing
    }
    
  } catch (error) {
    console.error('Error checking video generation status:', error);
    throw new Error(`Failed to check video generation status: ${(error as Error).message}`);
  }
}

/**
 * Starts a video generation task using a webhook for completion notification
 * @param input The video generation parameters
 * @param webhookUrl The URL that fal.ai will call upon completion
 * @param username The username for fetching the API key
 * @returns Promise<string> The request ID for the submitted job
 */
export async function startVideoGenerationWithWebhook(input: VideoGenerationInput, webhookUrl: string, username: string): Promise<string> {
  try {
    console.log('Submitting video job to Fal.ai with webhook:', webhookUrl);
    const modelId = input.videoModel === 'pro'
      ? 'fal-ai/bytedance/seedance/v1/pro/image-to-video'
      : 'fal-ai/bytedance/seedance/v1/lite/image-to-video';
    const falInput: any = {
      prompt: input.prompt,
      image_url: input.image_url,
    };
    if (input.resolution) falInput.resolution = input.resolution;
    if (input.duration) falInput.duration = input.duration;
    if (typeof input.camera_fixed === 'boolean') falInput.camera_fixed = input.camera_fixed;
    if (typeof input.seed === 'number' && input.seed !== undefined) falInput.seed = input.seed;
    console.log('Fal.ai input parameters:', JSON.stringify(falInput, null, 2));
    const falKey = await getApiKeyForUser(username, 'fal');
    const response = await fetch(`https://queue.fal.run/${modelId}?fal_webhook=${encodeURIComponent(webhookUrl)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falInput),
    });
    if (!response.ok) {
      throw new Error(`Fal.ai API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.request_id;
  } catch (error) {
    console.error('Error submitting video job to Fal.ai:', error);
    throw error;
  }
}

/**
 * Checks if the video generation service is available by verifying the API key
 * @returns Promise<boolean> True if the service is configured and available
 */
export async function isVideoServiceAvailable(): Promise<boolean> {
  // Check if the feature flag is enabled AND a global key exists.
  // This is the best we can do without a user context.
  const featureEnabled = getBooleanSetting('feature_video_generation');
  const globalKey = getSetting('global_fal_api_key');
  return featureEnabled && !!globalKey;
}
