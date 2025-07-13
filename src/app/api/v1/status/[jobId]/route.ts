// src/app/api/v1/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { findHistoryItemById } from '@/services/database.service';
import { getDisplayableImageUrl } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    // Authenticate
    const user = await authenticateApiRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract jobId from params
    const { jobId } = await params;

    // Look up job status
    const historyItem = findHistoryItemById(jobId);
    if (!historyItem) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify ownership
    if (historyItem.username !== user.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return response based on status
    if (historyItem.status === 'processing') {
      return NextResponse.json({
        jobId,
        status: 'processing'
      });
    } else if (historyItem.status === 'completed') {
      // Use the public app URL from environment variables for correct URL construction.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl) {
        console.error('CRITICAL: NEXT_PUBLIC_APP_URL is not set. Cannot form absolute URLs for API response.');
        return NextResponse.json({ error: 'Server configuration error: App URL not set.' }, { status: 500 });
      }

      // Use the getDisplayableImageUrl utility to create PROXY URLs
      const proxiedUrls = historyItem.editedImageUrls
        .filter((url): url is string => !!url) // Ensure we only process non-null URLs
        .map(url => getDisplayableImageUrl(url));
        
      // Make sure the URLs are absolute before sending them to the external plugin
      const absoluteImageUrls = proxiedUrls
        .filter((url): url is string => !!url)
        .map(url => url.startsWith('http') ? url : `${baseUrl}${url}`);

      return NextResponse.json({
        jobId,
        status: 'completed',
        generatedImageUrls: absoluteImageUrls
      });
    } else if (historyItem.status === 'failed') {
      return NextResponse.json({
        jobId,
        status: 'failed',
        error: historyItem.error || 'Unknown error occurred'
      });
    } else {
      return NextResponse.json({
        jobId,
        status: 'unknown'
      });
    }

  } catch (error) {
    console.error('API status error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
