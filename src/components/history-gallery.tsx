// src/components/history-gallery.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getHistoryPaginated, deleteHistoryItem } from "@/actions/historyActions";
import type { HistoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ImageIcon } from "lucide-react";
import HistoryCard from "./HistoryCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { HistoryDetailModal } from './HistoryDetailModal'; // Import the new image modal
import { VideoPlaybackModal } from './VideoPlaybackModal'; // Import the video modal

type FilterType = 'all' | 'image' | 'video';

export default function HistoryGallery() {
  const { toast } = useToast();
  const router = useRouter();
  const [showSkeletons, setShowSkeletons] = useState<boolean>(false); // NEW: controls skeleton visibility
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // State for details modal
  const [detailItem, setDetailItem] = useState<HistoryItem | null>(null);

  // State for delete confirmation
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ref for the element that will trigger loading more items
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Animation variants for the gallery
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { stiffness: 300, damping: 25 }, // Removed 'type' property for compatibility
    },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
  };


  const itemsPerPage = 9; // Or any other number you prefer

  // Effect for initial load and filter changes
  useEffect(() => {
    // NEW: Timer to delay skeletons
    const skeletonTimer = setTimeout(() => {
      if (isLoading) setShowSkeletons(true);
    }, 500);
    const loadInitialHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getHistoryPaginated(1, itemsPerPage, currentFilter);
        setHistoryItems(result.items);
        setCurrentPage(result.currentPage);
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        toast({
          title: "Error Loading History",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setShowSkeletons(false); // NEW: always hide skeletons after load
      }
    };
    loadInitialHistory();
    // NEW: cleanup timer
    return () => clearTimeout(skeletonTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter, toast, itemsPerPage]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await getHistoryPaginated(currentPage + 1, itemsPerPage, currentFilter);
      setHistoryItems(prevItems => [...prevItems, ...result.items]);
      setCurrentPage(result.currentPage);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      toast({
        title: "Error Loading History",
        description: err instanceof Error ? err.message : "Could not fetch history items.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, currentPage, currentFilter, itemsPerPage, toast]);

  // Set up the IntersectionObserver to watch the loadMoreRef
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the trigger element is intersecting and we have more items to load
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { 
        threshold: 1.0, // Trigger when 100% of the element is visible
        rootMargin: '100px' // Start loading 100px before the element is visible
      }
    );
    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, handleLoadMore]); // Dependencies updated

  const handleFilterChange = (newFilter: string) => {
    setCurrentFilter(newFilter as FilterType);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleViewDetails = (item: HistoryItem) => {
    setDetailItem(item);
  };

  const handleReloadConfig = (item: HistoryItem) => {
    // Only navigate, do not show a toast here
    router.push(`/create?historyItemId=${item.id}`);
  };

  const handleDeleteRequest = (item: HistoryItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteHistoryItem(itemToDelete.id);

      if (result.success) {
        // Optimistic UI Update: Remove the item from the local state
        setHistoryItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
        setTotalCount(prevCount => prevCount - 1); // Decrement total count
        toast({
          title: "Item Deleted",
          description: "The history item has been permanently removed.",
        });
      } else {
        throw new Error(result.error || "Failed to delete the item.");
      }
    } catch (err) {
      console.error("Deletion failed:", err);
      toast({
        title: "Deletion Failed",
        description: err instanceof Error ? err.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null); // Close the dialog
    }
  };


  // Function to get display label for attribute values (similar to one in image-forge)
  // This might be better placed in a utils file if used in multiple places
  const getDisplayLabelForValue = (options: { value: string, displayLabel: string }[], value: string | undefined): string => {
    if (!value) return "N/A";
    return options.find(o => o.value === value)?.displayLabel || value;
  };

  // Simplified options for display in modal - ideally import from a shared location
  const FASHION_STYLE_OPTIONS_SIMPLE = [{value: "default_style", displayLabel: "Default"}, /* ... other styles */];
  const GENDER_OPTIONS_SIMPLE = [{value: "female", displayLabel: "Female"},  /* ... other genders */];
  // ... add other simplified option arrays as needed for the modal


  // Helper to check if item is a video
  const itemIsVideo = (item: HistoryItem) => !!(item.videoGenerationParams || (item.generatedVideoUrls && item.generatedVideoUrls.some(url => !!url)));

  return (
    <>
      <Tabs value={currentFilter} onValueChange={handleFilterChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && showSkeletons && !isLoadingMore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: itemsPerPage }).map((_, index) => (
            <div key={`skel-${index}`} className="p-4 border rounded-lg shadow-sm space-y-2 bg-muted/50">
              <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-10 text-red-600">
          <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
          <p>Error loading history: {error}</p>
        </div>
      )}

      {!isLoading && !error && historyItems.length === 0 && (
        <Card variant="glass" className="mt-8">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">No History Found</h3>
            <p className="text-muted-foreground mt-1">Creations for this filter will appear here once you&apos;ve made some.</p>
          </CardContent>
        </Card>
      )}

      <LayoutGroup>
        {!isLoading && !error && historyItems.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            layout
          >
            <AnimatePresence>
              {historyItems.map((item) => (
                <motion.div key={item.id} variants={itemVariants} layout>
                  <HistoryCard
                    item={item}
                    onViewDetails={handleViewDetails}
                    onReloadConfig={handleReloadConfig}
                    onDeleteItem={handleDeleteRequest}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        <AnimatePresence>
          {detailItem && itemIsVideo(detailItem) && (
            <VideoPlaybackModal
              item={detailItem}
              onClose={() => setDetailItem(null)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {detailItem && !itemIsVideo(detailItem) && (
            <HistoryDetailModal
              isOpen={!!detailItem}
              onClose={() => setDetailItem(null)}
              item={detailItem}
              onReloadConfig={handleReloadConfig}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Invisible trigger element for infinite scroll */}
      {hasMore && <div ref={loadMoreRef} className="h-4" />}

      {isLoadingMore && (
        <div className="text-center mt-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the history item and all associated images and videos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Yes, delete it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
