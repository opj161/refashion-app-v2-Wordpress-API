// src/app/history/page.tsx
import HistoryGallery from "@/components/history-gallery";
import { PageHeader } from "@/components/ui/page-header";
import { History } from "lucide-react"; // Using History as the icon from lucide-react

export default function HistoryPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 space-y-8">
      <PageHeader
        icon={History}
        title="Creation History"
        description="Review your past image and video generations."
      />
      <HistoryGallery />
    </div>
  );
}
