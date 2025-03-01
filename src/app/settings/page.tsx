'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from "@/components/ui/button";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const [settings, setSettings] = useState<Settings>({
    emailFetchLimit: 5,
    aiTemperature: 0.7,
    autoDeleteThreshold: 0.9,
    markAsReadOnOpen: true,
    showMarketingLabels: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('emailCleanupSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [session, router]);

  const handleSave = () => {
    setIsSaving(true);
    // Save settings to localStorage
    localStorage.setItem('emailCleanupSettings', JSON.stringify(settings));
    setTimeout(() => setIsSaving(false), 500);
  };

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
          
          <div className="space-y-6">
            {/* Email Analysis Settings */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Analysis</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Emails to Fetch
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.emailFetchLimit}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      emailFetchLimit: parseInt(e.target.value)
                    }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Number of emails to analyze at once (1-50)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Temperature
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.aiTemperature}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      aiTemperature: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>More Focused ({settings.aiTemperature})</span>
                    <span>More Creative</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Adjust how creative the AI should be in analyzing emails
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-Delete Confidence Threshold
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={settings.autoDeleteThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      autoDeleteThreshold: parseFloat(e.target.value)
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Less Strict ({Math.round(settings.autoDeleteThreshold * 100)}%)</span>
                    <span>More Strict</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum confidence level to auto-select marketing emails
                  </p>
                </div>
              </div>
            </div>

            {/* Interface Settings */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interface Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Mark as Read on Open
                    </label>
                    <p className="text-sm text-gray-500">
                      Automatically mark emails as read when opened
                    </p>
                  </div>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      checked={settings.markAsReadOnOpen}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        markAsReadOnOpen: e.target.checked
                      }))}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.markAsReadOnOpen ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Show Marketing Labels
                    </label>
                    <p className="text-sm text-gray-500">
                      Display marketing/promotional labels on emails
                    </p>
                  </div>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      checked={settings.showMarketingLabels}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        showMarketingLabels: e.target.checked
                      }))}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settings.showMarketingLabels ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 