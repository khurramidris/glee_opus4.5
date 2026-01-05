import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSmartSetup } from '@/hooks/useSmartSetup';
import { DownloadProgress } from './DownloadProgress';
import { SetupComplete } from './SetupComplete';
import { Button } from '@/components/ui/Button';

type OnboardingStep = 'analyzing' | 'welcome' | 'download' | 'complete';

interface WelcomeScreenProps {
  onComplete?: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('analyzing');
  const { setFirstRunComplete } = useSettingsStore();
  const { status, checkStatus, loading } = useSmartSetup();

  useEffect(() => {
    console.log('[WelcomeScreen] Starting setup status check...');
    checkStatus()
      .then((result) => {
        console.log('[WelcomeScreen] Setup status result:', result);
        setStep('welcome');
      })
      .catch((err) => {
        console.error('[WelcomeScreen] Setup status check failed:', err);
        // Still proceed to welcome - will use 'cpu' variant as fallback
        setStep('welcome');
      });
  }, [checkStatus]);

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
    if (onComplete) {
      onComplete();
    }
  };

  if (step === 'analyzing' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center p-8 panel rounded-2xl">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Analyzing System...</h2>
          <p className="text-white/60 mt-2">Checking hardware for optimal performance</p>
        </div>
      </div>
    );
  }

  if (step === 'download') {
    return (
      <DownloadProgress
        status={status}
        onComplete={handleDownloadComplete}
        onSkip={handleSkipDownload}
      />
    );
  }

  if (step === 'complete') {
    return <SetupComplete onContinue={handleComplete} />;
  }

  const gpuName = status?.detected_gpu || "Standard Graphics";
  const isGPU = status?.recommended_variant !== 'cpu';

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center panel rounded-2xl p-8">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-3xl font-bold text-white">G</span>
          </div>
          <h1 className="text-3xl font-bold text-white font-display">Welcome to Glee</h1>
          {status && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-white/70">
                {gpuName} Detected
              </span>
            </div>
          )}
        </div>

        {/* Tagline */}
        <p className="text-lg text-white/80 mb-8">
          Your private AI character companion.
          <br />
          <span className="text-white/50">Offline. Uncensored. Yours.</span>
        </p>

        {/* Features */}
        <div className="text-left space-y-4 mb-8">
          <FeatureItem
            icon="🚀"
            title="Optimized Performance"
            description={isGPU
              ? `We'll install the ${status?.recommended_variant?.toUpperCase()} engine for your GPU.`
              : "We'll install the standard engine for your CPU."}
          />
          <FeatureItem
            icon="🔒"
            title="100% Private"
            description="Everything runs on your device. No cloud, no tracking."
          />
          <FeatureItem
            icon="💬"
            title="Ready out of the box"
            description="We handle the complex setup so you don't have to."
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleStartDownload} className="w-full" size="lg">
            Install & Get Started
          </Button>
          <p className="text-xs text-white/40">
            One-time setup • Works offline after
          </p>
          <button
            onClick={handleSkipDownload}
            className="text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            I already have a model file →
          </button>
        </div>
      </div>
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
    <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-white/50">{description}</p>
      </div>
    </div>
  );
}

