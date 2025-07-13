import { NextRequest, NextResponse } from 'next/server';
import { startVideoGenerationAndCreateHistory } from '@/ai/actions/generate-video.action';

export async function POST(request: NextRequest) {
  try {
    const videoInput = await request.json();
    
    const result = await startVideoGenerationAndCreateHistory(videoInput);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      taskId: result.taskId, 
      historyItemId: result.historyItemId,
      success: true 
    });
    
  } catch (error) {
    console.error('Error in video start API:', error);
    return NextResponse.json({ 
      error: 'Failed to start video generation' 
    }, { status: 500 });
  }
}
