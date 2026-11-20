import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSettings } from './SettingsContext';
import { getLanguageOption } from '../utils/languages';

interface SpeakOptions {
  force?: boolean;
  lang?: string;
  onEnd?: () => void;
}

interface SpeechContextValue {
  isSpeaking: boolean;
  lastSpokenText: string;
  liveAnnouncement: string;
  speak: (text: string, options?: SpeakOptions) => void;
  stopSpeaking: () => void;
  repeatLast: () => void;
  announce: (message: string) => void;
}

const SpeechContext = createContext<SpeechContextValue | undefined>(undefined);

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const announce = useCallback((message: string) => {
    setLiveAnnouncement('');
    requestAnimationFrame(() => {
      setLiveAnnouncement(message);
    });
  }, []);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const cleaned = text.trim();
      if (!cleaned) {
        options?.onEnd?.();
        return;
      }

      setLastSpokenText(cleaned);
      announce(cleaned);

      if ((!settings.autoSpeak && !options?.force) || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options?.onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const langOpt = getLanguageOption(settings.language);
      utterance.lang = options?.lang ?? langOpt.speechLang;
      utterance.rate = settings.speechRate;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        options?.onEnd?.();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [settings.autoSpeak, settings.language, settings.speechRate, announce]
  );

  const repeatLast = useCallback(() => {
    if (lastSpokenText) {
      speak(lastSpokenText, { force: true });
    }
  }, [lastSpokenText, speak]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <SpeechContext.Provider
      value={{
        isSpeaking,
        lastSpokenText,
        liveAnnouncement,
        speak,
        stopSpeaking,
        repeatLast,
        announce,
      }}
    >
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) {
    throw new Error('useSpeech must be used within SpeechProvider');
  }
  return ctx;
}
