export interface WakeWordCallbacks {
  onWakeDetected: (inlineCommand: string) => void;
  onInterimHeard?: (heardText: string) => void;
  onStatusChange?: (listening: boolean) => void;
  onError?: (message: string) => void;
}

export interface WakeWordController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Broad phonetic match for "Anya" across Nigerian, British, and US accents on Chrome & iOS Safari
const WAKE_WORD_REGEX =
  /\b(?:hey\s+|ok(?:ay)?\s+|hello\s+|hi\s+)?(anya|ania|anna|onya|enya|hanya|amya|tanya|sonya|aniah|an\s+ya|on\s+ya|anya's|anya’s)\b[,.\s!?]*(.*)/i;

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWakeWordSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

/**
 * Captures a single spoken command/reply using the browser's native SpeechRecognition.
 * Uses interimResults so we never lose a spoken phrase if the mic closes early,
 * and avoids MediaRecorder/SpeechRecognition microphone hardware conflicts on Windows & iPhone.
 */
export function listenOnceForVoiceReply(
  lang = 'en-US',
  timeoutMs = 11000,
  onInterim?: (text: string) => void
): Promise<string> {
  const attemptListen = (allowRetry: boolean): Promise<string> =>
    new Promise((resolve) => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor) {
        resolve('');
        return;
      }

      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang === 'en-NG' ? 'en-US' : lang;

      const startedAt = Date.now();
      let settled = false;
      let bestTranscript = '';
      let silenceTimer: number | null = null;

      const finish = (text: string, shouldRetry = false) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimer);
        if (silenceTimer !== null) window.clearTimeout(silenceTimer);
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
        if (shouldRetry && allowRetry && !text.trim()) {
          window.setTimeout(() => {
            void attemptListen(false).then(resolve);
          }, 450);
          return;
        }
        resolve(text.trim());
      };

      const hardTimer = window.setTimeout(() => finish(bestTranscript), timeoutMs);

      recognition.onresult = (event) => {
        let combined = '';
        let hasFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          combined += res[0]?.transcript ?? '';
          if (res.isFinal) hasFinal = true;
        }

        const cleaned = combined.trim();
        if (cleaned) {
          bestTranscript = cleaned;
          onInterim?.(cleaned);
        }

        if (hasFinal && cleaned) {
          finish(cleaned);
          return;
        }

        if (silenceTimer !== null) window.clearTimeout(silenceTimer);
        if (cleaned) {
          silenceTimer = window.setTimeout(() => finish(bestTranscript), 1400);
        }
      };

      recognition.onerror = (ev) => {
        // Retry once if mic handoff from previous screen caused an instant abort
        const rapidAbort = ev.error === 'aborted' && Date.now() - startedAt < 800;
        finish(bestTranscript, rapidAbort);
      };

      recognition.onend = () => {
        const rapidEmptyEnd = !bestTranscript && Date.now() - startedAt < 650;
        finish(bestTranscript, rapidEmptyEnd);
      };

      try {
        recognition.start();
      } catch {
        finish('', true);
      }
    });

  return attemptListen(true);
}

/**
 * Siri-style low-latency standby wake-word listener for "Anya".
 * Costs zero Gemini API calls while waiting in standby.
 */
export function startWakeWordListener(
  callbacks: WakeWordCallbacks,
  lang = 'en-US'
): WakeWordController | null {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;

  let stopped = false;
  let paused = false;
  let running = false;
  let restartTimer: number | null = null;
  let lastTriggerAt = 0;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  // en-US has the broadest, most consistent wake-word accuracy on Windows Chrome & iOS Safari
  recognition.lang = lang === 'en-NG' ? 'en-US' : lang;

  const safeStart = () => {
    if (stopped || paused || running) return;
    try {
      recognition.start();
    } catch {
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(safeStart, 450);
    }
  };

  recognition.onstart = () => {
    running = true;
    callbacks.onStatusChange?.(true);
  };

  recognition.onresult = (event) => {
    if (stopped || paused) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = (result[0]?.transcript || '').trim();
      if (!text) continue;

      callbacks.onInterimHeard?.(text);

      const match = text.match(WAKE_WORD_REGEX);
      if (!match) continue;

      const now = Date.now();
      if (now - lastTriggerAt < 1800) continue;

      const trailing = (match[2] || '').trim();

      // If user spoke a command right after "Anya", wait briefly for final phrase
      if (trailing.length > 0 && !result.isFinal) {
        continue;
      }

      lastTriggerAt = now;
      paused = true;
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
      callbacks.onWakeDetected(trailing);
      return;
    }
  };

  recognition.onerror = (event) => {
    running = false;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      callbacks.onError?.(
        'Microphone permission is blocked. On iPhone, make sure you open ANYA over an HTTPS link and allow Microphone access.'
      );
      stopped = true;
      return;
    }
  };

  recognition.onend = () => {
    running = false;
    callbacks.onStatusChange?.(false);
    if (!stopped && !paused) {
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(safeStart, 300);
    }
  };

  safeStart();

  return {
    pause: () => {
      paused = true;
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    },
    resume: () => {
      if (stopped) return;
      paused = false;
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(safeStart, 350);
    },
    stop: () => {
      stopped = true;
      paused = true;
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
    },
  };
}
