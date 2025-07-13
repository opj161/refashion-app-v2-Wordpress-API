'use server';

/**
 * @fileOverview Centralized storage service for handling file downloads and local storage
 * 
 * This service provides a unified way to download files from URLs and save them locally
 * with proper permissions and naming conventions. It eliminates code duplication across
 * different actions that need to save files.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Downloads a file from a URL and saves it locally with proper permissions
 * @param sourceUrl The URL to download the file from
 * @param fileNamePrefix The prefix to use for the generated filename
 * @param subfolder The subfolder within /public/uploads/ to save to
 * @param extension The file extension (defaults to 'png')
 * @returns Promise<string> The relative URL path to the saved file
 */
export async function saveFileFromUrl(
  sourceUrl: string, 
  fileNamePrefix: string, 
  subfolder: string,
  extension: string = 'png'
): Promise<{ relativeUrl: string; hash: string }> {
  console.log(`Downloading from ${sourceUrl} to save in /uploads/${subfolder}`);
  try {
    // Download the file from the URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Convert to buffer
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    
    // Calculate hash of the file content
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Generate unique filename
    const uniqueFileName = `${fileNamePrefix}_${uuidv4()}.${extension}`;
    
    // Create upload directory path
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Write file
    const filePath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(filePath, fileBuffer);

    // Set proper permissions and ownership
    try {
      await fs.chmod(filePath, 0o664); // More secure default than 777
      console.log(`Set file permissions to 664 for: ${filePath}`);
    } catch (chmodError) {
      console.warn(`Warning: Could not set file permissions for ${filePath}:`, chmodError);
    }

    // Set proper ownership using PUID/PGID if available
    const puid = process.env.PUID;
    const pgid = process.env.PGID;
    if (puid && pgid) {
      try {
        await fs.chown(filePath, parseInt(puid), parseInt(pgid));
        console.log(`Set file ownership to ${puid}:${pgid} for: ${filePath}`);
      } catch (chownError) {
        console.warn(`Warning: Could not set file ownership for ${filePath}:`, chownError);
      }
    }
    
    // Return relative URL
    const relativeUrl = `/uploads/${subfolder}/${uniqueFileName}`;
    console.log(`File saved to: ${filePath}, accessible at: ${relativeUrl}`);
    return { relativeUrl, hash: fileHash };
    
  } catch (error) {
    console.error(`Error saving file from ${sourceUrl}:`, error);
    throw new Error(`Failed to save file from URL: ${(error as Error).message}`);
  }
}

/**
 * Saves a data URI (base64 encoded image) locally with proper permissions
 * @param dataUri The data URI to save (e.g., "data:image/png;base64,...")
 * @param fileNamePrefix The prefix to use for the generated filename
 * @param subfolder The subfolder within /public/uploads/ to save to
 * @returns Promise<string> The relative URL path to the saved file
 */
export async function saveDataUriLocally(
  dataUri: string,
  fileNamePrefix: string,
  subfolder: string
): Promise<{ relativeUrl: string; hash: string }> {
  console.log(`Saving data URI to /uploads/${subfolder}`);
  try {
    // Parse data URI
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URI format');
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'png';
    // Calculate hash
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    // Generate unique filename
    const uniqueFileName = `${fileNamePrefix}_${uuidv4()}.${extension}`;
    
    // Create upload directory path
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Write file
    const filePath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    // Set proper permissions and ownership
    try {
      await fs.chmod(filePath, 0o664);
      console.log(`Set file permissions to 664 for: ${filePath}`);
    } catch (chmodError) {
      console.warn(`Warning: Could not set file permissions for ${filePath}:`, chmodError);
    }

    const puid = process.env.PUID;
    const pgid = process.env.PGID;
    if (puid && pgid) {
      try {
        await fs.chown(filePath, parseInt(puid), parseInt(pgid));
        console.log(`Set file ownership to ${puid}:${pgid} for: ${filePath}`);
      } catch (chownError) {
        console.warn(`Warning: Could not set file ownership for ${filePath}:`, chownError);
      }
    }
    
    // Return relative URL
    const relativeUrl = `/uploads/${subfolder}/${uniqueFileName}`;
    console.log(`Data URI saved to: ${filePath}, accessible at: ${relativeUrl}`);
    return { relativeUrl, hash: fileHash };
  } catch (error) {
    console.error(`Error saving data URI:`, error);
    throw new Error(`Failed to save data URI: ${(error as Error).message}`);
  }
}
