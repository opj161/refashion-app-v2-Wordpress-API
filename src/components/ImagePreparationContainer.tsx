// src/components/ImagePreparationContainer.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImageStore, useActiveImage } from "@/stores/imageStore";
import { useToast } from "@/hooks/use-toast";
import { getDisplayableImageUrl } from "@/lib/utils";
import { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { motion, AnimatePresence } from "motion/react";

// New Components
import ImageUploader from "./ImageUploader";
import ImageEditorCanvas from "./ImageEditorCanvas";
import ImageProcessingTools from "./ImageProcessingTools";
import AspectRatioSelector from "./AspectRatioSelector";
import ImageVersionStack from "./ImageVersionStack";

import { 
  UploadCloud, CheckCircle, RefreshCw, Loader2, Trash2, Eye, X, Check, Edit 
} from "lucide-react";

// --- Constants ---
const SERVER_IMAGE_PATH_PREFIX = '/uploads/';

// --- Helper function to get the default aspect based on mode ---
const getDefaultAspect = (mode: 'image' | 'video') => {
  return mode === 'video' ? 9 / 16 : 3 / 4;
};

// --- Hashing Helper Function ---
const generateDataUriHash = async (dataUri: string): Promise<string> => {
  const base64 = dataUri.split(',')[1];
  if (!base64) throw new Error('Invalid data URI for hashing');
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- Cropping Helper Function ---
async function getCroppedImgDataUrl(
  displayedImage: HTMLImageElement,
  crop: PixelCrop,
  sourceDataUri: string
): Promise<string> {
  const offscreenImage = new window.Image();
  offscreenImage.src = sourceDataUri;

  return new Promise((resolve, reject) => {
    offscreenImage.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleX = offscreenImage.naturalWidth / displayedImage.width;
      const scaleY = offscreenImage.naturalHeight / displayedImage.height;

      canvas.width = Math.floor(crop.width * scaleX);
      canvas.height = Math.floor(crop.height * scaleY);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get canvas context'));
      }

      ctx.drawImage(
        offscreenImage,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0, 0, canvas.width, canvas.height
      );

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    offscreenImage.onerror = (err) => reject(err);
  });
}

interface ImagePreparationContainerProps {
  sourceImageUrl?: string | null;
  preparationMode: 'image' | 'video';
  onReset: () => void;
  isLoadingHistory?: boolean;
}

export default function ImagePreparationContainer({ 
  sourceImageUrl, 
  preparationMode,
  onReset,
  isLoadingHistory = false
}: ImagePreparationContainerProps) {
  const { toast } = useToast();
  
  // Store state
  const { 
    original, 
    versions, 
    activeVersionId, 
    isProcessing, 
    processingStep,
    setActiveVersion,
    reset: resetStore,
    setProcessing,
    addVersion
  } = useImageStore();
  
  const activeImage = useActiveImage();

  // Local UI state
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);
  
  // Cropping state
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Logic to determine if comparison is possible
  const sourceVersion = activeImage?.sourceVersionId ? versions[activeImage.sourceVersionId] : null;

  // --- Effects ---

  // Recalculation logic when aspect ratio changes
  const recalculateCrop = useCallback((aspectRatio: number | undefined, imageElement: HTMLImageElement) => {
    const { naturalWidth: imgWidth, naturalHeight: imgHeight } = imageElement;
    let newCrop: Crop;

    if (aspectRatio) {
      // Check if a full-height crop with the target aspect ratio fits within the image width
      const requiredWidthForFullHeight = imgHeight * aspectRatio;
      if (requiredWidthForFullHeight <= imgWidth) {
        // It fits, so use full height
        newCrop = centerCrop(
          makeAspectCrop(
            { unit: '%', height: 100 },
            aspectRatio, imgWidth, imgHeight
          ),
          imgWidth, imgHeight
        );
      } else {
        // It doesn't fit (image is too narrow/tall), so use full width instead
        newCrop = centerCrop(
          makeAspectCrop(
            { unit: '%', width: 100 },
            aspectRatio, imgWidth, imgHeight
          ),
          imgWidth, imgHeight
        );
      }
    } else {
      // Fallback for "free" aspect ratio
      newCrop = centerCrop(
        makeAspectCrop(
          { unit: '%', width: 90 },
          imgWidth / imgHeight, imgWidth, imgHeight
        ),
        imgWidth, imgHeight
      );
    }

    setCrop(newCrop as Crop);
    setCompletedCrop({
      unit: 'px',
      x: (newCrop.x / 100) * imgWidth,
      y: (newCrop.y / 100) * imgHeight,
      width: (newCrop.width / 100) * imgWidth,
      height: (newCrop.height / 100) * imgHeight,
    });
  }, []);
  
  useEffect(() => {
    setAspect(undefined);
  }, [preparationMode]);

  // Handle crop activation and deactivation based on aspect ratio
  useEffect(() => {
    if (imgRef.current && aspect !== undefined) {
      recalculateCrop(aspect, imgRef.current);
    }
  }, [aspect, recalculateCrop]);

  // Effect to load image from URL, moved from ImageUploader
  useEffect(() => {
    if (sourceImageUrl && !original && !isLoadingFromUrl) {
      const loadImageFromUrl = async () => {
        setIsLoadingFromUrl(true);
        try {
          const displayUrl = getDisplayableImageUrl(sourceImageUrl);
          if (!displayUrl) throw new Error("Could not generate displayable URL.");
          const response = await fetch(displayUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
          const blob = await response.blob();
          const file = new File([blob], 'loaded-image.jpg', { type: blob.type });
          await useImageStore.getState().uploadOriginalImage(file);
        } catch (error) {
          console.error('Error loading image from sourceImageUrl:', error);
          toast({ title: "Load Error", description: "Failed to load the image from history.", variant: "destructive" });
        } finally {
          setIsLoadingFromUrl(false);
        }
      };
      loadImageFromUrl();
    }
  }, [sourceImageUrl, original, isLoadingFromUrl, toast]);

  // --- Cropping Handlers ---
  
  const handleApplyCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !activeImage) return;
    
    try {
      const croppedDataUrl = await getCroppedImgDataUrl(
        imgRef.current,
        completedCrop,
        activeImage.dataUri
      );
      
      const croppedHash = await generateDataUriHash(croppedDataUrl);

      addVersion({
        dataUri: croppedDataUrl,
        label: 'Cropped',
        sourceVersionId: activeImage.id,
        hash: croppedHash,
      });
      
      toast({ title: "Crop Applied", description: "A new cropped version has been added to your history." });
      setAspect(undefined); // Deactivate cropping mode
    } catch (error) {
      console.error('Cropping failed:', error);
      toast({ title: "Cropping Failed", description: "Could not apply the crop.", variant: "destructive" });
    }
  }, [completedCrop, activeImage, addVersion, toast]);

  const handleCancelCrop = () => {
    setAspect(undefined); // This will clear the crop UI
  };

  const handleImageLoad = (img: HTMLImageElement) => {
    imgRef.current = img;
  };

  // --- Render Logic ---
  
  // Show a loading skeleton if loading from URL or waiting for history data
  if (isLoadingFromUrl || (isLoadingHistory && sourceImageUrl)) {
    return (
      <Card variant="glass">
        <CardContent className="flex items-center justify-center p-10 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show uploader if no image
  if (!original) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="uploader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ImageUploader />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Determine which image data to pass to the canvas
  const imageForCanvas = isComparing && sourceVersion ? sourceVersion : activeImage;

  // Main editor interface
  return (
    <motion.div layout transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}>
      <Card variant="glass">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-primary" />
                Prepare Your Image
              </CardTitle>
              <CardDescription className="hidden lg:block">
                Upload, crop, and process your clothing image. The canvas shows the version that will be used for generation.
              </CardDescription>
            </div>
            {activeImage && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onReset} 
                disabled={isProcessing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Image
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <AnimatePresence mode="wait">
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main View Area: Now with a unified container */}
                <div className="lg:col-span-3 relative flex flex-col items-center justify-center bg-muted/20 p-2 rounded-lg border">
                  <ImageEditorCanvas 
                    image={imageForCanvas}
                    preparationMode={preparationMode}
                    aspect={aspect}
                    disabled={false}
                    onAspectChange={setAspect}
                    crop={crop}
                    onCropChange={setCrop}
                    onCropComplete={setCompletedCrop}
                    onImageLoad={handleImageLoad}
                  />

                  {/* 'Hold to Compare' button */}
                  {sourceVersion && (
                    <Button 
                      variant="outline" 
                      className="absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-sm select-none"
                      onMouseDown={() => setIsComparing(true)}
                      onMouseUp={() => setIsComparing(false)}
                      onMouseLeave={() => setIsComparing(false)}
                      onTouchStart={(e) => { e.preventDefault(); setIsComparing(true); }}
                      onTouchEnd={() => setIsComparing(false)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Compare
                    </Button>
                  )}
                </div>

                {/* Controls Panel: Conditionally render controls based on view */}
                <div className="lg:col-span-1 flex flex-col space-y-6">
                  {/* Only editor controls, no comparison controls */}
                  <AspectRatioSelector
                    preparationMode={preparationMode}
                    aspect={aspect}
                    onAspectChange={setAspect}
                    disabled={false}
                  />

                  {/* Processing Tools are always visible but disabled during crop */}
                  <ImageProcessingTools 
                    preparationMode={preparationMode} 
                    disabled={isProcessing || aspect !== undefined} 
                  />

                  {/* Contextual Crop Action Bar */}
                  {aspect !== undefined && (
                    <div className="flex gap-2 animate-in fade-in">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleCancelCrop}
                        disabled={isProcessing}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleApplyCrop}
                        disabled={isProcessing}
                      >
                        <Check className="mr-2 h-4 w-4" /> Apply Crop
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Version Stack - Always visible when there are images */}
              {Object.keys(versions).length > 0 && (
                <ImageVersionStack
                  versions={versions}
                  activeVersionId={activeVersionId}
                  isProcessing={isProcessing}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}