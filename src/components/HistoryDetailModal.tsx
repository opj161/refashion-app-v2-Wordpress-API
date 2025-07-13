"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Copy, X } from "lucide-react";
import { getDisplayableImageUrl } from "@/lib/utils";
import type { HistoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HistoryDetailModalProps {
  item: HistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReloadConfig: (item: HistoryItem) => void;
}

export function HistoryDetailModal({ item, isOpen, onClose, onReloadConfig }: HistoryDetailModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const allImages = useMemo(() => {
    if (!item) return [];
    return [
      { type: 'Original', url: item.originalClothingUrl },
      ...item.editedImageUrls
        .map((url, i) => (url ? { type: `Generated #${i + 1}`, url } : null))
        .filter((img): img is { type: string; url: string } => img !== null)
    ];
  }, [item]);

  useEffect(() => {
    if (item) {
      const firstGenerated = item.editedImageUrls?.find(url => url);
      setSelectedImageUrl(firstGenerated || item.originalClothingUrl);
    } else {
      setSelectedImageUrl(null);
    }
  }, [item]);

  if (!item) return null;

  const handleCopyPrompt = () => {
    if (!item.constructedPrompt) return;
    navigator.clipboard.writeText(item.constructedPrompt);
    toast({ title: 'Copied!', description: 'Prompt has been copied to clipboard.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] p-0 flex flex-col glass-card">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex flex-col h-full overflow-hidden"
        >
          <DialogHeader className="p-4 sm:p-6 pb-4 flex-shrink-0 border-b border-white/10">
            <DialogTitle>History Item Details</DialogTitle>
            <DialogDescription>
              Review of saved configuration from {new Date(item.timestamp).toLocaleString()}.
            </DialogDescription>
          </DialogHeader>

          {/* Main content area - switches from stacked to side-by-side layout */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            {/* Main Image Viewer */}
            <div className="flex-shrink-0 lg:flex-1 bg-black/20 lg:rounded-l-lg overflow-hidden flex items-center justify-center relative p-4 lg:p-0 min-h-[300px]">
              <AnimatePresence mode="wait">
                {selectedImageUrl && (
                  <motion.div
                    key={selectedImageUrl}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    <Image
                      src={getDisplayableImageUrl(selectedImageUrl) ?? '/placeholder.png'}
                      alt="Selected view"
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar with Details and Thumbnails */}
            <div className="flex flex-col lg:w-[350px] xl:w-[400px] flex-shrink-0 min-h-0 border-t lg:border-t-0 lg:border-l border-white/10">
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Thumbnails */}
                  <div className="grid grid-cols-2 gap-4">
                    {allImages.map(({ type, url }, index) => (
                      <button
                        key={`${url}-${index}`}
                        onClick={() => setSelectedImageUrl(url)}
                        className={cn(
                          "relative aspect-[2/3] rounded-md overflow-hidden border border-white/10 transition-all ring-offset-background ring-offset-2 focus:outline-none focus:ring-2 focus:ring-ring",
                          selectedImageUrl === url ? 'ring-2 ring-primary' : 'hover:opacity-80'
                        )}
                      >
                        <Image
                          src={getDisplayableImageUrl(url) ?? '/placeholder.png'}
                          alt={type}
                          fill
                          className={cn(
                            type === 'Original' ? 'object-contain p-1' : 'object-cover'
                          )}
                          sizes="(max-width: 1023px) 50vw, 15vw"
                        />
                        <div className="absolute bottom-0 w-full bg-black/70 text-white text-[10px] p-1 text-center truncate backdrop-blur-sm">
                          {type}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Configuration Accordion */}
                  <Accordion type="multiple" defaultValue={['attributes']} className="w-full">
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <AccordionItem value="attributes">
                        <AccordionTrigger>Generation Parameters</AccordionTrigger>
                        <AccordionContent className="text-xs space-y-1 bg-muted/50 p-3 rounded-md">
                          {Object.entries(item.attributes).map(([key, value]) => {
                            if (value === 'default' || !value) return null;
                            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            return (
                              <p key={key}>
                                <strong>{formattedKey}:</strong> {String(value)}
                              </p>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="prompt">
                      <AccordionTrigger>Full Prompt</AccordionTrigger>
                      <AccordionContent className="relative text-xs text-muted-foreground bg-muted/50 p-3 rounded-md pr-10 whitespace-pre-wrap break-words">
                        {item.constructedPrompt}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1"
                          onClick={handleCopyPrompt}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="metadata">
                      <AccordionTrigger>Metadata</AccordionTrigger>
                      <AccordionContent className="text-xs space-y-1 bg-muted/50 p-3 rounded-md">
                        <p><strong>Created:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                        <p><strong>User:</strong> {item.username}</p>
                        <p><strong>Settings Mode:</strong> {item.settingsMode || 'basic'}</p>
                        <p className="break-all"><strong>ID:</strong> {item.id}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 p-4 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-2 bg-background/50">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <Button onClick={() => onReloadConfig(item)}>
              <Copy className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Use as Template</span>
            </Button>
            {selectedImageUrl &&
              <a href={getDisplayableImageUrl(selectedImageUrl) ?? '#'} download={`Refashion_Image_${item.id.substring(0, 6)}.png`}>
                <Button>
                  <Download className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download Selected</span>
                </Button>
              </a>
            }
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
