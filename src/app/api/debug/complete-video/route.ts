import { NextRequest, NextResponse } from 'next/server';
import { updateVideoHistoryItem } from '@/actions/historyActions';
import { getCurrentUser } from '@/actions/authActions';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { historyItemId, localVideoUrl, remoteVideoUrl, seed } = await request.json();

    if (!historyItemId) {
      return NextResponse.json({ error: 'historyItemId is required' }, { status: 400 });
    }

    // Simulate webhook completion
    await updateVideoHistoryItem({
      username: user.username,
      historyItemId,
      videoUrls: [remoteVideoUrl || 'https://example.com/test-video.mp4'],
      localVideoUrl: localVideoUrl || '/uploads/generated_videos/test-video.mp4',
      seedUsed: seed || 12345,
      status: 'completed'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Video marked as completed',
      historyItemId,
      localVideoUrl,
      remoteVideoUrl
    });

  } catch (error) {
    console.error('Error in test completion:', error);
    return NextResponse.json({ 
      error: 'Failed to mark video as completed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
