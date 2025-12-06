import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { DownloadProgress } from './DownloadProgress';
import { SetupComplete } from './SetupComplete';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type OnboardingStep = 'welcome' | 'download' | 'complete';

export function WelcomeScreen() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const { setFirstRunComplete } = useSettingsStore();

  const handleStartDownload = () => {
    setStep('download');
  };

  const handleDownloadComplete = () => {
    setStep('complete');
  };

  const handleSkipDownload = async () => {
    await setFirstRunComplete();
  };

  const handleComplete = async () => {
    await setFirstRunComplete();
  };

  if (step === 'download') {
    return (
      <DownloadProgress
        onComplete={handleDownloadComplete}
        onSkip={handleSkipDownload}
      />
    );
  }

  if (step === 'complete') {
    return <SetupComplete onContinue={handleComplete} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 p-8">
      <Card className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary-500 rounded-2xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">G</span>
          </div>
          <h1 className="text-3xl font-bold text-surface-900">Welcome to Glee</h1>
        </div>

        {/* Tagline */}
        <p className="text-lg text-surface-600 mb-8">
          Your private AI character companion.
          <br />
          <span className="text-surface-500">Offline. Uncensored. Yours.</span>
        </p>

        {/* Features */}
        <div className="text-left space-y-4 mb-8">
          <FeatureItem
            icon="🔒"
            title="100% Private"
            description="Everything runs on your device. No cloud, no tracking."
          />
          <FeatureItem
            icon="💬"
            title="Character Companions"
            description="Create and chat with AI characters that remember you."
          />
          <FeatureItem
            icon="🌳"
            title="Branching Conversations"
            description="Explore different paths and regenerate responses."
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleStartDownload} className="w-full" size="lg">
            Download AI Model & Get Started
          </Button>
          <p className="text-xs text-surface-500">
            ~2.5GB download • One-time setup • Works offline after
          </p>
          <button
            onClick={handleSkipDownload}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            I already have a model file →
          </button>
        </div>
      </Card>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-3 bg-surface-100 rounded-lg border border-surface-200">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-medium text-surface-900">{title}</h3>
        <p className="text-sm text-surface-500">{description}</p>
      </div>
    </div>
  );
}
