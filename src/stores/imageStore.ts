// src/stores/imageStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Server Actions
import { removeBackgroundAction } from "@/ai/actions/remove-background.action";
import { upscaleImageAction, faceDetailerAction } from "@/ai/actions/upscale-image.action";
import { uploadAndResizeImageAction } from "@/ai/actions/upload-and-resize-image.action";

// --- Types ---
export interface ImageVersion {
  id: string;
  dataUri: string;
  label: string;
  sourceVersionId: string;
  createdAt: number;
  hash: string;
}

export interface ImageState {
  original: {
    file: File;
    dataUri: string;
    hash: string;
  } | null;
  versions: Record<string, ImageVersion>;
  activeVersionId: string | null;
  comparison: {
    left: string;
    right: string;
  } | null;
  isProcessing: boolean;
  processingStep: 'upload' | 'crop' | 'bg' | 'upscale' | 'face' | 'confirm' | null;
}

export interface ImageActions {
  // Synchronous actions
  setOriginalImage: (file: File, dataUri: string, hash: string) => void;
  addVersion: (version: Omit<ImageVersion, 'id' | 'createdAt'>) => string;
  setActiveVersion: (versionId: string) => void;
  setComparison: (comparison: { left: string; right: string } | null) => void;
  setProcessing: (isProcessing: boolean, step: ImageState['processingStep']) => void;
  reset: () => void;
  
  // Async actions
  removeBackground: (username: string) => Promise<void>;
  upscaleImage: (username: string) => Promise<void>;
  faceDetailer: (username: string) => Promise<void>;
  uploadOriginalImage: (file: File) => Promise<{ resized: boolean; originalWidth: number; originalHeight: number; }>;

}

export type ImageStore = ImageState & ImageActions;

