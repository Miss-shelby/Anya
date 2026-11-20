import { useEffect, useState } from 'react';
import {
  Languages,
  Volume2,
  Eye,
  Type,
  Check,
  Server,
  RotateCcw,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { SUPPORTED_LANGUAGES } from '../utils/languages';
import { checkBackendHealth, type HealthResponse } from '../services/apiClient';
import type { SupportedLanguageCode } from '../types/settings';

const SPEED_OPTIONS = [
  { label: 'Slow', value: 0.85 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.2 },
];

export function SettingsScreen() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { speak } = useSpeech();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    checkBackendHealth()
      .then((res) => {
        if (active) {
          setHealth(res);
          setHealthError(false);
        }
      })
      .catch(() => {
        if (active) {
          setHealth(null);
          setHealthError(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectLanguage = (code: SupportedLanguageCode) => {
    updateSettings({ language: code });
    const chosen = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    if (chosen) {
      speak(`Language set to ${chosen.name}.`, { force: true });
    }
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="Settings & Language" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-2">
        {/* Language Preferences */}
        <section aria-labelledby="settings-lang-heading">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
            <Languages className="h-4 w-4 text-anya-primary" aria-hidden="true" />
            <h2 id="settings-lang-heading">Language Preferences</h2>
          </div>

          <div className="space-y-2.5" role="radiogroup" aria-label="Preferred language">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = settings.language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`anya-card flex min-h-[60px] w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-card ${
                    selected
                      ? 'border-2 border-anya-primary'
                      : 'border border-anya-border hover:border-anya-primaryLight'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-anya-ink">{lang.name}</p>
                    <p className="text-xs text-anya-muted">
                      {lang.nativeName} · {lang.statusNote}
                    </p>
                  </div>
                  {selected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-anya-primary text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Speech & Audio */}
        <section aria-labelledby="settings-voice-heading" className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
            <Volume2 className="h-4 w-4 text-anya-primary" aria-hidden="true" />
            <h2 id="settings-voice-heading">Voice &amp; Speech</h2>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.handsFreeMode}
            onClick={() => updateSettings({ handsFreeMode: !settings.handsFreeMode })}
            className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
          >
            <div>
              <p className="text-sm font-bold text-anya-ink">Hands-Free Always Listening</p>
              <p className="text-xs text-anya-muted">
                Speak directly on Home without tapping any button
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                settings.handsFreeMode
                  ? 'bg-anya-primary text-white'
                  : 'bg-anya-soft text-anya-muted'
              }`}
            >
              {settings.handsFreeMode ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={settings.autoSpeak}
            onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
            className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
          >
            <div>
              <p className="text-sm font-bold text-anya-ink">Auto-Speak Responses</p>
              <p className="text-xs text-anya-muted">Automatically read ANYA&apos;s replies aloud</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                settings.autoSpeak ? 'bg-anya-primary text-white' : 'bg-anya-soft text-anya-muted'
              }`}
            >
              {settings.autoSpeak ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="anya-card rounded-2xl border border-anya-border bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-anya-ink">Speaking Speed</p>
              <button
                type="button"
                onClick={() =>
                  speak('Hello, this is ANYA speaking at your selected speed.', { force: true })
                }
                className="rounded-full bg-anya-soft px-3 py-1 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
              >
                Test Voice
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SPEED_OPTIONS.map((opt) => {
                const active = Math.abs(settings.speechRate - opt.value) < 0.05;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => updateSettings({ speechRate: opt.value })}
                    className={`min-h-[44px] rounded-full text-xs font-bold transition-colors ${
                      active
                        ? 'bg-anya-primary text-white'
                        : 'bg-anya-soft text-anya-ink hover:bg-anya-softHover'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Visual Accessibility */}
        <section aria-labelledby="settings-display-heading" className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
            <Eye className="h-4 w-4 text-anya-primary" aria-hidden="true" />
            <h2 id="settings-display-heading">Display Accessibility</h2>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.highContrast}
            onClick={() => updateSettings({ highContrast: !settings.highContrast })}
            className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
          >
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-anya-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-anya-ink">High Contrast Mode</p>
                <p className="text-xs text-anya-muted">Strong outlines &amp; high-contrast surfaces</p>
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

          <button
            type="button"
            role="switch"
            aria-checked={settings.largeText}
            onClick={() => updateSettings({ largeText: !settings.largeText })}
            className="anya-card flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left shadow-card"
          >
            <div className="flex items-center gap-3">
              <Type className="h-4 w-4 text-anya-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-anya-ink">Larger Text</p>
                <p className="text-xs text-anya-muted">Increases overall text size for low vision</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                settings.largeText ? 'bg-anya-primary text-white' : 'bg-anya-soft text-anya-muted'
              }`}
            >
              {settings.largeText ? 'ON' : 'OFF'}
            </span>
          </button>
        </section>

        {/* Backend Status */}
        <section aria-labelledby="settings-system-heading" className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
            <Server className="h-4 w-4 text-anya-primary" aria-hidden="true" />
            <h2 id="settings-system-heading">AI Connection Status</h2>
          </div>

          <div className="anya-card rounded-2xl border border-anya-border bg-white p-4 text-xs shadow-card">
            {healthError ? (
              <p className="font-semibold text-anya-danger">
                Backend unreachable. Start the FastAPI server on port 8000.
              </p>
            ) : health ? (
              <div className="space-y-1">
                <p className="font-bold text-anya-ink">
                  Backend: <span className="text-anya-success">Connected</span> ({health.model})
                </p>
                <p className="text-anya-muted">
                  Gemini API Key:{' '}
                  <strong
                    className={
                      health.gemini_configured ? 'text-anya-success' : 'text-anya-warning'
                    }
                  >
                    {health.gemini_configured
                      ? 'Configured'
                      : 'Missing — add GEMINI_API_KEY to backend/.env'}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-anya-muted">Checking backend connection…</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              resetSettings();
              speak('Settings reset to defaults.', { force: true });
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-anya-soft text-xs font-bold text-anya-ink hover:bg-anya-softHover"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Preferences</span>
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
