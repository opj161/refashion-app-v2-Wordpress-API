'use server';

/**
 * @fileOverview Fal.ai API service for image processing operations
 * 
 * This service handles low-level communication with Fal.ai APIs for image-related tasks:
 * - Background removal using rembg
 * - Image upscaling and face enhancement using sd-ultimateface
 * - Detailed face enhancement using face-detailer
 * 
 * These functions expect data URIs as input and return raw URLs from Fal.ai.
 * They do not handle local storage.
 */

import { fal, createFalClient } from '@fal-ai/client';
import { uploadToFalStorage } from '@/ai/actions/generate-video.action';
import { getApiKeyForUser } from '../apiKey.service';

// Constants for upscaling and face enhancement
const UPSCALE_PROMPT = "high quality fashion photography, high-quality clothing, natural, 8k";
const NEGATIVE_UPSCALE_PROMPT = "low quality, ugly, make-up, fake, deformed";
const UPSCALE_FACE_PROMPT = "photorealistic, detailed natural skin, high quality, natural fashion model";
const NEGATIVE_UPSCALE_FACE_PROMPT = "weird, ugly, make-up, cartoon, anime";

// NEW: Constants for the dedicated Face Detailer endpoint
const FACE_DETAILER_PROMPT = "photorealistic, detailed natural skin, high quality, natural fashion model, defined facial features";
const NEGATIVE_FACE_DETAILER_PROMPT = "weird, ugly, make-up, cartoon, anime";

/**
 * Helper to convert data URI to Blob
 */
function dataUriToBlob(dataURI: string): Blob {
  // Split the data URI
  const [header, data] = dataURI.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteString = atob(data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Helper to ensure we have a URL (uploads data URI to Fal Storage if needed)
 */
async function ensureUrl(imageUrlOrDataUri: string, tempFileName: string, username: string): Promise<string> {
  if (imageUrlOrDataUri.startsWith('data:')) {
    console.log(`Data URI detected for ${tempFileName}, uploading to Fal Storage first...`);
    const blob = dataUriToBlob(imageUrlOrDataUri);
    const file = new File([blob], tempFileName, { type: blob.type || 'image/jpeg' });
    const publicUrl = await uploadToFalStorage(file, username);
    console.log(`Image uploaded to ${publicUrl}. Now processing.`);
    return publicUrl;
  }
  return imageUrlOrDataUri;
}

/**
 * Generic helper to run a Fal.ai image workflow, handling subscription and response parsing.
 * @param modelId The ID of the Fal.ai model to run.
 * @param input The input object for the model.
 * @param taskName A descriptive name for the task for logging purposes.
 * @returns Promise<string> The URL of the processed image from Fal.ai.
 */
async function runFalImageWorkflow(modelId: string, input: any, taskName: string, username: string): Promise<string> {
  try {
    console.log(`Calling Fal.ai ${modelId} for ${taskName}...`);

    const falKey = await getApiKeyForUser(username, 'fal');
    const scopedFal = createFalClient({ credentials: falKey });

    // Ensure the input image is a public URL
    if (input.image_url || input.loadimage_1) {
      const key = input.image_url ? 'image_url' : 'loadimage_1';
      input[key] = await ensureUrl(input[key], `${taskName.replace(/\s+/g, '-')}-input.jpg`, username);
    }
    const result: any = await scopedFal.subscribe(modelId, {
      input,
      logs: process.env.NODE_ENV === 'development',
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS" && update.logs && process.env.NODE_ENV === 'development') {
          (update.logs as any[]).forEach((log: any) => console.log(`[Fal.ai Progress - ${taskName}]: ${log.message}`));
        }
      },
    });

    // Robustly parse the output to find the image URL
    let outputImageUrl: string | undefined;
    if (result?.data?.outputs) {
      for (const output of Object.values(result.data.outputs) as any) {
        if (output?.images?.[0]?.url) {
          outputImageUrl = output.images[0].url;
          break;
        }
      }
    } else if (result?.data?.images?.[0]?.url) {
      outputImageUrl = result.data.images[0].url;
    } else if (result?.data?.image?.url) {
      outputImageUrl = result.data.image.url;
    }

    if (!outputImageUrl) {
      console.error(`Fal.ai ${taskName} raw result:`, JSON.stringify(result, null, 2));
      throw new Error(`Fal.ai (${taskName}) did not return a valid image URL.`);
    }

    console.log(`${taskName} completed successfully.`);
    return outputImageUrl;
  } catch (error) {
    console.error(`Error in Fal.ai ${taskName}:`, error);
    throw new Error(`${taskName} failed: ${(error as Error).message}`);
  }
}

/**
 * Removes background from an image using Fal.ai's rembg service
 * @param imageUrlOrDataUri The image data URI or public URL to process
 * @returns Promise<string> The URL of the processed image from Fal.ai
 */
export async function removeBackground(imageUrlOrDataUri: string, username: string): Promise<string> {
  return runFalImageWorkflow("fal-ai/rembg", { image_url: imageUrlOrDataUri }, 'Background Removal', username);
}

/**
 * Upscales and enhances an image using Fal.ai's sd-ultimateface service
 * @param imageUrlOrDataUri The image URL or data URI to process
 * @returns Promise<string> The URL of the processed image from Fal.ai
 */
export async function upscaleAndEnhance(imageUrlOrDataUri: string, username: string): Promise<string> {
  const input = {
    loadimage_1: imageUrlOrDataUri,
    prompt_upscale: UPSCALE_PROMPT,
    negative_upscale: NEGATIVE_UPSCALE_PROMPT,
    prompt_face: UPSCALE_FACE_PROMPT,
    negative_face: NEGATIVE_UPSCALE_FACE_PROMPT,
  };
  return runFalImageWorkflow("comfy/opj161/sd-ultimateface", input, 'Upscaling and Enhancement', username);
}

/**
 * Enhances faces in an image using Fal.ai's face-detailer service
 * @param imageUrlOrDataUri The image URL or data URI to process
 * @returns Promise<string> The URL of the processed image from Fal.ai
 */
export async function detailFaces(imageUrlOrDataUri: string, username: string): Promise<string> {
  const input = {
    loadimage_1: imageUrlOrDataUri,
    prompt_face: FACE_DETAILER_PROMPT,
    negative_face: NEGATIVE_FACE_DETAILER_PROMPT,
  };
  return runFalImageWorkflow("comfy/opj161/face-detailer", input, 'Face Detailing', username);
}

/**
 * Checks if the Fal.ai services are configured and available.
 * @returns {Promise<boolean>} True if the service is available, otherwise false.
 */
export async function isServiceAvailable(): Promise<boolean> {
  // Now, we can only check if the service is potentially available.
  // A true availability check would require a username to check for keys.
  // A simple check is to see if any global key is set.
  const globalKey = (await import('../settings.service')).getSetting('global_fal_api_key');
  const { decrypt } = await import('../encryption.service');
  return !!decrypt(globalKey);
}
