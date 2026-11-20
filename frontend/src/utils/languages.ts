import type { LanguageOption, SupportedLanguageCode } from '../types/settings';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en-NG',
    name: 'Nigerian English',
    nativeName: 'English (Nigeria)',
    speechLang: 'en-NG',
    samplePrompt: 'Anya, how much money is in my hand?',
    statusNote: 'Primary language',
  },
  {
    code: 'pcm',
    name: 'Nigerian Pidgin',
    nativeName: 'Pidgin',
    speechLang: 'en-NG',
    samplePrompt: 'Anya, abeg read this message for me.',
    statusNote: 'Supported via Gemini audio & text',
  },
  {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Asụsụ Igbo',
    speechLang: 'en-NG',
    samplePrompt: 'Biko, gụọ ihe e dere ebe a.',
    statusNote: 'Experimental — verify speech output',
  },
  {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Èdè Yorùbá',
    speechLang: 'en-NG',
    samplePrompt: 'Ka owo yi ni owo mi?',
    statusNote: 'Experimental — verify speech output',
  },
];

export function getLanguageOption(code: SupportedLanguageCode): LanguageOption {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code) ?? SUPPORTED_LANGUAGES[0];
}
