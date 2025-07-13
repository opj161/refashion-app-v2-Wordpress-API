// src/app/create/page.tsx
import CreationHub from "@/components/creation-hub";
import { PageHeader } from "@/components/ui/page-header";
import { Palette } from "lucide-react"; // Import a suitable icon

export default function CreatePage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 space-y-8">
      <PageHeader
        icon={Palette}
        title="Creation Hub"
        description="Generate new fashion images and videos using your uploaded clothing."
      />
      <CreationHub />
    </div>
  );
}
