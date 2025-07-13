// src/components/image-parameters.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Palette, PersonStanding, Settings2, Sparkles, Wand2, FileText, Shuffle, Save, Trash2, Eye, RefreshCw, Download, Video as VideoIcon, UserCheck, UploadCloud, AlertTriangle } from 'lucide-react';
import { generateImageEdit, regenerateSingleImage, type GenerateImageEditInput, type GenerateMultipleImagesOutput } from "@/ai/flows/generate-image-edit";
import { upscaleImageAction } from "@/ai/actions/upscale-image.action";
import { addHistoryItem, updateHistoryItem, getHistoryItemById } from "@/actions/historyActions";
import { useAuth } from "@/contexts/AuthContext";
import type { ModelAttributes, HistoryItem } from "@/lib/types";
import { getDisplayableImageUrl } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { usePromptManager } from '@/hooks/usePromptManager';
import { Textarea } from '@/components/ui/textarea';
import { useActiveImage, useImageStore } from "@/stores/imageStore";
import {
    FASHION_STYLE_OPTIONS, GENDER_OPTIONS, AGE_RANGE_OPTIONS, ETHNICITY_OPTIONS,
    BODY_TYPE_OPTIONS, BODY_SIZE_OPTIONS, HAIR_STYLE_OPTIONS, MODEL_EXPRESSION_OPTIONS,
    POSE_STYLE_OPTIONS, BACKGROUND_OPTIONS, TIME_OF_DAY_OPTIONS, OVERALL_MOOD_OPTIONS,
    LIGHTING_TYPE_OPTIONS, LIGHT_QUALITY_OPTIONS, CAMERA_ANGLE_OPTIONS, LENS_EFFECT_OPTIONS,
    DEPTH_OF_FIELD_OPTIONS, FABRIC_RENDERING_OPTIONS, OptionWithPromptSegment
} from '@/lib/prompt-builder';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MOTION_TRANSITIONS } from '@/lib/motion-constants';
import { useConfigurationStore } from "@/stores/configurationStore";

// Interface for image generation parameters
interface ImageGenerationParams extends ModelAttributes {
  settingsMode: 'basic' | 'advanced';
}

// Props interface for the component
interface ImageParametersProps {
}

// Constants
const NUM_IMAGES_TO_GENERATE = 3;

