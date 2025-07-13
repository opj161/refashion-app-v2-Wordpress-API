// src/components/video-parameters.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadToFalStorage } from '@/ai/actions/generate-video.action';
import { useActiveImage } from "@/stores/imageStore";
import { useAuth } from "@/contexts/AuthContext";
import {
    PREDEFINED_PROMPTS, MODEL_MOVEMENT_OPTIONS, FABRIC_MOTION_OPTIONS_VIDEO, // Use FABRIC_MOTION_OPTIONS_VIDEO
    CAMERA_ACTION_OPTIONS, AESTHETIC_VIBE_OPTIONS as AESTHETIC_STYLE_OPTIONS
} from "@/lib/prompt-builder";
import { AlertTriangle, CheckCircle, Download, Info, Loader2, PaletteIcon, Settings2, Shuffle, Video } from "lucide-react";
import { OptionWithPromptSegment } from "@/lib/prompt-builder";
import { usePromptManager } from "@/hooks/usePromptManager";
import { getDisplayableImageUrl } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HistoryItem } from "@/lib/types";
import { calculateVideoCost, formatPrice, VideoModel, VideoResolution, VideoDuration } from "@/lib/pricing";


// Type for video generation parameters
interface VideoGenerationParams {
  selectedPredefinedPrompt: string;
  modelMovement: string;
  fabricMotion: string;
  cameraAction: string;
  aestheticVibe: string;
}

// Types and constants from video-generation/page.tsx
// interface VideoPromptOption { // Now OptionWithPromptSegment from prompt-builder
//   value: string;
//   displayLabel: string;
//   promptSegment: string;
// }

// interface PredefinedPromptOption { // Now OptionWithPromptSegment from prompt-builder
//   value: string;
//   displayLabel: string;
//   promptText: string;
// }

// --- Options & Constants are now imported from prompt-builder.ts ---

const isVideoServiceAvailable = !!process.env.NEXT_PUBLIC_FAL_KEY; // Or however it's determined globally

