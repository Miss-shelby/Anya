import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { CameraCapture } from '../components/camera/CameraCapture';
import { useSettings } from '../context/SettingsContext';
import { useSpeech } from '../context/SpeechContext';
import { useAssistant } from '../context/AssistantContext';
import { readTextFromImage } from '../services/apiClient';
import type { TextReadingResponse } from '../types/vision';

export function TextReadingScreen() {
  const location = useLocation();
  const autoCapture = Boolean((location.state as { autoCapture?: boolean } | null)?.autoCapture);
  const { settings } = useSettings();
  const { isSpeaking, speak, stopSpeaking } = useSpeech();
  const { addMessage } = useAssistant();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TextReadingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageCaptured = async (blob: Blob) => {
    stopSpeaking();
    setErrorMsg(null);
    setResult(null);
    setIsAnalyzing(true);
    speak('Reading the text from your photo. Please wait a moment.');

    try {
      const response = await readTextFromImage(blob, settings.language);
      setResult(response);
      addMessage('assistant', response.spoken_summary, {
        intent: 'text_reading',
        language: settings.language,
      });
      speak(response.spoken_summary, { force: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not read text from this photo. Please check that the backend is running.';
      setErrorMsg(msg);
      speak(msg, { force: true });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader title="Read Text" showBack backTo="/home" />

      <main className="anya-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
        <section className="anya-card flex items-center gap-3 rounded-2xl border border-anya-border bg-white p-3.5 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-anya-ink">Documents, Receipts &amp; Labels</h2>
            <p className="text-xs text-anya-muted">
              Capture or upload printed text. ANYA reads it aloud and highlights dates, amounts, and
              names.
            </p>
          </div>
        </section>

        <CameraCapture
          onImageReady={(blob) => void handleImageCaptured(blob)}
          isProcessing={isAnalyzing}
          actionLabel="Read Text"
          guidanceText="Center the document, receipt, sign, or label in good light and tap Open Camera or Upload Photo."
          autoCapture={autoCapture}
        />

        {isAnalyzing && (
          <div
            role="status"
            aria-live="polite"
            className="anya-card flex items-center justify-center gap-3 rounded-2xl border border-anya-primary bg-white p-4 text-sm font-bold text-anya-primary shadow-card"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Extracting and reading text…</span>
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
            aria-label="Text reading result"
            className="anya-card space-y-3.5 rounded-3xl border-2 border-anya-primary bg-white p-4 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  result.is_uncertain
                    ? 'bg-amber-100 text-anya-warning'
                    : result.has_text
                      ? 'bg-emerald-100 text-anya-success'
                      : 'bg-anya-soft text-anya-muted'
                }`}
              >
                {result.is_uncertain && (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {result.is_uncertain
                    ? 'Partially Unclear'
                    : result.has_text
                      ? 'Text Extracted'
                      : 'No Text Found'}
                </span>
              </span>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-anya-danger px-3 py-1.5 text-xs font-bold text-white"
                >
                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Stop Reading</span>
                </button>
              )}
            </div>

            {result.has_text && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => speak(result.extracted_text, { force: true })}
                  className="anya-cta-gradient flex min-h-[46px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white shadow-cta"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Read Full Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => speak(result.summary || result.spoken_summary, { force: true })}
                  className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-anya-soft px-3 py-2 text-xs font-bold text-anya-primary hover:bg-anya-softHover"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>Read Summary</span>
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-anya-bg p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                Summary
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-anya-ink">
                {result.summary || result.spoken_summary}
              </p>
            </div>

            {result.important_details.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                  Important Details
                </p>
                <ul className="space-y-1.5">
                  {result.important_details.map((item, idx) => (
                    <li
                      key={`${item.label}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-anya-soft/70 px-3.5 py-2 text-xs"
                    >
                      <span className="font-bold text-anya-primary">{item.label}</span>
                      <span className="text-right font-semibold text-anya-ink">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.extracted_text && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                  Full Extracted Text
                </p>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-anya-border bg-white p-3 text-xs leading-relaxed text-anya-ink">
                  {result.extracted_text}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
