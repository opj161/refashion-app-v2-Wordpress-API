// src/actions/apiActions.ts
'use server';

import { generateImageEdit } from "@/ai/flows/generate-image-edit";
import { addHistoryItem, updateHistoryItem } from "./historyActions";
import type { ModelAttributes } from "@/lib/types";

interface ApiJobPayload {
  username: string;
  imageDataUri: string;
  parameters: ModelAttributes;
  settingsMode: 'basic' | 'advanced';
}

/**
 * Creates a new job record in the database with a 'processing' status.
 * @returns The new job ID (which is a history_id).
 */
export async function createApiJob(payload: ApiJobPayload): Promise<string> {
  const { username, parameters, imageDataUri, settingsMode } = payload;
  const newHistoryId = await addHistoryItem(
    parameters,
    "Job created via API. Prompt to be generated.", // Placeholder prompt
    imageDataUri, // Using this as the original clothing URL
    [], // No edited images yet
    settingsMode,
    'processing', // Initial status
    undefined,    // No error
    username      // Pass the authenticated username from API key
  );
  return newHistoryId;
}

/**
 * This function is designed to be called without 'await'.
 * It runs the full generation and updates the DB record upon completion or failure.
 */
export async function processApiGenerationJob(jobId: string, payload: Omit<ApiJobPayload, 'username'>, username: string): Promise<void> {
  try {
    const result = await generateImageEdit({ 
      parameters: payload.parameters,
      settingsMode: payload.settingsMode,
      imageDataUriOrUrl: payload.imageDataUri 
    }, username);

    // Update history item with results AND the constructed prompt
    await updateHistoryItem(jobId, {
      editedImageUrls: result.editedImageUrls,
      constructedPrompt: result.constructedPrompt,
      status: 'completed',
    }, username);
    console.log(`API Job ${jobId} completed successfully.`);

  } catch (e) {
    console.error(`API Job ${jobId} failed:`, e);
    // Update history item with error status
    await updateHistoryItem(jobId, { status: 'failed', error: (e as Error).message }, username);
  }
}
