// src/app/admin/settings/page.tsx
import { getAllSettings, getGlobalApiKeysForDisplay } from '@/actions/adminActions';
import { PageHeader } from '@/components/ui/page-header';
import { Settings } from 'lucide-react';
import { SettingsForm } from './_components/SettingsForm';

export default async function AdminSettingsPage() {
  const initialSettings = await getAllSettings();
  const maskedApiKeys = await getGlobalApiKeysForDisplay();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Settings}
        title="Application Settings"
        description="Manage feature flags and perform system maintenance."
        className="text-left py-0"
      />
      <SettingsForm initialSettings={initialSettings} maskedApiKeys={maskedApiKeys} />
    </div>
  );
}
