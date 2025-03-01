'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from "@/components/ui/button";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
// import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Settings {
  emailFetchLimit: number;
  aiTemperature: number;
  autoDeleteThreshold: number;
  markAsReadOnOpen: boolean;
  showMarketingLabels: boolean;
}

export default function Settings() {
  const { data: session } = useSession();
  const router = useRouter();
  // const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    emailFetchLimit: 5,
    aiTemperature: 0.7,
    autoDeleteThreshold: 0.9,
    markAsReadOnOpen: true,
    showMarketingLabels: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only redirect if we're sure there's no session (session is null, not undefined)
    if (session === null) {
      router.push('/login');
      return;
    }

    // Load settings from localStorage only when we have a session
    if (session) {
      const savedSettings = localStorage.getItem('emailCleanupSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [session, router]);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('emailCleanupSettings', JSON.stringify(settings));
    
    // toast({
    //   title: "Settings saved",
    //   description: "Your preferences have been updated successfully.",
    // });
    
    setTimeout(() => setIsSaving(false), 500);
  };

  // Only return null when we're sure there's no session
  if (session === null) return null;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your email analysis preferences
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Email Analysis</CardTitle>
            <CardDescription>
              Configure how emails are analyzed and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Emails to Fetch
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {settings.emailFetchLimit} emails
                  </span>
                </div>
                <Slider
                  value={[settings.emailFetchLimit]}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    emailFetchLimit: value[0]
                  }))}
                  max={50}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    AI Temperature
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {settings.aiTemperature.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[settings.aiTemperature * 100]}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    aiTemperature: value[0] / 100
                  }))}
                  max={100}
                  step={10}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1.5">
                  Lower values make the AI more focused, higher values make it more creative
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Auto-Delete Threshold
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.autoDeleteThreshold * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.autoDeleteThreshold * 100]}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    autoDeleteThreshold: value[0] / 100
                  }))}
                  max={100}
                  min={50}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interface Preferences</CardTitle>
            <CardDescription>
              Customize your email management experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">
                  Mark as Read on Open
                </label>
                <p className="text-sm text-muted-foreground">
                  Automatically mark emails as read when opened
                </p>
              </div>
              <Switch
                checked={settings.markAsReadOnOpen}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  markAsReadOnOpen: checked
                }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">
                  Show Marketing Labels
                </label>
                <p className="text-sm text-muted-foreground">
                  Display AI analysis results inline with emails
                </p>
              </div>
              <Switch
                checked={settings.showMarketingLabels}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  showMarketingLabels: checked
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 