// src/lib/api-auth.ts
import { NextRequest } from 'next/server';
import { findUserByApiKey } from '@/services/database.service';
import type { SessionUser } from '@/lib/types';

export async function authenticateApiRequest(request: NextRequest): Promise<SessionUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const apiKey = authHeader.substring(7);
  if (!apiKey) {
    return null;
  }

  const user = findUserByApiKey(apiKey);
  
  if (user) {
    return {
      username: user.username,
      role: user.role as 'admin' | 'user',
      isLoggedIn: true,
    };
  }
  
  return null;
}
