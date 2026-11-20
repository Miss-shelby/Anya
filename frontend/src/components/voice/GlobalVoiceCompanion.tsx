import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mic, Sparkles, VolumeX } from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';
import { useSpeech } from '../../context/SpeechContext';
import { useSettings } from '../../context/SettingsContext';
import { getLanguageOption } from '../../utils/languages';
import { sendConversationTurn } from '../../services/apiClient';
import { playEarcon } from '../../services/handsFreeService';
import {
  isWakeWordSupported,
  listenOnceForVoiceReply,
  startWakeWordListener,
  type WakeWordController,
} from '../../services/wakeWordService';
import { getIntentAction, tryInstantLocalIntent } from '../../services/intentRouter';

const EXCLUDED_PATHS = new Set(['/', '/setup', '/home', '/conversation']);

type GlobalPhase = 'standby' | 'listening' | 'processing' | 'speaking';

/**
 * Keeps the Siri-style "Anya" wake-word active across ALL task screens
 * (/naira, /objects, /read, /communicate, /banking, /history, /settings)
 * so a blind user never has to navigate back to Home to give the next command.
 */
export function GlobalVoiceCompanion() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, setStatus, messages, addMessage } = useAssistant();
  const { isSpeaking, speak, stopSpeaking } = useSpeech();
  const { settings } = useSettings();

  const [phase, setPhase] = useState<GlobalPhase>('standby');
  const [liveCaption, setLiveCaption] = useState('');
  const [bannerText, setBannerText] = useState('');

  const wakeRef = useRef<WakeWordController | null>(null);
  const runIdRef = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const isEligibleRoute = !EXCLUDED_PATHS.has(location.pathname);
  const currentLang = getLanguageOption(settings.language);
  const wakeSupported = isWakeWordSupported();

  // Pause background wake listener whenever the current screen is busy or ANYA is speaking
  const shouldBeListeningForWake =
    isEligibleRoute &&
    settings.handsFreeMode &&
    wakeSupported &&
    !isSpeaking &&
    status === 'idle' &&
    phase === 'standby';

  const resetToStandby = useCallback(() => {
    setLiveCaption('');
    setBannerText('');
    setPhase('standby');
    setStatus('idle');
  }, [setStatus]);

  const executeGlobalCommand = useCallback(
    async (spokenText: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) {
        resetToStandby();
        return;
      }

      setLiveCaption('');
      addMessage('user', cleaned, { language: settings.language });

      const lower = cleaned.toLowerCase();
      if (lower === 'stop' || lower === 'cancel' || lower === 'never mind') {
        stopSpeaking();
        resetToStandby();
        return;
      }
      if (/\b(go home|take me home|home screen|back home)\b/i.test(lower)) {
        resetToStandby();
        speak('Going back to home.', { force: true });
        navigate('/home');
        return;
      }
      if (lower.includes('open settings')) {
        resetToStandby();
        speak('Opening settings.', { force: true });
        navigate('/settings');
        return;
      }
      if (lower.includes('open history')) {
        resetToStandby();
        speak('Opening conversation history.', { force: true });
        navigate('/history');
        return;
      }

      setPhase('processing');
      setStatus('processing');
      setBannerText(`Understanding: "${cleaned}"`);

      try {
        const instant = tryInstantLocalIntent(cleaned, settings.language);
        const result =
          instant ??
          (await sendConversationTurn(cleaned, settings.language, messagesRef.current));

        addMessage('assistant', result.reply, {
          intent: result.intent,
          language: result.language,
        });

        const action = getIntentAction(result);
        setPhase('speaking');
        setStatus('speaking');
        setBannerText(result.reply);

        speak(result.reply, {
          force: true,
          onEnd: () => {
            resetToStandby();
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
                  triggerTs: Date.now(),
                },
              });
            }
          },
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Something went wrong. Say Anya to try again.';
        setPhase('speaking');
        setBannerText(msg);
        speak(msg, { force: true, onEnd: () => resetToStandby() });
      }
    },
    [addMessage, navigate, resetToStandby, setStatus, settings.language, speak, stopSpeaking]
  );

  const captureNextCommand = useCallback(async () => {
    const runId = ++runIdRef.current;
    setPhase('listening');
    setStatus('listening');
    setLiveCaption('');
    setBannerText("I'm listening — tell me what to do");

    await new Promise((r) => window.setTimeout(r, 380));
    if (runIdRef.current !== runId) return;

    playEarcon('start');
    const transcript = await listenOnceForVoiceReply(
      currentLang.speechLang,
      11000,
      (interim) => {
        if (runIdRef.current === runId) {
          setLiveCaption(interim);
        }
      }
    );

    if (runIdRef.current !== runId) return;

    if (!transcript) {
      setPhase('speaking');
      setBannerText("Standing by. Just say Anya anytime.");
      speak('Standing by. Just say Anya anytime.', {
        force: true,
        onEnd: () => resetToStandby(),
      });
      return;
    }

    playEarcon('captured');
    await executeGlobalCommand(transcript);
  }, [currentLang.speechLang, executeGlobalCommand, resetToStandby, setStatus, speak]);

  const handleWake = useCallback(
    (inlineCommand: string) => {
      stopSpeaking();
      playEarcon('start');

      if (inlineCommand.trim().length > 2) {
        void executeGlobalCommand(inlineCommand);
        return;
      }

      setPhase('speaking');
      setStatus('speaking');
      const prompt = "Yes, I'm here. What else can I help you with?";
      setBannerText(prompt);
      speak(prompt, {
        force: true,
        onEnd: () => {
          void captureNextCommand();
        },
      });
    },
    [captureNextCommand, executeGlobalCommand, setStatus, speak, stopSpeaking]
  );

  // Start / stop background wake-word listener cleanly based on route & screen state
  useEffect(() => {
    if (!shouldBeListeningForWake) {
      wakeRef.current?.stop();
      wakeRef.current = null;
      return;
    }

    // Brief settle delay after a task finishes speaking before re-opening wake mic
    const startTimer = window.setTimeout(() => {
      const controller = startWakeWordListener(
        {
          onWakeDetected: (inlineCmd) => handleWake(inlineCmd),
        },
        currentLang.speechLang
      );
      wakeRef.current = controller;
    }, 550);

    return () => {
      window.clearTimeout(startTimer);
      wakeRef.current?.stop();
      wakeRef.current = null;
    };
  }, [shouldBeListeningForWake, currentLang.speechLang, handleWake]);

  // Cancel any in-flight global dialog if user navigates manually
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      wakeRef.current?.stop();
      wakeRef.current = null;
    };
  }, [location.pathname]);

  if (!isEligibleRoute || !settings.handsFreeMode) return null;

  // Compact active overlay ONLY when ANYA is awake/listening/processing/speaking on a sub-screen,
  // or a tiny non-intrusive "Say 'Anya'" indicator pill when standing by.
  if (phase === 'standby') {
    if (!shouldBeListeningForWake) return null;
    return (
      <div
        aria-live="polite"
        className="pointer-events-none absolute bottom-[76px] left-1/2 z-20 -translate-x-1/2"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-anya-primary/25 bg-white/95 px-3 py-1 text-[11px] font-bold text-anya-primary shadow-card backdrop-blur-sm">
          <Mic className="h-3 w-3 text-anya-success" aria-hidden="true" />
          <span>Say &ldquo;Anya&rdquo; anytime</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="absolute inset-x-4 top-14 z-40 rounded-2xl border-2 border-anya-primary bg-white p-3.5 shadow-phone"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-anya-primary">
          {phase === 'processing' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {phase === 'listening'
              ? 'ANYA is listening…'
              : phase === 'processing'
                ? 'Thinking…'
                : 'ANYA'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            runIdRef.current += 1;
            stopSpeaking();
            resetToStandby();
          }}
          aria-label="Stop ANYA"
          className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-anya-danger px-2.5 text-[11px] font-bold text-white"
        >
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Stop</span>
        </button>
      </div>

      {bannerText && (
        <p className="mt-1.5 text-xs font-semibold leading-snug text-anya-ink">{bannerText}</p>
      )}
      {liveCaption && (
        <p className="mt-1 truncate rounded-full bg-anya-bg px-2.5 py-1 text-[11px] font-semibold text-anya-primary">
          Hearing: &ldquo;{liveCaption}&rdquo;
        </p>
      )}
    </div>
  );
}
