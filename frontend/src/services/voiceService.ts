export interface VoiceRecorderHandle {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

/**
 * Captures a single voice utterance in memory via MediaRecorder.
 * Immediately stops all microphone tracks when recording ends or is cancelled.
 */
export async function startVoiceRecording(): Promise<VoiceRecorderHandle> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone recording is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getSupportedAudioMimeType();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const cleanupStream = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        if (recorder.state === 'inactive') {
          cleanupStream();
          resolve(new Blob(chunks, { type: mimeType || 'audio/webm' }));
          return;
        }

        recorder.onstop = () => {
          cleanupStream();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
        };

        recorder.onerror = () => {
          cleanupStream();
          reject(new Error('Audio recording failed. Please try again.'));
        };

        recorder.stop();
      }),
    cancel: () => {
      if (recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      cleanupStream();
    },
  };
}
