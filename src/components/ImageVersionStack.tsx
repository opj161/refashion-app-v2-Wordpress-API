// src/components/ImageVersionStack.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Camera, 
  Crop as CropIcon, 
  Wand2, 
  Sparkles, 
  UserCheck, 
  Clock
} from "lucide-react";
import { useImageStore } from "@/stores/imageStore";

interface ImageVersion {
  id: string;
  dataUri: string;
  label: string;
  sourceVersionId: string;
  createdAt: number;
}

interface ImageVersionStackProps {
  versions: Record<string, ImageVersion>;
  activeVersionId: string | null;
  isProcessing: boolean;
}

const getVersionIcon = (label: string) => {
  if (label.includes('Original')) return <Camera className="h-4 w-4" />;
  if (label.includes('Cropped')) return <CropIcon className="h-4 w-4" />;
  if (label.includes('Background')) return <Wand2 className="h-4 w-4" />;
  if (label.includes('Upscaled')) return <Sparkles className="h-4 w-4" />;
  if (label.includes('Face')) return <UserCheck className="h-4 w-4" />;
  return <Camera className="h-4 w-4" />;
};

const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes === 0) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
};

export default function ImageVersionStack({ 
  versions, 
  activeVersionId, 
  isProcessing 
}: ImageVersionStackProps) {
  const { setActiveVersion } = useImageStore();
  // Sort versions by creation time, with original first
  const sortedVersions = Object.values(versions).sort((a, b) => {
    if (a.id === 'original') return -1;
    if (b.id === 'original') return 1;
    return a.createdAt - b.createdAt;
  });

  if (sortedVersions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedVersions.map((version, index) => {
          const isActive = version.id === activeVersionId;
          const sourceVersion = version.sourceVersionId ? versions[version.sourceVersionId] : null;
          
          return (
            <div
              key={version.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-all
                ${isActive 
                  ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                  : 'bg-muted/30 border-muted-foreground/20 hover:bg-muted/50'
                }
                ${isProcessing ? 'opacity-50' : 'cursor-pointer'}
              `}
              onClick={() => !isProcessing && setActiveVersion(version.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {getVersionIcon(version.label)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                      {version.label}
                    </span>
                    {isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(version.createdAt)}</span>
                    {sourceVersion && (
                      <span>• from {sourceVersion.label}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}