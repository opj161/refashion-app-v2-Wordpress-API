"use client";

import React from 'react';
import type { HistoryItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Copy, X } from 'lucide-react';
import { getDisplayableImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'motion/react';

interface VideoPlaybackModalProps {
  item: HistoryItem;
  onClose: () => void;
}

export function VideoPlaybackModal({ item, onClose }: VideoPlaybackModalProps) {
  const { toast } = useToast();
  const videoUrl = getDisplayableImageUrl(item.generatedVideoUrls?.[0] || '');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Prompt has been copied to clipboard.' });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="h-screen w-screen max-w-full sm:h-auto sm:max-w-6xl sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-lg glass-card p-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex flex-col h-full"
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Video Details</DialogTitle>
            <DialogDescription>
              Playback and details for your generated video from {new Date(item.timestamp).toLocaleString()}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 px-6 py-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:col-span-2 bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px] max-h-[70vh]"
              layoutId={`video-card-${item.id}`}
            >
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <p className="text-white">Video not available.</p>
              )}
            </motion.div>
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="font-semibold mb-1">Full Prompt</h4>
                  <div className="relative">
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md pr-10">
                      {item.videoGenerationParams?.prompt || item.constructedPrompt}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7"
                      onClick={() => handleCopy(item.videoGenerationParams?.prompt || item.constructedPrompt)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Parameters</h4>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p><strong>Seed:</strong> {item.videoGenerationParams?.seed}</p>
                    <p><strong>Resolution:</strong> {item.videoGenerationParams?.resolution}</p>
                    <p><strong>Duration:</strong> {item.videoGenerationParams?.duration}s</p>
                    <p><strong>Fixed Camera:</strong> {item.videoGenerationParams?.cameraFixed ? 'Yes' : 'No'}</p>
                    {item.videoGenerationParams?.modelMovement && (
                      <p><strong>Model Movement:</strong> {item.videoGenerationParams.modelMovement}</p>
                    )}
                    {item.videoGenerationParams?.fabricMotion && (
                      <p><strong>Fabric Motion:</strong> {item.videoGenerationParams.fabricMotion}</p>
                    )}
                    {item.videoGenerationParams?.cameraAction && (
                      <p><strong>Camera Action:</strong> {item.videoGenerationParams.cameraAction}</p>
                    )}
                    {item.videoGenerationParams?.aestheticVibe && (
                      <p><strong>Aesthetic Vibe:</strong> {item.videoGenerationParams.aestheticVibe}</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-auto p-6 border-t border-border/20">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <a href={videoUrl || '#'} download={`RefashionAI_video_${item.id}.mp4`}>
              <Button disabled={!videoUrl}>
                <Download className="h-4 w-4 sm:mr-2" /> 
                <span className="hidden sm:inline">Download</span>
              </Button>
            </a>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
