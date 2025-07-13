// src/components/ImageProcessingTools.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useImageStore, useActiveImage } from "@/stores/imageStore";
import { useToast } from "@/hooks/use-toast";
import { 
  isBackgroundRemovalAvailable as checkBgAvailable,
} from "@/ai/actions/remove-background.action";
import { 
  isUpscaleServiceAvailable as checkUpscaleAvailable, 
  isFaceDetailerAvailable as checkFaceDetailerAvailable 
} from "@/ai/actions/upscale-image.action";
import { 
  Wand2, Sparkles, UserCheck, CheckCircle, Loader2 
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

interface ImageProcessingToolsProps {
  preparationMode: 'image' | 'video';
  disabled?: boolean;
}

export default function ImageProcessingTools({ preparationMode, disabled = false }: ImageProcessingToolsProps) {
  const { toast } = useToast();
  const { 
    removeBackground, 
    upscaleImage, 
    faceDetailer, 
    isProcessing, 
    processingStep,
    setActiveVersion,
    versions
  } = useImageStore();
  
  const activeImage = useActiveImage();
  const { user } = useAuth();

  // Service availability state
  const [isBgRemovalAvailable, setIsBgRemovalAvailable] = useState(false);
  const [isUpscalingAvailable, setIsUpscalingAvailable] = useState(false);
  const [isFaceDetailerAvailable, setIsFaceDetailerAvailable] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // Check service availability on mount
    checkBgAvailable().then(setIsBgRemovalAvailable);
    checkUpscaleAvailable().then(setIsUpscalingAvailable);
    checkFaceDetailerAvailable().then(setIsFaceDetailerAvailable);
  }, []);

  // Don't render if no active image
  if (!activeImage) {
    return null;
  }

  // Computed states based on version labels
  const isBgRemoved = activeImage.label.includes('Background Removed');
  const isUpscaled = activeImage.label.includes('Upscaled');
  const isFaceDetailed = activeImage.label.includes('Face Enhanced');

  // --- Event Handlers ---
  const handleToggleBackgroundRemoval = async (checked: boolean) => {
    if (!user?.username) return toast({ title: 'Authentication Error', variant: 'destructive' });
    if (checked) {
      try {
        await removeBackground(user.username);
        toast({ title: 'Background Removed', description: 'Background has been successfully removed.' });
      } catch (error) {
        toast({ 
          title: 'Background Removal Failed', 
          description: (error as Error).message, 
          variant: 'destructive' 
        });
      }
    } else {
      // Find and switch to a version without background removal
      if (activeImage.sourceVersionId && versions[activeImage.sourceVersionId]) {
        setActiveVersion(activeImage.sourceVersionId);
        toast({ 
          title: "Switched to Previous Version", 
          description: "Background restoration isn't needed - just select a different version." 
        });
      } else {
        toast({ 
          title: "Info", 
          description: "Use the version history below to switch between different processed versions." 
        });
      }
    }
  };

  const handleUpscaleImage = async () => {
    if (!user?.username) return toast({ title: 'Authentication Error', variant: 'destructive' });
    try {
      await upscaleImage(user.username);
      toast({ title: 'Image Upscaled', description: 'Your image has been upscaled successfully.' });
    } catch (error) {
      toast({ 
        title: 'Upscaling Failed', 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
    }
  };

  const handleFaceDetailer = async () => {
    if (!user?.username) return toast({ title: 'Authentication Error', variant: 'destructive' });
    try {
      await faceDetailer(user.username);
      toast({ title: 'Face Details Enhanced', description: 'Face details have been enhanced successfully.' });
    } catch (error) {
      toast({ 
        title: 'Face Enhancement Failed', 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
    }
  };

  const isToolDisabled = disabled || isProcessing;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Processing Tools</h3>
      
      {/* Background Removal */}
      {isBgRemovalAvailable && (
        <div className="flex items-center justify-between p-3 border rounded-md">
          <Label htmlFor="bg-remove-switch" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Remove Background
          </Label>
          <div className="flex items-center gap-2">
            {isProcessing && processingStep === 'bg' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Switch 
              id="bg-remove-switch" 
              checked={isBgRemoved} 
              onCheckedChange={handleToggleBackgroundRemoval} 
              disabled={isToolDisabled || isUpscaled} 
            />
          </div>
        </div>
      )}

      {/* Upscale Image - Only for video mode */}
      {preparationMode === 'video' && isUpscalingAvailable && (
        <Button 
          onClick={handleUpscaleImage} 
          variant="outline" 
          disabled={isToolDisabled || isUpscaled} 
          className="w-full"
        >
          {isProcessing && processingStep === 'upscale' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upscaling...
            </>
          ) : isUpscaled ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Upscaled
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Upscale Image
            </>
          )}
        </Button>
      )}

      {/* Face Detailer - Only for video mode */}
      {preparationMode === 'video' && isFaceDetailerAvailable && (
        <Button 
          onClick={handleFaceDetailer} 
          variant="outline" 
          disabled={isToolDisabled || isFaceDetailed} 
          className="w-full"
        >
          {isProcessing && processingStep === 'face' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing...
            </>
          ) : isFaceDetailed ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Face Detailed
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Face Detailer
            </>
          )}
        </Button>
      )}
    </div>
  );
}
