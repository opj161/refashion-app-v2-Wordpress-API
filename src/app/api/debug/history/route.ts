import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/actions/authActions';
import { getUserHistory, getVideoHistoryPaginated } from '@/actions/historyActions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get all user history (both image and video)
    const imageHistory = await getUserHistory();
    
    // Get video history separately with status information
    const videoHistoryResult = await getVideoHistoryPaginated(1, 100);
    
    // Add detailed debugging information
    const debugInfo = {
      user: user.username,
      imageHistoryCount: imageHistory.length,
      videoHistoryCount: videoHistoryResult.items.length,
      videoHistoryItems: videoHistoryResult.items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        hasVideoGenerationParams: !!item.videoGenerationParams,
        videoGenerationStatus: (item.videoGenerationParams as any)?.status,
        hasLocalVideoUrl: !!item.videoGenerationParams?.localVideoUrl,
        hasGeneratedVideoUrls: !!item.generatedVideoUrls,
        generatedVideoUrlsCount: item.generatedVideoUrls?.length || 0,
        nonNullVideoUrls: item.generatedVideoUrls?.filter(url => url !== null).length || 0,
        localVideoUrl: item.videoGenerationParams?.localVideoUrl,
        generatedVideoUrls: item.generatedVideoUrls,
        videoGenerationParams: item.videoGenerationParams
      })),
      itemsWithVideoParams: imageHistory.filter(item => !!item.videoGenerationParams).map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        status: (item.videoGenerationParams as any)?.status,
        hasLocalVideoUrl: !!item.videoGenerationParams?.localVideoUrl,
        localVideoUrl: item.videoGenerationParams?.localVideoUrl
      }))
    };
    
    return NextResponse.json({
      imageHistory,
      videoHistory: videoHistoryResult.items,
      debug: debugInfo,
      success: true
    });

  } catch (error) {
    console.error('Error fetching debug history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
