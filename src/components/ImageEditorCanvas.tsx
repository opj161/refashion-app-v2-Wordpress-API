// src/components/ImageEditorCanvas.tsx
"use client";

import React, { useCallback, useEffect, useRef, useMemo } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Image from 'next/image';
import { getDisplayableImageUrl } from "@/lib/utils";

interface DisplayImage {
  id: string;
  dataUri: string;
}

interface ImageEditorCanvasProps {
  image: DisplayImage | null;
  preparationMode: 'image' | 'video';
  aspect?: number;
  disabled?: boolean;
  onAspectChange: (aspect: number | undefined) => void;
  crop?: Crop;
  onCropChange?: (crop: Crop) => void;
  onCropComplete?: (crop: PixelCrop) => void;
  onImageLoad?: (img: HTMLImageElement) => void;
}

// --- Helper Functions ---
// The getCroppedImgDataUrl function has been moved to the parent component

export default function ImageEditorCanvas({ 
  image,
  preparationMode, 
  aspect, 
  disabled = false, 
  onAspectChange,
  crop,
  onCropChange,
  onCropComplete,
  onImageLoad
}: ImageEditorCanvasProps) {
  // Use a ref for the displayed image element to avoid re-renders.
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // Use passed crop state or fallback to local state
  const currentCrop = crop;
  const handleCropChange = useMemo(() => onCropChange || (() => {}), [onCropChange]);
  const handleCropComplete = useMemo(() => onCropComplete || (() => {}), [onCropComplete]);

  // --- Recalculation logic when aspect ratio changes ---
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
            {
              unit: '%',
              height: 100,
            },
            aspectRatio,
            imgWidth,
            imgHeight
          ),
          imgWidth,
          imgHeight
        );
      } else {
        // It doesn't fit (image is too narrow/tall), so use full width instead
        newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: '%',
              width: 100,
            },
            aspectRatio,
            imgWidth,
            imgHeight
          ),
          imgWidth,
          imgHeight
        );
      }
    } else {
      // Fallback for "free" aspect ratio
      newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          imgWidth / imgHeight,
          imgWidth,
          imgHeight
        ),
        imgWidth,
        imgHeight
      );
    }

    // Set crop through the callback
    handleCropChange(newCrop as Crop);
    handleCropComplete({
      unit: 'px',
      x: (newCrop.x / 100) * imgWidth,
      y: (newCrop.y / 100) * imgHeight,
      width: (newCrop.width / 100) * imgWidth,
      height: (newCrop.height / 100) * imgHeight,
    });
  }, [handleCropChange, handleCropComplete]);

  // --- Event Handlers ---
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    if (onImageLoad) {
      onImageLoad(img);
    }
    // No longer automatically calculates crop here - only when aspect changes
  }, [onImageLoad]);

  // --- Effects ---
  
  // Handle crop activation and deactivation based on aspect ratio
  useEffect(() => {
    if (imgRef.current && aspect !== undefined) {
      // Activate cropping mode: calculate and set the crop
      recalculateCrop(aspect, imgRef.current);
    }
    // No need to clear crop states here - handled by parent
  }, [aspect, recalculateCrop]);

  // Reset imgRef when active image changes
  useEffect(() => {
    imgRef.current = null;
  }, [image?.id]);

  if (!image) {
    return null;
  }

  const imageUrlToDisplay = getDisplayableImageUrl(image.dataUri);

  return (
    <>
      {/* Processing overlay */}
      {/* Removed processing overlay as it's now handled in the parent component */}

      {/* Image with crop overlay */}
      <ReactCrop 
        crop={currentCrop}
        onChange={(_, percentCrop) => handleCropChange(percentCrop)} 
        onComplete={(c) => handleCropComplete(c)} 
        aspect={aspect} 
        className="max-h-[60vh]" 
        disabled={disabled}
      >
        <Image 
          key={image.id}
          src={imageUrlToDisplay || ''} 
          alt="Editable image" 
          onLoad={handleImageLoad} 
          className="max-h-[60vh] object-contain" 
          width={800}
          height={600}
          sizes="(max-width: 1023px) 100vw, 75vw"
          style={{ maxHeight: '60vh', objectFit: 'contain' }}
        />
      </ReactCrop>
    </>
  );
}