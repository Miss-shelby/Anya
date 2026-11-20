export interface HandsFreeListenerCallbacks {
  onSpeechStart: () => void;
  onUtteranceReady: (audioBlob: Blob) => void;
  onVolumeChange?: (level: number) => void;
  onError?: (message: string) => void;
}

export interface HandsFreeController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function getAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

/**
 * Plays a gentle, non-intrusive audio tone so a blind user hears when
 * ANYA begins listening or captures their request without needing to see the screen.
 */
export function playEarcon(type: 'start' | 'captured') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'start') {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.11);
    } else {
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.11);
    }

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // Ignore autoplay restriction errors
  }
}

/**
 * Continuous hands-free Voice Activity Detection (VAD) listener.
 * Automatically detects when a blind user starts speaking, records their utterance,
 * and stops automatically after ~1.5s of silence — zero button presses required.
 */
export async function startHandsFreeListener(
  callbacks: HandsFreeListenerCallbacks
): Promise<HandsFreeController> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const timeDomain = new Float32Array(analyser.fftSize);
  const mimeType = getAudioMimeType();

  let paused = false;
  let stopped = false;
  let isRecording = false;
  let recorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let speechFrames = 0;
  let silenceStartMs: number | null = null;
  let recordStartMs = 0;

  const SPEECH_THRESHOLD = 0.022; // RMS threshold for human speech
  const MIN_SPEECH_FRAMES = 3; // ~180ms sustained speech to avoid clicks/bumps
  const SILENCE_TIMEOUT_MS = 1150; // 1.15s pause ends utterance quickly & naturally
  const MAX_UTTERANCE_MS = 12000; // 12s safety cap

  const finishRecording = (deliver: boolean) => {
    if (!recorder || recorder.state === 'inactive') {
      isRecording = false;
      return;
    }

    const activeRecorder = recorder;
    recorder = null;
    isRecording = false;
    speechFrames = 0;
    silenceStartMs = null;

    activeRecorder.onstop = () => {
      const captured = chunks;
      chunks = [];
      if (deliver && !stopped && captured.length > 0) {
        playEarcon('captured');
        const blob = new Blob(captured, {
          type: activeRecorder.mimeType || mimeType || 'audio/webm',
        });
        callbacks.onUtteranceReady(blob);
      }
    };

    try {
      activeRecorder.stop();
    } catch {
      // Ignore already-stopped errors
    }
  };

  const beginRecording = () => {
    if (isRecording || paused || stopped) return;
    chunks = [];
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      callbacks.onError?.('Could not start audio capture.');
      return;
    }

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    isRecording = true;
    recordStartMs = Date.now();
    silenceStartMs = null;
    recorder.start(200);
    playEarcon('start');
    callbacks.onSpeechStart();
  };

  const intervalId = window.setInterval(() => {
    if (stopped || paused) return;

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    analyser.getFloatTimeDomainData(timeDomain);
    let sumSq = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      sumSq += timeDomain[i] * timeDomain[i];
    }
    const rms = Math.sqrt(sumSq / timeDomain.length);
    callbacks.onVolumeChange?.(Math.min(1, rms * 10));

    const now = Date.now();

    if (!isRecording) {
      if (rms >= SPEECH_THRESHOLD) {
        speechFrames += 1;
        if (speechFrames >= MIN_SPEECH_FRAMES) {
          beginRecording();
        }
      } else {
        speechFrames = Math.max(0, speechFrames - 1);
      }
    } else {
      if (now - recordStartMs >= MAX_UTTERANCE_MS) {
        finishRecording(true);
        return;
      }

      if (rms < SPEECH_THRESHOLD * 0.75) {
        if (silenceStartMs === null) {
          silenceStartMs = now;
        } else if (now - silenceStartMs >= SILENCE_TIMEOUT_MS) {
          finishRecording(true);
        }
      } else {
        silenceStartMs = null;
      }
    }
  }, 60);

  return {
    pause: () => {
      paused = true;
      if (isRecording) {
        finishRecording(false);
      }
      speechFrames = 0;
      silenceStartMs = null;
    },
    resume: () => {
      if (!stopped) {
        paused = false;
        speechFrames = 0;
        silenceStartMs = null;
      }
    },
    stop: () => {
      stopped = true;
      paused = true;
      window.clearInterval(intervalId);
      if (isRecording) {
        finishRecording(false);
      }
      stream.getTracks().forEach((t) => t.stop());
      void audioContext.close();
    },
  };
}
