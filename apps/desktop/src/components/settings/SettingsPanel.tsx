import { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { GenerationSettings } from './GenerationSettings';
import { ModelSettings } from './ModelSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { DataSettings } from './DataSettings';

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('generation');

  const tabs = [
    { id: 'generation', label: 'Generation' },
    { id: 'model', label: 'Model' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-100">
      <div className="border-b border-surface-200 bg-surface-50">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-4" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'generation' && <GenerationSettings />}
          {activeTab === 'model' && <ModelSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'data' && <DataSettings />}
        </div>
      </div>
    </div>
  );
}
