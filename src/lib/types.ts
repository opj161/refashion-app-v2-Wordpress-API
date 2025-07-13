export interface SessionUser {
  username: string;
  role: 'admin' | 'user';
  isLoggedIn: boolean;
}

export interface SessionData {
  user?: SessionUser;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  attributes: ModelAttributes;
  constructedPrompt: string;
  originalClothingUrl: string;
  editedImageUrls: (string | null)[];
  originalImageUrls?: (string | null)[]; // Store pre-face-detailed versions for comparison
  username: string;
  settingsMode?: 'basic' | 'advanced';
  generatedVideoUrls?: (string | null)[];
  videoGenerationParams?: {
    prompt: string;
    resolution: string;
    videoModel?: 'lite' | 'pro';
    duration: string;
    seed: number;
    sourceImageUrl: string;
    // NEW structured fields
    modelMovement: string;
    fabricMotion: string;
    cameraAction: string;
    aestheticVibe: string;
    cameraFixed: boolean;
    // Webhook-related fields
    localVideoUrl?: string | null;
  };
  status?: 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ModelAttributes {
  gender: string;
  bodyType: string;
  bodySize: string;
  ageRange: string;
  ethnicity: string;
  poseStyle: string;
  background: string;
  fashionStyle: string;
  hairStyle: string;
  modelExpression: string;
  lightingType: string;
  lightQuality: string;
  cameraAngle: string;
  lensEffect: string;
  depthOfField: string;
  timeOfDay: string;
  overallMood: string;
  fabricRendering: string;
}
