// src/stores/__tests__/imageStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useImageStore, getStoreSnapshot } from '../imageStore';

// Mock the server actions
jest.mock('@/ai/actions/remove-background.action', () => ({
  removeBackgroundAction: jest.fn().mockResolvedValue({ savedPath: '/test/bg-removed.jpg' })
}));

jest.mock('@/ai/actions/upscale-image.action', () => ({
  upscaleImageAction: jest.fn().mockResolvedValue({ savedPath: '/test/upscaled.jpg' }),
  faceDetailerAction: jest.fn().mockResolvedValue({ savedPath: '/test/face-detailed.jpg' })
}));

// Mock File and crypto for browser environment
global.File = class MockFile extends File {
  constructor(chunks: any[], filename: string, options?: any) {
    super(chunks, filename, options);
  }
} as any;

// Mock crypto.subtle
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock FileReader
global.FileReader = class MockFileReader {
  result = 'data:image/jpeg;base64,test-data-uri';
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      if (this.onload) {
        this.onload.call(this as any, {} as ProgressEvent<FileReader>);
      }
    }, 0);
  }
} as any;

describe('ImageStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useImageStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const snapshot = getStoreSnapshot();
      expect(snapshot).toEqual({
        hasOriginal: false,
        versionCount: 0,
        activeVersionId: null,
        isProcessing: false,
        processingStep: null,
        hasComparison: false,
      });
    });
  });

  describe('Setting Original Image', () => {
    it('should set original image and create original version', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const testDataUri = 'data:image/jpeg;base64,test';
      const testHash = 'test-hash';

      await act(async () => {
        useImageStore.getState().setOriginalImage(mockFile, testDataUri, testHash);
      });

      const state = useImageStore.getState();
      
      expect(state.original).toEqual({
        file: mockFile,
        dataUri: testDataUri,
        hash: testHash
      });
      
      expect(state.versions['original']).toEqual(
        expect.objectContaining({
          id: 'original',
          dataUri: testDataUri,
          label: 'Original',
          sourceVersionId: '',
        })
      );
      
      expect(state.activeVersionId).toBe('original');
    });
  });

  describe('Version Management', () => {
    beforeEach(async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await act(async () => {
        useImageStore.getState().setOriginalImage(mockFile, 'data:test', 'hash');
      });
    });

    it('should add new version and set as active', () => {
      const newVersionData = {
        dataUri: 'data:cropped',
        label: 'Cropped',
        sourceVersionId: 'original',
        hash: 'test-hash-123'
      };

      let newVersionId: string = '';
      act(() => {
        newVersionId = useImageStore.getState().addVersion(newVersionData);
      });

      const state = useImageStore.getState();
      expect(state.versions[newVersionId]).toEqual(
        expect.objectContaining(newVersionData)
      );
      expect(state.activeVersionId).toBe(newVersionId);
    });

    it('should switch active version', () => {
      let versionId: string = '';
      act(() => {
        versionId = useImageStore.getState().addVersion({
          dataUri: 'data:cropped',
          label: 'Cropped', 
          sourceVersionId: 'original',
          hash: 'test-hash-456'
        });
      });

      act(() => {
        useImageStore.getState().setActiveVersion('original');
      });

      expect(useImageStore.getState().activeVersionId).toBe('original');

      act(() => {
        useImageStore.getState().setActiveVersion(versionId);
      });

      expect(useImageStore.getState().activeVersionId).toBe(versionId);
    });
  });

  describe('Processing States', () => {
    it('should manage processing state correctly', () => {
      act(() => {
        useImageStore.getState().setProcessing(true, 'crop');
      });

      let state = useImageStore.getState();
      expect(state.isProcessing).toBe(true);
      expect(state.processingStep).toBe('crop');

      act(() => {
        useImageStore.getState().setProcessing(false, null);
      });

      state = useImageStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.processingStep).toBe(null);
    });
  });

  describe('Comparison Management', () => {
    beforeEach(async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await act(async () => {
        useImageStore.getState().setOriginalImage(mockFile, 'data:test', 'hash');
      });
    });

    it('should set and clear comparison', () => {
      const comparison = {
        left: 'data:left',
        right: 'data:right'
      };

      act(() => {
        useImageStore.getState().setComparison(comparison);
      });

      expect(useImageStore.getState().comparison).toEqual(comparison);

      act(() => {
        useImageStore.getState().setComparison(null);
      });

      expect(useImageStore.getState().comparison).toBe(null);
    });
  });

  describe('Async Actions', () => {
    beforeEach(async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await act(async () => {
        useImageStore.getState().setOriginalImage(mockFile, 'data:original', 'hash');
      });
    });

    it('should handle background removal', async () => {
      await act(async () => {
        await useImageStore.getState().removeBackground('test-user');
      });

      const state = useImageStore.getState();
      
      // Should create new version
      const bgRemovedVersion = Object.values(state.versions).find(v => 
        v.label === 'Background Removed'
      );
      expect(bgRemovedVersion).toBeDefined();
      expect(bgRemovedVersion?.dataUri).toBe('/test/bg-removed.jpg');
      
      // Should set up comparison
      expect(state.comparison).toEqual({
        left: 'data:original',
        right: '/test/bg-removed.jpg'
      });
      
      // Should not be processing
      expect(state.isProcessing).toBe(false);
    });

    it('should handle upscaling', async () => {
      await act(async () => {
        await useImageStore.getState().upscaleImage('test-user');
      });

      const state = useImageStore.getState();
      
      const upscaledVersion = Object.values(state.versions).find(v => 
        v.label === 'Upscaled'
      );
      expect(upscaledVersion).toBeDefined();
      expect(upscaledVersion?.dataUri).toBe('/test/upscaled.jpg');
    });

    it('should handle face detailing', async () => {
      await act(async () => {
        await useImageStore.getState().faceDetailer('test-user');
      });

      const state = useImageStore.getState();
      
      const faceDetailedVersion = Object.values(state.versions).find(v => 
        v.label === 'Face Enhanced'
      );
      expect(faceDetailedVersion).toBeDefined();
      expect(faceDetailedVersion?.dataUri).toBe('/test/face-detailed.jpg');
    });

    it('should handle errors in async actions', async () => {
      // Mock a failing action
      const { removeBackgroundAction } = require('@/ai/actions/remove-background.action');
      removeBackgroundAction.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        act(async () => {
          await useImageStore.getState().removeBackground('test-user');
        })
      ).rejects.toThrow('Test error');

      // Should reset processing state on error
      const state = useImageStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.processingStep).toBe(null);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', async () => {
      // Set up some state
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await act(async () => {
        useImageStore.getState().setOriginalImage(mockFile, 'data:test', 'hash');
        useImageStore.getState().setProcessing(true, 'crop');
        useImageStore.getState().setComparison({ left: 'a', right: 'b' });
      });

      // Reset
      act(() => {
        useImageStore.getState().reset();
      });

      // Should be back to initial state
      const snapshot = getStoreSnapshot();
      expect(snapshot).toEqual({
        hasOriginal: false,
        versionCount: 0,
        activeVersionId: null,
        isProcessing: false,
        processingStep: null,
        hasComparison: false,
      });
    });
  });
});
