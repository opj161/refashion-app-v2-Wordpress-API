// src/lib/prompt-builder.ts

// --- Types ---
export interface OptionWithPromptSegment {
  value: string;
  displayLabel: string;
  promptSegment: string;
  basePrompt?: string; // Only for top-level style options in image generation
}

// Base parameters common to both or specific enough to be optional
export interface BaseGenerationParams {
  // Image specific (can be optional for video)
  gender?: string;
  bodyType?: string;
  bodySize?: string;
  ageRange?: string;
  ethnicity?: string;
  poseStyle?: string;
  background?: string;
  fashionStyle?: string;
  hairStyle?: string;
  modelExpression?: string;
  lightingType?: string;
  lightQuality?: string;
  cameraAngle?: string;
  lensEffect?: string;
  depthOfField?: string;
  timeOfDay?: string; // Also used by image if relevant to background
  overallMood?: string; // Image specific mood
  fabricRendering?: string;

  // Video specific (can be optional for image)
  selectedPredefinedPrompt?: string;
  modelMovement?: string;
  fabricMotion?: string; // Video specific fabric motion
  cameraAction?: string; // Video specific camera action
  aestheticVibe?: string; // Video specific aesthetic

  // Common or generic
  settingsMode?: 'basic' | 'advanced'; // For image prompt construction style
}

export interface ImageDetails {
    width: number;
    height: number;
    // Potentially other details like dominant colors, item type if known
}

interface BuildAIPromptArgs {
  type: 'image' | 'video';
  params: BaseGenerationParams;
  imageDetails?: ImageDetails; // Optional: details about the input image if relevant for prompt
}

// --- Helper Function ---
const getSelectedOption = (options: OptionWithPromptSegment[], value?: string): OptionWithPromptSegment | undefined => {
  if (!value) return undefined;
  return options.find(opt => opt.value === value);
};


// --- OPTION CONSTANTS ---
// Moved from image-parameters.tsx and video-parameters.tsx

