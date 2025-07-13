import { NextRequest, NextResponse } from 'next/server';
import { uploadToFalStorage, isFalVideoGenerationAvailable } from '@/ai/actions/generate-video.action';
import { Buffer } from 'buffer';
import { getCurrentUser } from '@/actions/authActions';

// Helper function to convert Data URI to Blob
function dataURItoBlob(dataURI: string): Blob {
  const byteString = Buffer.from(dataURI.split(',')[1], 'base64').toString('binary');
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (!(await isFalVideoGenerationAvailable())) {
      return NextResponse.json(
        { success: false, error: 'Image upload service is not configured (FAL_KEY missing).' },
        { status: 503 }
      );
    }

    let file: File | Blob;
    let fileName: string = 'uploaded_image.png'; // Default filename

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const inputFile = formData.get('file') as File;
      if (!inputFile) {
        return NextResponse.json({ success: false, error: 'No file provided in formData' }, { status: 400 });
      }
      file = inputFile;
      fileName = inputFile.name;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      const imageDataUri = body.imageDataUri as string;
      if (!imageDataUri) {
        return NextResponse.json({ success: false, error: 'No imageDataUri provided in JSON body' }, { status: 400 });
      }
      file = dataURItoBlob(imageDataUri);
      // Attempt to extract a meaningful filename or use a default
      const mimeType = imageDataUri.match(/data:(image\/\w+);base64,/)?.[1] || 'image/png';
      const extension = mimeType.split('/')[1] || 'png';
      fileName = `cropped_image_${Date.now()}.${extension}`;
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported Content-Type' }, { status: 415 });
    }

    // Validate file type (extracted from Blob/File)
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'image/heic', 'image/heif', 'image/avif',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    console.log(`Processing image for Fal Storage upload: ${fileName}, type: ${file.type}, size: ${file.size} bytes`);

    // Ensure 'file' is a File object if 'uploadToFalStorage' expects it
    // The current `uploadToFalStorage` in `generate-video.ts` takes `File | Blob`
    // so no explicit conversion is needed here if `file` is already a Blob from dataURI.
    const falImageUrl = await uploadToFalStorage(file, user.username);

    console.log(`File uploaded to Fal Storage, URL: ${falImageUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl: falImageUrl,
      fileName: fileName
    });

  } catch (error: any) {
    console.error('Error in image upload endpoint:', error);
    let errorMessage = 'Internal server error during image upload.';
    if (error.message) {
      errorMessage = error.message;
    }
    if (error.message && error.message.toLowerCase().includes('fal_key')) {
      return NextResponse.json(
        { success: false, error: 'Image upload service is not configured (FAL_KEY missing for storage).' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
