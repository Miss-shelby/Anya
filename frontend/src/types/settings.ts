export type SupportedLanguageCode = 'en-NG' | 'pcm' | 'ig' | 'yo';

export interface LanguageOption {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  speechLang: string;
  samplePrompt: string;
  statusNote: string;
}

export interface AccessibilitySettings {
  language: SupportedLanguageCode;
  speechRate: number; // 0.75 to 1.35
  autoSpeak: boolean;
  handsFreeMode: boolean;
  highContrast: boolean;
  largeText: boolean;
  onboardingCompleted: boolean;
}
