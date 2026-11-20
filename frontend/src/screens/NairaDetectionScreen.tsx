import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Banknote,
  Volume2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { CameraCapture } from '../components/camera/CameraCapture';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { useAssistant } from '../context/AssistantContext';
import { detectNairaNotes } from '../services/apiClient';
import { formatNaira } from '../utils/formatters';
import type { NairaDetectionResponse } from '../types/vision';

export function NairaDetectionScreen() {
  const location = useLocation();
  const autoCapture = Boolean((location.state as { autoCapture?: boolean } | null)?.autoCapture);
  const { settings } = useSettings();
  const { speak, stopSpeaking } = useSpeech();
  const { addMessage } = useAssistant();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<NairaDetectionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageCaptured = async (blob: Blob) => {
    stopSpeaking();
    setErrorMsg(null);
    setResult(null);
    setIsAnalyzing(true);
    speak('Checking your Naira notes now. Please wait a moment.');

    try {
      const detection = await detectNairaNotes(blob, settings.language);
      setResult(detection);
      addMessage('assistant', detection.spoken_summary, {
        intent: 'naira_detection',
        language: settings.language,
      });
      speak(detection.spoken_summary, { force: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not analyze the photo. Please check that the backend is running.';
      setErrorMsg(msg);
      speak(msg, { force: true });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="Naira Detection" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
        {/* Intro card */}
        <section className="anya-card flex items-center gap-3 rounded-2xl border border-anya-border bg-white p-3.5 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-anya-ink">Count Nigerian Naira</h2>
            <p className="text-xs text-anya-muted">
              Spread notes flat in good light so ANYA can identify each note without double-counting.
            </p>
          </div>
        </section>

        {/* Camera & Upload */}
        <CameraCapture
          onImageReady={(blob) => void handleImageCaptured(blob)}
          isProcessing={isAnalyzing}
          actionLabel="Scan Naira Notes"
          guidanceText="Spread your Naira notes flat in bright light and tap Open Camera or Upload Photo."
          autoCapture={autoCapture}
        />

        {/* Processing indicator */}
        {isAnalyzing && (
          <div
            role="status"
            aria-live="polite"
            className="anya-card flex items-center justify-center gap-3 rounded-2xl border border-anya-primary bg-white p-4 text-sm font-bold text-anya-primary shadow-card"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Analyzing Nigerian Naira notes…</span>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-anya-danger/30 bg-red-50 p-4 text-xs font-semibold text-anya-danger"
          >
            {errorMsg}
          </div>
        )}

        {/* Detection result */}
        {result && (
          <section
            aria-label="Naira detection result"
            className="anya-card space-y-3 rounded-3xl border-2 border-anya-primary bg-white p-4 shadow-card"
          >
            {/* Status header */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  result.is_uncertain
                    ? 'bg-amber-100 text-anya-warning'
                    : result.is_naira_detected
                      ? 'bg-emerald-100 text-anya-success'
                      : 'bg-anya-soft text-anya-muted'
                }`}
              >
                {result.is_uncertain ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Unclear — Retake Recommended</span>
                  </>
                ) : result.is_naira_detected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Naira Identified</span>
                  </>
                ) : (
                  <>
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>No Naira Detected</span>
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => speak(result.spoken_summary, { force: true })}
                aria-label="Hear result again"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-anya-soft px-3 py-1.5 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Speak Again</span>
              </button>
            </div>

            {/* Total amount */}
            {result.is_naira_detected && !result.is_uncertain && (
              <div className="rounded-2xl bg-anya-soft/75 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-anya-muted">
                  Total Identified
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-anya-ink">
                  {formatNaira(result.total_amount)}
                </p>
              </div>
            )}

            {/* Spoken summary */}
            <p className="text-sm font-medium leading-relaxed text-anya-ink">
              {result.spoken_summary}
            </p>

            {/* Denomination breakdown */}
            {result.notes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-anya-muted">
                  Breakdown
                </p>
                <ul className="space-y-2">
                  {result.notes.map((note) => (
                    <li
                      key={note.denomination}
                      className="flex items-center justify-between rounded-xl bg-anya-bg px-3.5 py-2.5 text-sm font-bold text-anya-ink"
                    >
                      <span>
                        {note.count} × {formatNaira(note.denomination)} note
                        {note.count > 1 ? 's' : ''}
                      </span>
                      <span className="text-anya-primary">{formatNaira(note.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Other currency warning */}
            {result.other_currency_detected && (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-anya-warning">
                Detected non-Naira currency: {result.other_currency_detected}. ANYA currently counts
                Nigerian Naira (₦) notes only.
              </p>
            )}

            {/* Retake guidance */}
            {result.retake_guidance && (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-anya-warning">
                Tip: {result.retake_guidance}
              </p>
            )}
          </section>
        )}

        <p className="px-1 text-center text-[11px] leading-relaxed text-anya-muted">
          MVP powered by Gemini multimodal vision. Future roadmap: offline YOLOv8 Naira detection
          model.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
