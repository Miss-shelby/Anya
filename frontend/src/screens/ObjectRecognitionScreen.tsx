import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ScanEye,
  Volume2,
  Loader2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { CameraCapture } from '../components/camera/CameraCapture';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { useAssistant } from '../context/AssistantContext';
import { recognizeObjects } from '../services/apiClient';
import type { ObjectRecognitionResponse } from '../types/vision';

const PRESET_QUESTIONS = [
  'What is in front of me?',
  'Describe this room',
  'Is there a chair nearby?',
  'What colour is this shirt?',
  'What objects are on this table?',
];

export function ObjectRecognitionScreen() {
  const location = useLocation();
  const routeState = location.state as { autoCapture?: boolean; question?: string } | null;
  const autoCapture = Boolean(routeState?.autoCapture);
  const { settings } = useSettings();
  const { speak, stopSpeaking } = useSpeech();
  const { addMessage } = useAssistant();

  const [question, setQuestion] = useState(routeState?.question || PRESET_QUESTIONS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ObjectRecognitionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageCaptured = async (blob: Blob) => {
    stopSpeaking();
    setErrorMsg(null);
    setResult(null);
    setIsAnalyzing(true);
    speak('Looking at what is in front of you. Please wait a moment.');

    try {
      const response = await recognizeObjects(blob, question, settings.language);
      setResult(response);
      addMessage('assistant', response.spoken_summary, {
        intent: 'object_recognition',
        language: settings.language,
      });
      speak(response.spoken_summary, { force: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not describe this photo. Please check that the backend is running.';
      setErrorMsg(msg);
      speak(msg, { force: true });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="See Around Me" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
        <section className="anya-card flex items-center gap-3 rounded-2xl border border-anya-border bg-white p-3.5 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
            <ScanEye className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-anya-ink">Object &amp; Scene Description</h2>
            <p className="text-xs text-anya-muted">
              Choose a question or type your own, then capture a photo.
            </p>
          </div>
        </section>

        <section aria-labelledby="scene-question-label" className="space-y-2">
          <label
            id="scene-question-label"
            htmlFor="scene-question-input"
            className="block text-xs font-bold uppercase tracking-wide text-anya-muted"
          >
            What would you like to know?
          </label>
          <input
            id="scene-question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about what is in front of you…"
            className="min-h-[48px] w-full rounded-2xl border border-anya-border bg-white px-4 text-sm font-medium text-anya-ink shadow-sm focus:border-anya-primary"
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUESTIONS.map((q) => {
              const active = question === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-anya-primary text-white'
                      : 'border border-anya-border bg-white text-anya-ink hover:border-anya-primary'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </section>

        <CameraCapture
          onImageReady={(blob) => void handleImageCaptured(blob)}
          isProcessing={isAnalyzing}
          actionLabel="Describe Scene"
          guidanceText="Point your camera at the object or room and tap Open Camera or Upload Photo."
          autoCapture={autoCapture}
        />

        {isAnalyzing && (
          <div
            role="status"
            aria-live="polite"
            className="anya-card flex items-center justify-center gap-3 rounded-2xl border border-anya-primary bg-white p-4 text-sm font-bold text-anya-primary shadow-card"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Describing what is in front of you…</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-anya-danger/30 bg-red-50 p-4 text-xs font-semibold text-anya-danger"
          >
            {errorMsg}
          </div>
        )}

        {result && (
          <section
            aria-label="Scene description result"
            className="anya-card space-y-3 rounded-3xl border-2 border-anya-primary bg-white p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  result.is_uncertain
                    ? 'bg-amber-100 text-anya-warning'
                    : 'bg-anya-soft text-anya-primary'
                }`}
              >
                {result.is_uncertain && (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{result.is_uncertain ? 'Unclear Image' : 'Scene Described'}</span>
              </span>

              <button
                type="button"
                onClick={() => speak(result.spoken_summary, { force: true })}
                aria-label="Hear scene description again"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-anya-soft px-3 py-1.5 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Speak Again</span>
              </button>
            </div>

            <p className="text-sm font-medium leading-relaxed text-anya-ink">
              {result.spoken_summary}
            </p>

            {result.detected_objects.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                  Objects Spotted
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.detected_objects.map((obj) => (
                    <span
                      key={obj}
                      className="rounded-full bg-anya-bg px-3 py-1 text-xs font-semibold text-anya-ink"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.dominant_colors.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                  Key Colours
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.dominant_colors.map((color) => (
                    <span
                      key={color}
                      className="rounded-full bg-anya-soft px-3 py-1 text-xs font-semibold text-anya-primary"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-anya-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            ANYA helps describe objects and rooms for orientation, and does not guarantee obstacle
            avoidance or replace a mobility aid.
          </span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
