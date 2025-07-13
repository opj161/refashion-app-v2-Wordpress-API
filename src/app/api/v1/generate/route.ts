// src/app/api/v1/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { createApiJob, processApiGenerationJob } from '@/actions/apiActions';
import { z } from 'zod';

const ModelAttributesSchema = z.object({
  gender: z.string(),
  bodyType: z.string(),
  bodySize: z.string(),
  ageRange: z.string(),
  ethnicity: z.string(),
  poseStyle: z.string(),
  background: z.string(),
  fashionStyle: z.string(),
  hairStyle: z.string(),
  modelExpression: z.string(),
  lightingType: z.string(),
  lightQuality: z.string(),
  cameraAngle: z.string(),
  lensEffect: z.string(),
  depthOfField: z.string(),
  timeOfDay: z.string(),
  overallMood: z.string(),
  fabricRendering: z.string(),
});

const GenerateRequestSchema = z.object({
  imageDataUri: z.string().optional(),
  imageUrl: z.string().url().optional(),
  parameters: ModelAttributesSchema,
  settingsMode: z.enum(['basic', 'advanced']).default('basic'),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await authenticateApiRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = GenerateRequestSchema.parse(body);

    // Use imageUrl if provided, otherwise imageDataUri
    const imageDataSource = validatedData.imageUrl || validatedData.imageDataUri;
    if (!imageDataSource) {
      return NextResponse.json({
        error: 'Either imageDataUri or imageUrl is required.'
      }, { status: 400 });
    }

    // Create job record
    const jobId = await createApiJob({
      username: user.username,
      imageDataUri: imageDataSource,
      parameters: validatedData.parameters,
      settingsMode: validatedData.settingsMode,
    });

    // Start processing in background (don't await)
    processApiGenerationJob(jobId, {
      imageDataUri: imageDataSource,
      parameters: validatedData.parameters,
      settingsMode: validatedData.settingsMode,
    }, user.username).catch(console.error);

    // Return immediately with job ID
    return NextResponse.json({
      jobId,
      status: 'processing'
    }, { status: 202 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    console.error('API generate error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
