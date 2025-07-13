// @ts-nocheck
import { POST } from './route'; // Assuming route.ts is in the same directory
import { NextRequest } from 'next/server';
import { uploadToFalStorage, isFalVideoGenerationAvailable } from '@/ai/actions/generate-video.action';

// Mock dependencies
jest.mock('@/ai/actions/generate-video.action', () => ({
  uploadToFalStorage: jest.fn(),
  isFalVideoGenerationAvailable: jest.fn(),
}));

// Helper to create a mock NextRequest
function createMockRequest(body: any, contentType: string): NextRequest {
  const request = new NextRequest('http://localhost/api/upload-user-image', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: contentType.includes('json') ? JSON.stringify(body) : body, // body for FormData would be FormData itself
  });
  return request;
}

// Test dataURItoBlob (extracted and made available for testing, or tested via API behavior)
// For simplicity here, we'll test its effect through the API route.
// If it were exported, we'd test it directly:
// import { dataURItoBlob } from './route'; // if exported
// describe('dataURItoBlob', () => { ... })

describe('/api/upload-user-image POST', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (uploadToFalStorage as jest.Mock).mockReset();
    (isFalVideoGenerationAvailable as jest.Mock).mockReset();
  });

  it('should return 503 if Fal service is unavailable', async () => {
    (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(false);
    const request = createMockRequest({}, 'application/json');
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.success).toBe(false);
    expect(json.error).toContain('FAL_KEY missing');
  });

  it('should return 415 for unsupported content type', async () => {
    (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
    const request = createMockRequest({}, 'text/plain');
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(415);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unsupported Content-Type');
  });

  describe('JSON imageDataUri uploads', () => {
    const testImageDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 black PNG

    it('should successfully process imageDataUri and call uploadToFalStorage', async () => {
      (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
      (uploadToFalStorage as jest.Mock).mockResolvedValue('http://fake.fal.url/image.png');

      const request = createMockRequest({ imageDataUri: testImageDataUri }, 'application/json');
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.imageUrl).toBe('http://fake.fal.url/image.png');
      expect(json.fileName).toMatch(/^cropped_image_\d+\.png$/);
      expect(uploadToFalStorage).toHaveBeenCalledTimes(1);
      const blobArg = (uploadToFalStorage as jest.Mock).mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('image/png');
      expect(blobArg.size).toBeGreaterThan(0);
    });

    it('should return 400 if imageDataUri is missing in JSON', async () => {
      (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
      const request = createMockRequest({}, 'application/json'); // Empty JSON body
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe('No imageDataUri provided in JSON body');
    });

    it('should handle errors from uploadToFalStorage', async () => {
        (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
        (uploadToFalStorage as jest.Mock).mockRejectedValue(new Error('Fal storage failed'));

        const request = createMockRequest({ imageDataUri: testImageDataUri }, 'application/json');
        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toBe('Fal storage failed');
      });
  });

  describe('FormData file uploads', () => {
    it('should successfully process FormData file and call uploadToFalStorage', async () => {
      (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
      (uploadToFalStorage as jest.Mock).mockResolvedValue('http://fake.fal.url/formdata.jpg');

      const mockFile = new File(['dummy content'], 'formdata.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);

      // For FormData, the body is the FormData object itself, and NextRequest handles it.
      // However, creating a realistic NextRequest with FormData body in Jest without a browser env is tricky.
      // We'll simulate the structure the route expects after request.formData()

      const request = new NextRequest('http://localhost/api/upload-user-image', {
        method: 'POST',
        body: formData,
        // Content-Type header is automatically set by FormData in browsers/fetch,
        // but might need explicit mock if createMockRequest doesn't handle it well.
        // For this test, we assume NextRequest constructor or test env handles it.
      });

      // If direct FormData in NextRequest constructor is problematic in test env:
      // We might need to mock request.formData() itself.
      // jest.spyOn(request, 'formData').mockResolvedValue(formData);


      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.imageUrl).toBe('http://fake.fal.url/formdata.jpg');
      expect(json.fileName).toBe('formdata.jpg');
      expect(uploadToFalStorage).toHaveBeenCalledTimes(1);
      const fileArg = (uploadToFalStorage as jest.Mock).mock.calls[0][0] as File;
      expect(fileArg).toBeInstanceOf(File);
      expect(fileArg.name).toBe('formdata.jpg');
      expect(fileArg.type).toBe('image/jpeg');
    });

    it('should return 400 if no file is provided in FormData', async () => {
        (isFalVideoGenerationAvailable as jest.Mock).mockResolvedValue(true);
        const formData = new FormData(); // Empty FormData

        const request = new NextRequest('http://localhost/api/upload-user-image', {
            method: 'POST',
            body: formData,
          });
        // jest.spyOn(request, 'formData').mockResolvedValue(formData); // Mock if needed

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toBe('No file provided in formData');
      });
  });

  // TODO: Add tests for file type validation and size validation for both JSON and FormData
  // For example:
  // it('should return 400 for invalid file type in JSON upload', async () => { ... });
  // it('should return 400 for file too large in FormData upload', async () => { ... });

});
