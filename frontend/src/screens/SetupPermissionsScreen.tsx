import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Camera,
  Check,
  Languages,
  Eye,
  Volume2,
  ShieldCheck,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { AnyaMascot } from '../components/common/AnyaMascot';
import { AccessibleButton } from '../components/common/AccessibleButton';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';
import type { SupportedLanguageCode } from '../types/settings';

type PermissionState = 'idle' | 'granted' | 'denied';

export function SetupPermissionsScreen() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { speak, stopSpeaking } = useSpeech();

  const [step, setStep] = useState<1 | 2>(1);
  const [micState, setMicState] = useState<PermissionState>('idle');
  const [camState, setCamState] = useState<PermissionState>('idle');
  const [permissionMessage, setPermissionMessage] = useState<string>('');

  const handleLanguageSelect = (code: SupportedLanguageCode) => {
    updateSettings({ language: code });
    const chosen = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (chosen) {
      speak(`${chosen.name} selected.`);
    }
  };

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicState('granted');
      const msg = 'Microphone access granted. You can speak to ANYA anytime.';
      setPermissionMessage(msg);
      speak(msg);
    } catch {
      setMicState('denied');
      const msg =
        'Microphone permission was not granted. You can allow it later in your browser settings.';
      setPermissionMessage(msg);
      speak(msg);
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCamState('granted');
      const msg = 'Camera access granted for Naira, object, and text recognition.';
      setPermissionMessage(msg);
      speak(msg);
    } catch {
      setCamState('denied');
      const msg =
        'Camera permission was not granted. You can still upload photos or allow camera access later.';
      setPermissionMessage(msg);
      speak(msg);
    }
  };

  const handleFinish = () => {
    stopSpeaking();
    updateSettings({ onboardingCompleted: true });
    navigate('/home');
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader
        showBack
        backTo={step === 2 ? undefined : '/'}
        progress={step === 1 ? 50 : 95}
      />

      <main className="anya-scroll flex-1 overflow-y-auto px-5 pb-6 pt-2">
        {step === 1 ? (
          <section aria-labelledby="setup-step1-heading" className="flex flex-col">
            <div className="flex flex-col items-center text-center">
              <AnyaMascot size="sm" />
              <h1
                id="setup-step1-heading"
                className="mt-3 text-xl font-extrabold text-anya-ink"
              >
                Personalise ANYA
              </h1>
              <p className="mt-1 text-sm text-anya-muted">
                Choose your preferred language and display comfort.
              </p>
            </div>

            {/* Language grid inspired by reference Screen 2 cards */}
            <div className="mt-5">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
                <Languages className="h-4 w-4 text-anya-primary" aria-hidden="true" />
                <span>Preferred Language</span>
              </div>

              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Preferred language">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = settings.language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`anya-card flex min-h-[104px] flex-col items-start justify-between rounded-2xl bg-white p-3.5 text-left shadow-card transition-all ${
                        isSelected
                          ? 'border-2 border-anya-primary ring-2 ring-anya-primary/15'
                          : 'border border-anya-border hover:border-anya-primaryLight'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-anya-soft text-xs font-extrabold text-anya-primary">
                          {lang.code.toUpperCase()}
                        </span>
                        {isSelected && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-anya-primary text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-bold text-anya-ink">{lang.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-anya-muted">
                          {lang.statusNote}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility comfort toggles */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
                <Eye className="h-4 w-4 text-anya-primary" aria-hidden="true" />
                <span>Accessibility Comfort</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.autoSpeak}
                onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
                className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-anya-ink">Spoken Responses</p>
                    <p className="text-xs text-anya-muted">ANYA reads answers aloud automatically</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    settings.autoSpeak
                      ? 'bg-anya-primary text-white'
                      : 'bg-anya-soft text-anya-muted'
                  }`}
                >
                  {settings.autoSpeak ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={settings.highContrast}
                onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-anya-ink">High Contrast Mode</p>
                    <p className="text-xs text-anya-muted">Stronger borders and maximum readability</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    settings.highContrast
                      ? 'bg-anya-primary text-white'
                      : 'bg-anya-soft text-anya-muted'
                  }`}
                >
                  {settings.highContrast ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </section>
        ) : (
          /* Step 2: Permissions explanation inspired by reference Screen 3 */
          <section aria-labelledby="setup-step2-heading" className="flex flex-col items-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-anya-soft/80">
              <AnyaMascot size="md" />
            </div>

            <span className="mt-4 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-anya-ink shadow-card">
              Here&apos;s what I need to help you
            </span>
            <h1 id="setup-step2-heading" className="sr-only">
              Microphone and Camera Permissions
            </h1>

            <div className="mt-4 w-full space-y-3">
              {/* Microphone permission card */}
              <div
                className={`anya-card rounded-2xl bg-white p-4 shadow-card ${
                  micState === 'granted'
                    ? 'border-2 border-anya-success'
                    : 'border-2 border-anya-primary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-anya-ink">Microphone Access</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-anya-muted">
                      Used only when you tap Speak. Raw voice recordings are not stored.
                    </p>
                    <button
                      type="button"
                      onClick={requestMicrophone}
                      className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-anya-soft px-4 py-1.5 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
                    >
                      {micState === 'granted' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-anya-success" aria-hidden="true" />
                          <span className="text-anya-success">Microphone Ready</span>
                        </>
                      ) : (
                        <span>Allow Microphone</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera permission card */}
              <div
                className={`anya-card rounded-2xl bg-white p-4 shadow-card ${
                  camState === 'granted'
                    ? 'border-2 border-anya-success'
                    : 'border border-anya-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-anya-ink">Camera Access</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-anya-muted">
                      Used only when you check Naira notes, objects, or documents. Photos are not
                      saved.
                    </p>
                    <button
                      type="button"
                      onClick={requestCamera}
                      className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-anya-soft px-4 py-1.5 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
                    >
                      {camState === 'granted' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-anya-success" aria-hidden="true" />
                          <span className="text-anya-success">Camera Ready</span>
                        </>
                      ) : (
                        <span>Allow Camera</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-anya-soft/70 px-3.5 py-2.5 text-xs text-anya-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-anya-primary" aria-hidden="true" />
                <span>
                  Once setup is finished, ANYA enters continuous hands-free voice mode — no buttons
                  needed.
                </span>
              </div>

              {permissionMessage && (
                <p
                  role="status"
                  className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-anya-ink shadow-sm"
                >
                  {permissionMessage}
                </p>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Bottom CTA footer */}
      <footer className="border-t border-anya-border/60 bg-anya-bg px-5 pb-5 pt-3">
        {step === 1 ? (
          <AccessibleButton variant="primary" onClick={() => setStep(2)}>
            Continue
          </AccessibleButton>
        ) : (
          <AccessibleButton variant="primary" onClick={handleFinish}>
            Start Hands-Free Mode
          </AccessibleButton>
        )}
      </footer>
    </div>
  );
}
