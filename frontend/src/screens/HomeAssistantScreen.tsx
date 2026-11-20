import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Banknote,
  ScanEye,
  FileText,
  MessageSquare,
  Landmark,
  MessagesSquare,
  VolumeX,
  RotateCcw,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AnyaMascot } from '../components/common/AnyaMascot';
import { BottomNav } from '../components/layout/BottomNav';
import { useAssistant } from '../context/AssistantContext';
import { useSpeech } from '../context/SpeechContext';
import { useSettings } from '../context/SettingsContext';
import { getLanguageOption } from '../utils/languages';
import { sendConversationTurn } from '../services/apiClient';
import { playEarcon } from '../services/handsFreeService';
import {
  isWakeWordSupported,
  listenOnceForVoiceReply,
  startWakeWordListener,
  type WakeWordController,
} from '../services/wakeWordService';
import { getIntentAction, tryInstantLocalIntent } from '../services/intentRouter';

const QUICK_ACTIONS = [
  { to: '/naira', title: 'Count Naira', desc: 'Identify notes & total', icon: Banknote },
  { to: '/objects', title: 'See Around', desc: 'Describe objects & scene', icon: ScanEye },
  { to: '/read', title: 'Read Text', desc: 'Documents, signs & labels', icon: FileText },
  { to: '/communicate', title: 'Messages', desc: 'WhatsApp, SMS & calls', icon: MessageSquare },
  { to: '/banking', title: 'Bank Demo', desc: 'Simulated balance check', icon: Landmark },
  { to: '/conversation', title: 'Voice Chat', desc: 'Full transcript view', icon: MessagesSquare },
];

type VoicePhase = 'standby' | 'awake_listening' | 'processing' | 'speaking' | 'paused';

