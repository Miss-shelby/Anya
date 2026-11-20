import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AccessibilitySettings } from '../types/settings';

const STORAGE_KEY = 'anya_settings_v1';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  language: 'en-NG',
  speechRate: 1.0,
  autoSpeak: true,
  handsFreeMode: true,
  highContrast: false,
  largeText: false,
  onboardingCompleted: false,
};

interface SettingsContextValue {
  settings: AccessibilitySettings;
  updateSettings: (partial: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Fall back to default settings if storage is unavailable
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }

    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.style.fontSize = settings.largeText ? '18px' : '16px';
  }, [settings]);

  const updateSettings = (partial: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
