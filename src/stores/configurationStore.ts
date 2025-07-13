// src/stores/configurationStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HistoryItem, ModelAttributes } from '@/lib/types';
import {
    GENDER_OPTIONS, BODY_TYPE_OPTIONS, BODY_SIZE_OPTIONS, AGE_RANGE_OPTIONS,
    ETHNICITY_OPTIONS, POSE_STYLE_OPTIONS, BACKGROUND_OPTIONS, FASHION_STYLE_OPTIONS,
    HAIR_STYLE_OPTIONS, MODEL_EXPRESSION_OPTIONS, LIGHTING_TYPE_OPTIONS,
    LIGHT_QUALITY_OPTIONS, CAMERA_ANGLE_OPTIONS, LENS_EFFECT_OPTIONS,
    DEPTH_OF_FIELD_OPTIONS, TIME_OF_DAY_OPTIONS, OVERALL_MOOD_OPTIONS,
    FABRIC_RENDERING_OPTIONS, PREDEFINED_PROMPTS, MODEL_MOVEMENT_OPTIONS,
    FABRIC_MOTION_OPTIONS_VIDEO, CAMERA_ACTION_OPTIONS, AESTHETIC_VIBE_OPTIONS
} from '@/lib/prompt-builder';

// --- Types ---
// Combine all parameters into a single state interface
interface ConfigurationState extends ModelAttributes {
  settingsMode: 'basic' | 'advanced';
  // Video specific params
  selectedPredefinedPrompt: string;
  modelMovement: string;
  fabricMotion: string;
  cameraAction: string;
  aestheticVibe: string;
  videoModel: 'lite' | 'pro';
  resolution: '480p' | '720p' | '1080p';
  duration: '5' | '10';
  seed: string;
  cameraFixed: boolean;
}

interface ConfigurationActions {
  setParam: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
  loadFromHistory: (item: HistoryItem) => void;
  resetToDefaults: () => void;
}

// --- Initial State Definition ---
const initialState: ConfigurationState = {
  // Image Params
  gender: GENDER_OPTIONS.find(o => o.value === "female")?.value || GENDER_OPTIONS[0].value,
  bodyType: BODY_TYPE_OPTIONS[0].value,
  bodySize: BODY_SIZE_OPTIONS[0].value,
  ageRange: AGE_RANGE_OPTIONS[0].value,
  ethnicity: ETHNICITY_OPTIONS[0].value,
  poseStyle: POSE_STYLE_OPTIONS.find(o => o.value === "natural_relaxed_pose")?.value || POSE_STYLE_OPTIONS[0].value,
  background: BACKGROUND_OPTIONS.find(o => o.value === "outdoor_nature_elements")?.value || BACKGROUND_OPTIONS[0].value,
  fashionStyle: FASHION_STYLE_OPTIONS[0].value,
  hairStyle: HAIR_STYLE_OPTIONS[0].value,
  modelExpression: MODEL_EXPRESSION_OPTIONS[0].value,
  lightingType: LIGHTING_TYPE_OPTIONS[0].value,
  lightQuality: LIGHT_QUALITY_OPTIONS[0].value,
  cameraAngle: CAMERA_ANGLE_OPTIONS[0].value,
  lensEffect: LENS_EFFECT_OPTIONS[0].value,
  depthOfField: DEPTH_OF_FIELD_OPTIONS[0].value,
  timeOfDay: TIME_OF_DAY_OPTIONS[0].value,
  overallMood: OVERALL_MOOD_OPTIONS[0].value,
  fabricRendering: FABRIC_RENDERING_OPTIONS[0].value,
  settingsMode: 'basic',
  // Video Params
  selectedPredefinedPrompt: 'custom',
  modelMovement: MODEL_MOVEMENT_OPTIONS[0].value,
  fabricMotion: FABRIC_MOTION_OPTIONS_VIDEO[0].value,
  cameraAction: CAMERA_ACTION_OPTIONS[0].value,
  aestheticVibe: AESTHETIC_VIBE_OPTIONS[0].value,
  videoModel: 'lite',
  resolution: '480p',
  duration: '5',
  seed: "-1",
  cameraFixed: false,
};

// --- Store Implementation ---
export const useConfigurationStore = create<ConfigurationState & ConfigurationActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setParam: (key, value) => set({ [key]: value }, false, `setParam/${key}`),

      loadFromHistory: (item) => {
        const imageAttrs = item.attributes || {};
        const videoAttrs = item.videoGenerationParams || {};
        set({
          // Load image attributes, falling back to initial state defaults
          ...Object.fromEntries(
            Object.keys(initialState).map(key => [
              key,
              imageAttrs[key as keyof ModelAttributes] ?? initialState[key as keyof ConfigurationState]
            ])
          ),
          // Load video attributes, falling back to initial state defaults
          videoModel: videoAttrs.videoModel || initialState.videoModel,
          resolution: videoAttrs.resolution || initialState.resolution,
          duration: videoAttrs.duration || initialState.duration,
          seed: videoAttrs.seed?.toString() || initialState.seed,
          cameraFixed: videoAttrs.cameraFixed ?? initialState.cameraFixed,
          modelMovement: videoAttrs.modelMovement || initialState.modelMovement,
          fabricMotion: videoAttrs.fabricMotion || initialState.fabricMotion,
          cameraAction: videoAttrs.cameraAction || initialState.cameraAction,
          aestheticVibe: videoAttrs.aestheticVibe || initialState.aestheticVibe,
          // Load settings mode
          settingsMode: item.settingsMode || 'basic',
        }, false, 'loadFromHistory');
      },

      resetToDefaults: () => set(initialState, false, 'resetToDefaults'),
    }),
    { name: 'configuration-store' }
  )
);
