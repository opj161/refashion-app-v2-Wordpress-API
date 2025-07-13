'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { SettingKey } from '@/services/settings.service';
import { updateSetting, triggerCacheCleanup, updateEncryptedSetting } from '@/actions/adminActions';
import { Loader2, Video, Wand2, Sparkles, UserCheck, Trash2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';

type SettingsState = Record<SettingKey, boolean>;

// Metadata for boolean feature flags ONLY
const FEATURE_FLAG_METADATA: Record<
  'feature_video_generation' | 'feature_background_removal' | 'feature_image_upscaling' | 'feature_face_detailer',
  { label: string; description: string; icon: React.ElementType }
> = {
  feature_video_generation: { label: 'Enable Video Generation', description: 'Allow users to access the video generation tab and features.', icon: Video },
  feature_background_removal: { label: 'Enable Background Removal', description: 'Allow users to use the background removal tool on uploaded images.', icon: Wand2 },
  feature_image_upscaling: { label: 'Enable Image Upscaling', description: 'Allow users to use the upscaling tool.', icon: Sparkles },
  feature_face_detailer: { label: 'Enable Face Detailer', description: 'Allow users to use the face enhancement tool.', icon: UserCheck },
};

// Add a prop for masked key status
interface SettingsFormProps {
  initialSettings: Record<SettingKey, string>;
  maskedApiKeys?: { gemini1: string; gemini2: string; gemini3: string; fal: string };
}

export function SettingsForm({ initialSettings, maskedApiKeys }: SettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(
    Object.entries(initialSettings).reduce((acc, [key, value]) => {
      acc[key as SettingKey] = value === 'true';
      return acc;
    }, {} as SettingsState)
  );
  const [isUpdating, setIsUpdating] = useState<Record<SettingKey, boolean>>({
    feature_video_generation: false,
    feature_background_removal: false,
    feature_image_upscaling: false,
    feature_face_detailer: false,
    global_gemini_api_key_1: false,
    global_gemini_api_key_2: false,
    global_gemini_api_key_3: false,
    global_fal_api_key: false,
  });
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isUpdatingApiKeys, setIsUpdatingApiKeys] = useState(false);
  const initialApiKeys = { 
    gemini1: initialSettings.global_gemini_api_key_1 || '', 
    gemini2: initialSettings.global_gemini_api_key_2 || '', 
    gemini3: initialSettings.global_gemini_api_key_3 || '', 
    fal: initialSettings.global_fal_api_key || '' 
  };
  const [apiKeys, setApiKeys] = useState(initialApiKeys);

  const handleSettingChange = async (key: SettingKey, value: boolean) => {
    setIsUpdating(prev => ({ ...prev, [key]: true }));
    setSettings(prev => ({...prev, [key]: value})); // Optimistic update

    const result = await updateSetting(key, value);
    if (!result.success) {
      toast({ title: 'Update Failed', description: result.error, variant: 'destructive' });
      setSettings(prev => ({...prev, [key]: !value})); // Revert on failure
    } else {
        toast({ title: 'Setting Updated', description: `${FEATURE_FLAG_METADATA[key as keyof typeof FEATURE_FLAG_METADATA]?.label} has been ${value ? 'enabled' : 'disabled'}.` });
    }
    setIsUpdating(prev => ({ ...prev, [key]: false }));
  };
  
  const handleCacheCleanup = async () => {
    setIsCleaningCache(true);
    const result = await triggerCacheCleanup();
    if(result.success) {
        toast({ title: 'Cache Cleanup', description: result.message });
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsCleaningCache(false);
  }

  const handleApiKeysUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingApiKeys(true);
    try {
      await updateEncryptedSetting('global_gemini_api_key_1', apiKeys.gemini1);
      await updateEncryptedSetting('global_gemini_api_key_2', apiKeys.gemini2);
      await updateEncryptedSetting('global_gemini_api_key_3', apiKeys.gemini3);
      await updateEncryptedSetting('global_fal_api_key', apiKeys.fal);
      toast({ title: 'API Keys Updated', description: 'Global API keys have been saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update API keys.', variant: 'destructive' });
    } finally {
      setIsUpdatingApiKeys(false);
    }
  };

  return (
    <div className="grid gap-6">
        <Card variant="glass">
            <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Enable or disable major application features in real-time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(FEATURE_FLAG_METADATA).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                        <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <Label htmlFor={key} className="font-medium">{meta.label}</Label>
                                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isUpdating[key as SettingKey] && <Loader2 className="h-4 w-4 animate-spin" />}
                                <Switch
                                    id={key}
                                    checked={!!settings[key as SettingKey]}
                                    onCheckedChange={(checked) => handleSettingChange(key as SettingKey, checked)}
                                    disabled={!!isUpdating[key as SettingKey]}
                                />
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
        
        <Card variant="glass">
            <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>Run maintenance tasks to keep the application running smoothly.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <Label className="font-medium">Clean Image Cache</Label>
                        <p className="text-xs text-muted-foreground">Removes old processed images (e.g., background-removed, upscaled) from the server to save space.</p>
                    </div>
                    <Button onClick={handleCacheCleanup} disabled={isCleaningCache}>
                        {isCleaningCache ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Run Cleanup
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Global API Keys</CardTitle>
            <CardDescription>Set the system-wide default API keys for AI services. User-specific keys will override these.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApiKeysUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="global_gemini_api_key_1">Global Gemini API Key 1</Label>
                <Input id="global_gemini_api_key_1" type="password" value={apiKeys.gemini1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({...prev, gemini1: e.target.value}))} placeholder={maskedApiKeys?.gemini1 || undefined} />
                {maskedApiKeys?.gemini1 && <div className="text-xs text-muted-foreground">Current: {maskedApiKeys.gemini1}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="global_gemini_api_key_2">Global Gemini API Key 2</Label>
                <Input id="global_gemini_api_key_2" type="password" value={apiKeys.gemini2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({...prev, gemini2: e.target.value}))} placeholder={maskedApiKeys?.gemini2 || undefined} />
                {maskedApiKeys?.gemini2 && <div className="text-xs text-muted-foreground">Current: {maskedApiKeys.gemini2}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="global_gemini_api_key_3">Global Gemini API Key 3</Label>
                <Input id="global_gemini_api_key_3" type="password" value={apiKeys.gemini3} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({...prev, gemini3: e.target.value}))} placeholder={maskedApiKeys?.gemini3 || undefined} />
                {maskedApiKeys?.gemini3 && <div className="text-xs text-muted-foreground">Current: {maskedApiKeys.gemini3}</div>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="global_fal_api_key">Global Fal.ai API Key</Label>
                <Input id="global_fal_api_key" type="password" value={apiKeys.fal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({...prev, fal: e.target.value}))} placeholder={maskedApiKeys?.fal || undefined} />
                {maskedApiKeys?.fal && <div className="text-xs text-muted-foreground">Current: {maskedApiKeys.fal}</div>}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdatingApiKeys}>
                  {isUpdatingApiKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Save API Keys
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
