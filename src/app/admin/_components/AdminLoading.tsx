import { Loader2 } from 'lucide-react';

export function AdminLoading() {
  return (
    <div className="flex w-full flex-col flex-1 items-center justify-center py-20">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-lg font-medium">Loading Page...</span>
      </div>
    </div>
  );
}
