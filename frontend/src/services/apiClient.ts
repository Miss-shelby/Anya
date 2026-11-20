import type { ConversationMessage, StructuredIntentResponse } from '../types/assistant';
import type { BankingSummaryResponse } from '../types/banking';
import type {
  NairaDetectionResponse,
  ObjectRecognitionResponse,
  TextReadingResponse,
} from '../types/vision';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const DEFAULT_TIMEOUT_MS = 22000;

export interface HealthResponse {
  status: string;
  service: string;
  gemini_configured: boolean;
  model: string;
}

export interface TranscribeApiResponse {
  transcript: string;
  detected_language: string;
  confidence_note?: string | null;
}

export interface VoiceCommandApiResponse extends StructuredIntentResponse {
  transcript: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('ANYA took too long to respond. Please try speaking again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
  } catch {
    // Ignore JSON parse failures
  }
  return `Request failed with status ${res.status}`;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 8000);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function transcribeAudio(
  audioBlob: Blob,
  preferredLanguage: string
): Promise<TranscribeApiResponse> {
  const formData = new FormData();
  const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
  formData.append('audio', audioBlob, `speech.${ext}`);
  formData.append('preferred_language', preferredLanguage);

  const res = await fetchWithTimeout(`${API_BASE}/api/voice/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function sendVoiceCommand(
  audioBlob: Blob,
  preferredLanguage: string,
  history: ConversationMessage[]
): Promise<VoiceCommandApiResponse> {
  const formData = new FormData();
  const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
  formData.append('audio', audioBlob, `command.${ext}`);
  formData.append('preferred_language', preferredLanguage);
  formData.append(
    'history',
    JSON.stringify(history.slice(-6).map((m) => ({ role: m.role, text: m.text })))
  );

  const res = await fetchWithTimeout(
    `${API_BASE}/api/voice/command`,
    { method: 'POST', body: formData },
    35000
  );

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function sendConversationTurn(
  message: string,
  preferredLanguage: string,
  history: ConversationMessage[]
): Promise<StructuredIntentResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/assistant/converse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      preferred_language: preferredLanguage,
      history: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function detectNairaNotes(
  imageBlob: Blob,
  preferredLanguage: string
): Promise<NairaDetectionResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'capture.jpg');
  formData.append('preferred_language', preferredLanguage);

  const res = await fetchWithTimeout(
    `${API_BASE}/api/vision/naira`,
    { method: 'POST', body: formData },
    30000
  );

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function recognizeObjects(
  imageBlob: Blob,
  question: string,
  preferredLanguage: string
): Promise<ObjectRecognitionResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'scene.jpg');
  formData.append('question', question);
  formData.append('preferred_language', preferredLanguage);

  const res = await fetchWithTimeout(
    `${API_BASE}/api/vision/objects`,
    { method: 'POST', body: formData },
    30000
  );

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function readTextFromImage(
  imageBlob: Blob,
  preferredLanguage: string
): Promise<TextReadingResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'document.jpg');
  formData.append('preferred_language', preferredLanguage);

  const res = await fetchWithTimeout(
    `${API_BASE}/api/vision/read-text`,
    { method: 'POST', body: formData },
    30000
  );

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function getSimulatedBankingSummary(): Promise<BankingSummaryResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/banking/demo/summary`, {}, 10000);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}
