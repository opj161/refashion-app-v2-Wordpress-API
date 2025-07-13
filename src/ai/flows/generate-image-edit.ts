// This is a server-side file.
'use server';

/**
 * @fileOverview AI agent for editing an image based on a text prompt,
 * or generating an image purely from text if no source image is provided.
 * Generates three versions using different API keys.
 * Images are saved locally and their local paths are returned.
 * The source image can be provided as a data URI or a public HTTPS URL.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import fetch from 'node-fetch'; // For fetching image from URL
import fs from 'fs';
import path from 'path';
import { saveDataUriLocally } from '@/services/storage.service';
import { getApiKeyForUser } from '@/services/apiKey.service';
import { buildAIPrompt } from '@/lib/prompt-builder';

// NEW: Import Axios and HttpsProxyAgent for explicit proxy control
import axios, { AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Direct API configuration matching Python implementation
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// --- START Defined Types ---
interface GeminiPart {
  inlineData?: {
    mimeType: string;
    data: string;
  };
  text?: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiGenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  responseModalities: string[];
}

interface GeminiSafetySetting {
  category: string;
  threshold: string;
}

interface GeminiApiRequestBody {
  contents: GeminiContent[];
  generationConfig: GeminiGenerationConfig;
  safetySettings: GeminiSafetySetting[];
}

interface GeminiApiSuccessResponseCandidate {
  finishReason?: string;
  content?: {
    parts?: Array<GeminiPart>;
  };
  // Other candidate properties if relevant
}
interface GeminiApiSuccessResponse {
  candidates?: Array<GeminiApiSuccessResponseCandidate>;
  // Other top-level response properties if relevant
}

interface GeminiErrorDetail {
  message: string;
  // other fields like code, status if they exist
}

interface GeminiErrorData { // Renamed from GeminiErrorResponse to avoid conflict with actual HTTP response
  error?: GeminiErrorDetail | string;
}
// --- END Defined Types ---


/**
 * Make a direct API call to Gemini API with explicit proxy support using axios
 * This provides better proxy control than node-fetch's automatic detection
 */
