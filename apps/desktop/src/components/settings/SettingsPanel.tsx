import { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { GenerationSettings } from './GenerationSettings';
import { MemorySettings } from './MemorySettings';
import { ModelSettings } from './ModelSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { DataSettings } from './DataSettings';

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('generation');

  const tabs = [
    { id: 'generation', label: 'Generation' },
    { id: 'memory', label: 'Memory' },
    { id: 'model', label: 'Model' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-50">
      <div className="border-b border-surface-200 bg-surface-50/80 backdrop-blur-sm sticky top-0 z-10">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {activeTab === 'generation' && <GenerationSettings />}
          {activeTab === 'memory' && <MemorySettings />}
          {activeTab === 'model' && <ModelSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'data' && <DataSettings />}
        </div>
      </div>
    </div>
  );
}
