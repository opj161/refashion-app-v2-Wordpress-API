import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts upload URLs to use the image-proxy API route
 * This ensures images are served directly from filesystem, bypassing Next.js static file caching issues
 * @param originalPath - The original path like '/uploads/generated_images/image.png'
 * @returns The proxy path like '/api/image-proxy/generated_images/image.png'
 */
export function getDisplayableImageUrl(originalPath: string | null): string | null {
  if (!originalPath) return null;

  // Handle data URIs (base64 images) - return as-is
  if (originalPath.startsWith("data:")) {
    return originalPath;
  }

  // Convert /uploads/... paths to /api/image-proxy/... paths
  if (originalPath.startsWith("/uploads/")) {
    // Remove '/uploads/' prefix and add '/api/image-proxy/' prefix
    const subPath = originalPath.substring("/uploads/".length);
    return `/api/image-proxy/${subPath}`;
  }

  // For any other paths, return as-is
  return originalPath;
}
