import { NextRequest, NextResponse } from 'next/server';
import { updateVideoHistoryItem } from '@/actions/historyActions';
import { saveFileFromUrl } from '@/services/storage.service';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const bodyText = await request.text();
    const bodyBuffer = Buffer.from(bodyText, 'utf-8');
    
    // Parse the JSON after we have the raw body
    let result;
    try {
      result = JSON.parse(bodyText);
    } catch (error) {
      console.error('Invalid JSON in webhook body:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const url = new URL(request.url);
    console.log('Webhook received:', JSON.stringify(result, null, 2));

    // WARNING: Signature verification is not implemented.
    // For production, it's highly recommended to implement webhook signature verification
    // to ensure requests are genuinely from Fal.ai.
    console.warn('Webhook signature verification disabled - processing request without verification');

    // Extract our custom payload from query parameters
    const historyItemId = url.searchParams.get('historyItemId');
    const username = url.searchParams.get('username');

    if (!historyItemId || !username) {
      console.error('Webhook received incomplete params:', { historyItemId, username });
      return NextResponse.json({ error: 'Incomplete webhook parameters' }, { status: 400 });
    }

    // Check if the result indicates an error (Fal.ai webhook format)
    if (result.status === 'ERROR' || result.error) {
      console.error('fal.ai returned error:', result.error || 'Unknown error');
      
      // Update history item with error status
      await updateVideoHistoryItem({
        username,
        historyItemId,
        videoUrls: [null],
        localVideoUrl: null,
        seedUsed: null,
        status: 'failed',
        error: result.error || 'Video generation failed'
      });

      return NextResponse.json({ success: true, handled: 'error' });
    }

    // Extract video result for successful generation (Fal.ai webhook format)
    if (result.status !== 'OK') {
      console.error('Unexpected status from fal.ai:', result.status);
      
      await updateVideoHistoryItem({
        username,
        historyItemId,
        videoUrls: [null],
        localVideoUrl: null,
        seedUsed: null,
        status: 'failed',
        error: `Unexpected status: ${result.status}`
      });

      return NextResponse.json({ success: true, handled: 'unexpected_status' });
    }

    const falVideoUrl = result.payload?.video?.url;
    const seedUsed = result.payload?.seed;

    if (!falVideoUrl) {
      console.error('No video URL in successful result:', result.payload);
      
      await updateVideoHistoryItem({
        username,
        historyItemId,
        videoUrls: [null],
        localVideoUrl: null,
        seedUsed: seedUsed,
        status: 'failed',
        error: 'No video URL returned from fal.ai'
      });

      return NextResponse.json({ success: true, handled: 'no_video' });
    }

    // Download the video from the temporary fal.ai URL and save it locally
    const { relativeUrl: localVideoUrl } = await saveFileFromUrl(falVideoUrl, 'RefashionAI_video', 'generated_videos', 'mp4');
    
    // 6. Update the history item with the final details
    await updateVideoHistoryItem({
      username,
      historyItemId,
      videoUrls: [falVideoUrl], // Store remote URL for potential future use
      localVideoUrl: localVideoUrl,
      seedUsed: seedUsed,
      status: 'completed'
    });

    console.log(`Webhook processed successfully for history item ${historyItemId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing fal.ai webhook:', error);
    
    // Try to update the history item with error status if we have the params
    try {
      const url = new URL(request.url);
      const historyItemId = url.searchParams.get('historyItemId');
      const username = url.searchParams.get('username');
      
      if (historyItemId && username) {
        await updateVideoHistoryItem({
          username,
          historyItemId,
          videoUrls: [null],
          localVideoUrl: null,
          seedUsed: null,
          status: 'failed',
          error: 'Webhook processing failed'
        });
      }
    } catch (updateError) {
      console.error('Failed to update history item with error status:', updateError);
    }
    
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
