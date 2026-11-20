import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { AnyaMascot } from '../components/common/AnyaMascot';
import { AccessibleButton } from '../components/common/AccessibleButton';
import { useSpeech } from '../context/SpeechContext';
import { useSettings } from '../context/SettingsContext';

const WELCOME_SPEECH =
  'Hello! I am ANYA, your voice-first AI companion. Your world, within reach. I can help you identify Nigerian Naira notes, read text, understand what is around you, and assist with messages. Tap Get Started to set up your preferences, or tap Skip to go straight to the main assistant.';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isSpeaking, speak, stopSpeaking } = useSpeech();
  const { updateSettings } = useSettings();

  const handleSkip = () => {
    stopSpeaking();
    updateSettings({ onboardingCompleted: true });
    navigate('/home');
  };

  const handleGetStarted = () => {
    stopSpeaking();
    navigate('/setup');
  };

  const handleToggleWelcomeAudio = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(WELCOME_SPEECH, { force: true });
    }
  };

  return (
    <main className="anya-hero-gradient flex h-full flex-col justify-between px-6 pb-6 pt-6">
      {/* Top audio control for blind / low-vision onboarding */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-extrabold tracking-wider text-anya-primary shadow-sm">
          ANYA
        </span>
        <button
          type="button"
          onClick={handleToggleWelcomeAudio}
          aria-label={isSpeaking ? 'Stop welcome message' : 'Listen to welcome message'}
          className="flex min-h-[44px] items-center gap-2 rounded-full bg-white/90 px-3.5 py-2 text-xs font-bold text-anya-ink shadow-sm transition-colors hover:bg-white"
        >
          {isSpeaking ? (
            <>
              <VolumeX className="h-4 w-4 text-anya-danger" aria-hidden="true" />
              <span>Stop Audio</span>
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 text-anya-primary" aria-hidden="true" />
              <span>Listen</span>
            </>
          )}
        </button>
      </div>

      {/* Hero mascot with soft concentric rings matching the design reference */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-64 w-64 rounded-full border border-white/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-48 w-48 rounded-full border border-white/55"
        />
        <AnyaMascot size="lg" status={isSpeaking ? 'speaking' : 'idle'} />
      </div>

      {/* Bottom copy & CTAs matching the reference card rhythm */}
      <section aria-labelledby="welcome-heading" className="text-center">
        <p className="text-sm font-semibold text-anya-primary">Your world, within reach.</p>
        <h1
          id="welcome-heading"
          className="mt-1.5 text-2xl font-extrabold tracking-tight text-anya-ink"
        >
          Meet ANYA, your AI companion.
        </h1>
        <p className="mx-auto mt-2.5 max-w-[300px] text-sm leading-relaxed text-anya-muted">
          Identify Naira notes, read text, understand your surroundings, and stay connected — just
          by talking.
        </p>

        {/* Subtle progress pill indicator matching reference */}
        <div
          aria-hidden="true"
          className="mx-auto my-5 flex h-1.5 w-24 overflow-hidden rounded-full bg-anya-soft"
        >
          <div className="h-full w-1/3 rounded-full bg-anya-primary" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AccessibleButton variant="secondary" onClick={handleSkip}>
            Skip
          </AccessibleButton>
          <AccessibleButton variant="primary" onClick={handleGetStarted}>
            Get Started
          </AccessibleButton>
        </div>

        <p className="mt-4 text-xs text-anya-muted">
          Designed for voice-first, accessible everyday independence.
        </p>
      </section>
    </main>
  );
}
