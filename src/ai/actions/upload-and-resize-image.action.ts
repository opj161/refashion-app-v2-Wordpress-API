'use server';

import sharp from 'sharp';
import crypto from 'crypto';

const MAX_DIMENSION = 2048;

interface UploadAndResizeResult {
  dataUri: string;
  hash: string;
  originalWidth: number;
  originalHeight: number;
  resized: boolean;
}

/**
 * Receives an image file, checks if it's larger than MAX_DIMENSION,
 * resizes it if necessary, and returns the processed image as a data URI.
 * @param formData The form data containing the image file under the key 'file'.
 * @returns An object with the new data URI, hash, and resize information.
 */
export async function uploadAndResizeImageAction(formData: FormData): Promise<UploadAndResizeResult> {
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new Error('No file provided.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error('Could not read image metadata.');
  }

  let finalBuffer: Buffer = buffer;
  let resized = false;

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    console.log(`Image (${metadata.width}x${metadata.height}) is larger than ${MAX_DIMENSION}px. Resizing...`);
    finalBuffer = Buffer.from(await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer());
    resized = true;
    const newMetadata = await sharp(finalBuffer).metadata();
    console.log(`Resized to ${newMetadata.width}x${newMetadata.height}`);
  }

  const dataUri = `data:image/${metadata.format};base64,${finalBuffer.toString('base64')}`;

  const hash = crypto.createHash('sha256').update(finalBuffer).digest('hex');

  return {
    dataUri,
    hash,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    resized,
  };
}
