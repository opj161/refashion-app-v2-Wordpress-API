"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { HistoryItem } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, PlayCircle, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { getDisplayableImageUrl } from '@/lib/utils';
import { VideoPlaybackModal } from '@/components/VideoPlaybackModal';
import { motion, AnimatePresence } from 'motion/react';

interface VideoHistoryCardProps {
  item: HistoryItem;
}

export function VideoHistoryCard({ item }: VideoHistoryCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const thumbnailUrl = getDisplayableImageUrl(
    item.videoGenerationParams?.sourceImageUrl || item.originalClothingUrl || ''
  );
  const videoUrl = getDisplayableImageUrl(item.generatedVideoUrls?.[0] || '');
  const status = (item.videoGenerationParams as any)?.status;
  const error = (item.videoGenerationParams as any)?.error;

  // IntersectionObserver for autoplay-in-view
  useEffect(() => {
    const currentCard = cardRef.current;
    if (!currentCard || !videoUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry.isIntersecting);
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.5, // Play when 50% of the card is visible
      }
    );

    observer.observe(currentCard);

    return () => {
      observer.unobserve(currentCard);
    };
  }, [videoUrl]);

  // Handle video play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isInView) {
      video.play().catch(error => { if (error.name !== 'AbortError') console.error("Video play failed:", error); });
    } else {
      video.pause();
    }
  }, [isInView, videoUrl]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return videoUrl ? <CheckCircle className="h-4 w-4 text-green-500" /> : null;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'failed':
        return error || 'Generation failed';
      case 'completed':
        return videoUrl ? 'Ready' : 'Completed';
      default:
        return '';
    }
  };

  const canPlayVideo = status === 'completed' && videoUrl;

  return (
    <motion.div layout>
      <Card
        ref={cardRef}
        className="overflow-hidden group transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer"
        onClick={() => canPlayVideo && setIsModalOpen(true)}
      >
        <CardContent className="p-0">
          <motion.div
            layoutId={`video-card-${item.id}`}
            className="relative aspect-[9/16] w-full bg-muted"
          >
            {thumbnailUrl && (
              <Image
                src={thumbnailUrl}
                alt="Video thumbnail"
                fill
                className={`object-cover transition-opacity duration-300 ${isInView ? 'opacity-0' : 'opacity-100'}`}
              />
            )}
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                loop
                muted
                playsInline
                preload="metadata"
                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${isInView ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
            {/* Status overlay */}
            {status && (
              <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5">
                {getStatusIcon()}
              </div>
            )}
            {/* Play button overlay - only show for completed videos */}
            {!isInView && canPlayVideo && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="h-16 w-16 text-white/80" />
              </div>
            )}
            {/* Processing overlay for incomplete videos */}
            {status === 'processing' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-white text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Processing...</p>
                </div>
              </div>
            )}
            {/* Error overlay */}
            {status === 'failed' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm">Generation Failed</p>
                  {error && <p className="text-xs mt-1 opacity-80">{error}</p>}
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
        <CardFooter className="p-3 bg-card-foreground/5 flex-col items-start">
          <div className="flex items-center gap-2 w-full">
            <p className="text-sm font-medium truncate flex-1" title={item.constructedPrompt}>
              {item.constructedPrompt}
            </p>
            {status && (
              <div className="flex items-center gap-1 text-xs">
                {getStatusIcon()}
                <span className={`
                  ${status === 'processing' ? 'text-blue-600' : ''}
                  ${status === 'failed' ? 'text-red-600' : ''}
                  ${status === 'completed' ? 'text-green-600' : ''}
                `}>
                  {getStatusText()}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleDateString()}
          </p>
        </CardFooter>
      </Card>
      <AnimatePresence>
        {isModalOpen && (
          <VideoPlaybackModal item={item} onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
