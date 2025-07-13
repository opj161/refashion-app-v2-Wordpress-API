'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllUsersHistoryPaginatedForAdmin } from '@/actions/historyActions';
import type { HistoryItem } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import HistoryCard from '@/components/HistoryCard'; // Re-use the existing card for consistency
import { PageHeader } from '@/components/ui/page-header';
import { LayoutDashboard } from 'lucide-react';

export default function AdminDashboardPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await getAllUsersHistoryPaginatedForAdmin(pageNum, 9);
        setItems(prev => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchHistory(1, false);
  }, [fetchHistory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          !loadingMore
        ) {
          fetchHistory(page + 1, true);
        }
      },
      { rootMargin: '200px' }
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
  }, [hasMore, loading, loadingMore, page, fetchHistory]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Admin Dashboard"
        description="View a live feed of all user creations across the platform."
        className="text-left py-0"
      />

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 border rounded-lg">
          No user history found yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {items.map(item => (
              <HistoryCard
                key={item.id}
                item={item}
                onViewDetails={() => {
                  /* Modal logic would be handled here or passed in */
                }}
                onReloadConfig={() => {
                  /* Reload logic handled here */
                }}
                onDeleteItem={() => {
                  /* Delete logic handled here */
                }}
                username={item.username}
              />
            ))}
          </div>
          <div ref={loadMoreRef} className="h-10" />

          {loadingMore && (
            <div className="flex justify-center mt-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