export function HomeAssistantScreen() {
  const navigate = useNavigate();
  const { setStatus, messages, addMessage } = useAssistant();
  const { isSpeaking, lastSpokenText, speak, stopSpeaking, repeatLast } = useSpeech();
  const { settings, updateSettings } = useSettings();

  const [phase, setPhase] = useState<VoicePhase>('standby');
  const [liveCaption, setLiveCaption] = useState<string>('');
  const [heardTranscript, setHeardTranscript] = useState<string>('');
  const [latestReply, setLatestReply] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wakeRef = useRef<WakeWordController | null>(null);
  const activeRunIdRef = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const currentLang = getLanguageOption(settings.language);
  const wakeSupported = isWakeWordSupported();

  const returnToStandby = useCallback(() => {
    setLiveCaption('');
    setStatus('idle');
    if (settings.handsFreeMode && wakeSupported) {
      setPhase('standby');
      wakeRef.current?.resume();
    } else {
      setPhase('paused');
    }
  }, [settings.handsFreeMode, wakeSupported, setStatus]);

  const executeTextCommand = useCallback(
    async (spokenText: string, detectedLang?: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) {
        returnToStandby();
        return;
      }

      setLiveCaption('');
      setHeardTranscript(cleaned);
      addMessage('user', cleaned, { language: detectedLang || settings.language });

      const lower = cleaned.toLowerCase();
      if (lower === 'stop' || lower === 'cancel' || lower === 'never mind') {
        stopSpeaking();
        returnToStandby();
        return;
      }
      if (lower.includes('open settings')) {
        speak('Opening settings.', { force: true });
        navigate('/settings');
        return;
      }
      if (lower.includes('open history')) {
        speak('Opening conversation history.', { force: true });
        navigate('/history');
        return;
      }

      setPhase('processing');
      setStatus('processing');

      try {
        // Instant (<50ms) local intent routing for core commands; Gemini handles everything else
        const instantResult = tryInstantLocalIntent(cleaned, detectedLang || settings.language);
        const result =
          instantResult ??
          (await sendConversationTurn(
            cleaned,
            detectedLang || settings.language,
            messagesRef.current
          ));

        setLatestReply(result.reply);
        addMessage('assistant', result.reply, {
          intent: result.intent,
          language: result.language,
        });

        const action = getIntentAction(result);
        setPhase('speaking');
        setStatus('speaking');

        speak(result.reply, {
          force: true,
          onEnd: () => {
            if (action) {
              const shouldAutoCapture =
                action.route === '/naira' ||
                action.route === '/objects' ||
                action.route === '/read';

              navigate(action.route, {
                state: {
                  ...action.state,
                  autoCapture: shouldAutoCapture,
                  autoVoiceFlow: action.route === '/communicate',
                  question: action.route === '/objects' ? cleaned : undefined,
                },
              });
            } else {
              returnToStandby();
            }
          },
        });
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not reach ANYA backend. Say Anya to try again.';
        setErrorMsg(msg);
        setPhase('speaking');
        speak(msg, {
          force: true,
          onEnd: () => returnToStandby(),
        });
      }
    },
    [addMessage, navigate, returnToStandby, setStatus, settings.language, speak, stopSpeaking]
  );

  const captureSpokenCommand = useCallback(async () => {
    const runId = ++activeRunIdRef.current;
    setErrorMsg(null);
    setLiveCaption('');
    setPhase('awake_listening');
    setStatus('listening');

    // Brief 350ms pause after TTS finishes so mic does not pick up ANYA's own speaker echo
    await new Promise((r) => window.setTimeout(r, 350));
    if (activeRunIdRef.current !== runId) return;

    playEarcon('start');
    const transcript = await listenOnceForVoiceReply(
      currentLang.speechLang,
      11000,
      (interim) => {
        if (activeRunIdRef.current === runId) {
          setLiveCaption(interim);
        }
      }
    );

    if (activeRunIdRef.current !== runId) return;

    if (!transcript) {
      setPhase('speaking');
      speak("I didn't hear a command. Just say Anya whenever you're ready.", {
        force: true,
        onEnd: () => returnToStandby(),
      });
      return;
    }

    playEarcon('captured');
    await executeTextCommand(transcript, settings.language);
  }, [currentLang.speechLang, executeTextCommand, returnToStandby, setStatus, settings.language, speak]);

  const handleWakeTriggered = useCallback(
    (inlineCommand: string) => {
      stopSpeaking();
      setErrorMsg(null);
      setLiveCaption('');
      playEarcon('start');

      if (inlineCommand.trim().length > 2) {
        void executeTextCommand(inlineCommand);
        return;
      }

      // Siri-style wake reply
      setPhase('speaking');
      setStatus('speaking');
      setLatestReply("Yes, I'm here. What would you like me to do for you?");
      speak("Yes, I'm here. What would you like me to do for you?", {
        force: true,
        onEnd: () => {
          void captureSpokenCommand();
        },
      });
    },
    [captureSpokenCommand, executeTextCommand, setStatus, speak, stopSpeaking]
  );

  // Boot the Siri-style "Anya" wake-word standby listener
  useEffect(() => {
    if (!settings.handsFreeMode) {
      wakeRef.current?.stop();
      wakeRef.current = null;
      activeRunIdRef.current += 1;
      setPhase('paused');
      return;
    }

    if (!wakeSupported) {
      setErrorMsg(
        'Continuous wake-word listening needs Chrome, Edge, or Safari over HTTPS. Tap the ANYA card to speak.'
      );
      setPhase('paused');
      return;
    }

    setPhase('standby');
    const wakeController = startWakeWordListener(
      {
        onWakeDetected: (inlineCommand) => handleWakeTriggered(inlineCommand),
        onInterimHeard: (heard) => setLiveCaption(heard),
        onError: (msg) => setErrorMsg(msg),
      },
      currentLang.speechLang
    );
    wakeRef.current = wakeController;

    return () => {
      activeRunIdRef.current += 1;
      wakeController?.stop();
      wakeRef.current = null;
      setStatus('idle');
    };
  }, [
    settings.handsFreeMode,
    wakeSupported,
    currentLang.speechLang,
    handleWakeTriggered,
    setStatus,
  ]);

  const handleToggleHandsFree = () => {
    stopSpeaking();
    const next = !settings.handsFreeMode;
    updateSettings({ handsFreeMode: next });
    if (!next) {
      speak('Wake word paused.', { force: true });
    } else {
      speak('Say Anya anytime to wake me.', { force: true });
    }
  };

  const handleCardTap = () => {
    if (isSpeaking || phase === 'speaking') {
      activeRunIdRef.current += 1;
      stopSpeaking();
      returnToStandby();
      return;
    }
    if (phase === 'standby' || phase === 'paused') {
      wakeRef.current?.pause();
      handleWakeTriggered('');
    }
  };

  const mascotStatus =
    phase === 'awake_listening'
      ? 'listening'
      : phase === 'processing'
        ? 'processing'
        : phase === 'speaking' || isSpeaking
          ? 'speaking'
          : 'idle';

  return (
    <div className="relative flex h-full flex-col bg-anya-bg anya-screen-bg">
      <header className="flex items-center justify-between px-5 pb-2 pt-3">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-anya-primary">ANYA</p>
          <p className="text-[11px] font-medium text-anya-muted">{currentLang.name}</p>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              type="button"
              onClick={() => {
                activeRunIdRef.current += 1;
                stopSpeaking();
                returnToStandby();
              }}
              aria-label="Stop ANYA from speaking"
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-anya-danger px-3.5 text-xs font-bold text-white shadow-card"
            >
              <VolumeX className="h-4 w-4" aria-hidden="true" />
              <span>Stop</span>
            </button>
          ) : lastSpokenText ? (
            <button
              type="button"
              onClick={repeatLast}
              aria-label="Repeat ANYA's last response"
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-anya-ink shadow-card hover:bg-anya-soft"
            >
              <RotateCcw className="h-4 w-4 text-anya-primary" aria-hidden="true" />
              <span>Repeat</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleToggleHandsFree}
            aria-label={
              settings.handsFreeMode
                ? 'Pause Anya wake word listening'
                : 'Enable Anya wake word listening'
            }
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-xs font-bold shadow-card ${
              settings.handsFreeMode
                ? 'bg-emerald-100 text-anya-success'
                : 'bg-white text-anya-muted'
            }`}
          >
            {settings.handsFreeMode ? (
              <>
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Wake: &ldquo;Anya&rdquo;</span>
              </>
            ) : (
              <>
                <MicOff className="h-4 w-4" aria-hidden="true" />
                <span>Paused</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="anya-scroll flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <section
          aria-labelledby="home-assistant-heading"
          onClick={handleCardTap}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardTap();
            }
          }}
          className="anya-card flex cursor-pointer flex-col items-center rounded-3xl border-2 border-anya-primary/35 bg-white px-5 py-5 text-center shadow-card transition-all hover:border-anya-primary"
        >
          <AnyaMascot size="sm" status={mascotStatus} />

          <div
            role="status"
            aria-live="polite"
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              phase === 'awake_listening'
                ? 'bg-red-100 text-anya-danger'
                : phase === 'speaking' || isSpeaking
                  ? 'bg-emerald-100 text-anya-success'
                  : 'bg-anya-soft text-anya-primary'
            }`}
          >
            {phase === 'processing' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {phase === 'standby'
                ? 'Say "Anya" to wake me'
                : phase === 'awake_listening'
                  ? "Listening — speak your command now"
                  : phase === 'processing'
                    ? 'Understanding your request…'
                    : phase === 'speaking' || isSpeaking
                      ? 'ANYA is speaking (tap to stop)'
                      : 'Wake word paused (tap here to speak)'}
            </span>
          </div>

          {/* Live mic caption feedback so you can see immediately that your mic is hearing you */}
          {liveCaption && (phase === 'standby' || phase === 'awake_listening') && (
            <p className="mt-2 max-w-full truncate rounded-full bg-anya-bg px-3 py-1 text-[11px] font-semibold text-anya-muted">
              Hearing: &ldquo;{liveCaption}&rdquo;
            </p>
          )}

          <h1
            id="home-assistant-heading"
            className="mt-3 text-lg font-extrabold text-anya-ink"
          >
            Say &ldquo;Anya&rdquo; to start
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-anya-muted">
            Say <strong>&ldquo;Anya&rdquo;</strong> and I&apos;ll ask how to help — or say{' '}
            &ldquo;Anya, send a WhatsApp message&rdquo; or &ldquo;Anya, call my mother&rdquo;.
          </p>

          {(heardTranscript || latestReply) && (
            <div className="mt-3.5 w-full space-y-1.5 rounded-2xl bg-anya-bg p-3 text-left text-xs">
              {heardTranscript && (
                <p className="text-anya-muted">
                  <strong className="text-anya-ink">You:</strong> {heardTranscript}
                </p>
              )}
              {latestReply && (
                <p className="font-medium text-anya-ink">
                  <strong className="text-anya-primary">ANYA:</strong> {latestReply}
                </p>
              )}
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mt-3 flex w-full items-start gap-2 rounded-2xl bg-red-50 p-3 text-left text-xs font-semibold text-anya-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}
        </section>

        <section aria-labelledby="quick-actions-heading" className="mt-5">
          <h2
            id="quick-actions-heading"
            className="mb-2.5 text-xs font-bold uppercase tracking-wide text-anya-muted"
          >
            Or Jump Directly
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ to, title, desc, icon: Icon }) => (
              <button
                key={to}
                type="button"
                onClick={() => {
                  activeRunIdRef.current += 1;
                  stopSpeaking();
                  navigate(to);
                }}
                className="anya-card flex min-h-[96px] flex-col items-start justify-between rounded-2xl border border-anya-border bg-white p-3.5 text-left shadow-card transition-all hover:border-anya-primary"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-anya-soft text-anya-primary">
                  <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <div className="mt-2">
                  <p className="text-sm font-bold text-anya-ink">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-anya-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