// Helper function to convert data URI to Blob
function dataUriToBlob(dataUri: string): Blob {
  const arr = dataUri.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const byteString = atob(arr[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}


interface RenderSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionWithPromptSegment[]; // Use the imported type
  disabled?: boolean;
  placeholder?: string;
  priceData?: { model: VideoModel; duration: VideoDuration; resolution: VideoResolution; };
}

const RenderSelectComponent: React.FC<RenderSelectProps> = ({ 
  id, label, value, onChange, options, disabled, placeholder, priceData 
}) => {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="mt-1 text-sm">
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => {
            let priceLabel = '';
            if (priceData) {
              // Dynamically calculate price for this specific option
              const cost = calculateVideoCost(
                priceData.model,
                (id === 'resolution' ? option.value : priceData.resolution) as VideoResolution,
                (id === 'duration' ? option.value : priceData.duration) as VideoDuration
              );
              priceLabel = formatPrice(cost);
            }

            return (
              <TooltipProvider key={option.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectItem value={option.value} className="text-sm">
                      <div className="flex justify-between w-full items-center">
                        <span>{option.displayLabel}</span>
                        {priceLabel && <span className="text-xs text-muted-foreground ml-2">{priceLabel}</span>}
                      </div>
                    </SelectItem>
                  </TooltipTrigger>
                  {priceLabel && (
                    <TooltipContent>
                      <p>Estimated cost: {priceLabel}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};


// Component is now prop-less - gets prepared image from Zustand store
// Props interface for the component
interface VideoParametersProps {
  historyItemToLoad?: HistoryItem | null;
  isLoadingHistory?: boolean;
}

export default function VideoParameters({ 
  historyItemToLoad = null, 
  isLoadingHistory = false 
}: VideoParametersProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get prepared image from store instead of props
  const activeImage = useActiveImage();
  const preparedImageUrl = activeImage?.dataUri || null;

  // State for video parameters
  const [videoModel, setVideoModel] = useState<VideoModel>('lite');
  const [resolution, setResolution] = useState<VideoResolution>('480p');
  const [duration, setDuration] = useState<VideoDuration>('5');
  const [seed, setSeed] = useState<string>("-1");
  const [cameraFixed, setCameraFixed] = useState<boolean>(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Prompt builder states
  const [selectedPredefinedPrompt, setSelectedPredefinedPrompt] = useState<string>('custom');
  const [modelMovement, setModelMovement] = useState<string>(MODEL_MOVEMENT_OPTIONS[0].value);
  const [fabricMotion, setFabricMotion] = useState<string>(FABRIC_MOTION_OPTIONS_VIDEO[0].value);
  const [cameraAction, setCameraAction] = useState<string>(CAMERA_ACTION_OPTIONS[0].value);
  const [aestheticVibe, setAestheticVibe] = useState<string>(AESTHETIC_STYLE_OPTIONS[0].value);

  // Generation states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploadingToFal, setIsUploadingToFal] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedSeedValue, setGeneratedSeedValue] = useState<number | null>(null);

  // For webhook-based flow
  const [generationTaskId, setGenerationTaskId] = useState<string | null>(null);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [loadedHistoryItemId, setLoadedHistoryItemId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  // Check if data URI is provided (not a server URL)
  const isDataUri = preparedImageUrl?.startsWith('data:') || false;
  const commonFormDisabled = isGenerating || isUploadingToFal || !isVideoServiceAvailable || !preparedImageUrl;

  const currentVideoGenParams = React.useMemo((): VideoGenerationParams => ({
    selectedPredefinedPrompt,
    modelMovement,
    fabricMotion, // Ensure this is the video-specific one from prompt-builder if names differ
    cameraAction,
    aestheticVibe,
  }), [selectedPredefinedPrompt, modelMovement, fabricMotion, cameraAction, aestheticVibe]);

  const {
    currentPrompt,
    isPromptManuallyEdited,
    handlePromptChange,
    resetPromptToAuto,
    isManualPromptOutOfSync,
  } = usePromptManager({
    generationType: 'video',
    generationParams: currentVideoGenParams,
  });

  // Effect to calculate and update the estimated cost
  useEffect(() => {
    const cost = calculateVideoCost(videoModel, resolution, duration);
    setEstimatedCost(cost);
  }, [videoModel, resolution, duration]);

  // Dynamic resolution options based on the selected model
  const resolutionOptions = React.useMemo(() => {
    if (videoModel === 'pro') {
      return [
        { value: '480p', displayLabel: '480p (Faster)', promptSegment: '' },
        { value: '1080p', displayLabel: '1080p (Higher Quality)', promptSegment: '' },
      ];
    }
    // Default to 'lite' model resolutions
    return [
      { value: '480p', displayLabel: '480p (Faster)', promptSegment: '' },
      { value: '720p', displayLabel: '720p (Higher Quality)', promptSegment: '' },
    ];
  }, [videoModel]);

  // Effect to reset resolution if it becomes invalid after a model change
  useEffect(() => {
    if (!resolutionOptions.some(opt => opt.value === resolution)) {
      setResolution('480p');
    }
  }, [videoModel, resolution, resolutionOptions]);

  // Effect to populate state when a history item with video parameters is loaded
  useEffect(() => {
    if (historyItemToLoad && !isLoadingHistory && historyItemToLoad.videoGenerationParams && historyItemToLoad.id !== loadedHistoryItemId) {
      const { videoGenerationParams } = historyItemToLoad;
      
      // Set video-specific parameters if they exist
      if (videoGenerationParams.prompt) {
        handlePromptChange(videoGenerationParams.prompt);
      }
      if (videoGenerationParams.videoModel) {
        setVideoModel(videoGenerationParams.videoModel);
      }
      if (videoGenerationParams.resolution) {
        setResolution(videoGenerationParams.resolution as '480p' | '720p' | '1080p');
      }
      if (videoGenerationParams.duration) {
        setDuration(videoGenerationParams.duration as '5' | '10');
      }
      if (videoGenerationParams.seed !== undefined) {
        setSeed(videoGenerationParams.seed.toString());
      }
      if (videoGenerationParams.cameraFixed !== undefined) {
        setCameraFixed(videoGenerationParams.cameraFixed);
      }
      if (videoGenerationParams.modelMovement) {
        setModelMovement(videoGenerationParams.modelMovement);
      }
      if (videoGenerationParams.fabricMotion) {
        setFabricMotion(videoGenerationParams.fabricMotion);
      }
      if (videoGenerationParams.cameraAction) {
        setCameraAction(videoGenerationParams.cameraAction);
      }
      if (videoGenerationParams.aestheticVibe) {
        setAestheticVibe(videoGenerationParams.aestheticVibe);
      }
      
      // Mark this history item as loaded to prevent reloading
      setLoadedHistoryItemId(historyItemToLoad.id);
      
      toast({
        title: "History Restored",
        description: "Source image and all video parameters have been successfully restored.",
      });
    }
  }, [historyItemToLoad, isLoadingHistory, loadedHistoryItemId, handlePromptChange, toast]);

  const handleRandomSeed = () => setSeed("-1");

  const handleGenerateVideo = async () => {
    if (!preparedImageUrl) {
      toast({ title: "Image Not Prepared", description: "Please prepare an image in the previous step.", variant: "destructive" });
      return;
    }
    if (!currentPrompt.trim()) {
      toast({ title: "Missing Prompt", description: "Prompt is empty. Please select options or modify it.", variant: "destructive" });
      return;
    }
    if (!user?.username) {
        toast({ title: "Authentication Error", description: "Could not determine current user. Please log in again.", variant: "destructive" });
        return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setGeneratedSeedValue(null);
    setGenerationTaskId(null);
    setHistoryItemId(null);

    try {
      let imageUrlForVideo = preparedImageUrl;

      // If we have a data URI, convert it to a Fal storage URL
      if (isDataUri) {
        setIsUploadingToFal(true);
        // Use a single toast and update it after upload
        const { update, dismiss, id: toastId } = toast({ 
          title: "Uploading Image...", 
          description: "Preparing your image for video generation." 
        });
        try {
          // Convert data URI to Blob
          const imageBlob = dataUriToBlob(preparedImageUrl);
          const imageFile = new File([imageBlob], "prepared-image.jpg", { type: "image/jpeg" });
          // Upload to Fal storage
          imageUrlForVideo = await uploadToFalStorage(imageFile, user.username);
          update({ id: toastId, title: "Image Uploaded!", description: "Starting video generation..." });
        } catch (uploadError) {
          console.error("Error uploading to Fal storage:", uploadError);
          update({ id: toastId, title: "Upload Failed", description: "Failed to upload image to Fal.ai storage.", variant: "destructive" });
          setIsGenerating(false);
          setIsUploadingToFal(false);
          return;
        } finally {
          setIsUploadingToFal(false);
        }
      }

      const videoInput = {
        prompt: currentPrompt,
        image_url: imageUrlForVideo,
        videoModel,
        resolution,
        duration,
        seed: seed === "-1" ? -1 : parseInt(seed),
        camera_fixed: cameraFixed,
        selectedPredefinedPrompt,
        modelMovement,
        fabricMotion,
        cameraAction,
        aestheticVibe,
      };

      const response = await fetch('/api/video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoInput),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to start generation: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to start generation: ${response.statusText}`);
      }

      const { taskId, historyItemId: hId } = await response.json();
      setGenerationTaskId(taskId);
      setHistoryItemId(hId);

      toast({
        title: "Video Generation Started",
        description: "Processing in background. Result will appear here and in history.",
        duration: 5000
      });

    } catch (error) {
      console.error('Error initiating video generation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
      setGenerationError(errorMessage);
      toast({ title: "Generation Error", description: errorMessage, variant: "destructive" });
      setIsGenerating(false); // Set to false only on error
    }
  };

  const handleCancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationTaskId(null);
    setHistoryItemId(null);
    // TODO: If there's a way to cancel on the backend via taskId, implement here
    toast({ title: "Generation Cancelled", description: "Video generation stopped by user." });
  }, [toast]);


  // Efficient video status polling using dedicated endpoint
  useEffect(() => {
    if (!historyItemId || !isGenerating) return;

    let isCancelled = false;
    const poll = async () => {
      if (isCancelled) return;

      try {
        // Call the new, specific endpoint
        const response = await fetch(`/api/history/${historyItemId}/status`, { cache: 'no-store' });

        if (!response.ok) {
          // Stop polling on server errors like 404 or 500
          console.error(`Status check failed: ${response.status}`);
          setGenerationError(`Status check failed: ${response.statusText}`);
          setIsGenerating(false);
          return;
        }

        const data: import('@/services/database.service').VideoStatusPayload = await response.json();

        if (data.status === 'completed') {
          setGeneratedVideoUrl(data.videoUrl || null);
          setGeneratedSeedValue(data.seed || null);
          setIsGenerating(false);
          toast({ title: "Video Generated!", description: "Video is ready." });
        } else if (data.status === 'failed') {
          setGenerationError(data.error || 'Video generation failed');
          setIsGenerating(false);
          toast({ title: "Generation Failed", description: data.error || 'An unknown error occurred.', variant: "destructive" });
        } else {
          // Still processing, schedule the next poll
          setTimeout(poll, 5000); 
        }

      } catch (error) {
        console.error("Error checking video status:", error);
        // Don't stop polling on network errors, just try again
        setTimeout(poll, 5000);
      }
    };

    // Start the first poll
    poll();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isGenerating) {
          isCancelled = true;
          setIsGenerating(false);
          toast({ title: "Generation Timed Out", description: "Taking too long. Check history later." });
      }
    }, 10 * 60 * 1000); // 10 min timeout

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [historyItemId, isGenerating, toast]);

  // Effect to simulate progress during generation
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | undefined;
    if (isGenerating && !generatedVideoUrl) {
      setProgressValue(10); // Start with a small amount
      progressInterval = setInterval(() => {
        setProgressValue(prev => {
          if (prev >= 95) { // Cap progress before completion
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.floor(Math.random() * 3) + 1; // Increment slowly and randomly
        });
      }, 800);
    } else {
      setProgressValue(0);
    }
    return () => clearInterval(progressInterval);
  }, [isGenerating, generatedVideoUrl]);


  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <PaletteIcon className="h-6 w-6 text-primary" />
              Animation & Style
            </CardTitle>
            <CardDescription className="hidden lg:block">Define the video&apos;s motion and aesthetic.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!preparedImageUrl && (
            <Alert className="md:col-span-2">
              <Info className="h-4 w-4" />
              <AlertTitle>Image Required</AlertTitle>
              <AlertDescription>
                Please prepare an image in the previous step to enable video generation.
              </AlertDescription>
            </Alert>
          )}

          <div className="md:col-span-2">
            <RenderSelectComponent
              id="predefined-animation"
              label="Predefined Animation"
              value={selectedPredefinedPrompt} onChange={setSelectedPredefinedPrompt}
              options={PREDEFINED_PROMPTS}
              disabled={commonFormDisabled}
            />
          </div>
          <RenderSelectComponent id="model-movement" label="Model Movement" value={modelMovement} onChange={setModelMovement} options={MODEL_MOVEMENT_OPTIONS} disabled={commonFormDisabled || selectedPredefinedPrompt !== 'custom'} />
          <RenderSelectComponent id="fabric-motion" label="Fabric Motion" value={fabricMotion} onChange={setFabricMotion} options={FABRIC_MOTION_OPTIONS_VIDEO} disabled={commonFormDisabled || selectedPredefinedPrompt !== 'custom'} />
          <RenderSelectComponent id="camera-action" label="Camera Action" value={cameraAction} onChange={setCameraAction} options={CAMERA_ACTION_OPTIONS} disabled={commonFormDisabled || selectedPredefinedPrompt !== 'custom'} />
          <RenderSelectComponent id="aesthetic-vibe" label="Aesthetic Vibe" value={aestheticVibe} onChange={setAestheticVibe} options={AESTHETIC_STYLE_OPTIONS} disabled={commonFormDisabled || selectedPredefinedPrompt !== 'custom'} />

          {/* Camera Position Control - moved here from Technical Parameters */}
          <div className="md:col-span-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="cameraFixed" 
                  checked={cameraFixed} 
                  onCheckedChange={setCameraFixed} 
                  disabled={commonFormDisabled} 
                />
                <Label htmlFor="cameraFixed" className="text-sm cursor-pointer">
                  Fix Camera Position
                </Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto p-1 text-muted-foreground">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      When enabled, prevents camera movement and keeps the shot static, 
                      focusing only on model and fabric motion.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="md:col-span-2 pt-2 space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="fullVideoPrompt" className="text-sm">Full Prompt</Label>
              {isManualPromptOutOfSync() && (
                <Button variant="link" size="sm" onClick={resetPromptToAuto} className="text-xs text-amber-600 hover:text-amber-700 p-0 h-auto">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Settings changed. Reset prompt?
                </Button>
              )}
            </div>
            <Textarea
              id="fullVideoPrompt"
              value={currentPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={3}
              className="text-xs font-mono"
              placeholder="Prompt will be generated here based on your selections, or you can type your own."
              disabled={commonFormDisabled}
            />
          </div>
        </CardContent>
      </Card>
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Technical Parameters
          </CardTitle>
          <CardDescription className="hidden lg:block">Configure resolution, duration, and other technical settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RenderSelectComponent
              id="video-model"
              label="Video Model"
              value={videoModel}
              onChange={(v) => setVideoModel(v as VideoModel)}
              options={[
                { value: 'lite', displayLabel: 'Seedance Lite (Default)', promptSegment: '' },
                { value: 'pro', displayLabel: 'Seedance Pro (Higher Quality)', promptSegment: '' },
              ]}
              disabled={commonFormDisabled}
            />
            <RenderSelectComponent
              id="resolution"
              label="Resolution"
              value={resolution}
              onChange={(v) => setResolution(v as VideoResolution)}
              options={resolutionOptions}
              disabled={commonFormDisabled}
              priceData={{ model: videoModel, resolution, duration }}
            />
            <RenderSelectComponent
              id="duration"
              label="Duration"
              value={duration}
              onChange={(v) => setDuration(v as VideoDuration)}
              options={[
                { value: '5', displayLabel: '5 seconds', promptSegment: '' },
                { value: '10', displayLabel: '10 seconds', promptSegment: '' }
              ]}
              disabled={commonFormDisabled}
              priceData={{ model: videoModel, resolution, duration }}
            />
            <div>
              <Label htmlFor="seed" className="text-sm">Seed</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="-1 for random" disabled={commonFormDisabled} className="text-sm"/>
                <Button variant="outline" size="icon" onClick={handleRandomSeed} disabled={commonFormDisabled} title="Use Random Seed"><Shuffle className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          {/* Removed camera position switch from here */}
        </CardContent>
        <CardFooter>
          <Button
            variant="gradient"
            onClick={handleGenerateVideo}
            disabled={commonFormDisabled || isGenerating || !currentPrompt.trim()}
            className="w-full text-lg hover:animate-shimmer"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <div className="flex items-center justify-center w-full">
                <Video className="mr-2 h-5 w-5" />
                <span>Generate Video</span>
                {estimatedCost !== null && !isGenerating && (
                  <Badge variant="secondary" className="ml-auto text-base">
                    {formatPrice(estimatedCost)}
                  </Badge>
                )}
              </div>
            )}
          </Button>
        </CardFooter>
      </Card>
      {!isVideoServiceAvailable && (
        <Card variant="glass" className="border-amber-500 bg-amber-50 text-amber-700">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle /> Service Not Available</CardTitle></CardHeader>
          <CardContent><p>Video generation service is not configured.</p></CardContent>
        </Card>
      )}
      {generationError && (
        <Card variant="glass" className="border-destructive bg-destructive/10 text-destructive">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle /> Generation Failed</CardTitle></CardHeader>
          <CardContent><p>{generationError}</p></CardContent>
        </Card>
      )}
      {isGenerating && !generatedVideoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              {isUploadingToFal ? "Uploading Image..." : "Generating Video..."}
            </CardTitle>
            <CardDescription>
              Your video is being processed. This may take a minute. Please wait.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-10">
            <div className="w-full max-w-md space-y-4">
              <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center relative overflow-hidden">
                <Video className="h-16 w-16 text-muted-foreground/50" />
              </div>
              <Progress 
                value={progressValue}
                isEstimating={true}
                className="h-2"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelGeneration}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              Cancel Generation
            </Button>
          </CardFooter>
        </Card>
      )}
      {generatedVideoUrl && !isGenerating && ( // Ensure isGenerating is false to show result
        (<Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle /> Video Ready!</CardTitle>
            {generatedSeedValue !== null && (<CardDescription>Seed used: {generatedSeedValue}</CardDescription>)}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted rounded-md overflow-hidden w-full aspect-video">
              <video src={getDisplayableImageUrl(generatedVideoUrl) || undefined} controls autoPlay loop playsInline className="w-full h-full object-contain" />
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href={getDisplayableImageUrl(generatedVideoUrl) || undefined} download={`RefashionAI_video_${generatedSeedValue || Date.now()}.mp4`}><Download className="h-4 w-4 mr-2" />Download Video</a>
            </Button>
          </CardContent>
        </Card>)
      )}
    </div>
  );
}
