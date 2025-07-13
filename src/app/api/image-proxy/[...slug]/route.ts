import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;

  if (!slug || !Array.isArray(slug)) {
    return new NextResponse('Invalid image path', { status: 400 });
  }

  const imageSubPath = slug.join('/');

  // Enhanced path sanitization
  const intendedBaseDir = path.resolve(process.cwd(), 'public', 'uploads');
  const requestedFilePath = path.resolve(intendedBaseDir, imageSubPath);

  // Check if the resolved path is still within the intended base directory
  if (!requestedFilePath.startsWith(intendedBaseDir + path.sep)) {
    // path.sep is added to ensure "startsWith" doesn't match a directory that is a prefix of intendedBaseDir
    // e.g. /public/uploads-something if intendedBaseDir is /public/uploads
    // Although with path.resolve this is less likely, it's a good safeguard.
    // More importantly, this catches directory traversal like /public/uploads/../../secret.txt
    // where requestedFilePath would resolve to /secret.txt
    console.warn(`[IMAGE-PROXY] Directory traversal attempt or invalid path structure:
      Base: ${intendedBaseDir}
      SubPath: ${imageSubPath}
      Resolved: ${requestedFilePath}`);
    return new NextResponse('Invalid path', { status: 400 });
  }

  // The requestedFilePath is now considered safe for existence check
  console.log(`[IMAGE-PROXY] Attempting to serve image from: ${requestedFilePath}`);

  if (fs.existsSync(requestedFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(requestedFilePath);
      const mimeType = mime.lookup(requestedFilePath) || 'application/octet-stream';
      
      console.log(`[IMAGE-PROXY] Successfully serving ${requestedFilePath} as ${mimeType}`);
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: { 
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error('[IMAGE-PROXY] Error serving image:', error);
      return new NextResponse('Error serving file', { status: 500 });
    }
  } else {
    console.log(`[IMAGE-PROXY] Image not found at: ${requestedFilePath}`);
    return new NextResponse('Image not found', { status: 404 });
  }
}