// Component now accepts props for loading configuration
export default function ImageParameters({}: ImageParametersProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  // Get prepared image from store instead of props
  const activeImage = useActiveImage();
  const resetImageState = useImageStore((state) => state.reset);
  const preparedImageUrl = activeImage?.dataUri || null;

  // State for parameters from Zustand store
  const {
    gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
    fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
    cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering,
    settingsMode,
    setParam, resetToDefaults
  } = useConfigurationStore();

  const [showAdvancedSettingsActiveMessage, setShowAdvancedSettingsActiveMessage] = useState<boolean>(false);

  // State for generation results
  const [outputImageUrls, setOutputImageUrls] = useState<(string | null)[]>(Array(NUM_IMAGES_TO_GENERATE).fill(null));
  const [originalOutputImageUrls, setOriginalOutputImageUrls] = useState<(string | null)[]>(Array(NUM_IMAGES_TO_GENERATE).fill(null));
  const [generationErrors, setGenerationErrors] = useState<(string | null)[]>(Array(NUM_IMAGES_TO_GENERATE).fill(null));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReRollingSlot, setIsReRollingSlot] = useState<number | null>(null);
  const [isUpscalingSlot, setIsUpscalingSlot] = useState<number | null>(null);
  const [comparingSlotIndex, setComparingSlotIndex] = useState<number | null>(null);
  const [activeHistoryItemId, setActiveHistoryItemId] = useState<string | null>(null);

  const commonFormDisabled = !preparedImageUrl || isLoading;

  // Load/Save settingsMode and user defaults from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = window.localStorage.getItem('imageForgeSettingsMode');
      if (storedMode === 'basic' || storedMode === 'advanced') {
        setParam('settingsMode', storedMode);
      }
    }
  }, [setParam]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('imageForgeSettingsMode', settingsMode);
    }
  }, [settingsMode]);

  // Consolidate all params for the hook
  const currentImageGenParams = React.useMemo((): ImageGenerationParams => ({
    gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
    fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
    cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering,
    settingsMode,
  }), [
    gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
    fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
    cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering,
    settingsMode
  ]);

  const {
    currentPrompt,
    isPromptManuallyEdited,
    handlePromptChange,
    resetPromptToAuto,
    isManualPromptOutOfSync,
  } = usePromptManager({
    generationType: 'image',
    generationParams: currentImageGenParams,
  });

  const handleSaveDefaults = () => {
    if (typeof window === 'undefined') return;
    const currentSettingsToSave: ModelAttributes = {
      gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
      fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
      cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering,
    };
    window.localStorage.setItem('imageForgeDefaults', JSON.stringify(currentSettingsToSave));
    toast({ 
      title: "Defaults Saved",
      description: "Your current settings have been saved for future sessions."
    });
  };

  const handleClearDefaults = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('imageForgeDefaults');
    resetToDefaults();
    toast({ 
      title: "Defaults Cleared",
      description: "All saved settings have been reset to application defaults."
    });
  };

  const handleRandomizeConfiguration = () => {
    const pickRandom = (options: OptionWithPromptSegment[]) => options[Math.floor(Math.random() * options.length)].value;

    const basicParams: (keyof ModelAttributes)[] = ['gender', 'bodyType', 'bodySize', 'ageRange', 'ethnicity', 'poseStyle', 'background'];
    const advancedParams: (keyof ModelAttributes)[] = [...basicParams, 'fashionStyle', 'hairStyle', 'modelExpression', 'lightingType', 'lightQuality', 'cameraAngle', 'lensEffect', 'depthOfField', 'timeOfDay', 'overallMood', 'fabricRendering'];

    const paramsToRandomize = settingsMode === 'advanced' ? advancedParams : basicParams;

    paramsToRandomize.forEach(param => {
      const options = {
        gender: GENDER_OPTIONS, bodyType: BODY_TYPE_OPTIONS, bodySize: BODY_SIZE_OPTIONS, ageRange: AGE_RANGE_OPTIONS, ethnicity: ETHNICITY_OPTIONS, poseStyle: POSE_STYLE_OPTIONS, background: BACKGROUND_OPTIONS,
        fashionStyle: FASHION_STYLE_OPTIONS, hairStyle: HAIR_STYLE_OPTIONS, modelExpression: MODEL_EXPRESSION_OPTIONS, lightingType: LIGHTING_TYPE_OPTIONS, lightQuality: LIGHT_QUALITY_OPTIONS, cameraAngle: CAMERA_ANGLE_OPTIONS,
        lensEffect: LENS_EFFECT_OPTIONS, depthOfField: DEPTH_OF_FIELD_OPTIONS, timeOfDay: TIME_OF_DAY_OPTIONS, overallMood: OVERALL_MOOD_OPTIONS, fabricRendering: FABRIC_RENDERING_OPTIONS,
      }[param];
      if (options) {
        setParam(param, pickRandom(options));
      }
    });

    toast({ title: "Configuration Randomized!" });
  };

  const handleSubmit = async () => {
    if (!preparedImageUrl) {
      toast({ title: "Image Not Prepared", description: "Please prepare an image in the previous step.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setOutputImageUrls(Array(NUM_IMAGES_TO_GENERATE).fill(null));
    setOriginalOutputImageUrls(Array(NUM_IMAGES_TO_GENERATE).fill(null));
    setGenerationErrors(Array(NUM_IMAGES_TO_GENERATE).fill(null));

    const finalPromptToUse = currentPrompt;
    const currentAttributes: ModelAttributes = {
      gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
      fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
      cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering
    };

    try {
      const input: GenerateImageEditInput = { prompt: finalPromptToUse, imageDataUriOrUrl: preparedImageUrl };
      const result: GenerateMultipleImagesOutput = await generateImageEdit(input, currentUser?.username || '');
      setOutputImageUrls(result.editedImageUrls);
      setGenerationErrors(result.errors || Array(NUM_IMAGES_TO_GENERATE).fill(null));

      if (result.errors && result.errors.some(e => e !== null)) {
        toast({ title: "Generation Issues", description: `${result.errors.filter(e => e !== null).length} image(s) failed.`, variant: "destructive" });
      } else {
        toast({ title: "Images Generated!", description: "Your edited images are ready." });
      }

      // Add to history
      if (currentUser && preparedImageUrl) {
        const newHistoryId = await addHistoryItem(currentAttributes, finalPromptToUse, preparedImageUrl, result.editedImageUrls, settingsMode);
        setActiveHistoryItemId(newHistoryId);
      }

    } catch (error) {
      console.error("Error generating images:", error);
      const errorMessage = (error as Error).message || "Unexpected error during image generation.";
      setGenerationErrors(Array(NUM_IMAGES_TO_GENERATE).fill(errorMessage));
      toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render select components
  const renderSelect = ({ id, label, value, onChange, options, disabled }: {
    id: string; label: string; value: string; onChange: (value: string) => void; options: OptionWithPromptSegment[]; disabled?: boolean;
  }) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full text-sm">
          <SelectValue placeholder={options.find(o => o.value === value)?.displayLabel || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (<SelectItem key={option.value} value={option.value} className="text-sm">{option.displayLabel}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );

  const handleUpscale = async (slotIndex: number) => {
    // Capture the URL to be upscaled at the beginning of the action.
    const imageUrlToUpscale = outputImageUrls[slotIndex];
    if (!imageUrlToUpscale) {
      toast({ title: "Image Not Available", variant: "destructive" });
      return;
    }
    setIsUpscalingSlot(slotIndex);
    try {
      let imageDataUriForAction: string;

      // Check if the imageUrl is a local path or already a data URI
      if (imageUrlToUpscale.startsWith('/uploads/')) {
        // It's a local path, convert to data URI
        const displayUrl = getDisplayableImageUrl(imageUrlToUpscale);
        if (!displayUrl) throw new Error("Could not create displayable URL.");
        const absoluteUrl = `${window.location.origin}${displayUrl}`;
        const response = await fetch(absoluteUrl);
        if (!response.ok) throw new Error(`Failed to fetch image for processing: ${response.statusText}`);
        const blob = await response.blob();
        imageDataUriForAction = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // It's already a data URI or a public URL, use it directly
        imageDataUriForAction = imageUrlToUpscale;
      }

      // We pass undefined for hash as this is a generated image, not the original upload
      const { savedPath } = await upscaleImageAction(imageDataUriForAction, undefined);

      if (activeHistoryItemId) {
        // The state isn't updated yet, so we build the arrays manually for the DB update
        const finalOriginals = [...originalOutputImageUrls];
        finalOriginals[slotIndex] = imageUrlToUpscale;
        const finalOutputs = [...outputImageUrls];
        finalOutputs[slotIndex] = savedPath;
        await updateHistoryItem(activeHistoryItemId, {
          editedImageUrls: finalOutputs,
          originalImageUrls: finalOriginals,
        });
      }

      // Use functional updates to prevent stale state issues in the UI.
      setOriginalOutputImageUrls(prev => {
        const newOriginals = [...prev];
        newOriginals[slotIndex] = imageUrlToUpscale;
        return newOriginals;
      });

      setOutputImageUrls(prev => {
        const newUrls = [...prev];
        newUrls[slotIndex] = savedPath;
        return newUrls;
      });

      toast({ title: `Image ${slotIndex + 1} Upscaled Successfully` });
    } catch (error) {
      console.error(`Error upscaling image ${slotIndex}:`, error);
      const errorMessage = (error as Error).message || "Unexpected error during upscaling.";
      toast({ title: "Upscaling Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUpscalingSlot(null);
    }
  };

  const handleDownloadOutput = (imageUrl: string | null, index: number) => {
    if (!imageUrl) return;
    const downloadUrl = getDisplayableImageUrl(imageUrl);
    if (!downloadUrl) return;

    fetch(downloadUrl)
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `RefashionAI_image_${index + 1}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }).catch(err => {
        toast({ title: "Download Error", variant: "destructive" });
    });
  };

  const handleSendToVideoPage = (imageUrl: string | null) => {
    if (!imageUrl) return;

    // 1. Reset the image store to clear the current session.
    resetImageState();

    // 2. Prepare and navigate to the create page for video generation.
    const params = new URLSearchParams();
    // The 'create' page expects 'sourceImageUrl' to load an image
    // and 'defaultTab' to select the correct tab.
    params.set('sourceImageUrl', imageUrl);
    params.set('defaultTab', 'video');
    router.push(`/create?${params.toString()}`);
  };

  // Helper to render select components
  const renderSelect = ({ id, label, value, onChange, options, disabled }: {
    id: string; label: string; value: string; onChange: (value: string) => void; options: OptionWithPromptSegment[]; disabled?: boolean;
  }) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full text-sm">
          <SelectValue placeholder={options.find(o => o.value === value)?.displayLabel || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (<SelectItem key={option.value} value={option.value} className="text-sm">{option.displayLabel}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );

  // Animation variants for results grid
  const resultsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
      },
    },
  };
  const resultItemVariant = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: MOTION_TRANSITIONS.spring.standard },
  };

  const shouldReduceMotion = useReducedMotion();
  const containerAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultsContainerVariants;
  const itemAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultItemVariant;

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Configure Image Parameters
            </CardTitle>
            <CardDescription className="hidden lg:block">Define the model, style, and scene for your fashion images.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Label htmlFor="settings-mode-switch" className="text-sm font-medium whitespace-nowrap">
                    {settingsMode === 'basic' ? 'Basic' : 'Advanced'}
                </Label>
                <Switch
                    id="settings-mode-switch"
                    checked={settingsMode === 'advanced'}
                    onCheckedChange={(checked: boolean) => setParam('settingsMode', checked ? 'advanced' : 'basic')}
                    disabled={commonFormDisabled}
                    aria-label="Toggle settings mode"
                />
            </div>
            <Button variant="outline" size="icon" onClick={handleRandomizeConfiguration} disabled={commonFormDisabled} aria-label="Randomize Configuration" title="Randomize Settings">
                <Shuffle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parameter Controls */}
          {settingsMode === 'advanced' ? (
            <>
              {/* Advanced Settings Accordions */}
              <Accordion type="multiple" defaultValue={["style-concept", "model-attributes"]} className="w-full">
                <AccordionItem value="style-concept">
                  <AccordionTrigger className="text-lg"><Sparkles className="h-5 w-5 mr-2 text-primary" />Overall Style & Concept</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "fashionStyle", label: "Photographic Style", value: fashionStyle, onChange: (value) => setParam('fashionStyle', value), options: FASHION_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "overallMood", label: "Desired Mood & Atmosphere", value: overallMood, onChange: (value) => setParam('overallMood', value), options: OVERALL_MOOD_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="model-attributes">
                  <AccordionTrigger className="text-lg"><PersonStanding className="h-5 w-5 mr-2 text-primary" />Model Attributes</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <RadioGroup value={gender} onValueChange={(value) => setParam('gender', value)} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                        {GENDER_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                            <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                          </div>
                        ))}
                    </RadioGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: (value) => setParam('ageRange', value), options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: (value) => setParam('ethnicity', value), options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: (value) => setParam('bodyType', value), options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: (value) => setParam('bodySize', value), options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "hairStyle", label: "Hair Style", value: hairStyle, onChange: (value) => setParam('hairStyle', value), options: HAIR_STYLE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "modelExpression", label: "Model Expression", value: modelExpression, onChange: (value) => setParam('modelExpression', value), options: MODEL_EXPRESSION_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: (value) => setParam('poseStyle', value), options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="scene-photographic">
                  <AccordionTrigger className="text-lg"><Settings2 className="h-5 w-5 mr-2 text-primary" />Scene & Photographic Details</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: (value) => setParam('background', value), options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "timeOfDay", label: "Time of Day", value: timeOfDay, onChange: (value) => setParam('timeOfDay', value), options: TIME_OF_DAY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightingType", label: "Lighting Type/Setup", value: lightingType, onChange: (value) => setParam('lightingType', value), options: LIGHTING_TYPE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightQuality", label: "Light Quality", value: lightQuality, onChange: (value) => setParam('lightQuality', value), options: LIGHT_QUALITY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "cameraAngle", label: "Camera Angle", value: cameraAngle, onChange: (value) => setParam('cameraAngle', value), options: CAMERA_ANGLE_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            /* Basic Mode Settings */
            (<div className="space-y-4">
              {showAdvancedSettingsActiveMessage && (
                <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                  <p><strong>Note:</strong> Some advanced settings are active. Switch to Advanced mode to review or modify them.</p>
                </div>
              )}
              <RadioGroup value={gender} onValueChange={(value) => setParam('gender', value)} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                {GENDER_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                    <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: (value) => setParam('bodyType', value), options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: (value) => setParam('bodySize', value), options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: (value) => setParam('ageRange', value), options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: (value) => setParam('ethnicity', value), options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: (value) => setParam('poseStyle', value), options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: (value) => setParam('background', value), options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
              </div>
            </div>)
          )}
           {/* Save/Clear Defaults Buttons */}
           <div className="flex gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={handleSaveDefaults} size="sm" disabled={commonFormDisabled}><Save className="mr-2 h-4 w-4"/>Save Defaults</Button>
                <Button variant="ghost" onClick={handleClearDefaults} size="sm" disabled={commonFormDisabled}><Trash2 className="mr-2 h-4 w-4"/>Clear Defaults</Button>
            </div>

          {/* Prompt Textarea */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label htmlFor="imagePromptTextarea" className="text-sm font-medium">Full Prompt</Label>
              {isManualPromptOutOfSync() && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-600">Prompt manually edited</span>
                  <Button variant="link" size="sm" onClick={resetPromptToAuto} className="text-xs text-amber-600 hover:text-amber-700 p-0 h-auto">
                    Reset to Auto
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id="imagePromptTextarea"
              value={currentPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={5}
              className="text-xs font-mono"
              placeholder="Prompt will be generated here based on your selections, or you can type your own."
              disabled={commonFormDisabled}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={isLoading || !preparedImageUrl || isReRollingSlot !== null || !currentPrompt.trim()}
              className="w-full text-lg hover:animate-shimmer"
              size="lg"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Images...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate {NUM_IMAGES_TO_GENERATE} Images
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
      {/* Generated Images Display */}
      {(outputImageUrls.some(uri => uri !== null) || generationErrors.some(err => err !== null) || isLoading) && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Generated Images
            </CardTitle>
            <CardDescription className="hidden lg:block">Your AI-generated fashion model images.</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerAnim}
              initial="hidden"
              animate="visible"
            >
              {/* If loading, render placeholders. Otherwise, map over results. */}
              {isLoading ? (
                Array.from({ length: NUM_IMAGES_TO_GENERATE }).map((_, index) => (
                  <div key={`loader-${index}`} className="aspect-[3/4] bg-muted/50 rounded-md border animate-pulse flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ))
              ) : (
                outputImageUrls.map((uri, index) => {
                  if (uri === null) {
                    return (
                      <div key={index} className="aspect-[3/4] bg-muted/50 rounded-md border flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Image {index + 1} not generated</p>
                      </div>
                    );
                  }
                  const isError = generationErrors[index] !== null;
                  const displayUrl = getDisplayableImageUrl(comparingSlotIndex === index ? originalOutputImageUrls[index] : uri) || '';
                  return (
                    <motion.div key={index} variants={itemAnim} className="group rounded-md overflow-hidden flex flex-col border border-border/20">
                      <div className="relative aspect-[3/4] w-full">
                        <Image
                          src={displayUrl || ''}
                          alt={`Generated Image ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Loading overlay for reroll/upscale */}
                        {(isReRollingSlot === index || isUpscalingSlot === index) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-card/80 backdrop-blur-md space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReRollImage(index)}
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Re-roll
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpscale(index)}
                            disabled={isLoading || isUpscalingSlot !== null || isReRollingSlot !== null || !!originalOutputImageUrls[index]}
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Upscale
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadOutput(uri, index)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendToVideoPage(uri)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <VideoIcon className="mr-2 h-4 w-4" /> Video
                          </Button>
                        </div>
                        {originalOutputImageUrls[index] && (
                          <Button variant="ghost" size="sm" className="w-full select-none"
                            onMouseDown={() => setComparingSlotIndex(index)}
                            onMouseUp={() => setComparingSlotIndex(null)}
                            onMouseLeave={() => setComparingSlotIndex(null)}
                            onTouchStart={(e) => { e.preventDefault(); setComparingSlotIndex(index); }}
                            onTouchEnd={() => setComparingSlotIndex(null)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Hold to Compare
                          </Button>
                        )}
                        {isError ? (
                          <p className="mt-2 text-sm text-red-500">{generationErrors[index]}</p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

  // Animation variants for results grid
  const resultsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
      },
    },
  };
  const resultItemVariant = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: MOTION_TRANSITIONS.spring.standard },
  };

  const shouldReduceMotion = useReducedMotion();
  const containerAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultsContainerVariants;
  const itemAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultItemVariant;

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Configure Image Parameters
            </CardTitle>
            <CardDescription className="hidden lg:block">Define the model, style, and scene for your fashion images.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Label htmlFor="settings-mode-switch" className="text-sm font-medium whitespace-nowrap">
                    {settingsMode === 'basic' ? 'Basic' : 'Advanced'}
                </Label>
                <Switch
                    id="settings-mode-switch"
                    checked={settingsMode === 'advanced'}
                    onCheckedChange={(checked: boolean) => setParam('settingsMode', checked ? 'advanced' : 'basic')}
                    disabled={commonFormDisabled}
                    aria-label="Toggle settings mode"
                />
            </div>
            <Button variant="outline" size="icon" onClick={handleRandomizeConfiguration} disabled={commonFormDisabled} aria-label="Randomize Configuration" title="Randomize Settings">
                <Shuffle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parameter Controls */}
          {settingsMode === 'advanced' ? (
            <>
              {/* Advanced Settings Accordions */}
              <Accordion type="multiple" defaultValue={["style-concept", "model-attributes"]} className="w-full">
                <AccordionItem value="style-concept">
                  <AccordionTrigger className="text-lg"><Sparkles className="h-5 w-5 mr-2 text-primary" />Overall Style & Concept</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "fashionStyle", label: "Photographic Style", value: fashionStyle, onChange: (value) => setParam('fashionStyle', value), options: FASHION_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "overallMood", label: "Desired Mood & Atmosphere", value: overallMood, onChange: (value) => setParam('overallMood', value), options: OVERALL_MOOD_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="model-attributes">
                  <AccordionTrigger className="text-lg"><PersonStanding className="h-5 w-5 mr-2 text-primary" />Model Attributes</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <RadioGroup value={gender} onValueChange={(value) => setParam('gender', value)} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                        {GENDER_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                            <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                          </div>
                        ))}
                    </RadioGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: (value) => setParam('ageRange', value), options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: (value) => setParam('ethnicity', value), options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: (value) => setParam('bodyType', value), options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: (value) => setParam('bodySize', value), options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "hairStyle", label: "Hair Style", value: hairStyle, onChange: (value) => setParam('hairStyle', value), options: HAIR_STYLE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "modelExpression", label: "Model Expression", value: modelExpression, onChange: (value) => setParam('modelExpression', value), options: MODEL_EXPRESSION_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: (value) => setParam('poseStyle', value), options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="scene-photographic">
                  <AccordionTrigger className="text-lg"><Settings2 className="h-5 w-5 mr-2 text-primary" />Scene & Photographic Details</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: (value) => setParam('background', value), options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "timeOfDay", label: "Time of Day", value: timeOfDay, onChange: (value) => setParam('timeOfDay', value), options: TIME_OF_DAY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightingType", label: "Lighting Type/Setup", value: lightingType, onChange: (value) => setParam('lightingType', value), options: LIGHTING_TYPE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightQuality", label: "Light Quality", value: lightQuality, onChange: (value) => setParam('lightQuality', value), options: LIGHT_QUALITY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "cameraAngle", label: "Camera Angle", value: cameraAngle, onChange: (value) => setParam('cameraAngle', value), options: CAMERA_ANGLE_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            /* Basic Mode Settings */
            (<div className="space-y-4">
              {showAdvancedSettingsActiveMessage && (
                <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                  <p><strong>Note:</strong> Some advanced settings are active. Switch to Advanced mode to review or modify them.</p>
                </div>
              )}
              <RadioGroup value={gender} onValueChange={(value) => setParam('gender', value)} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                {GENDER_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                    <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: (value) => setParam('bodyType', value), options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: (value) => setParam('bodySize', value), options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: (value) => setParam('ageRange', value), options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: (value) => setParam('ethnicity', value), options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: (value) => setParam('poseStyle', value), options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: (value) => setParam('background', value), options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
              </div>
            </div>)
          )}
           {/* Save/Clear Defaults Buttons */}
           <div className="flex gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={handleSaveDefaults} size="sm" disabled={commonFormDisabled}><Save className="mr-2 h-4 w-4"/>Save Defaults</Button>
                <Button variant="ghost" onClick={handleClearDefaults} size="sm" disabled={commonFormDisabled}><Trash2 className="mr-2 h-4 w-4"/>Clear Defaults</Button>
            </div>

          {/* Prompt Textarea */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label htmlFor="imagePromptTextarea" className="text-sm font-medium">Full Prompt</Label>
              {isManualPromptOutOfSync() && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-600">Prompt manually edited</span>
                  <Button variant="link" size="sm" onClick={resetPromptToAuto} className="text-xs text-amber-600 hover:text-amber-700 p-0 h-auto">
                    Reset to Auto
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id="imagePromptTextarea"
              value={currentPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={5}
              className="text-xs font-mono"
              placeholder="Prompt will be generated here based on your selections, or you can type your own."
              disabled={commonFormDisabled}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={isLoading || !preparedImageUrl || isReRollingSlot !== null || !currentPrompt.trim()}
              className="w-full text-lg hover:animate-shimmer"
              size="lg"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Images...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate {NUM_IMAGES_TO_GENERATE} Images
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
      {/* Generated Images Display */}
      {(outputImageUrls.some(uri => uri !== null) || generationErrors.some(err => err !== null) || isLoading) && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Generated Images
            </CardTitle>
            <CardDescription className="hidden lg:block">Your AI-generated fashion model images.</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerAnim}
              initial="hidden"
              animate="visible"
            >
              {/* If loading, render placeholders. Otherwise, map over results. */}
              {isLoading ? (
                Array.from({ length: NUM_IMAGES_TO_GENERATE }).map((_, index) => (
                  <div key={`loader-${index}`} className="aspect-[3/4] bg-muted/50 rounded-md border animate-pulse flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ))
              ) : (
                outputImageUrls.map((uri, index) => {
                  if (uri === null) {
                    return (
                      <div key={index} className="aspect-[3/4] bg-muted/50 rounded-md border flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Image {index + 1} not generated</p>
                      </div>
                    );
                  }
                  const isError = generationErrors[index] !== null;
                  const displayUrl = getDisplayableImageUrl(comparingSlotIndex === index ? originalOutputImageUrls[index] : uri) || '';
                  return (
                    <motion.div key={index} variants={itemAnim} className="group rounded-md overflow-hidden flex flex-col border border-border/20">
                      <div className="relative aspect-[3/4] w-full">
                        <Image
                          src={displayUrl || ''}
                          alt={`Generated Image ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Loading overlay for reroll/upscale */}
                        {(isReRollingSlot === index || isUpscalingSlot === index) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-card/80 backdrop-blur-md space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReRollImage(index)}
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Re-roll
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpscale(index)}
                            disabled={isLoading || isUpscalingSlot !== null || isReRollingSlot !== null || !!originalOutputImageUrls[index]}
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Upscale
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadOutput(uri, index)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendToVideoPage(uri)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <VideoIcon className="mr-2 h-4 w-4" /> Video
                          </Button>
                        </div>
                        {originalOutputImageUrls[index] && (
                          <Button variant="ghost" size="sm" className="w-full select-none"
                            onMouseDown={() => setComparingSlotIndex(index)}
                            onMouseUp={() => setComparingSlotIndex(null)}
                            onMouseLeave={() => setComparingSlotIndex(null)}
                            onTouchStart={(e) => { e.preventDefault(); setComparingSlotIndex(index); }}
                            onTouchEnd={() => setComparingSlotIndex(null)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Hold to Compare
                          </Button>
                        )}
                        {isError ? (
                          <p className="mt-2 text-sm text-red-500">{generationErrors[index]}</p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

  const handleReRollImage = async (slotIndex: number) => {
    if (!preparedImageUrl) {
      toast({ title: "Image Not Prepared", variant: "destructive" });
      return;
    }
    setIsReRollingSlot(slotIndex);
    
    try {
        const inputForReroll: GenerateImageEditInput = { prompt: currentPrompt, imageDataUriOrUrl: preparedImageUrl };
        const result = await regenerateSingleImage(inputForReroll, slotIndex, currentUser?.username || '');

        const updatedUrls = [...outputImageUrls];
        const newImageUrl = result.editedImageUrl;
        updatedUrls[slotIndex] = newImageUrl;
        setOutputImageUrls(updatedUrls);

        const updatedErrors = [...generationErrors];
        updatedErrors[slotIndex] = null; // Clear previous error on success
        setGenerationErrors(updatedErrors);

        // After re-rolling, the original for comparison might be gone.
        // We should clear the original URL for this slot.
        const currentOriginals = [...originalOutputImageUrls];
        currentOriginals[slotIndex] = null;
        setOriginalOutputImageUrls(currentOriginals);

        if (activeHistoryItemId && newImageUrl) {
            await updateHistoryItem(activeHistoryItemId, { 
              editedImageUrls: updatedUrls,
              originalImageUrls: currentOriginals 
            });
        }
        toast({ 
          title: `Image ${slotIndex + 1} Re-rolled`,
          description: "A new version of the image has been generated."
        });
    } catch (error) {
        toast({title: `Re-roll Failed (Slot ${slotIndex+1})`, description: (error as Error).message, variant: "destructive"});
        const updatedErrors = [...generationErrors];
        updatedErrors[slotIndex] = (error as Error).message || "Unknown re-roll error";
        setGenerationErrors(updatedErrors);
    } finally {
        setIsReRollingSlot(null);
    }
  };

  const handleUpscale = async (slotIndex: number) => {
    // Capture the URL to be upscaled at the beginning of the action.
    const imageUrlToUpscale = outputImageUrls[slotIndex];
    if (!imageUrlToUpscale) {
      toast({ title: "Image Not Available", variant: "destructive" });
      return;
    }
    setIsUpscalingSlot(slotIndex);
    try {
      let imageDataUriForAction: string;

      // Check if the imageUrl is a local path or already a data URI
      if (imageUrlToUpscale.startsWith('/uploads/')) {
        // It's a local path, convert to data URI
        const displayUrl = getDisplayableImageUrl(imageUrlToUpscale);
        if (!displayUrl) throw new Error("Could not create displayable URL.");
        const absoluteUrl = `${window.location.origin}${displayUrl}`;
        const response = await fetch(absoluteUrl);
        if (!response.ok) throw new Error(`Failed to fetch image for processing: ${response.statusText}`);
        const blob = await response.blob();
        imageDataUriForAction = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // It's already a data URI or a public URL, use it directly
        imageDataUriForAction = imageUrlToUpscale;
      }

      // We pass undefined for hash as this is a generated image, not the original upload
      const { savedPath } = await upscaleImageAction(imageDataUriForAction, undefined);

      if (activeHistoryItemId) {
        // The state isn't updated yet, so we build the arrays manually for the DB update
        const finalOriginals = [...originalOutputImageUrls];
        finalOriginals[slotIndex] = imageUrlToUpscale;
        const finalOutputs = [...outputImageUrls];
        finalOutputs[slotIndex] = savedPath;
        await updateHistoryItem(activeHistoryItemId, {
          editedImageUrls: finalOutputs,
          originalImageUrls: finalOriginals,
        });
      }

      // Use functional updates to prevent stale state issues in the UI.
      setOriginalOutputImageUrls(prev => {
        const newOriginals = [...prev];
        newOriginals[slotIndex] = imageUrlToUpscale;
        return newOriginals;
      });

      setOutputImageUrls(prev => {
        const newUrls = [...prev];
        newUrls[slotIndex] = savedPath;
        return newUrls;
      });

      toast({ title: `Image ${slotIndex + 1} Upscaled Successfully` });
    } catch (error) {
      console.error(`Error upscaling image ${slotIndex}:`, error);
      const errorMessage = (error as Error).message || "Unexpected error during upscaling.";
      toast({ title: "Upscaling Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUpscalingSlot(null);
    }
  };

  const handleDownloadOutput = (imageUrl: string | null, index: number) => {
    if (!imageUrl) return;
    const downloadUrl = getDisplayableImageUrl(imageUrl);
    if (!downloadUrl) return;

    fetch(downloadUrl)
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `RefashionAI_image_${index + 1}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }).catch(err => {
        toast({ title: "Download Error", variant: "destructive" });
    });
  };

  const handleSendToVideoPage = (imageUrl: string | null) => {
    if (!imageUrl) return;
    
    // 1. Reset the image store to clear the current session.
    resetImageState();

    // 2. Prepare and navigate to the create page for video generation.
    const params = new URLSearchParams();
    // The 'create' page expects 'sourceImageUrl' to load an image
    // and 'defaultTab' to select the correct tab.
    params.set('sourceImageUrl', imageUrl);
    params.set('defaultTab', 'video');
    router.push(`/create?${params.toString()}`);
  };

  // Helper to render select components
  const renderSelect = ({ id, label, value, onChange, options, disabled }: {
    id: string; label: string; value: string; onChange: (value: string) => void; options: OptionWithPromptSegment[]; disabled?: boolean;
  }) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full text-sm">
          <SelectValue placeholder={options.find(o => o.value === value)?.displayLabel || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (<SelectItem key={option.value} value={option.value} className="text-sm">{option.displayLabel}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );

  // Animation variants for results grid
  const resultsContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
      },
    },
  };
  const resultItemVariant = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: MOTION_TRANSITIONS.spring.standard },
  };
  
  const shouldReduceMotion = useReducedMotion();
  const containerAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultsContainerVariants;
  const itemAnim = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : resultItemVariant;

  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Configure Image Parameters
            </CardTitle>
            <CardDescription className="hidden lg:block">Define the model, style, and scene for your fashion images.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Label htmlFor="settings-mode-switch" className="text-sm font-medium whitespace-nowrap">
                    {settingsMode === 'basic' ? 'Basic' : 'Advanced'}
                </Label>
                <Switch
                    id="settings-mode-switch"
                    checked={settingsMode === 'advanced'}
                    onCheckedChange={(checked: boolean) => setSettingsMode(checked ? 'advanced' : 'basic')}
                    disabled={commonFormDisabled}
                    aria-label="Toggle settings mode"
                />
            </div>
            <Button variant="outline" size="icon" onClick={handleRandomizeConfiguration} disabled={commonFormDisabled} aria-label="Randomize Configuration" title="Randomize Settings">
                <Shuffle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parameter Controls */}
          {settingsMode === 'advanced' ? (
            <>
              {/* Advanced Settings Accordions */}
              <Accordion type="multiple" defaultValue={["style-concept", "model-attributes"]} className="w-full">
                <AccordionItem value="style-concept">
                  <AccordionTrigger className="text-lg"><Sparkles className="h-5 w-5 mr-2 text-primary" />Overall Style & Concept</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "fashionStyle", label: "Photographic Style", value: fashionStyle, onChange: setFashionStyle, options: FASHION_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "overallMood", label: "Desired Mood & Atmosphere", value: overallMood, onChange: setOverallMood, options: OVERALL_MOOD_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="model-attributes">
                  <AccordionTrigger className="text-lg"><PersonStanding className="h-5 w-5 mr-2 text-primary" />Model Attributes</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <RadioGroup value={gender} onValueChange={setGender} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                        {GENDER_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                            <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                          </div>
                        ))}
                    </RadioGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: setAgeRange, options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: setEthnicity, options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: setBodyType, options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: setBodySize, options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "hairStyle", label: "Hair Style", value: hairStyle, onChange: setHairStyle, options: HAIR_STYLE_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "modelExpression", label: "Model Expression", value: modelExpression, onChange: setModelExpression, options: MODEL_EXPRESSION_OPTIONS, disabled: commonFormDisabled })}
                        {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: setPoseStyle, options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="scene-photographic">
                  <AccordionTrigger className="text-lg"><Settings2 className="h-5 w-5 mr-2 text-primary" />Scene & Photographic Details</AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: setBackground, options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "timeOfDay", label: "Time of Day", value: timeOfDay, onChange:setTimeOfDay, options: TIME_OF_DAY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightingType", label: "Lighting Type/Setup", value: lightingType, onChange: setLightingType, options: LIGHTING_TYPE_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "lightQuality", label: "Light Quality", value: lightQuality, onChange: setLightQuality, options: LIGHT_QUALITY_OPTIONS, disabled: commonFormDisabled })}
                    {renderSelect({ id: "cameraAngle", label: "Camera Angle", value: cameraAngle, onChange: setCameraAngle, options: CAMERA_ANGLE_OPTIONS, disabled: commonFormDisabled })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            /* Basic Mode Settings */
            (<div className="space-y-4">
              {showAdvancedSettingsActiveMessage && (
                <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                  <p><strong>Note:</strong> Some advanced settings are active. Switch to Advanced mode to review or modify them.</p>
                </div>
              )}
              <RadioGroup value={gender} onValueChange={setGender} className="flex flex-row flex-wrap gap-2 pt-1" disabled={commonFormDisabled}>
                {GENDER_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`gender-${option.value}`} />
                    <Label htmlFor={`gender-${option.value}`} className="text-sm font-medium">{option.displayLabel}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderSelect({ id: "bodyType", label: "Body Type", value: bodyType, onChange: setBodyType, options: BODY_TYPE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "bodySize", label: "Body Frame/Stature", value: bodySize, onChange: setBodySize, options: BODY_SIZE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ageRange", label: "Age Range", value: ageRange, onChange: setAgeRange, options: AGE_RANGE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "ethnicity", label: "Ethnicity", value: ethnicity, onChange: setEthnicity, options: ETHNICITY_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "poseStyle", label: "Pose Style", value: poseStyle, onChange: setPoseStyle, options: POSE_STYLE_OPTIONS, disabled: commonFormDisabled })}
                {renderSelect({ id: "background", label: "Background Setting", value: background, onChange: setBackground, options: BACKGROUND_OPTIONS, disabled: commonFormDisabled })}
              </div>
            </div>)
          )}
           {/* Save/Clear Defaults Buttons */}
           <div className="flex gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={handleSaveDefaults} size="sm" disabled={commonFormDisabled}><Save className="mr-2 h-4 w-4"/>Save Defaults</Button>
                <Button variant="ghost" onClick={handleClearDefaults} size="sm" disabled={commonFormDisabled}><Trash2 className="mr-2 h-4 w-4"/>Clear Defaults</Button>
            </div>

          {/* Prompt Textarea */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label htmlFor="imagePromptTextarea" className="text-sm font-medium">Full Prompt</Label>
              {isManualPromptOutOfSync() && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-600">Prompt manually edited</span>
                  <Button variant="link" size="sm" onClick={resetPromptToAuto} className="text-xs text-amber-600 hover:text-amber-700 p-0 h-auto">
                    Reset to Auto
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id="imagePromptTextarea"
              value={currentPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={5}
              className="text-xs font-mono"
              placeholder="Prompt will be generated here based on your selections, or you can type your own."
              disabled={commonFormDisabled}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={isLoading || !preparedImageUrl || isReRollingSlot !== null || !currentPrompt.trim()}
              className="w-full text-lg hover:animate-shimmer"
              size="lg"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Images...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center"
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate {NUM_IMAGES_TO_GENERATE} Images
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
      {/* Generated Images Display */}
      {(outputImageUrls.some(uri => uri !== null) || generationErrors.some(err => err !== null) || isLoading) && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Generated Images
            </CardTitle>
            <CardDescription className="hidden lg:block">Your AI-generated fashion model images.</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerAnim}
              initial="hidden"
              animate="visible"
            >
              {/* If loading, render placeholders. Otherwise, map over results. */}
              {isLoading ? (
                Array.from({ length: NUM_IMAGES_TO_GENERATE }).map((_, index) => (
                  <div key={`loader-${index}`} className="aspect-[3/4] bg-muted/50 rounded-md border animate-pulse flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ))
              ) : (
                outputImageUrls.map((uri, index) => {
                  if (uri === null) {
                    return (
                      <div key={index} className="aspect-[3/4] bg-muted/50 rounded-md border flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Image {index + 1} not generated</p>
                      </div>
                    );
                  }
                  const isError = generationErrors[index] !== null;
                  const displayUrl = getDisplayableImageUrl(comparingSlotIndex === index ? originalOutputImageUrls[index] : uri) || '';
                  return (
                    <motion.div key={index} variants={itemAnim} className="group rounded-md overflow-hidden flex flex-col border border-border/20">
                      <div className="relative aspect-[3/4] w-full">
                        <Image
                          src={displayUrl || ''}
                          alt={`Generated Image ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Loading overlay for reroll/upscale */}
                        {(isReRollingSlot === index || isUpscalingSlot === index) && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-card/80 backdrop-blur-md space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReRollImage(index)}
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Re-roll
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpscale(index)}
                            disabled={isLoading || isUpscalingSlot !== null || isReRollingSlot !== null || !!originalOutputImageUrls[index]}
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Upscale
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadOutput(uri, index)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendToVideoPage(uri)}
                            className="flex-1"
                            disabled={isLoading || isReRollingSlot !== null || isUpscalingSlot !== null}
                          >
                            <VideoIcon className="mr-2 h-4 w-4" /> Video
                          </Button>
                        </div>
                        {originalOutputImageUrls[index] && (
                          <Button variant="ghost" size="sm" className="w-full select-none"
                            onMouseDown={() => setComparingSlotIndex(index)}
                            onMouseUp={() => setComparingSlotIndex(null)}
                            onMouseLeave={() => setComparingSlotIndex(null)}
                            onTouchStart={(e) => { e.preventDefault(); setComparingSlotIndex(index); }}
                            onTouchEnd={() => setComparingSlotIndex(null)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Hold to Compare
                          </Button>
                        )}
                        {isError ? (
                          <p className="mt-2 text-sm text-red-500">{generationErrors[index]}</p>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
