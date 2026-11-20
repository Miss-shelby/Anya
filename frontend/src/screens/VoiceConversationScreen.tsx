import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mic,
  Square,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { AnyaMascot } from '../components/common/AnyaMascot';
import { useAssistant } from '../context/AssistantContext';
import { useSpeech } from '../context/SpeechContext';
import { useSettings } from '../context/SettingsContext';
import { sendConversationTurn, transcribeAudio } from '../services/apiClient';
import { startVoiceRecording, type VoiceRecorderHandle } from '../services/voiceService';
import {
  getIntentAction,
  getIntentDisplayName,
  type IntentActionDescriptor,
} from '../services/intentRouter';
import { getLanguageOption } from '../utils/languages';

const QUICK_PROMPTS = [
  'Hello Anya, what can you help me with?',
  'How much money dey my hand?',
  'Read this document for me',
  'What is my account balance?',
];

export function VoiceConversationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, setStatus, messages, addMessage } = useAssistant();
  const { isSpeaking, speak, stopSpeaking, repeatLast, lastSpokenText } = useSpeech();
  const { settings } = useSettings();

  const [typedInput, setTypedInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<IntentActionDescriptor | null>(null);
  const [lastDetectedLang, setLastDetectedLang] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorderHandle | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const autoStartHandledRef = useRef(false);

  const currentLang = getLanguageOption(settings.language);
  const effectiveStatus = isSpeaking && status === 'idle' ? 'speaking' : status;

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction]);

  // Ensure microphone stream is cleaned up if user leaves screen while recording
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
      setStatus('idle');
    };
  }, [setStatus]);

  const handleUserUtterance = useCallback(
    async (text: string, detectedLang?: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      setErrorMsg(null);
      setPendingAction(null);
      stopSpeaking();

      const langToUse = detectedLang || settings.language;
      addMessage('user', cleaned, { language: langToUse });
      setStatus('processing');

      try {
        const result = await sendConversationTurn(cleaned, langToUse, messages);
        addMessage('assistant', result.reply, {
          intent: result.intent,
          language: result.language,
        });
        setLastDetectedLang(result.language);

        const action = getIntentAction(result);
        setPendingAction(action);

        setStatus('idle');
        speak(result.reply);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not reach ANYA backend. Please check that the backend server is running.';
        setErrorMsg(message);
        setStatus('error');
        speak(message, { force: true });
      }
    },
    [addMessage, messages, setStatus, settings.language, speak, stopSpeaking]
  );

  const handleStartRecording = useCallback(async () => {
    setErrorMsg(null);
    stopSpeaking();

    try {
      const handle = await startVoiceRecording();
      recorderRef.current = handle;
      setStatus('listening');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Microphone access was denied. You can also type your message below.';
      setErrorMsg(message);
      setStatus('error');
      speak(message, { force: true });
    }
  }, [setStatus, speak, stopSpeaking]);

  const handleStopRecording = useCallback(async () => {
    const handle = recorderRef.current;
    if (!handle) return;
    recorderRef.current = null;

    setStatus('processing');
    try {
      const audioBlob = await handle.stop();
      const transcription = await transcribeAudio(audioBlob, settings.language);

      if (!transcription.transcript.trim()) {
        const note =
          transcription.confidence_note ||
          'I did not hear speech clearly. Please tap the microphone and try again.';
        setErrorMsg(note);
        setStatus('idle');
        speak(note, { force: true });
        return;
      }

      setLastDetectedLang(transcription.detected_language);
      await handleUserUtterance(transcription.transcript, transcription.detected_language);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not transcribe audio. Please check your connection or type your request.';
      setErrorMsg(message);
      setStatus('error');
      speak(message, { force: true });
    }
  }, [handleUserUtterance, setStatus, settings.language, speak]);

  // Auto-start mic once if navigated from Home's "Tap to Speak"
  useEffect(() => {
    const state = location.state as { autoStartMic?: boolean } | null;
    if (state?.autoStartMic && !autoStartHandledRef.current) {
      autoStartHandledRef.current = true;
      void handleStartRecording();
    }
  }, [location.state, handleStartRecording]);

  const handleMicToggle = () => {
    if (status === 'listening') {
      void handleStopRecording();
    } else if (status !== 'processing') {
      void handleStartRecording();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || status === 'processing') return;
    const text = typedInput;
    setTypedInput('');
    void handleUserUtterance(text);
  };

  return (
    <div className="flex h-full flex-col bg-anya-bg anya-screen-bg">
      <AppHeader
        title="Voice Assistant"
        showBack
        backTo="/home"
        rightSlot={
          !isSpeaking && lastSpokenText ? (
            <button
              type="button"
              onClick={repeatLast}
              aria-label="Repeat ANYA's last response"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-anya-primary shadow-card hover:bg-anya-soft"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null
        }
      />

      {/* Conversation feed */}
      <main className="anya-scroll flex-1 overflow-y-auto px-5 pb-4 pt-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <AnyaMascot size="md" status={effectiveStatus} />
            <h2 className="mt-4 text-lg font-extrabold text-anya-ink">
              Speak naturally to ANYA
            </h2>
            <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-anya-muted">
              Preferred language: <strong className="text-anya-ink">{currentLang.name}</strong>.
              Tap the microphone below to start, then tap again when finished.
            </p>

            {/* Helpful sample prompts */}
            <div className="mt-5 flex w-full flex-col gap-2">
              <p className="text-left text-[11px] font-bold uppercase tracking-wide text-anya-muted">
                Or try a quick example
              </p>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={status === 'processing'}
                  onClick={() => void handleUserUtterance(prompt)}
                  className="anya-card flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-anya-border bg-white px-4 py-3 text-left text-xs font-semibold text-anya-ink shadow-card transition-colors hover:border-anya-primary"
                >
                  <span>&ldquo;{prompt}&rdquo;</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-anya-primary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3" aria-label="Conversation transcript">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <article
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`anya-card max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-card ${
                      isUser
                        ? 'rounded-br-md bg-anya-primary text-white'
                        : 'rounded-bl-md border border-anya-border bg-white text-anya-ink'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div
                      className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${
                        isUser ? 'text-white/80' : 'text-anya-muted'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && msg.intent && (
                        <span className="rounded-full bg-anya-soft px-2 py-0.5 font-bold text-anya-primary">
                          {getIntentDisplayName(msg.intent)}
                        </span>
                      )}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speak(msg.text, { force: true })}
                          aria-label="Read this reply aloud"
                          className="ml-auto inline-flex items-center gap-1 rounded-full bg-anya-soft px-2.5 py-1 font-bold text-anya-primary hover:bg-anya-softHover"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Listen</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Action card when ANYA identifies a feature route */}
            {pendingAction && (
              <div className="anya-card rounded-2xl border-2 border-anya-primary bg-anya-soft/70 p-3.5">
                <p className="text-xs font-bold text-anya-ink">Suggested Action</p>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    navigate(pendingAction.route, { state: pendingAction.state });
                  }}
                  className="anya-cta-gradient mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-cta"
                >
                  <span>{pendingAction.label}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <div ref={endOfMessagesRef} />
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2.5 rounded-2xl border border-anya-danger/30 bg-red-50 px-3.5 py-3 text-xs font-semibold text-anya-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
      </main>

      {/* Voice control dock */}
      <footer className="border-t border-anya-border bg-white px-4 pb-4 pt-3">
        {/* Live status pill (never relies on color alone) */}
        <div
          role="status"
          aria-live="polite"
          className="mb-2.5 flex items-center justify-between text-xs font-bold"
        >
          <span className="inline-flex items-center gap-1.5 text-anya-primary">
            {status === 'processing' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            <span>
              {status === 'listening'
                ? 'Listening — tap Stop when done'
                : status === 'processing'
                  ? 'Transcribing & thinking…'
                  : isSpeaking
                    ? 'ANYA is speaking'
                    : 'Ready for your voice'}
            </span>
          </span>
          {lastDetectedLang && (
            <span className="rounded-full bg-anya-soft px-2.5 py-0.5 text-[11px] text-anya-muted">
              Lang: {lastDetectedLang}
            </span>
          )}
        </div>

        {/* Large primary Mic / Stop button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={status === 'processing'}
            aria-label={
              status === 'listening' ? 'Stop listening and send speech' : 'Start speaking to ANYA'
            }
            className={`flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-extrabold text-white transition-all active:scale-[0.98] disabled:opacity-60 ${
              status === 'listening'
                ? 'bg-anya-danger shadow-card'
                : 'anya-cta-gradient shadow-cta'
            }`}
          >
            {status === 'listening' ? (
              <>
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Stop &amp; Send</span>
              </>
            ) : status === 'processing' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Processing…</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
                <span>Tap to Speak</span>
              </>
            )}
          </button>

          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              aria-label="Stop ANYA from speaking"
              className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-danger hover:bg-anya-softHover"
            >
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Keyboard-accessible text fallback */}
        <form onSubmit={handleTextSubmit} className="mt-2.5 flex items-center gap-2">
          <label htmlFor="anya-text-input" className="sr-only">
            Type a message to ANYA
          </label>
          <input
            id="anya-text-input"
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Or type a message…"
            disabled={status === 'processing' || status === 'listening'}
            className="min-h-[46px] flex-1 rounded-full border border-anya-border bg-anya-bg px-4 text-sm text-anya-ink placeholder:text-anya-muted focus:border-anya-primary focus:bg-white"
          />
          <button
            type="submit"
            disabled={!typedInput.trim() || status === 'processing' || status === 'listening'}
            aria-label="Send typed message"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-anya-soft text-anya-primary transition-colors hover:bg-anya-softHover disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </footer>
    </div>
  );
}
