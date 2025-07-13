// src/app/api/history/[itemId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHistoryItemStatus } from '@/services/database.service';
import { getCurrentUser } from '@/actions/authActions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { itemId } = await params;
    if (!itemId) {
      return NextResponse.json({ error: 'History item ID is required' }, { status: 400 });
    }

    // Use our new, efficient, and secure database function
    const statusPayload = getHistoryItemStatus(itemId, user.username);

    if (!statusPayload) {
      return NextResponse.json(
        { error: 'History item not found or you do not have permission to view it.' },
        { status: 404 }
      );
    }
    
    // Return the specific status payload
    return NextResponse.json(statusPayload, { status: 200 });

  } catch (error) {
    console.error(`Error fetching status for history item:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to fetch status', details: errorMessage }, { status: 500 });
  }
}