async function makeGeminiApiCall(apiKey: string, requestBody: GeminiApiRequestBody): Promise<GeminiApiSuccessResponse> {
  const url = `${BASE_URL}?key=${apiKey}`;
  
  let httpsAgent;
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl.replace(/\/\/.*@/, '//***:***@')}`);
    httpsAgent = new HttpsProxyAgent(proxyUrl);
  } else {
    console.log('No HTTPS_PROXY environment variable set. Making direct call.');
  }

  console.log(`Making Axios API call to: ${url.replace(/key=.*/, 'key=***')}`);
  
  try {
    const response = await axios.post<GeminiApiSuccessResponse>(url, requestBody, { // Added type to axios.post
      headers: { 'Content-Type': 'application/json' },
      httpsAgent: httpsAgent,
    });

    console.log(`Gemini API response status: ${response.status}`);
    return response.data;

  } catch (error) {
    console.error('Error calling Gemini API:', axios.isAxiosError(error) ? error.toJSON() : error);
    
    if (axios.isAxiosError<GeminiErrorData>(error) && error.response) {
      console.error("Axios error response data:", error.response.data);
      const errData = error.response.data.error;
      const message = (typeof errData === 'string' ? errData : errData?.message) || JSON.stringify(error.response.data);
      throw new Error(`Gemini API Error (${error.response.status}): ${message}`);
    }
    
    const generalError = error as Error;
    throw new Error(`Failed to call Gemini API: ${generalError.message}`);
  }
}

const GenerateImageEditInputSchema = z.object({
  prompt: z.string().optional().describe('The prompt to use for generating or editing the image.'),
  parameters: z.any().optional().describe('The parameters object to build the prompt from.'),
  settingsMode: z.enum(['basic', 'advanced']).optional().describe('The settings mode for prompt construction.'),
  imageDataUriOrUrl: z
    .string()
    .optional()
    .describe(
      "Optional: The image to edit, as a data URI (e.g., 'data:image/png;base64,...') or a publicly accessible HTTPS URL."
    ),
});
export type GenerateImageEditInput = z.infer<typeof GenerateImageEditInputSchema>;

const SingleImageOutputSchema = z.object({
  editedImageUrl: z
    .string()
    .describe('The URL or local path of the generated or edited image.'),
});
export type SingleImageOutput = z.infer<typeof SingleImageOutputSchema>;

async function performSingleImageGeneration(
  input: GenerateImageEditInput,
  flowIdentifier: string,
  username: string,
  keyIndex: 1 | 2 | 3
): Promise<SingleImageOutput> {
  const apiKey = await getApiKeyForUser(username, 'gemini', keyIndex);

  let sourceImageDataForModelProcessing: { mimeType: string; data: string; } | null = null;
  if (input.imageDataUriOrUrl) {
    let dataUriToProcess = input.imageDataUriOrUrl;
    if (input.imageDataUriOrUrl.startsWith('http://') || input.imageDataUriOrUrl.startsWith('https://')) {
      try {
        console.log(`Fetching image from URL for ${flowIdentifier}: ${input.imageDataUriOrUrl}`);
        const response = await fetch(input.imageDataUriOrUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL (${input.imageDataUriOrUrl}): ${response.status} ${response.statusText}`);
        }
        const imageBuffer = await response.buffer();
        const mimeType = response.headers.get('content-type') || 'image/png';
        if (!mimeType.startsWith('image/')) {
          throw new Error(`Fetched content from URL (${input.imageDataUriOrUrl}) is not an image: ${mimeType}`);
        }
        dataUriToProcess = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        console.log(`Successfully converted URL to data URI for ${flowIdentifier}. MimeType: ${mimeType}`);
      } catch (fetchError: unknown) { // Changed to unknown
        console.error(`Error fetching or converting image URL for ${flowIdentifier}:`, fetchError);
        throw new Error(`Failed to process source image from URL for ${flowIdentifier}: ${(fetchError as Error).message}`);
      }
    } else if (input.imageDataUriOrUrl.startsWith('/')) {
      try {
        const absolutePath = path.join(process.cwd(), 'public', input.imageDataUriOrUrl);
        if (fs.existsSync(absolutePath)) {
          const imageBuffer = fs.readFileSync(absolutePath);
          let mimeType = 'image/png';
          if (input.imageDataUriOrUrl.endsWith('.jpg') || input.imageDataUriOrUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (input.imageDataUriOrUrl.endsWith('.webp')) mimeType = 'image/webp';
          else if (input.imageDataUriOrUrl.endsWith('.gif')) mimeType = 'image/gif';
          dataUriToProcess = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          console.log(`Successfully converted local path ${input.imageDataUriOrUrl} to data URI for ${flowIdentifier}.`);
        } else {
          throw new Error(`Local image file not found at ${absolutePath}`);
        }
      } catch (localFileError: unknown) { // Changed to unknown
        console.error(`Error reading local image file for ${flowIdentifier}:`, localFileError);
        throw new Error(`Failed to process local source image for ${flowIdentifier}: ${(localFileError as Error).message}`);
      }
    }
    const match = dataUriToProcess.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      sourceImageDataForModelProcessing = { mimeType: match[1], data: match[2] };
    } else if (input.imageDataUriOrUrl) {
        console.warn(`Could not parse processed image data URI for ${flowIdentifier}. Original input: ${input.imageDataUriOrUrl}`);
    }
  }
  const parts: GeminiPart[] = []; // Typed parts
  
  if (sourceImageDataForModelProcessing) {
    parts.push({
      inlineData: {
        mimeType: sourceImageDataForModelProcessing.mimeType,
        data: sourceImageDataForModelProcessing.data,
      },
    });
  }
  parts.push({ text: input.prompt });
  const requestBody: GeminiApiRequestBody = { // Typed requestBody
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseModalities: ["image", "text"]
    },
    safetySettings: [
      {
        "category": "HARM_CATEGORY_CIVIC_INTEGRITY",
        "threshold": "BLOCK_NONE"
      }
    ]
  };
  console.log(`Calling Gemini API directly for ${flowIdentifier} with model gemini-2.0-flash-exp`);
  console.log(`With API Key: ${apiKey ? 'SET' : 'NOT SET'}`);
  if (sourceImageDataForModelProcessing) {
    console.log(`WITH IMAGE: ${sourceImageDataForModelProcessing.mimeType}`);
  } else {
    console.log(`Performing text-to-image generation for ${flowIdentifier} as no source image was provided or processed.`);
  }
  
  const maxAttempts = 3;
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    attempt++;
    try {
      console.log(`🔍 ATTEMPT ${attempt}/${maxAttempts} to generate image for ${flowIdentifier}`);
      const result = await makeGeminiApiCall(apiKey, requestBody);
      
      let generatedImageDataUri: string | null = null;
      
      if (result && result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
          console.warn(`Image generation blocked by safety settings for ${flowIdentifier}. Candidate:`, JSON.stringify(candidate, null, 2));
          throw new Error(`Image generation blocked by safety settings for ${flowIdentifier}.`);
        }
        
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const mimeType = part.inlineData.mimeType;
              const base64Data = part.inlineData.data;
              generatedImageDataUri = `data:${mimeType};base64,${base64Data}`;
              console.log(`🔍 Image received from ${flowIdentifier} via REST. MimeType: ${mimeType}`);
              break;
            } else if (part.text) {
              console.log(`🔍 Text response from ${flowIdentifier}: ${part.text}`);
            }
          }
        }
      }

      if (!generatedImageDataUri) {
        console.error(`🔍 AI for ${flowIdentifier} (REST) did not return an image. Full API Response:`, JSON.stringify(result, null, 2));
        if (attempt < maxAttempts) {
          console.log(`🔍 No image data in response, attempt ${attempt}/${maxAttempts}`);
          continue;
        } else {
          throw new Error(`AI for ${flowIdentifier} (REST) did not return image data.`);
        }
      }      console.log(`🔍 Successfully generated image on attempt ${attempt}/${maxAttempts} for ${flowIdentifier}`);
      
      try {
        const { relativeUrl: imageUrl } = await saveDataUriLocally(
          generatedImageDataUri,
          `RefashionAI_generated_${flowIdentifier}`,
          'generated_images'
        );
        return { editedImageUrl: imageUrl };
      } catch (uploadError: unknown) { // Changed to unknown
        const knownUploadError = uploadError as Error;
        console.error(`Error storing image from ${flowIdentifier} (axios):`, knownUploadError);
        throw new Error(`Failed to store image from ${flowIdentifier} (axios): ${knownUploadError.message}`);
      }
      
    } catch (error: unknown) { // Changed to unknown
      const knownError = error as Error;
      console.error(`🔍 Error in attempt ${attempt} for ${flowIdentifier}:`, knownError.message);
      
      if (attempt < maxAttempts) {
        console.log(`Retrying in 1 second... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        throw error; // Rethrow the original error (now typed as unknown)
      }
    }
  }
  
  throw new Error(`Failed to generate image after ${maxAttempts} attempts for ${flowIdentifier}`);
}

async function generateImageFlow1(input: GenerateImageEditInput, username: string): Promise<SingleImageOutput> {
  return performSingleImageGeneration(input, 'flow1', username, 1);
}

async function generateImageFlow2(input: GenerateImageEditInput, username: string): Promise<SingleImageOutput> {
  return performSingleImageGeneration(input, 'flow2', username, 2);
}

async function generateImageFlow3(input: GenerateImageEditInput, username: string): Promise<SingleImageOutput> {
  return performSingleImageGeneration(input, 'flow3', username, 3);
}

const GenerateMultipleImagesOutputSchema = z.object({
  editedImageUrls: z.array(z.string().nullable()).length(3)
    .describe('An array of three generated or edited image URLs/paths (or null for failures).'),
  constructedPrompt: z.string().describe('The final prompt that was sent to the AI.'),
  errors: z.array(z.string().nullable()).optional()
    .describe('An array of error messages if any generation or storage failed.'),
});
export type GenerateMultipleImagesOutput = z.infer<typeof GenerateMultipleImagesOutputSchema>;


export async function generateImageEdit(input: GenerateImageEditInput, username: string): Promise<GenerateMultipleImagesOutput> {
  if (!username) {
    throw new Error('Username is required to generate images.');
  }

  // Construct the prompt from parameters if provided
  let constructedPrompt: string;
  if (input.parameters) {
    constructedPrompt = buildAIPrompt({
      type: 'image',
      params: {
        ...input.parameters,
        settingsMode: input.settingsMode || 'basic'
      }
    });
  } else if (input.prompt) {
    constructedPrompt = input.prompt;
  } else {
    throw new Error('Either parameters or prompt must be provided');
  }

  // Create input with the constructed prompt for the generation flows
  const inputForGeneration: GenerateImageEditInput = {
    ...input,
    prompt: constructedPrompt,
  };

  const results = await Promise.allSettled([
    generateImageFlow1(inputForGeneration, username),
    generateImageFlow2(inputForGeneration, username),
    generateImageFlow3(inputForGeneration, username),
  ]);

  const editedImageUrlsResult: (string | null)[] = [null, null, null];
  const errorsResult: (string | null)[] = [null, null, null];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      editedImageUrlsResult[index] = result.value.editedImageUrl;
    } else {
      console.error(`Error from flow ${index + 1}:`, result.reason);
      // Ensure result.reason is an Error before accessing .message
      const reasonError = result.reason as Error;
      errorsResult[index] = `Image ${index + 1} processing failed: ${reasonError?.message || 'Unknown error'}`;
    }
  });

  return {
    editedImageUrls: editedImageUrlsResult,
    constructedPrompt: constructedPrompt,
    errors: errorsResult.some(e => e !== null) ? errorsResult : undefined
  };
}

export async function regenerateSingleImage(input: GenerateImageEditInput, flowIndex: number, username: string): Promise<SingleImageOutput> {
  if (!username) {
    throw new Error('Username is required to re-roll an image.');
  }
  console.log(`Attempting to re-roll image for flow index: ${flowIndex}`);
  switch (flowIndex) {
    case 0:
      return performSingleImageGeneration(input, 'flow1-reroll', username, 1);
    case 1:
      return performSingleImageGeneration(input, 'flow2-reroll', username, 2);
    case 2:
      return performSingleImageGeneration(input, 'flow3-reroll', username, 3);
    default:
      throw new Error(`Invalid flow index: ${flowIndex}. Must be 0, 1, or 2.`);
  }
}