// For Image Generation
export const FASHION_STYLE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default_style", displayLabel: "Default (General Fashion)", basePrompt: "Fashion photograph: A {gender} model, {modelDetails}, {poseStyleDetails} stylishly wearing this clothing item.", promptSegment: "A general, high-quality fashion photograph focusing on accurately depicting the model and clothing." },
  { value: "high_fashion_editorial", displayLabel: "High-Fashion Editorial", basePrompt: "High-fashion editorial photograph: A {gender} model, {modelDetails}, {poseStyleDetails} stylishly wearing this clothing item.", promptSegment: "This image should have strong artistic expression, a conceptual narrative, and dramatic flair typical of high-fashion editorials." },
  { value: "lifestyle_street", displayLabel: "Lifestyle / Street Style", basePrompt: "Street style photograph: A {gender} model, {modelDetails}, captured in a candid moment {poseStyleDetails} stylishly wearing this clothing item.", promptSegment: "Aim for authenticity and a natural, candid feel, showcasing fashion in a real-world urban or everyday environment." },
  { value: "ecommerce_product", displayLabel: "E-commerce / Product Focus", basePrompt: "E-commerce product photograph: The clothing item is clearly showcased on a {gender} model, {modelDetails}, {poseStyleDetails}.", promptSegment: "Focus on clear, appealing depiction of the garment, ensuring accurate representation of color, texture, and fit, usually against a clean background." },
  { value: "creative_conceptual", displayLabel: "Creative / Conceptual", basePrompt: "Conceptual fashion portrait: A {gender} model, {modelDetails}, {poseStyleDetails} stylishly wearing this clothing item, embodying an abstract concept.", promptSegment: "Push creative boundaries with unique visual metaphors, experimental styling, and symbolic imagery." },
];
export const GENDER_OPTIONS: OptionWithPromptSegment[] = [
  { value: "female", displayLabel: "Female", promptSegment: "female" },
  { value: "male", displayLabel: "Male", promptSegment: "male" },
  { value: "non_binary", displayLabel: "Non-binary", promptSegment: "non-binary" },
];
export const AGE_RANGE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "early_20s", displayLabel: "Early 20s", promptSegment: "in their early 20s" },
  { value: "late_20s", displayLabel: "Late 20s", promptSegment: "in their late 20s" },
  { value: "mid_30s", displayLabel: "Mid 30s", promptSegment: "in their mid-30s" },
  { value: "mid_40s", displayLabel: "Mid 40s", promptSegment: "in their mid-40s" },
  { value: "50_plus", displayLabel: "50+", promptSegment: "aged 50 or older" },
];
export const ETHNICITY_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "caucasian", displayLabel: "Caucasian", promptSegment: "of Caucasian ethnicity" },
  { value: "black", displayLabel: "Black", promptSegment: "of Black ethnicity" },
  { value: "east_asian", displayLabel: "East Asian", promptSegment: "of East Asian ethnicity" },
  { value: "south_asian", displayLabel: "South Asian", promptSegment: "of South Asian ethnicity" },
  { value: "hispanic_latino", displayLabel: "Hispanic / Latino/a/x", promptSegment: "of Hispanic or Latino/a/x ethnicity" },
  { value: "middle_eastern", displayLabel: "Middle Eastern", promptSegment: "of Middle Eastern ethnicity" },
  { value: "indigenous", displayLabel: "Indigenous", promptSegment: "of Indigenous ethnicity" },
  { value: "multiracial", displayLabel: "Multiracial", promptSegment: "of multiracial ethnicity" },
];
export const BODY_TYPE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "hourglass", displayLabel: "Hourglass", promptSegment: "with an hourglass body type" },
  { value: "athletic", displayLabel: "Athletic", promptSegment: "with an athletic body type" },
  { value: "pear", displayLabel: "Pear-shaped", promptSegment: "with a pear-shaped body type" },
  { value: "apple", displayLabel: "Apple-shaped", promptSegment: "with an apple-shaped body type" },
  { value: "rectangular", displayLabel: "Rectangular", promptSegment: "with a rectangular body type" },
  { value: "slim_build", displayLabel: "Slim Build", promptSegment: "with a slim build" },
  { value: "curvy_figure", displayLabel: "Curvy Figure", promptSegment: "with a curvy figure" },
  { value: "plus_size_body", displayLabel: "Plus-size Body", promptSegment: "with a plus-size body type" },
];
export const BODY_SIZE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "petite_frame", displayLabel: "Petite Frame", promptSegment: "with a petite frame" },
  { value: "average_build", displayLabel: "Average Build", promptSegment: "with an average build" },
  { value: "tall_stature", displayLabel: "Tall Stature", promptSegment: "with a tall stature" },
];
export const HAIR_STYLE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "long_wavy_cascading", displayLabel: "Long, Wavy, Cascading", promptSegment: "with long, wavy hair cascading over the shoulders" },
  { value: "sleek_bob_haircut", displayLabel: "Sleek Bob Haircut", promptSegment: "with a sleek bob haircut" },
  { value: "intricate_braided_updo", displayLabel: "Intricate Braided Updo", promptSegment: "with an intricate braided updo" },
  { value: "short_textured_pixie", displayLabel: "Short Textured Pixie Cut", promptSegment: "with a short, textured pixie cut with choppy layers" },
  { value: "shoulder_length_flowing", displayLabel: "Shoulder-Length, Flowing", promptSegment: "with shoulder-length, flowing hair" },
  { value: "chic_blonde_bob", displayLabel: "Chic Blonde Bob", promptSegment: "with a short, chic blonde bob" },
];
export const MODEL_EXPRESSION_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "serene_gentle_smile", displayLabel: "Serene, Gentle Smile", promptSegment: "with a serene and gentle smile" },
  { value: "intense_captivating_gaze", displayLabel: "Intense, Captivating Gaze", promptSegment: "with an intense, captivating gaze, looking directly into the camera" },
  { value: "joyful_exuberant_laugh", displayLabel: "Joyful, Exuberant Laugh", promptSegment: "with a joyful and exuberant laugh" },
  { value: "thoughtful_contemplative", displayLabel: "Thoughtful, Contemplative", promptSegment: "with a thoughtful and contemplative expression" },
  { value: "fierce_determined_look", displayLabel: "Fierce, Determined Look", promptSegment: "with a fierce and determined look" },
  { value: "neutral_professional_expression", displayLabel: "Neutral, Professional", promptSegment: "with a neutral, professional expression" },
];
export const POSE_STYLE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "natural_relaxed_pose", displayLabel: "Natural, Relaxed", promptSegment: "a natural, relaxed pose" },
  { value: "professional_poised_stance", displayLabel: "Professional, Poised", promptSegment: "a professional and poised stance" },
  { value: "editorial_dramatic_artistic", displayLabel: "Editorial, Dramatic, Artistic", promptSegment: "a dramatic, artistic editorial pose" },
  { value: "active_dynamic_movement", displayLabel: "Active, Dynamic Movement", promptSegment: "an active, dynamic pose showcasing movement" },
  { value: "confident_assertive_stance", displayLabel: "Confident, Assertive Stance", promptSegment: "a powerful, assertive stance with shoulders back, looking directly into the camera" },
  { value: "elegant_contrapposto", displayLabel: "Elegant Contrapposto", promptSegment: "an elegant contrapposto pose" },
  { value: "candid_moment_laughing", displayLabel: "Candid Moment, Laughing", promptSegment: "captured in a candid moment, laughing naturally" },
  { value: "looking_off_distance_thoughtful", displayLabel: "Looking Off-Distance, Thoughtful", promptSegment: "looking off into the distance thoughtfully" },
];
export const BACKGROUND_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default Background", promptSegment: "" },
  { value: "outdoor_nature_elements", displayLabel: "Outdoor & Nature", promptSegment: "an outdoor nature setting with appropriate natural elements" },
  { value: "beach_ocean_waves", displayLabel: "Beach & Ocean", promptSegment: "a beautiful beach setting with ocean waves and soft sand" },
  { value: "studio_white_seamless_minimalist", displayLabel: "Studio - White", promptSegment: "a modern minimalist photo studio with a seamless white background" },
  { value: "studio_grey_clean", displayLabel: "Studio - Clean Grey", promptSegment: "a minimalist studio setting with a light grey, clean background" },
  { value: "studio_gradient_subtle", displayLabel: "Studio - Subtle Gradient", promptSegment: "a studio setting with a subtle gradient background" },
  { value: "industrial_loft_exposed_brick", displayLabel: "Industrial Loft", promptSegment: "an industrial loft with exposed brick walls and large windows" },
  { value: "urban_streetscape_night_city_lights", displayLabel: "Urban Night Scene", promptSegment: "a bustling urban streetscape at night, with blurred city lights creating bokeh" },
  { value: "sun_dappled_forest_path", displayLabel: "Forest Path", promptSegment: "a sun-dappled forest path with light filtering through leaves" },
  { value: "stark_dramatic_desert", displayLabel: "Desert Landscape", promptSegment: "a stark, dramatic desert landscape with expansive views" },
  { value: "in_store_retail_environment", displayLabel: "Retail Store Environment", promptSegment: "a realistic in-store retail environment" },
  { value: "lifestyle_cozy_home_interior", displayLabel: "Cozy Home Interior", promptSegment: "a comfortable and stylish lifestyle home interior setting" },
  { value: "abstract_colored_background_moody", displayLabel: "Abstract Moody Background", promptSegment: "an abstract colored background focusing on mood and texture, rather than a specific location" },
];
export const TIME_OF_DAY_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "golden_hour_warm_glow", displayLabel: "Golden Hour (Warm Glow)", promptSegment: "during the golden hour, with warm, low, and directional sunlight casting long, soft shadows" },
  { value: "blue_hour_cool_ambiance", displayLabel: "Blue Hour (Cool Ambiance)", promptSegment: "during the blue hour, with cool, soft ambient light just before sunrise or after sunset" },
  { value: "moody_twilight_dusk_mysterious", displayLabel: "Moody Twilight/Dusk (Mysterious)", promptSegment: "at moody twilight or dusk, creating a mysterious and atmospheric feel" },
  { value: "bright_midday_sun_clear_sky", displayLabel: "Bright Midday Sun (Clear Sky)", promptSegment: "under bright midday sun on a clear day, creating strong highlights and defined shadows" },
  { value: "overcast_day_soft_diffused_light", displayLabel: "Overcast Day (Soft, Diffused Light)", promptSegment: "on an overcast day, providing soft, diffused, and even light" },
  { value: "night_time_artificial_city_glow", displayLabel: "Night Time (Artificial/City Glow)", promptSegment: "at night, illuminated by artificial lights, neon signs, or the ambient glow of a city" },
];
export const OVERALL_MOOD_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "cinematic_elegance_sophistication", displayLabel: "Cinematic Elegance, Sophistication", promptSegment: "The overall mood should be one of cinematic elegance and sophistication." },
  { value: "playful_vibrant_energetic_joyful", displayLabel: "Playful, Vibrant, Energetic, Joyful", promptSegment: "The overall mood should be playful, vibrant, and exude joyful energy." },
  { value: "serene_calm_understated_luxury", displayLabel: "Serene, Calm, Unders. Luxury", promptSegment: "The overall mood should be serene, calm, with an aura of understated luxury." },
  { value: "bold_rebellious_edgy_attitude", displayLabel: "Bold, Rebellious, Edgy Attitude", promptSegment: "The overall mood should be bold and rebellious, conveying an edgy attitude." },
  { value: "dreamy_romantic_ethereal_soft", displayLabel: "Dreamy, Romantic, Ethereal, Soft", promptSegment: "The overall mood should be dreamy, romantic, and ethereal, with a soft quality." },
  { value: "powerful_confident_assertive_strong", displayLabel: "Powerful, Confident, Assertive", promptSegment: "The overall mood should be powerful, confident, and assertive." },
  { value: "mysterious_enigmatic_intriguing", displayLabel: "Mysterious, Enigmatic, Intriguing", promptSegment: "The overall mood should be mysterious and enigmatic, creating a sense of intrigue." },
];
export const LIGHTING_TYPE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default (Style Driven)", promptSegment: "" },
  { value: "natural_available_light", displayLabel: "Natural Available Light", promptSegment: "Utilizing natural, available light characteristic of the chosen time and setting." },
  { value: "studio_softbox_even", displayLabel: "Studio Softbox (Even & Flattering)", promptSegment: "Professional studio lighting with large softboxes for even, flattering illumination and minimal harsh shadows." },
  { value: "studio_ring_light_defined_catchlight", displayLabel: "Studio Ring Light (Defined Catchlight)", promptSegment: "Using a ring light to create a defined, circular catchlight in the eyes and a focused illumination." },
  { value: "studio_three_point_sculpting", displayLabel: "Studio Three-Point (Sculpting)", promptSegment: "A classic three-point lighting setup (key, fill, back/rim light) to sculpt the subject and add dimension." },
  { value: "high_key_lighting_bright_airy", displayLabel: "High-Key Lighting (Bright & Airy)", promptSegment: "High-key lighting with a predominantly white or very light background, creating a bright and airy feel." },
  { value: "low_key_lighting_dark_dramatic", displayLabel: "Low-Key Lighting (Dark & Dramatic)", promptSegment: "Low-key lighting with deep shadows and a dark background, creating a dramatic and moody atmosphere." },
  { value: "rim_lighting_subject_separation", displayLabel: "Rim Lighting (Subject Separation)", promptSegment: "Using rim lighting to create a bright outline around the subject, separating them from the background." },
  { value: "cinematic_volumetric_light_rays", displayLabel: "Cinematic Volumetric Light Rays", promptSegment: "Cinematic lighting featuring volumetric effects like visible light rays or atmospheric haze." },
  { value: "chiaroscuro_strong_contrast_lighting", displayLabel: "Chiaroscuro (Strong Contrast)", promptSegment: "Chiaroscuro lighting with strong contrasts between light and shadow, creating a dramatic, painterly effect." },
  { value: "beauty_dish_focused_soft", displayLabel: "Beauty Dish (Focused Soft)", promptSegment: "Using a beauty dish for a focused yet soft light, often used for beauty and portrait shots." },
];
export const LIGHT_QUALITY_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default", promptSegment: "" },
  { value: "warm_golden_inviting", displayLabel: "Warm, Golden, Inviting", promptSegment: "The light quality is warm, golden, and inviting." },
  { value: "cool_blue_crisp", displayLabel: "Cool, Blue, Crisp", promptSegment: "The light quality is cool, blue, and crisp." },
  { value: "soft_diffused_ethereal", displayLabel: "Soft, Diffused, Ethereal", promptSegment: "The light quality is soft, diffused, and ethereal, wrapping gently around the subject." },
  { value: "hard_direct_graphic_shadows", displayLabel: "Hard, Direct, Graphic Shadows", promptSegment: "The light is hard and direct, creating crisp, well-defined, graphic shadows." },
  { value: "glowing_radiant_luminous", displayLabel: "Glowing, Radiant, Luminous", promptSegment: "The light appears glowing, radiant, or luminous, perhaps with a slight bloom effect." },
];
export const CAMERA_ANGLE_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default (Eye-Level)", promptSegment: "an eye-level shot" },
  { value: "low_angle_emphasize_height", displayLabel: "Low-Angle (Emphasize Height)", promptSegment: "a low-angle shot, making the subject appear powerful and tall" },
  { value: "high_angle_overview_diminish", displayLabel: "High-Angle (Overview/Diminish)", promptSegment: "a high-angle shot, offering an overview or making the subject seem smaller or more vulnerable" },
  { value: "dutch_angle_dynamic_unease", displayLabel: "Dutch Angle (Dynamic/Unease)", promptSegment: "a Dutch angle (canted frame), creating a sense of dynamism, tension, or unease" },
  { value: "profile_view_side", displayLabel: "Profile View (Side)", promptSegment: "a profile view, showing the subject from the side" },
  { value: "three_quarter_view_classic_portrait", displayLabel: "Three-Quarter View (Classic Portrait)", promptSegment: "a three-quarter view, a classic angle for portraits showing some depth" },
  { value: "full_body_shot_entire_outfit", displayLabel: "Full Body Shot (Entire Outfit)", promptSegment: "a full body shot, showcasing the entire outfit from head to toe" },
  { value: "medium_shot_waist_up_focus", displayLabel: "Medium Shot (Waist Up)", promptSegment: "a medium shot, typically from the waist up, balancing subject and some context" },
  { value: "close_up_facial_expression_details", displayLabel: "Close-Up (Facial Expression/Details)", promptSegment: "a close-up, focusing on facial expression or specific garment details" },
  { value: "extreme_close_up_texture_jewelry", displayLabel: "Extreme Close-Up (Texture/Jewelry)", promptSegment: "an extreme close-up, highlighting fabric texture, intricate details, or small accessories like jewelry" },
];
export const LENS_EFFECT_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default (Standard Perspective)", promptSegment: "Photographed with a standard lens perspective, offering a natural field of view." },
  { value: "portrait_lens_85mm_f1_8_bokeh", displayLabel: "Portrait Lens (85mm f/1.8 Style)", promptSegment: "Shot as if with an 85mm f/1.8 lens, creating a classic portrait compression and beautiful subject separation with creamy bokeh." },
  { value: "environmental_lens_35mm_context", displayLabel: "Environmental Lens (35mm Style)", promptSegment: "Shot as if with a 35mm lens, capturing more of the surroundings and providing context, good for street style or lifestyle." },
  { value: "wide_angle_lens_24mm_expansive_minimal_distortion", displayLabel: "Wide-Angle (24mm Expansive)", promptSegment: "Captured with a wide-angle lens perspective (around 24mm), showcasing an expansive scene or dramatic perspective, with minimal optical distortion." },
  { value: "macro_lens_intricate_detail", displayLabel: "Macro Lens (Intricate Detail)", promptSegment: "Using a macro lens effect for extreme close-up detail on textures, embroidery, stitching, or small accessories." },
  { value: "telephoto_lens_compression_subject_isolation", displayLabel: "Telephoto Lens (Compression & Isolation)", promptSegment: "Utilizing a telephoto lens (e.g., 200mm) compression effect, which flattens perspective and strongly isolates the subject from a distant, blurred background." },
];
export const DEPTH_OF_FIELD_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default (Balanced Focus)", promptSegment: "" },
  { value: "shallow_dof_creamy_bokeh_f1_8_style", displayLabel: "Shallow DoF (Creamy Bokeh, f/1.8 Style)", promptSegment: "Achieving a shallow depth of field (simulating an f/1.8 aperture) with a creamy, beautifully blurred bokeh background, making the subject pop." },
  { value: "deep_dof_all_sharp_f16_style", displayLabel: "Deep DoF (All Sharp, f/16 Style)", promptSegment: "Employing a deep depth of field (simulating an f/16 aperture) where both the subject and the background are in sharp focus, ideal for detailed environmental shots." },
  { value: "moderate_dof_subject_context_f5_6_style", displayLabel: "Moderate DoF (Subject & Context, f/5.6 Style)", promptSegment: "Using a moderate depth of field (simulating an f/5.6 aperture) to keep the subject sharp while retaining some recognizable detail in the background context." },
];
export const FABRIC_RENDERING_OPTIONS: OptionWithPromptSegment[] = [
  { value: "default", displayLabel: "Default Rendering", promptSegment: "The fabric of the clothing item should be rendered with realistic texture, drape, and interaction with light." },
  { value: "lustrous_sheen_silk_satin_highlight", displayLabel: "Lustrous Sheen (Silks/Satins)", promptSegment: "Render the fabric with a lustrous sheen, characteristic of silk or satin, effectively catching and reflecting light to show its smooth, luxurious surface." },
  { value: "matte_textured_wool_tweed_weave", displayLabel: "Matte & Textured (Wools/Tweeds)", promptSegment: "Emphasize a matte finish and intricate fabric textures, clearly showing the weave or knit pattern of materials like wool, tweed, or heavy cotton." },
  { value: "flowing_ethereal_chiffon_organza_movement", displayLabel: "Flowing & Ethereal (Chiffon/Organza)", promptSegment: "Capture the flowing, ethereal quality of lightweight or sheer fabrics like chiffon or organza, showing graceful movement, folds, and translucency where appropriate." },
  { value: "crisp_structured_cotton_poplin_neoprene_form", displayLabel: "Crisp & Structured (Poplin/Neoprene)", promptSegment: "Highlight the crisp lines, sharp folds, and structured form of fabrics like cotton poplin, stiff linen, or neoprene." },
  { value: "soft_cozy_knitwear_cashmere_texture", displayLabel: "Soft & Cozy (Knitwear/Cashmere)", promptSegment: "Convey the soft, cozy, and tactile texture of knitwear, such as cashmere or chunky wool, with visible knit patterns and a comfortable drape." },
  { value: "rugged_denim_leather_aged_detail", displayLabel: "Rugged & Worn (Denim/Leather)", promptSegment: "Showcase a rugged, perhaps slightly worn or aged texture, suitable for denim (showing twill lines, fades) or leather (showing grain, subtle creases, polished or matte finish)." },
];

