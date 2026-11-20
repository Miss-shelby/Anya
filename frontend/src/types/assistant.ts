import type { SupportedLanguageCode } from './settings';

export type AssistantStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type AssistantIntent =
  | 'general_conversation'
  | 'naira_detection'
  | 'object_recognition'
  | 'text_reading'
  | 'send_message'
  | 'make_call'
  | 'banking_balance'
  | 'banking_transactions'
  | 'smartphone_guidance';

export interface StructuredIntentResponse {
  intent: AssistantIntent;
  language: SupportedLanguageCode | string;
  requires_camera: boolean;
  requires_confirmation: boolean;
  reply: string;
  entities?: Record<string, string>;
  suggested_route?: string | null;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: AssistantIntent;
  language?: string;
}