// --- Helper Functions ---
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const generateHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const dataUriToBlob = (dataUri: string): Blob => {
  const byteString = atob(dataUri.split(',')[1]);
  const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

// --- Initial State ---
const initialState: ImageState = {
  original: null,
  versions: {},
  activeVersionId: null,
  comparison: null,
  isProcessing: false,
  processingStep: null,
};

// --- Store Implementation ---
export const useImageStore = create<ImageStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // --- Synchronous Actions ---
      setOriginalImage: async (file: File, dataUri: string, hash: string) => {
        const originalVersion: ImageVersion = {
          id: 'original',
          dataUri,
          label: 'Original',
          sourceVersionId: '',
          createdAt: Date.now(),
          hash,
        };

        set({
          original: { file, dataUri, hash },
          versions: { original: originalVersion },
          activeVersionId: 'original',
          comparison: null,
          isProcessing: false,
          processingStep: null,
        }, false, 'setOriginalImage');
      },

      addVersion: (version: Omit<ImageVersion, 'id' | 'createdAt'>) => {
        const id = `${version.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const newVersion: ImageVersion = {
          ...version,
          id,
          createdAt: Date.now(),
        };

        set((state) => ({
          versions: {
            ...state.versions,
            [id]: newVersion,
          },
          activeVersionId: id,
          isProcessing: false,
          processingStep: null,
        }), false, 'addVersion');

        return id;
      },

      setActiveVersion: (versionId: string) => {
        set({
          activeVersionId: versionId,
          comparison: null, // Clear comparison when switching versions
        }, false, 'setActiveVersion');
      },

      setComparison: (comparison: { left: string; right: string } | null) => {
        set({ comparison }, false, 'setComparison');
      },

      setProcessing: (isProcessing: boolean, step: ImageState['processingStep']) => {
        set({ isProcessing, processingStep: step }, false, 'setProcessing');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },

      // --- Async Actions ---
      removeBackground: async (username: string) => {
        const { activeVersionId, versions } = get();
        if (!activeVersionId || !versions[activeVersionId]) {
          console.warn('No active version for background removal');
          return;
        }
        const currentVersion = versions[activeVersionId];
        set({ isProcessing: true, processingStep: 'bg' }, false, 'removeBackground:start');
        try {
          let imageUrlOrDataUri = currentVersion.dataUri;
          if (imageUrlOrDataUri.startsWith('/uploads/')) {
            imageUrlOrDataUri = new URL(imageUrlOrDataUri, window.location.origin).href;
          }
          const { savedPath, outputHash } = await removeBackgroundAction(
            imageUrlOrDataUri,
            currentVersion.hash
          ); // username is now handled inside removeBackgroundAction
          get().addVersion({
            dataUri: savedPath,
            label: 'Background Removed',
            sourceVersionId: activeVersionId,
            hash: outputHash,
          });
        } catch (error) {
          console.error('Error removing background:', error);
        } finally {
          set({ isProcessing: false, processingStep: null }, false, 'removeBackground:end');
        }
      },
      upscaleImage: async (username: string) => {
        const { activeVersionId, versions, original } = get();
        if (!activeVersionId || !versions[activeVersionId]) {
          console.warn('No active version for upscaling');
          return;
        }
        const currentVersion = versions[activeVersionId];
        set({ isProcessing: true, processingStep: 'upscale' }, false, 'upscaleImage:start');
        try {
          let imageUrlOrDataUri = currentVersion.dataUri;
          if (imageUrlOrDataUri.startsWith('/uploads/')) {
            imageUrlOrDataUri = new URL(imageUrlOrDataUri, window.location.origin).href;
          }
          const { savedPath, outputHash } = await upscaleImageAction(
            imageUrlOrDataUri,
            currentVersion.hash
          ); // username is now handled inside upscaleImageAction
          get().addVersion({
            dataUri: savedPath,
            label: 'Upscaled',
            sourceVersionId: activeVersionId,
            hash: outputHash,
          });
        } catch (error) {
          console.error('Error upscaling image:', error);
        } finally {
          set({ isProcessing: false, processingStep: null }, false, 'upscaleImage:end');
        }
      },
      faceDetailer: async (username: string) => {
        const { activeVersionId, versions, original } = get();
        if (!activeVersionId || !versions[activeVersionId]) {
          console.warn('No active version for face detailer');
          return;
        }
        const currentVersion = versions[activeVersionId];
        set({ isProcessing: true, processingStep: 'face' }, false, 'faceDetailer:start');
        try {
          let imageUrlOrDataUri = currentVersion.dataUri;
          if (imageUrlOrDataUri.startsWith('/uploads/')) {
            imageUrlOrDataUri = new URL(imageUrlOrDataUri, window.location.origin).href;
          }
          const { savedPath, outputHash } = await faceDetailerAction(
            imageUrlOrDataUri,
            currentVersion.hash
          ); // username is now handled inside faceDetailerAction
          get().addVersion({
            dataUri: savedPath,
            label: 'Face Enhanced',
            sourceVersionId: activeVersionId,
            hash: outputHash,
          });
        } catch (error) {
          console.error('Error enhancing face details:', error);
        } finally {
          set({ isProcessing: false, processingStep: null }, false, 'faceDetailer:end');
        }
      },

      uploadOriginalImage: async (file: File) => {
        get().setProcessing(true, 'upload');
        try {
          const formData = new FormData();
          formData.append('file', file);

          const { dataUri, hash, resized, originalWidth, originalHeight } = await uploadAndResizeImageAction(formData);

          const blob = dataUriToBlob(dataUri);
          const resizedFile = new File([blob], file.name, { type: blob.type });

          get().setOriginalImage(resizedFile, dataUri, hash);
          return { resized, originalWidth, originalHeight };
        } catch (error) {
          console.error('Upload and resize failed in store action:', error);
          get().setProcessing(false, null);
          throw error;
        } finally {
          get().setProcessing(false, null);
        }
      },
    }),
    {
      name: 'image-store', // This will show up in Redux DevTools
    }
  )
);

// --- Convenience Selectors ---
export const useActiveImage = () => useImageStore((state) => {
  const { activeVersionId, versions } = state;
  return activeVersionId ? versions[activeVersionId] : null;
});

export const useImageProcessingState = () => useImageStore((state) => ({
  isProcessing: state.isProcessing,
  processingStep: state.processingStep,
}));

// --- Debug Helpers ---
export const getStoreSnapshot = () => {
  const state = useImageStore.getState();
  return {
    hasOriginal: !!state.original,
    versionCount: Object.keys(state.versions).length,
    activeVersionId: state.activeVersionId,
    isProcessing: state.isProcessing,
    processingStep: state.processingStep,
    hasComparison: !!state.comparison,
  };
};

// For development - access in console as window.imageStore
if (typeof window !== 'undefined') {
  (window as any).imageStore = useImageStore;
  (window as any).imageStoreSnapshot = getStoreSnapshot;
}