// For Video Generation
export const PREDEFINED_PROMPTS: OptionWithPromptSegment[] = [ // Adjusted to OptionWithPromptSegment for consistency
  { value: 'custom', displayLabel: 'Custom (Build your own)', promptSegment: '' }, // promptSegment is effectively the promptText here
  { value: '360_turn', displayLabel: '360° Turn', promptSegment: 'The model executes a single, slow 360-degree turn on the spot, while the camera remains completely static.' },
  { value: 'walks_toward_camera_pullback', displayLabel: 'Walks Toward You (Camera Pulls Back)', promptSegment: 'The model takes two slow, deliberate steps directly toward the camera, as the camera performs a smooth, subtle pull-back.' },
  { value: 'slow_zoom_in_detail', displayLabel: 'Slow Zoom In for Detail', promptSegment: 'The model slowly shifts her weight from one foot to the other in a subtle, continuous motion, as the camera performs a slow, graceful push-in.'},
  { value: 'turn_to_profile', displayLabel: 'Turn to Profile', promptSegment: 'The model gracefully turns her body 90 degrees to the side, holding the final pose. The camera remains static throughout the movement.'},
  { value: 'step_sideways_camera_follows', displayLabel: 'Step Sideways (Camera Follows)', promptSegment: 'The model takes one single, deliberate step to the side, and the camera performs a smooth, slight pan to follow her, keeping her centered in the frame.'},
  { value: 'walks_away_from_camera', displayLabel: 'Walks Away from Camera', promptSegment: 'The model begins walking in a slow, continuous motion on a diagonal path away from the camera. The camera remains completely static, letting her recede into the scene.'},
  { value: 'slow_zoom_out_reveal', displayLabel: 'Slow Zoom Out to Reveal Scene', promptSegment: 'The model stands perfectly still, holding her pose, as the camera executes a slow, continuous pull-back, revealing more of the surrounding environment.'},
  { value: '180_turn_camera_follows', displayLabel: '180° Turn (Camera Follows)', promptSegment: 'The model performs a slow, fluid half-turn (180 degrees), as the camera pans smoothly to follow her movement, keeping her upper body centered in the frame.'},
  { value: 'walks_toward_camera_still', displayLabel: 'Walks Toward You (Camera is Still)', promptSegment: 'The model walks powerfully and directly forward for three steps. The camera remains static, emphasizing her determined approach.'},
];
export const MODEL_MOVEMENT_OPTIONS: OptionWithPromptSegment[] = [
  { value: 'effortless_poise', displayLabel: 'Effortless Poise', promptSegment: 'settles into a composed, graceful pose with minimal movement' },
  { value: 'living_stillness', displayLabel: 'Living Stillness', promptSegment: 'maintains a poised presence with nearly imperceptible, natural micro-movements, appearing alive and present' },
  { value: 'subtle_posture_shift', displayLabel: 'Subtle Posture Shift', promptSegment: 'makes a slight, elegant shift in posture or weight distribution'},
  { value: 'engaging_gaze_shift', displayLabel: 'Engaging Gaze Shift', promptSegment: 's gaze softly meets the camera or drifts thoughtfully to the side'},
  { value: 'gentle_hair_sway', displayLabel: 'Gentle Hair Sway', promptSegment: 's hair subtly catches the light or sways gently as if from a light breeze'},
  { value: 'pose_for_feature_highlight', displayLabel: 'Pose for Feature Highlight', promptSegment: 'adjusts their pose subtly, drawing attention to a specific garment feature'},
  { value: 'elegant_turn_profile', displayLabel: 'Elegant Turn/Profile', promptSegment: 'executes a smooth, elegant turn or pivots slightly to showcase their profile'},
  { value: 'gentle_stride_initiation', displayLabel: 'Gentle Stride Initiation', promptSegment: 'initiates a slow, graceful step forward or to the side, as if about to walk'},
  { value: 'tactile_garment_adjustment', displayLabel: 'Tactile Garment Adjustment', promptSegment: 'lightly touches, smooths, or subtly adjusts a part of their attire'},
  { value: 'expressive_hand_gesture', displayLabel: 'Expressive Hand/Arm Gesture', promptSegment: 's hands make a soft, expressive gesture or arms shift into a new elegant position'},
];
export const FABRIC_MOTION_OPTIONS_VIDEO: OptionWithPromptSegment[] = [ // Renamed to avoid conflict if image has fabric options
  { value: 'fabric_settles_naturally', displayLabel: 'Fabric Settles Naturally', promptSegment: 'fabric settles or drapes naturally according to gravity and the model\'s form' },
  { value: 'soft_flow_with_movement', displayLabel: 'Soft Flow with Movement', promptSegment: 'fabric flows softly in response to the model\'s movement' },
  { value: 'light_play_on_surface', displayLabel: 'Light Play on Surface', promptSegment: 'fabric catches and plays with the light, creating subtle shimmers or highlights on its surface'},
  { value: 'gentle_ripple_or_crease', displayLabel: 'Gentle Ripple or Crease', promptSegment: 'fabric ripples or creases delicately, showing texture or lightness'},
  { value: 'airy_billow_subtle', displayLabel: 'Subtle Airy Billow', promptSegment: 'fabric billows lightly and subtly, as if touched by a soft, almost imperceptible breeze'},
  { value: 'structured_form_hold', displayLabel: 'Structured Form Hold', promptSegment: 'fabric holds its intended structure and silhouette with minimal flex'},
  { value: 'texture_emphasis_shift', displayLabel: 'Texture Emphasis (Subtle Shift)', promptSegment: 'fabric makes a very subtle shift or crease, highlighting its inherent texture and material quality'},
];
export const CAMERA_ACTION_OPTIONS: OptionWithPromptSegment[] = [
  { value: 'composed_static_shot', displayLabel: 'Composed Static Shot', promptSegment: 'camera maintains a steady, well-composed shot, focusing attention on the model and garment details' },
  { value: 'gentle_camera_breathe', displayLabel: 'Gentle Camera Breathe', promptSegment: 'camera has a very subtle, almost imperceptible "breathing" motion, adding a touch of life to a seemingly static frame' },
  { value: 'smooth_upward_pan_along_figure', displayLabel: 'Smooth Upward Pan (Along Figure)', promptSegment: 'camera smoothly pans upwards along the model, accentuating the full length of the outfit and their stance'},
  { value: 'slow_zoom_to_garment_detail', displayLabel: 'Slow Zoom to Garment Detail', promptSegment: 'camera performs a slow, deliberate zoom towards a key garment detail or texture'},
  { value: 'gentle_orbit_around_model', displayLabel: 'Gentle Orbit Around Model', promptSegment: 'camera executes a gentle, smooth orbiting motion around the model, showcasing the look from multiple angles'},
  { value: 'focus_shift_to_model', displayLabel: 'Focus Shift to Model', promptSegment: 'camera shifts focus from a softly blurred background to bring the model and outfit into sharp clarity'},
  { value: 'subtle_drift_and_reframe', displayLabel: 'Subtle Drift & Reframe', promptSegment: 'camera makes a slow, subtle drift or arc, slightly reframing the model within the shot'},
  { value: 'close_up_follow_detail_motion', displayLabel: 'Close-up Follow Detail in Motion', promptSegment: 'camera moves into a close-up and gently follows a specific detail, like a hand gesture or an accessory, as it moves'},
  { value: 'dolly_in_for_engagement', displayLabel: 'Dolly In for Engagement', promptSegment: 'camera slowly dollies in towards the model, creating a more intimate and engaging perspective'},
  { value: 'pull_back_for_wider_context', displayLabel: 'Pull Back for Wider Context', promptSegment: 'camera slowly pulls back from the initial full-body shot, widening the view to include more of the surrounding context or environment'},
];
export const AESTHETIC_VIBE_OPTIONS: OptionWithPromptSegment[] = [
  { value: 'natural_effortless_style', displayLabel: 'Natural & Effortless Style', promptSegment: 'Exudes a natural and effortless style.' },
  { value: 'timeless_chic_sophistication', displayLabel: 'Timeless Chic & Sophistication', promptSegment: 'Timelessly chic and sophisticated.' },
  { value: 'modern_sleek_edge', displayLabel: 'Modern Sleek Edge', promptSegment: 'Modern, sleek, with a sharp, contemporary edge.'},
  { value: 'dreamy_aspirational_escape', displayLabel: 'Dreamy Aspirational Escape', promptSegment: 'Ethereal and soft, like a dreamy, aspirational escape.'},
  { value: 'vibrant_confident_statement', displayLabel: 'Vibrant Confident Statement', promptSegment: 'Bold, vibrant, and confident, making a memorable statement.'},
  { value: 'warm_golden_hour_glow', displayLabel: 'Warm Golden Hour Glow', promptSegment: 'Bathed in the warm, magical glow of golden hour light.'},
  { value: 'artistic_indie_film_cool', displayLabel: 'Artistic Indie Film Cool', promptSegment: 'Effortlessly cool, with an artistic indie film aesthetic.'},
  { value: 'clean_studio_polish', displayLabel: 'Clean Studio Polish', promptSegment: 'Polished and sharp, with a clean, professional studio aesthetic.'},
  { value: 'bright_outdoor_freshness', displayLabel: 'Bright Outdoor Freshness', promptSegment: 'Bright, airy, and fresh, capturing a vibrant outdoor ambiance.'},
];
// --- END OPTION CONSTANTS ---


