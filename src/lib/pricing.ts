// src/lib/pricing.ts

export type VideoModel = 'lite' | 'pro';
export type VideoResolution = '480p' | '720p' | '1080p';
export type VideoDuration = '5' | '10';

// Base prices for a 5-second video
const PRICING_DATA: Record<VideoModel, Partial<Record<VideoResolution, number>>> = {
  lite: {
    '480p': 0.08,
    '720p': 0.18,
  },
  pro: {
    '480p': 0.15,
    '1080p': 0.74,
  },
};

/**
 * Calculates the estimated cost for a video generation.
 * @returns The cost as a number, or null if the combination is invalid.
 */
export function calculateVideoCost(
  model: VideoModel,
  resolution: VideoResolution,
  duration: VideoDuration
): number | null {
  const basePrice = PRICING_DATA[model]?.[resolution];

  if (basePrice === undefined) {
    return null; // Invalid combination (e.g., Lite model with 1080p)
  }

  const durationMultiplier = duration === '10' ? 2 : 1;
  return basePrice * durationMultiplier;
}

/**
 * Formats a price number into a display-friendly string (e.g., "~$0.18").
 * @returns A formatted string or an empty string if the price is null.
 */
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) {
    return "";
  }
  return `~${price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
}
