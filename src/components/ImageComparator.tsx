"use client";

import React from 'react';
import ReactCompareImage from 'react-compare-image';
import { ChevronsLeftRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDisplayableImageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ImageComparatorProps {
  leftImageUri: string;
  rightImageUri: string;
}

const CustomHandle = () => (
  <div className="flex items-center justify-center h-10 w-10 bg-white/80 backdrop-blur-sm rounded-full border shadow-md cursor-ew-resize opacity-75 group-hover:opacity-100 transition-opacity">
    <ChevronsLeftRight className="h-5 w-5 text-gray-700" />
  </div>
);

const ComparisonSkeleton = () => (
  <div className="w-full h-full max-h-[60vh] bg-muted rounded-md flex items-center justify-center">
    <Skeleton className="w-full h-full" />
  </div>
);

export default function ImageComparator({
  leftImageUri,
  rightImageUri,
}: ImageComparatorProps) {
  return (
    // This div makes the component fill its parent container.
    <div className="w-full h-full image-comparator-wrapper">
      {/*
        The react-compare-image library applies an inline style of `object-fit: cover`, which crops the image.
        To override this, we must use a <style> tag with `!important`. This is the only
        way to win the CSS specificity battle against inline styles. The parent `.image-comparator-wrapper`
        scopes this override to only this component.
      */}
      <style jsx global>{`
        .image-comparator-wrapper .ReactCompareImage_img {
          object-fit: contain !important;
        }
      `}</style>
      <ReactCompareImage
        leftImage={getDisplayableImageUrl(leftImageUri) || ''}
        rightImage={getDisplayableImageUrl(rightImageUri) || ''}
        hover={true}
        handle={<CustomHandle />}
        sliderLineWidth={3}
        sliderLineColor="hsl(var(--primary))"
        skeleton={<ComparisonSkeleton />}
      />
    </div>
  );
}