// --- Main Prompt Building Function ---
export function buildAIPrompt({ type, params }: BuildAIPromptArgs): string {
  if (type === 'image') {
    // Logic from image-parameters.tsx constructPrompt
    const {
        gender, bodyType, bodySize, ageRange, ethnicity, poseStyle, background,
        fashionStyle, hairStyle, modelExpression, lightingType, lightQuality,
        cameraAngle, lensEffect, depthOfField, timeOfDay, overallMood, fabricRendering,
        settingsMode
    } = params;

    if (settingsMode === 'basic') {
      const genderOption = getSelectedOption(GENDER_OPTIONS, gender)!;
      let modelDescriptionPart = `Create a PHOTOREALISTIC image of a ${genderOption.promptSegment} fashion model`;

      const attributePhrases: string[] = [];
      const bodyTypeOption = getSelectedOption(BODY_TYPE_OPTIONS, bodyType);
      if (bodyTypeOption && bodyTypeOption.value !== "default" && bodyTypeOption.promptSegment) attributePhrases.push(bodyTypeOption.promptSegment);

      const bodySizeOption = getSelectedOption(BODY_SIZE_OPTIONS, bodySize);
      if (bodySizeOption && bodySizeOption.value !== "default" && bodySizeOption.promptSegment) attributePhrases.push(bodySizeOption.promptSegment);

      const ageRangeOption = getSelectedOption(AGE_RANGE_OPTIONS, ageRange);
      if (ageRangeOption && ageRangeOption.value !== "default" && ageRangeOption.promptSegment) attributePhrases.push(ageRangeOption.promptSegment);

      const ethnicityOption = getSelectedOption(ETHNICITY_OPTIONS, ethnicity);
      if (ethnicityOption && ethnicityOption.value !== "default" && ethnicityOption.promptSegment && ethnicityOption.value !== "diverse_multiracial") { // Assuming diverse_multiracial was an old value
        attributePhrases.push(ethnicityOption.promptSegment);
      }

      if (attributePhrases.length > 0) modelDescriptionPart += `, ${attributePhrases.join(', ')}`;

      const poseStyleOption = getSelectedOption(POSE_STYLE_OPTIONS, poseStyle);
      if (poseStyleOption && poseStyleOption.value !== "default" && poseStyleOption.promptSegment) {
        modelDescriptionPart += ` standing in ${poseStyleOption.promptSegment}`;
      }

      modelDescriptionPart += " wearing this clothing item in the image.";

      let settingPart = "";
      const backgroundOption = getSelectedOption(BACKGROUND_OPTIONS, background);
      if (backgroundOption && backgroundOption.value !== "default" && backgroundOption.promptSegment) {
        settingPart = `\n\nSetting: ${backgroundOption.promptSegment}.`;
      }

      const stylePartOld = "\n\nStyle: The model should look authentic and relatable, with a natural expression and subtle smile. The clothing must fit perfectly and be the visual focus of the image.";
      const techPartOld = "\n\nTechnical details: Professional fashion photography with perfect exposure and color accuracy.";

      return `${modelDescriptionPart}${settingPart}${stylePartOld}${techPartOld}`;
    } else { // Advanced mode
        const styleOpt = getSelectedOption(FASHION_STYLE_OPTIONS, fashionStyle);
        let prompt = styleOpt?.basePrompt || FASHION_STYLE_OPTIONS.find(s => s.value === "default_style")!.basePrompt!;

        const genderOpt = getSelectedOption(GENDER_OPTIONS, gender)!;
        prompt = prompt.replace("{gender}", genderOpt.promptSegment);

        let modelDetailSegments: string[] = [];
        const addSegment = (optionArray: OptionWithPromptSegment[], value?: string) => {
          const opt = getSelectedOption(optionArray, value);
          if (opt && opt.value !== "default" && opt.promptSegment) modelDetailSegments.push(opt.promptSegment);
        };

        addSegment(AGE_RANGE_OPTIONS, ageRange);
        addSegment(ETHNICITY_OPTIONS, ethnicity);
        addSegment(BODY_TYPE_OPTIONS, bodyType);
        addSegment(BODY_SIZE_OPTIONS, bodySize);
        addSegment(HAIR_STYLE_OPTIONS, hairStyle);
        addSegment(MODEL_EXPRESSION_OPTIONS, modelExpression);

        prompt = prompt.replace("{modelDetails}", modelDetailSegments.length > 0 ? modelDetailSegments.join(", ") : "with typical features");

        const poseOpt = getSelectedOption(POSE_STYLE_OPTIONS, poseStyle);
        let poseDetail = "";
        if (poseOpt && poseOpt.value !== "default" && poseOpt.promptSegment) {
          poseDetail = `in ${poseOpt.promptSegment}`;
        }
        prompt = prompt.replace("{poseStyleDetails}", poseDetail);

        if (styleOpt && styleOpt.value !== "default_style" && styleOpt.promptSegment) {
          prompt += `\n\nOverall Style Notes: ${styleOpt.promptSegment}`;
        }

        let settingDescription = "";
        const backgroundOpt = getSelectedOption(BACKGROUND_OPTIONS, background);
        const timeOfDayOpt = getSelectedOption(TIME_OF_DAY_OPTIONS, timeOfDay);

        if (backgroundOpt && backgroundOpt.value !== "default" && backgroundOpt.promptSegment) {
          settingDescription += backgroundOpt.promptSegment;
        } else if (params.fashionStyle === "ecommerce_product") {
          settingDescription += getSelectedOption(BACKGROUND_OPTIONS, "studio_white_seamless_minimalist")!.promptSegment;
        }

        if (timeOfDayOpt && timeOfDayOpt.value !== "default" && timeOfDayOpt.promptSegment) {
          if (settingDescription) settingDescription += `, ${timeOfDayOpt.promptSegment}`;
          else settingDescription = `The scene is set ${timeOfDayOpt.promptSegment}`;
        }
        if (settingDescription) {
          prompt += `\n\nSetting: ${settingDescription}.`;
        }

        let lightingDescription = "";
        const lightingTypeOpt = getSelectedOption(LIGHTING_TYPE_OPTIONS, lightingType);
        const lightQualityOpt = getSelectedOption(LIGHT_QUALITY_OPTIONS, lightQuality);

        if (lightingTypeOpt && lightingTypeOpt.value !== "default" && lightingTypeOpt.promptSegment) {
          lightingDescription += lightingTypeOpt.promptSegment;
        } else {
          if (params.fashionStyle === "ecommerce_product") {
            lightingDescription += getSelectedOption(LIGHTING_TYPE_OPTIONS, "studio_softbox_even")!.promptSegment;
          } else if (params.fashionStyle === "lifestyle_street" && timeOfDayOpt?.value !== "default") {
              lightingDescription += getSelectedOption(LIGHTING_TYPE_OPTIONS, "natural_available_light")!.promptSegment;
          } else if (params.fashionStyle === "high_fashion_editorial" || params.fashionStyle === "creative_conceptual") {
            lightingDescription += "Lighting should be artistic and complement the concept, potentially dramatic or unconventional.";
          } else {
             lightingDescription += "Professional fashion photography lighting.";
          }
        }

        if (lightQualityOpt && lightQualityOpt.value !== "default" && lightQualityOpt.promptSegment) {
          if (lightingDescription.length > 0 && !lightingDescription.endsWith(".")) lightingDescription += ".";
          lightingDescription += ` ${lightQualityOpt.promptSegment}`;
        }
        if (lightingDescription) {
          prompt += `\n\nLighting: ${lightingDescription.trim()}`;
        }

        let shotDetailSegments: string[] = [];
        const addShotDetail = (optionArray: OptionWithPromptSegment[], value?: string) => {
          const opt = getSelectedOption(optionArray, value);
          if (opt && opt.value !== "default" && opt.promptSegment) shotDetailSegments.push(opt.promptSegment);
        };

        addShotDetail(CAMERA_ANGLE_OPTIONS, cameraAngle);
        addShotDetail(LENS_EFFECT_OPTIONS, lensEffect);
        addShotDetail(DEPTH_OF_FIELD_OPTIONS, depthOfField);

        if (shotDetailSegments.length > 0) {
          prompt += `\n\nShot Details: ${shotDetailSegments.join('. ')}.`;
        } else {
          if (params.fashionStyle === "ecommerce_product") {
            prompt += `\n\nShot Details: ${getSelectedOption(CAMERA_ANGLE_OPTIONS, "full_body_shot_entire_outfit")!.promptSegment}. ${getSelectedOption(LENS_EFFECT_OPTIONS, "default")!.promptSegment}.`;
          }
        }

        if (params.fashionStyle !== "creative_conceptual") {
          prompt += " The composition should be visually striking, well-balanced, and effectively showcase the subject and garment.";
        }

        const moodOpt = getSelectedOption(OVERALL_MOOD_OPTIONS, overallMood);
        if (moodOpt && moodOpt.value !== "default" && moodOpt.promptSegment) {
          prompt += `\n\nOverall Mood & Atmosphere: ${moodOpt.promptSegment}.`;
        }

        const fabricOpt = getSelectedOption(FABRIC_RENDERING_OPTIONS, fabricRendering);
        if (fabricOpt && fabricOpt.value !== "default" && fabricOpt.promptSegment) {
          prompt += `\n\nFabric Rendering Specifics: ${fabricOpt.promptSegment}.`;
        } else if (params.fashionStyle === "ecommerce_product") {
          prompt += `\n\nFabric Rendering Specifics: ${getSelectedOption(FABRIC_RENDERING_OPTIONS, "default")!.promptSegment} Emphasize true-to-life texture and how the fabric drapes on the model.`;
        } else {
          prompt += `\n\nFabric Rendering Specifics: ${getSelectedOption(FABRIC_RENDERING_OPTIONS, "default")!.promptSegment}`;
        }

        let finalQualityStatement = "The final image must be photorealistic, highly detailed, with impeccable exposure and color accuracy. Ensure the clothing fits the model perfectly and is the clear visual focus of the image. Avoid common AI artifacts, especially in hands and facial features, aiming for natural human anatomy.";
        if (params.fashionStyle === "ecommerce_product") {
          finalQualityStatement = "For this e-commerce shot, the final image must be exceptionally high-resolution, with tack-sharp focus on the garment. True-to-life color representation and clear visibility of fabric texture, weave, and garment details (stitching, buttons) are paramount. Ensure a clean, professional presentation and that the clothing fits the model accurately and flatteringly. No distracting elements.";
        } else if (params.fashionStyle === "high_fashion_editorial" || params.fashionStyle === "creative_conceptual") {
          finalQualityStatement = "The final image should be of exceptional artistic quality, highly detailed, and powerfully convey the intended concept or narrative. Exposure and color should be masterfully controlled, whether for accuracy or deliberate artistic effect. Subtleties in model expression and pose are critical. Avoid AI artifacts.";      }
        prompt += `\n\nTechnical & Quality Requirements: ${finalQualityStatement}`;

        return prompt.replace(/,\s*$/, ".").replace(/\.\s*\./g, ".").replace(/\s{2,}/g, ' ').trim();
    }

  } else if (type === 'video') {
    // Logic from video-parameters.tsx constructVideoPrompt
    const { selectedPredefinedPrompt, modelMovement, fabricMotion, cameraAction, aestheticVibe } = params;

    const predefined = getSelectedOption(PREDEFINED_PROMPTS, selectedPredefinedPrompt);
    if (predefined && predefined.value !== 'custom' && predefined.promptSegment) {
      return predefined.promptSegment; // This is the full prompt for predefined options
    }

    // Custom construction
    const getSeg = (options: OptionWithPromptSegment[], value?: string) => getSelectedOption(options, value)?.promptSegment || '';
    const modelMovementSeg = getSeg(MODEL_MOVEMENT_OPTIONS, modelMovement);
    const fabricMotionSeg = getSeg(FABRIC_MOTION_OPTIONS_VIDEO, fabricMotion); // Use renamed constant
    const cameraActionSeg = getSeg(CAMERA_ACTION_OPTIONS, cameraAction);
    const aestheticVibeSeg = getSeg(AESTHETIC_VIBE_OPTIONS, aestheticVibe);

    const clauses: string[] = [];
    if (modelMovementSeg) {
      const modelPrefix = modelMovementSeg.startsWith('s ') ? "The model'" : "The model ";
      let modelClause = `${modelPrefix}${modelMovementSeg}`;
      if (fabricMotionSeg) modelClause += `, and the garment's fabric ${fabricMotionSeg}`;
      clauses.push(modelClause + '.');
    } else if (fabricMotionSeg) {
      clauses.push(`The garment's fabric ${fabricMotionSeg}.`);
    }
    if (cameraActionSeg) clauses.push(`The camera ${cameraActionSeg}.`);
    if (aestheticVibeSeg) clauses.push(aestheticVibeSeg);

    return clauses.length > 0 ? clauses.join(' ') : 'A photorealistic fashion model posing elegantly in a stylish outfit.';
  }
  return "Invalid generation type specified.";
}
