'use server';

/**
 * @fileOverview Server action for background removal using Fal.ai API
 * 
 * This action orchestrates the background removal process by calling the Fal.ai
 * service and saving the result locally using the storage service.
 */

import * as falImageService from '@/services/fal-api/image.service';
import { saveFileFromUrl } from '@/services/storage.service';
import { getCachedImage, setCachedImage } from './cache-manager';
import { getCurrentUser } from '@/actions/authActions';

/**
 * Remove background from a user-uploaded image
 * @param imageUrlOrDataUri The original image as a data URI or public URL
 * @param imageHash Optional hash of the original image for caching
 * @param originalFileName Optional original filename for reference
 * @returns Promise an object containing the local relative path of the background-removed image
 */
export async function removeBackgroundAction(
  imageUrlOrDataUri: string,
  imageHash?: string
): Promise<{ savedPath: string; outputHash: string }> {
  if (!imageUrlOrDataUri) {
    throw new Error('Image data URI or URL is required for background removal');
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required for background removal.');
  }

  // Check cache first if hash is provided
  if (imageHash) {
    const cachedEntry = await getCachedImage(imageHash, 'bgRemoved');
    if (cachedEntry) {
      console.log(`[Cache] HIT: Found background-removed image for hash ${imageHash} at path ${cachedEntry.path}`);
      return { savedPath: cachedEntry.path, outputHash: cachedEntry.hash };
    }
    console.log(`[Cache] MISS: No cached background-removed image for hash ${imageHash}`);
  }
  
  try {
    console.log('Starting background removal process with Fal.ai...');

    // Remove background using Fal.ai service
    const outputImageUrl = await falImageService.removeBackground(imageUrlOrDataUri, user.username);
    
    console.log(`Fal.ai processed image URL: ${outputImageUrl}`);

    // Save the processed image locally using the storage service
    const { relativeUrl, hash: outputHash } = await saveFileFromUrl(
      outputImageUrl, 
      'RefashionAI_bg_removed', 
      'processed_images', 
      'png'
    );
    
    // Cache the result if hash is provided
    if (imageHash) {
      await setCachedImage(imageHash, 'bgRemoved', relativeUrl, outputHash);
      console.log(`[Cache] SET: Stored background-removed image for hash ${imageHash}`);
    }
    
    console.log('Background removal completed successfully using Fal.ai.');
    return { savedPath: relativeUrl, outputHash };
    
  } catch (error) {
    console.error('Error in background removal action (Fal.ai):', error);
    throw new Error(`Background removal with Fal.ai failed: ${(error as Error).message}`);
  }
}

/**
 * Checks if the background removal service is configured and available.
 * @returns {Promise<boolean>} True if the service is available, otherwise false.
 */
export async function isBackgroundRemovalAvailable(): Promise<boolean> {
  return await falImageService.isServiceAvailable();
}
